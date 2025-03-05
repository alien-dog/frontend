from werkzeug.security import generate_password_hash
from models import User
from db import get_db_session, init_db
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_demo_user():
    # Get database session
    db_session = get_db_session()
    
    # Check if user already exists
    existing_user = db_session.query(User).filter_by(username='demo').first()
    if existing_user:
        print("User 'demo' already exists!")
        return
    
    # Create new user
    hashed_password = generate_password_hash('123456')
    new_user = User(
        username='demo',
        email='demo@example.com',
        password_hash=hashed_password,
        is_admin=False
    )
    
    try:
        db_session.add(new_user)
        db_session.commit()
        print("User 'demo' created successfully!")
        print(f"Username: demo")
        print(f"Password: 123456")
        print(f"Email: demo@example.com")
    except Exception as e:
        db_session.rollback()
        print(f"Error creating user: {str(e)}")

if __name__ == "__main__":
    create_demo_user() 