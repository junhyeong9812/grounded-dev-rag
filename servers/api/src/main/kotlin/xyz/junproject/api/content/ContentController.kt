package xyz.junproject.api.content

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/** 공개 read-only — 일반 서버(www)가 사용. */
@RestController
class ContentController(private val service: ContentService) {

    @GetMapping("/intel")
    fun intel(@RequestParam(required = false) date: String?,
              @RequestParam(defaultValue = "60") limit: Int) =
        mapOf("items" to if (date != null) service.intelByDate(date) else service.intel(limit))

    /** 뉴스가 있는 날짜 목록(일자별 필터 UI). */
    @GetMapping("/intel/dates")
    fun intelDates() = mapOf("dates" to service.intelDates())

    @GetMapping("/stats")
    fun stats() = service.stats()
}
