import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDPKkKIS3Uza3WiHFlY7-0W_TlLI458DRE',
  authDomain: 'lifeline-fyp-ad625.firebaseapp.com',
  databaseURL: 'https://lifeline-fyp-ad625-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'lifeline-fyp-ad625',
  storageBucket: 'lifeline-fyp-ad625.firebasestorage.app',
  messagingSenderId: '231188424645',
  appId: '1:231188424645:web:53fc295e21535c8e08cdac',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
