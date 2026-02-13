/* === FILE: store-core.js (Đã cập nhật) === */
import { db } from "/Warehouse-Management/firebase-config.js";
// Thêm collection và getDocs vào đây
// Ví dụ cách ghi log để khớp với Index ở Hình 1
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

async function saveLog(action) {
    const logRef = collection(db, "warehouse_stores", currentStoreId, "inventory_logs");
    await addDoc(logRef, {
        storeId: currentStoreId, // Khớp với Index field 1
        timestamp: serverTimestamp(), // Khớp với Index field 2
        action: action
    });
}




// 2. Bảo vệ trang web
async function checkAccess() {
    const isIndexPage = window.location.pathname.includes('index.html') || 
                        window.location.pathname.includes('store.html') || 
                        window.location.pathname === '/';

    if (!currentStoreId && !isIndexPage) {
        alert("Vui lòng chọn cửa hàng trước!");
        window.location.href = '/store.html'; // Đưa về trang chọn kho
        return;
    }

    if (currentStoreId) {
        await updateStoreUI();
    }
}

// 3. Hàm lấy dữ liệu tên kho từ Firebase thay vì LocalStorage để đảm bảo "Nhìn thấy chung"
async function updateStoreUI() {
    try {
        const storeRef = doc(db, "warehouse_stores", currentStoreId);
        const storeSnap = await getDoc(storeRef);

        if (storeSnap.exists()) {
            const storeData = storeSnap.data();
                        // Tìm đoạn này trong store-core.js
            const nameDisplay = document.getElementById('storeNameDisplay');
    if (nameDisplay) { // Chỉ chạy nếu tìm thấy thẻ này trên trang
        nameDisplay.innerText = storeData.name;
    }
            // Cập nhật lại tên vào localStorage để dùng nhanh khi cần
            localStorage.setItem('storeName', storeData.name);
        } else {
            console.log("Kho này không tồn tại trên hệ thống chung!");
        }
    } catch (e) {
        console.error("Lỗi lấy thông tin kho:", e);
    }
}

// 4. OBJECT QUẢN LÝ DATABASE (StoreDB) - Chuyển hướng tư duy
// Lưu ý: Vì Firebase là bất đồng bộ (async), việc dùng StoreDB.get() kiểu cũ sẽ hơi khó.
// Bạn nên chuyển dần sang dùng trực tiếp hàm của Firebase trong từng file item.
const StoreDB = {
    // Để lại cái này để không làm lỗi các file cũ đang gọi nó, 
    // nhưng bạn nên sớm thay thế bằng hàm Firestore thực thụ.
    get: (key) => JSON.parse(localStorage.getItem(currentStoreId + '_' + key)), 
    set: (key, val) => localStorage.setItem(currentStoreId + '_' + key, JSON.stringify(val))
};

// Chạy kiểm tra khi trang load
checkAccess();



// Xuất hàm này ra để dùng ở trang store.html

export { currentStoreId, StoreDB, getAllStores };
