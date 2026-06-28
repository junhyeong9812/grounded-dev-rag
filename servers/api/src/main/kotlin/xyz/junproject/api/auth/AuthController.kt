package xyz.junproject.api.auth

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

data class LoginReq(val username: String = "", val password: String = "")

/** 로그인/로그아웃/세션확인. 토큰은 BFF가 HttpOnly 쿠키로 보관, 요청 시 X-Session-Token 헤더로 전달. */
@RestController
@RequestMapping("/auth")
class AuthController(private val auth: AuthService) {

    @PostMapping("/login")
    fun login(@RequestBody req: LoginReq): ResponseEntity<Map<String, String>> {
        val token = auth.login(req.username.trim(), req.password)
            ?: return ResponseEntity.status(401).body(mapOf("error" to "invalid"))
        return ResponseEntity.ok(mapOf("token" to token, "account" to req.username.trim()))
    }

    @GetMapping("/me")
    fun me(@RequestHeader("X-Session-Token", required = false) token: String?): ResponseEntity<Map<String, String>> {
        val acc = auth.validate(token) ?: return ResponseEntity.status(401).body(mapOf("error" to "unauth"))
        return ResponseEntity.ok(mapOf("account" to acc))
    }

    @PostMapping("/logout")
    fun logout(@RequestHeader("X-Session-Token", required = false) token: String?): Map<String, Boolean> {
        auth.logout(token); return mapOf("ok" to true)
    }
}
