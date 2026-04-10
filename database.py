import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'mes.db')


def get_connection():
    """Get a new SQLite connection."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Initialize the database and create tables if they don't exist."""
    conn = get_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS data_store (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()


def get_data(key: str):
    """Get data by key. Returns the value string or None."""
    conn = get_connection()
    row = conn.execute('SELECT value FROM data_store WHERE key = ?', (key,)).fetchone()
    conn.close()
    if row:
        return row['value']
    return None


def set_data(key: str, value: str):
    """Set data by key (upsert)."""
    conn = get_connection()
    conn.execute('''
        INSERT INTO data_store (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    ''', (key, value, datetime.now().isoformat()))
    conn.commit()
    conn.close()


def get_all_keys():
    """Get all keys in the data store."""
    conn = get_connection()
    rows = conn.execute('SELECT key FROM data_store ORDER BY key').fetchall()
    conn.close()
    return [row['key'] for row in rows]


def delete_data(key: str):
    """Delete data by key. Returns True if deleted, False if not found."""
    conn = get_connection()
    cursor = conn.execute('DELETE FROM data_store WHERE key = ?', (key,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


def get_all_data():
    """Get all key-value pairs as a dict (for backup)."""
    conn = get_connection()
    rows = conn.execute('SELECT key, value FROM data_store ORDER BY key').fetchall()
    conn.close()
    return {row['key']: row['value'] for row in rows}


def restore_all_data(data: dict):
    """Replace all data from a dict (for restore). Clears existing data first."""
    conn = get_connection()
    conn.execute('DELETE FROM data_store')
    now = datetime.now().isoformat()
    for key, value in data.items():
        conn.execute(
            'INSERT INTO data_store (key, value, updated_at) VALUES (?, ?, ?)',
            (key, value, now)
        )
    conn.commit()
    conn.close()


# ===== Auth & Audit Tables =====

def init_auth_tables():
    """Create refresh_tokens and audit_log tables."""
    conn = get_connection()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            user_name TEXT,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            user_name TEXT,
            action TEXT NOT NULL,
            target TEXT,
            target_id TEXT,
            detail TEXT,
            ip TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
        CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
    ''')
    conn.commit()
    conn.close()


def save_refresh_token(token_hash: str, user_id: str, user_name: str, expires_at: str):
    conn = get_connection()
    conn.execute(
        'INSERT OR REPLACE INTO refresh_tokens (token_hash, user_id, user_name, expires_at) VALUES (?, ?, ?, ?)',
        (token_hash, user_id, user_name, expires_at)
    )
    conn.commit()
    conn.close()


def get_refresh_token(token_hash: str):
    conn = get_connection()
    row = conn.execute('SELECT * FROM refresh_tokens WHERE token_hash = ?', (token_hash,)).fetchone()
    conn.close()
    return dict(row) if row else None


def delete_refresh_token(token_hash: str):
    conn = get_connection()
    conn.execute('DELETE FROM refresh_tokens WHERE token_hash = ?', (token_hash,))
    conn.commit()
    conn.close()


def delete_user_refresh_tokens(user_id: str):
    conn = get_connection()
    conn.execute('DELETE FROM refresh_tokens WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()


def cleanup_expired_tokens():
    conn = get_connection()
    conn.execute('DELETE FROM refresh_tokens WHERE expires_at < ?', (datetime.now().isoformat(),))
    conn.commit()
    conn.close()


def add_audit_log(user_id: str, user_name: str, action: str, target: str = None,
                  target_id: str = None, detail: str = None, ip: str = None):
    conn = get_connection()
    conn.execute(
        'INSERT INTO audit_log (user_id, user_name, action, target, target_id, detail, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (user_id, user_name, action, target, target_id, detail, ip, datetime.now().isoformat())
    )
    conn.execute('DELETE FROM audit_log WHERE id NOT IN (SELECT id FROM audit_log ORDER BY created_at DESC LIMIT 10000)')
    conn.commit()
    conn.close()


def get_audit_logs(user_id: str = None, action: str = None, from_dt: str = None,
                   to_dt: str = None, limit: int = 50, offset: int = 0):
    conn = get_connection()
    where, params = [], []
    if user_id:
        where.append('user_id = ?'); params.append(user_id)
    if action:
        where.append('action = ?'); params.append(action)
    if from_dt:
        where.append('created_at >= ?'); params.append(from_dt)
    if to_dt:
        where.append('created_at <= ?'); params.append(to_dt + 'T23:59:59')
    wc = (' WHERE ' + ' AND '.join(where)) if where else ''
    total = conn.execute('SELECT COUNT(*) as cnt FROM audit_log' + wc, params).fetchone()['cnt']
    rows = conn.execute(
        'SELECT * FROM audit_log' + wc + ' ORDER BY created_at DESC LIMIT ? OFFSET ?',
        params + [limit, offset]
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows], total


# ===== Backup Management =====

import shutil
import glob

BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'backup')


def create_backup(tag: str = None) -> str:
    """Create a JSON backup of all data. Returns filename."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    now = datetime.now()
    suffix = f"-{tag}" if tag else ""
    filename = f"{now.strftime('%Y-%m-%d_%H%M%S')}{suffix}.json"
    filepath = os.path.join(BACKUP_DIR, filename)
    all_data = get_all_data()
    backup_obj = {}
    for key, value in all_data.items():
        backup_key = key[4:] if key.startswith("ino_") else key
        try:
            backup_obj[backup_key] = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            backup_obj[backup_key] = value
    backup_obj["_backup"] = {"date": now.strftime("%Y-%m-%d %H:%M:%S"), "version": "2.0", "source": "auto"}
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(backup_obj, f, ensure_ascii=False)
    return filename


def list_backups() -> list:
    """List all backup files with metadata."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    files = sorted(glob.glob(os.path.join(BACKUP_DIR, '*.json')), reverse=True)
    result = []
    for fp in files:
        name = os.path.basename(fp)
        size = os.path.getsize(fp)
        result.append({"filename": name, "size": size, "size_str": f"{size/1024:.1f}KB"})
    return result


def restore_from_backup(filename: str) -> int:
    """Restore data from a backup file. Returns number of keys restored."""
    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.isfile(filepath):
        raise FileNotFoundError(f"Backup not found: {filename}")
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if "_backup" not in data:
        raise ValueError("Invalid backup file")
    store_data = {}
    for key, value in data.items():
        if key == "_backup":
            continue
        store_key = key if key.startswith("ino_") else f"ino_{key}"
        store_data[store_key] = json.dumps(value, ensure_ascii=False)
    restore_all_data(store_data)
    return len(store_data)


def delete_backup(filename: str) -> bool:
    filepath = os.path.join(BACKUP_DIR, filename)
    if os.path.isfile(filepath):
        os.remove(filepath)
        return True
    return False


def cleanup_old_backups(days: int = 30):
    """Delete backups older than N days."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    cutoff = datetime.now().timestamp() - (days * 86400)
    for fp in glob.glob(os.path.join(BACKUP_DIR, '*.json')):
        if os.path.getmtime(fp) < cutoff:
            os.remove(fp)


def ensure_daily_backup():
    """Create today's backup if it doesn't exist yet."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    today = datetime.now().strftime('%Y-%m-%d')
    existing = [f for f in os.listdir(BACKUP_DIR) if f.startswith(today)]
    if not existing:
        create_backup("auto")
        cleanup_old_backups(30)
