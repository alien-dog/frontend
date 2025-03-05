import os
import stripe
from flask import Blueprint, request, jsonify
from db import get_db_session
from models import User, Transaction
from datetime import datetime

stripe_bp = Blueprint('stripe', __name__)

# Initialize Stripe with your secret key
stripe.api_key = "sk_test_51Q38qCAGgrMJnivhY2kRf3qYDlzfCQACMXg2A431cKit7KRgqtDxiC5jYJPrbe4aFbkaVzamc33QY8woZmKBINVP008lLQooRN"

# Credit package configurations
CREDIT_PACKAGES = {
    'price_H5ggYwtDq8jf99': {'credits': 100, 'amount': 999},  # $9.99
    'price_H5ggYwtDq8jf98': {'credits': 300, 'amount': 2499},  # $24.99
    'price_H5ggYwtDq8jf97': {'credits': 1000, 'amount': 4999},  # $49.99
}

@stripe_bp.route('/create-payment', methods=['POST'])
def create_payment():
    try:
        data = request.get_json()
        price_id = data.get('priceId')
        user_id = data.get('userId')

        if not price_id or price_id not in CREDIT_PACKAGES:
            return jsonify({'error': 'Invalid price ID'}), 400

        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400

        credit_package = CREDIT_PACKAGES[price_id]

        # Create payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=credit_package['amount'],
            currency='usd',
            payment_method_types= ['card'],
            metadata={
                'userId': str(user_id),
                'credits': str(credit_package['credits']),
                'priceId': price_id
            }
        )

        print(payment_intent)

        return jsonify({
            'clientSecret': payment_intent.client_secret,
            'stripe_id': payment_intent.id
        })

    except Exception as e:
        print('Error creating payment:', e)
        return jsonify({'error': str(e)}), 500

@stripe_bp.route('/check-payment/<stripe_id>', methods=['GET'])
def check_payment(stripe_id):
    try:
        payment_intent = stripe.PaymentIntent.retrieve(stripe_id)
        
        if payment_intent.status == 'succeeded':
            # Get the credit package info from metadata
            credits = int(payment_intent.metadata.get('credits', 0))
            price_id = payment_intent.metadata.get('priceId')
            user_id = int(payment_intent.metadata.get('userId'))
            
            # Create transaction record
            db_session = get_db_session()
            
            # Update user credits
            user = db_session.query(User).filter_by(id=user_id).first()
            if not user:
                raise ValueError('User not found')
            
            user.credits = user.credits + credits
            
            # Create transaction record
            transaction = Transaction(
                user_id=user_id,  # Add user_id to transaction
                type='credit_purchase',
                amount=credits,
                description=f'Purchased {credits} credits',
                transaction_metadata={
                    'paymentIntentId': payment_intent.id,
                    'priceId': price_id
                }
            )
            
            db_session.add(transaction)
            db_session.commit()
            
            # Return updated user data along with payment info
            return jsonify({
                'status': 'success',
                'payment': {
                    'id': payment_intent.id,
                    'amount': payment_intent.amount,
                    'status': payment_intent.status
                },
                'user': user.to_dict()  # Include updated user data
            })
        
        return jsonify({
            'status': payment_intent.status,
            'payment': {
                'id': payment_intent.id,
                'amount': payment_intent.amount,
                'status': payment_intent.status
            }
        })

    except Exception as e:
        print('Error checking payment:', e)
        return jsonify({'error': str(e)}), 500 