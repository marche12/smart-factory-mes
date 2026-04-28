# 팩플로우 운영 런북 (Synology NAS)

이 문서는 NAS에 이미 설치된 팩플로우의 일상 운영(배포·백업·헬스체크·HTTPS) 절차를 정리한다.
초기 설치는 [synology-nas-install.md](synology-nas-install.md) 참고.

- 도메인: `https://packflow.mckim.i234.me`
- NAS 경로: `/volume1/homes/apps/packflow`
- Tailscale IP: `100.74.217.19`

---

## §1. 일상 배포 (Tailscale 직접)

Mac 작업머신에서 한 번에 배포:

```bash
./update-nas.sh
```

내부 동작:
1. Tailscale ping → NAS 도달 확인
2. SSH 로 `scripts/nas-auto-deploy.sh` 실행 (NAS 측)
3. `git fetch origin main` → `static/`, `scripts/`, `requirements.txt` 만 덮어씀
   (server.py / database.py 는 NAS 로컬 유지)
4. 서버 재시작 (이중 fork + setsid + nohup)
5. `auto-deploy.log` 마지막 8줄 출력
6. Tailscale + 외부 HTTPS 응답 확인

> NAS 의 `crontab` 에 `0 0 * * * .../scripts/nas-auto-deploy.sh` 가 등록되어 매일 자정 자동 배포도 함께 실행된다.

---

## §2. 데이터 백업

### 자동 백업 (서버 측)

`server.py` 가 24시간 주기로 `data/backup/` 에 JSON 백업 생성, 30일 보관.
관리자 화면 → 백업/복원 에서 즉시 백업도 가능.

### NAS 외부 백업

`nas-auto-backup.sh` — DSM 작업 스케줄러에 등록 (매일 새벽 3시 권장):

```
사용자: root
명령: bash /volume1/homes/apps/packflow/nas-auto-backup.sh
```

`/volume1/homes/apps/packflow-backups/` 에 `packflow-YYYYMMDD-HHMM.tar.gz` 누적, 30일 후 삭제.

### Hyper Backup

`docker/packflow/data/` 폴더를 외부 USB / 다른 NAS / 클라우드로 정기 백업 (DSM Hyper Backup 패키지).

---

## §3. 로그 / 상태 확인

NAS SSH 접속 후:

```bash
ssh inno@100.74.217.19
cd /volume1/homes/apps/packflow

tail -50 server.log         # 서버 stdout/err
tail -20 auto-deploy.log    # 자동 배포 로그
tail -20 watchdog.log       # 워치독 로그 (다운 감지 시만 기록)
```

응답 확인:

```bash
curl -sS http://127.0.0.1:8080/m -o /dev/null -w "code:%{http_code}\n"
curl -sS https://packflow.mckim.i234.me/m -o /dev/null -w "code:%{http_code}\n"
```

---

## §4. 권한 / 보안 회귀

배포 후 다음 항목을 확인 (자세한 매트릭스는 [manual-qa-checklist.md §1](manual-qa-checklist.md) 참고):

- worker 계정으로 로그인 시 작업자 화면(workerApp)만 보이고 일반 데이터 저장이 403.
- office/sales/material/accounting/quality 계정 사이드바에 `백업/복원`, `감사 로그`, `권한 관리` 메뉴가 안 보인다.
- 운영 도메인 직접 접속 시 자동 로그인되지 않고 로그인 화면이 뜬다.
- `ino_users`, `ino_popbillConfig` 등 민감 키는 admin 외 계정에서 접근 불가.

---

## §5. 트러블슈팅

| 증상 | 원인 후보 | 조치 |
|------|----------|------|
| 외부 HTTPS 502 | NAS 서버 다운 | `tail -20 watchdog.log` 후 워치독 재시작 / 수동 `python3 server.py` |
| Tailscale 응답 없음 | NAS 측 Tailscale 끊김 | DSM → Tailscale 패키지 재시작 |
| 자동 배포 무반응 | git fetch 인증 실패 | `cd $APP_DIR && git fetch origin main` 수동 실행해 에러 확인 |
| 백업 복원 후 빈 마스터 | 가드 누락 — 빈 배열 덮어쓰기 | 서버는 가드 있음. 클라이언트 측 `mode=replace` 만 허용했는지 확인 |
| 인증서 만료 | DSM Let's Encrypt 갱신 실패 | §7 갱신 절차 참조 |

---

## §6. 워치독 (5분 헬스체크 + 자동 재시작)

`scripts/nas-watchdog.sh` 가 `http://127.0.0.1:8080/m` 응답을 검사하고, 다운이면 서버 프로세스를 죽이고 재시작한다.

### DSM 작업 스케줄러 등록

1. DSM → **제어판** → **작업 스케줄러**
2. **생성** → **예약 작업** → **사용자 정의 스크립트**
3. 일반 탭:
   - 작업: `packflow-watchdog`
   - 사용자: `root`
   - 활성화: ✓
4. 스케줄 탭:
   - 매일, **5분 간격** 반복 (00:00 ~ 23:55)
5. 작업 설정 탭:
   - 사용자 정의 스크립트:
     ```bash
     bash /volume1/homes/apps/packflow/scripts/nas-watchdog.sh
     ```
6. 저장 후 **실행** 으로 1회 수동 동작 확인 → `watchdog.log` 비어있으면 정상 (다운일 때만 로그 기록).

### 동작 검증

