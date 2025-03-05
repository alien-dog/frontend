from flask import Flask, request, jsonify, session
from flask_cors import CORS
from auth import auth_bp
from stripe_routes import stripe_bp
from models import User
from db import init_db, get_db_session
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['SESSION_COOKIE_SECURE'] = os.getenv('FLASK_ENV') == 'production'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:5000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "send_wildcard": False,
        "max_age": 86400
    }
})

# Initialize database
init_db(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(stripe_bp, url_prefix='/api')

@app.before_request
def load_user():
    if 'user_id' in session:
        db_session = get_db_session()
        request.user = db_session.get(User, session['user_id'])
    else:
        request.user = None

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error"}), 500

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "python-server"})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 