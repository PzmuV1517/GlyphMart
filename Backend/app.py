from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
import json
import requests
from datetime import datetime, timedelta, timezone
from functools import wraps
import logging
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import uuid
import threading
import time
import mimetypes
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("Warning: PIL/Pillow not available. Image thumbnails will be disabled.")

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# File upload configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    'images': {'png', 'jpg', 'jpeg', 'gif', 'webp'},
    'apks': {'apk'},
    'profile': {'png', 'jpg', 'jpeg', 'gif', 'webp'}
}

def allowed_file(filename, file_type):
    """Check if file extension is allowed for the given file type"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS.get(file_type, set())

def generate_unique_filename(filename):
    """Generate a unique filename while preserving the extension"""
    name, ext = os.path.splitext(secure_filename(filename))
    unique_name = f"{uuid.uuid4().hex}_{name}{ext}"
    return unique_name

# Configure CORS - only allow specific origins
allowed_origins = os.getenv('ALLOWED_ORIGINS', '').split(',')
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

# Initialize Firebase Admin SDK
firebase_config = {
    "type": os.getenv('FIREBASE_TYPE'),
    "project_id": os.getenv('FIREBASE_PROJECT_ID'),
    "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
    "private_key": os.getenv('FIREBASE_PRIVATE_KEY').replace('\\n', '\n'),
    "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
    "client_id": os.getenv('FIREBASE_CLIENT_ID'),
    "auth_uri": os.getenv('FIREBASE_AUTH_URI'),
    "token_uri": os.getenv('FIREBASE_TOKEN_URI'),
    "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_X509_CERT_URL'),
    "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_X509_CERT_URL')
}

cred = credentials.Certificate(firebase_config)
firebase_admin.initialize_app(cred)
db = firestore.client()

def verify_token(f):
    """Decorator to verify Firebase ID token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            try:
                id_token = token.split(' ')[1]
                decoded_token = auth.verify_id_token(id_token)
                request.user = decoded_token
                return f(*args, **kwargs)
            except Exception as e:
                logger.error(f"Token verification failed: {e}")
                # For optional auth endpoints, continue without user context
                request.user = None
                return f(*args, **kwargs)
        else:
            # For endpoints that don't require authentication
            request.user = None
            return f(*args, **kwargs)
    return decorated_function

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(request, 'user') or not request.user:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def require_auth_strict(f):
    """Decorator to strictly require valid authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        try:
            id_token = token.split(' ')[1]
            decoded_token = auth.verify_id_token(id_token)
            request.user = decoded_token
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return jsonify({'error': 'Invalid token'}), 401
    return decorated_function

def get_client_ip():
    """Get client IP address"""
    if request.environ.get('HTTP_X_FORWARDED_FOR') is None:
        return request.environ['REMOTE_ADDR']
    else:
        return request.environ['HTTP_X_FORWARDED_FOR']

def get_external_ip():
    """Get external IP address using ipify API"""
    try:
        response = requests.get(os.getenv('IPIFY_API_URL', 'https://api.ipify.org?format=json'), timeout=5)
        return response.json().get('ip', get_client_ip())
    except:
        return get_client_ip()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'timestamp': datetime.now(timezone.utc).isoformat()})

@app.before_request
def handle_preflight():
    """Handle CORS preflight requests"""
    if request.method == "OPTIONS":
        response = jsonify()
        # Get the origin from the request
        origin = request.headers.get('Origin')
        if origin in allowed_origins:
            response.headers.add("Access-Control-Allow-Origin", origin)
        response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization")
        response.headers.add('Access-Control-Allow-Methods', "GET,PUT,POST,DELETE,OPTIONS")
        return response

def get_smart_glyph_counts(glyph_ids):
    """Get counts using denormalized data with real-time fallback for recent activity"""
    counts = {}
    
    # Initialize counts for all glyphs
    for glyph_id in glyph_ids:
        counts[glyph_id] = {'views': 0, 'likes': 0, 'downloads': 0}
    
    try:
        # First, get the denormalized counts from glyph documents (fast)
        batch_size = 10
        for i in range(0, len(glyph_ids), batch_size):
            batch_ids = glyph_ids[i:i + batch_size]
            
            # Get glyph documents for denormalized counts
            for glyph_id in batch_ids:
                try:
                    doc = db.collection('glyphs').document(glyph_id).get()
                    if doc.exists:
                        data = doc.to_dict()
                        counts[glyph_id]['views'] = data.get('views', 0)
                        counts[glyph_id]['likes'] = data.get('likes', 0) 
                        counts[glyph_id]['downloads'] = data.get('downloads', 0)
                except:
                    pass  # Keep defaults if error
                    
    except Exception as e:
        logger.error(f"Error getting smart counts: {e}")
    
    return counts

@app.route('/api/get-glyphs', methods=['GET', 'OPTIONS'])
@limiter.limit("30/minute")
@verify_token
def get_glyphs():
    """Get glyphs with optional filtering"""
    try:
        # Get query parameters
        sort_by = request.args.get('sort', 'latest')  # latest, popular, liked, viewed
        limit_count = min(int(request.args.get('limit', 12)), 100)  # Max 100
        creator_id = request.args.get('creator_id')
        search_query = request.args.get('search')
        
        # Build Firestore query
        glyphs_ref = db.collection('glyphs')
        
        # Apply creator filter if specified
        if creator_id:
            glyphs_ref = glyphs_ref.where('creatorId', '==', creator_id)
        
        # For latest sorting, we can use Firestore sorting
        # For other sorts, we'll need to sort after getting real counts
        if sort_by == 'latest':
            glyphs_ref = glyphs_ref.order_by('createdAt', direction=firestore.Query.DESCENDING)
            # Apply limit for latest since sorting is done in Firestore
            glyphs_ref = glyphs_ref.limit(limit_count)
        else:
            # For popularity-based sorting, get more records and sort client-side
            # This ensures we get the correct top items after real count calculation
            query_limit = limit_count * 3 if creator_id else limit_count * 2
            glyphs_ref = glyphs_ref.limit(min(query_limit, 100))
        
        # Execute query
        docs = glyphs_ref.stream()
        glyphs = []
        glyph_ids = []
        
        for doc in docs:
            glyph_data = doc.to_dict()
            glyph_data['id'] = doc.id
            
            # Convert timestamp to ISO string
            if 'createdAt' in glyph_data and glyph_data['createdAt']:
                glyph_data['createdAt'] = glyph_data['createdAt'].isoformat()
            
            glyphs.append(glyph_data)
            glyph_ids.append(doc.id)
        
        # Get smart counts for all glyphs (uses denormalized data)
        smart_counts = get_smart_glyph_counts(glyph_ids)
        
        # Apply smart counts to glyphs
        for glyph in glyphs:
            glyph_id = glyph['id']
            if glyph_id in smart_counts:
                glyph['views'] = smart_counts[glyph_id]['views']
                glyph['likes'] = smart_counts[glyph_id]['likes']
                glyph['downloads'] = smart_counts[glyph_id]['downloads']
            else:
                glyph['views'] = 0
                glyph['likes'] = 0
                glyph['downloads'] = 0
        
        # Apply sorting based on real counts (except for latest which is already sorted)
        if sort_by == 'popular':
            glyphs.sort(key=lambda x: x.get('downloads', 0), reverse=True)
        elif sort_by == 'liked':
            glyphs.sort(key=lambda x: x.get('likes', 0), reverse=True)
        elif sort_by == 'viewed':
            glyphs.sort(key=lambda x: x.get('views', 0), reverse=True)
        # latest is already sorted by Firestore
        
        # Apply limit after sorting (for non-latest sorts)
        if sort_by != 'latest':
            glyphs = glyphs[:limit_count]
        
        # Apply client-side search filtering if provided
        if search_query:
            search_term = search_query.lower()
            glyphs = [g for g in glyphs if 
                     search_term in g.get('title', '').lower() or 
                     search_term in g.get('description', '').lower() or 
                     search_term in g.get('creatorUsername', '').lower()]
        
        return jsonify({'glyphs': glyphs})
        
    except Exception as e:
        logger.error(f"Error getting glyphs: {e}")
        return jsonify({'error': 'Failed to fetch glyphs'}), 500

@app.route('/api/get-glyph/<glyph_id>', methods=['GET', 'OPTIONS'])
@limiter.limit("60/minute")
@verify_token
def get_glyph(glyph_id):
    """Get a specific glyph by ID with auto-sync of counts"""
    try:
        doc = db.collection('glyphs').document(glyph_id).get()
        
        if not doc.exists:
            return jsonify({'error': 'Glyph not found'}), 404
        
        glyph_data = doc.to_dict()
        glyph_data['id'] = doc.id
        
        # Convert timestamp to ISO string
        if 'createdAt' in glyph_data and glyph_data['createdAt']:
            glyph_data['createdAt'] = glyph_data['createdAt'].isoformat()
        
        # Check if we need to sync counts (if never synced or data seems stale)
        last_sync = glyph_data.get('lastCountSync')
        should_sync = False
        
        if not last_sync:
            # Never been synced
            should_sync = True
        else:
            # Check if sync is older than 1 hour
            if isinstance(last_sync, datetime):
                time_diff = datetime.now(timezone.utc) - last_sync.replace(tzinfo=timezone.utc)
                should_sync = time_diff.total_seconds() > 3600  # 1 hour
        
        if should_sync:
            try:
                # Get real counts from collections
                views_count = len(list(db.collection('glyphViews').where('glyphId', '==', glyph_id).stream()))
                likes_count = len(list(db.collection('likes').where('glyphId', '==', glyph_id).stream()))
                downloads_count = len(list(db.collection('glyphDownloads').where('glyphId', '==', glyph_id).stream()))
                
                # Update if different
                current_views = glyph_data.get('views', 0)
                current_likes = glyph_data.get('likes', 0)
                current_downloads = glyph_data.get('downloads', 0)
                
                if (current_views != views_count or current_likes != likes_count or current_downloads != downloads_count):
                    # Update denormalized counts
                    db.collection('glyphs').document(glyph_id).update({
                        'views': views_count,
                        'likes': likes_count,
                        'downloads': downloads_count,
                        'lastCountSync': firestore.SERVER_TIMESTAMP,
                        'syncType': 'auto_detail_page'
                    })
                    
                    # Update the data we're returning
                    glyph_data['views'] = views_count
                    glyph_data['likes'] = likes_count
                    glyph_data['downloads'] = downloads_count
                    
                    logger.info(f"Auto-synced glyph {glyph_id} on detail page visit")
                else:
                    # Just update the sync timestamp
                    db.collection('glyphs').document(glyph_id).update({
                        'lastCountSync': firestore.SERVER_TIMESTAMP,
                        'syncType': 'auto_detail_page_no_change'
                    })
                    
            except Exception as e:
                logger.error(f"Error auto-syncing glyph {glyph_id}: {e}")
                # Continue with existing data if sync fails
        
        # Use current denormalized data (possibly just updated)
        glyph_data['views'] = glyph_data.get('views', 0)
        glyph_data['likes'] = glyph_data.get('likes', 0)
        glyph_data['downloads'] = glyph_data.get('downloads', 0)
        
        return jsonify({'glyph': glyph_data})
        
    except Exception as e:
        logger.error(f"Error getting glyph {glyph_id}: {e}")
        return jsonify({'error': 'Failed to fetch glyph'}), 500

@app.route('/api/get-glyph/<glyph_id>/real-counts', methods=['GET', 'OPTIONS'])
@limiter.limit("10/minute")
@verify_token
def get_glyph_real_counts(glyph_id):
    """Get real-time counts for a specific glyph (expensive operation)"""
    try:
        # Get actual counts from collections (use only when needed)
        views_docs = list(db.collection('glyphViews').where('glyphId', '==', glyph_id).stream())
        likes_docs = list(db.collection('likes').where('glyphId', '==', glyph_id).stream())
        downloads_docs = list(db.collection('glyphDownloads').where('glyphId', '==', glyph_id).stream())
        
        return jsonify({
            'glyphId': glyph_id,
            'realCounts': {
                'views': len(views_docs),
                'likes': len(likes_docs),
                'downloads': len(downloads_docs)
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting real counts for glyph {glyph_id}: {e}")
        return jsonify({'error': 'Failed to fetch real counts'}), 500

@app.route('/api/admin/sync-glyph-counts', methods=['POST'])
@limiter.limit("10/minute")
@verify_token
@require_auth_strict
def sync_glyph_counts():
    """Sync denormalized counts with actual collection counts (admin only)"""
    try:
        user_id = request.user['uid']
        
        # Check if user is admin
        if not is_admin(user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        sync_all = data.get('syncAll', False) if data else False
        glyph_id = data.get('glyphId') if data else None
        batch_size = min(data.get('batchSize', 100) if data else 100, 500)  # Max 500 per request
        
        if glyph_id:
            # Sync specific glyph
            glyph_ids = [glyph_id]
        elif sync_all:
            # Sync ALL glyphs (for admin button)
            docs = db.collection('glyphs').stream()
            glyph_ids = [doc.id for doc in docs]
            logger.info(f"Admin {user_id} requested full sync of {len(glyph_ids)} glyphs")
        else:
            # Sync batch of glyphs
            docs = db.collection('glyphs').limit(batch_size).stream()
            glyph_ids = [doc.id for doc in docs]
        
        synced_count = 0
        errors = []
        updates = []
        
        # Process in chunks for large datasets
        chunk_size = 100  # Process 100 at a time to avoid timeouts
        
        for i in range(0, len(glyph_ids), chunk_size):
            chunk_ids = glyph_ids[i:i + chunk_size]
            batch = db.batch()
            chunk_updates = 0
            
            for glyph_id in chunk_ids:
                try:
                    # Get real counts from collections efficiently
                    views_count = len(list(db.collection('glyphViews').where('glyphId', '==', glyph_id).stream()))
                    likes_count = len(list(db.collection('likes').where('glyphId', '==', glyph_id).stream()))
                    downloads_count = len(list(db.collection('glyphDownloads').where('glyphId', '==', glyph_id).stream()))
                    
                    # Get current denormalized counts for comparison
                    glyph_doc = db.collection('glyphs').document(glyph_id).get()
                    if glyph_doc.exists:
                        current_data = glyph_doc.to_dict()
                        old_views = current_data.get('views', 0)
                        old_likes = current_data.get('likes', 0)
                        old_downloads = current_data.get('downloads', 0)
                        
                        # Only update if counts have changed
                        if (old_views != views_count or old_likes != likes_count or old_downloads != downloads_count):
                            # Update denormalized counts
                            glyph_ref = db.collection('glyphs').document(glyph_id)
                            batch.update(glyph_ref, {
                                'views': views_count,
                                'likes': likes_count,
                                'downloads': downloads_count,
                                'lastCountSync': firestore.SERVER_TIMESTAMP,
                                'syncType': 'admin' if sync_all else 'auto'
                            })
                            
                            updates.append({
                                'glyphId': glyph_id,
                                'old': {'views': old_views, 'likes': old_likes, 'downloads': old_downloads},
                                'new': {'views': views_count, 'likes': likes_count, 'downloads': downloads_count}
                            })
                            chunk_updates += 1
                    
                except Exception as e:
                    error_msg = f"Error syncing glyph {glyph_id}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
            
            # Commit this chunk
            if chunk_updates > 0:
                batch.commit()
                synced_count += chunk_updates
                logger.info(f"Synced chunk {i//chunk_size + 1}: {chunk_updates} glyphs updated")
        
        result = {
            'message': f'Sync completed: {synced_count} glyphs updated out of {len(glyph_ids)} checked',
            'syncedCount': synced_count,
            'totalChecked': len(glyph_ids),
            'syncType': 'admin_full' if sync_all else 'admin_batch',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        # Include sample updates and errors for debugging
        if updates:
            result['sampleUpdates'] = updates[:5]
        if errors:
            result['errors'] = errors[:3]
            
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error syncing glyph counts: {e}")
        return jsonify({'error': 'Failed to sync counts'}), 500

@app.route('/api/record-view', methods=['POST', 'OPTIONS'])
@limiter.limit("10/minute")
@verify_token
def record_view():
    """Record a glyph view"""
    try:
        data = request.get_json()
        glyph_id = data.get('glyphId')
        
        if not glyph_id:
            return jsonify({'error': 'Missing glyphId'}), 400
        
        # Use client IP from request headers instead of external lookup
        user_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', 'unknown'))
        if ',' in user_ip:
            user_ip = user_ip.split(',')[0].strip()
        
        view_id = f"{glyph_id}_{user_ip}"
        
        # Check if already viewed
        existing_view = db.collection('glyphViews').document(view_id).get()
        
        if not existing_view.exists:
            # Use batch write for atomic operation
            batch = db.batch()
            
            # Record the view
            view_ref = db.collection('glyphViews').document(view_id)
            batch.set(view_ref, {
                'glyphId': glyph_id,
                'userIP': user_ip,
                'viewedAt': firestore.SERVER_TIMESTAMP
            })
            
            # Increment denormalized view count on glyph
            glyph_ref = db.collection('glyphs').document(glyph_id)
            batch.update(glyph_ref, {'views': firestore.Increment(1)})
            
            # Commit batch
            batch.commit()
            
            return jsonify({'recorded': True})
        
        return jsonify({'recorded': False, 'message': 'Already viewed'})
        
    except Exception as e:
        logger.error(f"Error recording view: {e}")
        return jsonify({'error': 'Failed to record view'}), 500

@app.route('/api/record-download', methods=['POST'])
@limiter.limit("5/minute")
@verify_token
def record_download():
    """Record a glyph download"""
    try:
        data = request.get_json()
        glyph_id = data.get('glyphId')
        
        if not glyph_id:
            return jsonify({'error': 'Missing glyphId'}), 400
        
        # Use client IP from request headers instead of external lookup
        user_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', 'unknown'))
        if ',' in user_ip:
            user_ip = user_ip.split(',')[0].strip()
        
        download_id = f"{glyph_id}_{user_ip}"
        
        # Check if already downloaded
        existing_download = db.collection('glyphDownloads').document(download_id).get()
        
        if not existing_download.exists:
            # Use batch write for atomic operation
            batch = db.batch()
            
            # Record the download
            download_ref = db.collection('glyphDownloads').document(download_id)
            batch.set(download_ref, {
                'glyphId': glyph_id,
                'userIP': user_ip,
                'downloadedAt': firestore.SERVER_TIMESTAMP
            })
            
            # Increment denormalized download count on glyph
            glyph_ref = db.collection('glyphs').document(glyph_id)
            batch.update(glyph_ref, {'downloads': firestore.Increment(1)})
            
            # Commit batch
            batch.commit()
            
            return jsonify({'recorded': True})
        
        return jsonify({'recorded': False, 'message': 'Already downloaded'})
        
    except Exception as e:
        logger.error(f"Error recording download: {e}")
        return jsonify({'error': 'Failed to record download'}), 500

@app.route('/api/toggle-like', methods=['POST'])
@limiter.limit("30/minute")
@require_auth_strict
def toggle_like():
    """Toggle like status for a glyph"""
    try:
        data = request.get_json()
        glyph_id = data.get('glyphId')
        user_id = request.user['uid']
        
        if not glyph_id:
            return jsonify({'error': 'Missing glyphId'}), 400
        
        like_id = f"{glyph_id}_{user_id}"
        
        # Check if already liked
        existing_like = db.collection('likes').document(like_id).get()
        
        # Use batch write for atomic operation
        batch = db.batch()
        
        if existing_like.exists:
            # Remove like
            like_ref = db.collection('likes').document(like_id)
            batch.delete(like_ref)
            
            # Decrement denormalized like count on glyph
            glyph_ref = db.collection('glyphs').document(glyph_id)
            batch.update(glyph_ref, {'likes': firestore.Increment(-1)})
            
            liked = False
        else:
            # Add like
            like_ref = db.collection('likes').document(like_id)
            batch.set(like_ref, {
                'glyphId': glyph_id,
                'userId': user_id,
                'likedAt': firestore.SERVER_TIMESTAMP
            })
            
            # Increment denormalized like count on glyph
            glyph_ref = db.collection('glyphs').document(glyph_id)
            batch.update(glyph_ref, {'likes': firestore.Increment(1)})
            
            liked = True
        
        # Commit batch
        batch.commit()
        
        # Get updated like count from denormalized data
        glyph_doc = db.collection('glyphs').document(glyph_id).get()
        total_likes = glyph_doc.to_dict().get('likes', 0) if glyph_doc.exists else 0
        
        return jsonify({'liked': liked, 'totalLikes': total_likes})
        
    except Exception as e:
        logger.error(f"Error toggling like: {e}")
        return jsonify({'error': 'Failed to toggle like'}), 500

@app.route('/api/check-like-status', methods=['GET'])
@limiter.limit("60/minute")
@require_auth_strict
def check_like_status():
    """Check if user has liked a glyph"""
    try:
        glyph_id = request.args.get('glyphId')
        user_id = request.user['uid']
        
        if not glyph_id:
            return jsonify({'error': 'Missing glyphId'}), 400
        
        like_id = f"{glyph_id}_{user_id}"
        existing_like = db.collection('likes').document(like_id).get()
        
        return jsonify({'liked': existing_like.exists})
        
    except Exception as e:
        logger.error(f"Error checking like status: {e}")
        return jsonify({'error': 'Failed to check like status'}), 500

@app.route('/api/get-user-likes', methods=['GET'])
@limiter.limit("30/minute")
@require_auth_strict
def get_user_likes():
    """Get glyphs liked by the current user"""
    try:
        user_id = request.user['uid']
        
        # Get user's likes
        likes = db.collection('likes').where('userId', '==', user_id).stream()
        glyph_ids = [like.to_dict()['glyphId'] for like in likes]
        
        if not glyph_ids:
            return jsonify({'glyphs': []})
        
        # Get the glyphs
        glyphs = []
        for glyph_id in glyph_ids:
            doc = db.collection('glyphs').document(glyph_id).get()
            if doc.exists:
                glyph_data = doc.to_dict()
                glyph_data['id'] = doc.id
                
                # Convert timestamp to ISO string
                if 'createdAt' in glyph_data and glyph_data['createdAt']:
                    glyph_data['createdAt'] = glyph_data['createdAt'].isoformat()
                
                # Get accurate view count
                views_count = db.collection('glyphViews').where('glyphId', '==', glyph_id).stream()
                glyph_data['views'] = len(list(views_count))
                
                glyphs.append(glyph_data)
        
        return jsonify({'glyphs': glyphs})
        
    except Exception as e:
        logger.error(f"Error getting user likes: {e}")
        return jsonify({'error': 'Failed to fetch user likes'}), 500

@app.route('/api/upload-glyph', methods=['POST'])
@limiter.limit("5/minute")
@require_auth_strict
def upload_glyph():
    """Upload a new glyph"""
    try:
        data = request.get_json()
        user_id = request.user['uid']
        
        # Validate required fields
        required_fields = ['title', 'description']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Get user profile for username
        user_doc = db.collection('users').document(user_id).get()
        if not user_doc.exists:
            return jsonify({'error': 'User profile not found'}), 404
        
        user_data = user_doc.to_dict()
        username = user_data.get('username', user_id)
        
        # Create glyph document
        glyph_data = {
            'title': data['title'],
            'description': data['description'],
            'creatorId': user_id,
            'creatorUsername': username,
            'apkUrl': data.get('apkUrl', ''),
            'githubUrl': data.get('githubUrl', ''),
            'instructions': data.get('instructions', ''),
            'images': data.get('images', []),
            'views': 0,
            'downloads': 0,
            'likes': 0,
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        
        # Add to Firestore
        doc_ref = db.collection('glyphs').add(glyph_data)
        glyph_id = doc_ref[1].id
        
        return jsonify({'success': True, 'id': glyph_id, 'glyphId': glyph_id})
        
    except Exception as e:
        logger.error(f"Error uploading glyph: {e}")
        return jsonify({'error': 'Failed to upload glyph'}), 500

@app.route('/api/update-glyph/<glyph_id>', methods=['PUT'])
@limiter.limit("10/minute")
@require_auth_strict
def update_glyph(glyph_id):
    """Update an existing glyph (only by creator or admin)"""
    try:
        data = request.get_json()
        user_id = request.user['uid']
        
        # Check if glyph exists
        doc = db.collection('glyphs').document(glyph_id).get()
        if not doc.exists:
            return jsonify({'error': 'Glyph not found'}), 404
        
        glyph_data = doc.to_dict()
        
        # Check if user is creator or admin
        is_creator = glyph_data['creatorId'] == user_id
        is_user_admin = is_admin(user_id)
        
        if not is_creator and not is_user_admin:
            return jsonify({'error': 'Not authorized to edit this glyph'}), 403
        
        # Update allowed fields
        update_data = {}
        allowed_fields = ['title', 'description', 'apkUrl', 'githubUrl', 'instructions', 'images']
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if update_data:
            db.collection('glyphs').document(glyph_id).update(update_data)
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Error updating glyph: {e}")
        return jsonify({'error': 'Failed to update glyph'}), 500

@app.route('/api/delete-glyph/<glyph_id>', methods=['DELETE'])
@limiter.limit("5/minute")
@require_auth_strict
def delete_glyph(glyph_id):
    """Delete a glyph and all associated data (only by creator or admin)"""
    try:
        user_id = request.user['uid']
        
        # Check if glyph exists
        doc = db.collection('glyphs').document(glyph_id).get()
        if not doc.exists:
            return jsonify({'error': 'Glyph not found'}), 404
        
        glyph_data = doc.to_dict()
        
        # Check if user is creator or admin
        is_creator = glyph_data['creatorId'] == user_id
        is_user_admin = is_admin(user_id)
        
        if not is_creator and not is_user_admin:
            return jsonify({'error': 'Not authorized to delete this glyph'}), 403
        
        # Delete glyph document
        db.collection('glyphs').document(glyph_id).delete()
        
        # Delete all associated likes
        likes = db.collection('likes').where('glyphId', '==', glyph_id).stream()
        for like in likes:
            like.reference.delete()
        
        # Delete all associated views
        views = db.collection('glyphViews').where('glyphId', '==', glyph_id).stream()
        for view in views:
            view.reference.delete()
        
        # Delete all associated downloads
        downloads = db.collection('glyphDownloads').where('glyphId', '==', glyph_id).stream()
        for download in downloads:
            download.reference.delete()
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Error deleting glyph: {e}")
        return jsonify({'error': 'Failed to delete glyph'}), 500

@app.route('/api/get-user/<user_id>', methods=['GET'])
@limiter.limit("60/minute")
@verify_token
def get_user(user_id):
    """Get user profile by ID"""
    try:
        doc = db.collection('users').document(user_id).get()
        
        if not doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = doc.to_dict()
        user_data['uid'] = doc.id
        
        # Convert timestamp to ISO string for consistency
        if 'createdAt' in user_data and user_data['createdAt']:
            user_data['createdAt'] = user_data['createdAt'].isoformat()
        
        return jsonify({'user': user_data})
        
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        return jsonify({'error': 'Failed to fetch user'}), 500

@app.route('/api/get-user-by-username/<username>', methods=['GET', 'OPTIONS'])
@limiter.limit("60/minute")
@verify_token
def get_user_by_username(username):
    """Get user profile by username"""
    try:
        # Try to find by username first
        users = db.collection('users').where('username', '==', username).limit(1).stream()
        user_doc = None
        
        for user in users:
            user_doc = user
            break
        
        if not user_doc:
            # Try to find by displayName as fallback
            users = db.collection('users').where('displayName', '==', username).limit(1).stream()
            for user in users:
                user_doc = user
                break
        
        if not user_doc:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        user_data['uid'] = user_doc.id
        
        # Convert timestamp to ISO string for consistency
        if 'createdAt' in user_data and user_data['createdAt']:
            user_data['createdAt'] = user_data['createdAt'].isoformat()
        
        return jsonify({'user': user_data})
        
    except Exception as e:
        logger.error(f"Error getting user by username: {e}")
        return jsonify({'error': 'Failed to fetch user'}), 500

@app.route('/api/update-user', methods=['POST', 'OPTIONS'])
@limiter.limit("30 per minute")
def update_user():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        # Verify authentication
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        allowed_fields = ['username', 'displayName', 'bio', 'profilePicture', 'bannerImage', 'updatedAt']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        # Update user document
        user_ref = db.collection('users').document(uid)
        user_ref.update(update_data)
        
        return jsonify({'message': 'User updated successfully', 'updated_fields': list(update_data.keys())})
        
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        return jsonify({'error': 'Failed to update user'}), 500

@app.route('/api/delete-user-data', methods=['DELETE', 'OPTIONS'])
@limiter.limit("5 per minute")
def delete_user_data():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        # Verify authentication
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        
        # Delete all user's glyphs
        glyphs_ref = db.collection('glyphs')
        user_glyphs = glyphs_ref.where('creatorId', '==', uid).stream()
        
        batch = db.batch()
        glyph_count = 0
        for glyph in user_glyphs:
            batch.delete(glyph.reference)
            glyph_count += 1
        
        # Delete all user's likes
        likes_ref = db.collection('likes')
        user_likes = likes_ref.where('userId', '==', uid).stream()
        
        like_count = 0
        for like in user_likes:
            batch.delete(like.reference)
            like_count += 1
        
        # Delete user document
        user_ref = db.collection('users').document(uid)
        batch.delete(user_ref)
        
        # Commit all deletions
        batch.commit()
        
        return jsonify({
            'message': 'User data deleted successfully',
            'deleted_glyphs': glyph_count,
            'deleted_likes': like_count
        })
        
    except Exception as e:
        logger.error(f"Error deleting user data: {e}")
        return jsonify({'error': 'Failed to delete user data'}), 500

@app.route('/api/upload-file', methods=['POST'])
@limiter.limit("10/minute")
@require_auth_strict
def upload_file():
    """Upload a file (image, APK, or profile picture)"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        file_type = request.form.get('type', 'images')  # images, apks, profile
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename, file_type):
            return jsonify({'error': f'File type not allowed for {file_type}'}), 400
        
        # Generate unique filename
        filename = generate_unique_filename(file.filename)
        
        # Create file path
        file_dir = os.path.join(app.config['UPLOAD_FOLDER'], file_type)
        os.makedirs(file_dir, exist_ok=True)
        file_path = os.path.join(file_dir, filename)
        
        # Save file
        file.save(file_path)
        
        # If it's an image, create a thumbnail
        if file_type in ['images', 'profile'] and PIL_AVAILABLE:
            try:
                with Image.open(file_path) as img:
                    # Create thumbnail
                    img.thumbnail((300, 300), Image.Resampling.LANCZOS)
                    thumb_filename = f"thumb_{filename}"
                    thumb_path = os.path.join(file_dir, thumb_filename)
                    img.save(thumb_path, optimize=True, quality=85)
                    
                    return jsonify({
                        'success': True,
                        'filename': filename,
                        'url': f"/api/files/{file_type}/{filename}",
                        'thumbnail': f"/api/files/{file_type}/thumb_{filename}",
                        'type': file_type
                    })
            except Exception as e:
                logger.error(f"Error creating thumbnail: {e}")
                # Continue without thumbnail if image processing fails
        
        return jsonify({
            'success': True,
            'filename': filename,
            'url': f"/api/files/{file_type}/{filename}",
            'type': file_type
        })
        
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        return jsonify({'error': 'Failed to upload file'}), 500

