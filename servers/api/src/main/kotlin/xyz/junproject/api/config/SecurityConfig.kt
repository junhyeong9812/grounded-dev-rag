package xyz.junproject.api.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.password.NoOpPasswordEncoder
import org.springframework.security.provisioning.InMemoryUserDetailsManager
import org.springframework.security.web.SecurityFilterChain

/** 공개(/ask·/intel·/stats·/search)는 오픈, admin 경로는 basic auth.
 *  admin 계정은 application.yml(app.admin 항목). 내부 LAN — P8에서 강화. */
@Configuration
class SecurityConfig(private val props: AppProperties) {

    @Bean
    fun users(): UserDetailsService = InMemoryUserDetailsManager(
        User.withUsername(props.adminUser).password(props.adminPass).roles("ADMIN").build()
    )

    @Suppress("DEPRECATION")
    @Bean
    fun encoder() = NoOpPasswordEncoder.getInstance()

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .authorizeHttpRequests {
                it.requestMatchers("/admin/**").hasRole("ADMIN")
                  .anyRequest().permitAll()
            }
            .httpBasic { }
        return http.build()
    }
}
