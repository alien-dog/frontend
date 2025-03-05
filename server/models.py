from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from db import Base

class Token(Base):
    __tablename__ = 'tokens'
    
    id = Column(String(36), primary_key=True)  # UUID
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    type = Column(String(10), nullable=False)  # 'access' or 'refresh'
    expires_at = Column(DateTime, nullable=False)
    is_valid = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship('User', back_populates='tokens')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_valid': self.is_valid,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True)
    email = Column(String(120), unique=True)
    password_hash = Column(String(128))
    name = Column(String(120))
    picture = Column(String(255))
    credits = Column(Integer, default=3)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    tokens = relationship('Token', back_populates='user', cascade='all, delete-orphan')
    transactions = relationship('Transaction', back_populates='user', cascade='all, delete-orphan')
    todos = relationship("Todo", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'name': self.name,
            'picture': self.picture,
            'credits': self.credits,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Transaction(Base):
    __tablename__ = 'transactions'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    amount = Column(Integer, nullable=False)
    type = Column(String(20), nullable=False)  # 'purchase' or 'use'
    status = Column(String(20), nullable=False)  # 'completed', 'pending', 'failed'
    payment_id = Column(String(255))  # For Stripe payment intent ID
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship('User', back_populates='transactions')
    
    def __repr__(self):
        return f'<Transaction {self.type} {self.amount}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'amount': self.amount,
            'type': self.type,
            'status': self.status,
            'payment_id': self.payment_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Todo(Base):
    __tablename__ = 'todos'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="todos")
    
    def __repr__(self):
        return f'<Todo {self.title}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'completed': self.completed,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        } 