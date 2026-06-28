# Elasticsearch 8.x + analysis-nori (한국어 형태소)
# 하이브리드(BM25+dense kNN·RRF) RAG 저장소. dense/sparse 벡터는 .158 BGE-M3가 생산.
ARG ES_VERSION=8.15.3
FROM docker.elastic.co/elasticsearch/elasticsearch:${ES_VERSION}

# 한국어 전문검색용 nori 플러그인 (오프라인 설치 안전)
RUN bin/elasticsearch-plugin install --batch analysis-nori
