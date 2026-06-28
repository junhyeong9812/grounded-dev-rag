-- .9 PostgreSQL 초기 스키마
-- 역할: 원글(raw) + claude-code 분석문 + dedup 원장 + 메타. (임베딩 벡터는 ES가 보유)

-- 문서: corpus/intel/tech/projects 공통. raw + analysis 보관.
CREATE TABLE IF NOT EXISTS documents (
    doc_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    namespace     TEXT NOT NULL CHECK (namespace IN ('corpus','intel','tech','projects','qa','history')),
    source        TEXT,                       -- hackernews · github · geeknews · lobsters · devto · study-practice · corpus
    url           TEXT,                       -- 원문 URL (있으면)
    title         TEXT NOT NULL,
    raw_text      TEXT,                       -- 원글 (intel/projects)
    analysis_text TEXT,                       -- claude-code 분석·요약 (RAG에 임베딩되는 본문)
    lang          TEXT,                       -- ko · en · 언어(tech)
    score         INT,                        -- HN score · GitHub stars 등 (정렬·필터용)
    published_at  TIMESTAMPTZ,                -- 원문 발행 (intel)
    ingested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    es_indexed    BOOLEAN NOT NULL DEFAULT false,  -- ES 임베딩 적재 완료 여부
    meta          JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_documents_ns_date ON documents (namespace, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_es ON documents (es_indexed) WHERE es_indexed = false;
CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_url ON documents (url) WHERE url IS NOT NULL;

-- dedup 원장: "이미 수집·분석함" — 배치의 심장. 매일 신규만 처리.
CREATE TABLE IF NOT EXISTS dedup_ledger (
    dedup_key   TEXT PRIMARY KEY,             -- url 정규화 · repo@sha · 'devto:12345' 등
    source      TEXT NOT NULL,
    doc_id      UUID REFERENCES documents(doc_id) ON DELETE SET NULL,
    first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
    analyzed_at TIMESTAMPTZ                    -- 분석 완료 시각 (NULL = 수집만, 미분석)
);
CREATE INDEX IF NOT EXISTS idx_dedup_source ON dedup_ledger (source);

-- 일자별 인텔 노출용 뷰 (웹사이트 — 분석 완료분만, 최신순)
CREATE OR REPLACE VIEW daily_intel AS
SELECT doc_id, source, url, title, analysis_text, score, published_at, meta
FROM documents
WHERE namespace = 'intel' AND analysis_text IS NOT NULL
ORDER BY published_at DESC;

-- ============ GraphRAG: 변천사 계보 그래프 (노드 + 엣지) ============
-- 변천사 문서에서 계보 추출 에이전트가 채운다. 노드 summary는 계보 녹여 ES 임베딩.
CREATE TABLE IF NOT EXISTS nodes (
    node_id  TEXT PRIMARY KEY,          -- canonical slug (예: postgresql · cap-theorem · raft)
    label    TEXT NOT NULL,             -- 표시명
    kind     TEXT,                      -- system · concept · version · language · framework · paper
    domain   TEXT,                      -- database · python · java · network · web · js
    year     INT,                       -- 등장/정립 연도
    summary  TEXT,                      -- 계보 녹인 설명 (임베딩 본문)
    doc_id   UUID REFERENCES documents(doc_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_nodes_domain ON nodes (domain);

-- 엣지: 파생/영향/대체/반작용 + 이유. 방향 = from → to.
CREATE TABLE IF NOT EXISTS edges (
    edge_id    SERIAL PRIMARY KEY,
    from_node  TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
    to_node    TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
    edge_type  TEXT NOT NULL CHECK (edge_type IN
                 ('derived_from','influenced','replaced','reacted_against','part_of','inspired_by')),
    reason     TEXT,                     -- "락 경합 → 행 락 필요" 등 파생 이유
    domain     TEXT,
    source_doc TEXT,
    UNIQUE (from_node, to_node, edge_type)
);
CREATE INDEX IF NOT EXISTS idx_edges_from ON edges (from_node);
CREATE INDEX IF NOT EXISTS idx_edges_to   ON edges (to_node);
CREATE INDEX IF NOT EXISTS idx_edges_type ON edges (edge_type);

-- ============ admin: 사용량 로그 + 검증 상태 ============
-- 접근/질문 사용량 (admin 모니터링)
CREATE TABLE IF NOT EXISTS usage_log (
    id         BIGSERIAL PRIMARY KEY,
    ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
    endpoint   TEXT,
    method     TEXT,
    query      TEXT,                       -- 질문 내용(ask)
    client_ip  TEXT,
    status     INT,
    latency_ms INT,
    meta       JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_usage_ts ON usage_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_usage_endpoint ON usage_log (endpoint);

-- documents 검증 상태 (admin 수정·검증)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'auto';  -- auto|validated|edited|hidden
ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- ============ admin: 서버 자원 모니터링 + 알림 ============
CREATE TABLE IF NOT EXISTS metrics_sample (
    id        BIGSERIAL PRIMARY KEY,
    ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
    host      TEXT NOT NULL,              -- 192.168.55.9 · .158 · .164
    cpu_pct   REAL, mem_pct REAL, disk_pct REAL,
    gpu_util  REAL, gpu_mem_pct REAL, gpu_temp REAL,
    net_sent  BIGINT, net_recv BIGINT,
    raw       JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_metrics_host_ts ON metrics_sample (host, ts DESC);

CREATE TABLE IF NOT EXISTS alert_log (
    id        BIGSERIAL PRIMARY KEY,
    ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
    host      TEXT, metric TEXT, value REAL, threshold REAL,
    sent      BOOLEAN NOT NULL DEFAULT false, detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_alert_ts ON alert_log (ts DESC);

-- ============ 자료실(library) — 레퍼런스 원문 전체 보관(브라우즈용). 임베딩(ES)과 격리 ============
CREATE TABLE IF NOT EXISTS library (
    id          BIGSERIAL PRIMARY KEY,
    namespace   TEXT NOT NULL DEFAULT 'ref',   -- ref · dict · projects
    source      TEXT NOT NULL,                 -- study_docs · valhalla · spring-security · keycloak …
    domain      TEXT,
    path        TEXT NOT NULL,                 -- 원본 상대경로 (검색 히트의 doc_path와 연결)
    title       TEXT,
    full_text   TEXT NOT NULL,                 -- 원문 전체(마크다운)
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source, path)
);
CREATE INDEX IF NOT EXISTS idx_library_source ON library (source);
