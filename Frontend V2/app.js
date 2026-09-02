const API_BASE_URL = 'https://scratch-e7e5.onrender.com/api/cards';

// Application State
let cardsData = [];
let currentFilter = 'all';
let currentSearch = '';
let currentView = 'grid'; // 'grid' or 'table'

// Bootstrap Modals
let cardModal;
let simulatorModal;
let lightboxModal;

// Toast configuration with SweetAlert2
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  background: '#1e293b',
  color: '#f8fafc',
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

// =========================================================================
// Initialization
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Modals
  cardModal = new bootstrap.Modal(document.getElementById('cardModal'));
  simulatorModal = new bootstrap.Modal(document.getElementById('simulatorModal'));
  lightboxModal = new bootstrap.Modal(document.getElementById('imageLightboxModal'));

  // Setup Event Listeners
  initEventListeners();

  // Initial Load
  loadCards();

  // Start Real-time Auto Polling (Cập nhật liên tục mỗi 2.5 giây)
  startAutoPolling();
});

let isPollingActive = true;
let previousCardsMap = new Map();

// Quản lý danh sách tất cả các lượt rút
let drawHistoryMap = {};
try {
  drawHistoryMap = JSON.parse(localStorage.getItem('card_draw_history_v2') || '{}');
} catch (e) {
  drawHistoryMap = {};
}

function recordDrawHistory(cardId, drawnAt, deviceInfo) {
  if (!cardId || !drawnAt) return;
  if (!drawHistoryMap[cardId]) {
    drawHistoryMap[cardId] = [];
  }
  
  const exists = drawHistoryMap[cardId].some(h => h.time === drawnAt);
  if (!exists) {
    drawHistoryMap[cardId].unshift({
      time: drawnAt,
      device: deviceInfo || 'Thiết bị không xác định'
    });
    try {
      localStorage.setItem('card_draw_history_v2', JSON.stringify(drawHistoryMap));
    } catch (e) {}
  }
}

function getCardHistory(card) {
  if (!card || !card.id) return [];
  if (card.drawnAt) {
    recordDrawHistory(card.id, card.drawnAt, card.deviceInfo);
  }
  return drawHistoryMap[card.id] || [];
}

function startAutoPolling() {
  setInterval(async () => {
    if (!isPollingActive) return;
    
    // Đừng cập nhật đè khi Admin đang mở modal Thêm/Sửa hoặc Simulator
    const isModalOpen = document.body.classList.contains('modal-open');
    if (isModalOpen) return;

    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) return;

      const freshCards = await response.json();
      
      // Kiểm tra xem có lượt rút thẻ mới nào không
      let hasNewDraw = false;
      let drawnCardInfo = null;

      if (previousCardsMap.size > 0) {
        for (const fresh of freshCards) {
          const old = previousCardsMap.get(fresh.id);
          if (old) {
            // Nếu số lượng còn lại giảm hoặc có thời gian rút mới
            if ((fresh.remaining !== undefined && old.remaining !== undefined && fresh.remaining < old.remaining) ||
                (fresh.drawnAt && fresh.drawnAt !== old.drawnAt)) {
              hasNewDraw = true;
              drawnCardInfo = fresh;
              break;
            }
          }
        }
      }

      // Cập nhật bản đồ dữ liệu cũ
      previousCardsMap.clear();
      freshCards.forEach(c => previousCardsMap.set(c.id, { ...c }));

      // Cập nhật state và UI
      cardsData = freshCards;
      updateServerStatus(true);
      updateKPIs();
      renderAllViews();

      // Thông báo Realtime nếu có người vừa rút thẻ
      if (hasNewDraw && drawnCardInfo) {
        const rarityText = drawnCardInfo.isRare ? 'Thẻ Hiếm' : 'Thẻ Thường';
        Toast.fire({
          icon: 'info',
          title: `Phát hiện lượt rút mới! (${rarityText})`
        });
      }

    } catch (e) {
      // Bỏ qua lỗi kết nối tạm thời khi polling
    }
  }, 2500);
}

