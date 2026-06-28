package xyz.junproject.api.rag

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.ai.chat.client.ChatClient
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.MediaType
import org.springframework.http.codec.ServerSentEvent
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import reactor.core.publisher.Flux
import xyz.junproject.api.config.AppProperties

data class AskRequest(
    val question: String,
    val namespaces: List<String>? = null,
    val domains: List<String>? = null,
    val topK: Int = 6,
    val digest: Boolean = true,
)

data class Source(val namespace: String?, val domain: String?, val title: String?,
                  val section: String?, val path: String?)

data class Chunk(val namespace: String?, val domain: String?, val title: String?,
                 val section: String?, val chunk: String, val path: String?) {
    fun toSource() = Source(namespace, domain, title, section, path)
}

data class AskResponse(val question: String, val answer: String?, val sources: List<Source>,
                       val chunks: List<Chunk>? = null)

@Service
class RagService(
    @Qualifier("embedClient") private val embedClient: RestClient,
    @Qualifier("esClient") private val esClient: RestClient,
    chatClientBuilder: ChatClient.Builder,            // Spring AI — Ollama 채팅
    private val mapper: ObjectMapper,
    private val props: AppProperties,
) {
    private val chatClient = chatClientBuilder.build()
    fun ask(req: AskRequest): AskResponse {
        val chunks = hybridSearch(req.question, req.namespaces, req.domains, req.topK)
        val answer = if (req.digest) digest(req.question, chunks) else null
        return AskResponse(req.question, answer, chunks.map { it.toSource() },
            if (req.digest) null else chunks)
    }

    private fun embed(text: String): List<Double> {
        val resp = embedClient.post().uri("/embed")
            .contentType(MediaType.APPLICATION_JSON)
            .body(mapOf("texts" to listOf(text), "sparse" to false))
            .retrieve().body(JsonNode::class.java)!!
        return resp["dense"][0].map { it.asDouble() }
    }

    private fun filterTerms(namespaces: List<String>?, domains: List<String>?): List<Map<String, Any>> {
        val f = mutableListOf<Map<String, Any>>()
        if (!namespaces.isNullOrEmpty()) f.add(mapOf("terms" to mapOf("namespace" to namespaces)))
        if (!domains.isNullOrEmpty()) f.add(mapOf("terms" to mapOf("domain" to domains)))
        return f
    }

    fun hybridSearch(q: String, namespaces: List<String>?, domains: List<String>?, k: Int): List<Chunk> {
        val vec = embed(q)
        val filter = filterTerms(namespaces, domains)
        val src = listOf("namespace", "domain", "title", "section", "chunk", "doc_path")

        val knn = mutableMapOf<String, Any>(
            "field" to "dense", "query_vector" to vec, "k" to k * 4, "num_candidates" to k * 12)
        if (filter.isNotEmpty()) knn["filter"] = mapOf("bool" to mapOf("filter" to filter))
        val knnHits = search(mapOf("knn" to knn, "size" to k * 4, "_source" to src))

        val boolQ = mutableMapOf<String, Any>("must" to mapOf("match" to mapOf("chunk" to q)))
        if (filter.isNotEmpty()) boolQ["filter"] = filter
        val bmHits = search(mapOf("query" to mapOf("bool" to boolQ), "size" to k * 4, "_source" to src))

        // 수동 RRF (ES 라이선스 무관)
        val rrf = LinkedHashMap<String, Pair<Double, Chunk>>()
        for (hits in listOf(knnHits, bmHits)) {
            hits.forEachIndexed { rank, h ->
                val id = h["_id"].asText()
                val s = h["_source"]
                val c = Chunk(s["namespace"]?.asText(), s["domain"]?.asText(), s["title"]?.asText(),
                    s["section"]?.asText(), s["chunk"]?.asText() ?: "", s["doc_path"]?.asText())
                val prev = rrf[id]?.first ?: 0.0
                rrf[id] = (prev + 1.0 / (60 + rank + 1)) to c
            }
        }
        return rrf.values.sortedByDescending { it.first }.take(k).map { it.second }
    }

    private fun search(body: Map<String, Any>): List<JsonNode> {
        val resp = esClient.post().uri("/${props.index}/_search")
            .contentType(MediaType.APPLICATION_JSON).body(body)
            .retrieve().body(JsonNode::class.java)!!
        return resp["hits"]["hits"].toList()
    }

    private fun buildPrompt(question: String, chunks: List<Chunk>): String {
        val ctx = chunks.mapIndexed { i, c ->
            "[${i + 1}] (${c.namespace}/${c.domain}) ${c.title} › ${c.section}\n${c.chunk.take(1200)}"
        }.joinToString("\n\n")
        return """
            너는 한국어 기술 어시스턴트다. 다음 참고 발췌만 근거로 질문에 답하라.
            규칙: ① 반드시 한국어로만 작성하고 중국어·일본어·영어 문장을 섞지 마라(기술 용어 원문은 허용).
            ② 발췌에 없는 내용은 지어내지 말고 모른다고 하라. ③ 근거로 쓴 발췌는 [n]으로 인용하라.

            질문: $question

            참고 발췌:
            $ctx

            한국어 답변:
        """.trimIndent()
    }

    private fun digest(question: String, chunks: List<Chunk>): String =
        chatClient.prompt().user(buildPrompt(question, chunks)).call().content() ?: ""

    /** 스트리밍 — sources 이벤트 먼저, 그다음 token 이벤트들, 끝에 done. (www 채팅 UI용) */
    fun askStream(question: String, namespaces: List<String>?): Flux<ServerSentEvent<String>> {
        val chunks = hybridSearch(question, namespaces, null, 6)
        val sourcesJson = mapper.writeValueAsString(chunks.map { it.toSource() })
        val tokens = chatClient.prompt().user(buildPrompt(question, chunks)).stream().content()
            .map { ServerSentEvent.builder(it).event("token").build() }
        return Flux.concat(
            Flux.just(ServerSentEvent.builder(sourcesJson).event("sources").build()),
            tokens,
            Flux.just(ServerSentEvent.builder("done").event("done").build()),
        )
    }
}
