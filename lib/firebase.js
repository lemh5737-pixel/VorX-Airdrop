// /lib/firebase.js
import { initializeApp } from "firebase/app";
// PADA BARIS INI, kita impor SEMUA fungsi yang dibutuhkan
import { getDatabase, ref, set, onValue, get, update, remove } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDVfmpK8JKrQ9TPGrhWcYsdZinUEjX456g",
  authDomain: "vorx-airdrop.firebaseapp.com",
  databaseURL: "https://vorx-airdrop-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "vorx-airdrop",
  storageBucket: "vorx-airdrop.firebasestorage.app",
  messagingSenderId: "970290076932",
  appId: "1:970290076932:web:bb5faac5d72314687a8451",
  measurementId: "G-VB15TWX340"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Sekarang kita bisa mengekspor semua fungsi ini dengan aman
export { database, ref, set, onValue, get, update, remove };
