#!/usr/bin/env python3
"""미분석 projects repo를 **clone → claude-code 딥다이브 분석 → 삭제**로 처리.
실제 코드·구조를 claude-code(agentic)가 탐색해 spring-docs 문서 생성 → 파일 + PG analysis + 자료실(library).
clone은 분석 후 즉시 삭제(디스크 절약). ES 임베딩은 run.sh가 ingest.py로.
.9에서 실행(claude-code 인증). 사용: python analyze.py [--limit 8]
"""
import os, json, shutil, tempfile, subprocess, argparse, requests, psycopg2

PG = dict(host=os.getenv("PG_HOST", "192.168.55.9"), port=5432,
          user="intel", password="CHANGE_ME", dbname="intel")
CLAUDE_BIN = os.getenv("CLAUDE_BIN", "/home/jun/.local/bin/claude")
DOCS_DIR = os.getenv("PROJECTS_DOCS", os.path.expanduser("~/projects-docs"))
WORK = os.getenv("PROJECTS_WORK", os.path.expanduser("~/projects-work"))

PROMPT = """현재 디렉토리는 GitHub 저장소 **{full}**의 클론이다(얕은 클론). 코드·디렉토리 구조·핵심 파일을 직접 탐색해 분석하라.
한국어 마크다운만 출력(서론·맺음말 없이). 맨 위 **3줄 요약** 후 8개 섹션:
① 용도(무엇을 왜) ② 아키텍처 개요(추상·흐름) ③ 주요 디자인패턴 ④ 핵심 구조·모듈(실제 코드 기반)
⑤ 특이한 내부 기법/용도 ⑥ 핵심 알고리즘+트레이드오프 ⑦ 배울 점(좋은 패턴) ⑧ 안티패턴/주의
원칙: 완벽한 상세보다 개념·동작방식의 흐름 이해. 실제 코드에서 확인한 구조를 우선.
설명: {desc} (stars {stars}, 주언어 {lang})
"""


def deep_analyze(full, meta):
    os.makedirs(WORK, exist_ok=True)
    work = tempfile.mkdtemp(dir=WORK)
    try:
        cl = subprocess.run(["git", "clone", "--depth", "1", "--filter=blob:none",
                             f"https://github.com/{full}.git", work],
                            capture_output=True, text=True, timeout=240)
        if cl.returncode != 0:
            return None  # clone 실패 → 건너뜀(다음 배치 재시도)
        prompt = PROMPT.format(full=full, desc=meta.get("description", ""),
                               stars=meta.get("stars"), lang=meta.get("language"))
        p = subprocess.run([CLAUDE_BIN, "-p", prompt, "--permission-mode", "bypassPermissions"],
                           cwd=work, capture_output=True, text=True, timeout=600)
        return p.stdout.strip()
    except subprocess.TimeoutExpired:
        return None
    finally:
        shutil.rmtree(work, ignore_errors=True)   # clone 즉시 삭제


def main(limit):
    conn = psycopg2.connect(**PG); conn.autocommit = True; cur = conn.cursor()
    cur.execute("""SELECT doc_id, title, url, raw_text FROM documents
                   WHERE namespace='projects' AND source='github' AND analysis_text IS NULL
                   ORDER BY score DESC NULLS LAST LIMIT %s""", (limit,))  # 스타 순차
    rows = cur.fetchall()
    os.makedirs(DOCS_DIR, exist_ok=True)
    print(f"미분석 {len(rows)}건 (스타순)")
    done = 0
    for doc_id, full, url, raw in rows:
        meta = json.loads(raw) if raw else {}
        doc = deep_analyze(full, meta)
        if not doc or len(doc) < 200:
            print(f"  건너뜀 {full}"); continue
        slug = full.replace("/", "__")
        open(os.path.join(DOCS_DIR, f"{slug}.md"), "w", encoding="utf-8").write(f"# {full}\n\n{doc}\n")
        cur.execute("UPDATE documents SET analysis_text=%s, es_indexed=true WHERE doc_id=%s", (doc, doc_id))
        cur.execute("UPDATE dedup_ledger SET analyzed_at=now() WHERE doc_id=%s", (doc_id,))
        cur.execute("""INSERT INTO library(namespace,source,domain,path,title,full_text)
                       VALUES('projects','projects',%s,%s,%s,%s)
                       ON CONFLICT(source,path) DO UPDATE SET full_text=EXCLUDED.full_text, title=EXCLUDED.title""",
                    (meta.get("language"), f"projects-docs/{slug}.md", full, doc))
        done += 1
        print(f"  ✓ {full} (clone 딥다이브)")
    print(f"= projects 딥다이브 {done}건 (ES 임베딩은 ingest.py)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--limit", type=int, default=8)
    main(ap.parse_args().limit)
