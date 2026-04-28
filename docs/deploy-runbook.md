# 팩플로우 배포 런북

> NAS 운영자/관리자용. Tailscale 직접 배포 + 자동 백업 + 서버 detach 검증 + 롤백까지의 표준 절차.

---

## 0. 배포 구성 한눈에

| 항목 | 값 |
|---|---|
| NAS Tailscale IP | `100.74.217.19` |
| NAS LAN IP | `192.168.0.2` |
| NAS SSH 사용자 | `inno` |
| NAS 앱 경로 | `/volume1/homes/apps/packflow` |
| 외부 도메인 | `https://packflow.mckim.i234.me` |
| 자동 배포 스케줄 | DSM 작업 스케줄러 — 매일 00:00 |
| 자동 배포 스크립트 | `scripts/nas-auto-deploy.sh` |
| 즉시 배포 (Mac) | `./update-nas.sh` |
| 자동 백업 스크립트 | `nas-auto-backup.sh` (DSM 등록 필요) |
| 워치독 스크립트 | `scripts/nas-watchdog.sh` (DSM 등록 필요) |

---

## 1. Tailscale 직접 배포 — 사전 리허설 (Dry-run)

> 실제 배포 전, NAS 측 상태와 도구 가용성만 점검하여 실패 위험을 미리 잡는다. 데이터/서버에 영향을 주지 않는다.

### 1.1. Mac 측 점검
```bash
# Tailscale 연결 확인 (Mac)
tailscale status | grep "$NAS_TS_IP" || echo "Tailscale 미연결"
ping -c 1 -W 2000 100.74.217.19

# SSH 키 인증 확인
ssh -o BatchMode=yes -o ConnectTimeout=5 inno@100.74.217.19 'echo ok'
# → 'ok' 가 나오면 통과. 비밀번호 묻거나 timeout 이면 키 인증 재설정 필요.
```

### 1.2. NAS 측 점검 (SSH 후)
```bash
ssh inno@100.74.217.19
cd /volume1/homes/apps/packflow

# (a) 작업 트리 깨끗한지 (로컬 수동 변경 없는지)
git status --short
# → server.py / database.py / data/ 외에 unstaged 가 있으면 자동배포가 충돌할 수 있음

# (b) 원격과의 차이
git fetch origin main
git log --oneline HEAD..origin/main | head -10
# → 0줄이면 변경 없음, 그 이상이면 자동배포가 적용할 커밋 목록

# (c) 디스크 여유 (백업 + 빌드 여분)
df -h /volume1 | tail -1

# (d) 서버 프로세스 + 응답
pgrep -af 'python3 server.py'
curl -sS -o /dev/null -w "code=%{http_code}\n" --max-time 5 http://127.0.0.1:8080/m

# (e) 백업 파일 최신본 (롤백 대비)
ls -lt data/backup | head -3
ls -lt data/mes.db.bak* 2>/dev/null | head -3
```

### 1.3. 리허설 통과 기준
- 위 5개 점검 모두 응답 정상 (timeout/permission denied 0건)
- `git status` 에 의도치 않은 unstaged 변경 없음
- `data/mes.db.bak-*` 또는 `data/backup/` 에 24시간 이내 백업 1개 이상 존재
  - 없으면 1.4 의 수동 백업을 먼저 실행

### 1.4. 배포 직전 수동 백업 (권장)
```bash
# NAS에서
cd /volume1/homes/apps/packflow
TS=$(date +%Y%m%d-%H%M)
cp -p data/mes.db data/mes.db.bak-predeploy-$TS
echo "$TS" >> data/backup/predeploy.log
ls -lh data/mes.db.bak-predeploy-$TS
```

---

## 2. 즉시 배포 실행 (Mac → NAS)

### 2.1. 표준 절차
```bash
# Mac에서
cd /Users/shoon/Documents/팩플로우
git status                    # main 깨끗한지
git push origin main          # GitHub 에 먼저 올린다
./update-nas.sh               # Tailscale SSH 로 NAS 자동 배포 트리거
```

### 2.2. 정상 출력 형태
```
✓ Tailscale 연결됨
NAS 자동 배포 스크립트 실행...
[2026-04-28 ...] === 자동 배포 시작 ===
[...] 업데이트: <old> -> <new>
[...] static/ 업데이트 완료
[...] scripts/ 업데이트 완료
[...] 서버 재시작 성공 (시도 1)
=== 응답 확인 ===
Tailscale 직접: code:200 time:0.0xs
외부 HTTPS    : code:200 time:0.xxs
✅ 배포 완료!
```

