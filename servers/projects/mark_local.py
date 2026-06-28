#!/usr/bin/env python3
"""우리쪽 서브에이전트가 만든 projects-docs/<owner>__<repo>.md 를 PG에서 done 표시.
→ .9 데일리 파이프라인이 같은 repo를 재처리하지 않게(dedup, repo full_name 키).
사용: python mark_local.py
"""
import glob, os, psycopg2

PG = dict(host=os.getenv("PG_HOST", "192.168.55.9"), port=5432,
          user="intel", password="CHANGE_ME", dbname="intel")
DOCS = "/home/jun/project/local-llm/projects-docs"


def main():
    conn = psycopg2.connect(**PG); conn.autocommit = True; cur = conn.cursor()
    n = 0
    for f in glob.glob(f"{DOCS}/*__*.md"):
        slug = os.path.basename(f)[:-3]
        parts = slug.split("__")
        if len(parts) != 2:
            continue
        full = f"{parts[0]}/{parts[1]}"
        text = open(f, encoding="utf-8").read()
        cur.execute("""UPDATE documents SET analysis_text=%s, es_indexed=true
                       WHERE namespace='projects' AND title=%s AND analysis_text IS NULL""", (text, full))
        if cur.rowcount:
            n += 1
        cur.execute("UPDATE dedup_ledger SET analyzed_at=now() WHERE dedup_key=%s", (f"repo:{full}",))
    print(f"= PG done 마킹 {n}건 (우리쪽 산출물 → .9 재처리 방지)")


if __name__ == "__main__":
    main()
