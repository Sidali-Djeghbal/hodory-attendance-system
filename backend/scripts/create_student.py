#!/usr/bin/env python3
"""
Create a student user in the local DB for quick mobile app testing.

Usage:
  cd backend
  python scripts/create_student.py --email amine.hadj3@student.university.dz --password student123 --full-name "Amine Hadj" --department "Computer Science"

By default, the student is assigned to the first Level (lowest id) and enrolled
into all modules of that level (so attendance marking works immediately).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bcrypt
from sqlmodel import Session as SQLModelSession, select

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from src.core.database import engine, init_db
from src.models.level import Level
from src.models.module import Module
from src.models.user import User
from src.models.student import Student
from src.models.enrollement import Enrollment


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--email", required=True)
    p.add_argument("--password", default="student123")
    p.add_argument("--full-name", required=True)
    p.add_argument("--department", default="Computer Science")
    p.add_argument("--level-id", type=int, default=None, help="Defaults to the first level by id.")
    p.add_argument(
        "--no-enroll",
        action="store_true",
        help="Do not auto-enroll into modules of the selected level.",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()

    # Ensure tables exist (safe if already created).
    init_db()

    with SQLModelSession(engine) as session:
        existing = session.exec(select(User).where(User.email == args.email)).first()
        if existing:
            print(f"✅ User already exists: {existing.email} (role={existing.role})")
            return 0

        if args.level_id is None:
            level = session.exec(select(Level).order_by(Level.id.asc())).first()
        else:
            level = session.get(Level, args.level_id)

        if not level:
            print("❌ No Level found. Create/seed levels first.")
            return 1

        user = User(
            full_name=args.full_name,
            email=args.email,
            department=args.department,
            role="student",
            hashed_password=hash_password(args.password),
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        student = Student(user_id=user.id, level_id=level.id)
        session.add(student)
        session.commit()
        session.refresh(student)

        enrolled = 0
        if not args.no_enroll:
            modules = session.exec(select(Module).where(Module.level_id == level.id)).all()
            for module in modules:
                existing_enrollment = session.exec(
                    select(Enrollment).where(
                        Enrollment.student_id == student.id,
                        Enrollment.module_id == module.id,
                    )
                ).first()
                if existing_enrollment:
                    continue
                enrollment = Enrollment(
                    student_id=student.id,
                    module_id=module.id,
                    student_name=user.full_name,
                    student_email=user.email,
                )
                session.add(enrollment)
                enrolled += 1
            session.commit()

        print("✅ Created student account")
        print(f"   Email: {user.email}")
        print(f"   Password: {args.password}")
        print(f"   Student ID: {student.id}")
        print(f"   Level: {level.id} - {level.name}")
        print(f"   Enrollments added: {enrolled}")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
