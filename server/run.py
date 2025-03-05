#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from init_db import init_mysql_db
from app import app

# Load environment variables
load_dotenv()

if __name__ == '__main__':
    # Initialize MySQL database if it doesn't exist
    init_mysql_db()
    
    # Run the Flask application
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True) 