// firebase-config.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCYOo3FUewsYVIVy-egCKxZfVDUjLmGAQo",
  authDomain: "warehouse-management-77290.firebaseapp.com",
  projectId: "warehouse-management-77290",
  storageBucket: "warehouse-management-77290.firebasestorage.app",
  messagingSenderId: "881477949386",
  appId: "1:881477949386:web:7133b60dd2e0bc5d9ca133",
  measurementId: "G-ESPCYW3ZN9"
};

// --- KHẮC PHỤC LỖI DUPLICATE APP ---
// Kiểm tra danh sách app đang chạy. Nếu có rồi thì lấy lại (getApp), chưa có mới tạo mới (initializeApp)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);