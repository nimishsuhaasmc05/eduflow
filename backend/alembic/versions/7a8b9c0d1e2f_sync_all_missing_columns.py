"""Sync all missing columns for PostgreSQL schema

Revision ID: 7a8b9c0d1e2f
Revises: 5f5dabde2309
Create Date: 2026-10-22 22:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7a8b9c0d1e2f'
down_revision: Union[str, None] = '5f5dabde2309'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR;")
    
    # Courses table
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'published';")
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_objectives TEXT;")
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_hours FLOAT DEFAULT 5.0;")
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 4.8;")
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;")
    
    # Course Modules table
    op.execute("ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS description TEXT;")
    op.execute("ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS source_type VARCHAR DEFAULT 'url';")


def downgrade() -> None:
    pass
