#!/usr/bin/env python3
import os
import sys
import subprocess
from dotenv import load_dotenv
from init_db import init_mysql_db
from test_db_connection import test_mysql_connection

# Load environment variables
load_dotenv()

def start_server():
    """Start the Flask server with proper initialization and error handling."""
    try:
        # Step 1: Initialize the database if it doesn't exist
        print("Step 1: Initializing MySQL database...")
        init_mysql_db()
        
        # Step 2: Test the database connection
        print("\nStep 2: Testing MySQL connection...")
        test_mysql_connection()
        
        # Step 3: Start the Flask server
        print("\nStep 3: Starting Flask server...")
        port = int(os.getenv('PORT', 5000))
        flask_env = os.getenv('FLASK_ENV', 'development')
        
        if flask_env == 'production':
            # Use Gunicorn in production
            print("Running in production mode with Gunicorn...")
            cmd = ["gunicorn", "-w", "4", "-b", f"0.0.0.0:{port}", "app:app"]
        else:
            # Use Flask development server
            print(f"Running in development mode on port {port}...")
            cmd = [sys.executable, "-m", "flask", "run", "--host=0.0.0.0", f"--port={port}"]
            os.environ['FLASK_APP'] = 'app.py'
            os.environ['FLASK_ENV'] = 'development'
        
        # Execute the server command
        subprocess.run(cmd)
        
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_server() 