import bcrypt
from flask import Blueprint, request, jsonify, session, redirect
from db import get_db_session
from models import User, Token
import requests
import jwt
from datetime import datetime, timedelta
from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, JWT_SECRET_KEY
import json
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import uuid

auth_bp = Blueprint('auth', __name__)

def hash_password(password):
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt)

def check_password(password, hashed):
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed)

def create_tokens(user_id):
    """Create access and refresh tokens for a user."""
    # Generate unique token IDs
    access_token_id = str(uuid.uuid4())
    refresh_token_id = str(uuid.uuid4())
    
    # Create token records in database
    db_session = get_db_session()
    
    # Invalidate any existing tokens for this user
    db_session.query(Token).filter_by(user_id=user_id, is_valid=True).update({'is_valid': False})
    
    # Create new access token record
    access_token_record = Token(
        id=access_token_id,
        user_id=user_id,
        type='access',
        expires_at=datetime.utcnow() + timedelta(hours=1),
        is_valid=True
    )
    
    # Create new refresh token record
    refresh_token_record = Token(
        id=refresh_token_id,
        user_id=user_id,
        type='refresh',
        expires_at=datetime.utcnow() + timedelta(days=7),
        is_valid=True
    )
    
    db_session.add(access_token_record)
    db_session.add(refresh_token_record)
    db_session.commit()
    
    # Generate JWT tokens with the UUIDs
    access_token = jwt.encode({
        'token_id': access_token_id,
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=1),
        'type': 'access'
    }, JWT_SECRET_KEY, algorithm='HS256')
    
    refresh_token = jwt.encode({
        'token_id': refresh_token_id,
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'type': 'refresh'
    }, JWT_SECRET_KEY, algorithm='HS256')
    
    return access_token, refresh_token

