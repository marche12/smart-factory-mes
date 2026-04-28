#!/usr/bin/env python3
"""
data_store(KV) 중복키·충돌 정리 스크립트.

검사 대상:
  1. data_store 의 key 자체 중복 (이론상 PK 라 0이지만 ino_ 접두사 변종 검사)
  2. cli/prod/mold/vendors 안의 id 중복 / 이름 중복 / 빈 이름
  3. wo 의 wn(작업지시번호) 중복
  4. 배열 안의 None/빈 객체

기본은 dry-run. --apply 줘야 실제 정리.

사용법:
    python3 04_dedupe_kv.py                    # 검사만 (dry-run)
    python3 04_dedupe_kv.py --apply            # 실제 정리 (정리 직전 자동 백업)
    python3 04_dedupe_kv.py --keys cli,prod,wo # 특정 키만
    python3 04_dedupe_kv.py --renumber-wo      # wo.wn 중복을 wn-2/wn-3 로 자동 재번호
                                                  (--apply 없으면 dry-run, 변경 미반영)
"""
import json
import os
import sys
import shutil
import sqlite3
from collections import Counter
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "mes.db")

# (key, identity_field, name_field, label)
TARGETS = [
    ("cli",     "id", "nm", "거래처"),
    ("prod",    "id", "nm", "품목"),
    ("mold",    "id", "no", "목형"),
    ("vendors", "id", "nm", "외주처"),
    ("users",   "id", "un", "사용자"),
    ("wo",      "id", "wn", "작업지시"),
]


def load(db, key):
    row = db.execute("SELECT value FROM data_store WHERE key=?", [key]).fetchone()
    if not row:
        return []
    try:
        v = json.loads(row[0])
    except (json.JSONDecodeError, TypeError):
        return []
    return v if isinstance(v, list) else []


def save(db, key, data):
    db.execute(
        "INSERT OR REPLACE INTO data_store(key, value, updated_at) VALUES(?, ?, ?)",
        [key, json.dumps(data, ensure_ascii=False), datetime.now().isoformat()],
    )


def detect_conflicts(items, id_field, name_field):
    issues = {
        "none_or_garbage": 0,
        "empty_name": 0,
        "dup_ids": [],
        "dup_names": [],
    }
    cleaned = []
    seen_ids = {}
    name_counter = Counter()

    for it in items:
        if not isinstance(it, dict):
            issues["none_or_garbage"] += 1
            continue
        nm = (str(it.get(name_field) or "")).strip()
        if not nm:
            issues["empty_name"] += 1
            continue
        ident = it.get(id_field) or ""
        if ident in seen_ids:
            seen_ids[ident] += 1
        else:
            seen_ids[ident] = 1
        name_counter[nm] += 1
        cleaned.append(it)

    issues["dup_ids"] = [(k, v) for k, v in seen_ids.items() if v > 1 and k]
    issues["dup_names"] = [(k, v) for k, v in name_counter.items() if v > 1]
    return cleaned, issues


def merge_duplicates(items, id_field, name_field):
    """중복 id 는 마지막 항목 유지, 중복 이름은 마지막 항목으로 병합 (필드는 union)."""
    by_id = {}
    by_name = {}
    out_order = []

    for it in items:
        if not isinstance(it, dict):
            continue
        nm = (str(it.get(name_field) or "")).strip()
        if not nm:
            continue
        ident = it.get(id_field) or f"__no_id_{nm}__"

        if ident in by_id:
            existing = by_id[ident]
            for k, v in it.items():
                if v not in (None, "", 0) and not existing.get(k):
                    existing[k] = v
        elif nm in by_name:
            existing = by_name[nm]
            for k, v in it.items():
                if v not in (None, "", 0) and not existing.get(k):
                    existing[k] = v
        else:
            by_id[ident] = it
            by_name[nm] = it
            out_order.append(it)

    return out_order


def renumber_wo(items, dry_run=True):
    """wo 배열 안에서 wn 중복을 첫 항목은 그대로, 두번째부터 wn-2/wn-3 으로 재번호.
    Returns (new_items, change_log[]).
    """
    seen_count = {}
    new_items = []
    changes = []
    for it in items:
        if not isinstance(it, dict):
            new_items.append(it)
            continue
        wn = (it.get("wn") or "").strip()
        if not wn:
            new_items.append(it)
            continue
        n = seen_count.get(wn, 0) + 1
        seen_count[wn] = n
        if n == 1:
            new_items.append(it)
            continue
        new_wn = f"{wn}-{n}"
        # 새로 부여한 번호도 충돌하면 -N+1, -N+2 로 끝까지 밀기
        bump = n
        while new_wn in seen_count and seen_count.get(new_wn, 0) > 0:
            bump += 1
            new_wn = f"{wn}-{bump}"
        seen_count[new_wn] = 1
        if dry_run:
            cloned = dict(it)
        else:
            cloned = it
            cloned["wn"] = new_wn
            cloned["_renumberedFrom"] = wn
            cloned["_renumberedAt"] = datetime.now().isoformat()
        changes.append((wn, new_wn, it.get("id") or "", it.get("dt") or ""))
        new_items.append(cloned)
    return new_items, changes