@app.route('/api/files/<file_type>/<filename>')
@limiter.limit("200/minute")
def serve_file(file_type, filename):
    """Serve uploaded files"""
    try:
        if file_type not in ALLOWED_EXTENSIONS:
            return jsonify({'error': 'Invalid file type'}), 400
        
        file_dir = os.path.join(app.config['UPLOAD_FOLDER'], file_type)
        
        # Security check - ensure filename is secure
        safe_filename = secure_filename(filename)
        if safe_filename != filename:
            return jsonify({'error': 'Invalid filename'}), 400
        
        file_path = os.path.join(file_dir, filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        # Get mimetype
        mimetype = mimetypes.guess_type(file_path)[0]
        
        return send_from_directory(file_dir, filename, mimetype=mimetype)
        
    except Exception as e:
        logger.error(f"Error serving file: {e}")
        return jsonify({'error': 'Failed to serve file'}), 500

@app.route('/api/delete-file', methods=['DELETE'])
@limiter.limit("30/minute")
@require_auth_strict
def delete_file():
    """Delete an uploaded file"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        file_type = data.get('type')
        
        if not filename or not file_type:
            return jsonify({'error': 'Missing filename or type'}), 400
        
        if file_type not in ALLOWED_EXTENSIONS:
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Security check
        safe_filename = secure_filename(filename)
        if safe_filename != filename:
            return jsonify({'error': 'Invalid filename'}), 400
        
        file_dir = os.path.join(app.config['UPLOAD_FOLDER'], file_type)
        file_path = os.path.join(file_dir, filename)
        
        # Delete main file
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete thumbnail if it exists
        thumb_filename = f"thumb_{filename}"
        thumb_path = os.path.join(file_dir, thumb_filename)
        if os.path.exists(thumb_path):
            os.remove(thumb_path)
        
        return jsonify({'success': True, 'message': 'File deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        return jsonify({'error': 'Failed to delete file'}), 500

@app.route('/api/test-upload-file', methods=['POST'])
@limiter.limit("10/minute")
def test_upload_file():
    """Test file upload without authentication (TEMPORARY - FOR TESTING ONLY)"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        file_type = request.form.get('type', 'images')  # images, apks, profile
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename, file_type):
            return jsonify({'error': f'File type not allowed for {file_type}'}), 400
        
        # Generate unique filename
        filename = generate_unique_filename(file.filename)
        
        # Create file path
        file_dir = os.path.join(app.config['UPLOAD_FOLDER'], file_type)
        os.makedirs(file_dir, exist_ok=True)
        file_path = os.path.join(file_dir, filename)
        
        # Save file
        file.save(file_path)
        
        # If it's an image, create a thumbnail
        if file_type in ['images', 'profile'] and PIL_AVAILABLE:
            try:
                with Image.open(file_path) as img:
                    # Create thumbnail
                    img.thumbnail((300, 300), Image.Resampling.LANCZOS)
                    thumb_filename = f"thumb_{filename}"
                    thumb_path = os.path.join(file_dir, thumb_filename)
                    img.save(thumb_path, optimize=True, quality=85)
                    
                    return jsonify({
                        'success': True,
                        'filename': filename,
                        'url': f"/api/files/{file_type}/{filename}",
                        'thumbnail': f"/api/files/{file_type}/thumb_{filename}",
                        'type': file_type,
                        'message': 'TEST UPLOAD - Authentication bypassed'
                    })
            except Exception as e:
                logger.error(f"Error creating thumbnail: {e}")
                # Continue without thumbnail if image processing fails
        
        return jsonify({
            'success': True,
            'filename': filename,
            'url': f"/api/files/{file_type}/{filename}",
            'type': file_type,
            'message': 'TEST UPLOAD - Authentication bypassed'
        })
        
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        return jsonify({'error': 'Failed to upload file'}), 500

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'error': 'Rate limit exceeded. Please try again later.'}), 429

