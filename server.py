import os
import json
from datetime import datetime

from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

import database as db

app = FastAPI(title="InnoPackage MES")

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
    print("=" * 50)
    print("  InnoPackage MES Server Started")
    print("  http://localhost:8080")
    print("=" * 50)


# --- API Endpoints ---

@app.get("/api/data")
def get_all_keys():
    """Get all keys in the data store."""
    keys = db.get_all_keys()
    return JSONResponse(content=keys)


@app.get("/api/data/{key:path}")
def get_data(key: str):
    """Get data by key."""
    value = db.get_data(key)
    if value is None:
        return JSONResponse(content={"key": key, "value": None})
    return JSONResponse(content={"key": key, "value": value})


@app.post("/api/data/{key:path}")
async def set_data(key: str, request: Request):
    """Save data by key."""
    body = await request.json()
    value = body.get("value", "")
    db.set_data(key, value)
    return JSONResponse(content={"ok": True, "key": key})


@app.delete("/api/data/{key:path}")
def delete_data(key: str):
    """Delete data by key."""
    deleted = db.delete_data(key)
    return JSONResponse(content={"ok": True, "deleted": deleted})


@app.get("/api/backup")
def backup():
    """Download full backup as JSON file."""
    all_data = db.get_all_data()
    # Build backup structure similar to existing format
    backup_obj = {}
    for key, value in all_data.items():
        # Strip ino_ prefix for backup compatibility
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

    return StreamingResponse(
        iter([content]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.post("/api/restore")
async def restore(file: UploadFile = File(...)):
    """Upload backup JSON to restore data."""
    try:
        content = await file.read()
        data = json.loads(content)

        if "_backup" not in data:
            return JSONResponse(
                status_code=400,
                content={"ok": False, "error": "Invalid backup file (missing _backup marker)"}
            )

        # Convert backup format to key-value store
        store_data = {}
        for key, value in data.items():
            if key == "_backup":
                continue
            # Add ino_ prefix for storage
            store_key = key if key.startswith("ino_") else f"ino_{key}"
            store_data[store_key] = json.dumps(value, ensure_ascii=False)

        db.restore_all_data(store_data)
        return JSONResponse(content={"ok": True, "keys_restored": len(store_data)})

    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": "Invalid JSON file"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"ok": False, "error": str(e)}
        )


# --- Serve Frontend ---

# Mount static files
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

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
    """Serve the main index.html."""
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
