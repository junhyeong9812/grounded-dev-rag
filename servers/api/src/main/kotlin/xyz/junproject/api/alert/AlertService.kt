package xyz.junproject.api.alert

import org.slf4j.LoggerFactory
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service
import xyz.junproject.api.config.AppProperties

/** 임계 초과 시 Gmail SMTP로 발신(your@gmail.com) → 수신(your@example.com).
 *  같은 host+metric은 30분 내 1회만(스팸 방지). 모든 시도는 alert_log에 기록. */
@Service
class AlertService(
    private val mail: JavaMailSender,
    private val props: AppProperties,
    private val jdbc: JdbcTemplate,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun alert(host: String, metric: String, value: Double, threshold: Double) {
        val recent = jdbc.queryForObject(
            "SELECT count(*) FROM alert_log WHERE host=? AND metric=? AND sent=true " +
                "AND ts > now() - interval '30 minutes'", Int::class.java, host, metric) ?: 0
        val sent = if (recent == 0) send(host, metric, value, threshold) else false
        jdbc.update("INSERT INTO alert_log(host,metric,value,threshold,sent,detail) VALUES(?,?,?,?,?,?)",
            host, metric, value, threshold,
            sent, "host=$host $metric=$value 임계=$threshold ${if (sent) "메일발송" else if (recent > 0) "쿨다운" else "발송실패"}")
    }

    private fun send(host: String, metric: String, value: Double, threshold: Double): Boolean = try {
        val msg = SimpleMailMessage()
        msg.from = props.alertFrom
        msg.setTo(props.alertTo)
        msg.subject = "[junproject 경보] $host — $metric ${"%.1f".format(value)} (임계 $threshold)"
        msg.text = """
            서버 자원 임계 초과 경보.

            호스트: $host
            지표: $metric
            현재값: ${"%.1f".format(value)}
            임계값: $threshold
            시각: ${java.time.LocalDateTime.now()}

            admin 대시보드에서 상세 확인 바랍니다.
        """.trimIndent()
        mail.send(msg)
        log.info("경보 메일 발송: {} {} {}", host, metric, value)
        true
    } catch (e: Exception) {
        log.warn("경보 메일 발송 실패(앱 비밀번호 미설정?): {}", e.message)
        false
    }
}
