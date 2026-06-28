package xyz.junproject.api.content

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/** admin 전용 — 적재 데이터 조회·검증·수정·삭제. /admin/** 는 basic auth. */
@RestController
@RequestMapping("/admin/documents")
class AdminContentController(
    private val repo: ContentRepository,
    private val service: ContentService,
) {
    @GetMapping
    fun list(@RequestParam(required = false) namespace: String?,
             @RequestParam(defaultValue = "50") limit: Int,
             @RequestParam(defaultValue = "0") offset: Int) =
        mapOf("items" to repo.list(namespace, limit, offset))

    @GetMapping("/{id}")
    fun get(@PathVariable id: String): ResponseEntity<Document> =
        repo.byId(id)?.let { ResponseEntity.ok(it) } ?: ResponseEntity.notFound().build()

    data class EditRequest(val analysis: String)

    /** 분석문 수정 → PG 갱신 + ES 재임베딩(검색 일관성). */
    @PutMapping("/{id}/analysis")
    fun edit(@PathVariable id: String, @RequestBody body: EditRequest): ResponseEntity<Any> {
        repo.byId(id) ?: return ResponseEntity.notFound().build()
        repo.updateAnalysis(id, body.analysis)
        repo.byId(id)?.let { service.reembed(it) }
        return ResponseEntity.ok(mapOf("status" to "edited", "id" to id))
    }

    data class StatusRequest(val status: String)   // validated | hidden | auto

    @PutMapping("/{id}/status")
    fun status(@PathVariable id: String, @RequestBody body: StatusRequest): ResponseEntity<Any> {
        repo.byId(id) ?: return ResponseEntity.notFound().build()
        repo.updateStatus(id, body.status)
        if (body.status == "hidden") service.removeFromIndex(id)
        else repo.byId(id)?.let { service.reembed(it) }
        return ResponseEntity.ok(mapOf("status" to body.status, "id" to id))
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: String): ResponseEntity<Any> {
        repo.byId(id) ?: return ResponseEntity.notFound().build()
        service.removeFromIndex(id)
        repo.delete(id)
        return ResponseEntity.ok(mapOf("deleted" to id))
    }
}