def _wo_keys_in_store(db):
    """wo, ino_wo, wo_YYYY-MM 형태 모두 수집."""
    rows = db.execute(
        "SELECT key FROM data_store WHERE key='wo' OR key='ino_wo' OR key LIKE 'wo_%' OR key LIKE 'ino_wo_%'"
    ).fetchall()
    return [r[0] for r in rows]


def main():
    apply_mode = "--apply" in sys.argv
    renumber_wo_mode = "--renumber-wo" in sys.argv
    keys_filter = None
    if "--keys" in sys.argv:
        idx = sys.argv.index("--keys")
        if idx + 1 < len(sys.argv):
            keys_filter = {k.strip() for k in sys.argv[idx + 1].split(",")}

    if not os.path.exists(DB_PATH):
        print(f"DB 없음: {DB_PATH}")
        sys.exit(1)

    if apply_mode:
        backup_path = f"{DB_PATH}.bak-dedupe-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        shutil.copy2(DB_PATH, backup_path)
        print(f"[BACKUP] {backup_path}\n")

    db = sqlite3.connect(DB_PATH)

    # 1. data_store 키 변종 (ino_ 접두사 충돌)
    rows = db.execute("SELECT key FROM data_store").fetchall()
    keys = {r[0] for r in rows}
    conflicts_keys = []
    for k in keys:
        bare = k[4:] if k.startswith("ino_") else k
        prefixed = f"ino_{bare}"
        if k != prefixed and prefixed in keys and bare in keys:
            conflicts_keys.append((bare, prefixed))
    if conflicts_keys:
        print(f"[KEY-CONFLICT] ino_ 접두사 양쪽 존재: {len(conflicts_keys)}쌍")
        for a, b in conflicts_keys[:5]:
            print(f"  · {a}  vs  {b}")
    else:
        print("[KEY-CONFLICT] ino_ 접두사 충돌 없음")
    print()

    # 2. 마스터/이력 키별 검사
    total_issues = 0
    for key, id_f, nm_f, label in TARGETS:
        if keys_filter and key not in keys_filter:
            continue
        # 양쪽 키 모두 검사 (없으면 [])
        for actual_key in [key, f"ino_{key}"]:
            data = load(db, actual_key)
            if not data:
                continue
            _, issues = detect_conflicts(data, id_f, nm_f)
            problems = (
                issues["none_or_garbage"]
                + issues["empty_name"]
                + len(issues["dup_ids"])
                + len(issues["dup_names"])
            )
            if not problems:
                print(f"[OK]   {actual_key} ({label}): {len(data)}건, 충돌 없음")
                continue
            total_issues += problems
            print(f"[WARN] {actual_key} ({label}): {len(data)}건")
            print(f"    · 손상 객체: {issues['none_or_garbage']}건")
            print(f"    · 빈 이름: {issues['empty_name']}건")
            print(f"    · 중복 id: {len(issues['dup_ids'])}종")
            for k, c in issues["dup_ids"][:3]:
                print(f"      - {k}: {c}회")
            print(f"    · 중복 이름: {len(issues['dup_names'])}종")
            for k, c in issues["dup_names"][:3]:
                print(f"      - {k}: {c}회")

            # wo + --renumber-wo 일 땐 merge 가 중복을 먼저 삼키지 않도록 스킵 (재번호가 처리)
            if key == "wo" and renumber_wo_mode:
                print(f"    (--renumber-wo 모드: wo merge 건너뜀, 재번호 단계가 처리)")
                continue
            if apply_mode:
                merged = merge_duplicates(data, id_f, nm_f)
                save(db, actual_key, merged)
                print(f"    → 정리 후 {len(merged)}건 저장")

    # wo.wn 재번호화 (모든 wo / ino_wo / 월별 wo_YYYY-MM 키)
    if renumber_wo_mode:
        wo_keys = _wo_keys_in_store(db)
        print()
        if not wo_keys:
            print("[RENUMBER-WO] wo 키 없음")
        for wk in wo_keys:
            data = load(db, wk)
            if not data:
                continue
            new_data, changes = renumber_wo(data, dry_run=not apply_mode)
            if not changes:
                print(f"[RENUMBER-WO] {wk}: {len(data)}건 — 중복 wn 없음")
                continue
            print(f"[RENUMBER-WO] {wk}: {len(data)}건 → {len(changes)}건 재번호")
            for old_wn, new_wn, _id, dt in changes[:8]:
                print(f"    · {old_wn} → {new_wn}  (id={_id} dt={dt})")
            if len(changes) > 8:
                print(f"    · … 외 {len(changes) - 8}건")
            if apply_mode:
                save(db, wk, new_data)
                print(f"    → 재번호 결과 {wk} 저장")

    if apply_mode:
        db.commit()
        print("\n[APPLY] 변경 커밋 완료")
    else:
        suffix = ""
        if renumber_wo_mode:
            suffix = " (wn 재번호도 미반영)"
        print(f"\n[DRY-RUN] 실제 정리는 --apply 옵션 추가{suffix}")

    db.close()
    print(f"\n총 충돌 건수: {total_issues}")


if __name__ == "__main__":
    main()
