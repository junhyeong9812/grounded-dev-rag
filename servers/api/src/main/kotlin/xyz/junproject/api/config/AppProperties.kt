package xyz.junproject.api.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app")
data class AppProperties(
    val embedUrl: String,
    val esUrl: String,
    val llmUrl: String,
    val llmModel: String,
    val index: String,
    val hosts: String,
    val alertFrom: String,
    val alertTo: String,
    val adminUser: String,
    val adminPass: String,
    val thresholds: Thresholds,
) {
    val hostList: List<String> get() = hosts.split(",").map { it.trim() }.filter { it.isNotEmpty() }

    data class Thresholds(
        val cpu: Double, val mem: Double, val disk: Double,
        val gpuTemp: Double, val gpuMem: Double,
    )
}
