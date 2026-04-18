import os
import json
import secrets
import hashlib
import threading
from pathlib import Path
from typing import Optional
from datetime import datetime, timedelta

import bcrypt
import jwt
from fastapi import FastAPI, Request, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import database as db

app = FastAPI(title="InnoPackage MES")

# JWT configuration
JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = timedelta(minutes=15)
REFRESH_TOKEN_EXPIRE = timedelta(days=7)

security = HTTPBearer(auto_error=False)

# CORS - 허용 도메인 화이트리스트
ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://inno.local:8080",
    "http://192.168.0.2:8080",
    "http://packflow-nas:8080",
    "https://packflow.innopackage.direct.quickconnect.to",
    # 추가 도메인은 여기에
]

# 환경변수로 추가 오리진 허용 (개발 편의)
_extra = os.environ.get("EXTRA_CORS_ORIGINS", "").split(",")
ALLOWED_ORIGINS.extend([o.strip() for o in _extra if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    max_age=3600,
)


# Initialize database on startup
def _auto_backup_loop():
    """Background thread: run daily backup every 24 hours."""
    while True:
        try:
            threading.Event().wait(timeout=86400)  # 24h
            db.ensure_daily_backup()
            print(f"[AutoBackup] {datetime.now().strftime('%Y-%m-%d %H:%M')} — daily backup completed")
        except Exception as e:
            print(f"[AutoBackup] error: {e}")


@app.on_event("startup")
def startup():
    db.init_db()
    db.init_auth_tables()
    db.init_normalized_tables()
    db.migrate_kv_to_tables()
    db.cleanup_expired_tokens()
    db.ensure_daily_backup()
    # Start background auto-backup scheduler
    t = threading.Thread(target=_auto_backup_loop, daemon=True)
    t.start()
    print("=" * 50)
    print("  InnoPackage MES Server Started")
    print("  Auto-backup: enabled (24h interval, 30-day retention)")
    print("  http://localhost:8080")
    print("=" * 50)


# --- Auth Helpers ---

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def create_access_token(user_id: str, user_name: str, role: str, perms=None) -> str:
    payload = {
        "sub": user_id,
        "name": user_name,
        "role": role,
        "perms": perms,
        "exp": datetime.utcnow() + ACCESS_TOKEN_EXPIRE,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token() -> str:
    return secrets.token_hex(64)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def extract_target(key: str) -> str:
    k = key.replace("ino_", "", 1) if key.startswith("ino_") else key
    parts = k.split("_")
    return parts[0] if parts else k


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


ALLOWED_FINANCE_ROLES = {"admin", "accounting"}

# 쓰기 허용 역할
WRITE_ALLOWED_ROLES = {"admin", "office", "sales", "material", "accounting", "quality"}

# 쓰기 보호 (관리자만 수정 가능)
ADMIN_WRITE_ONLY_KEYS = {
    "ino_users",
    "ino_popbillConfig",
    "ino_co",
    "ino_companies",
    "ino_bizApiKey",
}

# 읽기+쓰기 모두 관리자만 (민감한 시크릿)
ADMIN_FULL_ONLY_KEYS = {
    "ino_popbillConfig",  # SecretKey 포함
}


def require_finance_user(user):
    if user.get("role") not in ALLOWED_FINANCE_ROLES:
        raise HTTPException(status_code=403, detail="Accounting or admin only")
    return user


def can_access_key(user, key: str, write: bool = False) -> bool:
    role = user.get("role")
    if role == "admin":
        return True

    # 읽기+쓰기 모두 차단
    if key in ADMIN_FULL_ONLY_KEYS:
        return False

    # ino_users 읽기 차단 (비밀번호 해시 보호)
    if not write and key == "ino_users":
        return False

    # 쓰기 차단 목록
    if write:
        if key in ADMIN_WRITE_ONLY_KEYS:
            return False
        # worker는 쓰기 자체 차단 (공정 상태 업데이트는 별도 API로)
        if role == "worker":
            return False
        # 사무실/영업/자재/회계/품질은 일반 데이터 쓰기 허용
        if role not in WRITE_ALLOWED_ROLES:
            return False

    return True


def require_key_access(user, key: str, write: bool = False):
    if not can_access_key(user, key, write=write):
        raise HTTPException(status_code=403, detail="Forbidden key")
    return key


def resolve_safe_path(base_dir: str, requested_path: str) -> Optional[Path]:
    base_path = Path(base_dir).resolve()
    target_path = (base_path / requested_path).resolve()
    try:
        target_path.relative_to(base_path)
    except ValueError:
        return None
    return target_path


# --- Auth Endpoints ---

@app.get("/api/users/public")
async def users_public():
    """로그인 화면용 사용자 목록 (비밀번호 등 민감정보 제외)"""
    users_raw = db.get_data("ino_users")
    users = json.loads(users_raw) if users_raw else []
    if not users:
        users = [{"nm": "관리자", "un": "admin", "role": "admin"}]
    return [
        {
            "nm": u.get("nm", ""),
            "un": u.get("un", ""),
            "role": u.get("role", ""),
            "proc": u.get("proc", "")
        }
        for u in users
    ]


@app.post("/api/auth/login")
async def auth_login(request: Request):
    body = await request.json()
    username = body.get("username", "").strip()
    password = body.get("password", "")
    ip = get_client_ip(request)

    if not username:
        raise HTTPException(status_code=400, detail="Username required")

    # Load users from DB
    users_raw = db.get_data("ino_users")
    users = json.loads(users_raw) if users_raw else []

    # Default admin if no users
    if not users:
        users = [{"id": "admin", "nm": "관리자", "un": "admin", "role": "admin", "pw": "1234"}]

    # Find user
    user_obj = None
    for u in users:
        if (u.get("un") or u.get("nm") or u.get("id", "")) == username:
            user_obj = u
            break
    if not user_obj:
        # Also match by nm
        for u in users:
            if u.get("nm") == username:
                user_obj = u
                break

    if not user_obj:
        db.add_audit_log(username, username, "login_failed", None, None, "user not found", ip)
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다")

    stored_pw = user_obj.get("pw", "1234")

    # Check password: bcrypt or plain text
    if stored_pw.startswith("$2b$") or stored_pw.startswith("$2a$"):
        # bcrypt hashed password
        if not bcrypt.checkpw(password.encode("utf-8"), stored_pw.encode("utf-8")):
            db.add_audit_log(user_obj.get("id", username), user_obj.get("nm", username),
                             "login_failed", None, None, "wrong password", ip)
            raise HTTPException(status_code=401, detail="비밀번호가 틀립니다")
    else:
        # Plain text — compare and migrate to bcrypt
        if password != stored_pw:
            db.add_audit_log(user_obj.get("id", username), user_obj.get("nm", username),
                             "login_failed", None, None, "wrong password", ip)
            raise HTTPException(status_code=401, detail="비밀번호가 틀립니다")
        # Migrate to bcrypt
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        user_obj["pw"] = hashed
        db.set_data("ino_users", json.dumps(users, ensure_ascii=False))

    # Determine role
    uid = user_obj.get("id", user_obj.get("un", username))
    uname = user_obj.get("nm", username)
    role = user_obj.get("role", "admin")
    perms = user_obj.get("perms")

    # Create tokens
    access_token = create_access_token(uid, uname, role, perms)
    refresh_token = create_refresh_token()

    # Store refresh token hash
    rt_hash = hash_refresh_token(refresh_token)
    expires_at = (datetime.now() + REFRESH_TOKEN_EXPIRE).isoformat()
    db.save_refresh_token(rt_hash, uid, uname, expires_at)

    db.add_audit_log(uid, uname, "login", None, None, None, ip)

    return JSONResponse(content={
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {"id": uid, "name": uname, "role": role, "perms": perms}
    })


@app.post("/api/auth/refresh")
async def auth_refresh(request: Request):
    body = await request.json()
    refresh_token = body.get("refresh_token", "")

    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token required")

    rt_hash = hash_refresh_token(refresh_token)
    token_row = db.get_refresh_token(rt_hash)

    if not token_row:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Check expiry
    expires_at = datetime.fromisoformat(token_row["expires_at"])
    if datetime.now() > expires_at:
        db.delete_refresh_token(rt_hash)
        raise HTTPException(status_code=401, detail="Refresh token expired")

    # Look up the user's actual role from the database
    users_raw = db.get_data("ino_users")
    users = json.loads(users_raw) if users_raw else []
    if not users:
        users = [{"id": "admin", "nm": "관리자", "un": "admin", "role": "admin", "pw": "1234"}]
    user_obj = None
    for u in users:
        if u.get("id") == token_row["user_id"]:
            user_obj = u
            break
    role = user_obj.get("role", "admin") if user_obj else "admin"
    perms = user_obj.get("perms") if user_obj else None

    # Issue new access token
    access_token = create_access_token(
        token_row["user_id"], token_row["user_name"], role, perms
    )

    return JSONResponse(content={"access_token": access_token})


@app.post("/api/auth/logout")
async def auth_logout(request: Request):
    body = await request.json()
    refresh_token = body.get("refresh_token", "")
    ip = get_client_ip(request)

    if refresh_token:
        rt_hash = hash_refresh_token(refresh_token)
        token_row = db.get_refresh_token(rt_hash)
        if token_row:
            db.add_audit_log(token_row["user_id"], token_row["user_name"], "logout", None, None, None, ip)
            db.delete_refresh_token(rt_hash)

    return JSONResponse(content={"ok": True})


# --- Protected API Endpoints ---

@app.get("/api/data")
def get_all_keys(user=Depends(get_current_user)):
    keys = [
        key for key in db.get_all_keys()
        if can_access_key(user, key)
    ]
    return JSONResponse(content=keys)


@app.get("/api/data/{key:path}")
def get_data(key: str, user=Depends(get_current_user)):
    require_key_access(user, key)
    entry = db.get_data_entry(key)
    if entry is None:
        return JSONResponse(content={"key": key, "value": None, "updated_at": None})
    return JSONResponse(content={
        "key": key,
        "value": entry["value"],
        "updated_at": entry["updated_at"],
    })


@app.post("/api/data/{key:path}")
async def set_data(key: str, request: Request, user=Depends(get_current_user)):
    import json as _json
    require_key_access(user, key, write=True)
    body = await request.json()
    value = body.get("value", "")
    expected_updated_at = body.get("expected_updated_at")
    if not isinstance(value, str):
        value = _json.dumps(value, ensure_ascii=False)
    ok, current_value, current_updated_at = db.compare_and_set_data(
        key, value, expected_updated_at
    )
    if not ok:
        return JSONResponse(
            status_code=409,
            content={
                "ok": False,
                "error": "conflict",
                "key": key,
                "current_value": current_value,
                "current_updated_at": current_updated_at,
            }
        )
    target = extract_target(key)
    db.add_audit_log(user.get("sub"), user.get("name"), "update", target, key, None, get_client_ip(request))
    return JSONResponse(content={"ok": True, "key": key, "updated_at": current_updated_at})


@app.delete("/api/data/{key:path}")
def delete_data(key: str, request: Request, user=Depends(get_current_user)):
    require_key_access(user, key, write=True)
    deleted = db.delete_data(key)
    target = extract_target(key)
    db.add_audit_log(user.get("sub"), user.get("name"), "delete", target, key, None, get_client_ip(request))
    return JSONResponse(content={"ok": True, "deleted": deleted})


@app.get("/api/backup")
def backup(user=Depends(require_admin)):
    all_data = db.get_all_data()
    backup_obj = {}
    for key, value in all_data.items():
        backup_key = key[4:] if key.startswith("ino_") else key
        try:
            backup_obj[backup_key] = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            backup_obj[backup_key] = value

    backup_obj["_backup"] = {
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "version": "2.0",
        "source": "server"
    }

    content = json.dumps(backup_obj, ensure_ascii=False, indent=2)
    filename = f"inno-backup-{datetime.now().strftime('%Y-%m-%d')}.json"

    db.add_audit_log(user.get("sub"), user.get("name"), "backup", None, None, None, None)

    return StreamingResponse(
        iter([content]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.post("/api/restore")
async def restore(file: UploadFile = File(...), user=Depends(require_admin)):
    try:
        content = await file.read()
        data = json.loads(content)

        if "_backup" not in data:
            return JSONResponse(
                status_code=400,
                content={"ok": False, "error": "Invalid backup file (missing _backup marker)"}
            )

        store_data = {}
        for key, value in data.items():
            if key == "_backup":
                continue
            store_key = key if key.startswith("ino_") else f"ino_{key}"
            store_data[store_key] = json.dumps(value, ensure_ascii=False)

        db.restore_all_data(store_data)
        db.add_audit_log(user.get("sub"), user.get("name"), "restore", None, None,
                         f"{len(store_data)} keys restored", None)
        return JSONResponse(content={"ok": True, "keys_restored": len(store_data)})

    except json.JSONDecodeError:
        return JSONResponse(status_code=400, content={"ok": False, "error": "Invalid JSON file"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})


# --- Audit Log Query ---

@app.get("/api/audit-logs")
def get_audit_logs(user_id: str = None, action: str = None, from_dt: str = None,
                   to_dt: str = None, limit: int = 50, offset: int = 0,
                   user=Depends(require_admin)):
    logs, total = db.get_audit_logs(user_id, action, from_dt, to_dt, limit, offset)
    return JSONResponse(content={"logs": logs, "total": total})


# --- Backup Management ---

@app.get("/api/backups")
def list_backups(user=Depends(require_admin)):
    return JSONResponse(content={"backups": db.list_backups()})


@app.get("/api/backup-status")
def backup_status(user=Depends(require_admin)):
    backups = db.list_backups()
    today = datetime.now().strftime('%Y-%m-%d')
    today_backup = any(b["filename"].startswith(today) for b in backups)
    return JSONResponse(content={
        "auto_backup": True,
        "interval": "24h",
        "retention_days": 30,
        "total_backups": len(backups),
        "today_backup": today_backup,
        "latest": backups[0]["filename"] if backups else None
    })


@app.post("/api/backups/now")
def create_backup_now(user=Depends(require_admin)):
    filename = db.create_backup("manual")
    db.add_audit_log(user.get("sub"), user.get("name"), "backup", None, None, filename, None)
    return JSONResponse(content={"ok": True, "filename": filename})


@app.post("/api/backups/restore/{filename}")
def restore_backup(filename: str, user=Depends(require_admin)):
    # Safety: auto-backup current state before restoring
    pre_backup = db.create_backup("pre-restore")
    try:
        count = db.restore_from_backup(filename)
        db.add_audit_log(user.get("sub"), user.get("name"), "restore", None, None,
                         f"Restored {filename} ({count} keys). Pre-backup: {pre_backup}", None)
        return JSONResponse(content={"ok": True, "keys_restored": count, "pre_backup": pre_backup})
    except (FileNotFoundError, ValueError) as e:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(e)})


@app.delete("/api/backups/{filename}")
def delete_backup_file(filename: str, user=Depends(require_admin)):
    deleted = db.delete_backup(filename)
    return JSONResponse(content={"ok": True, "deleted": deleted})


# --- Popbill 전자세금계산서 API Proxy ---

@app.post("/api/popbill/issue")
async def popbill_issue(request: Request, user=Depends(get_current_user)):
    """Proxy endpoint for Popbill electronic tax invoice issuance."""
    import urllib.request
    import hmac as hmac_mod
    import base64

    require_finance_user(user)

    body = await request.json()

    # Load Popbill config from DB
    config_raw = db.get_data("ino_popbillConfig")
    if not config_raw:
        return JSONResponse(content={"ok": False, "error": "팝빌 API 설정이 없습니다. 시스템관리에서 설정해주세요."})

    config = json.loads(config_raw)
    link_id = config.get("linkId", "")
    secret_key = config.get("secretKey", "")
    corp_num = config.get("corpNum", "")
    is_test = config.get("isTest", True)

    if not link_id or not secret_key or not corp_num:
        return JSONResponse(content={"ok": False, "error": "팝빌 LinkID, SecretKey, 사업자번호를 모두 입력해주세요."})

    # Company info
    co_raw = db.get_data("ino_co")
    co = json.loads(co_raw) if co_raw else {}

    auth_url = "https://auth.linkhub.co.kr"
    api_url = "https://popbill-test.linkhub.co.kr" if is_test else "https://popbill.linkhub.co.kr"
    service_id = "POPBILL_TEST" if is_test else "POPBILL"

    try:
        # Step 1: Get auth token
        token_body = json.dumps({"access_id": corp_num, "scope": ["member", "110"]}).encode("utf-8")
        content_md5 = base64.b64encode(hashlib.md5(token_body).digest()).decode()
        dt_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        sign_target = f"POST\n{content_md5}\n{dt_str}\n/{service_id}/Token\n"
        signature = base64.b64encode(
            hmac_mod.new(base64.b64decode(secret_key), sign_target.encode(), hashlib.sha256).digest()
        ).decode()

        token_req = urllib.request.Request(
            f"{auth_url}/{service_id}/Token",
            data=token_body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"LINKHUB {link_id} {signature}",
                "x-lh-date": dt_str,
                "x-lh-version": "2.0",
                "x-lh-forwarded": "*",
            },
            method="POST"
        )
        with urllib.request.urlopen(token_req, timeout=10) as resp:
            token_data = json.loads(resp.read().decode())
        session_token = token_data.get("session_token", "")

        if not session_token:
            return JSONResponse(content={"ok": False, "error": "인증 토큰 발급 실패: " + json.dumps(token_data)})

        # Step 2: Build tax invoice object
        mgt_key = f"MES-{body.get('invoiceId', '')[:20]}"
        invoice = {
            "writeDate": body.get("writeDate", ""),
            "chargeDirection": "정과금",
            "issueType": "정발행",
            "purposeType": body.get("purposeType", "영수"),
            "taxType": "과세",
            "invoicerCorpNum": corp_num,
            "invoicerCorpName": co.get("nm", ""),
            "invoicerCEOName": co.get("ceo", ""),
            "invoicerAddr": co.get("addr", ""),
            "invoicerBizType": co.get("bizType", ""),
            "invoicerBizClass": co.get("bizClass", ""),
            "invoicerMgtKey": mgt_key,
            "invoiceeType": "사업자",
            "invoiceeCorpNum": body.get("invoiceeCorpNum", ""),
            "invoiceeCorpName": body.get("invoiceeCorp", ""),
            "invoiceeCEOName": body.get("invoiceeCeo", ""),
            "invoiceeAddr": body.get("invoiceeAddr", ""),
            "supplyCostTotal": body.get("supplyCost", "0"),
            "taxTotal": body.get("tax", "0"),
            "totalAmount": body.get("totalAmount", "0"),
            "detailList": [{
                "serialNum": 1,
                "purchaseDT": body.get("writeDate", ""),
                "itemName": body.get("itemName", ""),
                "qty": body.get("qty", 1),
                "unitCost": body.get("unitCost", "0"),
                "supplyCost": body.get("supplyCost", "0"),
                "tax": body.get("tax", "0"),
                "remark": body.get("note", ""),
            }]
        }

        # Step 3: Issue (RegistIssue)
        issue_body = json.dumps(invoice).encode("utf-8")
        issue_req = urllib.request.Request(
            f"{api_url}/Taxinvoice",
            data=issue_body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {session_token}",
                "x-pb-userid": "",
                "X-HTTP-Method-Override": "ISSUE",
            },
            method="POST"
        )
        with urllib.request.urlopen(issue_req, timeout=15) as resp:
            result = json.loads(resp.read().decode())

        if result.get("code", 0) == 1:
            db.add_audit_log(user.get("sub"), user.get("name"), "etax_issue", "taxinvoice",
                             mgt_key, f"{body.get('invoiceeCorp','')} {body.get('totalAmount','')}원",
                             get_client_ip(request))
            return JSONResponse(content={
                "ok": True,
                "ntsConfirmNum": result.get("ntsConfirmNum", ""),
                "message": result.get("message", "발행 성공")
            })
        else:
            return JSONResponse(content={
                "ok": False,
                "error": f"[{result.get('code','')}] {result.get('message','알 수 없는 오류')}"
            })

    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        return JSONResponse(content={"ok": False, "error": f"API 오류 ({e.code}): {error_body}"})
    except Exception as e:
        return JSONResponse(content={"ok": False, "error": f"서버 오류: {str(e)}"})


