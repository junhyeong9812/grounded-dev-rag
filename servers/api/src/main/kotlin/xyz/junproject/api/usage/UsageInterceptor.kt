package xyz.junproject.api.usage

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.servlet.HandlerInterceptor

/** 모든 요청의 접근/사용량을 usage_log에 기록 (admin 모니터링). actuator는 제외. */
@Component
class UsageInterceptor(private val repo: UsageRepository) : HandlerInterceptor {

    override fun preHandle(req: HttpServletRequest, resp: HttpServletResponse, handler: Any): Boolean {
        req.setAttribute("t0", System.nanoTime())
        return true
    }

    override fun afterCompletion(req: HttpServletRequest, resp: HttpServletResponse, handler: Any, ex: Exception?) {
        val uri = req.requestURI
        if (uri.startsWith("/actuator")) return
        val t0 = req.getAttribute("t0") as? Long ?: return
        val latency = ((System.nanoTime() - t0) / 1_000_000).toInt()
        val ip = req.getHeader("X-Forwarded-For")?.substringBefore(",")?.trim() ?: req.remoteAddr
        val query = req.getAttribute("usage.query") as? String
        runCatching { repo.log(uri, req.method, resp.status, latency, ip, query) }
    }
}
