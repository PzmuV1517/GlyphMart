"""
Database optimization and caching utilities for GlyphMart
Reduces Firestore read operations through intelligent caching
"""

import time
import threading
from collections import defaultdict
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)

class DatabaseCache:
    """In-memory cache for reducing Firestore reads"""
    
    def __init__(self):
        self.cache = {}
        self.cache_timestamps = {}
        self.cache_lock = threading.RLock()
        
        # Cache TTL settings (in seconds)
        self.ttl_settings = {
            'glyph_counts': 300,      # 5 minutes for glyph counts
            'glyph_data': 600,        # 10 minutes for glyph metadata
            'user_data': 1800,        # 30 minutes for user data
            'admin_stats': 120,       # 2 minutes for admin stats
            'popular_glyphs': 900,    # 15 minutes for popular lists
        }
        
    def _is_expired(self, key, cache_type):
        """Check if cache entry is expired"""
        if key not in self.cache_timestamps:
            return True
            
        ttl = self.ttl_settings.get(cache_type, 300)
        age = time.time() - self.cache_timestamps[key]
        return age > ttl
    
    def get(self, key, cache_type='default'):
        """Get value from cache if not expired"""
        with self.cache_lock:
            if key in self.cache and not self._is_expired(key, cache_type):
                return self.cache[key]
            return None
    
    def set(self, key, value, cache_type='default'):
        """Set value in cache with timestamp"""
        with self.cache_lock:
            self.cache[key] = value
            self.cache_timestamps[key] = time.time()
    
    def delete(self, key):
        """Remove specific key from cache"""
        with self.cache_lock:
            self.cache.pop(key, None)
            self.cache_timestamps.pop(key, None)
    
    def clear_pattern(self, pattern):
        """Clear all cache entries matching pattern"""
        with self.cache_lock:
            keys_to_delete = [k for k in self.cache.keys() if pattern in k]
            for key in keys_to_delete:
                self.cache.pop(key, None)
                self.cache_timestamps.pop(key, None)
    
    def get_stats(self):
        """Get cache statistics"""
        with self.cache_lock:
            total_entries = len(self.cache)
            current_time = time.time()
            expired_count = sum(1 for key in self.cache_timestamps 
                              if current_time - self.cache_timestamps[key] > 300)
            
            return {
                'total_entries': total_entries,
                'expired_entries': expired_count,
                'active_entries': total_entries - expired_count
            }

# Global cache instance
db_cache = DatabaseCache()

class BatchQueryOptimizer:
    """Optimize multiple database queries by batching and caching"""
    
    def __init__(self, db):
        self.db = db
        self.pending_glyph_reads = set()
        self.batch_delay = 0.1  # 100ms delay to collect batch requests
        self.batch_timer = None
        self.batch_lock = threading.Lock()
    
    def get_glyph_counts_batch(self, glyph_ids):
        """Get counts for multiple glyphs efficiently"""
        # Check cache first
        cached_counts = {}
        uncached_ids = []
        
        for glyph_id in glyph_ids:
            cache_key = f"counts_{glyph_id}"
            cached = db_cache.get(cache_key, 'glyph_counts')
            if cached:
                cached_counts[glyph_id] = cached
            else:
                uncached_ids.append(glyph_id)
        
        # Fetch uncached counts in batch
        if uncached_ids:
            batch_counts = self._fetch_counts_batch(uncached_ids)
            # Cache the results
            for glyph_id, counts in batch_counts.items():
                cache_key = f"counts_{glyph_id}"
                db_cache.set(cache_key, counts, 'glyph_counts')
            cached_counts.update(batch_counts)
        
        return cached_counts
    
    def _fetch_counts_batch(self, glyph_ids):
        """Fetch denormalized counts from glyph documents in batch"""
        counts = {}
        
        # Initialize all counts to zero
        for glyph_id in glyph_ids:
            counts[glyph_id] = {'views': 0, 'likes': 0, 'downloads': 0}
        
        try:
            # Batch read glyph documents (much more efficient than individual reads)
            batch_size = 10  # Firestore batch limit
            for i in range(0, len(glyph_ids), batch_size):
                batch_ids = glyph_ids[i:i + batch_size]
                
                # Use batch get for efficient reading
                refs = [self.db.collection('glyphs').document(gid) for gid in batch_ids]
                docs = self.db.get_all(refs)
                
                for doc in docs:
                    if doc.exists:
                        data = doc.to_dict()
                        glyph_id = doc.id
                        counts[glyph_id] = {
                            'views': data.get('views', 0),
                            'likes': data.get('likes', 0),
                            'downloads': data.get('downloads', 0)
                        }
                        
        except Exception as e:
            logger.error(f"Error in batch count fetch: {e}")
        
        return counts

