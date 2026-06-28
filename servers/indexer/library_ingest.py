#!/usr/bin/env python3
"""자료실 적재 — 레퍼런스 원문 전체를 PG library에 보관(브라우즈용). 임베딩(ES)과 격리된 저장소.
사용: python library_ingest.py <glob> <source> [--domain X] [--ns ref]
"""
import sys, glob, os, re, argparse, psycopg2

PG = dict(host=os.getenv("PG_HOST", "192.168.55.9"), port=5432,
          user="intel", password="CHANGE_ME", dbname="intel")
BASE = "/home/jun/project"


def first_h1(text, fallback):
    m = re.search(r"^#\s+(.+)$", text, re.M)
    return m.group(1).strip() if m else fallback


def main(path_glob, source, domain, ns):
    conn = psycopg2.connect(**PG); conn.autocommit = True; cur = conn.cursor()
    files = sorted(glob.glob(path_glob, recursive=True))
    n = 0
    for f in files:
        try:
            text = open(f, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        if len(text) < 30:
            continue
        rel = os.path.relpath(f, BASE)
        title = first_h1(text, os.path.basename(f))
        cur.execute(
            """INSERT INTO library(namespace,source,domain,path,title,full_text)
               VALUES(%s,%s,%s,%s,%s,%s)
               ON CONFLICT(source,path) DO UPDATE SET full_text=EXCLUDED.full_text, title=EXCLUDED.title""",
            (ns, source, domain, rel, title, text))
        n += 1
    print(f"= library/{source}: {n} 문서 전문 보관")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("path"); ap.add_argument("source")
    ap.add_argument("--domain", default=None); ap.add_argument("--ns", default="ref")
    a = ap.parse_args()
    main(a.path, a.source, a.domain, a.ns)