```bash
# 정상 상태에서는 응답 0 — log 안 남김
bash /volume1/homes/apps/packflow/scripts/nas-watchdog.sh
echo $?   # 0 이어야 함

# 강제 다운 후 재시작 동작 확인
sudo pkill -f 'python3 server.py'
bash /volume1/homes/apps/packflow/scripts/nas-watchdog.sh
tail -5 /volume1/homes/apps/packflow/watchdog.log
# "재시작 성공" 라인 확인
```

### 알림 옵션 (선택)

워치독이 ERR 로그를 남길 때만 통보가 필요하면 스크립트 끝에 추가:

```bash
# Slack Webhook 알림 (실패 시에만)
if [ $? -ne 0 ]; then
    curl -sS -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 packflow 서버 재시작 실패"}' \
        "$SLACK_WEBHOOK_URL"
fi
```

또는 DSM 알림 서비스 → 작업 스케줄러 → 실패 시 메일 발송 옵션 활성화.

---

## §7. 외부 HTTPS 인증서 (Let's Encrypt)

도메인 `packflow.mckim.i234.me` 는 DSM 의 역방향 프록시 + Let's Encrypt 인증서로 외부에 노출된다.
Synology DSM 7 의 인증서 모듈은 Let's Encrypt 발급/갱신을 자동 관리한다.

### 발급 절차

1. **사전 준비**
   - 도메인이 NAS 공인 IP 로 A 레코드 또는 DDNS 로 연결되어 있어야 함
   - 공유기 포트포워딩: `80 → NAS:80`, `443 → NAS:443` (인증 challenge 용)
   - DSM 외부 접속 가능 확인 — `http://packflow.mckim.i234.me/` 가 NAS 까지 도달

2. **DSM 인증서 발급**
   - DSM → **제어판** → **보안** → **인증서** 탭
   - **추가** → **새 인증서 추가** → **Let's Encrypt 에서 인증서 가져오기**
   - 입력:
     - **도메인 이름**: `packflow.mckim.i234.me`
     - **이메일**: `innopackage@gmail.com`
     - **주제 대체 이름**: 비워두기 (서브도메인 추가 필요 시 콤마로 나열)
   - **다음** → 발급 대기 (30~60초)
   - 성공 시 인증서 목록에 등록됨 (만료일 90일 후)

3. **역방향 프록시 연결**
   - **제어판** → **로그인 포털** → **고급** → **역방향 프록시**
   - 규칙 생성/편집:
     - 소스: HTTPS / `packflow.mckim.i234.me` / 443
     - 대상: HTTP / `localhost` / 8080
   - 인증서: 위에서 발급한 Let's Encrypt 인증서 선택
   - 저장 후 `https://packflow.mckim.i234.me/m` 접속 → 자물쇠 아이콘 확인

### 갱신 (자동 + 수동)

- **자동 갱신**: DSM 이 만료 30일 전 자동 갱신 시도 — 별도 작업 불필요.
- **자동 갱신 실패 시**: DSM 알림 → 인증서 → **갱신** 버튼 수동 클릭.
- 갱신은 발급과 동일하게 80/443 포트포워딩이 살아있어야 함 (HTTP-01 challenge).

### 갱신 확인 (3개월 주기 점검)

```bash
# Mac 에서 인증서 만료일 확인
echo | openssl s_client -servername packflow.mckim.i234.me \
    -connect packflow.mckim.i234.me:443 2>/dev/null \
    | openssl x509 -noout -dates
```

`notAfter=` 가 90일 이상 미래면 OK. 30일 이내로 좁혀졌는데 갱신이 안 됐으면 DSM 인증서 화면에서 수동 갱신.

### 주의사항

- 도메인 또는 DDNS 가 변경되면 새 인증서를 발급받아야 함 (이전 인증서는 도메인이 다르면 무효).
- 공인 IP 가 자주 바뀌는 환경(가정용 회선)에서는 DDNS 또는 Tailscale Funnel 권장.
- DSM 인증서 화면에서 `기본` 으로 설정된 인증서가 DSM 콘솔 자체에도 적용되니, 와일드카드 사용 시 주의.
- 80/443 포트가 다른 서비스와 충돌하면 갱신이 실패한다 — DSM `웹 스테이션` 또는 다른 컨테이너가 점유 중인지 확인.

---

## §8. 비상 복구 시나리오

### 서버 완전 다운
1. SSH 접속 → `ps -ef | grep server.py` 로 프로세스 확인
2. 죽어있으면: `cd /volume1/homes/apps/packflow && nohup python3 server.py >> server.log 2>&1 &`
3. 5초 후 `curl http://127.0.0.1:8080/m` 응답 확인

### DB 손상
1. 최신 자동 백업 위치: `data/backup/inno-backup-YYYY-MM-DD.json`
2. 관리자 화면 → 백업/복원 → 업로드 복원 으로 되돌림
3. 또는 SSH: `cp /volume1/homes/apps/packflow-backups/packflow-최신.tar.gz /tmp/ && tar -xzf ...`

### 자동 배포 사고 (잘못된 커밋 롤백)
```bash
ssh inno@100.74.217.19
cd /volume1/homes/apps/packflow
git log --oneline -5            # 최근 커밋 확인
git checkout <이전커밋> -- static/ scripts/ requirements.txt
pkill -f 'python3 server.py'
nohup python3 server.py >> server.log 2>&1 &
```
