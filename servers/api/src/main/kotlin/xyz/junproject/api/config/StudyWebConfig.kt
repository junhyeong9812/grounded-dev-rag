package xyz.junproject.api.config

import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import xyz.junproject.api.auth.StudyAuthInterceptor

/** /study/** 에 세션 게이트 인터셉터 등록(매 요청 검증). */
@Configuration
class StudyWebConfig(private val studyAuth: StudyAuthInterceptor) : WebMvcConfigurer {
    override fun addInterceptors(registry: InterceptorRegistry) {
        registry.addInterceptor(studyAuth).addPathPatterns("/study/**")
    }
}
