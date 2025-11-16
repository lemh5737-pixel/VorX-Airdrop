import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, update, remove, onValue } from "firebase/database";

// Ganti dengan konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyDVfmpK8JKrQ9TPGrhWcYsdZinUEjX456g",
  authDomain: "vorx-airdrop.firebaseapp.com",
  databaseURL: "https://vorx-airdrop-default-rtdb.firebaseio.com",
  projectId: "vorx-airdrop",
  storageBucket: "vorx-airdrop.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef1234567890"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, set, get, update, remove, onValue };
