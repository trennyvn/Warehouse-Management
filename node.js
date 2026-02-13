const admin = require('firebase-admin');
const path = require('path');

// 1. Khai báo đường dẫn đến file key
const serviceAccount = require("./serviceAccountKey.json");

// 2. Khởi tạo Admin với đầy đủ thông tin từ file JSON
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Ép buộc nhận Project ID từ file JSON để sửa lỗi bạn đang gặp
  projectId: serviceAccount.project_id 
});

const db = admin.firestore();

async function findInventoryLogs() {
  console.log("--- Đang bắt đầu quét tìm vị trí 'inventory_logs' ---");
  
  try {
    // Tìm kiếm trong tất cả các collection có tên là inventory_logs
    const querySnapshot = await db.collectionGroup('inventory_logs').limit(5).get();

    if (querySnapshot.empty) {
      console.log("❌ Không tìm thấy dữ liệu nào. Có thể tên collection trong code khác với Index.");
    } else {
      console.log(`✅ Tìm thấy ${querySnapshot.size} tài liệu!`);
      querySnapshot.forEach(doc => {
        console.log("\n📍 ĐƯỜNG DẪN THỰC TẾ TRÊN FIREBASE:");
        console.log("------------------------------------------------------------");
        console.log(doc.ref.path);
        console.log("------------------------------------------------------------");
      });
      console.log("\n👉 Bạn hãy nhìn vào đường dẫn trên, bạn sẽ thấy nó nằm sau Document nào.");
    }
  } catch (error) {
    console.error("Lỗi khi truy vấn:", error);
  }
}

findInventoryLogs();  