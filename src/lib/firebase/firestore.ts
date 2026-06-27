import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  addDoc,
} from 'firebase/firestore';
import { db } from './config';

// --- Collection References ---
export const roomsRef = collection(db, 'rooms');

export function playersRef(roomId: string) {
  return collection(db, 'rooms', roomId, 'players');
}

export function movesRef(roomId: string) {
  return collection(db, 'rooms', roomId, 'moves');
}

export function chatRef(roomId: string) {
  return collection(db, 'rooms', roomId, 'chat');
}

// --- Room Operations ---

export async function createRoom(roomData: DocumentData) {
  const roomDoc = doc(roomsRef);
  await setDoc(roomDoc, {
    ...roomData,
    createdAt: serverTimestamp(),
  });
  return roomDoc.id;
}

export async function getRoom(roomId: string) {
  const roomDoc = await getDoc(doc(db, 'rooms', roomId));
  if (!roomDoc.exists()) return null;
  return { id: roomDoc.id, ...roomDoc.data() };
}

export async function updateRoom(roomId: string, data: DocumentData) {
  await updateDoc(doc(db, 'rooms', roomId), data);
}

export async function deleteRoom(roomId: string) {
  await deleteDoc(doc(db, 'rooms', roomId));
}

// --- Player Operations ---

export async function addPlayer(roomId: string, playerId: string, playerData: DocumentData) {
  await setDoc(doc(db, 'rooms', roomId, 'players', playerId), {
    ...playerData,
    joinedAt: serverTimestamp(),
  });
}

export async function updatePlayer(roomId: string, playerId: string, data: DocumentData) {
  await updateDoc(doc(db, 'rooms', roomId, 'players', playerId), data);
}

export async function removePlayer(roomId: string, playerId: string) {
  await deleteDoc(doc(db, 'rooms', roomId, 'players', playerId));
}

// --- Move Operations ---

export async function submitMove(roomId: string, moveData: DocumentData) {
  return await addDoc(movesRef(roomId), {
    ...moveData,
    timestamp: serverTimestamp(),
    processed: false,
  });
}

// --- Chat Operations ---

export async function sendChatMessage(roomId: string, messageData: DocumentData) {
  return await addDoc(chatRef(roomId), {
    ...messageData,
    timestamp: serverTimestamp(),
  });
}

// --- Realtime Listeners ---

export function onRoomSnapshot(roomId: string, callback: (data: DocumentData | null) => void) {
  return onSnapshot(doc(db, 'rooms', roomId), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  });
}

export function onPlayersSnapshot(roomId: string, callback: (players: DocumentData[]) => void) {
  return onSnapshot(playersRef(roomId), (snapshot) => {
    const players = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(players);
  });
}

export function onChatSnapshot(
  roomId: string,
  callback: (messages: DocumentData[]) => void,
  messageLimit: number = 50
) {
  const q = query(chatRef(roomId), orderBy('timestamp', 'asc'), limit(messageLimit));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
}

export function onMovesSnapshot(roomId: string, callback: (moves: DocumentData[]) => void) {
  const q = query(movesRef(roomId), where('processed', '==', false), orderBy('timestamp', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const moves = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(moves);
  });
}

// --- Query Helpers ---

export async function getAvailableRooms() {
  const q = query(roomsRef, where('status', '==', 'waiting'), orderBy('createdAt', 'desc'), limit(20));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export { serverTimestamp, Timestamp };
