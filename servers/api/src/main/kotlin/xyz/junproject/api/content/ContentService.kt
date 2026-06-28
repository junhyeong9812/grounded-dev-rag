package xyz.junproject.api.content

import com.fasterxml.jackson.databind.JsonNode
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import xyz.junproject.api.config.AppProperties

@Service
class ContentService(
    private val repo: ContentRepository,
    @Qualifier("embedClient") private val embedClient: RestClient,
    @Qualifier("esClient") private val esClient: RestClient,
    private val props: AppProperties,
) {
    fun intel(limit: Int) = repo.intel(limit)

    fun stats(): Map<String, Any> {
        val agg = esClient.post().uri("/${props.index}/_search")
            .contentType(MediaType.APPLICATION_JSON)
            .body(mapOf("size" to 0, "aggs" to mapOf("ns" to mapOf("terms" to mapOf("field" to "namespace")))))
            .retrieve().body(JsonNode::class.java)!!
        val ns = agg["aggregations"]["ns"]["buckets"].associate { it["key"].asText() to it["doc_count"].asInt() }
        return mapOf("namespaces" to ns, "graph" to mapOf("nodes" to repo.countNodes(), "edges" to repo.countEdges()))
    }

    /** admin이 분석문 수정 후 ES 재임베딩 (검색 일관성 유지). */
    fun reembed(doc: Document) {
        val text = "${doc.title}\n${doc.analysis ?: ""}"
        val vec = embedClient.post().uri("/embed").contentType(MediaType.APPLICATION_JSON)
            .body(mapOf("texts" to listOf(text), "sparse" to false))
            .retrieve().body(JsonNode::class.java)!!["dense"][0].map { it.asDouble() }
        val esDoc = mapOf("namespace" to doc.namespace, "source" to doc.source, "domain" to doc.source,
            "doc_path" to doc.url, "title" to doc.title, "section" to (doc.date ?: ""),
            "chunk" to (doc.analysis ?: doc.title), "dense" to vec)
        esClient.put().uri("/${props.index}/_doc/intel-${doc.docId}")
            .contentType(MediaType.APPLICATION_JSON).body(esDoc).retrieve().toBodilessEntity()
    }

    fun removeFromIndex(docId: String) {
        runCatching {
            esClient.delete().uri("/${props.index}/_doc/intel-$docId").retrieve().toBodilessEntity()
        }
    }
}
