from sqlalchemy import Column, String, DateTime, Text, JSON, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

Base = declarative_base()

class ResearchSession(Base):
    __tablename__ = 'research_sessions'
    
    job_id = Column(String, primary_key=True)
    question = Column(Text, nullable=False)
    depth = Column(String, nullable=False)
    status = Column(String, nullable=False)
    final_report = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/research.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initialize database tables"""
    os.makedirs("data", exist_ok=True)
    Base.metadata.create_all(bind=engine)

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
