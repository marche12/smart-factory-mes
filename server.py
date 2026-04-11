import os
import json
import secrets
import hashlib
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
@app.on_event("startup")
def startup():
    db.init_db()
    db.init_auth_tables()
    db.cleanup_expired_tokens()
    db.ensure_daily_backup()
    print("=" * 50)
    print("  InnoPackage MES Server Started")
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
    body = await request.json()
    value = body.get("value", "")
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
