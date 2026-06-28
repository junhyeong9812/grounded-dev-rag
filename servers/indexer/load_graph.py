#!/usr/bin/env python3
"""graph/*.json(계보) → PostgreSQL nodes/edges 적재 + 노드 요약을 ES kb(namespace=graph)에 임베딩.
GraphRAG: 노드 summary(계보 녹임)를 벡터화해 검색이 계보를 인식 + 엣지로 traversal.
사용: python load_graph.py [graph_dir]
"""
import sys, glob, json, requests, psycopg2

EMBED = "http://192.168.55.158:8080/embed"
ES = "http://192.168.55.9:9200"
INDEX = "kb"
PG = dict(host="192.168.55.9", port=5432, user="intel", password="CHANGE_ME", dbname="intel")


def load(graph_dir="graph"):
    nodes, edges = {}, []
    for f in sorted(glob.glob(f"{graph_dir}/*.json")):
        try:
            d = json.load(open(f, encoding="utf-8"))
        except Exception as e:
            print(f"  ⚠️ {f} 파싱 실패: {e}"); continue
        for n in d.get("nodes", []):
            nodes[n["node_id"]] = n
        edges += d.get("edges", [])
        print(f"  {f.split('/')[-1]}: nodes {len(d.get('nodes',[]))}, edges {len(d.get('edges',[]))}")

    conn = psycopg2.connect(**PG); cur = conn.cursor()
    for n in nodes.values():
        cur.execute(
            """INSERT INTO nodes(node_id,label,kind,domain,year,summary) VALUES(%s,%s,%s,%s,%s,%s)
               ON CONFLICT(node_id) DO UPDATE SET label=EXCLUDED.label,kind=EXCLUDED.kind,
               domain=EXCLUDED.domain,year=EXCLUDED.year,summary=EXCLUDED.summary""",
            (n["node_id"], n.get("label", n["node_id"]), n.get("kind"), n.get("domain"),
             n.get("year"), n.get("summary")))
    skipped = 0
    for e in edges:
        fr, to = e.get("from"), e.get("to")
        if not fr or not to:
            continue
        for nid in (fr, to):                      # 누락 노드는 스텁 생성(FK 보호)
            if nid not in nodes:
                cur.execute("INSERT INTO nodes(node_id,label) VALUES(%s,%s) ON CONFLICT DO NOTHING", (nid, nid))
        try:
            cur.execute(
                """INSERT INTO edges(from_node,to_node,edge_type,reason,domain) VALUES(%s,%s,%s,%s,%s)
                   ON CONFLICT(from_node,to_node,edge_type) DO UPDATE SET reason=EXCLUDED.reason""",
                (fr, to, e.get("type", "influenced"), e.get("reason"), e.get("domain")))
        except Exception:
            conn.rollback(); skipped += 1; continue
    conn.commit()

    # 노드 요약 → ES kb 임베딩 (namespace=graph)
    nl = list(nodes.values())
    texts = [f"{n.get('label')} ({n.get('year','')}): {n.get('summary','')}".strip() for n in nl]
    emb = requests.post(EMBED, json={"texts": texts, "sparse": False}, timeout=300).json()["dense"]
    bulk = []
    for n, v, t in zip(nl, emb, texts):
        _id = "node-" + n["node_id"]
        doc = {"namespace": "graph", "source": "lineage", "domain": n.get("domain"),
               "doc_path": f"graph/{n.get('domain')}.json", "title": n.get("label"),
               "section": f"계보 노드 · {n.get('kind','')}", "chunk": t, "dense": v}
        bulk.append(json.dumps({"index": {"_index": INDEX, "_id": _id}}))
        bulk.append(json.dumps(doc, ensure_ascii=False))
    requests.post(f"{ES}/_bulk", data=("\n".join(bulk) + "\n").encode("utf-8"),
                  headers={"Content-Type": "application/x-ndjson"})
    requests.post(f"{ES}/{INDEX}/_refresh")
    cur.execute("SELECT count(*) FROM nodes"); nc = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM edges"); ec = cur.fetchone()[0]
    conn.close()
    print(f"= PG: nodes {nc}, edges {ec} (skip {skipped}) · ES: {len(nl)} 노드 임베딩")


if __name__ == "__main__":
    load(sys.argv[1] if len(sys.argv) > 1 else "graph")
