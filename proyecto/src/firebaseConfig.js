import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAkDB-87C5lyUYdSF_xqNrLFSjDtlEYt24",
  authDomain: "dcapi-42b69.firebaseapp.com",
  projectId: "dcapi-42b69",
  storageBucket: "dcapi-42b69.firebasestorage.app",
  messagingSenderId: "319160684765",
  appId: "1:319160684765:web:64e502441e0f1ce9f5cb34"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // ✅ ¡Esto es necesario!

export { auth, db };