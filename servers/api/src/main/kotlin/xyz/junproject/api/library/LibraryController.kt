package xyz.junproject.api.library

import org.springframework.http.ResponseEntity
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.*

/** 자료실(library) — 레퍼런스 원문 보관소. 공개 read(브라우즈). 임베딩(ES)과 격리. */
@RestController
@RequestMapping("/library")
class LibraryController(private val jdbc: JdbcTemplate) {

    /** 소스 목록 + 문서 수 (자료실 첫 화면). */
    @GetMapping
    fun sources() = mapOf("sources" to jdbc.queryForList(
        "SELECT source, max(domain) domain, count(*) cnt FROM library GROUP BY source ORDER BY source"))

    /** 한 소스의 문서 목록. */
    @GetMapping("/docs")
    fun docs(@RequestParam source: String) = mapOf("docs" to jdbc.queryForList(
        "SELECT id, title, path FROM library WHERE source=? ORDER BY path", source))

    /** 문서 전문. */
    @GetMapping("/{id}")
    fun doc(@PathVariable id: Long): ResponseEntity<Map<String, Any>> {
        val rows = jdbc.queryForList(
            "SELECT id, source, domain, title, path, full_text FROM library WHERE id=?", id)
        return rows.firstOrNull()?.let { ResponseEntity.ok(it) } ?: ResponseEntity.notFound().build()
    }

    /** 자료실 전문검색(제목·경로 — 빠른 찾기. 의미검색은 /ask). */
    @GetMapping("/search")
    fun search(@RequestParam q: String) = mapOf("docs" to jdbc.queryForList(
        "SELECT id, source, title, path FROM library WHERE title ILIKE ? OR path ILIKE ? ORDER BY source LIMIT 50",
        "%$q%", "%$q%"))
}
