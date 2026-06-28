#!/usr/bin/env python3
"""미분석 projects repo를 claude-code(.9 인증)로 분석 → spring-docs 문서 → 파일 + PG analysis + 자료실(library).
ES 임베딩은 run.sh가 ingest.py로 처리. 사용: python analyze.py [--limit 10]
"""
import os, json, base64, subprocess, argparse, requests, psycopg2

PG = dict(host=os.getenv("PG_HOST", "192.168.55.9"), port=5432,
          user="intel", password="CHANGE_ME", dbname="intel")
CLAUDE_BIN = os.getenv("CLAUDE_BIN", "/home/jun/.local/bin/claude")
DOCS_DIR = os.getenv("PROJECTS_DOCS", os.path.expanduser("~/projects-docs"))
UA = {"User-Agent": "local-llm-projects/1.0"}

PROMPT = """다음 GitHub 저장소를 spring-docs식으로 한국어 분석하라. 마크다운만 출력(서론·맺음말 없이).
맨 위 **3줄 요약** 후 8개 섹션:
① 용도(무엇을 왜) ② 아키텍처 개요(추상·흐름) ③ 주요 디자인패턴 ④ 핵심 구조·모듈
⑤ 특이한 내부 기법/용도 ⑥ 핵심 알고리즘+트레이드오프 ⑦ 배울 점(좋은 패턴) ⑧ 안티패턴/주의
원칙: 완벽한 상세보다 개념·동작방식의 흐름 이해.

저장소: {full}
설명: {desc} (stars {stars}, 주언어 {lang})
README 발췌:
{readme}
"""


def gh_readme(full):
    h = dict(UA, Accept="application/vnd.github+json")
    tok = os.getenv("GITHUB_TOKEN")
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    try:
        r = requests.get(f"https://api.github.com/repos/{full}/readme", headers=h, timeout=20)
        if r.status_code == 200:
            return base64.b64decode(r.json()["content"]).decode("utf-8", "ignore")[:6000]
    except Exception:
        pass
    return "(README 없음)"


def main(limit):
    conn = psycopg2.connect(**PG); conn.autocommit = True; cur = conn.cursor()
    cur.execute("""SELECT doc_id, title, url, raw_text FROM documents
                   WHERE namespace='projects' AND source='github' AND analysis_text IS NULL
                   ORDER BY score DESC NULLS LAST LIMIT %s""", (limit,))
    rows = cur.fetchall()
    os.makedirs(DOCS_DIR, exist_ok=True)
    print(f"미분석 {len(rows)}건")
    done = 0
    for doc_id, full, url, raw in rows:
        meta = json.loads(raw) if raw else {}
        prompt = PROMPT.format(full=full, desc=meta.get("description", ""),
                               stars=meta.get("stars"), lang=meta.get("language"), readme=gh_readme(full))
        try:
            p = subprocess.run([CLAUDE_BIN, "-p", prompt], capture_output=True, text=True, timeout=300)
            doc = p.stdout.strip()
        except Exception as e:
            print(f"  실패 {full}: {e}"); continue
        if len(doc) < 200:
            print(f"  건너뜀(짧음) {full}"); continue
        slug = full.replace("/", "__")
        path = os.path.join(DOCS_DIR, f"{slug}.md")
        open(path, "w", encoding="utf-8").write(f"# {full}\n\n{doc}\n")
        cur.execute("UPDATE documents SET analysis_text=%s, es_indexed=true WHERE doc_id=%s", (doc, doc_id))
        cur.execute("UPDATE dedup_ledger SET analyzed_at=now() WHERE doc_id=%s", (doc_id,))
        cur.execute("""INSERT INTO library(namespace,source,domain,path,title,full_text)
                       VALUES('projects','projects',%s,%s,%s,%s)
                       ON CONFLICT(source,path) DO UPDATE SET full_text=EXCLUDED.full_text, title=EXCLUDED.title""",
                    (meta.get("language"), f"projects-docs/{slug}.md", full, doc))
        done += 1
        print(f"  ✓ {full}")
    print(f"= projects 분석·자료실 {done}건 (ES 임베딩은 ingest.py)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--limit", type=int, default=10)
    main(ap.parse_args().limit)
