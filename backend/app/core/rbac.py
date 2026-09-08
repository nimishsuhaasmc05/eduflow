from typing import List
from fastapi import HTTPException, status, Depends
from app.api.deps import get_current_user
from app.models.user import User

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{user.role}' is not authorized to access this resource. Requires one of: {self.allowed_roles}"
            )
        return user

allow_student = RoleChecker(["student", "teacher", "admin"])
allow_teacher = RoleChecker(["teacher", "admin"])
allow_admin = RoleChecker(["admin"])
