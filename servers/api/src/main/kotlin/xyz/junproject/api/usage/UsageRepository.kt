package xyz.junproject.api.usage

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

@Repository
class UsageRepository(private val jdbc: JdbcTemplate) {

    fun log(endpoint: String, method: String, status: Int, latencyMs: Int, ip: String?, query: String?) {
        jdbc.update(
            "INSERT INTO usage_log(endpoint,method,status,latency_ms,client_ip,query) VALUES(?,?,?,?,?,?)",
            endpoint, method, status, latencyMs, ip, query)
    }

    fun recent(limit: Int): List<Map<String, Any>> = jdbc.queryForList(
        "SELECT to_char(ts,'YYYY-MM-DD HH24:MI:SS') ts, endpoint, method, status, latency_ms, client_ip, query " +
            "FROM usage_log ORDER BY ts DESC LIMIT ?", limit)

    /** 엔드포인트별 호출 수 + 최근 24h 합계 (대시보드). */
    fun summary(): Map<String, Any> {
        val byEndpoint = jdbc.queryForList(
            "SELECT endpoint, count(*) AS cnt, round(avg(latency_ms)) AS avg_ms " +
                "FROM usage_log WHERE ts > now() - interval '7 days' GROUP BY endpoint ORDER BY cnt DESC")
        val last24h = jdbc.queryForObject(
            "SELECT count(*) FROM usage_log WHERE ts > now() - interval '24 hours'", Int::class.java) ?: 0
        val total = jdbc.queryForObject("SELECT count(*) FROM usage_log", Int::class.java) ?: 0
        return mapOf("byEndpoint" to byEndpoint, "last24h" to last24h, "total" to total)
    }
}