def _popbill_get_token(link_id: str, secret_key: str, corp_num: str, is_test: bool):
    """팝빌 인증 토큰 발급 (공통 유틸)"""
    import urllib.request, hmac as hmac_mod, base64
    auth_url = "https://auth.linkhub.co.kr"
    service_id = "POPBILL_TEST" if is_test else "POPBILL"
    token_body = json.dumps({"access_id": corp_num, "scope": ["member", "110", "121", "122", "123", "124", "125", "126"]}).encode("utf-8")
    content_md5 = base64.b64encode(hashlib.md5(token_body).digest()).decode()
    dt_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    sign_target = f"POST\n{content_md5}\n{dt_str}\n/{service_id}/Token\n"
    signature = base64.b64encode(
        hmac_mod.new(base64.b64decode(secret_key), sign_target.encode(), hashlib.sha256).digest()
    ).decode()
    token_req = urllib.request.Request(
        f"{auth_url}/{service_id}/Token",
        data=token_body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"LINKHUB {link_id} {signature}",
            "x-lh-date": dt_str,
            "x-lh-version": "2.0",
            "x-lh-forwarded": "*",
        },
        method="POST"
    )
    with urllib.request.urlopen(token_req, timeout=10) as resp:
        token_data = json.loads(resp.read().decode())
    return token_data.get("session_token", ""), service_id


