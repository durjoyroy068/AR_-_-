import { LeaderboardEntry } from './storage';

export const firebaseConfig = {
  apiKey: 'AIzaSyCMGCd1uwROuk0SVjasuErVQGuXE6mxr5o',
  authDomain: 'ar-game-26a58.firebaseapp.com',
  projectId: 'ar-game-26a58',
  storageBucket: 'ar-game-26a58.firebasestorage.app',
  messagingSenderId: '337643843452',
  appId: '1:337643843452:web:0e0a1216f83259dbfe3ef9',
  measurementId: 'G-J00JWC1HW8',
};

let firestoreInstance: any = null;
let isInitialized = false;

/**
 * Get or initialize the Firestore database instance
 */
export function getFirestoreDb(): any {
  if (firestoreInstance) return firestoreInstance;

  if (typeof window !== 'undefined' && (window as any).firebase) {
    try {
      const fb = (window as any).firebase;
      if (!fb.apps || fb.apps.length === 0) {
        fb.initializeApp(firebaseConfig);
      }
      firestoreInstance = fb.firestore();
      isInitialized = true;
      return firestoreInstance;
    } catch (err) {
      console.warn('Firebase initialization warning:', err);
    }
  }
  return null;
}

/**
 * Save game score directly to Firebase Firestore Cloud Database
 */
export async function saveScoreToCloud(entry: LeaderboardEntry): Promise<boolean> {
  const db = getFirestoreDb();

  const docData = {
    id: entry.id,
    playerId: entry.playerId,
    playerName: entry.playerName,
    playerAvatar: entry.playerAvatar,
    gameType: entry.gameType,
    gameTitle: entry.gameTitle,
    score: Number(entry.score),
    mistakes: Number(entry.mistakes),
    accuracy: Number(entry.accuracy),
    timestamp: Number(entry.timestamp),
    formattedDate: entry.formattedDate,
  };

  // 1. Primary: Use Firebase SDK
  if (db) {
    try {
      await db.collection('leaderboard').doc(entry.id).set(docData, { merge: true });
      return true;
    } catch (err) {
      console.warn('Firestore SDK write error, trying REST fallback:', err);
    }
  }

  // 2. Fallback: Firebase Firestore REST API
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/leaderboard/${entry.id}?key=${firebaseConfig.apiKey}`;
    const restPayload = {
      fields: {
        id: { stringValue: entry.id },
        playerId: { stringValue: entry.playerId },
        playerName: { stringValue: entry.playerName },
        playerAvatar: { stringValue: entry.playerAvatar },
        gameType: { stringValue: entry.gameType },
        gameTitle: { stringValue: entry.gameTitle },
        score: { integerValue: String(entry.score) },
        mistakes: { integerValue: String(entry.mistakes) },
        accuracy: { integerValue: String(entry.accuracy) },
        timestamp: { integerValue: String(entry.timestamp) },
        formattedDate: { stringValue: entry.formattedDate },
      },
    };

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(restPayload),
    });

    return res.ok;
  } catch (restErr) {
    console.warn('Firestore REST write error:', restErr);
    return false;
  }
}

/**
 * Fetch all entries from Firebase Cloud
 */
export async function fetchCloudLeaderboard(): Promise<LeaderboardEntry[]> {
  const db = getFirestoreDb();

  // 1. Try Firebase SDK
  if (db) {
    try {
      const snap = await db
        .collection('leaderboard')
        .orderBy('score', 'desc')
        .limit(100)
        .get();

      const results: LeaderboardEntry[] = [];
      snap.forEach((doc: any) => {
        const d = doc.data();
        results.push({
          id: d.id || doc.id,
          playerId: d.playerId || '',
          playerName: d.playerName || 'শিক্ষার্থী',
          playerAvatar: d.playerAvatar || '🚀',
          gameType: d.gameType || 'equation',
          gameTitle: d.gameTitle || '',
          score: Number(d.score || 0),
          mistakes: Number(d.mistakes || 0),
          accuracy: Number(d.accuracy || 100),
          timestamp: Number(d.timestamp || Date.now()),
          formattedDate: d.formattedDate || '',
        });
      });
      return results;
    } catch (err) {
      console.warn('Firestore SDK fetch error, trying REST fallback:', err);
    }
  }

  // 2. Fallback: Firebase REST API
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/leaderboard?key=${firebaseConfig.apiKey}&pageSize=100`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    if (!json.documents || !Array.isArray(json.documents)) return [];

    return json.documents.map((doc: any) => {
      const f = doc.fields || {};
      const docName = doc.name ? doc.name.split('/').pop() : '';
      return {
        id: f.id?.stringValue || docName || `lead-${Math.random()}`,
        playerId: f.playerId?.stringValue || '',
        playerName: f.playerName?.stringValue || 'শিক্ষার্থী',
        playerAvatar: f.playerAvatar?.stringValue || '🚀',
        gameType: (f.gameType?.stringValue as any) || 'equation',
        gameTitle: f.gameTitle?.stringValue || '',
        score: Number(f.score?.integerValue || 0),
        mistakes: Number(f.mistakes?.integerValue || 0),
        accuracy: Number(f.accuracy?.integerValue || 100),
        timestamp: Number(f.timestamp?.integerValue || Date.now()),
        formattedDate: f.formattedDate?.stringValue || '',
      };
    });
  } catch (e) {
    console.warn('Firestore REST fetch failed:', e);
    return [];
  }
}

/**
 * Real-time subscription to cloud leaderboard updates
 */
export function subscribeCloudLeaderboard(
  onUpdate: (entries: LeaderboardEntry[]) => void
): () => void {
  const db = getFirestoreDb();

  if (db) {
    try {
      const unsubscribe = db
        .collection('leaderboard')
        .orderBy('score', 'desc')
        .limit(100)
        .onSnapshot(
          (snap: any) => {
            const results: LeaderboardEntry[] = [];
            snap.forEach((doc: any) => {
              const d = doc.data();
              results.push({
                id: d.id || doc.id,
                playerId: d.playerId || '',
                playerName: d.playerName || 'শিক্ষার্থী',
                playerAvatar: d.playerAvatar || '🚀',
                gameType: d.gameType || 'equation',
                gameTitle: d.gameTitle || '',
                score: Number(d.score || 0),
                mistakes: Number(d.mistakes || 0),
                accuracy: Number(d.accuracy || 100),
                timestamp: Number(d.timestamp || Date.now()),
                formattedDate: d.formattedDate || '',
              });
            });
            if (results.length > 0) {
              onUpdate(results);
            }
          },
          (err: any) => {
            console.warn('Real-time snapshot listener error:', err);
          }
        );

      return unsubscribe;
    } catch (e) {
      console.warn('Failed to attach snapshot listener:', e);
    }
  }

  // Fallback Polling every 10s if snapshot listener not available
  let isCancelled = false;
  const poll = async () => {
    if (isCancelled) return;
    const entries = await fetchCloudLeaderboard();
    if (!isCancelled && entries.length > 0) {
      onUpdate(entries);
    }
  };
  poll();
  const timer = setInterval(poll, 10000);

  return () => {
    isCancelled = true;
    clearInterval(timer);
  };
}
