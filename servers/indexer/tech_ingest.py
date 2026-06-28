#!/usr/bin/env python3
"""study-practice 코드 레퍼런스 → tech KB. 각 파일의 *헤더 주석*(한국어 [설명]·[팁])을 추출해
ES kb(namespace=tech)에 임베딩. "이 기술 찾아줘"에 정확한 레퍼런스 파일을 반환.
raw 코드는 임베딩 안 함(잘 안 됨) — 사람이 단 설명 주석만.
사용: python tech_ingest.py [study-practice 경로]
"""
import os, sys, glob, re, hashlib, requests

EMBED = "http://192.168.55.158:8080/embed"
ES = "http://192.168.55.9:9200"
INDEX = "kb"
SP = sys.argv[1] if len(sys.argv) > 1 else "/home/jun/project/study-practice"
LANGS = {"java": "//", "javascript": "//", "rust": "//", "css": "/*", "animation": "/*", "python": "#"}
EXT = {"java": "*.java", "javascript": "*.js", "rust": "*.rs", "css": "*.css", "animation": "*.css", "python": "*.py"}


def header(path):
    """파일 맨 위 연속 주석 블록 추출(설명·팁). 코드 시작되면 멈춤."""
    try:
        lines = open(path, encoding="utf-8", errors="ignore").read().splitlines()[:18]
    except Exception:
        return ""
    out = []
    for ln in lines:
        s = ln.strip()
        if not s:
            if out:
                break
            continue
        if s.startswith(("//", "#", "/*", "*", '"""', "'''")):
            out.append(re.sub(r'^(//+|#+|/\*+|\*+/?|"""|\'\'\')', "", s).strip().rstrip("*/").strip())
        elif out:
            break
    return " ".join(o for o in out if o)[:700]


def bulk_embed(items):
    """items: [(id, doc)]. doc.chunk 임베딩 후 ES bulk."""
    texts = [d["chunk"] for _, d in items]
    vecs = requests.post(EMBED, json={"texts": texts, "sparse": False}, timeout=300).json()["dense"]
    lines = []
    for (_id, d), v in zip(items, vecs):
        d["dense"] = v
        lines.append('{"index":{"_index":"%s","_id":"%s"}}' % (INDEX, _id))
        import json
        lines.append(json.dumps(d, ensure_ascii=False))
    requests.post(f"{ES}/_bulk", data=("\n".join(lines) + "\n").encode("utf-8"),
                  headers={"Content-Type": "application/x-ndjson"})


def main():
    total = 0
    for lang, exts in EXT.items():
        d = os.path.join(SP, lang)
        if not os.path.isdir(d):
            continue
        files = glob.glob(os.path.join(d, "**", exts), recursive=True)
        batch = []
        n = 0
        for f in files:
            h = header(f)
            if len(h) < 20:
                continue
            rel = os.path.relpath(f, SP)
            cat = rel.split(os.sep)[1] if len(rel.split(os.sep)) > 1 else lang
            name = os.path.basename(f)
            _id = "tech-" + hashlib.md5(rel.encode()).hexdigest()
            chunk = f"[{cat}] {name}: {h}"
            doc = {"namespace": "tech", "source": "study-practice", "domain": lang,
                   "doc_path": rel, "title": cat, "section": name, "chunk": chunk}
            batch.append((_id, doc)); n += 1
            if len(batch) >= 32:
                bulk_embed(batch); batch = []
        if batch:
            bulk_embed(batch)
        print(f"  {lang}: {n} 파일")
        total += n
    requests.post(f"{ES}/{INDEX}/_refresh")
    print(f"= tech: {total} 레퍼런스 임베딩")


if __name__ == "__main__":
    main()