@app.post("/api/popbill/received")
async def popbill_received(request: Request, user=Depends(get_current_user)):
    """팝빌 수신 세금계산서 조회
    Body: { "dateType": "W|I|R", "from": "YYYYMMDD", "to": "YYYYMMDD", "page": 1 }
    - W: 작성일자, I: 발행일자, R: 등록일자
    """
    import urllib.request, urllib.parse
    require_finance_user(user)
    body = await request.json()

    config_raw = db.get_data("ino_popbillConfig")
    if not config_raw:
        return JSONResponse(content={"ok": False, "error": "팝빌 API 설정이 없습니다."})
    config = json.loads(config_raw)
    link_id = config.get("linkId", "")
    secret_key = config.get("secretKey", "")
    corp_num = config.get("corpNum", "")
    is_test = config.get("isTest", True)

    if not link_id or not secret_key or not corp_num:
        return JSONResponse(content={"ok": False, "error": "팝빌 LinkID, SecretKey, 사업자번호 필요"})

    date_type = body.get("dateType", "W")  # W=작성, I=발행, R=등록
    date_from = body.get("from", "")
    date_to = body.get("to", "")
    page = int(body.get("page", 1))
    per_page = int(body.get("perPage", 100))

    if not date_from or not date_to:
        return JSONResponse(content={"ok": False, "error": "조회 기간(from, to) 필요"})

    try:
        token, service_id = _popbill_get_token(link_id, secret_key, corp_num, is_test)
        if not token:
            return JSONResponse(content={"ok": False, "error": "토큰 발급 실패"})

        api_url = "https://popbill-test.linkhub.co.kr" if is_test else "https://popbill.linkhub.co.kr"
        # MgtKeyType = BUY (매입)
        params = {
            "DType": date_type,
            "SDate": date_from,
            "EDate": date_to,
            "Page": page,
            "PerPage": per_page,
            "Order": "D"
        }
        query = urllib.parse.urlencode(params)
        full_url = f"{api_url}/Taxinvoice/BUY?{query}"

        req = urllib.request.Request(
            full_url,
            headers={
                "Authorization": f"Bearer {token}",
                "x-pb-userid": ""
            },
            method="GET"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())

        db.add_audit_log(user.get("sub"), user.get("name"), "etax_received_query", "taxinvoice",
                         None, f"{date_from}~{date_to} {result.get('total', 0)}건",
                         get_client_ip(request))
        return JSONResponse(content={"ok": True, "data": result})

    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        return JSONResponse(content={"ok": False, "error": f"API 오류 ({e.code}): {error_body[:200]}"})
    except Exception as e:
        return JSONResponse(content={"ok": False, "error": f"서버 오류: {str(e)}"})


