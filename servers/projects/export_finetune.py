#!/usr/bin/env python3
"""P4 — 학습 대화(study_message)를 LLaMA-Factory 파인튜닝 코퍼스(sharegpt JSONL)로 export.
Claude가 가르친 Q&A를 로컬 모델(qwen) LoRA 튜닝 데이터로 재활용 — 닫힌 학습 루프.
사용: python export_finetune.py [out.jsonl]   (기본 ~/study_finetune.jsonl)
"""
import json, os, sys, psycopg2

PG = dict(host=os.getenv("PG_HOST", "192.168.55.9"), port=5432,
          user="intel", password=os.getenv("PG_PW", "CHANGE_ME"), dbname="intel")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/study_finetune.jsonl")


def main():
    conn = psycopg2.connect(**PG); cur = conn.cursor()
    # 세션별 메시지 → sharegpt conversations(user/assistant 교대)
    cur.execute("SELECT id FROM study_session ORDER BY id")
    sessions = [r[0] for r in cur.fetchall()]
    n = 0
    with open(OUT, "w", encoding="utf-8") as f:
        for sid in sessions:
            cur.execute(
                "SELECT role, content FROM study_message WHERE session_id=%s ORDER BY id", (sid,))
            msgs = [{"from": "human" if r[0] == "user" else "gpt", "value": r[1]}
                    for r in cur.fetchall() if r[1] and r[1].strip()]
            # 최소 1 user+1 assistant 쌍, gpt로 시작 안 함
            if len(msgs) >= 2 and msgs[0]["from"] == "human":
                f.write(json.dumps({"conversations": msgs}, ensure_ascii=False) + "\n")
                n += 1
    print(f"= 파인튜닝 코퍼스 {n}개 대화 → {OUT} (LLaMA-Factory sharegpt 포맷)")


if __name__ == "__main__":
    main()
