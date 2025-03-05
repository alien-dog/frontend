# Python Server Module

This is a Python-based server module using Flask for a RESTful API. It provides authentication and todo management functionality with MySQL database integration.

## Features

- User authentication with JWT
- Todo CRUD operations
- MySQL database integration with SQLAlchemy
- Environment variable configuration

## Requirements

- Python 3.8+
- MySQL Server
- Dependencies listed in `requirements.txt`

## Setup

1. Create a virtual environment:
   ```
   python -m venv venv
   ```

2. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Unix/MacOS: `source venv/bin/activate`

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

5. MySQL Database Setup:
   - Ensure MySQL server is running at the specified host (default: 8.130.113.102)
   - The database `todo_app` will be created automatically if it doesn't exist
   - Make sure the MySQL user has appropriate permissions

## Running the Server

To run the server in development mode:

```
python run.py
```

For production, it's recommended to use Gunicorn:

```
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info (requires authentication)

### Todos

- `GET /api/todos` - Get all todos for current user (requires authentication)
- `POST /api/todos` - Create a new todo (requires authentication)
- `GET /api/todos/<id>` - Get a specific todo (requires authentication)
- `PUT /api/todos/<id>` - Update a todo (requires authentication)
- `DELETE /api/todos/<id>` - Delete a todo (requires authentication)

## Database Models

- `User` - Stores user information
- `Todo` - Stores todo items linked to users

## License

MIT 