package xyz.junproject.api.rag

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.MediaType
import org.springframework.http.codec.ServerSentEvent
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Flux

@RestController
class RagController(private val rag: RagService) {

    @PostMapping("/ask")
    fun ask(@RequestBody req: AskRequest, http: HttpServletRequest): AskResponse {
        http.setAttribute("usage.query", req.question)   // usage_log에 질문 기록
        return rag.ask(req)
    }

    @PostMapping("/search")
    fun search(@RequestBody req: AskRequest, http: HttpServletRequest): AskResponse {
        http.setAttribute("usage.query", req.question)
        return rag.ask(req.copy(digest = false))
    }

    /** 스트리밍 SSE — 토큰 단위로 답변(채팅 UI). event: sources → token… → done. */
    @GetMapping("/ask/stream", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun askStream(@RequestParam q: String,
                  @RequestParam(name = "ns", required = false) namespaces: List<String>?,
                  http: HttpServletRequest): Flux<ServerSentEvent<String>> {
        http.setAttribute("usage.query", q)
        return rag.askStream(q, namespaces)
    }
}
