import os
import json
import secrets
import hashlib
import threading
from datetime import datetime, timedelta

import bcrypt
import jwt
from fastapi import FastAPI, Request, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
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

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


# --- Auth Endpoints ---

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
    keys = db.get_all_keys()
    return JSONResponse(content=keys)


@app.get("/api/data/{key:path}")
def get_data(key: str, user=Depends(get_current_user)):
    value = db.get_data(key)
    if value is None:
        return JSONResponse(content={"key": key, "value": None})
    return JSONResponse(content={"key": key, "value": value})


@app.post("/api/data/{key:path}")
async def set_data(key: str, request: Request, user=Depends(get_current_user)):
    import json as _json
    body = await request.json()
    value = body.get("value", "")
    if not isinstance(value, str):
        value = _json.dumps(value, ensure_ascii=False)
    db.set_data(key, value)
    target = extract_target(key)
    db.add_audit_log(user.get("sub"), user.get("name"), "update", target, key, None, get_client_ip(request))
    return JSONResponse(content={"ok": True, "key": key})


@app.delete("/api/data/{key:path}")
def delete_data(key: str, request: Request, user=Depends(get_current_user)):
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


@app.get("/")
def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


# Serve docs (diagrams etc.)
@app.get("/docs/{filename:path}")
def serve_docs(filename: str):
    filepath = os.path.join(DOCS_DIR, filename)
    if os.path.isfile(filepath):
        return FileResponse(filepath)
    return JSONResponse(status_code=404, content={"detail": "Not Found"})

# Serve static assets (icons, manifest, etc.)
@app.get("/{filename:path}")
def serve_static(filename: str):
    filepath = os.path.join(STATIC_DIR, filename)
    if os.path.isfile(filepath):
        return FileResponse(filepath)
    return JSONResponse(status_code=404, content={"detail": "Not Found"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
