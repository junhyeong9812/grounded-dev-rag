package xyz.junproject.api.auth

import org.springframework.beans.factory.annotation.Value
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import java.security.SecureRandom
import java.util.HexFormat

/** 단일 계정(STUDY_USER) 로그인 + PG 세션. 학습 워크벤치 전용(개인).
 *  비번 해시·계정은 .env(STUDY_USER·STUDY_PASS_HASH) — 깃 미포함. */
@Service
class AuthService(
    private val jdbc: JdbcTemplate,
    @Value("\${STUDY_USER:jun}") private val studyUser: String,
    @Value("\${STUDY_PASS_HASH:}") private val studyHash: String,
) {
    private val encoder = BCryptPasswordEncoder()
    private val rng = SecureRandom()

    /** 로그인: 계정·비번(bcrypt) 검증 → 세션 토큰 발급(PG, 30일). 실패 시 null. */
    fun login(user: String, pass: String): String? {
        if (user != studyUser || studyHash.isBlank() || !encoder.matches(pass, studyHash)) return null
        val token = newToken()
        jdbc.update(
            "INSERT INTO web_session(token, account, expires) VALUES (?,?, now() + interval '30 days')",
            token, studyUser)
        return token
    }

    /** 매 요청 검증(보안 게이트의 핵심): 유효·미만료 세션이면 account, 아니면 null. last_seen 갱신. */
    fun validate(token: String?): String? {
        if (token.isNullOrBlank()) return null
        val acc = jdbc.queryForList(
            "SELECT account FROM web_session WHERE token=? AND expires > now()", token)
            .firstOrNull()?.get("account") as? String ?: return null
        jdbc.update("UPDATE web_session SET last_seen=now() WHERE token=?", token)
        return acc
    }

    fun logout(token: String?) {
        if (!token.isNullOrBlank()) jdbc.update("DELETE FROM web_session WHERE token=?", token)
    }

    private fun newToken(): String {
        val b = ByteArray(32); rng.nextBytes(b); return HexFormat.of().formatHex(b)
    }
}
