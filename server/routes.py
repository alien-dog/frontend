from flask import jsonify, request, Blueprint
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
from functools import wraps
from db import get_db_session
from models import User, Todo, Transaction
import stripe

# Create blueprints for different route groups
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
todo_bp = Blueprint('todo', __name__, url_prefix='/api/todos')
routes_bp = Blueprint('routes', __name__)

# JWT token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check if token is in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        
        try:
            # Decode token
            data = jwt.decode(token, os.getenv('SECRET_KEY', 'dev-secret-key'), algorithms=['HS256'])
            db_session = get_db_session()
            current_user = db_session.query(User).filter_by(id=data['user_id']).first()
            
            if not current_user:
                return jsonify({'error': 'User not found!'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# Stripe setup
stripe.api_key = 'your-stripe-secret-key'  # Use environment variable in production

# Auth routes
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields!'}), 400
    
    db_session = get_db_session()
    
    # Check if user already exists
    if db_session.query(User).filter_by(email=data['email']).first():
        return jsonify({'error': 'User with this email already exists!'}), 409
    
    if db_session.query(User).filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken!'}), 409
    
    # Create new user
    hashed_password = generate_password_hash(data['password'])
    new_user = User(
        username=data['username'],
        email=data['email'],
        password_hash=hashed_password,
        is_admin=data.get('is_admin', False)
    )
    
    db_session.add(new_user)
    db_session.commit()
    
    # Generate JWT token
    token = jwt.encode({
        'user_id': new_user.id,
        'email': new_user.email,
        'username': new_user.username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, os.getenv('SECRET_KEY', 'dev-secret-key'), algorithm='HS256')
    
    # Return user data and token
    return jsonify({
        'message': 'User registered successfully!',
        'token': token,
        'user': new_user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password!'}), 400
    
    db_session = get_db_session()
    user = db_session.query(User).filter_by(username=data['username']).first()
    
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'error': 'Invalid username or password!'}), 401
    
    # Generate JWT token
    token = jwt.encode({
        'user_id': user.id,
        'email': user.email,
        'username': user.username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, os.getenv('SECRET_KEY', 'dev-secret-key'), algorithm='HS256')
    
    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    return jsonify({'user': current_user.to_dict()}), 200

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    try:
        data = request.get_json()
        
        if not data:
            print("Error: No JSON data received")
            return jsonify({'error': 'No JSON data received'}), 400
            
        if not data.get('token'):
            print("Error: Missing token in request")
            return jsonify({'error': 'Missing token in request'}), 400
            
        if not data.get('userInfo'):
            print("Error: Missing userInfo in request")
            return jsonify({'error': 'Missing userInfo in request'}), 400
        
        # Extract user info from the request
        token = data.get('token')
        user_info = data.get('userInfo')
        
        # Log the received data (for debugging)
        print(f"Received Google auth data: {user_info}")
        
        # Check if email is present in user_info
        if not user_info.get('email'):
            print("Error: Email not provided in userInfo")
            return jsonify({'error': 'Email not provided in userInfo'}), 400
        
        # Check if user exists in database by email
        db_session = get_db_session()
        user = db_session.query(User).filter_by(email=user_info.get('email')).first()
        
        if not user:
            # Create new user if not exists
            # Generate a random secure password for Google users
            import secrets
            import string
            random_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
            hashed_password = generate_password_hash(random_password)
            
            # Extract username from email or use name
            email = user_info.get('email', '')
            username = user_info.get('name', email.split('@')[0])
            
            # Make sure username is unique
            base_username = username
            counter = 1
            while db_session.query(User).filter_by(username=username).first():
                username = f"{base_username}{counter}"
                counter += 1
            
            new_user = User(
                username=username,
                email=email,
                password_hash=hashed_password,
                is_admin=False
            )
            
            try:
                db_session.add(new_user)
                db_session.commit()
                user = new_user
                print(f"Created new user from Google auth: {username}, {email}")
            except Exception as e:
                db_session.rollback()
                print(f"Error creating user: {str(e)}")
                return jsonify({'error': f'Failed to create user account: {str(e)}'}), 500
        
        # Generate JWT token
        token = jwt.encode({
            'user_id': user.id,
            'email': user.email,
            'username': user.username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, os.getenv('SECRET_KEY', 'dev-secret-key'), algorithm='HS256')
        
        # Return user data and token
        user_data = user.to_dict()
        # Ensure email is included in the response
        if 'email' not in user_data:
            user_data['email'] = user.email
            
        print(f"Authentication successful for user: {user.username}, {user.email}")
        return jsonify({
            'token': token,
            'user': user_data
        }), 200
    except Exception as e:
        print(f"Unexpected error in Google auth: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# Todo routes
@todo_bp.route('', methods=['GET'])
@token_required
def get_todos(current_user):
    db_session = get_db_session()
    todos = db_session.query(Todo).filter_by(user_id=current_user.id).all()
    return jsonify({'todos': [todo.to_dict() for todo in todos]}), 200

@todo_bp.route('', methods=['POST'])
@token_required
def create_todo(current_user):
    data = request.get_json()
    
    if not data or not data.get('title'):
        return jsonify({'error': 'Title is required!'}), 400
    
    db_session = get_db_session()
    new_todo = Todo(
        title=data['title'],
        description=data.get('description', ''),
        user_id=current_user.id
    )
    
    db_session.add(new_todo)
    db_session.commit()
    
    return jsonify({'todo': new_todo.to_dict()}), 201

@todo_bp.route('/<int:todo_id>', methods=['GET'])
@token_required
def get_todo(current_user, todo_id):
    db_session = get_db_session()
    todo = db_session.query(Todo).filter_by(id=todo_id, user_id=current_user.id).first()
    
    if not todo:
        return jsonify({'error': 'Todo not found!'}), 404
    
    return jsonify({'todo': todo.to_dict()}), 200

@todo_bp.route('/<int:todo_id>', methods=['PUT'])
@token_required
def update_todo(current_user, todo_id):
    data = request.get_json()
    db_session = get_db_session()
    todo = db_session.query(Todo).filter_by(id=todo_id, user_id=current_user.id).first()
    
    if not todo:
        return jsonify({'error': 'Todo not found!'}), 404
    
    if 'title' in data:
        todo.title = data['title']
    if 'description' in data:
        todo.description = data['description']
    if 'completed' in data:
        todo.completed = data['completed']
    
    db_session.commit()
    
    return jsonify({'todo': todo.to_dict()}), 200

@todo_bp.route('/<int:todo_id>', methods=['DELETE'])
@token_required
def delete_todo(current_user, todo_id):
    db_session = get_db_session()
    todo = db_session.query(Todo).filter_by(id=todo_id, user_id=current_user.id).first()
    
    if not todo:
        return jsonify({'error': 'Todo not found!'}), 404
    
    db_session.delete(todo)
    db_session.commit()
    
    return jsonify({'message': 'Todo deleted successfully!'}), 200

@routes_bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    """Get user profile information."""
    return jsonify({
        'user': request.current_user.to_dict()
    })

@routes_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    """Update user profile information."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    # Update allowed fields
    allowed_fields = ['name', 'email', 'preferences']
    for field in allowed_fields:
        if field in data:
            setattr(request.current_user, field, data[field])
            
    db_session = get_db_session()
    db_session.commit()
    
    return jsonify({
        'message': 'Profile updated successfully',
        'user': request.current_user.to_dict()
    })

@routes_bp.route('/credits/purchase', methods=['POST'])
@token_required
def purchase_credits():
    """Purchase credits using Stripe."""
    data = request.get_json()
    
    if not data or not data.get('amount') or not data.get('payment_method_id'):
        return jsonify({'error': 'Missing required fields'}), 400
        
    try:
        # Create payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=data['amount'] * 100,  # Convert to cents
            currency='usd',
            payment_method=data['payment_method_id'],
            confirm=True,
            return_url='http://localhost:5173/dashboard'
        )
        
        if payment_intent.status == 'succeeded':
            # Add credits to user account
            request.current_user.credits += data['amount']
            
            # Record transaction
            transaction = Transaction(
                user_id=request.current_user.id,
                amount=data['amount'],
                type='purchase',
                status='completed',
                payment_id=payment_intent.id
            )
            
            db_session = get_db_session()
            db_session.add(transaction)
            db_session.commit()
            
            return jsonify({
                'message': 'Credits purchased successfully',
                'user': request.current_user.to_dict(),
                'transaction': transaction.to_dict()
            })
            
        return jsonify({
            'error': 'Payment failed',
            'payment_intent': payment_intent
        }), 400
        
    except stripe.error.StripeError as e:
        return jsonify({'error': str(e)}), 400

@routes_bp.route('/credits/history', methods=['GET'])
@token_required
def get_credit_history():
    """Get user's credit transaction history."""
    db_session = get_db_session()
    transactions = db_session.query(Transaction).filter_by(user_id=request.current_user.id).order_by(Transaction.created_at.desc()).all()
    
    return jsonify({
        'transactions': [t.to_dict() for t in transactions]
    })

@routes_bp.route('/credits/use', methods=['POST'])
@token_required
def use_credits():
    """Use credits for a service."""
    data = request.get_json()
    
    if not data or not data.get('amount'):
        return jsonify({'error': 'Missing required fields'}), 400
        
    if request.current_user.credits < data['amount']:
        return jsonify({'error': 'Insufficient credits'}), 400
        
    # Deduct credits
    request.current_user.credits -= data['amount']
    
    # Record transaction
    transaction = Transaction(
        user_id=request.current_user.id,
        amount=data['amount'],
        type='use',
        status='completed'
    )
    
    db_session = get_db_session()
    db_session.add(transaction)
    db_session.commit()
    
    return jsonify({
        'message': 'Credits used successfully',
        'user': request.current_user.to_dict(),
        'transaction': transaction.to_dict()
    })

def register_routes(app):
    """Register all blueprints with the Flask app."""
    app.register_blueprint(auth_bp)
    app.register_blueprint(todo_bp)
    app.register_blueprint(routes_bp) 