"""
Create missing DB indexes without dropping data.

Run with:
  cd backend
  python scripts/ensure_indexes.py
"""

import os
import sys
from sqlmodel import SQLModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.database import engine  # noqa: E402


def main() -> None:
    created = 0
    for table in SQLModel.metadata.tables.values():
        for index in getattr(table, "indexes", set()):
            index.create(bind=engine, checkfirst=True)
            created += 1
    print(f"✅ Ensured indexes (checked {created}).")


if __name__ == "__main__":
    main()
