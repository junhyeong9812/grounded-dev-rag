package xyz.junproject.api.config

import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import xyz.junproject.api.usage.UsageInterceptor

@Configuration
class WebConfig(private val usage: UsageInterceptor) : WebMvcConfigurer {

    override fun addInterceptors(registry: InterceptorRegistry) {
        registry.addInterceptor(usage)
    }

    override fun addCorsMappings(registry: CorsRegistry) {
        // Next.js BFF(SSR)가 서버사이드로 호출 — 느슨한 CORS(내부 LAN). 필요 시 P8에서 도메인 제한.
        registry.addMapping("/**").allowedOrigins("*").allowedMethods("*")
    }
}
