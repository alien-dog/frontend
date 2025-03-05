import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker
import pymysql

# Ensure PyMySQL is used as the MySQL driver
pymysql.install_as_MySQLdb()

# Create database engine
DATABASE_URL = os.getenv('DATABASE_URL', 'mysql://admin1:123456@8.130.113.102/todo_app')
engine = create_engine(DATABASE_URL)

# Create session factory
session_factory = sessionmaker(bind=engine)
Session = scoped_session(session_factory)

# Create declarative base
Base = declarative_base()

def init_db(app):
    """Initialize the database connection."""
    try:
        # Import models to ensure they are registered with Base
        from models import User, Transaction, Todo
        
        # Create tables if they don't exist
        Base.metadata.create_all(bind=engine)
        
    except Exception as e:
        app.logger.error(f"Error initializing database: {e}")
    
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        if Session:
            Session.remove()

def get_db_session():
    """Get the current database session."""
    return Session() 