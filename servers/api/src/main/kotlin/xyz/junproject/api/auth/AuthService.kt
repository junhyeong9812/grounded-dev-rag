package xyz.junproject.api.auth

import org.springframework.beans.factory.annotation.Value
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.HexFormat

/** 단일 계정(STUDY_USER) 로그인 + PG 세션. 학습 워크벤치 전용(개인).
 *  비번 해시·계정은 .env(STUDY_USER·STUDY_PASS_HASH) — 깃 미포함.
 *  보안 리뷰 반영: 레이트리밋(F2)·토큰 해시저장(F5)·유휴만료(F5)·만료정리(F5). */
@Service
class AuthService(
    private val jdbc: JdbcTemplate,
    @Value("\${STUDY_USER:jun}") private val studyUser: String,
    @Value("\${STUDY_PASS_HASH:}") private val studyHash: String,
) {
    private val encoder = BCryptPasswordEncoder()
    private val rng = SecureRandom()

    // F2: 단일계정 → 전역 실패 카운터. 5회+ 연속 실패 시 점증 잠금(브루트포스·CPU-DoS 차단).
    @Volatile private var failCount = 0
    @Volatile private var lockUntil = 0L

    /** 로그인: 잠금 확인 → bcrypt 검증 → 토큰 발급(해시 저장, 30일). 실패/잠금 시 null. */
    @Synchronized
    fun login(user: String, pass: String): String? {
        val now = System.currentTimeMillis()
        if (now < lockUntil) return null  // 잠금 중엔 bcrypt도 안 돌림
        if (user != studyUser || studyHash.isBlank() || !encoder.matches(pass, studyHash)) {
            failCount++
            if (failCount >= 5) lockUntil = now + 60_000L * (failCount - 4).coerceAtMost(15)  // 1~15분 점증
            return null
        }
        failCount = 0; lockUntil = 0
        val token = newToken()
        jdbc.update("DELETE FROM web_session WHERE expires <= now()")  // F5: 만료 정리
        jdbc.update(
            "INSERT INTO web_session(token, account, expires) VALUES (?,?, now() + interval '30 days')",
            sha256(token), studyUser)  // F5: 평문 아닌 해시 저장
        return token
    }

    /** 매 요청 검증(게이트 핵심): 미만료 + 유휴 14일 이내면 account, 아니면 null. last_seen 갱신. */
    fun validate(token: String?): String? {
        if (token.isNullOrBlank()) return null
        val h = sha256(token)
        val acc = jdbc.queryForList(
            "SELECT account FROM web_session WHERE token=? AND expires > now() AND last_seen > now() - interval '14 days'", h)
            .firstOrNull()?.get("account") as? String ?: return null
        jdbc.update("UPDATE web_session SET last_seen=now() WHERE token=?", h)
        return acc
    }

    fun logout(token: String?) {
        if (!token.isNullOrBlank()) jdbc.update("DELETE FROM web_session WHERE token=?", sha256(token))
    }

    private fun newToken(): String { val b = ByteArray(32); rng.nextBytes(b); return HexFormat.of().formatHex(b) }
    private fun sha256(s: String): String =
        HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.toByteArray()))
}
