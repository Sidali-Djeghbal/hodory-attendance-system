"""Check actual database schema"""
from src.core.database import engine
from sqlalchemy import text

def check_table_columns(table_name):
    with engine.connect() as conn:
        result = conn.execute(text(
            f"SELECT column_name FROM information_schema.columns "
            f"WHERE table_name = '{table_name}' AND table_schema = 'public'"
        ))
        columns = [r[0] for r in result]
        print(f"\n{table_name}: {columns}")
        return columns

if __name__ == "__main__":
    tables = ['module', 'level', 'users', 'students', 'teacher', 'schedule', 's_day', 
              'enrollments', 'sessions', 'attendance_records', 'justifications', 
              'notifications', 'reports', 'admins', 'teacher_modules']
    
    for table in tables:
        check_table_columns(table)
