package xyz.junproject.api.auth

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.servlet.HandlerInterceptor

/** study 경로 매 요청 세션토큰 필수 검증 — 없거나 무효면 401.
 *  학습 Q&A(Claude Code 호출)는 외부 노출 www 뒤에 있으므로 이 게이트가 보안 경계. */
@Component
class StudyAuthInterceptor(private val auth: AuthService) : HandlerInterceptor {
    override fun preHandle(req: HttpServletRequest, res: HttpServletResponse, handler: Any): Boolean {
        val acc = auth.validate(req.getHeader("X-Session-Token"))
        if (acc == null) {
            res.status = HttpServletResponse.SC_UNAUTHORIZED
            res.contentType = "application/json"
            res.writer.write("""{"error":"unauthorized"}""")
            return false
        }
        req.setAttribute("study.account", acc)
        return true
    }
}
