// Function to get download count for a glyph
export const getGlyphDownloadCount = async (glyphId) => {
  try {
    const downloadsQuery = query(
      collection(db, 'glyphDownloads'),
      where('glyphId', '==', glyphId)
    );
    const downloadsSnapshot = await getDocs(downloadsQuery);
    return downloadsSnapshot.size;
  } catch (error) {
    console.error('Error getting download count:', error);
    return 0;
  }
};
import { doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Function to get user's IP address (using a public API)
export const getUserIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting IP:', error);
    // Fallback to a random identifier if IP service fails
    return `fallback_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Function to check if IP has already viewed this glyph
export const hasViewedGlyph = async (glyphId, userIP) => {
  try {
    const viewDoc = await getDoc(doc(db, 'glyphViews', `${glyphId}_${userIP}`));
    return viewDoc.exists();
  } catch (error) {
    console.error('Error checking view status:', error);
    return false;
  }
};

// Function to check if IP has already downloaded this glyph
export const hasDownloadedGlyph = async (glyphId, userIP) => {
  try {
    const downloadDoc = await getDoc(doc(db, 'glyphDownloads', `${glyphId}_${userIP}`));
    return downloadDoc.exists();
  } catch (error) {
    console.error('Error checking download status:', error);
    return false;
  }
};

// Function to record a view and increment count if it's a new view
export const recordGlyphView = async (glyphId) => {
  try {
    const userIP = await getUserIP();
    const viewId = `${glyphId}_${userIP}`;
    
    // Check if this IP has already viewed this glyph
    const alreadyViewed = await hasViewedGlyph(glyphId, userIP);
    
    if (!alreadyViewed) {
      // Record the view
      await setDoc(doc(db, 'glyphViews', viewId), {
        glyphId,
        userIP,
        viewedAt: new Date()
      });
      
      // Increment the view count on the glyph
      await updateDoc(doc(db, 'glyphs', glyphId), {
        views: increment(1)
      });
      
      return true; // New view recorded
    }
    
    return false; // Already viewed
  } catch (error) {
    console.error('Error recording view:', error);
    return false;
  }
};

// Function to record a download and increment count if it's a new download
export const recordGlyphDownload = async (glyphId) => {
  try {
    const userIP = await getUserIP();
    const downloadId = `${glyphId}_${userIP}`;
    
    // Check if this IP has already downloaded this glyph
    const alreadyDownloaded = await hasDownloadedGlyph(glyphId, userIP);
    
    if (!alreadyDownloaded) {
      // Record the download
      await setDoc(doc(db, 'glyphDownloads', downloadId), {
        glyphId,
        userIP,
        downloadedAt: new Date()
      });
      
      // Increment the download count on the glyph
      await updateDoc(doc(db, 'glyphs', glyphId), {
        downloads: increment(1)
      });
      
      return true; // New download recorded
    }
    
    return false; // Already downloaded
  } catch (error) {
    console.error('Error recording download:', error);
    return false;
  }
};

// Function to get view count for a glyph (optional, for debugging)
export const getGlyphViewCount = async (glyphId) => {
  try {
    const viewsQuery = query(
      collection(db, 'glyphViews'),
      where('glyphId', '==', glyphId)
    );
    const viewsSnapshot = await getDocs(viewsQuery);
    return viewsSnapshot.size;
  } catch (error) {
    console.error('Error getting view count:', error);
    return 0;
  }
};
