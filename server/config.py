import os
from dotenv import load_dotenv

load_dotenv()

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '300845750505-9oh2tmiep0esng3opj7me5sbu62t0g9b.apps.googleusercontent.com')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI = 'http://localhost:5173/callback.html'

# JWT Configuration
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-jwt-secret')

# Session Configuration
SESSION_SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key') 