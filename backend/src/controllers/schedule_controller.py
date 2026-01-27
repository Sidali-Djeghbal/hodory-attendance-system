from typing import List, Optional, Dict, Any
from sqlmodel import Session, select, and_
from fastapi import HTTPException, status
from datetime import datetime, time

from ..models.schedule import Schedule
from ..models.sday import SDay
from ..models.level import Level
from ..models.module import Module
from ..models.teacher import Teacher
from ..models.teacher_modules import TeacherModules


class ScheduleController:
    """
    Schedule Controller - Handles schedule-related operations
    
    Methods:
        - get_schedule_by_level(): Get schedule for a level
        - add_day_to_schedule(): Add a day to a schedule
        - get_weekly_schedule(): Get full weekly schedule
    """
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_schedule_by_id(self, schedule_id: int) -> Schedule:
        """Get schedule by ID"""
        schedule = self.session.get(Schedule, schedule_id)
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Schedule with ID {schedule_id} not found"
            )
        return schedule
    
    def get_schedule_by_level(self, level_id: int) -> Schedule:
        """
        Get schedule for a level.
        
        Args:
            level_id: ID of the level
            
        Returns:
            Schedule: The schedule for the level
        """
        # Verify level exists
        level = self.session.get(Level, level_id)
        if not level:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Level with ID {level_id} not found"
            )
        
        schedule = self.session.exec(
            select(Schedule).where(Schedule.level_id == level_id)
        ).first()
        
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No schedule found for level {level.name}"
            )
        
        return schedule
    
    def create_schedule(
        self, 
        level_id: int,
        academic_year: Optional[str] = None
    ) -> Schedule:
        """
        Create a new schedule for a level.
        
        Args:
            level_id: ID of the level
            academic_year: Academic year (e.g., "2024-2025")
            
        Returns:
            Schedule: Created schedule
        """
        # Verify level exists
        level = self.session.get(Level, level_id)
        if not level:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Level with ID {level_id} not found"
            )
        
        # Check if schedule already exists
        existing = self.session.exec(
            select(Schedule).where(Schedule.level_id == level_id)
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Schedule already exists for this level"
            )
        
        # Create schedule
        schedule = Schedule(
            level_id=level_id,
            academic_year=academic_year or f"{datetime.now().year}-{datetime.now().year + 1}"
        )
        
        self.session.add(schedule)
        self.session.commit()
        self.session.refresh(schedule)
        
        return schedule
    
    def add_day_to_schedule(
        self,
        schedule_id: int,
        day_of_week: int,  # 0=Monday, 6=Sunday
        teacher_module_id: int,
        start_time: time,
        end_time: time,
        room: Optional[str] = None
    ) -> SDay:
        """
        Add a day/time slot to a schedule.
        
        Args:
            schedule_id: ID of the schedule
            day_of_week: Day of the week (0-6)
            teacher_module_id: ID of the teacher-module assignment
            start_time: Start time of the class
            end_time: End time of the class
            room: Optional room/location
            
        Returns:
            SDay: Created schedule day
        """
        schedule = self.get_schedule_by_id(schedule_id)
        
        # Verify teacher_module exists
        teacher_module = self.session.get(TeacherModules, teacher_module_id)
        if not teacher_module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher-Module assignment with ID {teacher_module_id} not found"
            )
        
        # Check for time conflicts
        existing_slots = self.session.exec(
            select(SDay).where(
                SDay.schedule_id == schedule_id,
                SDay.day_of_week == day_of_week
            )
        ).all()
        
        for slot in existing_slots:
            if self._times_overlap(start_time, end_time, slot.start_time, slot.end_time):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Time slot conflicts with existing entry on this day"
                )
        
        # Create SDay
        sday = SDay(
            schedule_id=schedule_id,
            day_of_week=day_of_week,
            teacher_module_id=teacher_module_id,
            start_time=start_time,
            end_time=end_time,
            room=room
        )
        
        self.session.add(sday)
        self.session.commit()
        self.session.refresh(sday)
        
        return sday
    
    def _times_overlap(
        self, 
        start1: time, 
        end1: time, 
        start2: time, 
        end2: time
    ) -> bool:
        """Check if two time ranges overlap"""
        return start1 < end2 and start2 < end1
    
    def get_weekly_schedule(
        self, 
        schedule_id: int
    ) -> Dict[str, Any]:
        """
        Get full weekly schedule organized by day.
        
        Args:
            schedule_id: ID of the schedule
            
        Returns:
            dict: Weekly schedule organized by day
        """
        schedule = self.get_schedule_by_id(schedule_id)
        
        days = self.session.exec(
            select(SDay).where(SDay.schedule_id == schedule_id)
        ).all()
        
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        weekly = {day: [] for day in day_names}
        
        for day in days:
            teacher_module = self.session.get(TeacherModules, day.teacher_module_id)
            module = self.session.get(Module, teacher_module.module_id) if teacher_module else None
            teacher = self.session.get(Teacher, teacher_module.teacher_id) if teacher_module else None
            
            day_name = day_names[day.day_of_week] if 0 <= day.day_of_week < 7 else "Unknown"
            weekly[day_name].append({
                "id": day.id,
                "module_name": module.name if module else "Unknown",
                "teacher_name": f"{teacher.user.first_name} {teacher.user.last_name}" if teacher and teacher.user else "Unknown",
                "start_time": str(day.start_time),
                "end_time": str(day.end_time),
                "room": day.room
            })
        
        # Sort each day's entries by start time
        for day_name in weekly:
            weekly[day_name].sort(key=lambda x: x['start_time'])
        
        return {
            "schedule_id": schedule_id,
            "level_id": schedule.level_id,
            "academic_year": schedule.academic_year,
            "weekly_schedule": weekly
        }
    
    def remove_day_from_schedule(self, sday_id: int) -> Dict[str, Any]:
        """
        Remove a day/time slot from schedule.
        
        Args:
            sday_id: ID of the SDay entry
            
        Returns:
            dict: Success message
        """
        sday = self.session.get(SDay, sday_id)
        if not sday:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Schedule entry with ID {sday_id} not found"
            )
        
        self.session.delete(sday)
        self.session.commit()
        
        return {"message": "Schedule entry removed successfully"}
    
    def update_schedule_entry(
        self,
        sday_id: int,
        start_time: Optional[time] = None,
        end_time: Optional[time] = None,
        room: Optional[str] = None,
        teacher_module_id: Optional[int] = None
    ) -> SDay:
        """
        Update a schedule entry.
        
        Args:
            sday_id: ID of the SDay entry
            start_time: Optional new start time
            end_time: Optional new end time
            room: Optional new room
            teacher_module_id: Optional new teacher-module assignment
            
        Returns:
            SDay: Updated schedule entry
        """
        sday = self.session.get(SDay, sday_id)
        if not sday:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Schedule entry with ID {sday_id} not found"
            )
        
        if start_time:
            sday.start_time = start_time
        if end_time:
            sday.end_time = end_time
        if room:
            sday.room = room
        if teacher_module_id:
            teacher_module = self.session.get(TeacherModules, teacher_module_id)
            if not teacher_module:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Teacher-Module assignment with ID {teacher_module_id} not found"
                )
            sday.teacher_module_id = teacher_module_id
        
        self.session.add(sday)
        self.session.commit()
        self.session.refresh(sday)
        
        return sday
    
    def get_teacher_schedule(self, teacher_id: int) -> Dict[str, Any]:
        """
        Get schedule for a specific teacher.
        
        Args:
            teacher_id: ID of the teacher
            
        Returns:
            dict: Teacher's weekly schedule
        """
        teacher = self.session.get(Teacher, teacher_id)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {teacher_id} not found"
            )
        
        # Get teacher's module assignments
        teacher_modules = self.session.exec(
            select(TeacherModules).where(TeacherModules.teacher_id == teacher_id)
        ).all()
        
        teacher_module_ids = [tm.id for tm in teacher_modules]
        
        # Get schedule days for these assignments
        days = self.session.exec(
            select(SDay).where(SDay.teacher_module_id.in_(teacher_module_ids))
        ).all()
        
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        weekly = {day: [] for day in day_names}
        
        for day in days:
            teacher_module = self.session.get(TeacherModules, day.teacher_module_id)
            module = self.session.get(Module, teacher_module.module_id) if teacher_module else None
            schedule = self.session.get(Schedule, day.schedule_id)
            level = self.session.get(Level, schedule.level_id) if schedule else None
            
            day_name = day_names[day.day_of_week] if 0 <= day.day_of_week < 7 else "Unknown"
            weekly[day_name].append({
                "id": day.id,
                "module_name": module.name if module else "Unknown",
                "level_name": level.name if level else "Unknown",
                "start_time": str(day.start_time),
                "end_time": str(day.end_time),
                "room": day.room
            })
        
        for day_name in weekly:
            weekly[day_name].sort(key=lambda x: x['start_time'])
        
        return {
            "teacher_id": teacher_id,
            "teacher_name": f"{teacher.user.first_name} {teacher.user.last_name}" if teacher.user else "Unknown",
            "weekly_schedule": weekly
        }
