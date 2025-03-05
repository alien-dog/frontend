#!/usr/bin/env python3
import os
import pymysql
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_mysql_connection():
    """Test the connection to the MySQL database."""
    # MySQL connection details
    mysql_host = os.getenv('MYSQL_HOST', '8.130.113.102')
    mysql_user = os.getenv('MYSQL_USER', 'root')
    mysql_password = os.getenv('MYSQL_PASSWORD', 'Ir%8624#1')
    mysql_db = os.getenv('MYSQL_DB', 'todo_app')
    
    print(f"Attempting to connect to MySQL database at {mysql_host}...")
    
    try:
        # Connect to MySQL server with database
        connection = pymysql.connect(
            host=mysql_host,
            user=mysql_user,
            password=mysql_password,
            database=mysql_db,
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            # Get MySQL version
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"Connected successfully to MySQL server. Version: {version[0]}")
            
            # Get table list
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            
            if tables:
                print("Existing tables:")
                for table in tables:
                    print(f"- {table[0]}")
            else:
                print("No tables found in the database.")
                
        print("Connection test completed successfully!")
    except Exception as e:
        print(f"Error connecting to MySQL database: {e}")
    finally:
        if 'connection' in locals() and connection:
            connection.close()

if __name__ == "__main__":
    test_mysql_connection() 