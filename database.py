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
