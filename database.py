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


def get_data_entry(key: str):
    """Get value and updated_at metadata for a key."""
    conn = get_connection()
    row = conn.execute(
        'SELECT value, updated_at FROM data_store WHERE key = ?',
        (key,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    return {
        "value": row["value"],
        "updated_at": row["updated_at"],
    }


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


def compare_and_set_data(key: str, value: str, expected_updated_at=None):
    """
    Optimistic concurrency control for key-value updates.
    Returns (ok, current_value, current_updated_at).
    """
    conn = get_connection()
    row = conn.execute(
        'SELECT value, updated_at FROM data_store WHERE key = ?',
        (key,)
    ).fetchone()
    current_value = row["value"] if row else None
    current_updated_at = row["updated_at"] if row else None

    if row:
        if expected_updated_at is not None and expected_updated_at != current_updated_at:
            conn.close()
            return False, current_value, current_updated_at
    elif expected_updated_at not in (None, ""):
        conn.close()
        return False, current_value, current_updated_at

    new_updated_at = datetime.now().isoformat()
    conn.execute('''
        INSERT INTO data_store (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    ''', (key, value, new_updated_at))
    conn.commit()
    conn.close()
    return True, value, new_updated_at


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


# ===== Normalized Tables =====

def init_normalized_tables():
    """Create normalized tables (v2 schema)."""
    conn = get_connection()
    conn.execute("PRAGMA foreign_keys = ON")
    schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs', 'db-schema.sql')
    if os.path.isfile(schema_path):
        with open(schema_path, 'r', encoding='utf-8') as f:
            sql = f.read()
        conn.executescript(sql)
    conn.commit()
    conn.close()


def migrate_kv_to_tables():
    """Migrate data from key-value store to normalized tables (one-time)."""
    conn = get_connection()
    conn.execute("PRAGMA foreign_keys = ON")

    # Check if migration already done
    row = conn.execute("SELECT COUNT(*) FROM clients").fetchone()
    if row[0] > 0:
        conn.close()
        return  # Already migrated

    # Load from key-value store
    def kv_get(key):
        r = conn.execute('SELECT value FROM data_store WHERE key = ?', (key,)).fetchone()
        if r and r[0]:
            try:
                return json.loads(r[0])
            except:
                return []
        return []

    # 1. Clients
    clients = kv_get('ino_cli')
    cli_map = {}  # old_id -> new_id
    for c in clients:
        cursor = conn.execute(
            'INSERT INTO clients (name, biz_no, ceo, c_type, is_vendor, addr, tel, fax, email, manager, pay_method, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            (c.get('nm',''), c.get('biz',''), c.get('rep',''), c.get('cType','sales'),
             1 if c.get('isVendor') else 0, c.get('addr',''), c.get('tel',''),
             c.get('fax',''), c.get('email',''), c.get('mgr',''), c.get('pay',''), c.get('nt',''))
        )
        cli_map[c.get('id','')] = cursor.lastrowid

    # 2. Products
    products = kv_get('ino_prod')
    prod_map = {}
    for p in products:
        cli_id = cli_map.get(p.get('cid'), None)
        cursor = conn.execute(
            'INSERT INTO products (code, name, client_id, client_name, paper, spec, fabric, fabric_spec, price, print_spec, gold, mold_no, hand, note, caution) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (p.get('code',''), p.get('nm',''), cli_id, p.get('cnm',''),
             p.get('paper',''), p.get('spec',''), p.get('fabric',''), p.get('fabricSpec',''),
             p.get('price',0), p.get('ps',''), p.get('gold',''), p.get('mold',''),
             p.get('hand',''), p.get('nt',''), p.get('caut',''))
        )
        prod_map[p.get('id','')] = cursor.lastrowid
        # Product procs
        procs = p.get('procs', [])
        if isinstance(procs, list):
            for i, pr in enumerate(procs):
                nm = pr if isinstance(pr, str) else pr.get('nm', '')
                tp = 'n' if isinstance(pr, str) else pr.get('tp', 'n')
                if nm:
                    conn.execute('INSERT INTO product_procs (product_id, seq, proc_name, proc_type) VALUES (?,?,?,?)',
                                 (cursor.lastrowid, i+1, nm, tp))

    # 3. Molds
    molds = kv_get('ino_mold')
    for m in molds:
        conn.execute(
            'INSERT INTO molds (mold_no, product_name, client_name, location, status, note) VALUES (?,?,?,?,?,?)',
            (m.get('no',''), m.get('pnm',''), m.get('cnm',''), m.get('loc',''), m.get('st','사용중'), m.get('nt',''))
        )

    # 4. Work Orders + Procs
    wo_list = kv_get('ino_wo')
    # Also check monthly keys
    all_keys = [r[0] for r in conn.execute('SELECT key FROM data_store WHERE key LIKE ?', ('ino_wo_%',)).fetchall()]
    for k in all_keys:
        monthly = kv_get(k.replace('ino_', '') if not k.startswith('ino_wo_') else k)
        if not monthly:
            r = conn.execute('SELECT value FROM data_store WHERE key = ?', (k,)).fetchone()
            if r and r[0]:
                try:
                    monthly = json.loads(r[0])
                except:
                    monthly = []
        if isinstance(monthly, list):
            wo_list.extend(monthly)

    wo_map = {}
    for o in wo_list:
        if not o.get('wn'):
            continue
        # Check duplicate
        existing = conn.execute('SELECT id FROM work_orders WHERE wo_no = ?', (o['wn'],)).fetchone()
        if existing:
            continue
        cli_id = cli_map.get(o.get('cid'), None)
        prod_id = prod_map.get(o.get('pid'), None)
        cursor = conn.execute(
            '''INSERT INTO work_orders (wo_no, client_id, client_name, product_id, product_name,
               vendor_name, manager, paper, spec, qm, qe, fabric, fabric_spec, fabric_qty, fabric_extra,
               print_spec, mold_no, hand, fq, ship_date, dlv, price, amount, note, caution, image,
               status, priority, wo_date, comp_date, comp_qty, ship_actual)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            (o.get('wn',''), cli_id, o.get('cnm',''), prod_id, o.get('pnm',''),
             o.get('vendor',''), o.get('mgr',''), o.get('paper',''), o.get('spec',''),
             o.get('qm',0), o.get('qe',0), o.get('fabric',''), o.get('fabricSpec',''),
             o.get('fabricQty',0), o.get('fabricExtra',0), o.get('ps',''), o.get('mold',''),
             o.get('hand',''), o.get('fq',0), o.get('sd',''), o.get('dlv',''),
             o.get('price',0), o.get('amt',0), o.get('nt',''), o.get('caut',''),
             o.get('img',''), o.get('status','대기'), o.get('pri',0), o.get('dt',''),
             o.get('compDate',''), o.get('compQty',0), o.get('shipDate',''))
        )
        new_wo_id = cursor.lastrowid
        wo_map[o.get('id','')] = new_wo_id

        # Procs
        for i, p in enumerate(o.get('procs', [])):
            conn.execute(
                '''INSERT INTO wo_procs (wo_id, seq, proc_name, proc_type, method, vendor, mold_no,
                   machine, mech_coat, status, qty, defect, defect_reason, started_at, finished_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                (new_wo_id, i+1, p.get('nm',''), p.get('tp','n'), p.get('mt',''), p.get('vd',''),
                 p.get('moldNo',''), p.get('machine',''), 1 if p.get('mechCoat') else 0,
                 p.get('st','대기'), p.get('qty',0), p.get('df',0), p.get('dfReason',''),
                 p.get('t1',''), p.get('t2',''))
            )

        # Papers
        for pp in o.get('papers', []):
            if pp.get('paper') or pp.get('qm'):
                conn.execute('INSERT INTO wo_papers (wo_id, paper, spec, qm, qe) VALUES (?,?,?,?,?)',
                             (new_wo_id, pp.get('paper',''), pp.get('spec',''), pp.get('qm',0), pp.get('qe',0)))

        # Fabrics
        for ff in o.get('fabrics', []):
            if ff.get('fabric') or ff.get('fabricQty'):
                conn.execute('INSERT INTO wo_fabrics (wo_id, fabric, fabric_spec, qty, extra) VALUES (?,?,?,?,?)',
                             (new_wo_id, ff.get('fabric',''), ff.get('fabricSpec',''), ff.get('fabricQty',0), ff.get('fabricExtra',0)))

    # 5. Sales
    sales = kv_get('ino_sales')
    for s in sales:
        wo_id = wo_map.get(s.get('woId'), None)
        cli_id = None
        for cid, nid in cli_map.items():
            c = next((x for x in clients if x.get('id') == cid and x.get('nm') == s.get('cli')), None)
            if c:
                cli_id = nid
                break
        conn.execute(
            'INSERT INTO sales (sale_date, client_id, client_name, product_name, qty, price, amount, paid, pay_type, wo_id, note) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            (s.get('dt',''), cli_id, s.get('cli',''), s.get('prod',''), s.get('qty',0),
             s.get('price',0), s.get('amt',0), s.get('paid',0), s.get('payType','미수'),
             wo_id, s.get('note',''))
        )

    # 6. ShipLog
    ships = kv_get('ino_shipLog')
    for sh in ships:
        wo_id = wo_map.get(sh.get('woId'), None)
        conn.execute(
            'INSERT INTO shipments (wo_id, wo_no, client_name, product_name, qty, ship_date, dlv, note, manager) VALUES (?,?,?,?,?,?,?,?,?)',
            (wo_id, sh.get('wn',''), sh.get('cnm',''), sh.get('pnm',''), sh.get('qty',0),
             sh.get('dt',''), sh.get('dlv',''), sh.get('note',''), sh.get('mgr',''))
        )

    # 7. Users
    users = kv_get('ino_users')
    for u in users:
        conn.execute(
            'INSERT OR IGNORE INTO users (username, name, dept, position, role, proc, pw_hash, perms) VALUES (?,?,?,?,?,?,?,?)',
            (u.get('un',''), u.get('nm',''), u.get('dept',''), u.get('position',''),
             u.get('role','admin'), u.get('proc',''), u.get('pw',''),
             json.dumps(u.get('perms')) if u.get('perms') else '')
        )

    # 8. Logs
    logs = kv_get('ino_logs')
    for l in logs:
        conn.execute('INSERT INTO activity_logs (message, created_at) VALUES (?,?)',
                     (l.get('m',''), l.get('t','')))

    # 9. Company
    co = kv_get('ino_co') if isinstance(kv_get('ino_co'), dict) else {}
    if not co:
        r = conn.execute('SELECT value FROM data_store WHERE key = ?', ('ino_co',)).fetchone()
        if r and r[0]:
            try:
                co = json.loads(r[0])
            except:
                co = {}
    if co:
        conn.execute('INSERT OR REPLACE INTO company (id, name, addr, tel, fax) VALUES (1,?,?,?,?)',
                     (co.get('nm','팩플로우'), co.get('addr',''), co.get('tel',''), co.get('fax','')))

    conn.commit()
    conn.close()
    print(f"Migration complete: {len(clients)} clients, {len(products)} products, {len(molds)} molds, {len(wo_list)} WOs, {len(sales)} sales")
