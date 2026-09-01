// Cấu hình kho hình ảnh mèo
const catImages = [
    'https://cattime.com/wp-content/uploads/sites/14/2011/12/GettyImages-1319206416-e1697653931697.jpg?w=1024',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBCGT7VYA9RhOgINThMhjoFacQ2J86ILcJcDKQL0ugnmTSRbvcPQdnD5w&s=10',
    'https://placecats.com/200/300?3',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIBGDzp8I00qolfUfHL5qBXSVhSJz4emasu7jOLqlQAWv2_3pgSSsZ00w1&s=10'
];

let currentMode = 'scratch-mode';

// Thuật toán sinh mảng 4 thẻ (1 Hiếm, 3 Thường)
function generateDeck() {
    let deck = [
        { isRare: true, img: catImages[0] },
        { isRare: false, img: catImages[1] },
        { isRare: false, img: catImages[2] },
        { isRare: false, img: catImages[3] }
    ];
    // Xáo trộn Fisher-Yates
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// KHỞI TẠO CHẾ ĐỘ CÀO THẺ
function initScratchMode() {
    const grid = document.getElementById('scratch-grid');
    grid.innerHTML = '';
    const deck = generateDeck();

    deck.forEach((cardObj) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'scratch-card-wrapper';

        const img = document.createElement('img');
        img.src = cardObj.img;
        img.className = 'card-image';

        const canvas = document.createElement('canvas');
        canvas.className = 'scratch-canvas';
        canvas.width = 200;
        canvas.height = 300;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Phủ lớp xám lên canvas
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        wrapper.appendChild(img);
        wrapper.appendChild(canvas);
        grid.appendChild(wrapper);

        setupScratchLogic(canvas, ctx, wrapper, cardObj.isRare);
    });
}

// LOGIC XÓA LỚP PHỦ 
function setupScratchLogic(canvas, ctx, wrapper, isRare) {
    let isDrawing = false;
    let isRevealed = false;
    let lastPos = null;

    function getPointerPos(e) {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // Kiểm tra xem vị trí ngón tay/chuột có đang nằm trong phạm vi thẻ không
        const isInside = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
            isInside: isInside
        };
    }

    function checkPercentage() {
        if (isRevealed) return;
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let transparent = 0;
        const totalSampled = pixels.length / 16;
        
        // Lấy mẫu bước nhảy 16 để tính toán cực nhanh & mượt trên điện thoại lẫn máy tính
        for (let i = 3; i < pixels.length; i += 16) {
            if (pixels[i] === 0) transparent++;
        }

        const percentage = (transparent / totalSampled) * 100;
        
        // Nếu cào được > 60% thì tự động mở hết ngay lập tức trong lúc đang cào
        if (percentage > 60) {
            isRevealed = true;
            isDrawing = false;
            lastPos = null;
            canvas.style.transition = 'opacity 0.5s ease';
            canvas.style.opacity = '0';
            
            setTimeout(() => {
                canvas.remove();
                if (isRare) {
                    wrapper.classList.add('rare-revealed');
                }
            }, 500);
        }
    }

    function startScratch(e) {
        if (isRevealed) return;
        if (e.type === 'mousedown' && e.button !== 0) return;
        
        const pos = getPointerPos(e);
        if (!pos || !pos.isInside) return;

        isDrawing = true;
        lastPos = pos;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.fill();

        checkPercentage();
    }

    function scratch(e) {
        if (isRevealed) return;

        // Xử lý chuột: nếu đang giữ chuột trái
        if (e.type === 'mousemove') {
            if (e.buttons === 1) {
                isDrawing = true;
            } else {
                if (isDrawing) stopScratch();
                return;
            }
        }

        if (!isDrawing) return;
        if (e.cancelable) e.preventDefault();

        const pos = getPointerPos(e);
        if (!pos) return;

        // Nếu ngón tay/chuột kéo ra ngoài thẻ (đặc biệt khi vuốt trên màn hình điện thoại)
        if (!pos.isInside) {
            lastPos = null; // Reset để khi ngón tay lướt trở lại không bị kéo vệt chéo từ ngoài vào
            return;
        }

        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 40;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        if (lastPos) {
            ctx.moveTo(lastPos.x, lastPos.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        } else {
            ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
            ctx.fill();
        }

        lastPos = pos;

        // Luôn kiểm tra % ngay trong lúc đang cào
        checkPercentage();
    }

    function stopScratch() {
        isDrawing = false;
        lastPos = null;
        checkPercentage();
    }

    function onMouseLeave() {
        // Khi chuột ra ngoài, reset lastPos để khi quay lại không bị nối đường vệt chéo
        lastPos = null;
    }

    // Gắn sự kiện chuột & cảm ứng (Touch cho Mobile)
    canvas.addEventListener('mousedown', startScratch);
    canvas.addEventListener('touchstart', (e) => {
        if (e.cancelable) e.preventDefault();
        startScratch(e);
    }, { passive: false });
    
    canvas.addEventListener('mousemove', scratch);
    canvas.addEventListener('touchmove', (e) => {
        if (e.cancelable) e.preventDefault();
        scratch(e);
    }, { passive: false });

    canvas.addEventListener('mouseup', stopScratch);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchend', stopScratch);
    canvas.addEventListener('touchcancel', stopScratch);
}

// KHỞI TẠO CHẾ ĐỘ VALORANT NIGHT MARKET
function initValorantMode() {
    const grid = document.getElementById('valorant-grid');
    grid.innerHTML = '';
    const deck = generateDeck();

    deck.forEach((cardObj) => {
        const valCard = document.createElement('div');
        valCard.className = 'val-card';
        
        const inner = document.createElement('div');
        inner.className = 'val-card-inner';

        const front = document.createElement('div');
        front.className = 'val-front';

        const back = document.createElement('div');
        back.className = 'val-back';
        
        const img = document.createElement('img');
        img.src = cardObj.img;
        img.className = 'card-image';
        
        back.appendChild(img);
        inner.appendChild(front);
        inner.appendChild(back);
        valCard.appendChild(inner);
        grid.appendChild(valCard);

        // Logic lật thẻ
        valCard.addEventListener('click', function() {
            if (!this.classList.contains('flipped')) {
                this.classList.add('flipped');
                if (cardObj.isRare) {
                    this.classList.add('rare');
                }
            }
        });
    });
}

// LOGIC ĐIỀU KHIỂN CHUNG
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        e.target.classList.add('active');
        currentMode = e.target.getAttribute('data-target');
        document.getElementById(currentMode).classList.add('active');
    });
});

document.getElementById('reset-btn').addEventListener('click', () => {
    initScratchMode();
    initValorantMode();
});

// Khởi chạy lần đầu
initScratchMode();
initValorantMode();