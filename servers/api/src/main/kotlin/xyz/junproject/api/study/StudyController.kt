package xyz.junproject.api.study

import jakarta.servlet.http.HttpServletRequest
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/** 학습 워크벤치 — study 경로는 StudyAuthInterceptor 게이트 뒤(매 요청 세션 검증).
 *  P3에서 Claude Code 스트리밍 Q&A 추가. 현재는 게이트 검증용 ping. */
@RestController
@RequestMapping("/study")
class StudyController {

    @GetMapping("/ping")
    fun ping(req: HttpServletRequest) =
        mapOf("ok" to true, "account" to req.getAttribute("study.account"))
}
