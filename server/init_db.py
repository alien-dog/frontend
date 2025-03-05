#!/usr/bin/env python3
import os
import pymysql
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def init_mysql_db():
    """
    Initialize the MySQL database if it doesn't exist.
    This script should be run before starting the application for the first time.
    """
    # MySQL connection details
    mysql_host = os.getenv('MYSQL_HOST', '8.130.113.102')
    mysql_user = os.getenv('MYSQL_USER', 'root')
    mysql_password = os.getenv('MYSQL_PASSWORD', 'Ir%8624#1')
    mysql_db = os.getenv('MYSQL_DB', 'todo_app')
    
    # Connect to MySQL server (without specifying a database)
    connection = pymysql.connect(
        host=mysql_host,
        user=mysql_user,
        password=mysql_password,
        charset='utf8mb4'
    )
    
    try:
        with connection.cursor() as cursor:
            # Check if database exists
            cursor.execute(f"SHOW DATABASES LIKE '{mysql_db}'")
            result = cursor.fetchone()
            
            if not result:
                print(f"Creating database '{mysql_db}'...")
                cursor.execute(f"CREATE DATABASE {mysql_db} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
                print(f"Database '{mysql_db}' created successfully!")
            else:
                print(f"Database '{mysql_db}' already exists.")
                
        print("Database initialization completed.")
    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    init_mysql_db() 