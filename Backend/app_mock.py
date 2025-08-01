from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import json
from datetime import datetime
from functools import wraps
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev_secret_key')

# Configure CORS - only allow specific origins
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
CORS(app, origins=allowed_origins, methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
     allow_headers=['Content-Type', 'Authorization'])

# Configure rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=[f"{os.getenv('RATE_LIMIT_PER_MINUTE', 60)}/minute", f"{os.getenv('RATE_LIMIT_PER_HOUR', 1000)}/hour"]
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock data for testing
MOCK_GLYPHS = [
    {
        'id': 'mock_glyph_1',
        'title': 'Neon Pulse',
        'description': 'A vibrant neon-style glyph pattern with pulsing effects',
        'creatorId': 'mock_user_1',
        'creatorUsername': 'GlyphMaster',
        'views': 245,
        'downloads': 89,
        'likes': 34,
        'createdAt': '2024-12-01T10:00:00.000Z',
        'images': ['https://via.placeholder.com/400x400/ff0000/ffffff?text=Neon+Pulse']
    },
    {
        'id': 'mock_glyph_2', 
        'title': 'Minimalist Wave',
        'description': 'Clean and simple wave pattern for Nothing Phone',
        'creatorId': 'mock_user_2',
        'creatorUsername': 'CleanDesign',
        'views': 189,
        'downloads': 67,
        'likes': 28,
        'createdAt': '2024-12-02T15:30:00.000Z',
        'images': ['https://via.placeholder.com/400x400/ffffff/000000?text=Wave']
    },
    {
        'id': 'mock_glyph_3',
        'title': 'Retro Circuit',
        'description': 'Classic circuit board inspired glyph design',
        'creatorId': 'mock_user_1',
        'creatorUsername': 'GlyphMaster',
        'views': 156,
        'downloads': 45,
        'likes': 19,
        'createdAt': '2024-12-03T09:15:00.000Z',
        'images': ['https://via.placeholder.com/400x400/00ff00/000000?text=Circuit']
    }
]

MOCK_USERS = {
    'mock_user_1': {
        'uid': 'mock_user_1',
        'username': 'GlyphMaster',
        'displayName': 'Glyph Master',
        'bio': 'Creating amazing glyph patterns for Nothing Phone users',
        'createdAt': '2024-11-01T00:00:00.000Z'
    },
    'mock_user_2': {
        'uid': 'mock_user_2', 
        'username': 'CleanDesign',
        'displayName': 'Clean Design Studio',
        'bio': 'Minimalist designs for modern devices',
        'createdAt': '2024-11-15T00:00:00.000Z'
    }
}

def verify_token(f):
    """Mock decorator for token verification"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # For testing, just set a mock user
        request.user = None
        return f(*args, **kwargs)
    return decorated_function

def require_auth(f):
    """Mock decorator for authentication requirement"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # For testing, allow all requests
        return f(*args, **kwargs)
    return decorated_function

@app.before_request
def handle_preflight():
    """Handle CORS preflight requests"""
    if request.method == "OPTIONS":
        response = jsonify()
        origin = request.headers.get('Origin')
        if origin in allowed_origins:
            response.headers.add("Access-Control-Allow-Origin", origin)
        response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization")
        response.headers.add('Access-Control-Allow-Methods', "GET,PUT,POST,DELETE,OPTIONS")
        return response

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok', 
        'timestamp': datetime.utcnow().isoformat(),
        'message': 'Mock backend running - Ready for Firebase integration!'
    })