# Admin endpoints
def is_admin(user_id):
    """Check if a user is an admin (super admin or has admin role)"""
    try:
        # Check if user is the super admin
        if user_id == '9H3pw5zS6GRDFTZaoYspEmruORj2':
            return True
        
        # Check if user has admin role in Firestore
        user_doc = db.collection('users').document(user_id).get()
        if user_doc.exists:
            user_data = user_doc.to_dict()
            return user_data.get('isAdmin', False)
        
        return False
    except Exception as e:
        logger.error(f"Error checking admin status: {str(e)}")
        return False

def require_admin(f):
    """Decorator to require admin privileges"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # First require authentication
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'No authorization token provided'}), 401
            
            token = auth_header.split(' ')[1]
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token['uid']
            
            # Check if user is the super admin
            if uid == '9H3pw5zS6GRDFTZaoYspEmruORj2':
                request.current_user_uid = uid
                return f(*args, **kwargs)
            
            # Check if user has admin role in Firestore
            users_ref = db.collection('users')
            user_doc = users_ref.document(uid).get()
            
            if user_doc.exists:
                user_data = user_doc.to_dict()
                if user_data.get('isAdmin', False):
                    request.current_user_uid = uid
                    return f(*args, **kwargs)
            
            return jsonify({'error': 'Admin privileges required'}), 403
            
        except Exception as e:
            logger.error(f"Admin auth error: {str(e)}")
            return jsonify({'error': 'Invalid token'}), 401
    
    return decorated_function

@app.route('/api/admin/stats', methods=['GET'])
@limiter.limit("30/minute")
@require_admin
def get_admin_stats():
    """Get admin statistics"""
    try:
        # Get total users
        users_ref = db.collection('users')
        users = list(users_ref.stream())
        total_users = len(users)
        
        # Count admins
        total_admins = sum(1 for user in users if user.to_dict().get('isAdmin', False)) + 1  # +1 for super admin
        
        # Get total glyphs
        glyphs_ref = db.collection('glyphs')
        glyphs = list(glyphs_ref.stream())
        total_glyphs = len(glyphs)
        
        # Get total views from the glyphViews collection (more accurate)
        views_ref = db.collection('glyphViews')
        views = list(views_ref.stream())
        total_views = len(views)
        
        # Get total downloads from the glyphDownloads collection (more accurate)
        downloads_ref = db.collection('glyphDownloads')
        downloads = list(downloads_ref.stream())
        total_downloads = len(downloads)
        
        # Get total likes from glyphLikes collection
        glyph_likes_ref = db.collection('glyphLikes')
        glyph_likes = list(glyph_likes_ref.stream())
        total_glyph_likes = len(glyph_likes)
        
        # Get total likes from likes collection (keep for compatibility)
        likes_ref = db.collection('likes')
        likes = list(likes_ref.stream())
        total_likes = len(likes)
        
        # Simply use the count of all documents as "unique" counts
        # This gives us the total number of view/download events
        unique_viewers = total_views
        unique_downloaders = total_downloads
        
        # Calculate most popular glyphs
        glyph_stats = {}
        for glyph in glyphs:
            glyph_data = glyph.to_dict()
            glyph_stats[glyph.id] = {
                'title': glyph_data.get('title', 'Unknown'),
                'views': glyph_data.get('views', 0),
                'downloads': glyph_data.get('downloads', 0),
                'likes': glyph_data.get('likes', 0)
            }
        
        # Sort by views to get top glyphs
        top_glyphs = sorted(glyph_stats.items(), key=lambda x: x[1]['views'], reverse=True)[:10]
        
        return jsonify({
            'totalUsers': total_users,
            'totalGlyphs': total_glyphs,
            'totalDownloads': total_downloads,
            'totalViews': total_views,
            'totalLikes': total_likes,
            'totalGlyphLikes': total_glyph_likes,
            'totalAdmins': total_admins,
            'uniqueViewers': unique_viewers,
            'uniqueDownloaders': unique_downloaders,
            'topGlyphs': [{'id': glyph_id, **stats} for glyph_id, stats in top_glyphs]
        })
        
    except Exception as e:
        logger.error(f"Error getting admin stats: {str(e)}")
        return jsonify({'error': 'Failed to get stats'}), 500

@app.route('/api/admin/users', methods=['GET'])
@limiter.limit("30/minute")
@require_admin
def get_all_users():
    """Get all users for admin panel"""
    try:
        users_ref = db.collection('users')
        users = users_ref.stream()
        
        user_list = []
        for user in users:
            user_data = user.to_dict()
            user_data['uid'] = user.id
            user_list.append(user_data)
        
        # Sort by creation date or username
        user_list.sort(key=lambda x: x.get('username', '').lower())
        
        return jsonify({'users': user_list})
        
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        return jsonify({'error': 'Failed to get users'}), 500

@app.route('/api/admin/users/<user_id>', methods=['PUT'])
@limiter.limit("10/minute")
@require_admin
def admin_update_user(user_id):
    """Update user data as admin"""
    try:
        data = request.get_json()
        
        # Update user in Firestore
        user_ref = db.collection('users').document(user_id)
        
        # Build update data
        update_data = {}
        allowed_fields = ['username', 'displayName', 'bio', 'profilePicture', 'bannerImage', 'isAdmin']
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if update_data:
            update_data['updatedAt'] = datetime.now(timezone.utc)
            user_ref.update(update_data)
        
        return jsonify({'success': True, 'message': 'User updated successfully'})
        
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        return jsonify({'error': 'Failed to update user'}), 500

@app.route('/api/admin/make-admin/<user_id>', methods=['POST'])
@limiter.limit("5/minute")
@require_admin
def make_user_admin(user_id):
    """Make a user an admin"""
    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        # Update user to admin
        user_ref.update({
            'isAdmin': True,
            'updatedAt': datetime.now(timezone.utc)
        })
        
        return jsonify({'success': True, 'message': 'User promoted to admin successfully'})
        
    except Exception as e:
        logger.error(f"Error making user admin: {str(e)}")
        return jsonify({'error': 'Failed to promote user'}), 500

@app.route('/api/admin/add-admin', methods=['POST'])
@limiter.limit("5/minute")
@require_admin
def add_admin_by_email():
    """Add admin by email address"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Find user by email in Firestore
        users_ref = db.collection('users')
        users = users_ref.where('email', '==', email).stream()
        
        user_found = None
        for user in users:
            user_found = user
            break
        
        if not user_found:
            return jsonify({'error': 'User with this email not found'}), 404
        
        # Update user to admin
        user_ref = db.collection('users').document(user_found.id)
        user_ref.update({
            'isAdmin': True,
            'updatedAt': datetime.now(timezone.utc)
        })
        
        return jsonify({'success': True, 'message': 'Admin added successfully'})
        
    except Exception as e:
        logger.error(f"Error adding admin: {str(e)}")
        return jsonify({'error': 'Failed to add admin'}), 500

