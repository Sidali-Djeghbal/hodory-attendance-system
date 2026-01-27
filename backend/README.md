
## Local PostgreSQL (offline)
1. Ensure Postgres is running.
2. Create a local DB + `.env.local`:
   ```bash
   cd backend
   ./scripts/setup_local_db.sh
   ```
3. Start backend with local DB:
   ```bash
   INIT_DB_ON_STARTUP=1 RELOAD=0 python runserver.py
   ```
   After first start (tables created), you can use:
   ```bash
   INIT_DB_ON_STARTUP=0 RELOAD=0 python runserver.py
   ```


## 🧪 Testing API
You tested the API using **FastAPI Docs** or **Postman**.

Interactive docs:
```
http://127.0.0.1:8000/docs
```

Alternative (ReDoc):
```
http://127.0.0.1:8000/redoc
```

# Admin API Documentation

Complete documentation for the Admin API endpoints with JSON request/response examples.

## Base URL
```
/admin
```

## Authentication
All endpoints require admin authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 Table of Contents
1. [Profile Endpoints](#profile-endpoints)
2. [Level Endpoints](#level-endpoints)
3. [Student Endpoints](#student-endpoints)
4. [Teacher Endpoints](#teacher-endpoints)
5. [Module Endpoints](#module-endpoints)
6. [Teacher-Module Assignment](#teacher-module-assignment)
7. [Schedule & SDay Endpoints](#schedule--sday-endpoints)
8. [Monitoring & Reports](#monitoring--reports)

---

## Profile Endpoints

### Get Admin Profile
Get the authenticated admin's profile information.

**Endpoint:** `GET /admin/profile`

**Response:**
```json
{
  "success": true,
  "data": {
    "admin_id": 1,
    "user_id": 5,
    "full_name": "John Admin",
    "email": "admin@example.com",
    "department": "Administration",
    "role": "admin",
    "is_active": true,
    "is_verified": true,
    "created_at": "2024-01-15T10:30:00",
    "updated_at": "2024-01-20T14:45:00"
  }
}
```

---

## Level Endpoints

### Get All Levels
Get all academic levels with their modules, schedules, and time slots.

**Endpoint:** `GET /admin/levels`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "First Year Computer Science",
      "year_level": 1,
      "created_at": "2024-01-10T08:00:00",
      "modules": [
        {
          "id": 1,
          "name": "Introduction to Programming",
          "code": "CS101",
          "room": "Lab A"
        },
        {
          "id": 2,
          "name": "Mathematics I",
          "code": "MATH101",
          "room": "Room 205"
        }
      ],
      "module_count": 2,
      "schedule": {
        "id": 1,
        "last_updated": "2024-01-20T09:00:00",
        "sdays": [
          {
            "id": 1,
            "day": "monday",
            "time": "08:00-10:00",
            "module_id": 1,
            "module_name": "Introduction to Programming",
            "module_code": "CS101"
          },
          {
            "id": 2,
            "day": "tuesday",
            "time": "10:00-12:00",
            "module_id": 2,
            "module_name": "Mathematics I",
            "module_code": "MATH101"
          }
        ],
        "sdays_count": 2
      }
    }
  ],
  "total": 1
}
```

---

## Student Endpoints

### Get All Students
Get all students with pagination.

**Endpoint:** `GET /admin/students?skip=0&limit=100`

**Query Parameters:**
- `skip` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum records to return (default: 100, max: 500)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 10,
      "full_name": "Alice Johnson",
      "email": "alice@example.com",
      "department": "Computer Science",
      "is_active": true,
      "level": {
        "id": 1,
        "name": "First Year Computer Science",
        "year_level": 1
      },
      "enrollments_count": 5,
      "created_at": "2024-01-12T09:00:00"
    }
  ],
  "total": 150,
  "skip": 0,
  "limit": 100
}
```

### Get Student Profile
Get detailed profile of a specific student.

**Endpoint:** `GET /admin/students/{student_id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": 1,
      "user_id": 10,
      "level_id": 1
    },
    "user": {
      "id": 10,
      "full_name": "Alice Johnson",
      "email": "alice@example.com",
      "department": "Computer Science",
      "is_active": true,
      "is_verified": true,
      "created_at": "2024-01-12T09:00:00"
    },
    "level": {
      "id": 1,
      "name": "First Year Computer Science",
      "year_level": 1,
      "modules": [
        {
          "id": 1,
          "name": "Introduction to Programming",
          "code": "CS101",
          "room": "Lab A"
        }
      ]
    },
    "enrollments": [
      {
        "id": 1,
        "module_id": 1,
        "module_name": "Introduction to Programming",
        "module_code": "CS101",
        "number_of_absences": 2,
        "number_of_absences_justified": 1,
        "is_excluded": false
      }
    ],
    "schedule": {
      "id": 1,
      "last_updated": "2024-01-20T09:00:00",
      "sdays": [
        {
          "id": 1,
          "day": "monday",
          "time": "08:00-10:00",
          "module_id": 1,
          "module_name": "Introduction to Programming"
        }
      ]
    }
  }
}
```

### Add Student
Create a new student account.

**Endpoint:** `POST /admin/students`

**Request Body:**
```json
{
  "full_name": "Bob Smith",
  "email": "bob@example.com",
  "password": "securePassword123",
  "department": "Computer Science",
  "level_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Student added successfully",
  "data": {
    "student_id": 2,
    "user_id": 15,
    "full_name": "Bob Smith",
    "email": "bob@example.com",
    "level": {
      "id": 1,
      "name": "First Year Computer Science"
    }
  }
}
```

### Add Multiple Students (Bulk)
Create multiple student accounts at once.

**Endpoint:** `POST /admin/students/bulk`

**Request Body:**
```json
{
  "students": [
    {
      "full_name": "Student One",
      "email": "student1@example.com",
      "password": "password123",
      "department": "Computer Science",
      "level_id": 1
    },
    {
      "full_name": "Student Two",
      "email": "student2@example.com",
      "password": "password456",
      "department": "Computer Science",
      "level_id": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk student creation completed",
  "successful": 2,
  "failed": 0,
  "total": 2,
  "created_students": [
    {
      "student_id": 3,
      "user_id": 16,
      "full_name": "Student One",
      "email": "student1@example.com"
    },
    {
      "student_id": 4,
      "user_id": 17,
      "full_name": "Student Two",
      "email": "student2@example.com"
    }
  ],
  "errors": []
}
```

### Update Student
Update an existing student's information.

**Endpoint:** `PUT /admin/students/{student_id}`

**Request Body (all fields optional):**
```json
{
  "full_name": "Alice Johnson Updated",
  "email": "alice.new@example.com",
  "department": "Software Engineering",
  "level_id": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Student updated successfully",
  "data": {
    "student_id": 1,
    "user_id": 10,
    "full_name": "Alice Johnson Updated",
    "email": "alice.new@example.com",
    "department": "Software Engineering",
    "level": {
      "id": 2,
      "name": "Second Year Computer Science"
    }
  }
}
```

### Delete Student
Delete a student and their user account.

**Endpoint:** `DELETE /admin/students/{student_id}`

**Response:**
```json
{
  "success": true,
  "message": "Student deleted successfully",
  "deleted_student_id": 1,
  "deleted_user_id": 10
}
```

---

## Teacher Endpoints

### Get All Teachers
Get all teachers with their assigned modules.

**Endpoint:** `GET /admin/teachers?skip=0&limit=100`

**Query Parameters:**
- `skip` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum records to return (default: 100, max: 500)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 20,
      "full_name": "Dr. Sarah Wilson",
      "email": "sarah@example.com",
      "department": "Computer Science",
      "is_active": true,
      "assigned_modules_count": 3,
      "assigned_modules": [
        "Introduction to Programming",
        "Data Structures",
        "Algorithms"
      ],
      "created_at": "2024-01-10T08:00:00"
    }
  ],
  "total": 25,
  "skip": 0,
  "limit": 100
}
```

### Get Teacher Profile
Get detailed profile of a specific teacher.

**Endpoint:** `GET /admin/teachers/{teacher_id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "teacher": {
      "id": 1,
      "user_id": 20
    },
    "user": {
      "id": 20,
      "full_name": "Dr. Sarah Wilson",
      "email": "sarah@example.com",
      "department": "Computer Science",
      "is_active": true,
      "is_verified": true,
      "created_at": "2024-01-10T08:00:00"
    },
    "assigned_modules": [
      {
        "teacher_module_id": 1,
        "module": {
          "id": 1,
          "name": "Introduction to Programming",
          "code": "CS101",
          "room": "Lab A"
        },
        "level": {
          "id": 1,
          "name": "First Year Computer Science",
          "year_level": 1
        },
        "enrolled_students": [
          {
            "student_id": 1,
            "user_id": 10,
            "full_name": "Alice Johnson",
            "email": "alice@example.com",
            "enrollment": {
              "id": 1,
              "number_of_absences": 2,
              "number_of_absences_justified": 1,
              "is_excluded": false
            }
          }
        ],
        "enrolled_count": 1
      }
    ],
    "total_modules": 1
  }
}
```

### Add Teacher
Create a new teacher account.

**Endpoint:** `POST /admin/teachers`

**Request Body:**
```json
{
  "full_name": "Dr. John Doe",
  "email": "john@example.com",
  "password": "teacherPass123",
  "department": "Computer Science"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Teacher added successfully",
  "data": {
    "teacher_id": 2,
    "user_id": 25,
    "full_name": "Dr. John Doe",
    "email": "john@example.com",
    "department": "Computer Science"
  }
}
```

### Update Teacher
Update an existing teacher's information.

**Endpoint:** `PUT /admin/teachers/{teacher_id}`

**Request Body (all fields optional):**
```json
{
  "full_name": "Dr. Sarah Wilson-Smith",
  "email": "sarah.new@example.com",
  "department": "Software Engineering"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Teacher updated successfully",
  "data": {
    "teacher_id": 1,
    "user_id": 20,
    "full_name": "Dr. Sarah Wilson-Smith",
    "email": "sarah.new@example.com",
    "department": "Software Engineering"
  }
}
```

### Delete Teacher
Delete a teacher and their user account.

**Endpoint:** `DELETE /admin/teachers/{teacher_id}`

**Response:**
```json
{
  "success": true,
  "message": "Teacher deleted successfully",
  "deleted_teacher_id": 1,
  "deleted_user_id": 20
}
```

---

## Module Endpoints

### Create Module
Create a new module for a level.

**Endpoint:** `POST /admin/modules`

**Request Body:**
```json
{
  "name": "Database Systems",
  "level_id": 2,
  "room": "Lab B"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Module created successfully",
  "data": {
    "id": 5,
    "name": "Database Systems",
    "code": "CS201",
    "room": "Lab B",
    "level": {
      "id": 2,
      "name": "Second Year Computer Science"
    }
  }
}
```

### Update Module
Update an existing module.

**Endpoint:** `PUT /admin/modules/{module_id}`

**Request Body (all fields optional):**
```json
{
  "name": "Advanced Database Systems",
  "room": "Lab C"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Module updated successfully",
  "data": {
    "id": 5,
    "name": "Advanced Database Systems",
    "code": "CS201",
    "room": "Lab C",
    "level": {
      "id": 2,
      "name": "Second Year Computer Science"
    }
  }
}
```

### Delete Module
Delete a module from the system.

**Endpoint:** `DELETE /admin/modules/{module_id}`

**Response:**
```json
{
  "success": true,
  "message": "Module deleted successfully",
  "deleted_module_id": 5
}
```

---

## Teacher-Module Assignment

### Get All Assignments
Get all teacher-module assignments.

**Endpoint:** `GET /admin/teacher-modules`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "teacher": {
        "id": 1,
        "user_id": 20,
        "full_name": "Dr. Sarah Wilson",
        "email": "sarah@example.com",
        "department": "Computer Science"
      },
      "module": {
        "id": 1,
        "name": "Introduction to Programming",
        "code": "CS101",
        "level": {
          "id": 1,
          "name": "First Year Computer Science",
          "year_level": 1
        }
      }
    }
  ],
  "total": 1
}
```

### Assign Teacher to Module
Assign a teacher to teach a specific module.

**Endpoint:** `POST /admin/teacher-modules`

**Request Body:**
```json
{
  "teacher_id": 1,
  "module_id": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Teacher assigned to module successfully",
  "data": {
    "id": 2,
    "teacher_id": 1,
    "module_id": 3
  }
}
```

### Bulk Assign Teachers to Modules
Assign multiple teachers to modules at once.

**Endpoint:** `POST /admin/teacher-modules/bulk`

**Request Body:**
```json
{
  "assignments": [
    {
      "teacher_id": 1,
      "module_id": 5
    },
    {
      "teacher_id": 2,
      "module_id": 6
    },
    {
      "teacher_id": 1,
      "module_id": 7
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk assignment completed",
  "successful": 3,
  "failed": 0,
  "total": 3,
  "created_assignments": [
    {
      "id": 3,
      "teacher_id": 1,
      "module_id": 5
    },
    {
      "id": 4,
      "teacher_id": 2,
      "module_id": 6
    },
    {
      "id": 5,
      "teacher_id": 1,
      "module_id": 7
    }
  ],
  "errors": []
}
```

---

## Schedule & SDay Endpoints

### Create Schedule
Create a schedule for a level.

**Endpoint:** `POST /admin/schedules`

**Request Body:**
```json
{
  "level_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule created successfully",
  "data": {
    "id": 1,
    "level_id": 1,
    "level_name": "First Year Computer Science",
    "last_updated": "2024-01-23T10:30:00"
  }
}
```

### Add SDay to Schedule
Add a time slot (SDay) to a level's schedule.

**Endpoint:** `POST /admin/sdays`

**Request Body:**
```json
{
  "level_id": 1,
  "day": "monday",
  "time": "08:00-10:00",
  "module_id": 1
}
```

**Valid day values:**
- `monday`
- `tuesday`
- `wednesday`
- `thursday`
- `friday`
- `saturday`
- `sunday`

**Response:**
```json
{
  "success": true,
  "message": "SDay added successfully",
  "data": {
    "id": 1,
    "day": "monday",
    "time": "08:00-10:00",
    "schedule_id": 1,
    "module_id": 1,
    "module_name": "Introduction to Programming"
  }
}
```

### Update SDay
Update an existing schedule day.

**Endpoint:** `PUT /admin/sdays/{sday_id}`

**Request Body (all fields optional):**
```json
{
  "day": "tuesday",
  "time": "10:00-12:00",
  "module_id": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "SDay updated successfully",
  "data": {
    "id": 1,
    "day": "tuesday",
    "time": "10:00-12:00",
    "schedule_id": 1,
    "module_id": 2,
    "module_name": "Mathematics I"
  }
}
```

### Delete SDay
Delete a schedule day from the schedule.

**Endpoint:** `DELETE /admin/sdays/{sday_id}`

**Response:**
```json
{
  "success": true,
  "message": "SDay deleted successfully",
  "deleted_sday_id": 1
}
```

---

## Monitoring & Reports

### Monitor Attendance
Get comprehensive system data for monitoring.

**Endpoint:** `GET /admin/monitor`

**Response:**
```json
{
  "success": true,
  "data": {
    "levels": [
      {
        "id": 1,
        "name": "First Year Computer Science",
        "year_level": 1,
        "students_count": 50,
        "modules": [
          {
            "id": 1,
            "name": "Introduction to Programming",
            "code": "CS101",
            "room": "Lab A",
            "enrolled_students": 50,
            "teacher": {
              "id": 1,
              "full_name": "Dr. Sarah Wilson",
              "email": "sarah@example.com"
            },
            "sessions_count": 15,
            "recent_sessions": [
              {
                "id": 1,
                "date": "2024-01-22",
                "start_time": "08:00:00",
                "end_time": "10:00:00",
                "attendances_marked": 48,
                "present_count": 45,
                "absent_count": 3
              }
            ]
          }
        ],
        "schedule": {
          "id": 1,
          "sdays_count": 5
        }
      }
    ],
    "total_students": 150,
    "total_teachers": 25,
    "total_modules": 30,
    "total_sessions": 200,
    "total_attendances": 5000,
    "overall_attendance_rate": "92.5%"
  }
}
```

### Generate Report
Generate attendance report for a specific period.

**Endpoint:** `POST /admin/reports`

**Request Body:**
```json
{
  "period_start": "2024-01-01T00:00:00",
  "period_end": "2024-01-31T23:59:59"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Report generated successfully",
  "data": {
    "report_id": 1,
    "period_start": "2024-01-01T00:00:00",
    "period_end": "2024-01-31T23:59:59",
    "generated_at": "2024-01-23T15:30:00",
    "generated_by": "John Admin",
    "files": {
      "pdf": "/uploads/reports/attendance_report_2024_01.pdf",
      "excel": "/uploads/reports/attendance_report_2024_01.xlsx"
    },
    "summary": {
      "total_sessions": 200,
      "total_attendances": 5000,
      "present_count": 4625,
      "absent_count": 375,
      "attendance_rate": "92.5%",
      "students_at_risk": 12
    }
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "detail": "Invalid request data: email already exists"
}
```

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "Admin access required"
}
```

### 404 Not Found
```json
{
  "detail": "Student with ID 999 not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error occurred"
}
```

---

## Common Request Patterns

### Pagination
Most list endpoints support pagination:
```
GET /admin/students?skip=0&limit=50
GET /admin/teachers?skip=50&limit=50
```

### Field Validation
- **Email**: Must be valid email format (5-100 characters)
- **Password**: Minimum 6 characters
- **Full Name**: 1-100 characters
- **Department**: 1-100 characters

### Date/Time Format
All dates use ISO 8601 format:
```
2024-01-23T15:30:00
```

---

## Notes

1. **Auto-enrollment**: When a student is added, they are automatically enrolled in all modules of their assigned level.

2. **Cascading Deletes**: Deleting a student, teacher, or module may affect related records. The system will prevent deletion if there are dependencies.

3. **Schedule Constraints**: Each level can have only one schedule. SDays must reference modules that belong to the same level.

4. **Authentication**: All endpoints require a valid JWT token. Tokens expire after a configured period.

5. **Rate Limiting**: API calls may be rate-limited to prevent abuse.

6. **File Generation**: Reports are generated asynchronously and saved to the server's file system.


# API Documentation for Teacher Endpoints

## Overview
This documentation covers the teacher-related endpoints for the attendance management system. All endpoints require authentication and return JSON responses.

---

## Base URL
```
http://127.0.0.1:8000/api/teacher
```

---

## Endpoints

### 1. Get Teacher Profile
Retrieves the authenticated teacher's profile information.

**Endpoint:** `GET /api/teacher/profile`

**Response:**
```json
{
    "success": true,
    "teacher_id": 1,
    "user_id": 3,
    "full_name": "Dr. Mohamed Larbi",
    "email": "m.larbi@university.dz",
    "department": "Computer Science",
    "role": "teacher",
    "is_active": true,
    "is_verified": true,
    "created_at": "2026-01-24T09:36:56.412930",
    "modules_count": 3,
    "sessions_count": 8
}
```

**Response Fields:**
- `success` (boolean): Indicates if the request was successful
- `teacher_id` (integer): Unique identifier for the teacher
- `user_id` (integer): Associated user account ID
- `full_name` (string): Teacher's full name
- `email` (string): Teacher's email address
- `department` (string): Academic department
- `role` (string): User role (always "teacher")
- `is_active` (boolean): Account active status
- `is_verified` (boolean): Email verification status
- `created_at` (string): ISO 8601 timestamp of account creation
- `modules_count` (integer): Number of modules taught
- `sessions_count` (integer): Total number of sessions created

---

### 2. Get Teacher's Modules (Summary)
Retrieves a simplified list of modules assigned to the teacher.

**Endpoint:** `GET /api/teacher/my-modules`

**Response:**
```json
{
    "success": true,
    "teacher_id": 1,
    "total_modules": 3,
    "modules": [
        {
            "teacher_module_id": 1,
            "module_id": 1,
            "module_name": "Introduction to Programming",
            "module_code": "CS101",
            "module_room": "Lab A1",
            "level_id": 1,
            "enrolled_students": 4
        },
        {
            "teacher_module_id": 6,
            "module_id": 6,
            "module_name": "Object-Oriented Programming",
            "module_code": "CS201",
            "module_room": "Lab A1",
            "level_id": 2,
            "enrolled_students": 6
        },
        {
            "teacher_module_id": 11,
            "module_id": 11,
            "module_name": "Software Engineering",
            "module_code": "CS301",
            "module_room": "Lab A1",
            "level_id": 3,
            "enrolled_students": 6
        }
    ]
}
```

**Response Fields:**
- `success` (boolean): Request success indicator
- `teacher_id` (integer): Teacher's unique identifier
- `total_modules` (integer): Total count of modules
- `modules` (array): List of module objects
  - `teacher_module_id` (integer): Unique assignment ID
  - `module_id` (integer): Module's unique identifier
  - `module_name` (string): Full name of the module
  - `module_code` (string): Module code (e.g., CS101)
  - `level_id` (integer): Academic level identifier
  - `enrolled_students` (integer): Number of students enrolled

---

### 3. Get Modules with Complete Details
Retrieves detailed information about all modules, including level details and enrolled students.

**Endpoint:** `GET /api/teacher/modules`

**Response:**
```json
{
    "success": true,
    "teacher_id": 1,
    "total_modules": 3,
    "modules": [
        {
            "teacher_module_id": 1,
            "module": {
                "module_id": 1,
                "name": "Introduction to Programming",
                "code": "CS101",
                "room": "Lab A1",
                "level_id": 1,
                "level": {
                    "id": 1,
                    "name": "Computer Science Year 1",
                    "year_level": "L1"
                }
            },
            "enrolled_students_count": 5,
            "enrolled_students": [
                {
                    "enrollment_id": 1,
                    "student_id": 1,
                    "student_name": "Ali Hadj",
                    "student_email": "ali.hadj0@student.university.dz",
                    "number_of_absences": 0,
                    "number_of_absences_justified": 0,
                    "is_excluded": false,
                    "student": {
                        "student_id": 1,
                        "user_id": 8,
                        "full_name": "Ali Hadj",
                        "email": "ali.hadj0@student.university.dz",
                        "department": "Computer Science",
                        "level_id": 1
                    }
                }
            ]
        }
    ]
}
```

**Response Fields:**
- `success` (boolean): Request success indicator
- `teacher_id` (integer): Teacher's unique identifier
- `total_modules` (integer): Total number of modules
- `modules` (array): Detailed module objects
  - `teacher_module_id` (integer): Assignment identifier
  - `module` (object): Module details
    - `module_id` (integer): Module identifier
    - `name` (string): Module name
    - `code` (string): Module code
    - `room` (string): Assigned classroom/lab
    - `level_id` (integer): Level identifier
    - `level` (object): Academic level details
      - `id` (integer): Level identifier
      - `name` (string): Level name
      - `year_level` (string): Year designation (L1, L2, L3)
  - `enrolled_students_count` (integer): Count of enrolled students
  - `enrolled_students` (array): Student enrollment details
    - `enrollment_id` (integer): Enrollment record ID
    - `student_id` (integer): Student identifier
    - `student_name` (string): Student's full name
    - `student_email` (string): Student's email
    - `number_of_absences` (integer): Total absences
    - `number_of_absences_justified` (integer): Justified absences
    - `is_excluded` (boolean): Exclusion status
    - `student` (object): Complete student details
      - `student_id` (integer): Student identifier
      - `user_id` (integer): Associated user ID
      - `full_name` (string): Student's full name
      - `email` (string): Student's email
      - `department` (string): Academic department
      - `level_id` (integer): Academic level

---

### 4. Create New Session
Creates a new attendance session for a specific module.

**Endpoint:** `POST /api/teacher/sessions`

**Request Body:**
```json
{
  "module_id": 1,
  "duration_minutes": 90,
  "room": "Lab A1"
}
```

**Request Fields:**
- `module_id` (integer, required): ID of the module for this session
- `duration_minutes` (integer, required): Duration of the session in minutes
- `room` (string, required): Room/location where session takes place

**Response:**
```json
{
  "success": true,
  "message": "Session created. 5 attendance records created.",
  "session_id": 1,
  "module_id": 1,
  "module_name": "Introduction to Programming",
  "teacher_id": 1,
  "share_code": "ABC123",
  "date_time": "2026-01-24T10:30:00Z",
  "duration_minutes": 90,
  "room": "Lab A1",
  "is_active": true,
  "students_enrolled": 5,
  "attendance_records": [
    {
      "attendance_id": 1,
      "student_id": 1,
      "student_name": "Ali Hadj",
      "status": "absent",
      "marked_at": "2026-01-24T10:30:00Z"
    }
  ]
}
```

**Response Fields:**
- `success` (boolean): Request success indicator
- `message` (string): Confirmation message with attendance record count
- `session_id` (integer): Unique identifier for the created session
- `module_id` (integer): Module identifier
- `module_name` (string): Name of the module
- `teacher_id` (integer): Teacher who created the session
- `share_code` (string): Unique code students use to mark attendance
- `date_time` (string): ISO 8601 timestamp when session was created
- `duration_minutes` (integer): Session duration
- `room` (string): Session location
- `is_active` (boolean): Session active status (true for new sessions)
- `students_enrolled` (integer): Number of students enrolled in the module
- `attendance_records` (array): Initial attendance records (all set to "absent")
  - `attendance_id` (integer): Attendance record identifier
  - `student_id` (integer): Student identifier
  - `student_name` (string): Student's full name
  - `status` (string): Initial status (always "absent" for new sessions)
  - `marked_at` (string): ISO 8601 timestamp of record creation

**Notes:**
- All enrolled students automatically get attendance records with "absent" status
- The session is created with `is_active: true` by default
- Excluded students are not included in attendance records
- The `share_code` is generated automatically and is unique

---

### 5. Get All Sessions
Retrieves all attendance sessions created by the teacher.

**Endpoint:** `GET /api/teacher/sessions`

**Response:**
```json
{
    "success": true,
    "teacher_id": 1,
    "total_sessions": 8,
    "active_sessions": 3,
    "sessions": [
        {
            "session_id": 15,
            "session_code": "SES-752A38B8",
            "date_time": "2026-01-08T09:38:10.968254",
            "duration_minutes": 90,
            "room": "Lab B1",
            "is_active": true,
            "module": {
                "module_id": 6,
                "name": "Object-Oriented Programming",
                "code": "CS201",
                "room": "Lab B1",
                "level_id": 2,
                "level": {
                    "id": 2,
                    "name": "Computer Science Year 2",
                    "year_level": "L2"
                }
            },
            "statistics": {
                "total": 6,
                "present": 4,
                "absent": 2,
                "excluded": 0,
                "attendance_rate": 66.67
            },
            "attendance_records": [
                {
                    "attendance_id": 73,
                    "status": "present",
                    "marked_at": "2026-01-08T09:38:10.968254",
                    "student": {
                        "student_id": 6,
                        "user_id": 13,
                        "full_name": "Bilal Benmoussa",
                        "email": "bilal.benmoussa5@student.university.dz",
                        "department": "Computer Science",
                        "level_id": 2
                    },
                    "enrollment": {
                        "enrollment_id": 26,
                        "student_id": 6,
                        "student_name": "Bilal Benmoussa",
                        "student_email": "bilal.benmoussa5@student.university.dz",
                        "number_of_absences": 0,
                        "number_of_absences_justified": 0,
                        "is_excluded": false
                    }
                }
            ]
        }
    ]
}
```

**Response Fields:**
- `success` (boolean): Request success indicator
- `teacher_id` (integer): Teacher identifier
- `total_sessions` (integer): Total number of sessions
- `active_sessions` (integer): Number of currently active sessions
- `sessions` (array): Session objects
  - `session_id` (integer): Unique session identifier
  - `session_code` (string): Shareable session code
  - `date_time` (string): ISO 8601 timestamp of session
  - `duration_minutes` (integer): Session duration
  - `room` (string): Location of session
  - `is_active` (boolean): Whether session is currently active
  - `module` (object): Associated module details
  - `statistics` (object): Attendance statistics
    - `total` (integer): Total enrolled students
    - `present` (integer): Students marked present
    - `absent` (integer): Students marked absent
    - `excluded` (integer): Excluded students
    - `attendance_rate` (float): Percentage attendance
  - `attendance_records` (array): Individual attendance records
    - `attendance_id` (integer): Record identifier
    - `status` (string): "present", "absent", or "excluded"
    - `marked_at` (string): ISO 8601 timestamp
    - `student` (object): Student details
    - `enrollment` (object): Enrollment information

---

### 6. Get Session by Code
Retrieves a specific session using its session code.

**Endpoint:** `GET /api/teacher/sessions/{session_code}`

**Path Parameters:**
- `session_code` (string): The unique session code (e.g., "SES-752A38B8")

**Response:**
```json
{
    "success": true,
    "session": {
        "session_id": 27,
        "session_code": "SES-30788A90",
        "date_time": "2025-12-25T09:38:10.968254",
        "duration_minutes": 90,
        "room": "Room 401",
        "is_active": false,
        "module": {
            "module_id": 11,
            "name": "Software Engineering",
            "code": "CS301",
            "room": "Room 401",
            "level_id": 3,
            "level": {
                "id": 3,
                "name": "Computer Science Year 3",
                "year_level": "L3"
            }
        },
        "statistics": {
            "total": 6,
            "present": 3,
            "absent": 3,
            "excluded": 0,
            "attendance_rate": 50.0
        },
        "attendance_records": []
    }
}
```

**Response Fields:**
Same structure as individual session objects in the sessions list.

---

### 7. Get Session Attendance Details
Retrieves attendance details for a specific session by session ID.

**Endpoint:** `GET /api/teacher/sessions/{session_id}/attendance`

**Path Parameters:**
- `session_id` (integer): The unique session identifier

**Response:**
```json
{
    "success": true,
    "session_id": 15,
    "share_code": "SES-752A38B8",
    "room": "Lab B1",
    "is_active": true,
    "date_time": "2026-01-08T09:38:10.968254",
    "statistics": {
        "total": 6,
        "present": 4,
        "absent": 2,
        "excluded": 0,
        "attendance_rate": 66.67
    },
    "students": [
        {
            "attendance_id": 73,
            "status": "present",
            "marked_at": "2026-01-08T09:38:10.968254",
            "student": {
                "student_id": 6,
                "user_id": 13,
                "full_name": "Bilal Benmoussa",
                "email": "bilal.benmoussa5@student.university.dz",
                "department": "Computer Science",
                "level_id": 2
            },
            "enrollment": {
                "enrollment_id": 26,
                "student_id": 6,
                "student_name": "Bilal Benmoussa",
                "student_email": "bilal.benmoussa5@student.university.dz",
                "number_of_absences": 0,
                "number_of_absences_justified": 0,
                "is_excluded": false,
                "student": {
                    "student_id": 6,
                    "user_id": 13,
                    "full_name": "Bilal Benmoussa",
                    "email": "bilal.benmoussa5@student.university.dz",
                    "department": "Computer Science",
                    "level_id": 2
                }
            }
        }
    ]
}
```

**Response Fields:**
- `success` (boolean): Request success indicator
- `session_id` (integer): Session identifier
- `share_code` (string): Shareable session code
- `room` (string): Session location
- `is_active` (boolean): Session active status
- `date_time` (string): ISO 8601 timestamp
- `statistics` (object): Attendance statistics
- `students` (array): Detailed attendance records for each student

---

## Status Codes

- `200 OK`: Successful request
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Authentication

All endpoints require authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Notes

1. All timestamps are in ISO 8601 format
2. All endpoints require teacher authentication
3. Session codes are unique identifiers that can be shared with students
4. Attendance rates are calculated as: (present / total) × 100
5. Students can have three statuses: "present", "absent", or "excluded"
6. Justified absences are tracked separately from total absences
7. The `is_excluded` flag indicates if a student has been excluded from the module due to excessive absences

---

## Error Response Format

All endpoints return errors in the following format:

```json
{
    "success": false,
    "error": "Error message description",
    "detail": "Additional error details (optional)"
}
```

---

## Rate Limiting

- Current implementation: No rate limiting
- Recommended for production: 100 requests per minute per user

---

## Changelog

**Version 1.0.0** - January 2026
- Initial release
- Basic teacher endpoints
- Session management
- Attendance tracking
