#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""Merge prompt JSON lists and deduplicate by `prompt`.

Usage:
  python3 scripts/merge_prompts.py public/prompts.json public/prompts1.json public/prompts2.json

Rules:
  - Inputs are JSON arrays of objects.
  - Deduplicate by exact `prompt` string.
  - Always ensure each item has `preview` and `link` keys (default "").
  - If a duplicate is found, keep the first occurrence but fill missing/blank fields
    from later duplicates (non-empty values only).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple


def _load_json_array(path: Path) -> List[Dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise SystemExit(f"File not found: {path}")
    except json.JSONDecodeError as e:
        raise SystemExit(f"Invalid JSON in {path}: {e}")

    if not isinstance(data, list):
        raise SystemExit(f"Expected a JSON array in {path}")

    out: List[Dict[str, Any]] = []
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise SystemExit(f"Expected object at index {i} in {path}")
        out.append(item)
    return out


def _is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    return False


def _ensure_preview_link(item: Dict[str, Any]) -> None:
    # Required by the caller: missing keys become empty strings.
    item.setdefault("preview", "")
    item.setdefault("link", "")


def _merge_fill_missing(dst: Dict[str, Any], src: Dict[str, Any]) -> None:
    """Fill dst's missing/blank values from src (non-blank only)."""
    for k, v in src.items():
        if k not in dst or _is_blank(dst.get(k)):
            if not _is_blank(v):
                dst[k] = v


def merge_and_dedup(
    inputs: List[List[Dict[str, Any]]],
) -> Tuple[List[Dict[str, Any]], int]:
    seen: Dict[str, Dict[str, Any]] = {}
    order: List[str] = []
    duplicates = 0

    for items in inputs:
        for item in items:
            _ensure_preview_link(item)
            prompt = item.get("prompt")
            if not isinstance(prompt, str):
                # Can't dedupe reliably; keep as-is.
                order.append(f"__no_prompt__:{len(order)}")
                seen[order[-1]] = item
                continue

            if prompt in seen:
                duplicates += 1
                _merge_fill_missing(seen[prompt], item)
                # Still ensure required keys exist after merge.
                _ensure_preview_link(seen[prompt])
            else:
                seen[prompt] = item
                order.append(prompt)

    merged: List[Dict[str, Any]] = [seen[k] for k in order]
    return merged, duplicates


def main(argv: List[str]) -> int:
    if len(argv) != 4:
        print(
            "Usage: python3 scripts/merge_prompts.py <in1.json> <in2.json> <out.json>",
            file=sys.stderr,
        )
        return 2

    in1 = Path(argv[1])
    in2 = Path(argv[2])
    out = Path(argv[3])

    items1 = _load_json_array(in1)
    items2 = _load_json_array(in2)
    merged, dupes = merge_and_dedup([items1, items2])

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        f"Merged {len(items1)} + {len(items2)} items -> {len(merged)} unique items "+
        f"({dupes} duplicates removed). Output: {out}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