function initEventListeners() {
  // Refresh Button
  document.getElementById('refresh-btn').addEventListener('click', () => {
    const icon = document.querySelector('#refresh-btn i');
    icon.classList.add('spin-anim');
    loadCards().finally(() => {
      setTimeout(() => icon.classList.remove('spin-anim'), 600);
    });
  });

  // Reset Pool Button
  document.getElementById('reset-pool-btn').addEventListener('click', confirmResetPool);

  // Search Input
  document.getElementById('search-input').addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase().trim();
    renderAllViews();
  });

  // Filter Buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.getAttribute('data-filter');
      
      // Nếu bấm vào tab Lịch sử rút, tự động chuyển sang chế độ Bảng danh sách
      if (currentFilter === 'history' && currentView === 'grid') {
        switchView('table');
      }
      
      renderAllViews();
    });
  });

  // View Switchers
  document.getElementById('view-grid-btn').addEventListener('click', () => switchView('grid'));
  document.getElementById('view-table-btn').addEventListener('click', () => switchView('table'));

  // Image Input live preview in Modal
  document.getElementById('card-img').addEventListener('input', function() {
    updateModalImagePreview(this.value);
  });

  // Reset Simulator when closed
  document.getElementById('simulatorModal').addEventListener('hidden.bs.modal', () => {
    const flipCard = document.getElementById('sim-flip-card');
    flipCard.classList.remove('flipped');
    document.getElementById('sim-result-box').classList.add('d-none');
    document.getElementById('sim-card-img').src = '';
  });
}

function switchView(view) {
  currentView = view;
  const gridContainer = document.getElementById('cards-grid-view');
  const tableContainer = document.getElementById('cards-table-view');
  const gridBtn = document.getElementById('view-grid-btn');
  const tableBtn = document.getElementById('view-table-btn');

  if (view === 'grid') {
    gridContainer.classList.remove('d-none');
    tableContainer.classList.add('d-none');
    gridBtn.className = 'btn btn-primary rounded-pill px-3';
    gridBtn.style.background = '#a855f7';
    gridBtn.style.border = 'none';
    tableBtn.className = 'btn btn-dark rounded-pill px-3 text-secondary';
    tableBtn.style.background = '';
  } else {
    gridContainer.classList.add('d-none');
    tableContainer.classList.remove('d-none');
    gridBtn.className = 'btn btn-dark rounded-pill px-3 text-secondary';
    gridBtn.style.background = '';
    tableBtn.className = 'btn btn-primary rounded-pill px-3';
    tableBtn.style.background = '#a855f7';
    tableBtn.style.border = 'none';
  }
}

// =========================================================================
// Data Fetching & KPIs
// =========================================================================
async function loadCards() {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) throw new Error('Không thể kết nối đến Backend');

    cardsData = await response.json();
    updateServerStatus(true);
    updateKPIs();
    renderAllViews();
  } catch (error) {
    console.error('Fetch error:', error);
    updateServerStatus(false);
    cardsData = [];
    updateKPIs();
    renderAllViews();
  }
}

function updateServerStatus(isOnline) {
  const dot = document.getElementById('server-status-dot');
  const text = document.getElementById('server-status-text');

  if (isOnline) {
    dot.className = 'pulse-dot online';
    text.className = 'text-success small';
    text.innerText = 'Backend: Online (Port 5037)';
  } else {
    dot.className = 'pulse-dot offline';
    text.className = 'text-danger small';
    text.innerText = 'Backend: Mất kết nối!';
  }
}

