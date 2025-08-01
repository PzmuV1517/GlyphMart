from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'test_key')

# Configure CORS - only allow specific origins
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
CORS(app, origins=allowed_origins)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok', 
        'timestamp': datetime.utcnow().isoformat(),
        'message': 'Backend is running! Ready for Firebase configuration.'
    })

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    """Test endpoint to verify backend is working"""
    return jsonify({
        'message': 'Backend is working correctly!',
        'cors_origins': allowed_origins,
        'environment': os.getenv('FLASK_ENV', 'development')
    })

if __name__ == '__main__':
    # Only bind to localhost for security
    print("🚀 Starting test backend...")
    print("📍 Backend URL: http://127.0.0.1:5000")
    print("🔍 Test endpoints:")
    print("   - http://127.0.0.1:5000/api/health")
    print("   - http://127.0.0.1:5000/api/test")
    print("⚡ Next step: Configure Firebase credentials in .env file")
    
    app.run(host='127.0.0.1', port=5000, debug=True)
