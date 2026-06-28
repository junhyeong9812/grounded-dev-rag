package xyz.junproject.api.monitoring

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

@Repository
class MetricsRepository(private val jdbc: JdbcTemplate) {

    fun save(host: String, cpu: Double?, mem: Double?, disk: Double?,
             gpuUtil: Double?, gpuMem: Double?, gpuTemp: Double?,
             netSent: Long?, netRecv: Long?, raw: String) {
        jdbc.update(
            "INSERT INTO metrics_sample(host,cpu_pct,mem_pct,disk_pct,gpu_util,gpu_mem_pct,gpu_temp,net_sent,net_recv,raw) " +
                "VALUES(?,?,?,?,?,?,?,?,?,?::jsonb)",
            host, cpu, mem, disk, gpuUtil, gpuMem, gpuTemp, netSent, netRecv, raw)
    }

    /** 호스트별 최신 1건 (대시보드 현재 상태). */
    fun latest(): List<Map<String, Any>> = jdbc.queryForList(
        "SELECT DISTINCT ON (host) host, to_char(ts,'HH24:MI:SS') ts, cpu_pct, mem_pct, disk_pct, " +
            "gpu_util, gpu_mem_pct, gpu_temp, raw FROM metrics_sample ORDER BY host, ts DESC")

    /** 호스트 시계열 (최근 N분, 차트). */
    fun history(host: String, minutes: Int): List<Map<String, Any>> = jdbc.queryForList(
        "SELECT to_char(ts,'HH24:MI') t, cpu_pct, mem_pct, disk_pct, gpu_util, gpu_temp " +
            "FROM metrics_sample WHERE host=? AND ts > now() - make_interval(mins => ?) ORDER BY ts", host, minutes)

    /** 오래된 샘플 정리 (7일 보존). */
    fun prune() = jdbc.update("DELETE FROM metrics_sample WHERE ts < now() - interval '7 days'")
}
