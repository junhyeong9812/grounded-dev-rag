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
