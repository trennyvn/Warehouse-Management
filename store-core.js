/* === FILE: store-core.js === */
import { db } from "/Warehouse-Management/firebase-config.js";
import { 
    doc, getDoc, collection, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ✅ 1. CHỈ KHAI BÁO DUY NHẤT TẠI ĐÂY
export const currentStoreId = localStorage.getItem('current_store_id');
export const userEmail = localStorage.getItem('userEmail');

// ✅ 2. HÀM LƯU LOG (Dùng chung cho toàn hệ thống)
export async function saveLog(action) {
    if (!currentStoreId) return;
    try {
        const logRef = collection(db, "warehouse_stores", currentStoreId, "inventory_logs");
        await addDoc(logRef, {
            storeId: currentStoreId,
            timestamp: serverTimestamp(),
            action: action,
            user: userEmail
        });
    } catch (e) {
        console.error("Lỗi lưu log:", e);
    }
}

// ✅ 3. KIỂM TRA QUYỀN TRUY CẬP (Chạy ngay khi load file)
async function checkAccess() {
    // Cho phép trang index và store không cần check ID
    const isPublicPage = window.location.pathname.includes('index.html') || 
                        window.location.pathname.includes('store.html') || 
                        window.location.pathname === '/Warehouse-Management/';

    if (!currentStoreId && !isPublicPage) {
        console.warn("Chưa chọn kho, điều hướng về trang chọn kho...");
        window.location.href = '/Warehouse-Management/store.html';
        return;
    }

    if (currentStoreId) {
        updateStoreUI();
    }
}

// ✅ 4. CẬP NHẬT TÊN KHO LÊN HEADER
async function updateStoreUI() {
    const nameDisplay = document.getElementById('storeNameDisplay');
    if (!nameDisplay) return;

    try {
        const storeRef = doc(db, "warehouse_stores", currentStoreId);
        const storeSnap = await getDoc(storeRef);

        if (storeSnap.exists()) {
            nameDisplay.innerText = storeSnap.data().name;
        }
    } catch (e) {
        console.error("Lỗi lấy tên kho:", e);
    }
}

// Thực thi kiểm tra ngay lập tức
checkAccess();
