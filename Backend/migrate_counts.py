#!/usr/bin/env python3
"""
One-time migration script to sync all glyph denormalized counts
with actual collection counts.

Usage: python migrate_counts.py
"""

import os
import sys
from datetime import datetime
from google.cloud import firestore

# Add the current directory to the path to import from app.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Initialize Firestore (same as in app.py)
db = firestore.Client()

def migrate_all_glyph_counts():
    """Migrate all glyph counts from collections to denormalized data"""
    print("Starting glyph count migration...")
    
    try:
        # Get all glyphs
        glyphs_query = db.collection('glyphs').stream()
        glyph_ids = [doc.id for doc in glyphs_query]
        
        print(f"Found {len(glyph_ids)} glyphs to migrate")
        
        total_synced = 0
        batch_size = 500  # Firestore batch limit
        
        # Process in batches of 500 (Firestore batch write limit)
        for i in range(0, len(glyph_ids), batch_size):
            batch_ids = glyph_ids[i:i + batch_size]
            batch = db.batch()
            batch_synced = 0
            
            print(f"Processing batch {i//batch_size + 1} ({len(batch_ids)} glyphs)...")
            
            for glyph_id in batch_ids:
                try:
                    # Get real counts from collections
                    views_docs = list(db.collection('glyphViews').where('glyphId', '==', glyph_id).stream())
                    likes_docs = list(db.collection('likes').where('glyphId', '==', glyph_id).stream())
                    downloads_docs = list(db.collection('glyphDownloads').where('glyphId', '==', glyph_id).stream())
                    
                    views_count = len(views_docs)
                    likes_count = len(likes_docs)
                    downloads_count = len(downloads_docs)
                    
                    # Update glyph document with correct counts
                    glyph_ref = db.collection('glyphs').document(glyph_id)
                    batch.update(glyph_ref, {
                        'views': views_count,
                        'likes': likes_count,
                        'downloads': downloads_count,
                        'lastCountSync': firestore.SERVER_TIMESTAMP
                    })
                    
                    batch_synced += 1
                    print(f"  {glyph_id}: views={views_count}, likes={likes_count}, downloads={downloads_count}")
                    
                except Exception as e:
                    print(f"  ERROR syncing {glyph_id}: {e}")
            
            # Commit this batch
            try:
                batch.commit()
                total_synced += batch_synced
                print(f"  ✅ Committed batch {i//batch_size + 1} ({batch_synced} glyphs)")
            except Exception as e:
                print(f"  ❌ Error committing batch {i//batch_size + 1}: {e}")
        
        print(f"\n🎉 Migration complete!")
        print(f"Total glyphs synced: {total_synced}/{len(glyph_ids)}")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False
    
    return True

def verify_migration():
    """Verify that the migration worked correctly"""
    print("\n🔍 Verifying migration...")
    
    # Sample a few glyphs to verify
    sample_glyphs = list(db.collection('glyphs').limit(5).stream())
    
    for doc in sample_glyphs:
        glyph_id = doc.id
        glyph_data = doc.to_dict()
        
        # Get current denormalized counts
        denorm_views = glyph_data.get('views', 0)
        denorm_likes = glyph_data.get('likes', 0)
        denorm_downloads = glyph_data.get('downloads', 0)
        
        # Get actual counts
        actual_views = len(list(db.collection('glyphViews').where('glyphId', '==', glyph_id).stream()))
        actual_likes = len(list(db.collection('likes').where('glyphId', '==', glyph_id).stream()))
        actual_downloads = len(list(db.collection('glyphDownloads').where('glyphId', '==', glyph_id).stream()))
        
        # Compare
        views_match = denorm_views == actual_views
        likes_match = denorm_likes == actual_likes
        downloads_match = denorm_downloads == actual_downloads
        
        status = "✅" if (views_match and likes_match and downloads_match) else "❌"
        
        print(f"{status} {glyph_id}:")
        print(f"    Views: {denorm_views} vs {actual_views} {'✅' if views_match else '❌'}")
        print(f"    Likes: {denorm_likes} vs {actual_likes} {'✅' if likes_match else '❌'}")
        print(f"    Downloads: {denorm_downloads} vs {actual_downloads} {'✅' if downloads_match else '❌'}")

def show_stats():
    """Show statistics about the current state"""
    print("📊 Current database statistics:")
    
    # Count documents in each collection
    glyphs_count = len(list(db.collection('glyphs').stream()))
    views_count = len(list(db.collection('glyphViews').stream()))
    likes_count = len(list(db.collection('likes').stream()))
    downloads_count = len(list(db.collection('glyphDownloads').stream()))
    
    print(f"  Glyphs: {glyphs_count}")
    print(f"  Views: {views_count}")
    print(f"  Likes: {likes_count}")
    print(f"  Downloads: {downloads_count}")

if __name__ == "__main__":
    print("🔄 Glyph Count Migration Tool")
    print("=" * 40)
    
    # Show current stats
    show_stats()
    
    # Ask for confirmation
    response = input("\n⚠️  This will update ALL glyph documents. Continue? (y/N): ")
    if response.lower() != 'y':
        print("Migration cancelled.")
        sys.exit(0)
    
    # Run migration
    success = migrate_all_glyph_counts()
    
    if success:
        # Verify results
        verify_migration()
        print("\n✅ Migration completed successfully!")
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)