@app.route('/api/admin/glyphs/<glyph_id>', methods=['DELETE'])
@limiter.limit("10/minute")
@require_admin
def admin_delete_glyph(glyph_id):
    """Delete any glyph as admin"""
    try:
        glyph_ref = db.collection('glyphs').document(glyph_id)
        glyph_doc = glyph_ref.get()
        
        if not glyph_doc.exists:
            return jsonify({'error': 'Glyph not found'}), 404
        
        glyph_data = glyph_doc.to_dict()
        
        # Delete associated files
        try:
            if glyph_data.get('images'):
                for image_url in glyph_data['images']:
                    # Extract filename from URL and delete file
                    if '/api/files/' in image_url:
                        path_parts = image_url.split('/api/files/')[-1].split('/')
                        if len(path_parts) >= 2:
                            file_type, filename = path_parts[0], path_parts[1]
                            file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_type, filename)
                            if os.path.exists(file_path):
                                os.remove(file_path)
                            # Also try to delete thumbnail
                            thumb_path = os.path.join(app.config['UPLOAD_FOLDER'], file_type, f"thumb_{filename}")
                            if os.path.exists(thumb_path):
                                os.remove(thumb_path)
        except Exception as file_error:
            logger.warning(f"Error deleting files for glyph {glyph_id}: {str(file_error)}")
        
        # Delete the glyph document
        glyph_ref.delete()
        
        # Also delete from likes collection
        likes_ref = db.collection('likes')
        likes_query = likes_ref.where('glyphId', '==', glyph_id)
        likes_docs = likes_query.stream()
        
        for like_doc in likes_docs:
            like_doc.reference.delete()
        
        return jsonify({'success': True, 'message': 'Glyph deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting glyph: {str(e)}")
        return jsonify({'error': 'Failed to delete glyph'}), 500

# ============================================
# GLYPH REQUEST ENDPOINTS
# ============================================

@app.route('/api/glyph-requests', methods=['GET', 'OPTIONS'])
@limiter.limit("30/minute")
@verify_token
def get_glyph_requests():
    """Get all glyph requests with optional search and pagination"""
    try:
        search_query = request.args.get('search', '').strip()
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        
        # Start with all requests ordered by creation date
        query = db.collection('glyph_requests').order_by('created_at', direction=firestore.Query.DESCENDING)
        
        # Get all documents for search (we'll filter in Python since Firestore text search is limited)
        docs = query.stream()
        requests_data = []
        
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            
            # Convert timestamp to ISO string
            if 'created_at' in data and data['created_at']:
                data['created_at'] = data['created_at'].isoformat()
            
            # Get user info for the requester
            if 'user_id' in data:
                try:
                    user_doc = db.collection('users').document(data['user_id']).get()
                    if user_doc.exists:
                        user_data = user_doc.to_dict()
                        data['user'] = {
                            'username': user_data.get('username', 'Unknown'),
                            'profilePicture': user_data.get('profilePicture')
                        }
                    else:
                        data['user'] = {'username': 'Unknown'}
                except Exception:
                    data['user'] = {'username': 'Unknown'}
            
            # Apply search filter if provided
            if not search_query or (
                search_query.lower() in data.get('title', '').lower() or
                search_query.lower() in data.get('description', '').lower() or
                search_query.lower() in data.get('tags', [])
            ):
                requests_data.append(data)
        
        # Apply pagination
        total_count = len(requests_data)
        paginated_requests = requests_data[offset:offset + limit]
        
        return jsonify({
            'requests': paginated_requests,
            'total': total_count,
            'hasMore': offset + limit < total_count
        })
        
    except Exception as e:
        logger.error(f"Error fetching glyph requests: {str(e)}")
        return jsonify({'error': 'Failed to fetch glyph requests'}), 500

@app.route('/api/glyph-requests', methods=['POST'])
@limiter.limit("5/minute")
@verify_token
@require_auth_strict
def create_glyph_request():
    """Create a new glyph request"""
    try:
        data = request.get_json()
        user_id = request.user['uid']  # Get from authenticated token
        
        # Validate required fields
        if not data.get('title') or not data.get('description'):
            return jsonify({'error': 'Title and description are required'}), 400
        
        # Create the request document
        request_data = {
            'title': data['title'],
            'description': data['description'],
            'tags': data.get('tags', []),
            'reference_images': data.get('reference_images', []),
            'reference_files': data.get('reference_files', []),
            'user_id': user_id,
            'status': 'open',  # open, in_progress, completed, cancelled
            'assigned_to': None,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        
        # Add to database
        doc_ref = db.collection('glyph_requests').add(request_data)
        request_id = doc_ref[1].id
        
        return jsonify({
            'message': 'Glyph request created successfully',
            'request_id': request_id
        })
        
    except Exception as e:
        logger.error(f"Error creating glyph request: {str(e)}")
        return jsonify({'error': 'Failed to create glyph request'}), 500

@app.route('/api/glyph-requests/<request_id>', methods=['GET', 'OPTIONS'])
@limiter.limit("30/minute")
@verify_token
def get_glyph_request(request_id):
    """Get a specific glyph request by ID"""
    try:
        doc = db.collection('glyph_requests').document(request_id).get()
        
        if not doc.exists:
            return jsonify({'error': 'Glyph request not found'}), 404
        
        data = doc.to_dict()
        data['id'] = doc.id
        
        # Convert timestamp to ISO string
        if 'created_at' in data and data['created_at']:
            data['created_at'] = data['created_at'].isoformat()
        if 'updated_at' in data and data['updated_at']:
            data['updated_at'] = data['updated_at'].isoformat()
        
        # Get user info for the requester
        if 'user_id' in data:
            try:
                user_doc = db.collection('users').document(data['user_id']).get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    data['user'] = {
                        'username': user_data.get('username', 'Unknown'),
                        'profilePicture': user_data.get('profilePicture')
                    }
                else:
                    data['user'] = {'username': 'Unknown'}
            except Exception:
                data['user'] = {'username': 'Unknown'}
        
        # Get assigned user info if assigned
        if data.get('assigned_to'):
            try:
                assigned_user_doc = db.collection('users').document(data['assigned_to']).get()
                if assigned_user_doc.exists:
                    assigned_user_data = assigned_user_doc.to_dict()
                    data['assigned_user'] = {
                        'username': assigned_user_data.get('username', 'Unknown'),
                        'profilePicture': assigned_user_data.get('profilePicture')
                    }
            except Exception:
                pass
        
        return jsonify(data)
        
    except Exception as e:
        logger.error(f"Error fetching glyph request: {str(e)}")
        return jsonify({'error': 'Failed to fetch glyph request'}), 500

@app.route('/api/glyph-requests/<request_id>/take-on', methods=['POST'])
@limiter.limit("10/minute")
@verify_token
@require_auth_strict
def take_on_glyph_request(request_id):
    """Allow a user with 1+ glyphs to take on a glyph request"""
    try:
        data = request.get_json()
        user_id = request.user['uid']  # Get from authenticated token
        
        # Check if user has at least 1 glyph
        user_glyphs = db.collection('glyphs').where('creatorId', '==', user_id).limit(1).get()
        if not list(user_glyphs):
            return jsonify({'error': 'You must have at least 1 uploaded glyph to take on requests'}), 403
        
        # Get the request
        request_doc = db.collection('glyph_requests').document(request_id).get()
        if not request_doc.exists:
            return jsonify({'error': 'Request not found'}), 404
        
        request_data = request_doc.to_dict()
        
        # Check if request is still open
        if request_data.get('status') != 'open':
            return jsonify({'error': 'This request is no longer available'}), 400
        
        # Update the request
        db.collection('glyph_requests').document(request_id).update({
            'assigned_to': user_id,
            'status': 'in_progress',
            'updated_at': datetime.now(timezone.utc)
        })
        
        return jsonify({'message': 'Successfully took on the glyph request'})
        
    except Exception as e:
        logger.error(f"Error taking on glyph request: {str(e)}")
        return jsonify({'error': 'Failed to take on glyph request'}), 500

@app.route('/api/glyph-requests/<request_id>/complete', methods=['POST'])
@limiter.limit("10/minute")
@verify_token
@require_auth_strict
def complete_glyph_request(request_id):
    """Mark a glyph request as completed (for assigned user)"""
    try:
        data = request.get_json()
        user_id = request.user['uid']  # Get from authenticated token
        glyph_id = data.get('glyph_id')  # The ID of the glyph that fulfills the request
        
        # Get the request
        request_doc = db.collection('glyph_requests').document(request_id).get()
        if not request_doc.exists:
            return jsonify({'error': 'Request not found'}), 404
        
        request_data = request_doc.to_dict()
        
        # Check if user is assigned to this request
        if request_data.get('assigned_to') != user_id:
            return jsonify({'error': 'You are not assigned to this request'}), 403
        
        # Verify the glyph exists and belongs to the user
        if glyph_id:
            glyph_doc = db.collection('glyphs').document(glyph_id).get()
            if not glyph_doc.exists or glyph_doc.to_dict().get('creatorId') != user_id:
                return jsonify({'error': 'Invalid glyph provided'}), 400
        
        # Update the request
        update_data = {
            'status': 'completed',
            'updated_at': datetime.now(timezone.utc)
        }
        
        if glyph_id:
            update_data['completion_glyph_id'] = glyph_id
        
        db.collection('glyph_requests').document(request_id).update(update_data)
        
        return jsonify({'message': 'Request marked as completed'})
        
    except Exception as e:
        logger.error(f"Error completing glyph request: {str(e)}")
        return jsonify({'error': 'Failed to complete glyph request'}), 500

@app.route('/api/glyph-requests/<request_id>/cancel', methods=['POST'])
@limiter.limit("10/minute")
@verify_token
@require_auth_strict
def cancel_glyph_request(request_id):
    """Cancel a glyph request (for assigned user or request creator)"""
    try:
        user_id = request.user['uid']  # Get from authenticated token
        
        # Get the request
        request_doc = db.collection('glyph_requests').document(request_id).get()
        if not request_doc.exists:
            return jsonify({'error': 'Request not found'}), 404
        
        request_data = request_doc.to_dict()
        
        # Check if user is assigned to this request or is the creator
        if request_data.get('assigned_to') != user_id and request_data.get('user_id') != user_id:
            return jsonify({'error': 'You are not authorized to cancel this request'}), 403
        
        # Update the request status
        update_data = {
            'status': 'cancelled',
            'updated_at': datetime.now(timezone.utc)
        }
        
        # If assigned user is cancelling, unassign it and make it open again
        if request_data.get('assigned_to') == user_id and request_data.get('user_id') != user_id:
            update_data['status'] = 'open'
            update_data['assigned_to'] = None
        
        db.collection('glyph_requests').document(request_id).update(update_data)
        
        return jsonify({'message': 'Request cancelled successfully'})
        
    except Exception as e:
        logger.error(f"Error cancelling glyph request: {str(e)}")
        return jsonify({'error': 'Failed to cancel glyph request'}), 500

@app.route('/api/my-glyph-requests', methods=['GET', 'OPTIONS'])
@limiter.limit("30/minute")
@verify_token
@require_auth_strict
def get_my_glyph_requests():
    """Get glyph requests for the current user (created or assigned to)"""
    try:
        user_id = request.user['uid']
        request_type = request.args.get('type', 'all')  # all, created, assigned
        
        all_requests = []
        
        # Get requests created by user
        if request_type in ['all', 'created']:
            try:
                created_docs = db.collection('glyph_requests').where('user_id', '==', user_id).stream()
                for doc in created_docs:
                    data = doc.to_dict()
                    data['id'] = doc.id
                    data['type'] = 'created'
                    
                    # Convert timestamp to ISO string
                    if 'created_at' in data and data['created_at']:
                        data['created_at'] = data['created_at'].isoformat()
                    if 'updated_at' in data and data['updated_at']:
                        data['updated_at'] = data['updated_at'].isoformat()
                    
                    # Get assigned user info if assigned
                    if data.get('assigned_to'):
                        try:
                            assigned_user_doc = db.collection('users').document(data['assigned_to']).get()
                            if assigned_user_doc.exists:
                                assigned_user_data = assigned_user_doc.to_dict()
                                data['assigned_user'] = {
                                    'username': assigned_user_data.get('username', 'Unknown'),
                                    'profilePicture': assigned_user_data.get('profilePicture')
                                }
                        except Exception:
                            pass
                    
                    all_requests.append(data)
            except Exception as e:
                logger.error(f"Error fetching created requests: {str(e)}")
        
        # Get requests assigned to user
        if request_type in ['all', 'assigned']:
            try:
                assigned_docs = db.collection('glyph_requests').where('assigned_to', '==', user_id).stream()
                for doc in assigned_docs:
                    data = doc.to_dict()
                    data['id'] = doc.id
                    data['type'] = 'assigned'
                    
                    # Convert timestamp to ISO string
                    if 'created_at' in data and data['created_at']:
                        data['created_at'] = data['created_at'].isoformat()
                    if 'updated_at' in data and data['updated_at']:
                        data['updated_at'] = data['updated_at'].isoformat()
                    
                    # Get requester info
                    if 'user_id' in data:
                        try:
                            user_doc = db.collection('users').document(data['user_id']).get()
                            if user_doc.exists:
                                user_data = user_doc.to_dict()
                                data['user'] = {
                                    'username': user_data.get('username', 'Unknown'),
                                    'profilePicture': user_data.get('profilePicture')
                                }
                            else:
                                data['user'] = {'username': 'Unknown'}
                        except Exception:
                            data['user'] = {'username': 'Unknown'}
                    
                    all_requests.append(data)
            except Exception as e:
                logger.error(f"Error fetching assigned requests: {str(e)}")
        
        # Sort by creation date in Python (to avoid Firestore composite index requirements)
        all_requests.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return jsonify({
            'requests': all_requests,
            'total': len(all_requests)
        })
        
    except Exception as e:
        logger.error(f"Error fetching my glyph requests: {str(e)}")
        return jsonify({'error': 'Failed to fetch my glyph requests'}), 500

# ============================================
# ADMIN GLYPH REQUEST ENDPOINTS
# ============================================

@app.route('/api/admin/glyph-requests/<request_id>', methods=['DELETE'])
@limiter.limit("10/minute")
@verify_token
@require_auth_strict
def admin_delete_glyph_request(request_id):
    """Delete a glyph request (admin only)"""
    try:
        user_id = request.user['uid']
        
        # Check if user is admin
        if not is_admin(user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        # Delete the request
        db.collection('glyph_requests').document(request_id).delete()
        
        return jsonify({'message': 'Request deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting glyph request: {str(e)}")
        return jsonify({'error': 'Failed to delete glyph request'}), 500

@app.route('/api/admin/glyph-requests/<request_id>/force-complete', methods=['POST'])
@limiter.limit("10/minute")
@verify_token
@require_auth_strict
def admin_force_complete_request(request_id):
    """Force complete a glyph request (admin only)"""
    try:
        user_id = request.user['uid']
        
        # Check if user is admin
        if not is_admin(user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get the request
        request_doc = db.collection('glyph_requests').document(request_id).get()
        if not request_doc.exists:
            return jsonify({'error': 'Request not found'}), 404
        
        # Update the request
        db.collection('glyph_requests').document(request_id).update({
            'status': 'completed',
            'updated_at': datetime.now(timezone.utc),
            'admin_completed': True
        })
        
        return jsonify({'message': 'Request force completed successfully'})
        
    except Exception as e:
        logger.error(f"Error force completing glyph request: {str(e)}")
        return jsonify({'error': 'Failed to force complete glyph request'}), 500

@app.route('/api/admin/glyph-requests/<request_id>/reset', methods=['POST'])
@limiter.limit("10/minute")
@verify_token
@require_auth_strict
def admin_reset_request(request_id):
    """Reset a glyph request to open status (admin only)"""
    try:
        user_id = request.user['uid']
        
        # Check if user is admin
        if not is_admin(user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get the request
        request_doc = db.collection('glyph_requests').document(request_id).get()
        if not request_doc.exists:
            return jsonify({'error': 'Request not found'}), 404
        
        # Update the request
        db.collection('glyph_requests').document(request_id).update({
            'status': 'open',
            'assigned_to': None,
            'updated_at': datetime.now(timezone.utc),
            'admin_reset': True
        })
        
        return jsonify({'message': 'Request reset successfully'})
        
    except Exception as e:
        logger.error(f"Error resetting glyph request: {str(e)}")
        return jsonify({'error': 'Failed to reset glyph request'}), 500

@app.errorhandler(429)
def not_found_handler(e):
    return jsonify({'error': 'Endpoint not found'}), 404
# Background sync system
class BackgroundSyncService:
    def __init__(self):
        self.running = False
        self.thread = None
        
    def sync_random_glyphs(self, batch_size=50):
        """Sync a random batch of glyphs"""
        try:
            # Get random glyphs that haven't been synced recently
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=2)
            
            # Get glyphs that need syncing (no lastCountSync or old sync)
            docs = db.collection('glyphs').limit(batch_size * 2).stream()
            candidates = []
            
            for doc in docs:
                data = doc.to_dict()
                last_sync = data.get('lastCountSync')
                
                if not last_sync or (isinstance(last_sync, datetime) and last_sync.replace(tzinfo=timezone.utc) < cutoff_time):
                    candidates.append(doc.id)
            
            # Take a random sample
            import random
            glyph_ids = random.sample(candidates, min(batch_size, len(candidates)))
            
            if not glyph_ids:
                logger.info("No glyphs need syncing at this time")
                return 0
            
            synced_count = 0
            batch = db.batch()
            
            for glyph_id in glyph_ids:
                try:
                    # Get real counts
                    views_count = len(list(db.collection('glyphViews').where('glyphId', '==', glyph_id).stream()))
                    likes_count = len(list(db.collection('likes').where('glyphId', '==', glyph_id).stream()))
                    downloads_count = len(list(db.collection('glyphDownloads').where('glyphId', '==', glyph_id).stream()))
                    
                    # Update denormalized counts
                    glyph_ref = db.collection('glyphs').document(glyph_id)
                    batch.update(glyph_ref, {
                        'views': views_count,
                        'likes': likes_count,
                        'downloads': downloads_count,
                        'lastCountSync': firestore.SERVER_TIMESTAMP,
                        'syncType': 'auto_hourly'
                    })
                    synced_count += 1
                    
                except Exception as e:
                    logger.error(f"Error in background sync for glyph {glyph_id}: {e}")
            
            if synced_count > 0:
                batch.commit()
                logger.info(f"Background sync completed: {synced_count} glyphs updated")
            
            return synced_count
            
        except Exception as e:
            logger.error(f"Background sync failed: {e}")
            return 0
    
    def run_hourly_sync(self):
        """Run hourly sync in background thread"""
        while self.running:
            try:
                # Wait 1 hour
                time.sleep(3600)  # 3600 seconds = 1 hour
                
                if self.running:  # Check if still running after sleep
                    logger.info("Starting hourly background sync...")
                    synced = self.sync_random_glyphs(batch_size=100)
                    logger.info(f"Hourly sync completed: {synced} glyphs synced")
                    
            except Exception as e:
                logger.error(f"Hourly sync thread error: {e}")
                time.sleep(300)  # Wait 5 minutes before retrying
    
    def start(self):
        """Start the background sync service"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self.run_hourly_sync, daemon=True)
            self.thread.start()
            logger.info("Background sync service started")
    
    def stop(self):
        """Stop the background sync service"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("Background sync service stopped")

# Initialize background sync service
sync_service = BackgroundSyncService()

@app.route('/api/admin/sync-status', methods=['GET'])
@limiter.limit("30/minute")
@verify_token
@require_auth_strict
def get_sync_status():
    """Get background sync service status (admin only)"""
    try:
        user_id = request.user['uid']
        
        # Check if user is admin
        if not is_admin(user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get some sync statistics
        recent_syncs = []
        try:
            # Get recently synced glyphs
            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            docs = db.collection('glyphs').where('lastCountSync', '>=', cutoff).limit(10).stream()
            for doc in docs:
                data = doc.to_dict()
                if 'lastCountSync' in data:
                    recent_syncs.append({
                        'glyphId': doc.id,
                        'lastSync': data['lastCountSync'].isoformat() if isinstance(data['lastCountSync'], datetime) else str(data['lastCountSync']),
                        'syncType': data.get('syncType', 'unknown')
                    })
        except Exception as e:
            logger.error(f"Error getting sync stats: {e}")
        
        return jsonify({
            'backgroundSyncRunning': sync_service.running,
            'recentSyncs': recent_syncs,
            'message': 'Background sync service is active and syncing glyphs every hour' if sync_service.running else 'Background sync service is not running'
        })
        
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        return jsonify({'error': 'Failed to get sync status'}), 500

@app.errorhandler(500)
def internal_error_handler(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Start background sync service
    sync_service.start()
    
    try:
        # Only bind to localhost for security
        app.run(host='127.0.0.1', port=5000, debug=os.getenv('FLASK_DEBUG', 'False').lower() == 'true')
    finally:
        # Stop background sync when app shuts down
        sync_service.stop()
