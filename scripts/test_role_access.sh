#!/bin/bash
# 역할별 /api/data 쓰기 권한 회귀 테스트.
#
# 검증:
#   admin   → POST /api/data/{key}    → 200
#   office  → POST /api/data/{key}    → 200
#   worker  → POST /api/data/{key}    → 403 (server.py can_access_key write 가드)
#
# 사용법:
#   1) 서버 띄우기: python3 server.py  (다른 터미널)
#   2) bash scripts/test_role_access.sh
#      또는 BASE=http://100.74.217.19:8080 ADMIN_PW=Admin!2026 bash scripts/test_role_access.sh
#
# 환경변수 (기본값):
#   BASE        http://localhost:8080
#   ADMIN_USER  admin     ADMIN_PW   1234
#   OFFICE_USER office1   OFFICE_PW  1234
#   WORKER_USER worker1   WORKER_PW  0000
#   TEST_KEY    role_access_probe   (테스트 후 자동 삭제 시도)
#
# 종료 코드:
#   0  모든 케이스 기대치 일치
#   1  하나라도 어긋남 (회귀 발생)

set -u

BASE="${BASE:-http://localhost:8080}"
ADMIN_USER="${ADMIN_USER:-admin}"; ADMIN_PW="${ADMIN_PW:-1234}"
OFFICE_USER="${OFFICE_USER:-office1}"; OFFICE_PW="${OFFICE_PW:-1234}"
WORKER_USER="${WORKER_USER:-worker1}"; WORKER_PW="${WORKER_PW:-0000}"
TEST_KEY="${TEST_KEY:-role_access_probe}"

PASS=0; FAIL=0
ok()  { echo "  ✅ $*"; PASS=$((PASS+1)); }
ng()  { echo "  ❌ $*"; FAIL=$((FAIL+1)); }
note(){ echo "  · $*"; }

login() {
    local user="$1" pw="$2"
    curl -sS -X POST "$BASE/api/auth/login" \
        -H 'Content-Type: application/json' \
        -d "{\"username\":\"$user\",\"password\":\"$pw\"}" 2>/dev/null
}

extract_token() {
    # access_token 추출 (jq 없을 때도 동작)
    python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('access_token') or d.get('token') or '')" 2>/dev/null
}

probe_post() {
    local token="$1" expected="$2" label="$3"
    local code
    code=$(curl -sS -o /dev/null -w '%{http_code}' \
        -X POST "$BASE/api/data/$TEST_KEY" \
        -H "Authorization: Bearer $token" \
        -H 'Content-Type: application/json' \
        -d '{"value":"[]"}' 2>/dev/null || echo "000")
    if [ "$code" = "$expected" ]; then
        ok "$label POST /api/data/$TEST_KEY → $code (expected $expected)"
    else
        ng "$label POST /api/data/$TEST_KEY → $code (expected $expected)"
    fi
}

echo "== 서버 가용 점검 =="
HTTP=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "$BASE/" || echo "000")
if [ "$HTTP" = "000" ]; then
    echo "  ❌ $BASE 응답 없음 — 서버 먼저 띄우세요 (python3 server.py)"
    exit 2
fi
note "서버 응답 OK ($HTTP)"

echo ""
echo "== 1) admin 로그인 + POST 200 기대 =="
TOK=$(login "$ADMIN_USER" "$ADMIN_PW" | extract_token)
if [ -z "$TOK" ]; then ng "admin 로그인 실패 — 자격증명 확인 ($ADMIN_USER)"; else
    note "admin token 획득"
    probe_post "$TOK" "200" "admin"
fi

echo ""
echo "== 2) office 로그인 + POST 200 기대 =="
TOK=$(login "$OFFICE_USER" "$OFFICE_PW" | extract_token)
if [ -z "$TOK" ]; then
    note "office 계정 없음/로그인 실패 — 시드 누락 가능 (--skip)"
else
    probe_post "$TOK" "200" "office"
fi

echo ""
echo "== 3) worker 로그인 + POST 403 기대 =="
TOK=$(login "$WORKER_USER" "$WORKER_PW" | extract_token)
if [ -z "$TOK" ]; then
    note "worker 계정 없음/로그인 실패 — 시드 누락 가능 (--skip)"
else
    probe_post "$TOK" "403" "worker"
fi

echo ""
echo "== 4) (선택) 무인증 요청은 401 =="
CODE=$(curl -sS -o /dev/null -w '%{http_code}' \
    -X POST "$BASE/api/data/$TEST_KEY" \
    -H 'Content-Type: application/json' \
    -d '{"value":"[]"}' 2>/dev/null || echo "000")
if [ "$CODE" = "401" ] || [ "$CODE" = "403" ]; then
    ok "no-token POST → $CODE (인증 차단)"
else
    ng "no-token POST → $CODE (401/403 기대)"
fi

echo ""
echo "== 정리: 테스트 키 삭제 시도 (admin) =="
TOK=$(login "$ADMIN_USER" "$ADMIN_PW" | extract_token)
if [ -n "$TOK" ]; then
    curl -sS -o /dev/null -X DELETE "$BASE/api/data/$TEST_KEY" \
        -H "Authorization: Bearer $TOK" 2>/dev/null && note "$TEST_KEY 삭제 요청 보냄"
fi

echo ""
echo "=== 결과: PASS=$PASS  FAIL=$FAIL ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
