#!/usr/bin/env bash
# projects 자동 파이프라인 — 수집(시드+티어) → claude-code 분석 → ES 임베딩.
# .9에서 실행(claude-code 인증). 데일리/수동 배치.
# 사용: ./run.sh [analyze_limit]   (기본 8 — claude-code 호출이 비싸므로 소량씩)
set -uo pipefail
cd "$(dirname "$0")"
LIMIT="${1:-8}"
LOGDIR="${PROJECTS_LOG_DIR:-$HOME/projects-logs}"; mkdir -p "$LOGDIR"
LOG="$LOGDIR/run-$(date +%F).log"
export PROJECTS_DOCS="${PROJECTS_DOCS:-$HOME/projects-docs}"
{
  echo "==================== $(date '+%F %T') projects 파이프라인 ===================="
  echo "--- 수집: famous 시드 ---"; python3 collect.py --seed famous_seed.txt
  # 티어 순회(스타 내림차순으로 점진). 환경변수로 범위 조정 가능.
  echo "--- 수집: 티어 ${TIER_MIN:-10000}..${TIER_MAX:-100000} ---"
  python3 collect.py --min "${TIER_MIN:-10000}" --max "${TIER_MAX:-100000}" --pages "${TIER_PAGES:-2}"
  echo "--- 분석(claude-code) limit=$LIMIT ---"; python3 analyze.py --limit "$LIMIT"
  echo "--- ES 임베딩 ---"; python3 ../indexer/ingest.py "$PROJECTS_DOCS/*.md" projects projects --domain repo
  echo "==================== $(date '+%F %T') 완료 ===================="
} >> "$LOG" 2>&1
echo "로그: $LOG"
