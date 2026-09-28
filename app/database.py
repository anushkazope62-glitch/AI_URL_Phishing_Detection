import os
import sqlite3
import hashlib
from typing import Optional, List, Dict, Any

# Check for PostgreSQL connection string (Render, Supabase, Neon, etc.)
DATABASE_URL = (
    os.environ.get("DATABASE_URL")
    or os.environ.get("POSTGRES_URL")
    or os.environ.get("POSTGRESQL_URL")
    or ""
)

# SQLite fallback path (supports Render Persistent Disks via DATABASE_PATH=/data/phishing_users.db)
SQLITE_DB_PATH = (
    os.environ.get("DATABASE_PATH")
    or os.environ.get("SQLITE_PATH")
    or "phishing_users.db"
)

# Optional psycopg2 import for PostgreSQL
_has_psycopg2 = False
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    _has_psycopg2 = True
except ImportError:
    psycopg2 = None
    RealDictCursor = None


def is_postgres() -> bool:
    """Returns True if a PostgreSQL connection string is configured and driver is available."""
    return bool(DATABASE_URL and _has_psycopg2)


def get_connection():
    """
    Returns an active database connection with row-as-dict support.
    Supports PostgreSQL when DATABASE_URL is set; falls back to SQLite.
    """
    if is_postgres():
        # Fix Render/Heroku postgres:// vs postgresql:// scheme if needed
        pg_url = DATABASE_URL
        if pg_url.startswith("postgres://"):
            pg_url = pg_url.replace("postgres://", "postgresql://", 1)
        
        conn = psycopg2.connect(pg_url, cursor_factory=RealDictCursor)
        conn.autocommit = False
        return conn
    else:
        # Ensure parent directory exists for SQLite file (e.g. if pointing to a mounted volume)
        db_dir = os.path.dirname(SQLITE_DB_PATH)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
            
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn


def _format_sql(sql: str) -> str:
    """Converts '?' placeholders to '%s' when running on PostgreSQL."""
    if is_postgres():
        # Replace ? with %s for psycopg2
        return sql.replace("?", "%s")
    return sql


def fetch_one(sql: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    """Executes a query and returns a single row as a standard Python dictionary."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        formatted_sql = _format_sql(sql)
        cursor.execute(formatted_sql, params)
        row = cursor.fetchone()
        if row is None:
            return None
        if is_postgres():
            return dict(row)
        else:
            return dict(row)
    finally:
        conn.close()


def fetch_all(sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Executes a query and returns all matching rows as a list of dictionaries."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        formatted_sql = _format_sql(sql)
        cursor.execute(formatted_sql, params)
        rows = cursor.fetchall()
        if not rows:
            return []
        if is_postgres():
            return [dict(r) for r in rows]
        else:
            return [dict(r) for r in rows]
    finally:
        conn.close()


def execute_insert(sql: str, params: tuple = ()) -> int:
    """
    Executes an INSERT statement and returns the newly generated primary key id.
    Handles both SQLite (lastrowid) and PostgreSQL (RETURNING id).
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        formatted_sql = _format_sql(sql)
        
        if is_postgres():
            # If query doesn't already have RETURNING id, append it
            if "RETURNING" not in formatted_sql.upper():
                formatted_sql = formatted_sql.rstrip().rstrip(";") + " RETURNING id;"
            cursor.execute(formatted_sql, params)
            result = cursor.fetchone()
            conn.commit()
            if result:
                return result["id"] if isinstance(result, dict) else result[0]
            return 0
        else:
            cursor.execute(formatted_sql, params)
            new_id = cursor.lastrowid
            conn.commit()
            return new_id or 0
    finally:
        conn.close()


def execute_query(sql: str, params: tuple = ()) -> int:
    """Executes an UPDATE, DELETE, or DDL statement and returns rowcount."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        formatted_sql = _format_sql(sql)
        cursor.execute(formatted_sql, params)
        rowcount = cursor.rowcount
        conn.commit()
        return rowcount
    finally:
        conn.close()


def seed_default_users():
    """Seeds default demo accounts if the database is newly initialized."""
    try:
        admin_email = "admin@gmail.com"
        existing = fetch_one("SELECT id FROM users WHERE LOWER(email) = ?", (admin_email,))
        if not existing:
            admin_pwd_hash = hashlib.sha256("123456".encode()).hexdigest()
            execute_insert(
                """
                INSERT INTO users (name, email, password_hash)
                VALUES (?, ?, ?)
                """,
                ("Administrator", admin_email, admin_pwd_hash)
            )
            print(f"[DB] Initialized default demo user: {admin_email}")
    except Exception as e:
        print(f"[DB] Default user seed note: {e}")


def create_tables():
    """Initializes schema for either PostgreSQL or SQLite."""
    conn = get_connection()
    try:
        cursor = conn.cursor()

        if is_postgres():
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS scans (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    url TEXT NOT NULL,
                    prediction VARCHAR(50) NOT NULL,
                    confidence DOUBLE PRECISION,
                    threat_level VARCHAR(50),
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
        else:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    url TEXT NOT NULL,
                    prediction TEXT NOT NULL,
                    confidence REAL,
                    threat_level TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

        conn.commit()
        print(f"[DB] Database initialized successfully using {'PostgreSQL' if is_postgres() else 'SQLite'}.")
    except Exception as e:
        print(f"[DB Error] Failed to create tables: {e}")
        if not is_postgres():
            conn.rollback()
        raise
    finally:
        conn.close()

    # Seed default user
    seed_default_users()


def get_db_status() -> Dict[str, Any]:
    """Returns health and status of the current database configuration."""
    db_type = "PostgreSQL (Permanent Cloud Storage)" if is_postgres() else "SQLite"
    location = DATABASE_URL.split("@")[-1] if is_postgres() else SQLITE_DB_PATH
    try:
        user_count = fetch_one("SELECT COUNT(*) as count FROM users")
        scan_count = fetch_one("SELECT COUNT(*) as count FROM scans")
        return {
            "connected": True,
            "engine": db_type,
            "target": location,
            "total_users": user_count["count"] if user_count else 0,
            "total_scans": scan_count["count"] if scan_count else 0
        }
    except Exception as e:
        return {
            "connected": False,
            "engine": db_type,
            "error": str(e)
        }