### 2.3. 실패 신호와 1차 대응
| 증상 | 1차 대응 |
|---|---|
| `❌ NAS Tailscale 응답 없음` | Mac/NAS 양쪽 Tailscale 앱 재기동, `tailscale up` |
| `Permission denied (publickey)` | `ssh-copy-id inno@100.74.217.19` 로 키 재등록 |
| `=== 응답 확인 ===` 에서 code:000/timeout | 5분 후 한번 더 `curl http://100.74.217.19:8080/m` — 부팅 지연일 수 있음 |
| 응답이 5분 후에도 안 옴 | §4 롤백 절차로 즉시 회복 후 원인 분석 |

---

## 3. 서버 재시작 detach 실측 검증

> 배경: DSM 작업 스케줄러는 자식 프로세스가 부모 셸을 따라 죽는 일이 잦다. `nas-auto-deploy.sh` / `nas-watchdog.sh` 는 다음 4중 보호로 detach 한다:
>
> 1. `pkill` → 3초 sleep (기존 프로세스 정리 + 포트 release)
> 2. `( setsid bash -c "sleep 2 ; exec nohup python3 server.py" ) &` — 더블 fork
> 3. 모든 FD 분리 (`</dev/null >/dev/null 2>&1`)
> 4. `disown`

### 3.0. 한 명령 검증 (권장)
```bash
# Mac 에서 — verify-detach.sh 를 NAS 에 올려 실행, 결과만 받음
ssh inno@100.74.217.19 'bash -s' < scripts/verify-detach.sh
```
출력 마지막 줄이 `결과: PASS=N  FAIL=0` 이면 통과. FAIL 이 1 이상이면 §3.5 점검.

### 3.1. 자동 배포 detach 실측 (NAS SSH)
```bash
ssh inno@100.74.217.19
cd /volume1/homes/apps/packflow

# 자동 배포 스크립트 직접 실행 (대화 셸에서)
bash scripts/nas-auto-deploy.sh

# 실행 직후 — 자식 프로세스 PPID 확인
sleep 12
pgrep -af 'python3 server.py'
# 예: 12345 python3 server.py
ps -o pid,ppid,sid,stat,cmd -p $(pgrep -f 'python3 server.py')
# → PPID=1 (init) 이어야 함. 1 이면 부모 셸 종료해도 살아남는다.
# → STAT 에 + 가 없어야 함 (foreground process group 분리됨).
# → SID 가 자기 자신 PID 와 같아야 함 (setsid 새 세션 분리).
```

### 3.2. 부모 셸 종료 시 생존 검증
```bash
# (대화 셸 그대로 종료)
exit

# 잠시 후 Mac 에서 다시 SSH 접속
ssh inno@100.74.217.19 'pgrep -af "python3 server.py"; curl -sS -o /dev/null -w "code=%{http_code}\n" http://127.0.0.1:8080/m'
# → 같은 PID 가 살아 있고 code=200 이면 detach 성공.
```

### 3.3. cron/DSM 트리거 환경 모사
```bash
# DSM 작업 스케줄러는 비대화 환경 — 가장 가까운 모사:
ssh inno@100.74.217.19 'nohup bash /volume1/homes/apps/packflow/scripts/nas-auto-deploy.sh </dev/null >/tmp/deploy-test.log 2>&1 &'
sleep 15
ssh inno@100.74.217.19 'tail -20 /volume1/homes/apps/packflow/auto-deploy.log; pgrep -af "python3 server.py"'
```

### 3.4. 통과 기준
- `python3 server.py` PID 가 1개만 떠 있다
- 그 PID 의 PPID = 1
- `auto-deploy.log` 마지막 줄이 `서버 재시작 성공 (시도 N)` (N≤5)
- `curl http://127.0.0.1:8080/m` → 200

### 3.5. 실패 시 점검 포인트
- 로그에 `Address already in use` → `pkill` 다음 sleep 부족. 3 → 5초로 늘려본다.
- 같은 PID 가 30초 안에 사라짐 → setsid/disown 적용 안 됨. shebang 이 `bash` 인지 (`/bin/sh` 면 `setsid` 미지원 가능).
- `재시도 5 — 응답 없음` → 부팅 자체 실패. `tail -50 server.log` 로 원인 파악 (DB 마이그레이션, 포트 충돌 등).

