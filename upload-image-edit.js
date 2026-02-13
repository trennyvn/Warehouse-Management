/* ============================================================
    1. KHAI BÁO BIẾN TOÀN CỤC & TRẠNG THÁI
   ============================================================ */
   
let currentOriginalImage = null;
let ctx = null; 
let isDragging = false;
let isDrawing = false;
let lastMouseX, lastMouseY;
let brushType = 'hard'; 
let colorMode = 'RGB'; 

let currentMode = 'brush'; 
let state = { x: 0, y: 0, scale: 1, mode: 'hand', minScale: 0.1, maxScale: 5 };

let isCropping = false;
let cropAction = null; 
let cropStart = { x: 0, y: 0, w: 0, h: 0, mx: 0, my: 0, dir: '' };

let colorState = { h: 0, s: 100, v: 100, r: 255, g: 0, b: 0 }; 
let cursorX = 0, cursorY = 0;
let isCursorRunning = false;


/* ============================================================
    2. QUẢN LÝ UPLOAD & MODAL
   ============================================================ */
function triggerUpload(e) {
    if(e) e.stopPropagation();
    let input = document.getElementById('customerImageInput');
    if (!input) input = document.getElementById('supplierImageInput');
    if(input) input.click();
}

function uploadImage(event) {
    const file = event.target.files[0];
    const inputElement = event.target;
    
    if (!file) { 
        inputElement.value = ''; 
        return; 
    }

    // Cho phép file lớn hơn vì ta sẽ nén nó lại sau
    const maxSize = 20 * 1024 * 1024; 

    if (file.size > maxSize) {
        alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 20MB.");
        inputElement.value = ''; 
        return;
    }

    const oldModal = document.getElementById('modalCrop');
    if (oldModal) oldModal.remove();
    const oldBrushBox = document.getElementById('brush-box');
    if (oldBrushBox) oldBrushBox.remove();
    const oldCursor = document.getElementById('brush-cursor');
    if (oldCursor) oldCursor.remove();

    createCropModal(); 

    const reader = new FileReader();
    reader.onload = function(e) {
        currentOriginalImage = new Image();
        currentOriginalImage.crossOrigin = "Anonymous"; 
        
        currentOriginalImage.onload = function() {
            const modal = document.getElementById('modalCrop');
            if (modal) {
                modal.style.display = 'flex'; 
                setTimeout(() => {
                    initArena(); 
                    setMode('hand');
                }, 100);
            }
        };
        
        currentOriginalImage.onerror = function() {
            alert("Lỗi: Không thể đọc định dạng ảnh này.");
            closeCropModal();
        };

        currentOriginalImage.src = e.target.result;
        inputElement.value = ''; 
    };
    reader.readAsDataURL(file);
}

function closeCropModal() {
    const modal = document.getElementById('modalCrop');
    if (modal) { modal.style.display = 'none'; modal.remove(); }
    
    const inputC = document.getElementById('customerImageInput');
    if (inputC) inputC.value = ''; 
    const inputS = document.getElementById('supplierImageInput');
    if (inputS) inputS.value = ''; 

    const cursor = document.getElementById('brush-cursor');
    if(cursor) cursor.remove();
    const brushBox = document.getElementById('brush-box');
    if(brushBox) brushBox.remove();
}

/* ============================================================
    3. KHỞI TẠO UI (SCOPED CSS)
   ============================================================ */
