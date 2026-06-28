package xyz.junproject.api.monitoring

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import xyz.junproject.api.alert.AlertService
import xyz.junproject.api.config.AppProperties

/** 30초마다 각 호스트 메트릭 에이전트(:9100) 폴링 → PG 저장 → 임계 체크 → 초과 시 알림. */
@Service
class MetricsService(
    @Qualifier("agentClient") private val agent: RestClient,
    private val repo: MetricsRepository,
    private val alert: AlertService,
    private val mapper: ObjectMapper,
    private val props: AppProperties,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelay = 30_000, initialDelay = 10_000)
    fun poll() {
        for (host in props.hostList) {
            try {
                val m = agent.get().uri("http://$host:9100/metrics")
                    .retrieve().body(JsonNode::class.java) ?: continue
                val cpu = m["cpu_pct"]?.asDouble()
                val mem = m["mem"]?.get("pct")?.asDouble()
                val disk = m["disk"]?.get("pct")?.asDouble()
                val gpu = m["gpu"]?.takeIf { it.isArray && it.size() > 0 }?.get(0)
                val gpuUtil = gpu?.get("util")?.asDouble()
                val gpuMem = gpu?.get("mem_pct")?.asDouble()
                val gpuTemp = gpu?.get("temp")?.asDouble()
                repo.save(host, cpu, mem, disk, gpuUtil, gpuMem, gpuTemp,
                    m["net"]?.get("sent")?.asLong(), m["net"]?.get("recv")?.asLong(), mapper.writeValueAsString(m))
                check(host, cpu, mem, disk, gpuTemp, gpuMem)
            } catch (e: Exception) {
                log.warn("메트릭 폴링 실패 {}: {}", host, e.message)
            }
        }
    }

    private fun check(host: String, cpu: Double?, mem: Double?, disk: Double?, gpuTemp: Double?, gpuMem: Double?) {
        val t = props.thresholds
        cpu?.let { if (it > t.cpu) alert.alert(host, "CPU", it, t.cpu) }
        mem?.let { if (it > t.mem) alert.alert(host, "MEM", it, t.mem) }
        disk?.let { if (it > t.disk) alert.alert(host, "DISK", it, t.disk) }
        gpuTemp?.let { if (it > t.gpuTemp) alert.alert(host, "GPU_TEMP", it, t.gpuTemp) }
        gpuMem?.let { if (it > t.gpuMem) alert.alert(host, "GPU_MEM", it, t.gpuMem) }
    }

    @Scheduled(cron = "0 0 4 * * *")   // 매일 04:00 오래된 샘플 정리
    fun prune() = repo.prune().let { log.info("metrics_sample prune: {} rows", it) }
}