### 부록 A. 2026-04-28 NAS detach 실측 결과

> NAS 측에서 `bash scripts/verify-detach.sh` 또는 Mac 측에서 `ssh inno@100.74.217.19 'bash -s' < scripts/verify-detach.sh` 를 실행한 출력을 그대로 붙여넣고, 아래 통과 기준 체크리스트에 표시한다.

```
TODO: NAS에서 ./scripts/verify-detach.sh 실행 후 출력 붙여넣기
(아래는 실행 결과 들어갈 자리)

=== A. 현재 서버 detach 상태 점검 ===
  · PID=...  PPID=...  SID=...  STAT=...
  · ...
  ✅/❌ ...

=== B. 응답 점검 ===
  ✅/❌ 127.0.0.1:8080/m → ...

=== C. 자동 배포 / 워치독 로그 마지막 줄 ===
  · auto-deploy.log:
      ...

=== 결과: PASS=...  FAIL=... ===
```

#### 통과 기준 충족 여부

- [ ] `python3 server.py` PID 가 1개만 떠 있음 (중복 기동 없음)
- [ ] PPID = 1 (init) — 부모 셸 종료 후에도 살아남음
- [ ] STAT 에 `+` 없음 — foreground process group 분리 성공
- [ ] SID = PID — `setsid` 로 새 세션 분리됨
- [ ] `auto-deploy.log` 마지막 줄이 `서버 재시작 성공 (시도 N)` 형태 (N ≤ 5)
- [ ] `curl http://127.0.0.1:8080/m` → 200
- [ ] verify-detach.sh 종합 결과: `PASS=N FAIL=0`
- [ ] (선택) §3.3 cron/DSM 모사로 비대화 환경에서도 detach 유지 확인

> 1개라도 미충족이면 §3.5 점검 포인트 → 원인 해결 → 재실측 → 본 부록 출력 갱신.
> 모두 충족되면 자동 배포·워치독을 DSM 작업 스케줄러에 등록해도 안전한 상태.

---

## 4. 롤백 절차

### 4.1. 코드 롤백 (GitHub 커밋이 문제일 때)
```bash
# Mac에서 — 직전 커밋으로 강제 되돌림 (push 권한 필요)
cd /Users/shoon/Documents/팩플로우
git log --oneline -5
git revert <BAD_SHA> --no-edit          # revert 권장 (히스토리 보존)
# 또는 (어쩔 수 없을 때만) git reset --hard <GOOD_SHA> && git push --force-with-lease origin main
git push origin main
./update-nas.sh                         # 즉시 재배포
```

### 4.2. NAS 로컬 즉시 롤백 (재기동만 필요할 때)
```bash
ssh inno@100.74.217.19
cd /volume1/homes/apps/packflow

# 직전 origin/main 으로만 재배포 (코드는 그대로, 서버 재기동)
pkill -f 'python3 server.py'; sleep 3
( setsid bash -c "sleep 2; cd '$PWD'; exec nohup python3 server.py </dev/null >>server.log 2>&1" </dev/null >/dev/null 2>&1 & ) </dev/null >/dev/null 2>&1 &
disown
sleep 8
curl -sS -o /dev/null -w "code=%{http_code}\n" http://127.0.0.1:8080/m
```

### 4.3. DB 롤백 (데이터 사고 시)
```bash
ssh inno@100.74.217.19
cd /volume1/homes/apps/packflow

# (a) 사용 가능한 백업 목록
ls -lh data/mes.db.bak-* data/backup/*.json data/backup/*.db 2>/dev/null | tail -10

# (b) 현재 DB 안전 백업 (롤백을 또 다시 롤백할 수 있도록)
TS=$(date +%Y%m%d-%H%M)
cp -p data/mes.db data/mes.db.before-restore-$TS

# (c) 서버 종료 → 백업으로 교체 → 재기동
pkill -f 'python3 server.py'; sleep 3
cp -p data/mes.db.bak-<선택한백업> data/mes.db
( setsid bash -c "sleep 2; cd '$PWD'; exec nohup python3 server.py </dev/null >>server.log 2>&1" </dev/null >/dev/null 2>&1 & ) </dev/null >/dev/null 2>&1 &
disown
sleep 8
curl -sS http://127.0.0.1:8080/m | head -1

# (d) 검증 — 핵심 카운트
sqlite3 data/mes.db 'SELECT key, length(value) FROM data_store WHERE key LIKE "ino_%" ORDER BY length(value) DESC LIMIT 10;'
```

