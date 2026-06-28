#!/usr/bin/env python3
"""데일리 인텔 분석기 — 미분석 intel 글의 본문 수집 → LLM 분석(한국어) → PG analysis_text + ES 임베딩.
분석 백엔드: ANALYZER=claude(claude-code CLI) | ollama(.164). 기본 ollama.
사용: python analyze.py
"""
import os, re, json, subprocess, datetime, requests, psycopg2

PG = dict(host=os.getenv("PG_HOST", "192.168.55.9"), port=5432,
          user="intel", password="CHANGE_ME", dbname="intel")
EMBED = os.getenv("EMBED_URL", "http://192.168.55.158:8080")
LLM = os.getenv("LLM_URL", "http://192.168.55.164:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen2.5:7b")
ES = os.getenv("ES_URL", "http://192.168.55.9:9200")
INDEX = "kb"
ANALYZER = os.getenv("ANALYZER", "ollama")
UA = {"User-Agent": "local-llm-intel/1.0"}

PROMPT = """다음 기술 글/저장소를 한국어로 분석하라. 형식:
- **요약**: 핵심 3줄
- **왜 중요한가**: 1~2줄 (개발자 관점)
- **태그**: 관련 기술·주제 키워드 5개

반드시 한국어로만 작성(기술 용어 원문 허용). 제목과 본문:

제목: {title}
본문(발췌):
{body}
"""


def fetch_text(url):
    try:
        r = requests.get(url, headers=UA, timeout=20)
        html = r.text
        html = re.sub(r"(?is)<(script|style|nav|footer|header).*?</\1>", " ", html)
        text = re.sub(r"(?s)<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text)
        return text.strip()[:4000]
    except Exception:
        return ""


def analyze_ollama(title, body):
    r = requests.post(f"{LLM}/v1/chat/completions",
                      json={"model": LLM_MODEL, "temperature": 0.3, "max_tokens": 500,
                            "messages": [{"role": "user", "content": PROMPT.format(title=title, body=body)}]},
                      timeout=180)
    return r.json()["choices"][0]["message"]["content"]


CLAUDE_BIN = os.getenv("CLAUDE_BIN", "/home/jun/.local/bin/claude")


def analyze_claude(title, body):
    # claude-code 헤드리스 (.9 인증됨). 실패하면 ollama로 폴백.
    try:
        p = subprocess.run([CLAUDE_BIN, "-p", PROMPT.format(title=title, body=body)],
                           capture_output=True, text=True, timeout=240)
        out = p.stdout.strip()
        return out or analyze_ollama(title, body)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return analyze_ollama(title, body)


def embed(text):
    return requests.post(f"{EMBED}/embed", json={"texts": [text], "sparse": False}, timeout=60).json()["dense"][0]


def main():
    analyze = analyze_claude if ANALYZER == "claude" else analyze_ollama
    conn = psycopg2.connect(**PG); conn.autocommit = True; cur = conn.cursor()
    cur.execute("""SELECT doc_id,source,url,title,raw_text,lang FROM documents
                   WHERE namespace='intel' AND analysis_text IS NULL ORDER BY ingested_at LIMIT 50""")
    rows = cur.fetchall()
    print(f"미분석 {len(rows)}건")
    today = datetime.date.today().isoformat()
    done = 0
    for doc_id, source, url, title, raw, lang in rows:
        body = (raw + "\n" if raw else "") + (fetch_text(url) if source != "github" else "")
        try:
            analysis = analyze(title, body or title)
        except Exception as e:
            print(f"  분석 실패 {title[:30]}: {e}"); continue
        cur.execute("UPDATE documents SET analysis_text=%s, es_indexed=true WHERE doc_id=%s", (analysis, doc_id))
        cur.execute("UPDATE dedup_ledger SET analyzed_at=now() WHERE doc_id=%s", (doc_id,))
        # ES 임베딩 (namespace=intel, 일자 태그)
        vec = embed(f"{title}\n{analysis}")
        es_doc = {"namespace": "intel", "source": source, "domain": source, "doc_path": url,
                  "title": title, "section": today, "chunk": analysis, "dense": vec}
        requests.post(f"{ES}/{INDEX}/_doc/intel-{doc_id}", json=es_doc, timeout=20)
        done += 1
        print(f"  ✓ [{source}] {title[:45]}")
    requests.post(f"{ES}/{INDEX}/_refresh")
    print(f"= 분석·적재 {done}건 (analyzer={ANALYZER})")


if __name__ == "__main__":
    main()
