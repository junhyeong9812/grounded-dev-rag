#!/usr/bin/env bash
# 데일리 인텔 배치 — 크롤 → 분석 → 임베딩. systemd timer가 매일 호출.
set -uo pipefail
cd "$(dirname "$0")"
LOGDIR="${INTEL_LOG_DIR:-$HOME/intel-logs}"
mkdir -p "$LOGDIR"
LOG="$LOGDIR/daily-$(date +%F).log"
{
  echo "==================== $(date '+%F %T') 데일리 인텔 시작 ===================="
  echo "--- 크롤 ---"; python3 crawl.py
  echo "--- 분석·임베딩 ---"; python3 analyze.py
  echo "==================== $(date '+%F %T') 완료 ===================="
} >> "$LOG" 2>&1