class ReadOptimizer:
    """Main class for optimizing database reads"""
    
    def __init__(self, db):
        self.db = db
        self.batch_optimizer = BatchQueryOptimizer(db)
        
        # Track read statistics
        self.read_stats = defaultdict(int)
        self.last_stats_reset = time.time()
    
    def get_optimized_glyph_counts(self, glyph_ids):
        """Get glyph counts with aggressive caching"""
        self.read_stats['glyph_counts_requests'] += 1
        
        return self.batch_optimizer.get_glyph_counts_batch(glyph_ids)
    
    def get_cached_glyph(self, glyph_id):
        """Get glyph data with caching"""
        cache_key = f"glyph_{glyph_id}"
        cached = db_cache.get(cache_key, 'glyph_data')
        
        if cached:
            self.read_stats['cache_hits'] += 1
            return cached
        
        # Fetch from database
        self.read_stats['cache_misses'] += 1
        try:
            doc = self.db.collection('glyphs').document(glyph_id).get()
            if doc.exists:
                data = doc.to_dict()
                data['id'] = doc.id
                
                # Convert timestamp
                if 'createdAt' in data and data['createdAt']:
                    data['createdAt'] = data['createdAt'].isoformat()
                
                # Cache the result
                db_cache.set(cache_key, data, 'glyph_data')
                return data
        except Exception as e:
            logger.error(f"Error fetching glyph {glyph_id}: {e}")
        
        return None
    
    def get_popular_glyphs_cached(self, limit=20):
        """Get popular glyphs with long-term caching"""
        cache_key = f"popular_glyphs_{limit}"
        cached = db_cache.get(cache_key, 'popular_glyphs')
        
        if cached:
            return cached
        
        # This would be expensive to calculate fresh each time
        # We'll rely on the denormalized counts and cache the result
        try:
            docs = self.db.collection('glyphs').order_by('downloads', direction='DESCENDING').limit(limit).stream()
            popular_glyphs = []
            
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                if 'createdAt' in data and data['createdAt']:
                    data['createdAt'] = data['createdAt'].isoformat()
                popular_glyphs.append(data)
            
            # Cache for 15 minutes
            db_cache.set(cache_key, popular_glyphs, 'popular_glyphs')
            return popular_glyphs
            
        except Exception as e:
            logger.error(f"Error fetching popular glyphs: {e}")
            return []
    
    def invalidate_glyph_cache(self, glyph_id):
        """Invalidate cache when glyph is updated"""
        db_cache.delete(f"glyph_{glyph_id}")
        db_cache.delete(f"counts_{glyph_id}")
        # Clear popular lists as they might be affected
        db_cache.clear_pattern("popular_glyphs")
    
    def get_read_stats(self):
        """Get read optimization statistics"""
        stats = dict(self.read_stats)
        stats['cache_stats'] = db_cache.get_stats()
        stats['uptime'] = time.time() - self.last_stats_reset
        
        # Calculate hit rate
        total_requests = stats.get('cache_hits', 0) + stats.get('cache_misses', 0)
        if total_requests > 0:
            stats['cache_hit_rate'] = stats.get('cache_hits', 0) / total_requests
        else:
            stats['cache_hit_rate'] = 0
            
        return stats
    
    def reset_stats(self):
        """Reset read statistics"""
        self.read_stats.clear()
        self.last_stats_reset = time.time()

# Global read optimizer instance will be initialized in app.py
read_optimizer = None

def init_read_optimizer(db):
    """Initialize the global read optimizer"""
    global read_optimizer
    read_optimizer = ReadOptimizer(db)
    logger.info("Database read optimizer initialized")
    return read_optimizer