function updateKPIs() {
  const totalCards = cardsData.length;
  
  // Calculate remaining stock
  const totalAvailable = cardsData.reduce((acc, c) => {
    if (typeof c.remaining === 'number') return acc + c.remaining;
    return acc + (c.isDrawn ? 0 : (c.quantity || 1));
  }, 0);

  const totalQuantity = cardsData.reduce((acc, c) => acc + (c.quantity || 1), 0);
  const totalDrawn = Math.max(0, totalQuantity - totalAvailable);
  const totalRare = cardsData.filter(c => c.isRare).length;

  // Rates
  const availRate = totalQuantity > 0 ? Math.round((totalAvailable / totalQuantity) * 100) : 0;
  const drawnRate = totalQuantity > 0 ? Math.round((totalDrawn / totalQuantity) * 100) : 0;
  const rareRate = totalCards > 0 ? Math.round((totalRare / totalCards) * 100) : 0;

  // Update UI Elements
  document.getElementById('stat-total-cards').innerText = totalCards;
  document.getElementById('stat-total-quantity').innerText = totalQuantity;
  document.getElementById('stat-available').innerText = totalAvailable;
  document.getElementById('stat-available-rate').innerText = `${availRate}%`;
  document.getElementById('stat-pool-progress').style.width = `${availRate}%`;
  document.getElementById('stat-drawn').innerText = totalDrawn;
  document.getElementById('stat-drawn-rate').innerText = `${drawnRate}%`;
  document.getElementById('stat-rare').innerText = totalRare;
  document.getElementById('stat-rare-rate').innerText = `${rareRate}%`;

  // Update Filter Counters
  const countAvail = cardsData.filter(c => (c.remaining > 0 || !c.isDrawn)).length;
  const countDrawn = cardsData.filter(c => (c.remaining === 0 || c.isDrawn)).length;
  const countRare = totalRare;
  const countCommon = totalCards - totalRare;
  const countHistory = cardsData.filter(c => (c.drawnAt || c.isDrawn || (c.remaining !== undefined && c.remaining < (c.quantity || 1)))).length;

  document.getElementById('count-filter-all').innerText = totalCards;
  document.getElementById('count-filter-avail').innerText = countAvail;
  document.getElementById('count-filter-drawn').innerText = countDrawn;
  document.getElementById('count-filter-rare').innerText = countRare;
  document.getElementById('count-filter-common').innerText = countCommon;
  document.getElementById('history-badge-count').innerText = countHistory;
}

// =========================================================================
// Rendering
// =========================================================================
function getFilteredCards() {
  let list = cardsData.filter(card => {
    // 1. Search filter
    const matchesSearch = !currentSearch || 
      (card.id && card.id.toLowerCase().includes(currentSearch)) ||
      (card.imgUrl && card.imgUrl.toLowerCase().includes(currentSearch)) ||
      (card.deviceInfo && card.deviceInfo.toLowerCase().includes(currentSearch));

    if (!matchesSearch) return false;

    // 2. Tab filter
    const isAvail = (card.remaining > 0 || (!card.isDrawn && card.remaining === undefined));
    if (currentFilter === 'available') return isAvail;
    if (currentFilter === 'drawn') return !isAvail;
    if (currentFilter === 'rare') return card.isRare;
    if (currentFilter === 'common') return !card.isRare;
    if (currentFilter === 'history') {
      return (card.drawnAt || card.isDrawn || (card.remaining !== undefined && card.remaining < (card.quantity || 1)));
    }

    return true;
  });

  // Nếu là tab Lịch sử rút, sắp xếp theo thời gian rút mới nhất lên đầu
  if (currentFilter === 'history') {
    list.sort((a, b) => {
      if (!a.drawnAt) return 1;
      if (!b.drawnAt) return -1;
      return new Date(b.drawnAt) - new Date(a.drawnAt);
    });
  }

  return list;
}

