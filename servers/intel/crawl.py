#!/usr/bin/env python3
"""데일리 인텔 크롤러 — 뉴스·트렌딩 repo 수집 → dedup_ledger로 신규만 → PG documents(namespace=intel).
소스당 top N(점수순) + GitHub 스타 임계. 원글 본문 수집·분석은 analyze.py.
사용: python crawl.py
"""
import os, json, datetime, requests, psycopg2

PG = dict(host=os.getenv("PG_HOST", "192.168.55.9"), port=5432,
          user="intel", password=os.getenv("PG_PW", "CHANGE_ME"), dbname="intel")
PER_SOURCE = int(os.getenv("PER_SOURCE", "3"))     # 소스당 상한
GH_MIN_STARS = int(os.getenv("GH_MIN_STARS", "300"))
HN_MIN_POINTS = 50
UA = {"User-Agent": "local-llm-intel/1.0"}


def hn():
    r = requests.get("https://hn.algolia.com/api/v1/search",
                     params={"tags": "front_page", "hitsPerPage": 20}, headers=UA, timeout=20)
    out = []
    for h in r.json().get("hits", []):
        if not h.get("url") or (h.get("points", 0) or 0) < HN_MIN_POINTS:
            continue
        out.append(dict(key=f"hn:{h['objectID']}", source="hackernews", url=h["url"],
                        title=h["title"], score=h.get("points", 0), lang="en"))
    return out


def lobsters():
    r = requests.get("https://lobste.rs/hottest.json", headers=UA, timeout=20)
    return [dict(key=f"lobsters:{h['short_id']}", source="lobsters", url=h["url"],
                 title=h["title"], score=h.get("score", 0), lang="en")
            for h in r.json() if h.get("url")]


def devto():
    r = requests.get("https://dev.to/api/articles", params={"top": 1, "per_page": 20}, headers=UA, timeout=20)
    return [dict(key=f"devto:{h['id']}", source="devto", url=h["url"], title=h["title"],
                 score=h.get("positive_reactions_count", 0), lang="en") for h in r.json()]


def geeknews():
    import xml.etree.ElementTree as ET
    r = requests.get("https://news.hada.io/rss/news", headers=UA, timeout=20)
    root = ET.fromstring(r.content)
    ns = {"a": "http://www.w3.org/2005/Atom"}   # GeekNews는 Atom 포맷
    out = []
    for e in root.findall("a:entry", ns):
        link_el = e.find("a:link", ns)
        link = link_el.get("href") if link_el is not None else None
        if not link:
            continue
        out.append(dict(key=f"geeknews:{e.findtext('a:id', '', ns) or link}", source="geeknews",
                        url=link, title=e.findtext("a:title", "", ns), score=0, lang="ko"))
    return out


def github():
    since = (datetime.date.today() - datetime.timedelta(days=7)).isoformat()
    h = dict(UA, Accept="application/vnd.github+json")
    tok = os.getenv("GITHUB_TOKEN")
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    r = requests.get("https://api.github.com/search/repositories",
                     params={"q": f"created:>{since} stars:>{GH_MIN_STARS}", "sort": "stars",
                             "order": "desc", "per_page": 15}, headers=h, timeout=20)
    out = []
    for it in r.json().get("items", []):
        out.append(dict(key=f"gh:{it['full_name']}", source="github", url=it["html_url"],
                        title=f"{it['full_name']} — {(it.get('description') or '')[:120]}",
                        score=it.get("stargazers_count", 0), lang="en",
                        raw=json.dumps({"desc": it.get("description"), "language": it.get("language"),
                                        "stars": it.get("stargazers_count"), "topics": it.get("topics", [])},
                                       ensure_ascii=False)))
    return out


SOURCES = [hn, lobsters, devto, geeknews, github]


def main():
    conn = psycopg2.connect(**PG); conn.autocommit = True; cur = conn.cursor()
    total = 0
    for fn in SOURCES:
        try:
            items = sorted(fn(), key=lambda x: -(x.get("score") or 0))
        except Exception as e:
            print(f"  {fn.__name__} 실패: {e}"); continue
        new = 0
        for it in items:
            if new >= PER_SOURCE:
                break
            cur.execute("SELECT 1 FROM dedup_ledger WHERE dedup_key=%s", (it["key"],))
            if cur.fetchone():
                continue
            try:
                cur.execute("""INSERT INTO documents(namespace,source,url,title,raw_text,lang,score,published_at)
                               VALUES('intel',%s,%s,%s,%s,%s,%s,now()) RETURNING doc_id""",
                            (it["source"], it["url"], it["title"], it.get("raw"), it.get("lang"), it.get("score")))
                doc_id = cur.fetchone()[0]
            except Exception:
                continue   # url 중복 등
            cur.execute("INSERT INTO dedup_ledger(dedup_key,source,doc_id) VALUES(%s,%s,%s) ON CONFLICT DO NOTHING",
                        (it["key"], it["source"], doc_id))
            new += 1; total += 1
        print(f"  {fn.__name__}: 신규 {new}")
    print(f"= 총 신규 {total}")


if __name__ == "__main__":
    main()
