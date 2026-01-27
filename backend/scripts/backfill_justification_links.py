"""
Backfill AttendanceRecord.justification_id from Justification.attendance_record_id.

Historically this project used Justification.attendance_record_id (canonical link).
Some teacher queries and UI paths rely on AttendanceRecord.justification_id as well.
This script syncs the denormalized field for existing rows.
"""

import os
import sys

from sqlmodel import Session, select

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.database import engine  # noqa: E402
from src.models.attendance import AttendanceRecord  # noqa: E402
from src.models.justification import Justification  # noqa: E402


def main() -> None:
	updated = 0
	checked = 0

	with Session(engine) as session:
		justifications = session.exec(select(Justification)).all()
		for justification in justifications:
			checked += 1
			attendance = session.get(AttendanceRecord, justification.attendance_record_id)
			if not attendance:
				continue
			if attendance.justification_id == justification.id:
				continue
			attendance.justification_id = justification.id
			session.add(attendance)
			updated += 1

		session.commit()

	print(f"✅ Backfill complete. Checked={checked}, updated={updated}.")


if __name__ == "__main__":
	main()
