import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged 
};
export type { User as FirebaseAuthUser };