### 4.4. 부분 롤백 — 마스터 데이터만 (cli/prod/mold)
```bash
# 백업 DB 를 ATTACH 해서 핵심 키만 덮어씀 (전체 mes.db 교체 회피)
sqlite3 data/mes.db <<'SQL'
ATTACH 'data/mes.db.bak-<선택한백업>' AS bk;
UPDATE data_store SET value = (SELECT value FROM bk.data_store WHERE bk.data_store.key = data_store.key)
 WHERE key IN ('ino_cli','ino_prod','ino_mold')
   AND EXISTS (SELECT 1 FROM bk.data_store WHERE bk.data_store.key = data_store.key);
DETACH bk;
SELECT key, length(value) FROM data_store WHERE key IN ('ino_cli','ino_prod','ino_mold');
SQL
# 이후 서버 재기동 또는 관리자 화면에서 캐시 새로고침
```

---

## 5. 자동 백업 (`nas-auto-backup.sh`) DSM 등록

### 5.1. 한 번만 — 스크립트 권한 + 경로 확인
```bash
ssh inno@100.74.217.19
cd /volume1/homes/apps/packflow
ls -l nas-auto-backup.sh
chmod +x nas-auto-backup.sh
# 수동 1회 실행 (정상 작동 검증)
bash nas-auto-backup.sh
ls -lh /volume1/homes/apps/packflow-backups/ | tail -3
tail -3 /volume1/homes/apps/packflow-backups/backup.log
```

기대 출력: `packflow-YYYYMMDD-HHMM.tar.gz` 파일 1개와 `backup.log` 에 `백업 성공` 한 줄.

### 5.2. DSM 작업 스케줄러 등록 (UI)
1. DSM → **제어판** → **작업 스케줄러**
2. **생성** → **예약된 작업** → **사용자 정의 스크립트**
3. 일반 탭
   - 작업: `packflow-auto-backup`
   - 사용자: `inno` (또는 `root` — 권한 더 안전)
   - 활성화: ✅
4. 스케줄 탭
   - 매일 실행 / 첫 번째 실행 시간 `03:00` / 빈도 `매일`
5. 작업 설정 탭 — **사용자 정의 스크립트** 박스에:
   ```bash
   bash /volume1/homes/apps/packflow/nas-auto-backup.sh
   ```
6. **알림 설정** (선택) — 출력에 ERR 포함 시 메일 보내기

### 5.3. 등록 검증
```bash
# 다음 새벽 3시 이후
ssh inno@100.74.217.19 'ls -lt /volume1/homes/apps/packflow-backups/ | head -5'
ssh inno@100.74.217.19 'tail -10 /volume1/homes/apps/packflow-backups/backup.log'
```

마지막 줄에 `백업 성공: ...packflow-YYYYMMDD-0300...tar.gz (...M)` 형태가 있으면 등록 완료.

### 5.4. 정책 요약
- 보관: 30일 (`RETENTION_DAYS=30`, 자동 삭제)
- 대상: `data/mes.db` + `data/backup/` 디렉토리
- 위치: `/volume1/homes/apps/packflow-backups/`
- 로그: 같은 폴더 `backup.log`, 최근 1000줄 자동 트림
- 외부 보관 권장: Hyper Backup 으로 `packflow-backups/` 폴더를 다른 NAS/USB/클라우드에 추가 백업

### 5.5. 워치독도 함께 — `nas-watchdog.sh`
같은 절차로 등록하되:
- 작업명: `packflow-watchdog`
- 스케줄: **반복 일정** → 5분 간격
- 명령: `bash /volume1/homes/apps/packflow/scripts/nas-watchdog.sh`
- 정상일 때는 로그 안 남기고, 다운 감지 시에만 `watchdog.log` 에 기록 + 자동 재시작

---

## 6. 자동 배포 등록 (DSM 스케줄러)

> §3 detach 실측이 통과한 뒤에 등록한다. 등록 전이면 비대화 환경에서 서버가 detach 안 되어 다음 자정에 죽어버릴 수 있다.

