"""
Authentication module for Yomi app
Provides secure user authentication with MongoDB and JWT
"""
import os
import bcrypt
from pymongo import MongoClient
from flask import jsonify, request
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import re
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AuthManager:
    def __init__(self, app):
        self.app = app
        
        # Setup JWT
        app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'fallback-secret-key')
        app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
        app.config['JWT_ALGORITHM'] = 'HS256'
        
        self.jwt = JWTManager(app)
        
        # Setup MongoDB connection
        try:
            mongodb_uri = os.getenv('MONGODB_URI')
            if not mongodb_uri or mongodb_uri == 'DUMMY':
                raise ValueError("MongoDB URI not configured properly")
            
            self.client = MongoClient(mongodb_uri)
            
            # Try to get default database from URI, fallback to explicit name
            try:
                self.db = self.client.get_default_database()
            except Exception:
                # If no default database in URI, use explicit database name
                self.db = self.client['yomi_db']
            
            self.users_collection = self.db.users
            
            # Create indexes for better performance
            self.users_collection.create_index("email", unique=True)
            self.users_collection.create_index("username", unique=True)
            
        except Exception as e:
            print(f"MongoDB connection failed: {e}")
            self.client = None
            self.db = None
            self.users_collection = None
    
    def validate_email(self, email):
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def validate_password(self, password):
        """Validate password strength"""
        if len(password) < 6:
            return False, "Password must be at least 6 characters long"
        
        return True, "Password is valid"
    
    def hash_password(self, password):
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt)
    
    def verify_password(self, password, hashed_password):
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password)
    
    def register_user(self, data):
        """Register a new user"""
        try:
            if self.users_collection is None:
                return {'success': False, 'message': 'Database connection failed'}, 500
            
            # Extract data
            email = data.get('email', '').strip().lower()
            username = data.get('username', '').strip()
            password = data.get('password', '')
            full_name = data.get('fullName', '').strip()
            
            # Validate required fields
            if not all([email, username, password, full_name]):
                return {'success': False, 'message': 'All fields are required'}, 400
            
            # Validate email format
            if not self.validate_email(email):
                return {'success': False, 'message': 'Invalid email format'}, 400
            
            # Validate username
            if len(username) < 3 or len(username) > 20:
                return {'success': False, 'message': 'Username must be between 3 and 20 characters'}, 400
            
            if not re.match(r'^[a-zA-Z0-9_]+$', username):
                return {'success': False, 'message': 'Username can only contain letters, numbers, and underscores'}, 400
            
            # Validate password
            is_valid, message = self.validate_password(password)
            if not is_valid:
                return {'success': False, 'message': message}, 400
            
            # Check if user already exists
            existing_user = self.users_collection.find_one({'$or': [{'email': email}, {'username': username}]})
            if existing_user is not None:
                return {'success': False, 'message': 'User with this email or username already exists'}, 409
            
            # Hash password
            hashed_password = self.hash_password(password)
            
            # Create user document
            user_doc = {
                'email': email,
                'username': username,
                'password': hashed_password,
                'full_name': full_name,
                'created_at': None,  # Will be set by MongoDB
                'profile_settings': {
                    'theme': 'dark',
                    'language': 'en',
                    'notifications': True
                },
                'study_progress': {
                    'texts_processed': 0,
                    'kanji_learned': [],
                    'favorite_texts': []
                }
            }
            
            # Insert user
            result = self.users_collection.insert_one(user_doc)
            
            if result.inserted_id:
                # Create access token
                access_token = create_access_token(
                    identity=str(result.inserted_id),
                    additional_claims={
                        'email': email,
                        'username': username,
                        'full_name': full_name
                    }
                )
                
                return {
                    'success': True, 
                    'message': 'User registered successfully',
                    'access_token': access_token,
                    'user': {
                        'id': str(result.inserted_id),
                        'email': email,
                        'username': username,
                        'full_name': full_name
                    }
                }, 201
            else:
                return {'success': False, 'message': 'Failed to create user'}, 500
                
        except Exception as e:
            print(f"Registration error: {e}")
            return {'success': False, 'message': 'Internal server error'}, 500
    
    def login_user(self, data):
        """Login user"""
        try:
            if self.users_collection is None:
                return {'success': False, 'message': 'Database connection failed'}, 500
            
            # Extract data
            identifier = data.get('identifier', '').strip().lower()  # email or username
            password = data.get('password', '')
            
            if not identifier or not password:
                return {'success': False, 'message': 'Email/username and password are required'}, 400
            
            # Find user by email or username
            user = self.users_collection.find_one({
                '$or': [
                    {'email': identifier},
                    {'username': identifier}
                ]
            })
            
            if user is None:
                return {'success': False, 'message': 'Invalid credentials'}, 401
            
            # Verify password
            if not self.verify_password(password, user['password']):
                return {'success': False, 'message': 'Invalid credentials'}, 401
            
            # Create access token
            access_token = create_access_token(
                identity=str(user['_id']),
                additional_claims={
                    'email': user['email'],
                    'username': user['username'],
                    'full_name': user['full_name']
                }
            )
            
            return {
                'success': True,
                'message': 'Login successful',
                'access_token': access_token,
                'user': {
                    'id': str(user['_id']),
                    'email': user['email'],
                    'username': user['username'],
                    'full_name': user['full_name'],
                    'profile_settings': user.get('profile_settings', {}),
                    'study_progress': user.get('study_progress', {})
                }
            }, 200
            
        except Exception as e:
            print(f"Login error: {e}")
            return {'success': False, 'message': 'Internal server error'}, 500
    
    def get_user_profile(self, user_id):
        """Get user profile"""
        try:
            if self.users_collection is None:
                return {'success': False, 'message': 'Database connection failed'}, 500
            
            from bson import ObjectId
            user = self.users_collection.find_one({'_id': ObjectId(user_id)})
            
            if user is None:
                return {'success': False, 'message': 'User not found'}, 404
            
            return {
                'success': True,
                'user': {
                    'id': str(user['_id']),
                    'email': user['email'],
                    'username': user['username'],
                    'full_name': user['full_name'],
                    'profile_settings': user.get('profile_settings', {}),
                    'study_progress': user.get('study_progress', {})
                }
            }, 200
            
        except Exception as e:
            print(f"Get profile error: {e}")
            return {'success': False, 'message': 'Internal server error'}, 500

    def update_user_progress(self, user_id, progress_data):
        """Update user's study progress"""
        try:
            if self.users_collection is None:
                return {'success': False, 'message': 'Database connection failed'}, 500
            
            from bson import ObjectId
            
            # Update progress
            result = self.users_collection.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': {'study_progress': progress_data}}
            )
            
            if result.modified_count > 0:
                return {'success': True, 'message': 'Progress updated successfully'}, 200
            else:
                return {'success': False, 'message': 'Failed to update progress'}, 400
                
        except Exception as e:
            print(f"Update progress error: {e}")
            return {'success': False, 'message': 'Internal server error'}, 500

    def save_kanji_to_collection(self, user_id, kanji_list):
        """Save selected kanji to user's collection"""
        try:
            if self.users_collection is None:
                return {'success': False, 'message': 'Database connection failed'}, 500
            
            from bson import ObjectId
            from datetime import datetime
            
            # Get existing user kanji collection
            user = self.users_collection.find_one({'_id': ObjectId(user_id)})
            if user is None:
                return {'success': False, 'message': 'User not found'}, 404
            
            existing_kanji = user.get('kanji_collection', {})
            
            # Add new kanji with timestamps
            for kanji_info in kanji_list:
                kanji_char = kanji_info['char']
                if kanji_char not in existing_kanji:
                    existing_kanji[kanji_char] = {
                        'data': kanji_info.get('data'),
                        'added_at': datetime.utcnow(),
                        'char': kanji_char
                    }
            
            # Calculate new kanji count before update
            new_count = len([k for k in kanji_list if k['char'] not in user.get('kanji_collection', {})])
            
            # Update user's kanji collection
            result = self.users_collection.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': {'kanji_collection': existing_kanji}}
            )
            
            # Always return success, whether new kanji were added or all were duplicates
            if new_count > 0:
                return {
                    'success': True, 
                    'message': f'Successfully saved {new_count} new kanji to collection',
                    'total_kanji': len(existing_kanji)
                }, 200
            else:
                return {
                    'success': True, 
                    'message': 'Kanji successfully added to collection',
                    'total_kanji': len(existing_kanji)
                }, 200
                
        except Exception as e:
            print(f"Save kanji error: {e}")
            return {'success': False, 'message': 'Internal server error'}, 500

    def get_user_kanji_collection(self, user_id):
        """Get user's saved kanji collection"""
        try:
            if self.users_collection is None:
                return {'success': False, 'message': 'Database connection failed'}, 500
            
            from bson import ObjectId
            
            user = self.users_collection.find_one({'_id': ObjectId(user_id)})
            if user is None:
                return {'success': False, 'message': 'User not found'}, 404
            
            kanji_collection = user.get('kanji_collection', {})
            
            # Convert to list format for frontend
            kanji_list = []
            for kanji_char, kanji_info in kanji_collection.items():
                kanji_list.append({
                    'char': kanji_char,
                    'data': kanji_info.get('data'),
                    'added_at': kanji_info.get('added_at')
                })
            
            # Sort by added_at (newest first)
            kanji_list.sort(key=lambda x: x.get('added_at', ''), reverse=True)
            
            return {
                'success': True,
                'kanji': kanji_list,
                'total_count': len(kanji_list)
            }, 200
                
        except Exception as e:
            print(f"Get kanji collection error: {e}")
            return {'success': False, 'message': 'Internal server error'}, 500

    def remove_kanji_from_collection(self, user_id, kanji_char):
        """Remove a kanji from user's collection"""
        try:
            if self.users_collection is None:
                return {'success': False, 'message': 'Database connection failed'}, 500
            
            from bson import ObjectId
            
            # Remove kanji from user's collection
            result = self.users_collection.update_one(
                {'_id': ObjectId(user_id)},
                {'$unset': {f'kanji_collection.{kanji_char}': ""}}
            )
            
            if result.modified_count > 0:
                return {'success': True, 'message': 'Kanji removed from collection'}, 200
            else:
                return {'success': False, 'message': 'Kanji not found in collection'}, 404
                
        except Exception as e:
            print(f"Remove kanji error: {e}")
            return {'success': False, 'message': 'Internal server error'}, 500

    def handle_google_oauth(self, google_profile):
        """Find or create a user from Google profile info and return access token+user"""
        try:
            if self.users_collection is None:
                return {'success': False, 'message': 'Database connection failed'}, 500

            email = google_profile.get('email', '').strip().lower()
            full_name = google_profile.get('name', '').strip()
            google_id = google_profile.get('id')

            if not email:
                return {'success': False, 'message': 'Google profile did not include an email'}, 400

            # Try to find existing user by email
            user = self.users_collection.find_one({'email': email})

            if user is None:
                # Create a username suggestion from email
                base_username = email.split('@')[0]
                username = base_username
                counter = 1
                while self.users_collection.find_one({'username': username}):
                    username = f"{base_username}{counter}"
                    counter += 1

                user_doc = {
                    'email': email,
                    'username': username,
                    'password': None,
                    'full_name': full_name,
                    'google_id': google_id,
                    'created_at': None,
                    'profile_settings': {
                        'theme': 'dark',
                        'language': 'en',
                        'notifications': True
                    },
                    'study_progress': {
                        'texts_processed': 0,
                        'kanji_learned': [],
                        'favorite_texts': []
                    }
                }

                result = self.users_collection.insert_one(user_doc)
                if result.inserted_id:
                    user = self.users_collection.find_one({'_id': result.inserted_id})
                else:
                    return {'success': False, 'message': 'Failed to create user from Google profile'}, 500

            # Create access token for the user
            access_token = create_access_token(
                identity=str(user['_id']),
                additional_claims={
                    'email': user.get('email'),
                    'username': user.get('username'),
                    'full_name': user.get('full_name')
                }
            )

            return {
                'success': True,
                'access_token': access_token,
                'user': {
                    'id': str(user['_id']),
                    'email': user.get('email'),
                    'username': user.get('username'),
                    'full_name': user.get('full_name'),
                    'profile_settings': user.get('profile_settings', {}),
                    'study_progress': user.get('study_progress', {})
                }
            }, 200

        except Exception as e:
            print(f"Google OAuth handling error: {e}")
            return {'success': False, 'message': 'Internal server error'}, 500

    def update_user_profile(self, user_id, full_name, username):
        """Update user profile information"""
        try:
            if self.users_collection is None:
                return {'success': False, 'message': 'Database connection failed'}, 500
            
            from bson import ObjectId
            
            # Check if username is already taken by another user
            existing_user = self.users_collection.find_one({
                'username': username,
                '_id': {'$ne': ObjectId(user_id)}
            })
            
            if existing_user:
                return {'success': False, 'message': 'Username already taken'}, 400
            
            # Update user profile
            result = self.users_collection.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': {
                    'full_name': full_name,
                    'username': username
                }}
            )
            
            if result.modified_count > 0:
                return {'success': True, 'message': 'Profile updated successfully'}, 200
            else:
                return {'success': False, 'message': 'No changes made'}, 400
                
        except Exception as e:
            print(f"Update profile error: {e}")
            return {'success': False, 'message': 'Internal server error'}, 500
