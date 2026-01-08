import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Configuração fornecida pelo usuário
const firebaseConfig = {
  apiKey: "AIzaSyBIdLRqRg5dTyD3A2YNkbGed6RhyXnDXLY",
  authDomain: "betmanager-2814a.firebaseapp.com",
  projectId: "betmanager-2814a",
  storageBucket: "betmanager-2814a.firebasestorage.app",
  messagingSenderId: "30401906434",
  appId: "1:30401906434:web:2a0a871d8ba11b9a3d241b",
  measurementId: "G-MY6DZ5BYN7"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços que o App.tsx e outros componentes utilizam
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);