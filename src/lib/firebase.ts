import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBw9tjifiW_AtXTp-CU4YGOCsRV85rkDHM",
  authDomain: "traza-7257f.firebaseapp.com",
  projectId: "traza-7257f",
  storageBucket: "traza-7257f.firebasestorage.app",
  messagingSenderId: "236682116404",
  appId: "1:236682116404:web:d26f65e084f062528b7961",
  measurementId: "G-BB92BRWJJY"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
