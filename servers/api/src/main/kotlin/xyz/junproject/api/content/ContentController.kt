package xyz.junproject.api.content

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/** 공개 read-only — 일반 서버(www)가 사용. */
@RestController
class ContentController(private val service: ContentService) {

    @GetMapping("/intel")
    fun intel(@RequestParam(defaultValue = "60") limit: Int) =
        mapOf("items" to service.intel(limit))

    @GetMapping("/stats")
    fun stats() = service.stats()
}
