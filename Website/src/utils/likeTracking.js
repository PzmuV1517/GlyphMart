import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from './firebase';

// Function to check if user has liked a glyph
export const hasUserLikedGlyph = async (glyphId, userId) => {
  if (!userId) return false;
  
  try {
    const likeDoc = await getDoc(doc(db, 'likes', `${glyphId}_${userId}`));
    return likeDoc.exists();
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
};

// Function to toggle like status
export const toggleGlyphLike = async (glyphId, userId) => {
  if (!userId) return false;
  
  try {
    const likeId = `${glyphId}_${userId}`;
    console.log('Toggling like for:', likeId);
    
    const isLiked = await hasUserLikedGlyph(glyphId, userId);
    console.log('Current like status:', isLiked);
    
    if (isLiked) {
      // Remove like
      console.log('Removing like');
      await deleteDoc(doc(db, 'likes', likeId));
      await updateDoc(doc(db, 'glyphs', glyphId), {
        likes: increment(-1)
      });
      return false; // Now unliked
    } else {
      // Add like
      console.log('Adding like');
      await setDoc(doc(db, 'likes', likeId), {
        glyphId,
        userId,
        likedAt: new Date()
      });
      await updateDoc(doc(db, 'glyphs', glyphId), {
        likes: increment(1)
      });
      return true; // Now liked
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return false;
  }
};

// Function to get all glyphs liked by a user
export const getUserLikedGlyphs = async (userId) => {
  if (!userId) return [];
  
  try {
    // First, try the new format with userId field
    let likesQuery = query(
      collection(db, 'likes'),
      where('userId', '==', userId)
    );
    
    let likesSnapshot = await getDocs(likesQuery);
    console.log(`Found ${likesSnapshot.docs.length} likes for user ${userId} in new format`);
    
    let glyphIds = [];
    
    if (likesSnapshot.docs.length > 0) {
      // New format exists
      glyphIds = likesSnapshot.docs.map(doc => {
        console.log('Like document:', doc.id, doc.data());
        return doc.data().glyphId;
      });
    } else {
      // Try to find old format likes (documents might have different structure)
      // Check all likes and see if any match our user ID pattern
      const allLikesQuery = query(collection(db, 'likes'));
      const allLikesSnapshot = await getDocs(allLikesQuery);
      
      allLikesSnapshot.docs.forEach(doc => {
        const docId = doc.id;
        const data = doc.data();
        console.log('Checking like document:', docId, data);
        
        // Check if document ID ends with our userId (new format)
        if (docId.endsWith(`_${userId}`)) {
          const glyphId = docId.replace(`_${userId}`, '');
          glyphIds.push(glyphId);
        }
        // Or if the document has userId field matching (new format)
        else if (data.userId === userId) {
          glyphIds.push(data.glyphId);
        }
      });
      
      console.log(`Found ${glyphIds.length} likes for user ${userId} in combined search`);
    }
    
    if (glyphIds.length === 0) return [];
    
    // Fetch the actual glyph documents
    const glyphs = [];
    for (const glyphId of glyphIds) {
      try {
        const glyphDoc = await getDoc(doc(db, 'glyphs', glyphId));
        if (glyphDoc.exists()) {
          glyphs.push({ id: glyphDoc.id, ...glyphDoc.data() });
        } else {
          console.log(`Glyph ${glyphId} does not exist`);
        }
      } catch (error) {
        console.error(`Error fetching glyph ${glyphId}:`, error);
      }
    }
    
    // Sort by creation date (newest first)
    const sortedGlyphs = glyphs.sort((a, b) => {
      const aDate = a.createdAt || new Date(0);
      const bDate = b.createdAt || new Date(0);
      return new Date(bDate) - new Date(aDate);
    });
    
    return sortedGlyphs;
  } catch (error) {
    console.error('Error getting user liked glyphs:', error);
    return [];
  }
};