### 6.1. 한 번만 — 스크립트 권한 확인
```bash
ssh inno@100.74.217.19
cd /volume1/homes/apps/packflow
ls -l scripts/nas-auto-deploy.sh
chmod +x scripts/nas-auto-deploy.sh
# 수동 1회 실행 (자동 배포 자체가 되는지 검증)
bash scripts/nas-auto-deploy.sh
tail -10 auto-deploy.log
```

기대 출력: `auto-deploy.log` 마지막 줄에 `서버 재시작 성공 (시도 N)` (N ≤ 5).

### 6.2. DSM 작업 스케줄러 등록 (UI)
1. DSM → **제어판** → **작업 스케줄러**
2. **생성** → **예약된 작업** → **사용자 정의 스크립트**
3. 일반 탭
   - 작업: `packflow-auto-deploy`
   - 사용자: `inno`
   - 활성화: ✅
4. 스케줄 탭
   - 매일 실행 / 첫 번째 실행 시간 `00:00` / 빈도 `매일`
5. 작업 설정 탭 — **사용자 정의 스크립트** 박스에:
   ```bash
   bash /volume1/homes/apps/packflow/scripts/nas-auto-deploy.sh
   ```
6. **알림 설정** (선택) — 출력에 ERR 포함 시 메일 보내기

### 6.3. 등록 검증
```bash
# 다음 자정 이후
ssh inno@100.74.217.19 'tail -20 /volume1/homes/apps/packflow/auto-deploy.log'
ssh inno@100.74.217.19 'pgrep -af "python3 server.py"'
```

마지막 줄이 `=== 자동 배포 종료 ===` 또는 `이미 최신 (변경 없음)` 으로 끝나고 PID 가 살아 있으면 등록 완료.

### 6.4. 정책 요약
- 매일 00:00 GitHub `origin/main` 과 비교 → 변경 있으면 `static/`, `scripts/`, `requirements.txt` 만 덮어쓰기
- `server.py` / `database.py` / `data/` 는 NAS 로컬 보존 — auto-deploy 가 절대 건드리지 않음
- 더블 fork + setsid + nohup 으로 DSM 환경에서 detach (§3 검증 기준)
- 5회 재시도(3초 간격) 응답 검증 → 모두 실패 시 `auto-deploy.log` 에 `재시도 5 — 응답 없음` 기록
- 즉시 배포가 필요할 땐 Mac 에서 `./update-nas.sh` (§2)

### 6.5. 자동 배포 + 워치독 + 백업 합쳐 본 DSM 등록 상태 표

| 작업명 | 스케줄 | 명령 | 등록? |
|---|---|---|---|
| `packflow-auto-deploy` | 매일 00:00 | `bash /volume1/homes/apps/packflow/scripts/nas-auto-deploy.sh` | ⏳ |
| `packflow-watchdog` | 5분 간격 | `bash /volume1/homes/apps/packflow/scripts/nas-watchdog.sh` | ⏳ |
| `packflow-auto-backup` | 매일 03:00 | `bash /volume1/homes/apps/packflow/nas-auto-backup.sh` | ⏳ |

> ⏳ 셋 모두 등록되어야 자율 운영 상태. 등록 후 ⏳ → ✅ 로 갱신.

---

## 7. 운영 일상 체크 (주간)

```bash
# Mac 에서 한 번
ssh inno@100.74.217.19 <<'EOF'
echo "== 서버 상태 =="; pgrep -af 'python3 server.py'; curl -sS -o /dev/null -w 'http %{http_code}\n' http://127.0.0.1:8080/m
echo "== 디스크 ==";  df -h /volume1 | tail -1
echo "== 자동배포 최근 ==";  tail -8 /volume1/homes/apps/packflow/auto-deploy.log
echo "== 백업 최근 ==";     tail -5 /volume1/homes/apps/packflow-backups/backup.log
echo "== 워치독 최근 ==";   tail -5 /volume1/homes/apps/packflow/watchdog.log 2>/dev/null || echo "(없음)"
echo "== DB 크기 ==";       ls -lh /volume1/homes/apps/packflow/data/mes.db
EOF
```

이 한 블록 출력만 보고 1주일에 한 번 이상 점검 — 이상 신호:
- `auto-deploy.log` 에 `ERR` 또는 `재시도 5 — 응답 없음`
- `backup.log` 에 24시간 이상 새 줄 없음
- 디스크 사용률 >85%
- DB 크기가 갑자기 절반 이하로 줄어듦 (데이터 사고 의심)
