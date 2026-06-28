package xyz.junproject.api.study

import com.fasterxml.jackson.databind.JsonNode
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.http.codec.ServerSentEvent
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import reactor.core.publisher.Flux
import reactor.core.scheduler.Schedulers
import java.time.Duration

/** 학습 Q&A — 호스트 claude-bridge(.9:9099)를 HTTP 호출해 Claude Code 응답을 받고 SSE 전달.
 *  api는 컨테이너라 claude를 직접 못 돌림 → bridge가 호스트에서 실행(node·인증·도구차단 보유).
 *  세션 유지(claude_session_id resume) + 대화 PG 기록. 게이트(인터셉터)가 인증 보장. */
@Service
class StudyService(
    private val jdbc: JdbcTemplate,
    @Value("\${CLAUDE_BRIDGE_URL:http://192.168.55.9:9099}") private val bridgeUrl: String,
) {
    private val rest = RestClient.builder()
        .requestFactory(SimpleClientHttpRequestFactory().apply {
            setConnectTimeout(Duration.ofSeconds(5)); setReadTimeout(Duration.ofSeconds(310))
        }).build()

    fun ask(account: String, sessionId: Long?, question: String, docText: String?): Flux<ServerSentEvent<String>> {
        val (dbId, claudeSid) = resolveSession(account, sessionId)
        val prompt = buildPrompt(question, docText, claudeSid == null)
        jdbc.update("INSERT INTO study_message(session_id, role, content) VALUES (?, 'user', ?)", dbId, question)

        return Flux.create<ServerSentEvent<String>> { sink ->
            try {
                val resp = rest.post().uri("$bridgeUrl/run")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(mapOf("prompt" to prompt, "session_id" to claudeSid))
                    .retrieve().body(JsonNode::class.java)
                val answer = resp?.path("answer")?.asText("").orEmpty()
                val newSid = resp?.path("session_id")?.asText(null)
                jdbc.update("UPDATE study_session SET claude_session_id=? WHERE id=?", newSid, dbId)
                jdbc.update("INSERT INTO study_message(session_id, role, content) VALUES (?, 'assistant', ?)",
                    dbId, answer)
                sink.next(sse("token", answer.ifBlank { "(빈 응답)" }))
                sink.next(sse("session", dbId.toString()))
                sink.next(sse("done", "done"))
                sink.complete()
            } catch (ex: Exception) {
                sink.next(sse("error", ex.message ?: "claude bridge 오류"))
                sink.complete()
            }
        }.subscribeOn(Schedulers.boundedElastic())
    }

    private fun sse(event: String, data: String) = ServerSentEvent.builder(data).event(event).build()

    private fun resolveSession(account: String, sessionId: Long?): Pair<Long, String?> {
        if (sessionId != null) {
            val rows = jdbc.queryForList(
                "SELECT claude_session_id FROM study_session WHERE id=? AND account=?", sessionId, account)
            if (rows.isNotEmpty()) return sessionId to (rows[0]["claude_session_id"] as String?)
        }
        val id = jdbc.queryForObject(
            "INSERT INTO study_session(account, title) VALUES (?, ?) RETURNING id",
            Long::class.java, account, "학습 대화")
        return id!! to null
    }

    private fun buildPrompt(question: String, docText: String?, isNew: Boolean): String {
        val ctx = if (isNew && !docText.isNullOrBlank())
            "지금 보고 있는 학습 문서:\n\"\"\"\n${docText.take(9000)}\n\"\"\"\n\n" else ""
        return "${ctx}질문: $question\n\n한국어로 학습자에게 설명하듯 답해줘. 코드면 동작 원리 중심으로 간결히."
    }
}