def verify_token(token):
    """Verify a token and return the user_id if valid."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return {'error': 'Token has expired', 'code': 'token_expired'}
    except jwt.InvalidTokenError:
        return {'error': 'Invalid token', 'code': 'token_invalid'}

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'No token provided'}), 401
            
        try:
            # Verify the JWT token
            data = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            
            # Check if token exists and is valid in database
            db_session = get_db_session()
            token_record = db_session.query(Token).filter_by(
                id=data['token_id'],
                user_id=data['user_id'],
                type='access',
                is_valid=True
            ).first()
            
            if not token_record:
                return jsonify({'error': 'Invalid token', 'code': 'token_invalid'}), 401
                
            # Check if token has expired
            if token_record.expires_at < datetime.utcnow():
                # Invalidate the token
                token_record.is_valid = False
                db_session.commit()
                return jsonify({'error': 'Token expired', 'code': 'token_expired'}), 401
            
            # Get user from database
            current_user = db_session.query(User).get(data['user_id'])
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
                
            # Add user to request context
            request.current_user = current_user
            return f(*args, **kwargs)
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired', 'code': 'token_expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token', 'code': 'token_invalid'}), 401
            
    return decorated

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
        
    hashed_password = generate_password_hash(data['password'])
    new_user = User(email=data['email'], password=hashed_password)
    
    db.session.add(new_user)
    db.session.commit()
    
    access_token, refresh_token = create_tokens(new_user.id)
    
    return jsonify({
        'user': new_user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token,
        'expires_in': 3600  # 1 hour in seconds
    })

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
        
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401
        
    access_token, refresh_token = create_tokens(user.id)
    
    return jsonify({
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token,
        'expires_in': 3600  # 1 hour in seconds
    })

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    """Logout user by invalidating their tokens."""
    try:
        # Get the current token from the Authorization header
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(' ')[1]
        data = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        
        # Invalidate all tokens for this user
        db_session = get_db_session()
        Token.query.filter_by(user_id=data['user_id'], is_valid=True).update({'is_valid': False})
        db_session.commit()
        
        return jsonify({'message': 'Successfully logged out'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/user', methods=['GET'])
@token_required
def get_current_user():
    """Get current user info using token authentication."""
    # Generate new access and refresh tokens
    access_token, refresh_token = create_tokens(request.current_user.id)
    
    return jsonify({
        'user': request.current_user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token,
        'expires_in': 3600  # 1 hour in seconds
    })

@auth_bp.route('/auth/google/url', methods=['GET'])
def get_google_auth_url():
    """Get the Google OAuth URL"""
    auth_url = f"https://accounts.google.com/o/oauth2/auth?client_id={GOOGLE_CLIENT_ID}&redirect_uri={GOOGLE_REDIRECT_URI}&response_type=code&scope=email+profile&access_type=offline&prompt=consent"
    return jsonify({'url': auth_url})

@auth_bp.route('/auth/google', methods=['POST', 'OPTIONS'])
def google_auth():
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        return response

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        access_token = data.get('access_token')
        if not access_token:
            return jsonify({'error': 'Access token is required'}), 400
            
        # Get user info from Google
        google_user_info_url = 'https://www.googleapis.com/oauth2/v1/userinfo'
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json'
        }
        response = requests.get(google_user_info_url, headers=headers)
        
        if not response.ok:
            error_data = response.json()
            print('Google API error:', error_data)
            return jsonify({'error': 'Failed to fetch user info from Google', 'details': error_data}), 400
            
        google_user = response.json()
        
        if not google_user.get('email'):
            return jsonify({'error': 'Email not provided by Google'}), 400
        
        db_session = get_db_session()
        
        # Check if user exists
        user = db_session.query(User).filter_by(email=google_user['email']).first()
        
        if not user:
            # Create new user
            username = google_user['email'].split('@')[0]
            base_username = username
            counter = 1
            while db_session.query(User).filter_by(username=username).first():
                username = f"{base_username}{counter}"
                counter += 1
                
            user = User(
                username=username,
                email=google_user['email'],
                name=google_user.get('name'),
                picture=google_user.get('picture'),
                credits=3,
                password_hash=None
            )
            db_session.add(user)
            db_session.commit()
        else:
            # Update existing user's name and picture if they've changed
            if user.name != google_user.get('name') or user.picture != google_user.get('picture'):
                user.name = google_user.get('name')
                user.picture = google_user.get('picture')
                db_session.commit()
        
        # Generate access and refresh tokens
        access_token, refresh_token = create_tokens(user.id)
        
        response = jsonify({
            'message': 'Google authentication successful',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_in': 3600  # 1 hour in seconds
        })
        
        # Ensure CORS headers are set
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        return response, 200
        
    except Exception as e:
        print('Error in Google authentication:', str(e))
        error_response = jsonify({'error': str(e)})
        error_response.headers.add('Access-Control-Allow-Credentials', 'true')
        error_response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        return error_response, 500

@auth_bp.route('/refresh-token', methods=['POST'])
def refresh_token():
    """Refresh access token using refresh token."""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'No refresh token provided'}), 401
    
    refresh_token = auth_header.split(' ')[1]
    
    try:
        # Verify the refresh token
        data = jwt.decode(refresh_token, JWT_SECRET_KEY, algorithms=['HS256'])
        
        if data.get('type') != 'refresh':
            return jsonify({'error': 'Invalid token type'}), 401
            
        # Check if refresh token is valid in database
        db_session = get_db_session()
        token_record = Token.query.filter_by(
            id=data['token_id'],
            user_id=data['user_id'],
            type='refresh',
            is_valid=True
        ).first()
        
        if not token_record:
            return jsonify({'error': 'Invalid refresh token'}), 401
            
        # Check if refresh token has expired
        if token_record.expires_at < datetime.utcnow():
            # Invalidate the token
            token_record.is_valid = False
            db_session.commit()
            return jsonify({'error': 'Refresh token expired', 'code': 'token_expired'}), 401
            
        # Create new access token
        access_token_id = str(uuid.uuid4())
        access_token_record = Token(
            id=access_token_id,
            user_id=data['user_id'],
            type='access',
            expires_at=datetime.utcnow() + timedelta(hours=1),
            is_valid=True
        )
        
        db_session.add(access_token_record)
        db_session.commit()
        
        access_token = jwt.encode({
            'token_id': access_token_id,
            'user_id': data['user_id'],
            'exp': datetime.utcnow() + timedelta(hours=1),
            'type': 'access'
        }, JWT_SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'access_token': access_token,
            'expires_in': 3600  # 1 hour in seconds
        })
        
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Refresh token expired', 'code': 'token_expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid refresh token', 'code': 'token_invalid'}), 401 