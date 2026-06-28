package xyz.junproject.api.monitoring

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.*
import xyz.junproject.api.alert.AlertService

@RestController
@RequestMapping("/admin")
class AdminMonitoringController(
    private val repo: MetricsRepository,
    private val jdbc: JdbcTemplate,
    private val alert: AlertService,
) {
    /** 알림 메일 테스트 발송 (SMTP·앱비번 검증). */
    @PostMapping("/test-alert")
    fun testAlert() = mapOf("sent" to alert.test())

    /** 3호스트 현재 자원 상태 (대시보드). */
    @GetMapping("/metrics")
    fun latest() = mapOf("hosts" to repo.latest())

    /** 호스트 시계열 (차트). */
    @GetMapping("/metrics/{host}/history")
    fun history(@PathVariable host: String, @RequestParam(defaultValue = "60") minutes: Int) =
        mapOf("host" to host, "series" to repo.history(host, minutes))

    /** 최근 경보 이력. */
    @GetMapping("/alerts")
    fun alerts(@RequestParam(defaultValue = "50") limit: Int) = mapOf("alerts" to jdbc.queryForList(
        "SELECT to_char(ts,'YYYY-MM-DD HH24:MI:SS') ts, host, metric, value, threshold, sent, detail " +
            "FROM alert_log ORDER BY ts DESC LIMIT ?", limit))
}
