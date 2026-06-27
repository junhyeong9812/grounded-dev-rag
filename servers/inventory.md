# 서버 인벤토리 — 역할·스펙·배포

> 구조 원칙: **서버 1대 = 역할 1개 = 배포 단위 1개.** 각 `servers/<role>/`는 그 서버에 올라갈 코드 + Dockerfile/compose + deploy 스크립트를 자체 보유한다.
> 접속: 키 `/home/jun/project/sshkey/key.pem`, `ssh -i <key> jun@192.168.55.{IP}`. 같은 LAN.

## 매핑

| 폴더 | 서버 IP | 하드웨어 | 역할 | 상태 |
|------|---------|----------|------|------|
| `servers/embedding/` | **.158** | GTX 1660S 6GB(Turing) · i5-9400F · 15G · Docker | **BGE-M3 임베딩** (FastAPI + FlagEmbedding, dense+sparse HTTP) | 클린(Docker 활성) |
| `servers/llm/` | **.164** | RTX 2070S 8GB(Turing) · i7-11700F · 31G · 98G | **로컬 LLM** (Ollama + Qwen 7B — 쿼리재작성·요약, 선택·나중) | 클린 · **드라이버 0**(설치 필요) · Docker 없음 |
| `servers/core/` | **.9** | GPU 없음(Ryzen/Vega) · 8코어 · 15G · **466G** · Docker | **코어**: 벡터DB(Qdrant/ES) + indexer + MCP 서버 + 저장 | 클린(디스크 큼 → 저장 적합) |

## 배포 원칙

- 각 `servers/<role>/`는 **독립 배포** — 해당 서버에 ssh로 코드 동기(rsync/git) + Docker compose up.
- `.164`만 GPU 기반(드라이버+CUDA+Docker) 선행 필요. 나머지 둘은 Docker 준비됨.
- 배포 순서(인프라 가동 시): core(.9 벡터DB·MCP) → embedding(.158) → (llm .164는 선택·최후).

## 미결정

- 벡터DB: Qdrant vs ES(nori 한국어 recall) — `servers/core/` 안에서 결정.
- llm(.164) 도입 여부 — 콘텐츠·검색이 자리잡은 뒤 판단.

> 인프라는 **콘텐츠(corpus/)가 충분히 쌓인 뒤** 가동한다 (plan §1 — 빈 검색엔진 먼저 짓지 않기).
