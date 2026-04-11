# 시놀로지 NAS 설치 가이드 (팩플로우 MES)

## 사전 요구사항

- 시놀로지 NAS (DS220+, DS420+, DS920+ 등 x86 모델)
- DSM 7.2 이상
- Container Manager 패키지 설치 완료

---

## 방법 1: SSH로 설치 (권장)

### 1단계: SSH 활성화

1. DSM 접속 → **제어판** → **터미널 및 SNMP**
2. **SSH 서비스 활성화** 체크 → 포트 22 → 적용

### 2단계: 프로젝트 파일 업로드

1. DSM **File Station** 열기
2. `docker` 공유 폴더 안에 `packflow` 폴더 생성
3. 프로젝트 전체 파일을 `docker/packflow`에 업로드
   - `server.py`, `database.py`, `requirements.txt`
   - `Dockerfile`, `docker-compose.yml`
   - `static/` 폴더 전체
   - `data/` 폴더

### 3단계: SSH 접속 및 빌드

터미널(Mac) 또는 PuTTY(Windows)로 NAS에 접속:

```bash
ssh admin@NAS_IP주소 -p 22
```

프로젝트 폴더로 이동 후 빌드 및 실행:

```bash
cd /volume1/docker/packflow
sudo docker-compose up -d --build
```

### 4단계: 접속 확인

브라우저에서 접속:
```
http://NAS_IP주소:8080
```

---

## 방법 2: Container Manager UI로 설치

> DSM 7.2 이상 Container Manager의 "프로젝트" 기능 사용

### 1단계: 파일 준비

1. File Station에서 `docker/packflow` 폴더 생성
2. 프로젝트 전체 파일 업로드 (방법 1의 2단계와 동일)

### 2단계: 프로젝트 생성

1. **Container Manager** 열기
2. 왼쪽 메뉴 **프로젝트** 클릭
3. **생성** 버튼 클릭
4. 설정:
   - **프로젝트 이름**: `packflow`
   - **경로**: `/volume1/docker/packflow` 선택
   - **소스**: `docker-compose.yml 사용` 선택 (자동으로 폴더 내 파일 인식)
5. docker-compose 내용 확인 후 **다음** → **완료**

### 3단계: 빌드 대기

Container Manager가 자동으로:
- Dockerfile 기반 이미지 빌드
- 컨테이너 생성 및 실행
- 볼륨 마운트 (`data/` 폴더)

상태가 **실행 중(녹색)**으로 바뀌면 완료.

---

## 포트 변경

기본 포트 8080이 다른 서비스와 충돌할 경우:

### SSH 방식:
```bash
MES_PORT=9090 docker-compose up -d --build
```

### Container Manager 방식:
docker-compose.yml에서 직접 수정:
```yaml
ports:
  - "9090:8080"
```

---

## 외부 접속 설정 (선택)

NAS 외부에서 접속하려면:

### 방법 A: 시놀로지 QuickConnect
- 제어판 → QuickConnect → 활성화
- `http://quickconnect.to/사용자ID` 접속 (포트 지정 필요)

### 방법 B: 포트포워딩
1. 공유기 관리자 접속 (보통 192.168.0.1)
2. 포트포워딩 설정:
   - 외부 포트: 8080
   - 내부 IP: NAS의 내부 IP
   - 내부 포트: 8080
3. `http://공인IP:8080` 으로 접속

### 방법 C: 역방향 프록시 (HTTPS)
1. 제어판 → 로그인 포털 → 고급 → 역방향 프록시
2. 규칙 생성:
   - 소스: HTTPS, 호스명 `mes.내도메인.com`, 포트 443
   - 대상: HTTP, localhost, 포트 8080
3. 인증서 설정 (Let's Encrypt 무료 인증서 추천)

---

## 데이터 백업

데이터는 `docker/packflow/data/` 폴더에 저장됩니다:
- `mes.db` — 메인 데이터베이스
- `backup/` — 자동 백업 파일 (24시간 주기, 30일 보관)

### Hyper Backup 연동
1. Hyper Backup에서 `docker/packflow/data` 폴더를 백업 대상에 포함
2. 외부 USB, 다른 NAS, 클라우드로 자동 백업 가능

---

## 업데이트 방법

GitHub에서 최신 코드를 받아 업데이트:

```bash
ssh admin@NAS_IP주소 -p 22
cd /volume1/docker/packflow
sudo docker-compose down
# 최신 파일 업로드 또는 git pull
sudo docker-compose up -d --build
```

Container Manager에서도 프로젝트 → 중지 → 빌드 → 시작으로 가능.

---

## 문제 해결

| 증상 | 해결 |
|------|------|
| 포트 충돌 | docker-compose.yml에서 포트 변경 (예: 9090:8080) |
| 컨테이너 시작 안 됨 | Container Manager → 로그 확인 |
| 데이터 사라짐 | `data/` 볼륨 마운트 확인 |
| 느림 | NAS 메모리 2GB 이상 권장 |
| 접속 불가 | NAS 방화벽에서 해당 포트 허용 확인 |
