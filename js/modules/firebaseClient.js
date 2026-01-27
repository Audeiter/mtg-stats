/**
 * Módulo Firebase Client
 * Inicializa e exporta a instância do Firebase
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, writeBatch, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCOHP_pb8H_fQEqYG9S8OteLk4E-7dmTUU",
  authDomain: "registro-mtg.firebaseapp.com",
  projectId: "registro-mtg",
  storageBucket: "registro-mtg.firebasestorage.app",
  messagingSenderId: "723737182903",
  appId: "1:723737182903:web:1475d4d8d8f76639d00332"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const projectId = firebaseConfig.projectId;

/**
 * Autentica anonimamente no Firebase
 */
export async function signIn() {
  return await signInAnonymously(auth);
}

/**
 * Busca todos as partidas do Firebase
 */
export async function fetchMatchesFromFirebase() {
  const ref = collection(db, `artifacts/${projectId}/public/data/matches`);
  const snapshot = await getDocs(ref);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Atualiza uma partida
 */
export async function updateMatch(matchId, data) {
  const ref = doc(db, `artifacts/${projectId}/public/data/matches`, matchId);
  return await updateDoc(ref, data);
}

/**
 * Deleta uma partida
 */
export async function deleteMatch(matchId) {
  const ref = doc(db, `artifacts/${projectId}/public/data/matches`, matchId);
  return await deleteDoc(ref);
}

/**
 * Executa batch update
 */
export function createBatch() {
  return writeBatch(db);
}

/**
 * Retorna referência de documento para batch
 */
export function getDocRef(matchId) {
  return doc(db, `artifacts/${projectId}/public/data/matches`, matchId);
}
