import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics"; 

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQxJMdG17MS-LagDLSl3TMagXWsg6oB7Q",
  authDomain: "roadguardianai-b8e4f.firebaseapp.com",
  projectId: "roadguardianai-b8e4f",
  storageBucket: "roadguardianai-b8e4f.firebasestorage.app",
  messagingSenderId: "552947082266",
  appId: "1:552947082266:web:97140540a4d75284925da3",
  measurementId: "G-Q2MGY1NNQT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
