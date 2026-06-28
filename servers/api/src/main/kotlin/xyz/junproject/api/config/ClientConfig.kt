package xyz.junproject.api.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.web.client.RestClient

/** 임베딩(.158)·ES(.9)·LLM(.164)·메트릭 에이전트 호출용 RestClient.
 *  가상스레드 위에서 블로킹 호출 — 별도 리액티브 불필요. */
@Configuration
class ClientConfig(private val props: AppProperties) {

    private fun factory(connectMs: Int, readMs: Int) = SimpleClientHttpRequestFactory().apply {
        setConnectTimeout(connectMs); setReadTimeout(readMs)
    }

    @Bean("embedClient")
    fun embedClient() = RestClient.builder().baseUrl(props.embedUrl)
        .requestFactory(factory(3000, 60000)).build()

    @Bean("esClient")
    fun esClient() = RestClient.builder().baseUrl(props.esUrl)
        .requestFactory(factory(3000, 30000)).build()

    @Bean("llmClient")
    fun llmClient() = RestClient.builder().baseUrl(props.llmUrl)
        .requestFactory(factory(3000, 180000)).build()

    @Bean("agentClient")
    fun agentClient() = RestClient.builder()
        .requestFactory(factory(3000, 8000)).build()
}
