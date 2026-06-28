package xyz.junproject.api.rag

import jakarta.servlet.http.HttpServletRequest
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

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
}