function createCropModal() {
    if (document.getElementById('modalCrop')) return;

    const html = `
    <style>
        #modalCrop { font-family: 'Segoe UI', sans-serif; user-select: none; box-sizing: border-box; }
        #modalCrop * { box-sizing: border-box; }
        #modalCrop input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; }
        #modalCrop input[type=range]:focus { outline: none; }
        #modalCrop input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #007bff; cursor: pointer; margin-top: -6px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        #modalCrop input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #ddd; border-radius: 2px; }

        #crop-box { position: absolute; z-index: 10; border: 2px solid #fff; box-shadow: 0 0 0 1px #007bff, 0 0 0 9999px rgba(0, 0, 0, 0.6); cursor: move; display: none; align-items: center; justify-content: center; }
        .crop-handle { position: absolute; width: 14px; height: 14px; background: #007bff; border: 2px solid #fff; border-radius: 50%; z-index: 11; transition: transform 0.1s; }
        .crop-handle:hover { transform: scale(1.2); }
        .handle-tl { top: -7px; left: -7px; cursor: nwse-resize; }
        .handle-tr { top: -7px; right: -7px; cursor: nesw-resize; }
        .handle-bl { bottom: -7px; left: -7px; cursor: nesw-resize; }
        .handle-br { bottom: -7px; right: -7px; cursor: nwse-resize; }

        #brush-cursor { position: fixed; top: 0; left: 0; pointer-events: none; z-index: 9999; border: 1px solid rgba(0,0,0,0.5); box-shadow: 0 0 0 1px rgba(255,255,255,0.8); border-radius: 50%; display: none; will-change: transform; transform: translate3d(-100px, -100px, 0); }

        .toolbar-btn { width: 48px; height: 48px; border-radius: 12px; border: none; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); position: relative; }
        .toolbar-btn:hover { background: #ffffff; transform: scale(0.92); outline: 1.25px solid #cacaca; outline-offset: 2.5px; box-shadow: 0 4px 10px rgba(0, 86, 224, 0.4); }
        .toolbar-btn i { color: #444; font-size: 20px !important; pointer-events: none; transition: color 0.2s ease; }
        .toolbar-btn:hover i { color: #0056e0 !important; }
        .toolbar-btn.active { background: #007bff; box-shadow: 0 4px 10px rgba(0,123,255,0.3); }
        .toolbar-btn.active i { color: #fff !important; }

        #modalCrop .fa, #modalCrop .fas, #modalCrop .fa-solid { font-family: "Font Awesome 6 Free" !important; font-weight: 900 !important; display: inline-block !important; }

        .modal-main-box { background:#fff; width:90%; max-width:1100px; border-radius:16px; overflow:hidden; display:flex; flex-direction:column; position:relative; height: 85vh; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .modal-top-bar { padding: 12px 24px; border-bottom: 1px solid #eee; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; background: #fff; }
        .modal-top-bar div:nth-child(1) { text-align: center; grid-column: 2; }
        .modal-top-bar .close-modal-btn { justify-self: end; }
        .close-modal-btn { outline: 2px solid #666; outline-offset: -2.5px; cursor:pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color:#999; font-size: 20px; transition: all 0.2s; }
        .close-modal-btn:hover { background: #fff; color: #dc2626; transform: rotate(90deg); outline: 1px solid #dc2626; outline-offset: 2.5px; }

        .modal-footer-bar { padding:15px 24px; border-top:1px solid #eee; display:flex; align-items:center; gap:20px; background:#fff; }
        .save-btn { padding:10px 30px; background: #007bff; outline:none; color:#fff; border:none; border-radius:10px; font-weight:700; font-size: 15px; cursor:pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(0,123,255,0.2); }
        .save-btn:hover { color:#007bff; background:#fff; outline:2px solid #666; transform: translateY(-1px); }
    </style>

    <div id="modalCrop" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter: blur(5px); z-index:9999; align-items:center; justify-content:center;">
        <div id="brush-cursor"></div>
        <div id="mainModalBox" class="modal-main-box">
            <div class="modal-top-bar">
                <div style="font-size: 22.5px; font-weight: 700; color: #333;">Chỉnh sửa ảnh</div>
                <div class="close-modal-btn" onclick="closeCropModal()" title="Đóng"><i class="fa-solid fa-xmark"></i></div>
            </div>
            <div style="flex:1; display:flex; background:#f0f2f5; position:relative; overflow:hidden;">
                <div id="arena-container" style="flex:1; background:#1e1e1e; position:relative; overflow:hidden; cursor:grab;"></div>
                <div id="toolbar" style="width:80px; background:#fff; border-left:1px solid #eee; display:flex; flex-direction:column; align-items:center; gap:16px; padding-top:24px;">
                    <button id="btnFit" class="toolbar-btn" onclick="autoFitArena()" title="Fit ảnh"><i class="fa-solid fa-expand"></i></button>
                    <button id="btnHand" class="toolbar-btn" onclick="setMode('hand')" title="Kéo thả"><i class="fa-solid fa-hand"></i></button>
                    <button id="btnCrop" class="toolbar-btn" onclick="activateTool('crop')" title="Cắt ảnh (Vuông)"><i class="fa-solid fa-crop-simple"></i></button>
                    <button id="btnDraw" class="toolbar-btn" onclick="setMode('draw')" title="Vẽ tay"><i class="fa-solid fa-paintbrush"></i></button>
                </div>
            </div>
            <div class="modal-footer-bar">
                <div style="display:flex; align-items:center; gap:15px; flex:1; color: #555; font-size: 14px; font-weight: 500;">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input type="range" id="zoomSlider" min="0.1" max="5" step="0.01" value="1" style="flex:1; cursor:pointer;">
                    <span id="zoomPercent" style="width: 45px; text-align: right;">100%</span>
                </div>
                <button id="btnSaveResult" class="save-btn" onclick="applyResult()">Lưu & Sử dụng</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    addBrushBoxToArena(document.getElementById('mainModalBox'));
    document.getElementById('zoomSlider').addEventListener('input', (e) => updateZoom(parseFloat(e.target.value)));
}

function initArena() {
    const container = document.getElementById('arena-container');
    if (!container || !currentOriginalImage) return;
    container.innerHTML = ''; 
    container.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault(); 
            let newScale = state.scale - (Math.sign(e.deltaY) * 0.1 * state.scale);
            newScale = Math.max(state.minScale, Math.min(state.maxScale, newScale));
            updateZoom(newScale);
            document.getElementById('zoomSlider').value = newScale;
        }
    }, { passive: false });

    const imgW = currentOriginalImage.naturalWidth;
    const imgH = currentOriginalImage.naturalHeight;
    state.canvasPadding = 2000; 

    const wrapper = document.createElement('div');
    wrapper.id = 'layer-wrapper';
    Object.assign(wrapper.style, { position: 'absolute', top: '0px', left: '0px', transformOrigin: '0 0', width: (imgW + state.canvasPadding) + 'px', height: (imgH + state.canvasPadding) + 'px' });

    const imgEl = document.createElement('img');
    imgEl.id = 'main-img-layer';
    imgEl.src = currentOriginalImage.src;
    Object.assign(imgEl.style, { position: 'absolute', zIndex: '1', pointerEvents: 'none', left: (state.canvasPadding / 2) + 'px', top: (state.canvasPadding / 2) + 'px', display: 'block' });

    const canvasEl = document.createElement('canvas');
    canvasEl.id = 'drawing-layer';
    canvasEl.width = imgW + state.canvasPadding;
    canvasEl.height = imgH + state.canvasPadding;
    Object.assign(canvasEl.style, { position: 'absolute', zIndex: '5', left: '0px', top: '0px' });

    const cropBox = document.createElement('div');
    cropBox.id = 'crop-box';
    cropBox.innerHTML = `<div class="crop-handle handle-tl" data-dir="tl"></div><div class="crop-handle handle-tr" data-dir="tr"></div><div class="crop-handle handle-bl" data-dir="bl"></div><div class="crop-handle handle-br" data-dir="br"></div>`;
    
    wrapper.appendChild(imgEl); wrapper.appendChild(canvasEl); wrapper.appendChild(cropBox);
    container.appendChild(wrapper);
    ctx = canvasEl.getContext('2d');
    setTimeout(() => { autoFitArena(); setMode('hand'); }, 50);
}

function updateZoom(newScale) {
    const container = document.getElementById('arena-container');
    if (!container) return;
    const oldScale = state.scale;
    state.scale = newScale;
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    const mouseX = (cx - state.x) / oldScale;
    const mouseY = (cy - state.y) / oldScale;
    state.x = cx - mouseX * newScale;
    state.y = cy - mouseY * newScale;
    document.getElementById('zoomPercent').innerText = Math.round(newScale * 100) + '%';
    updateTransform();
    updateBrushCursorSize();
}

function autoFitArena() {
    const container = document.getElementById('arena-container');
    if (!container || !currentOriginalImage) return;
    const contW = container.clientWidth;
    const contH = container.clientHeight;
    const imgW = currentOriginalImage.naturalWidth;
    const imgH = currentOriginalImage.naturalHeight;
    const p = state.canvasPadding / 2;

    let ratio = Math.min((contW * 0.8) / imgW, (contH * 0.8) / imgH);
    state.scale = ratio;
    state.x = (contW / 2) - ((p + imgW / 2) * state.scale);
    state.y = (contH / 2) - ((p + imgH / 2) * state.scale);

    const cropBox = document.getElementById('crop-box');
    if (cropBox) {
        const cropSize = Math.min(imgW, imgH);
        cropBox.style.left = (p + (imgW - cropSize) / 2) + 'px';
        cropBox.style.top = (p + (imgH - cropSize) / 2) + 'px';
        cropBox.style.width = cropSize + 'px';
        cropBox.style.height = cropSize + 'px';
    }

    const slider = document.getElementById('zoomSlider');
    state.minScale = ratio / 4; state.maxScale = ratio * 10;
    slider.min = state.minScale; slider.max = state.maxScale; slider.value = state.scale;
    document.getElementById('zoomPercent').innerText = Math.round(state.scale * 100) + '%';
    updateTransform();
}

function updateTransform() {
    const wrapper = document.getElementById('layer-wrapper');
    if (wrapper) wrapper.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
}

function addBrushBoxToArena(parent) {
    const oldBox = document.getElementById('brush-box');
    if (oldBox) oldBox.remove();

    const html = `
    <style>
        #brush-box { font-family: 'Segoe UI', sans-serif; font-size: 13px; color: #333; animation: fadeIn 0.2s ease; }
        #brush-box .brush-range { -webkit-appearance: none; width: 100%; height: 6px; background: #eee; border-radius: 5px; outline: none; margin: 15px 0; }
        #brush-box .brush-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; background: #007bff; border-radius: 50%; cursor: pointer; border: 3px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        
        .close-brush-btn { cursor: pointer; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 22px; border-radius: 50%; transition: all 0.2s ease-out; outline: 2px solid #ff4d4d; outline-offset: -2.5px; }
        .close-brush-btn:hover { background: #ff4d4dbd; color: #ffffff; outline-offset: 0px; outline: 1px solid #ffffff; box-shadow: 0 0 10px rgba(255, 77, 77, 0.6); transform: scale(1.125) rotate(90deg); }

        .brush-header-btn { width: 40px; height: 40px; border-radius: 8px; background: #f5f5f5; color: #666; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
        .brush-header-btn:hover { background: #e0e0e0; color: #333; }
        .brush-header-btn.active { background: #007bff; color: #fff; box-shadow: 0 2px 6px rgba(0,123,255,0.3); }

        .cp-container { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
        .cp-sb-area { position: relative; width: 100%; padding-bottom: 60%; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; cursor: crosshair; }
        .cp-sb-cursor { position: absolute; width: 14px; height: 14px; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transform: translate(-50%, -50%); pointer-events: none; }
        .cp-hue-area { position: relative; width: 100%; height: 14px; border-radius: 20px; background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); cursor: pointer; border: 1px solid #e0e0e0; margin-bottom: 5px; }
        .cp-hue-cursor { position: absolute; width: 18px; height: 18px; background: #fff; border: 2px solid #e5e5e5; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.15); top: 50%; transform: translate(-50%, -50%); pointer-events: none; }
        
        .cp-input-group { flex: 1; display: flex; align-items: center; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; height: 32px; }
        .cp-input-label { background: #f8f9fa; color: #666; font-size: 11px; font-weight: 600; padding: 0 8px; height: 100%; display: flex; align-items: center; border-right: 1px solid #ddd; }
        .cp-input-field { width: 100%; border: none; outline: none; text-align: center; font-weight: 600; color: #333; font-size: 12px; }
        .cp-mode-switch-btn { width: 32px; height: 32px; border: 1px solid #ddd; border-radius: 6px; background: #f8f9fa; color: #555; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-left: 5px; }
        
        .cp-preview-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 5px; }
        .cp-color-preview { width: 36px; height: 36px; border-radius: 8px; border: 1px solid #ddd; background: #000; box-shadow: inset 0 0 5px rgba(0,0,0,0.1); }
        .cp-btn { flex: 1; height: 36px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 10px; border: 1px solid #ddd; border-radius: 8px; background: #fff; cursor: pointer; color: #555; font-size: 12px; font-weight: 600; transition: all 0.2s; }
        .cp-btn:hover { background: #f0f7ff; border-color: #007bff; color: #007bff; }
    </style>

    <div id="brush-box" style="display:none; position:fixed; top:120px; left:60px; width:280px; background:#fff; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.15); z-index:10001; border:1px solid #e5e5e5; overflow:hidden;">
        <div id="brush-header" style="padding:10px 15px; border-bottom:1px solid #f0f0f0; cursor:move; display:flex; justify-content:space-between; align-items:center; background:#fafafa;">
            <div style="display:flex; gap:8px;">
                 <div id="btn-tool-brush-inner" class="brush-header-btn active" title="Cọ vẽ" onclick="activateTool('brush')"><i class="fa-solid fa-paintbrush"></i></div>
                 <div id="btn-tool-eraser-inner" class="brush-header-btn" title="Tẩy" onclick="activateTool('eraser')"><i class="fa-solid fa-eraser"></i></div>
                 <div id="btn-tool-picker-inner" class="brush-header-btn" title="Hút màu" onclick="activateTool('picker')"><i class="fa-solid fa-eye-dropper"></i></div>
            </div>
           <span class="close-brush-btn" onclick="closeBrushBox()" title="Đóng bảng màu">&times;</span>
        </div>
        <div class="cp-container" style="padding: 15px;">
            <div id="cp-sb-area" class="cp-sb-area">
                <div style="position:absolute;inset:0;background:linear-gradient(to right,#fff,transparent)"></div>
                <div style="position:absolute;inset:0;background:linear-gradient(to top,#000,transparent)"></div>
                <div id="cp-sb-cursor" class="cp-sb-cursor"></div>
            </div>
            <div id="cp-hue-area" class="cp-hue-area" style="margin-top:10px;">
                <div id="cp-hue-cursor" class="cp-hue-cursor"></div>
            </div>
            <div class="cp-inputs-row" style="margin-top:15px; display:flex; align-items: center;">
                <div id="cp-group-rgb" style="display:flex; gap:5px; flex:1;">
                    <div class="cp-input-group"><div class="cp-input-label">R</div><input type="number" id="inp-r" class="cp-input-field" value="0" min="0" max="255"></div>
                    <div class="cp-input-group"><div class="cp-input-label">G</div><input type="number" id="inp-g" class="cp-input-field" value="0" min="0" max="255"></div>
                    <div class="cp-input-group"><div class="cp-input-label">B</div><input type="number" id="inp-b" class="cp-input-field" value="0" min="0" max="255"></div>
                </div>
                <div id="cp-group-hex" style="display:none; flex:1;">
                    <div class="cp-input-group" style="width:100%;">
                        <div class="cp-input-label">#</div>
                        <input type="text" id="inp-hex" class="cp-input-field cp-hex-input" value="000000" maxlength="7">
                    </div>
                </div>
                <button class="cp-mode-switch-btn" onclick="toggleColorInputMode()" title="Chuyển đổi RGB/HEX"><i class="fa-solid fa-repeat"></i></button>
            </div>
            <div class="cp-preview-row" style="margin-top:15px; display:flex; align-items:center; gap:8px;">
                <div id="cp-preview" class="cp-color-preview"></div>
                <button class="cp-btn" onclick="copyHex(this)"><span id="cp-hex-val">#000000</span> <i class="fa-regular fa-copy"></i></button>
                <button class="cp-btn" onclick="copyRGB(this)"><span>RGB</span> <i class="fa-regular fa-copy"></i></button>
            </div>
        </div>
        <div class="brush-size-container" style="padding: 0 20px 20px 20px; border-top: 1px solid #f9f9f9;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
                <span style="font-size:11px; font-weight:700; color:#888; text-transform:uppercase;">Kích thước cọ</span>
                <span id="brushSizeDisplay" style="font-size:12px; font-weight:700; color:#007bff; background:#e6f1ff; padding:2px 8px; border-radius:10px;">20px</span>
            </div>
            <input type="range" class="brush-range" id="brushRange" min="1" max="100" value="20" oninput="syncBrushSize(this.value)">
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    makeDraggable(document.getElementById('brush-box'), document.getElementById('brush-header'));
    initColorPickerLogic();
}

function closeBrushBox() { const b = document.getElementById('brush-box'); if(b) b.style.display = 'none'; if(typeof setMode==='function') setMode('hand'); }
function syncBrushSize(val) { document.getElementById('brushSizeDisplay').innerText = val + 'px'; updateBrushSize(val); }
function makeDraggable(el, header) {
    let pos1=0, pos2=0, pos3=0, pos4=0;
    header.onmousedown = (e) => { e.preventDefault(); pos3=e.clientX; pos4=e.clientY; document.onmouseup=closeDrag; document.onmousemove=elementDrag; };
    function elementDrag(e) { e.preventDefault(); pos1=pos3-e.clientX; pos2=pos4-e.clientY; pos3=e.clientX; pos4=e.clientY; el.style.top=(el.offsetTop-pos2)+"px"; el.style.left=(el.offsetLeft-pos1)+"px"; }
    function closeDrag() { document.onmouseup=null; document.onmousemove=null; }
}

let isHexMode = false; 
function toggleColorInputMode() {
    isHexMode = !isHexMode;
    const gRGB = document.getElementById('cp-group-rgb'), gHEX = document.getElementById('cp-group-hex');
    if (isHexMode) { gRGB.style.display='none'; gHEX.style.display='flex'; document.getElementById('inp-hex').value = rgbToHex(colorState.r,colorState.g,colorState.b).replace('#',''); } 
    else { gRGB.style.display='flex'; gHEX.style.display='none'; }
}

function initColorPickerLogic() {
    const sb = document.getElementById('cp-sb-area'), hue = document.getElementById('cp-hue-area');
    const handleSB = (e) => { const r = sb.getBoundingClientRect(); colorState.s = (Math.max(0,Math.min(e.clientX-r.left,r.width))/r.width)*100; colorState.v = 100-(Math.max(0,Math.min(e.clientY-r.top,r.height))/r.height)*100; updateColorFromHSV(); };
    sb.addEventListener('mousedown', (e) => { handleSB(e); const mv=(ev)=>{ev.preventDefault();handleSB(ev)}; const up=()=>{window.removeEventListener('mousemove',mv);window.removeEventListener('mouseup',up)}; window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up); });

    const handleHue = (e) => { const r = hue.getBoundingClientRect(); colorState.h = (Math.max(0,Math.min(e.clientX-r.left,r.width))/r.width)*360; updateColorFromHSV(); };
    hue.addEventListener('mousedown', (e) => { handleHue(e); const mv=(ev)=>{ev.preventDefault();handleHue(ev)}; const up=()=>{window.removeEventListener('mousemove',mv);window.removeEventListener('mouseup',up)}; window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up); });

    ['inp-r','inp-g','inp-b'].forEach(id => { document.getElementById(id).addEventListener('input', () => updateColorFromRGB(parseInt(document.getElementById('inp-r').value)||0, parseInt(document.getElementById('inp-g').value)||0, parseInt(document.getElementById('inp-b').value)||0)); });
    
    document.getElementById('inp-hex').addEventListener('input', function() {
        let v=this.value.replace('#',''); if(/^[0-9A-Fa-f]{3,6}$/.test(v)) { const c=hexToRgb('#'+v); if(c) updateColorFromRGB(c.r,c.g,c.b,false); }
    });
    updateColorFromHSV();
}

function updateUI(upHex=true) {
    const {h,s,v,r,g,b} = colorState;
    const hr = hsvToRgb(h,100,100);
    document.getElementById('cp-sb-area').style.backgroundColor = `rgb(${hr.r},${hr.g},${hr.b})`;
    const cur = document.getElementById('cp-sb-cursor'); cur.style.left=`${s}%`; cur.style.top=`${100-v}%`; cur.style.backgroundColor=`rgb(${r},${g},${b})`;
    document.getElementById('cp-hue-cursor').style.left = `${(h/360)*100}%`;
    
    if(document.activeElement.id!=='inp-r') document.getElementById('inp-r').value=r;
    if(document.activeElement.id!=='inp-g') document.getElementById('inp-g').value=g;
    if(document.activeElement.id!=='inp-b') document.getElementById('inp-b').value=b;
    
    const hex = rgbToHex(r,g,b);
    if(upHex && document.activeElement.id!=='inp-hex') document.getElementById('inp-hex').value = hex.replace('#','');
    document.getElementById('cp-preview').style.backgroundColor = hex;
    document.getElementById('cp-hex-val').innerText = hex;
    if(ctx) { ctx.strokeStyle = `rgb(${r},${g},${b})`; ctx.shadowColor = ctx.strokeStyle; }
}

function updateColorFromHSV() { const c = hsvToRgb(colorState.h, colorState.s, colorState.v); colorState.r=c.r; colorState.g=c.g; colorState.b=c.b; updateUI(); }
function updateColorFromRGB(r,g,b,upHex=true) { colorState.r=r; colorState.g=g; colorState.b=b; const h=rgbToHsv(r,g,b); colorState.h=h.h; colorState.s=h.s; colorState.v=h.v; updateUI(upHex); }
function updateBrushSize(v) { if(ctx) ctx.lineWidth=v/state.scale; const c=document.getElementById('brush-cursor'); if(c) { c.style.width=v+'px'; c.style.height=v+'px'; } }

function copyHex(b) { navigator.clipboard.writeText(document.getElementById('cp-hex-val').innerText); showCopiedFeedback(b); }
function copyRGB(b) { navigator.clipboard.writeText(`${document.getElementById('inp-r').value}, ${document.getElementById('inp-g').value}, ${document.getElementById('inp-b').value}`); showCopiedFeedback(b); }
function showCopiedFeedback(b) { const old=b.innerHTML; b.innerHTML='<i class="fa-solid fa-check" style="color:green"></i>'; setTimeout(()=>b.innerHTML=old, 1000); }

function setMode(m) {
    state.mode = m;
    const bb = document.getElementById('brush-box'), ac = document.getElementById('arena-container'), dl = document.getElementById('drawing-layer'), bc = document.getElementById('brush-cursor');
    updateButtonStyles(m);
    if(bc) bc.style.display = 'none';
    if(m==='draw') { if(bb) bb.style.display='block'; ac.style.cursor='none'; if(bc){bc.style.display='block';updateBrushSize(document.getElementById('brushRange').value);} if(dl) dl.style.pointerEvents='auto'; }
    else { if(bb) bb.style.display='none'; ac.style.cursor='grab'; if(dl) dl.style.pointerEvents='none'; }
}

function updateButtonStyles(m) {
    ['btnHand','btnDraw','btnCrop'].forEach(id=>{const b=document.getElementById(id); if(b) b.classList.remove('active')});
    if(m==='hand') document.getElementById('btnHand').classList.add('active');
    if(m==='draw') document.getElementById('btnDraw').classList.add('active');
    if(m==='crop') document.getElementById('btnCrop').classList.add('active');
    document.querySelectorAll('.brush-header-btn').forEach(b=>b.classList.remove('active'));
    if(currentMode==='brush') document.getElementById('btn-tool-brush-inner').classList.add('active');
    if(currentMode==='eraser') document.getElementById('btn-tool-eraser-inner').classList.add('active');
    if(currentMode==='picker') document.getElementById('btn-tool-picker-inner').classList.add('active');
}

async function activateTool(tool) {
    currentMode = tool;
    const cb = document.getElementById('crop-box');
    if(cb) cb.style.display = 'none';
    setMode('hand');
    if(tool==='crop') { if(cb) cb.style.display='flex'; document.getElementById('arena-container').style.cursor='default'; state.mode='crop'; updateButtonStyles('crop'); }
    else if(tool==='brush'||tool==='eraser') setMode('draw');
    else if(tool==='picker') { if('EyeDropper' in window) { try{const r=await new EyeDropper().open(); const c=hexToRgb(r.sRGBHex); updateColorFromRGB(c.r,c.g,c.b); activateTool('brush');}catch(e){activateTool('brush');} } else { document.getElementById('arena-container').style.cursor='copy'; setMode('draw'); } }
}

document.addEventListener('mousedown', (e) => {
    if(!e.target.closest('#arena-container')) return;
    if(state.mode==='crop') {
        const t = e.target, cb = document.getElementById('crop-box');
        if(t.classList.contains('crop-handle')) { isCropping=true; cropAction='resize'; cropStart={w:cb.offsetWidth,h:cb.offsetHeight,l:cb.offsetLeft,t:cb.offsetTop,mx:e.clientX,my:e.clientY,dir:t.dataset.dir}; return; }
        if(t.closest('#crop-box')) { isCropping=true; cropAction='move'; cropStart={l:cb.offsetLeft,t:cb.offsetTop,mx:e.clientX,my:e.clientY}; return; }
        return;
    }
    if(state.mode==='hand') { isDragging=true; lastMouseX=e.clientX; lastMouseY=e.clientY; }
    else if(state.mode==='draw') { if(currentMode==='picker') pickColorFallback(e); else { isDrawing=true; handleBrushStroke(e,true); } }
});

function loopCursor() { if(isCursorRunning) { const c=document.getElementById('brush-cursor'); if(c&&state.mode==='draw') c.style.transform=`translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`; requestAnimationFrame(loopCursor); } }
document.addEventListener('mousemove', (e) => {
    if(isDragging||isDrawing||isCropping) e.preventDefault();
    cursorX=e.clientX; cursorY=e.clientY;
    if(!isCursorRunning && state.mode==='draw') { isCursorRunning=true; loopCursor(); }
    
    if(state.mode==='crop' && isCropping) {
        const cb=document.getElementById('crop-box');
        const dx=(e.clientX-cropStart.mx)/state.scale, dy=(e.clientY-cropStart.my)/state.scale;
        if(cropAction==='move') { cb.style.left=(cropStart.l+dx)+'px'; cb.style.top=(cropStart.t+dy)+'px'; }
        else {
            let ns = Math.max(50, cropStart.w + (cropStart.dir.includes('r')?dx:-dx));
            cb.style.width=ns+'px'; cb.style.height=ns+'px';
            if(cropStart.dir.includes('l')) cb.style.left=(cropStart.l+(cropStart.w-ns))+'px';
            if(cropStart.dir.includes('t')) cb.style.top=(cropStart.t+(cropStart.h-ns))+'px';
        }
        return;
    }
    if(state.mode==='hand' && isDragging) { state.x+=e.clientX-lastMouseX; state.y+=e.clientY-lastMouseY; lastMouseX=e.clientX; lastMouseY=e.clientY; updateTransform(); }
    else if(state.mode==='draw' && isDrawing) handleBrushStroke(e,false);
});
document.addEventListener('mouseup', () => { isDragging=false; isDrawing=false; isCropping=false; });

/* ============================================================
    7. APPLY RESULT (NÉN ẢNH ĐỂ KHẮC PHỤC LỖI QUOTA)
   ============================================================ */
function applyResult() {
    const btn = document.getElementById('btnSaveResult');
    if(btn) { btn.innerText = "Đang xử lý..."; btn.style.opacity = "0.7"; btn.style.cursor = "wait"; }

    setTimeout(() => {
        try {
            if (!currentOriginalImage) { alert("Không có ảnh!"); return; }

            const p = state.canvasPadding / 2;
            const cb = document.getElementById('crop-box');
            const drawLayer = document.getElementById('drawing-layer');
            
            // 1. Tạo Canvas tạm để render toàn bộ nội dung (Full resolution)
            let renderCanvas = document.createElement('canvas');
            let rw, rh, rx, ry;

            // Xác định vùng cần lấy (Crop hoặc Full)
            if (cb && state.mode === 'crop' && cb.style.display !== 'none') {
                rw = cb.offsetWidth; rh = cb.offsetHeight;
                rx = cb.offsetLeft; ry = cb.offsetTop;
            } else {
                rw = currentOriginalImage.naturalWidth; rh = currentOriginalImage.naturalHeight;
                rx = p; ry = p;
            }

            renderCanvas.width = rw; renderCanvas.height = rh;
            const rctx = renderCanvas.getContext('2d');

            // Vẽ ảnh gốc vào canvas tạm (trừ đi padding)
            rctx.drawImage(currentOriginalImage, p - rx, p - ry);
            
            // Vẽ các nét vẽ tay (nếu có)
            if (drawLayer) {
                rctx.drawImage(drawLayer, -rx, -ry);
            }

            // 2. Nén và Resize xuống kích thước nhỏ (Max 250px)
            // Đây là bước quan trọng để fix lỗi Quota Exceeded
            const MAX_SIZE = 250; 
            let finalW = rw, finalH = rh;
            
            if (rw > rh) {
                if (rw > MAX_SIZE) { finalH *= MAX_SIZE / rw; finalW = MAX_SIZE; }
            } else {
                if (rh > MAX_SIZE) { finalW *= MAX_SIZE / rh; finalH = MAX_SIZE; }
            }

            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = finalW;
            finalCanvas.height = finalH;
            const fCtx = finalCanvas.getContext('2d');
            
            // Vẽ từ canvas tạm sang canvas final (đã resize)
            fCtx.drawImage(renderCanvas, 0, 0, finalW, finalH);

            // 3. Xuất ra JPEG chất lượng 60% (Nhẹ hơn PNG rất nhiều)
            const finalDataUrl = finalCanvas.toDataURL('image/jpeg', 0.6);

            if (finalDataUrl && typeof window.onSaveImageComplete === 'function') {
                try {
                    window.onSaveImageComplete(finalDataUrl);
                    closeCropModal();
                } catch (e) {
                  
                    alert("Bộ nhớ đã đầy! Vui lòng xóa bớt Khách hàng/Nhà cung cấp cũ hoặc ảnh cũ để tiếp tục.");
                }
            } else {
                alert("Lỗi kết nối. Hãy tải lại trang.");
            }

        } catch (err) {
            console.error(err);
            alert("Đã xảy ra lỗi khi lưu ảnh: " + err.message);
        } finally {
            if(btn) { btn.innerText = "Lưu & Sử dụng"; btn.style.opacity = "1"; btn.style.cursor = "pointer"; }
        }
    }, 50);
}

function handleBrushStroke(e, isFirst) {
    if (!ctx || state.mode !== 'draw') return;
    const r = document.getElementById('drawing-layer').getBoundingClientRect();
    const mx = (e.clientX - r.left)/state.scale, my = (e.clientY - r.top)/state.scale;
    ctx.globalCompositeOperation = currentMode==='eraser'?'destination-out':'source-over';
    if(isFirst) { ctx.beginPath(); ctx.moveTo(mx, my); }
    else {
        if(currentMode==='brush') { const v=colorState; ctx.strokeStyle=`rgb(${v.r},${v.g},${v.b})`; ctx.shadowBlur=brushType==='soft'?(10/state.scale):0; ctx.shadowColor=ctx.strokeStyle; }
        ctx.lineWidth = document.getElementById('brushRange').value/state.scale;
        ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineTo(mx, my); ctx.stroke();
    }
}

function pickColorFallback(e) {
    const cv = document.getElementById('drawing-layer'), img = document.getElementById('main-img-layer');
    if(!cv||!img)return;
    const tc = document.createElement('canvas'); tc.width=cv.width; tc.height=cv.height; const tcx=tc.getContext('2d');
    tcx.drawImage(img,state.canvasPadding/2,state.canvasPadding/2); tcx.drawImage(cv,0,0);
    const r = cv.getBoundingClientRect(), x=(e.clientX-r.left)/state.scale, y=(e.clientY-r.top)/state.scale;
    try { const p=tcx.getImageData(x,y,1,1).data; updateColorFromRGB(p[0],p[1],p[2]); activateTool('brush'); } catch(e){}
}

function hsvToRgb(h,s,v){s/=100;v/=100;let c=v*s,x=c*(1-Math.abs(((h/60)%2)-1)),m=v-c,r=0,g=0,b=0;if(0<=h&&h<60){r=c;g=x;b=0}else if(60<=h&&h<120){r=x;g=c;b=0}else if(120<=h&&h<180){r=0;g=c;b=x}else if(180<=h&&h<240){r=0;g=x;b=c}else if(240<=h&&h<300){r=x;g=0;b=c}else if(300<=h&&h<360){r=c;g=0;b=x}return{r:Math.round((r+m)*255),g:Math.round((g+m)*255),b:Math.round((b+m)*255)}}
function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;let max=Math.max(r,g,b),min=Math.min(r,g,b),h,s,v=max,d=max-min;s=max===0?0:d/max;if(max===min)h=0;else{switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break}h/=6}return{h:h*360,s:s*100,v:v*100}}
function rgbToHex(r,g,b){return"#"+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase()}
function hexToRgb(h){let r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);return r?{r:parseInt(r[1],16),g:parseInt(r[2],16),b:parseInt(r[3],16)}:null}

window.uploadImage = uploadImage;
window.triggerUpload = triggerUpload;
window.closeCropModal = closeCropModal; 
window.applyResult = applyResult;
window.createCropModal = createCropModal;
window.activateTool = activateTool;
window.setMode = setMode;
window.autoFitArena = autoFitArena;
window.updateBrushSize = updateBrushSize;
window.copyHex = copyHex;
window.copyRGB = copyRGB;