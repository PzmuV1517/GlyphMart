import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Function to check if user has liked a glyph (glyphLikes collection)
export const hasUserLikedGlyph = async (glyphId, userId) => {
  if (!userId) return false;
  try {
    const likesQuery = query(
      collection(db, 'glyphLikes'),
      where('glyphId', '==', glyphId),
      where('userId', '==', userId)
    );
    const likesSnapshot = await getDocs(likesQuery);
    return !likesSnapshot.empty;
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
};

// Function to toggle like status (glyphLikes collection)
export const toggleGlyphLike = async (glyphId, userId) => {
  if (!userId) return false;
  try {
    // Check if like exists
    const likesQuery = query(
      collection(db, 'glyphLikes'),
      where('glyphId', '==', glyphId),
      where('userId', '==', userId)
    );
    const likesSnapshot = await getDocs(likesQuery);
    if (!likesSnapshot.empty) {
      // Remove like
      const likeDocId = likesSnapshot.docs[0].id;
      await deleteDoc(doc(db, 'glyphLikes', likeDocId));
      await updateDoc(doc(db, 'glyphs', glyphId), {
        likes: increment(-1)
      });
      return false; // Now unliked
    } else {
      // Add like
      const newLikeRef = doc(collection(db, 'glyphLikes'));
      await setDoc(newLikeRef, {
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

// Function to get all glyphs liked by a user (glyphLikes collection)
export const getUserLikedGlyphs = async (userId) => {
  if (!userId) return [];
  try {
    const likesQuery = query(
      collection(db, 'glyphLikes'),
      where('userId', '==', userId)
    );
    const likesSnapshot = await getDocs(likesQuery);
    const glyphIds = likesSnapshot.docs.map(doc => doc.data().glyphId);
    if (glyphIds.length === 0) return [];
    // Fetch the actual glyph documents
    const glyphs = [];
    for (const glyphId of glyphIds) {
      try {
        const glyphDoc = await getDoc(doc(db, 'glyphs', glyphId));
        if (glyphDoc.exists()) {
          glyphs.push({ id: glyphDoc.id, ...glyphDoc.data() });
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
