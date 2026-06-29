package xyz.junproject.api.content

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.stereotype.Repository

data class Document(
    val docId: String,
    val namespace: String,
    val source: String?,
    val url: String?,
    val title: String,
    val analysis: String?,
    val score: Int?,
    val date: String?,
    val reviewStatus: String,
)

@Repository
class ContentRepository(private val jdbc: JdbcTemplate) {

    private val cols = """doc_id, namespace, source, url, title, analysis_text,
        score, to_char(published_at,'YYYY-MM-DD') AS d, review_status"""

    private val mapper = RowMapper { rs, _ ->
        Document(rs.getString("doc_id"), rs.getString("namespace"), rs.getString("source"),
            rs.getString("url"), rs.getString("title"), rs.getString("analysis_text"),
            rs.getObject("score", Integer::class.java)?.toInt(), rs.getString("d"),
            rs.getString("review_status"))
    }

    fun intel(limit: Int): List<Document> = jdbc.query(
        "SELECT $cols FROM documents WHERE namespace='intel' AND analysis_text IS NOT NULL " +
            "AND review_status <> 'hidden' ORDER BY published_at DESC LIMIT ?", mapper, limit)

    /** 뉴스가 있는 날짜 목록(최신순) — 일자별 필터 UI용. */
    fun intelDates(): List<String> = jdbc.queryForList(
        "SELECT DISTINCT to_char(published_at,'YYYY-MM-DD') d FROM documents " +
            "WHERE namespace='intel' AND analysis_text IS NOT NULL AND review_status <> 'hidden' " +
            "ORDER BY d DESC", String::class.java)

    /** 특정 날짜 뉴스 — 출처·점수순(프론트가 출처별 그룹). */
    fun intelByDate(date: String): List<Document> = jdbc.query(
        "SELECT $cols FROM documents WHERE namespace='intel' AND analysis_text IS NOT NULL " +
            "AND review_status <> 'hidden' AND to_char(published_at,'YYYY-MM-DD')=? " +
            "ORDER BY source, score DESC NULLS LAST", mapper, date)

    fun byId(id: String): Document? = jdbc.query(
        "SELECT $cols FROM documents WHERE doc_id = ?::uuid", mapper, id).firstOrNull()

    fun list(namespace: String?, limit: Int, offset: Int): List<Document> =
        if (namespace == null)
            jdbc.query("SELECT $cols FROM documents ORDER BY ingested_at DESC LIMIT ? OFFSET ?",
                mapper, limit, offset)
        else
            jdbc.query("SELECT $cols FROM documents WHERE namespace=? ORDER BY ingested_at DESC LIMIT ? OFFSET ?",
                mapper, namespace, limit, offset)

    fun updateAnalysis(id: String, analysis: String) =
        jdbc.update("UPDATE documents SET analysis_text=?, review_status='edited', reviewed_at=now() WHERE doc_id=?::uuid",
            analysis, id)

    fun updateStatus(id: String, status: String) =
        jdbc.update("UPDATE documents SET review_status=?, reviewed_at=now() WHERE doc_id=?::uuid", status, id)

    fun delete(id: String) = jdbc.update("DELETE FROM documents WHERE doc_id=?::uuid", id)

    fun countNodes(): Int = jdbc.queryForObject("SELECT count(*) FROM nodes", Int::class.java) ?: 0
    fun countEdges(): Int = jdbc.queryForObject("SELECT count(*) FROM edges", Int::class.java) ?: 0
}