@app.post("/api/hometax/parse-excel")
async def hometax_parse_excel(request: Request, user=Depends(get_current_user)):
    """홈택스 엑셀 파일 파싱 (매입/매출 세금계산서)
    Body: { "fileBase64": "...", "type": "sales|purchase" }
    """
    import base64, io, csv
    body = await request.json()
    file_b64 = body.get("fileBase64", "")
    inv_type = body.get("type", "purchase")  # 매입/매출
    if not file_b64:
        return JSONResponse(content={"ok": False, "error": "파일 데이터 없음"})

    try:
        # Data URL 프리픽스 제거
        if "," in file_b64:
            file_b64 = file_b64.split(",", 1)[1]
        raw = base64.b64decode(file_b64)

        # 홈택스 엑셀은 대부분 xls(HTML) 또는 CSV 형식으로 다운로드됨
        # 간단하게: 헤더 포함된 CSV (UTF-8 BOM) 우선 처리
        text = None
        for encoding in ['utf-8-sig', 'utf-8', 'euc-kr', 'cp949']:
            try:
                text = raw.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        if not text:
            return JSONResponse(content={"ok": False, "error": "파일 인코딩 실패 - CSV(UTF-8/EUC-KR) 형식 권장"})

        reader = csv.DictReader(io.StringIO(text))
        records = []
        for row in reader:
            # 홈택스 기본 컬럼명 매핑
            record = {
                "dt": (row.get("작성일자") or row.get("발행일자") or "").replace("-", "/").replace(".", "/"),
                "bizNo": row.get("공급자사업자번호") or row.get("공급받는자사업자번호") or "",
                "cli": row.get("공급자상호") or row.get("공급받는자상호") or row.get("상호") or "",
                "ceo": row.get("대표자명") or "",
                "item": row.get("품목명") or row.get("품목") or "",
                "qty": int(float(row.get("수량", "1") or 1)),
                "supply": int(float((row.get("공급가액") or "0").replace(",", ""))),
                "vat": int(float((row.get("세액") or "0").replace(",", ""))),
                "ntsNum": row.get("승인번호") or "",
                "type": inv_type
            }
            record["total"] = record["supply"] + record["vat"]
            records.append(record)

        db.add_audit_log(user.get("sub"), user.get("name"), "hometax_parse", "taxinvoice",
                         None, f"{inv_type} {len(records)}건 파싱",
                         get_client_ip(request))
        return JSONResponse(content={"ok": True, "count": len(records), "records": records})
    except Exception as e:
        return JSONResponse(content={"ok": False, "error": f"파싱 실패: {str(e)}"})