function renderAllViews() {
  const filtered = getFilteredCards();
  const emptyState = document.getElementById('empty-state');
  const gridContainer = document.getElementById('cards-grid-view');
  const tableBody = document.getElementById('cards-table-body');

  if (filtered.length === 0) {
    emptyState.classList.remove('d-none');
    gridContainer.innerHTML = '';
    tableBody.innerHTML = '';
    return;
  }

  emptyState.classList.add('d-none');
  renderGridView(filtered);
  renderTableView(filtered);
}

// Render Card 3D Grid (Không hiển thị ID và không có Emoji)
function renderGridView(cards) {
  const grid = document.getElementById('cards-grid-view');
  grid.innerHTML = '';

  cards.forEach(card => {
    const isAvail = (card.remaining > 0 || (!card.isDrawn && card.remaining === undefined));
    const remainingStock = card.remaining !== undefined ? card.remaining : (card.isDrawn ? 0 : card.quantity || 1);
    const totalQty = card.quantity || 1;

    const col = document.createElement('div');
    col.className = 'col';

    col.innerHTML = `
      <div class="card-item-box ${card.isRare ? 'is-rare' : ''}">
        
        <!-- Image Container -->
        <div class="card-image-wrap">
          <img src="${escapeHtml(card.imgUrl)}" alt="Card Image" onclick="openLightbox('${escapeHtml(card.imgUrl)}')">
          
          <!-- Badges Overlay -->
          <div class="card-badges-overlay">
            <span class="${card.isRare ? 'badge-rare' : 'badge-common'}">
              ${card.isRare ? 'Hiếm' : 'Thường'}
            </span>
            <span class="badge-stock ${remainingStock === 0 ? 'empty' : ''}">
              <i class="bi bi-box-seam me-1"></i>${remainingStock}/${totalQty}
            </span>
          </div>
        </div>

        <!-- Card Body (Không hiển thị ID) -->
        <div class="p-3 d-flex flex-column justify-content-between flex-grow-1">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="badge ${isAvail ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'} rounded-pill px-2 py-1" style="font-size: 0.75rem;">
                ${isAvail ? 'Còn trong kho' : 'Đã rút hết'}
              </span>
              ${card.drawnAt ? `
                <small class="text-secondary" style="font-size: 0.75rem;" title="Thời gian rút">
                  <i class="bi bi-clock me-1"></i>${new Date(card.drawnAt).toLocaleTimeString('vi-VN')}
                </small>
              ` : ''}
            </div>
          </div>

          <!-- Actions -->
            <button class="btn btn-outline-danger btn-sm rounded-pill px-3 py-1" onclick="confirmDeleteCard('${card.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>

      </div>
    `;

    grid.appendChild(col);
  });
}

