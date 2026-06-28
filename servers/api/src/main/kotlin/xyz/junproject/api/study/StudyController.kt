package xyz.junproject.api.study

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.MediaType
import org.springframework.http.codec.ServerSentEvent
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Flux

/** 학습 워크벤치 — study 경로는 StudyAuthInterceptor 게이트 뒤(매 요청 세션 검증).
 *  account 는 게이트가 request attribute 로 주입. SSE 는 SameSite=Strict 쿠키로 CSRF 차단. */
@RestController
@RequestMapping("/study")
class StudyController(private val study: StudyService, private val jdbc: JdbcTemplate) {

    @GetMapping("/ping")
    fun ping(req: HttpServletRequest) = mapOf("ok" to true, "account" to req.getAttribute("study.account"))

    /** 문서 옆 학습 Q&A — Claude Code 스트리밍. sessionId 없으면 새 대화(문서맥락 동봉), 있으면 이어감(resume). */
    @GetMapping("/ask", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun ask(@RequestParam q: String,
            @RequestParam(required = false) sessionId: Long?,
            @RequestParam(required = false) docId: Long?,
            req: HttpServletRequest): Flux<ServerSentEvent<String>> {
        val account = req.getAttribute("study.account") as String
        val docText = docId?.let {
            jdbc.queryForList("SELECT full_text FROM library WHERE id=?", it).firstOrNull()?.get("full_text") as String?
        }
        return study.ask(account, sessionId, q, docText)
    }

    /** 내 학습 대화 목록(맥락 불러오기). */
    @GetMapping("/sessions")
    fun sessions(req: HttpServletRequest) = mapOf("sessions" to jdbc.queryForList(
        "SELECT id, title, doc_id, created FROM study_session WHERE account=? ORDER BY created DESC LIMIT 50",
        req.getAttribute("study.account")))

    /** 한 대화의 메시지 타임라인. */
    @GetMapping("/sessions/{id}")
    fun messages(@PathVariable id: Long, req: HttpServletRequest) = mapOf("messages" to jdbc.queryForList(
        "SELECT m.role, m.content, m.created FROM study_message m JOIN study_session s ON s.id=m.session_id " +
            "WHERE m.session_id=? AND s.account=? ORDER BY m.id",
        id, req.getAttribute("study.account")))
}
