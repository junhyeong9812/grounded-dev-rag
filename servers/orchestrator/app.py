"""RAG 오케스트레이터 (.9) — Q&A API.
질문 → .158 임베딩 → ES 하이브리드(kNN+BM25 수동 RRF) → .164 vLLM 다이제스트(역할 C) → 답변+출처.
최종 합성은 Claude(이 API를 호출). 웹사이트/단독 Q&A는 다이제스트를 답으로 사용.
"""
import os
import requests
from fastapi import FastAPI
from pydantic import BaseModel

EMBED = os.getenv("EMBED_URL", "http://192.168.55.158:8080")
ES = os.getenv("ES_URL", "http://192.168.55.9:9200")
LLM = os.getenv("LLM_URL", "http://192.168.55.164:8000")
INDEX = "kb"

app = FastAPI(title="rag-orchestrator")


class AskReq(BaseModel):
    question: str
    namespaces: list[str] | None = None   # ['corpus','history','qa',...]
    domains: list[str] | None = None       # ['backend','database',...]
    top_k: int = 6
    digest: bool = True                     # False면 청크만(검색 전용)


def embed(text: str):
    r = requests.post(f"{EMBED}/embed", json={"texts": [text], "sparse": False}, timeout=60)
    r.raise_for_status()
    return r.json()["dense"][0]


def _filter(namespaces, domains):
    f = []
    if namespaces:
        f.append({"terms": {"namespace": namespaces}})
    if domains:
        f.append({"terms": {"domain": domains}})
    return f


def hybrid_search(q, namespaces, domains, k):
    v = embed(q)
    filt = _filter(namespaces, domains)
    src = ["namespace", "domain", "title", "section", "chunk", "doc_path"]
    knn = {"field": "dense", "query_vector": v, "k": k * 4, "num_candidates": k * 12}
    if filt:
        knn["filter"] = {"bool": {"filter": filt}}
    knn_body = {"knn": knn, "size": k * 4, "_source": src}
    bool_q = {"must": {"match": {"chunk": q}}}
    if filt:
        bool_q["filter"] = filt
    bm_body = {"query": {"bool": bool_q}, "size": k * 4, "_source": src}
    knn_hits = requests.post(f"{ES}/{INDEX}/_search", json=knn_body, timeout=30).json()["hits"]["hits"]
    bm_hits = requests.post(f"{ES}/{INDEX}/_search", json=bm_body, timeout=30).json()["hits"]["hits"]
    rrf = {}  # 수동 RRF (ES 라이선스 무관)
    for lst in (knn_hits, bm_hits):
        for rank, h in enumerate(lst):
            e = rrf.setdefault(h["_id"], [0.0, h["_source"]])
            e[0] += 1.0 / (60 + rank + 1)
    ranked = sorted(rrf.values(), key=lambda x: -x[0])[:k]
    return [s for _, s in ranked]


def digest(question, chunks):
    ctx = "\n\n".join(
        f"[{i+1}] ({c['namespace']}/{c.get('domain')}) {c['title']} › {c['section']}\n{c['chunk'][:1200]}"
        for i, c in enumerate(chunks)
    )
    prompt = (
        "다음 참고 발췌만 근거로 질문에 한국어로 답하라. 발췌에 없는 내용은 지어내지 말고 모른다고 하라. "
        "근거로 쓴 발췌는 [n]으로 인용하라.\n\n"
        f"질문: {question}\n\n참고 발췌:\n{ctx}\n\n답변:"
    )
    r = requests.post(
        f"{LLM}/v1/chat/completions",
        json={"model": "qwen", "messages": [{"role": "user", "content": prompt}],
              "temperature": 0.2, "max_tokens": 800},
        timeout=180,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ask")
def ask(req: AskReq):
    chunks = hybrid_search(req.question, req.namespaces, req.domains, req.top_k)
    out = {
        "question": req.question,
        "sources": [
            {"namespace": c["namespace"], "domain": c.get("domain"),
             "title": c["title"], "section": c["section"], "path": c["doc_path"]}
            for c in chunks
        ],
    }
    if req.digest:
        out["answer"] = digest(req.question, chunks)
    else:
        out["chunks"] = chunks
    return out
