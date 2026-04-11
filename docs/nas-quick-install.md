# 팩플로우 MES — 사무실 NAS 설치 퀵가이드

> 사무실 PC에서 같은 네트워크의 시놀로지 NAS에 설치하는 1장짜리 가이드

---

## 준비물 확인

- [x] 시놀로지 NAS (전원 켜져 있는 상태)
- [x] 사무실 PC (NAS와 같은 공유기/네트워크)
- [x] NAS 관리자 계정/비밀번호

---

## STEP 1. NAS IP 주소 확인 (1분)

사무실 PC에서 **PowerShell** 열고:

```
ping -n 1 NAS이름
```

또는 브라우저에서 `find.synology.com` 접속하면 NAS를 자동으로 찾아줍니다.

또는 DSM에 이미 접속 중이면 브라우저 주소창의 IP가 NAS IP입니다.
(예: `http://192.168.0.15:5000` → NAS IP는 `192.168.0.15`)

---

## STEP 2. NAS에서 SSH 켜기 (1분)

1. 브라우저에서 DSM 접속: `http://NAS_IP:5000`
2. **제어판** → **터미널 및 SNMP** → **터미널** 탭
3. **SSH 서비스 활성화** 체크 → 포트 `22` → **적용**

---

## STEP 3. NAS에서 Container Manager 설치 확인 (1분)

1. DSM → **패키지 센터**
2. `Container Manager` 검색 → 설치 (이미 있으면 넘어가기)

---

## STEP 4. 프로젝트 파일 업로드 (3분)

1. DSM → **File Station** 열기
2. `docker` 폴더 클릭 → 상단 **생성** → 폴더 만들기 → 이름: `packflow`
3. `docker/packflow` 폴더 들어가기
4. 상단 **업로드** → **업로드 - 덮어쓰기** 선택
5. 아래 파일/폴더를 전부 업로드:

```
smart-factory-mes/
  ├── server.py          ← 필수
  ├── database.py        ← 필수
  ├── requirements.txt   ← 필수
  ├── Dockerfile         ← 필수
  ├── docker-compose.yml ← 필수
  ├── static/            ← 폴더 통째로 업로드
  └── data/              ← 폴더 통째로 업로드 (없으면 빈 폴더 생성)
```

> GitHub에서 zip 다운로드: https://github.com/marche12/smart-factory-mes/archive/refs/heads/main.zip

---

## STEP 5-A. Container Manager로 설치 (SSH 몰라도 OK) (2분)

1. DSM → **Container Manager** 열기
2. 왼쪽 **프로젝트** 클릭
3. **생성** 버튼
4. 프로젝트 이름: `packflow`
5. 경로: `docker/packflow` 선택
6. 소스: **docker-compose.yml 사용** 선택
7. 내용 확인 → **다음** → **완료**
8. 빌드 완료까지 1~3분 대기 (상태가 녹색 되면 OK)

---

## STEP 5-B. SSH로 설치 (더 빠르고 확실) (2분)

사무실 PC에서 **PowerShell** 열고:

```bash
ssh 관리자계정@NAS_IP
```

> 예: `ssh admin@192.168.0.15`
> 비밀번호 입력 (화면에 안 보이는 게 정상, 그냥 입력 후 Enter)

접속 성공하면:

```bash
sudo -i
cd /volume1/docker/packflow
docker-compose up -d --build
```

`done` 나오면 설치 완료!

---

## STEP 6. 접속 확인

사무실 아무 PC/태블릿/폰에서 브라우저 열고:

```
http://NAS_IP:8080
```

> 예: `http://192.168.0.15:8080`

팩플로우 로그인 화면이 나오면 성공!

---

## 포트 8080이 안 될 때

NAS에서 이미 8080을 쓰고 있으면 `docker-compose.yml` 열어서:

```yaml
ports:
  - "9090:8080"    ← 9090으로 변경
```

저장 후 다시 빌드. 접속은 `http://NAS_IP:9090`

---

## 설치 후 체크리스트

| 항목 | 확인 |
|------|------|
| `http://NAS_IP:8080` 접속 | [ ] |
| 로그인 가능 | [ ] |
| 데이터 입력 테스트 | [ ] |
| 다른 PC/폰에서도 접속 | [ ] |
| NAS 재부팅 후에도 자동 시작 | [ ] |

---

## 문제 발생 시

| 증상 | 원인 | 해결 |
|------|------|------|
| SSH에서 `Connection refused` | SSH 안 켜짐 | STEP 2 다시 확인 |
| `Permission denied` | 관리자 아닌 계정 | DSM 관리자 계정 사용 |
| 비밀번호 입력이 안 됨 | 정상 (보안상 안 보임) | 그냥 입력하고 Enter |
| 빌드 에러 | 파일 누락 | STEP 4에서 모든 파일 업로드 확인 |
| 8080 접속 안 됨 | 포트 충돌 | 포트 9090으로 변경 |
| 느림 | 메모리 부족 | NAS RAM 2GB 이상 권장 |