@app.route('/api/get-glyphs', methods=['GET', 'OPTIONS'])
@limiter.limit("30/minute")
@verify_token
def get_glyphs():
    """Get glyphs with optional filtering - MOCK VERSION"""
    try:
        # Get query parameters
        sort_by = request.args.get('sort', 'latest')
        limit_count = min(int(request.args.get('limit', 12)), 100)
        creator_id = request.args.get('creator_id')
        search_query = request.args.get('search')
        
        glyphs = MOCK_GLYPHS.copy()
        
        # Filter by creator if specified
        if creator_id:
            glyphs = [g for g in glyphs if g['creatorId'] == creator_id]
        
        # Apply search filtering
        if search_query:
            search_term = search_query.lower()
            glyphs = [g for g in glyphs if 
                     search_term in g.get('title', '').lower() or 
                     search_term in g.get('description', '').lower() or 
                     search_term in g.get('creatorUsername', '').lower()]
        
        # Apply sorting
        if sort_by == 'popular':
            glyphs.sort(key=lambda x: x['downloads'], reverse=True)
        elif sort_by == 'liked':
            glyphs.sort(key=lambda x: x['likes'], reverse=True)
        elif sort_by == 'viewed':
            glyphs.sort(key=lambda x: x['views'], reverse=True)
        # 'latest' is already the default order
        
        # Apply limit
        glyphs = glyphs[:limit_count]
        
        logger.info(f"Returning {len(glyphs)} mock glyphs (sort: {sort_by}, limit: {limit_count})")
        return jsonify({'glyphs': glyphs})
        
    except Exception as e:
        logger.error(f"Error getting glyphs: {e}")
        return jsonify({'error': 'Failed to fetch glyphs'}), 500

@app.route('/api/get-glyph/<glyph_id>', methods=['GET', 'OPTIONS'])
@limiter.limit("60/minute")
@verify_token
def get_glyph(glyph_id):
    """Get a specific glyph by ID - MOCK VERSION"""
    try:
        glyph = next((g for g in MOCK_GLYPHS if g['id'] == glyph_id), None)
        
        if not glyph:
            return jsonify({'error': 'Glyph not found'}), 404
        
        logger.info(f"Returning mock glyph: {glyph_id}")
        return jsonify({'glyph': glyph})
        
    except Exception as e:
        logger.error(f"Error getting glyph {glyph_id}: {e}")
        return jsonify({'error': 'Failed to fetch glyph'}), 500

@app.route('/api/get-user-by-username/<username>', methods=['GET', 'OPTIONS'])
@limiter.limit("60/minute")
@verify_token
def get_user_by_username(username):
    """Get user profile by username - MOCK VERSION"""
    try:
        user = None
        for user_data in MOCK_USERS.values():
            if user_data['username'] == username or user_data['displayName'] == username:
                user = user_data
                break
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        logger.info(f"Returning mock user: {username}")
        return jsonify({'user': user})
        
    except Exception as e:
        logger.error(f"Error getting user by username: {e}")
        return jsonify({'error': 'Failed to fetch user'}), 500

@app.route('/api/record-view', methods=['POST', 'OPTIONS'])
@limiter.limit("10/minute")
@verify_token
def record_view():
    """Record a glyph view - MOCK VERSION"""
    try:
        data = request.get_json()
        glyph_id = data.get('glyphId')
        
        if not glyph_id:
            return jsonify({'error': 'Missing glyphId'}), 400
        
        logger.info(f"Mock: Recording view for glyph {glyph_id}")
        return jsonify({'recorded': True})
        
    except Exception as e:
        logger.error(f"Error recording view: {e}")
        return jsonify({'error': 'Failed to record view'}), 500

@app.route('/api/record-download', methods=['POST', 'OPTIONS'])
@limiter.limit("5/minute") 
@verify_token
def record_download():
    """Record a glyph download - MOCK VERSION"""
    try:
        data = request.get_json()
        glyph_id = data.get('glyphId')
        
        if not glyph_id:
            return jsonify({'error': 'Missing glyphId'}), 400
        
        logger.info(f"Mock: Recording download for glyph {glyph_id}")
        return jsonify({'recorded': True})
        
    except Exception as e:
        logger.error(f"Error recording download: {e}")
        return jsonify({'error': 'Failed to record download'}), 500

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'error': 'Rate limit exceeded. Please try again later.'}), 429

@app.errorhandler(404)
def not_found_handler(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error_handler(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("🚀 Starting MOCK backend for CORS testing...")
    print("📍 Backend URL: http://127.0.0.1:5000")
    print("🔧 CORS configured for:", allowed_origins)
    print("📊 Mock data available:")
    print(f"   - {len(MOCK_GLYPHS)} sample glyphs")
    print(f"   - {len(MOCK_USERS)} sample users")
    print("⚡ Frontend should now connect successfully!")
    print("💡 Once Firebase service account is configured, switch back to app.py")
    
    app.run(host='127.0.0.1', port=5000, debug=True)
