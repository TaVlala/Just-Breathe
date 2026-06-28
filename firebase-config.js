// Firebase Cloud Integration for "Jus Breathe"
// Loads Firestore SDK dynamically from gstatic CDN

let db = null;
let activeUnsubscribe = null;

// Fallback Mock database for offline/no-keys usage
class MockDb {
  constructor() {
    console.log("Jus Breathe: Using Local Offline database.");
  }
  async save(syncKey, data) {
    localStorage.setItem(`cloud_mock_${syncKey}`, JSON.stringify(data));
    return true;
  }
  async load(syncKey) {
    const data = localStorage.getItem(`cloud_mock_${syncKey}`);
    return data ? JSON.parse(data) : null;
  }
}

const mockDbInstance = new MockDb();

// Default placeholder keys (User can replace these with their own Firebase project settings)
const firebaseConfig = {
  apiKey: "PLACEHOLDER_API_KEY",
  authDomain: "jus-breathe-app.firebaseapp.com",
  projectId: "jus-breathe-app",
  storageBucket: "jus-breathe-app.appspot.com",
  messagingSenderId: "PLACEHOLDER_SENDER_ID",
  appId: "PLACEHOLDER_APP_ID"
};

export async function initFirebase() {
  if (db) return db;

  // If the user hasn't configured Firebase yet, use the local mock
  if (firebaseConfig.apiKey === "PLACEHOLDER_API_KEY") {
    db = mockDbInstance;
    return db;
  }

  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase Firestore Initialized Successfully.");
    return db;
  } catch (error) {
    console.warn("Failed to load Firebase, falling back to Local Mock Database:", error);
    db = mockDbInstance;
    return db;
  }
}

// Generate a random 3-word Sync Key (e.g., 'calm-forest-102')
export function generateSyncKey() {
  const adjectives = [
    "calm", "serene", "peaceful", "silent", "gentle", "clear", "warm", "cool", 
    "deep", "pure", "soft", "light", "fresh", "tranquil", "quiet", "mindful"
  ];
  const nouns = [
    "forest", "ocean", "river", "lake", "mountain", "valley", "sky", "breeze", 
    "meadow", "garden", "cloud", "sunset", "desert", "stream", "haven", "temple"
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 900) + 100; // 100-999
  return `${adj}-${noun}-${num}`;
}

// Save all user data (presets, stats, history) in a single document for atomic updates
export async function syncUserDataToCloud(syncKey, data) {
  const database = await initFirebase();
  if (database instanceof MockDb) {
    return await database.save(syncKey, data);
  }

  try {
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const docRef = doc(database, "users", syncKey);
    await setDoc(docRef, {
      ...data,
      lastSynced: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Cloud sync failed:", error);
    return false;
  }
}

// Load user data once
export async function loadUserDataFromCloud(syncKey) {
  const database = await initFirebase();
  if (database instanceof MockDb) {
    return await database.load(syncKey);
  }

  try {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const docRef = doc(database, "users", syncKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Cloud load failed:", error);
    return null;
  }
}

// Subscribe to real-time updates for multi-device sync
export async function subscribeToUserData(syncKey, onUpdate) {
  const database = await initFirebase();
  
  if (activeUnsubscribe) {
    activeUnsubscribe();
    activeUnsubscribe = null;
  }

  if (database instanceof MockDb) {
    // For mock, just trigger once immediately
    const data = await database.load(syncKey);
    if (data) onUpdate(data);
    return () => {};
  }

  try {
    const { doc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const docRef = doc(database, "users", syncKey);
    
    activeUnsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data());
      }
    }, (error) => {
      console.warn("Firestore snapshot subscription error:", error);
    });

    return activeUnsubscribe;
  } catch (error) {
    console.error("Cloud subscription failed:", error);
    return () => {};
  }
}