// Render Table View (Khớp 100% với giao diện Bảng Danh Sách)
function renderTableView(cards) {
  const tbody = document.getElementById('cards-table-body');
  const thead = document.getElementById('table-head');
  tbody.innerHTML = '';

  // Chế độ xem Lịch sử rút: Mỗi 1 lượt rút là 1 hàng riêng biệt
  if (currentFilter === 'history') {
    thead.innerHTML = `
      <tr>
        <th style="width: 180px;">Thời gian rút</th>
        <th style="width: 70px;">Ảnh</th>
        <th>Mã Thẻ (ID)</th>
        <th>Độ hiếm</th>
        <th>Người rút / Thiết bị</th>
        <th class="text-end" style="width: 160px;">Trạng thái</th>
      </tr>
    `;

    // Thu thập tất cả các lượt rút thành danh sách phẳng
    let allDrawEvents = [];
    cards.forEach(card => {
      const historyList = getCardHistory(card);
      if (historyList.length > 0) {
        historyList.forEach(h => {
          allDrawEvents.push({
            cardId: card.id,
            imgUrl: card.imgUrl,
            isRare: card.isRare,
            time: h.time,
            device: h.device
          });
        });
      } else if (card.drawnAt) {
        allDrawEvents.push({
          cardId: card.id,
          imgUrl: card.imgUrl,
          isRare: card.isRare,
          time: card.drawnAt,
          device: card.deviceInfo || 'Thiết bị không xác định'
        });
      }
    });

    // Sắp xếp thời gian mới nhất lên đầu
    allDrawEvents.sort((a, b) => new Date(b.time) - new Date(a.time));

    if (allDrawEvents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary py-4">- Chưa có lượt rút nào -</td></tr>`;
      return;
    }

    allDrawEvents.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <span class="text-info fw-semibold" style="font-size: 0.85rem;">
            <i class="bi bi-clock me-1"></i>${new Date(item.time).toLocaleString('vi-VN')}
          </span>
        </td>
        <td>
          <img src="${escapeHtml(item.imgUrl)}" class="table-thumb" alt="Thumbnail" onclick="openLightbox('${escapeHtml(item.imgUrl)}')">
        </td>
        <td>
          <span class="copy-id-btn" title="Bấm để copy ID" onclick="copyToClipboard('${item.cardId}')">
            ${item.cardId} <i class="bi bi-copy ms-1"></i>
          </span>
        </td>
        <td>
          <span class="${item.isRare ? 'badge-rare' : 'badge-common'}">
            ${item.isRare ? 'Hiếm' : 'Thường'}
          </span>
        </td>
        <td>
          <div class="text-light fw-medium small">
            <i class="bi bi-laptop me-1 text-secondary"></i>${escapeHtml(item.device)}
          </div>
        </td>
        <td class="text-end">
          <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1" style="font-size: 0.78rem;">
            Đã rút thành công
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });

    return;
  }

  // Chế độ xem Kho Thẻ bình thường
  thead.innerHTML = `
    <tr>
      <th style="width: 70px;">Ảnh</th>
      <th>Thông tin Thẻ</th>
      <th>Độ hiếm</th>
      <th>Trạng thái kho</th>
      <th>Số lượng còn lại</th>
      <th>Người rút gần nhất</th>
      <th class="text-end" style="width: 140px;">Thao tác</th>
    </tr>
  `;

  cards.forEach(card => {
    const isAvail = (card.remaining > 0 || (!card.isDrawn && card.remaining === undefined));
    const remainingStock = card.remaining !== undefined ? card.remaining : (card.isDrawn ? 0 : card.quantity || 1);
    const totalQty = card.quantity || 1;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <img src="${escapeHtml(card.imgUrl)}" class="table-thumb" alt="Thumbnail" onclick="openLightbox('${escapeHtml(card.imgUrl)}')">
      </td>
      <td>
        <div class="fw-semibold text-white mb-1">
          <span class="copy-id-btn" title="Bấm để copy ID" onclick="copyToClipboard('${card.id}')">
            ${card.id} <i class="bi bi-copy ms-1"></i>
          </span>
        </div>
        <small class="text-secondary text-truncate d-inline-block" style="max-width: 250px;" title="${escapeHtml(card.imgUrl)}">
          ${escapeHtml(card.imgUrl)}
        </small>
      </td>
      <td>
        <span class="${card.isRare ? 'badge-rare' : 'badge-common'}">
          ${card.isRare ? 'Hiếm' : 'Thường'}
        </span>
      </td>
      <td>
        <span class="badge ${isAvail ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'} rounded-pill px-3 py-1">
          ${isAvail ? 'Còn trong kho' : 'Đã rút hết'}
        </span>
      </td>
      <td>
        <span class="fw-bold fs-6 ${remainingStock === 0 ? 'text-danger' : 'text-info'}">
          ${remainingStock}
        </span>
        <span class="text-secondary small">/${totalQty}</span>
      </td>
      <td>
        ${card.drawnAt ? `
          <div class="small">
            <div class="text-light fw-semibold"><i class="bi bi-clock me-1 text-info"></i>${new Date(card.drawnAt).toLocaleString('vi-VN')}</div>
            <div class="text-secondary"><i class="bi bi-laptop me-1"></i>${escapeHtml(card.deviceInfo || 'Thiết bị không xác định')}</div>
          </div>
        ` : '<span class="text-secondary opacity-50 small">- Chưa có -</span>'}
      </td>
      <td class="text-end">
        <button class="btn btn-outline-primary btn-sm rounded-pill me-1" title="Chỉnh sửa" onclick="openEditCardModal('${card.id}')">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm rounded-pill" title="Xóa thẻ" onclick="confirmDeleteCard('${card.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// =========================================================================
// CRUD Operations
// =========================================================================
function openAddCardModal() {
  document.getElementById('card-form').reset();
  document.getElementById('card-id').value = '';
  document.getElementById('card-quantity').value = '1';
  document.getElementById('card-israre').checked = false;
  document.getElementById('modalTitle').innerHTML = '<i class="bi bi-plus-circle text-primary"></i> Thêm Thẻ Mới';
  updateModalImagePreview('');
  cardModal.show();
}

function openEditCardModal(id) {
  const card = cardsData.find(c => c.id === id);
  if (!card) return;

  document.getElementById('card-id').value = card.id;
  document.getElementById('card-img').value = card.imgUrl;
  document.getElementById('card-quantity').value = card.quantity || 1;
  document.getElementById('card-israre').checked = card.isRare;
  document.getElementById('modalTitle').innerHTML = '<i class="bi bi-pencil-square text-warning"></i> Chỉnh Sửa Thẻ';
  
  updateModalImagePreview(card.imgUrl);
  cardModal.show();
}

function updateModalImagePreview(url) {
  const previewBox = document.getElementById('modal-img-preview-box');
  const previewImg = document.getElementById('modal-img-preview');
  
  if (url && url.trim()) {
    previewImg.src = url.trim();
    previewBox.classList.remove('d-none');
  } else {
    previewBox.classList.add('d-none');
    previewImg.src = '';
  }
}

async function saveCard() {
  const id = document.getElementById('card-id').value;
  const url = document.getElementById('card-img').value.trim();
  const quantity = parseInt(document.getElementById('card-quantity').value, 10) || 1;
  const isRare = document.getElementById('card-israre').checked;

  if (!url) {
    Toast.fire({ icon: 'warning', title: 'Vui lòng nhập URL hình ảnh!' });
    return;
  }

  const saveBtn = document.getElementById('save-card-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang lưu...';

  try {
    const isEdit = Boolean(id);
    let endpoint = isEdit ? `${API_BASE_URL}/${id}` : API_BASE_URL;
    endpoint += `?url=${encodeURIComponent(url)}&rare=${isRare}&quantity=${quantity}`;

    const response = await fetch(endpoint, {
      method: isEdit ? 'PUT' : 'POST'
    });

    if (!response.ok) throw new Error('Không thể lưu thẻ!');

    cardModal.hide();
    Toast.fire({
      icon: 'success',
      title: isEdit ? 'Cập nhật thẻ thành công!' : 'Thêm thẻ mới thành công!'
    });

    await loadCards();
  } catch (error) {
    console.error('Save error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Lỗi',
      text: 'Không thể lưu thẻ vào hệ thống. Vui lòng kiểm tra lại kết nối Backend.',
      background: '#1e293b',
      color: '#fff'
    });
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Lưu Thẻ';
  }
}

function confirmDeleteCard(id) {
  Swal.fire({
    title: 'Xác nhận xóa thẻ?',
    text: 'Thao tác này sẽ xóa thẻ hoàn toàn khỏi kho dữ liệu.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f43f5e',
    cancelButtonColor: '#475569',
    confirmButtonText: 'Xóa ngay',
    cancelButtonText: 'Hủy',
    background: '#1e293b',
    color: '#fff'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');

        Toast.fire({ icon: 'success', title: 'Đã xóa thẻ khỏi hệ thống!' });
        await loadCards();
      } catch (error) {
        Toast.fire({ icon: 'error', title: 'Không thể xóa thẻ này!' });
      }
    }
  });
}

function confirmResetPool() {
  Swal.fire({
    title: 'Reset Pool Thẻ bài?',
    text: 'Bạn có chắc chắn muốn đặt lại toàn bộ thẻ về trạng thái chưa rút?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#475569',
    confirmButtonText: 'Xác nhận Reset',
    cancelButtonText: 'Hủy',
    background: '#1e293b',
    color: '#fff'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_BASE_URL}/reset`, { method: 'POST' });
        if (!response.ok) throw new Error('Reset failed');

        Toast.fire({ icon: 'success', title: 'Đã reset kho thẻ thành công!' });
        await loadCards();
      } catch (error) {
        Toast.fire({ icon: 'error', title: 'Lỗi khi reset pool!' });
      }
    }
  });
}

// =========================================================================
// Admin Draw Simulator
// =========================================================================
async function simulateDrawCard() {
  const drawBtn = document.getElementById('sim-draw-btn');
  const flipCard = document.getElementById('sim-flip-card');
  const simImg = document.getElementById('sim-card-img');
  const resultBox = document.getElementById('sim-result-box');

  drawBtn.disabled = true;
  drawBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Đang rút...';
  flipCard.classList.remove('flipped');
  resultBox.classList.add('d-none');

  try {
    const device = navigator.userAgent;
    const response = await fetch(`${API_BASE_URL}/draw?deviceInfo=${encodeURIComponent(device)}`, { method: 'POST' });
    
    if (response.status === 404) {
      resultBox.className = 'alert alert-danger py-2 px-3 fw-bold small rounded-pill mx-auto';
      resultBox.innerText = 'Hết thẻ trong kho! Vui lòng nạp thêm hoặc Reset Pool.';
      resultBox.classList.remove('d-none');
      drawBtn.disabled = false;
      drawBtn.innerHTML = 'Rút Lại';
      return;
    }

    if (!response.ok) throw new Error('Draw error');

    const card = await response.json();
    simImg.src = card.imgUrl;

    // Animate 3D Flip
    setTimeout(() => {
      flipCard.classList.add('flipped');

      setTimeout(() => {
        if (card.isRare) {
          resultBox.className = 'alert py-2 px-3 fw-bold small rounded-pill mx-auto text-white';
          resultBox.style.background = 'linear-gradient(135deg, #a855f7, #7c3aed)';
          resultBox.style.border = '1px solid #c084fc';
          resultBox.innerHTML = 'Chúc mừng! Bạn đã rút được Thẻ Hiếm!';
          triggerAdminConfetti();
        } else {
          resultBox.className = 'alert alert-secondary py-2 px-3 fw-bold small rounded-pill mx-auto';
          resultBox.style.background = '';
          resultBox.style.border = '';
          resultBox.innerHTML = 'Bạn đã rút được Thẻ Thường.';
        }
        resultBox.classList.remove('d-none');

        drawBtn.disabled = false;
        drawBtn.innerHTML = 'Rút Thêm 1 Thẻ Nữa';

        // Silently reload cards data in background
        loadCards();
      }, 700);
    }, 200);

  } catch (error) {
    console.error('Simulator error:', error);
    resultBox.className = 'alert alert-danger py-2 px-3 fw-bold small rounded-pill mx-auto';
    resultBox.innerText = 'Lỗi kết nối khi rút thẻ!';
    resultBox.classList.remove('d-none');
    drawBtn.disabled = false;
    drawBtn.innerHTML = 'Thử Lại';
  }
}

function triggerAdminConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}

// =========================================================================
// Lightbox & Clipboard Helpers
// =========================================================================
function openLightbox(url) {
  document.getElementById('lightbox-img').src = url;
  lightboxModal.show();
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    Toast.fire({ icon: 'info', title: 'Đã copy ID vào bộ nhớ tạm!' });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}