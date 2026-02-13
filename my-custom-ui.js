/* FILE: my-custom-ui.js
   Tích hợp: CSS + Ghi đè thông báo (Alert/Confirm) + Toast 
*/

(function() {
    // --- 1. NHÚNG CSS TRỰC TIẾP VÀO JS ---
    const style = document.createElement('style');
    style.innerHTML = `
        .swal2-popup.my-swal-custom, .swal2-popup {
            font-family: 'Baloo 2', cursive !important;
            border-radius: 20px !important;
            padding: 2em !important;
        }
        .swal2-title {
            font-size: 24px !important;
            font-weight: 800 !important;
            color: #1a1a1a !important;
        }
        .swal2-styled.swal2-confirm {
            border-radius: 12px !important;
            padding: 10px 30px !important;
            font-weight: 600 !important;
        }
        .swal2-styled.swal2-cancel {
            border-radius: 12px !important;
            font-weight: 600 !important;
        }
        /* Hiệu ứng mượt mà khi hiện thông báo */
        .swal2-show {
            animation: swal2-show 0.3s !important;
        }
    `;
    document.head.appendChild(style);

    // --- 2. TỰ ĐỘNG TẢI SWEETALERT2 NẾU CHƯA CÓ ---
    if (!window.Swal) {
        const swalScript = document.createElement('script');
        swalScript.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(swalScript);
    }

    // --- 3. GHI ĐÈ HÀM ALERT MẶC ĐỊNH ---
    window.alert = function(message) {
        if (window.Swal) {
            Swal.fire({
                title: 'Thông báo',
                text: message,
                icon: 'info',
                confirmButtonColor: '#1a73e8',
                confirmButtonText: 'Đã hiểu'
            });
        } else {
            console.log("Dự phòng Alert gốc: " + message);
        }
    };

    // --- 4. HÀM CONFIRM ĐẸP (SỬ DỤNG ASYNC/AWAIT) ---
    window.myConfirm = async (title, text, confirmText = 'Đồng ý', icon = 'warning') => {
        if (!window.Swal) return confirm(text); // Dự phòng nếu thư viện chưa tải xong
        
        const result = await Swal.fire({
            title: title,
            text: text,
            icon: icon,
            showCancelButton: true,
            confirmButtonColor: '#ff4d4f',
            cancelButtonColor: '#8c8c8c',
            confirmButtonText: confirmText,
            cancelButtonText: 'Hủy'
        });
        return result.isConfirmed;
    };

    // --- 5. HÀM TOAST (THÔNG BÁO NHANH GÓC MÀN HÌNH) ---
    window.showToast = (icon, title) => {
        if (!window.Swal) return;
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
        Toast.fire({ icon, title });
    };

})();