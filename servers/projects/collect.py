#!/usr/bin/env python3
"""projects 수집 — GitHub API 스타 티어 순회 + 품질필터 + dedup → PG(namespace=projects, 미분석).
또는 --seed 파일(famous-dev 등 repo full_name 목록)로 특정 repo 강제 등록.
사용:
  python collect.py --min 5000 --max 10000 --pages 5
  python collect.py --seed famous_seed.txt
"""
import os, sys, json, argparse, datetime, requests, psycopg2

PG = dict(host=os.getenv("PG_HOST", "192.168.55.9"), port=5432,
          user="intel", password=os.getenv("PG_PW", "CHANGE_ME"), dbname="intel")
UA = {"User-Agent": "local-llm-projects/1.0"}
# 콘텐츠/리스트/튜토리얼 repo 제외(코드 프로젝트만)
EXCLUDE = ["awesome", "free-programming", "roadmap", "interview", "books", "cheatsheet",
           "tutorial", "100-days", "build-your-own", "guide", "-notes", "handbook",
           "resources", "collection", "list-of", "examples", "boilerplate", "starter-kit"]


def _headers():
    h = dict(UA, Accept="application/vnd.github+json")
    tok = os.getenv("GITHUB_TOKEN")
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    return h


def good(it):
    nm = it["full_name"].lower()
    if any(k in nm for k in EXCLUDE):
        return False
    if it.get("archived") or it.get("fork") or it.get("is_template"):
        return False
    if not it.get("description") or not it.get("language"):
        return False
    cutoff = (datetime.date.today() - datetime.timedelta(days=730)).isoformat()
    return (it.get("pushed_at") or "") > cutoff   # 최근 2년 활동


def upsert(cur, it):
    key = f"repo:{it['full_name']}"
    cur.execute("SELECT 1 FROM dedup_ledger WHERE dedup_key=%s", (key,))
    if cur.fetchone():
        return False
    meta = json.dumps({"stars": it.get("stargazers_count"), "language": it.get("language"),
                       "description": it.get("description"), "topics": it.get("topics", []),
                       "full_name": it["full_name"]}, ensure_ascii=False)
    try:
        cur.execute("""INSERT INTO documents(namespace,source,url,title,raw_text,score,lang)
                       VALUES('projects','github',%s,%s,%s,%s,%s) RETURNING doc_id""",
                    (it["html_url"], it["full_name"], meta, it.get("stargazers_count"), it.get("language")))
        doc_id = cur.fetchone()[0]
    except Exception:
        return False
    cur.execute("INSERT INTO dedup_ledger(dedup_key,source,doc_id) VALUES(%s,'github-repo',%s) ON CONFLICT DO NOTHING",
                (key, doc_id))
    return True


def tier(cur, min_s, max_s, pages):
    new = 0
    for page in range(1, pages + 1):
        r = requests.get("https://api.github.com/search/repositories",
                         params={"q": f"stars:{min_s}..{max_s}", "sort": "stars", "order": "desc",
                                 "per_page": 100, "page": page}, headers=_headers(), timeout=30)
        items = r.json().get("items", [])
        if not items:
            break
        for it in items:
            if good(it) and upsert(cur, it):
                new += 1
    print(f"= 스타 {min_s}..{max_s}: {new} 신규")


def seed(cur, path):
    new = 0
    for line in open(path):
        full = line.strip()
        if not full or full.startswith("#"):
            continue
        r = requests.get(f"https://api.github.com/repos/{full}", headers=_headers(), timeout=20)
        if r.status_code != 200:
            print(f"  ⚠️ {full}: {r.status_code}"); continue
        if upsert(cur, r.json()):
            new += 1
    print(f"= seed({path}): {new} 신규")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--min", type=int); ap.add_argument("--max", type=int)
    ap.add_argument("--pages", type=int, default=3); ap.add_argument("--seed")
    a = ap.parse_args()
    conn = psycopg2.connect(**PG); conn.autocommit = True; cur = conn.cursor()
    if a.seed:
        seed(cur, a.seed)
    else:
        tier(cur, a.min, a.max, a.pages)