# --- Serve Frontend ---

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
DOCS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if request.url.path.endswith(('.js', '.css', '.html')):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

app.add_middleware(NoCacheMiddleware)

app.mount("/css", StaticFiles(directory=os.path.join(STATIC_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(STATIC_DIR, "js")), name="js")


def _is_mobile(user_agent: str) -> bool:
    """모바일 기기 감지 (UA 기반)"""
    if not user_agent:
        return False
    ua = user_agent.lower()
    mobile_keywords = ['iphone', 'ipad', 'android', 'mobile', 'blackberry', 'webos', 'iemobile', 'opera mini']
    return any(k in ua for k in mobile_keywords)


@app.get("/")
def serve_index(request: Request):
    # 모바일이면 /m 으로 리다이렉트 (쿠키로 오버라이드 가능)
    force_pc = request.cookies.get("force_pc") == "1"
    if not force_pc and _is_mobile(request.headers.get("user-agent", "")):
        return RedirectResponse(url="/m", status_code=302)
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/m")
def serve_mobile():
    return FileResponse(os.path.join(STATIC_DIR, "m.html"))


@app.get("/pc")
def serve_pc_force():
    """PC 버전 강제 (쿠키 설정 + 홈)"""
    response = FileResponse(os.path.join(STATIC_DIR, "index.html"))
    response.set_cookie("force_pc", "1", max_age=86400*30)
    return response


# Serve docs (diagrams etc.)
@app.get("/docs/{filename:path}")
def serve_docs(filename: str):
    filepath = resolve_safe_path(DOCS_DIR, filename)
    if filepath and filepath.is_file():
        return FileResponse(str(filepath))
    return JSONResponse(status_code=404, content={"detail": "Not Found"})

# Serve static assets (icons, manifest, etc.)
@app.get("/{filename:path}")
def serve_static(filename: str):
    filepath = resolve_safe_path(STATIC_DIR, filename)
    if filepath and filepath.is_file():
        return FileResponse(str(filepath))
    return JSONResponse(status_code=404, content={"detail": "Not Found"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
