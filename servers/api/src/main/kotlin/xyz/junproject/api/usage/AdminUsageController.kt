package xyz.junproject.api.usage

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/admin/usage")
class AdminUsageController(private val repo: UsageRepository) {

    @GetMapping
    fun usage(@RequestParam(defaultValue = "100") limit: Int) =
        mapOf("summary" to repo.summary(), "recent" to repo.recent(limit))
}
