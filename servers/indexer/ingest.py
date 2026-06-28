#!/usr/bin/env python3
"""corpus·history·tech·qa 문서를 ES `kb` 인덱스에 적재.
섹션(##) 청킹 → .158 BGE-M3 임베딩(dense+sparse) → ES 하이브리드(BM25 nori + kNN).
사용: python ingest.py <dir_or_glob> <namespace> <source> [--domain X]
"""
import sys, glob, json, re, hashlib, argparse
import requests

EMBED = "http://192.168.55.158:8080/embed"
ES = "http://192.168.55.9:9200"
INDEX = "kb"

MAPPING = {
    "mappings": {"properties": {
        "namespace": {"type": "keyword"}, "source": {"type": "keyword"},
        "domain": {"type": "keyword"}, "doc_path": {"type": "keyword"},
        "title": {"type": "text", "analyzer": "nori"},
        "section": {"type": "text", "analyzer": "nori"},
        "chunk": {"type": "text", "analyzer": "nori"},
        "dense": {"type": "dense_vector", "dims": 1024, "index": True, "similarity": "cosine"},
        "sparse": {"type": "sparse_vector"},
    }}
}


def ensure_index():
    r = requests.head(f"{ES}/{INDEX}")
    if r.status_code == 404:
        requests.put(f"{ES}/{INDEX}", json=MAPPING).raise_for_status()
        print(f"  인덱스 {INDEX} 생성")


def first_h1(text):
    m = re.search(r"^#\s+(.+)$", text, re.M)
    return m.group(1).strip() if m else "(무제)"


def chunk_md(text):
    """## 섹션 단위로 청킹. 섹션 없으면 통째. (제목, 본문) 리스트."""
    parts = re.split(r"^(##\s+.+)$", text, flags=re.M)
    chunks = []
    if len(parts) <= 1:
        return [("", text.strip())]
    # parts: [pre, "## A", bodyA, "## B", bodyB, ...]
    for i in range(1, len(parts), 2):
        sec = parts[i].lstrip("# ").strip()
        body = (parts[i] + "\n" + parts[i + 1]).strip() if i + 1 < len(parts) else parts[i]
        if len(body) > 30:
            chunks.append((sec, body))
    return chunks or [("", text.strip())]


def embed(texts):
    r = requests.post(EMBED, json={"texts": texts}, timeout=300)
    r.raise_for_status()
    return r.json()


def ingest(path_glob, namespace, source, domain=None):
    ensure_index()
    files = sorted(glob.glob(path_glob, recursive=True))
    total = 0
    for f in files:
        if f.endswith("README.md") or f.endswith("INDEX.md"):  # 인덱스 문서는 건너뜀(라우팅용)
            continue
        text = open(f, encoding="utf-8").read()
        title = first_h1(text)
        chunks = chunk_md(text)
        emb = embed([c for _, c in chunks])
        bulk = []
        for i, (sec, chunk) in enumerate(chunks):
            _id = hashlib.md5(f"{f}#{i}".encode()).hexdigest()
            doc = {"namespace": namespace, "source": source, "domain": domain,
                   "doc_path": f, "title": title, "section": sec, "chunk": chunk,
                   "dense": emb["dense"][i], "sparse": emb["sparse"][i]}
            bulk.append(json.dumps({"index": {"_index": INDEX, "_id": _id}}))
            bulk.append(json.dumps(doc, ensure_ascii=False))
        resp = requests.post(f"{ES}/_bulk", data=("\n".join(bulk) + "\n").encode("utf-8"),
                             headers={"Content-Type": "application/x-ndjson"})
        errs = [it for it in resp.json().get("items", []) if it["index"].get("error")]
        print(f"  {f.split('/')[-1]}: {len(chunks)} chunks" + (f" ⚠️{len(errs)} 에러" if errs else ""))
        if errs:
            print("   ", errs[0]["index"]["error"])
        total += len(chunks)
    requests.post(f"{ES}/{INDEX}/_refresh")
    print(f"= {namespace}/{source}: {len(files)}문서 → {total} 청크 적재")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("path"); ap.add_argument("namespace"); ap.add_argument("source")
    ap.add_argument("--domain", default=None)
    a = ap.parse_args()
    ingest(a.path, a.namespace, a.source, a.domain)
