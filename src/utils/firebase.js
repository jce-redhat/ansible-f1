import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBdsZDpIDZOo1WaQGyDmnhQcsexNYtvbyI",
  authDomain: "ansible-arcade.firebaseapp.com",
  projectId: "ansible-arcade",
  storageBucket: "ansible-arcade.firebasestorage.app",
  messagingSenderId: "857760342450",
  appId: "1:857760342450:web:c3edfc0026dbafaa9a04ab",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const scoresRef = collection(db, "scores");

/**
 * Submit a score to the global leaderboard.
 * @param {string} name
 * @param {number} score
 * @param {string} level
 * @returns {Promise<void>}
 */
export async function submitGlobalScore(name, score, level) {
  try {
    await addDoc(scoresRef, {
      name: (name || "AAA").slice(0, 20),
      score: Math.floor(Math.max(0, Math.min(score, 999999))),
      level,
      ts: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Failed to submit global score:", err);
  }
}

/**
 * Fetch the top N scores from the global leaderboard.
 * @param {number} [max=50]
 * @returns {Promise<Array<{name:string, score:number, level:string}>>}
 */
export async function fetchGlobalLeaderboard(max = 50) {
  try {
    const q = query(scoresRef, orderBy("score", "desc"), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return { name: data.name, score: data.score, level: data.level || "?" };
    });
  } catch (err) {
    console.warn("Failed to fetch global leaderboard:", err);
    return [];
  }
}
