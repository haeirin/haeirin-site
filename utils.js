/* ===== GLOBAL UTILITY FUNCTIONS ===== */

// ===== API HELPERS =====
const API = {
  async get(table, params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`tables/${table}${query ? '?' + query : ''}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async getOne(table, id) {
    const res = await fetch(`tables/${table}/${id}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async create(table, data) {
    const res = await fetch(`tables/${table}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async update(table, id, data) {
    const res = await fetch(`tables/${table}/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async patch(table, id, data) {
    const res = await fetch(`tables/${table}/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async delete(table, id) {
    const res = await fetch(`tables/${table}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return true;
  }
};

// ===== AUTH =====
const Auth = {
  getUser() {
    try { const u = localStorage.getItem('shop_user'); return u ? JSON.parse(u) : null; }
    catch { return null; }
  },
  setUser(user) { localStorage.setItem('shop_user', JSON.stringify(user)); },
  logout() {
    localStorage.removeItem('shop_user');
    toast('로그아웃되었습니다.', 'default');
    setTimeout(() => { window.location.href = 'index.html'; }, 800);
  },
  isAdmin() { const u = this.getUser(); return u && u.role === 'admin'; },
  requireLogin() {
    if (!this.getUser()) {
      toast('로그인이 필요합니다.', 'warning');
      setTimeout(() => { window.location.href = 'login.html'; }, 900);
      return false;
    }
    return true;
  }
};

// ===== CART =====
const Cart = {
  KEY: 'shop_cart',
  get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; } },
  save(items) { localStorage.setItem(this.KEY, JSON.stringify(items)); this.updateBadge(); },
  add(item) {
    const items = this.get();
    const key = `${item.product_id}__${item.selected_color || ''}__${item.selected_size || ''}__${item.selected_extra || ''}`;
    const existing = items.find(i => i.cart_key === key);
    if (existing) { existing.quantity += item.quantity; }
    else { items.push({ ...item, cart_key: key }); }
    this.save(items); return items;
  },
  remove(cartKey) { const items = this.get().filter(i => i.cart_key !== cartKey); this.save(items); return items; },
  updateQty(cartKey, qty) {
    const items = this.get();
    const item = items.find(i => i.cart_key === cartKey);
    if (item) item.quantity = Math.max(1, qty);
    this.save(items); return items;
  },
  clear() { localStorage.removeItem(this.KEY); this.updateBadge(); },
  count() { return this.get().reduce((s, i) => s + (parseInt(i.quantity) || 0), 0); },
  total() { return this.get().reduce((s, i) => s + (i.product_price * i.quantity), 0); },
  updateBadge() {
    document.querySelectorAll('.cart-badge').forEach(b => {
      const c = this.count();
      b.textContent = c;
      b.style.display = c > 0 ? 'flex' : 'none';
    });
  }
};

// ===== SETTINGS CACHE =====
const Settings = {
  _cache: null,
  async getAll() {
    if (this._cache) return this._cache;
    try {
      const res = await API.get('settings', { limit: 100 });
      this._cache = {};
      (res.data || []).forEach(s => { this._cache[s.key] = s.value; });
    } catch { this._cache = {}; }
    return this._cache;
  },
  async get(key, def = '') {
    const all = await this.getAll();
    return all[key] !== undefined ? all[key] : def;
  },
  clearCache() { this._cache = null; }
};

// ===== FORMAT =====
function formatPrice(n) { return Number(n || 0).toLocaleString('ko-KR') + '원'; }
function formatDate(ms) {
  if (!ms) return '-';
  return new Date(Number(ms)).toLocaleString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}
function generateOrderNumber() {
  const d = new Date();
  const dt = String(d.getFullYear()).slice(-2) + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  return 'ORD-' + dt + '-' + Math.random().toString(36).substring(2,7).toUpperCase();
}
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substring(2,8); }
function hashPassword(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return Math.abs(h).toString(16);
}

// ===== TOAST =====
function toast(msg, type = 'default', dur = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  const icons = { success: '✅', error: '❌', warning: '⚠️', default: 'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icons[type] || icons.default}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, dur);
}

// ===== LOADING =====
function showLoading() {
  let el = document.getElementById('loadingOverlay');
  if (!el) {
    el = document.createElement('div'); el.id = 'loadingOverlay'; el.className = 'loading-overlay';
    el.innerHTML = '<div class="spinner"></div><p style="color:var(--text-muted);font-size:14px;">처리 중...</p>';
    document.body.appendChild(el);
  }
  el.classList.add('active');
}
function hideLoading() { const el = document.getElementById('loadingOverlay'); if (el) el.classList.remove('active'); }

// ===== MODAL =====
function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add('active'); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('active'); }
document.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active'); });

// ===== PHONE FORMAT =====
function initPhoneInput(el) {
  if (!el) return;
  el.addEventListener('input', () => {
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    if (v.length >= 8) v = v.replace(/(\d{3})(\d{4})(\d{0,4})/, '$1-$2-$3');
    else if (v.length >= 4) v = v.replace(/(\d{3})(\d{0,4})/, '$1-$2');
    el.value = v;
  });
}

// ===== HEADER RENDER =====
async function renderHeader(activePage = '') {
  const headerEl = document.getElementById('mainHeader');
  if (!headerEl) return;
  const shopName = await Settings.get('shop_name', 'My Shop');
  const user = Auth.getUser();
  const cartCount = Cart.count();
  headerEl.innerHTML = `
    <div class="header-inner">
      <a href="index.html" class="logo">🛍️ ${shopName}</a>
      <nav class="nav">
        <a href="index.html" class="${activePage==='home'?'active':''}">홈</a>
        <a href="index.html#products" class="${activePage==='products'?'active':''}">상품</a>
        ${Auth.isAdmin() ? `<a href="admin.html" class="${activePage==='admin'?'active':''}">관리자</a>` : ''}
      </nav>
      <div class="header-actions">
        <a href="cart.html" class="btn-icon" title="장바구니" style="font-size:22px;">
          🛒
          <span class="cart-badge" style="display:${cartCount>0?'flex':'none'}">${cartCount}</span>
        </a>
        ${user ? `
          <a href="mypage.html" class="btn btn-sm btn-outline" style="display:flex;align-items:center;gap:4px;" title="마이페이지">
            👤 <span style="max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${user.nickname}</span>
          </a>
          <button class="btn btn-sm btn-secondary" onclick="Auth.logout()">로그아웃</button>
        ` : `
          <a href="login.html" class="btn btn-sm btn-outline">로그인</a>
          <a href="register.html" class="btn btn-sm btn-primary">회원가입</a>
        `}
        <button class="hamburger" onclick="toggleMobileMenu()" aria-label="메뉴">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  `;
}

function toggleMobileMenu() {
  let menu = document.getElementById('mobileMenu');
  const user = Auth.getUser();
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'mobileMenu'; menu.className = 'mobile-menu';
    menu.innerHTML = `
      <div class="mobile-menu-inner">
        <a href="index.html">🏠 홈</a>
        <a href="index.html#products">🛍️ 상품</a>
        <a href="cart.html">🛒 장바구니</a>
        ${Auth.isAdmin() ? '<a href="admin.html">⚙️ 관리자</a>' : ''}
        <hr style="margin:8px 0;border:none;border-top:1px solid var(--border)">
        ${user
          ? `<a href="mypage.html">👤 마이페이지 (${user.nickname})</a>
             <a href="mypage.html?tab=orders">📦 주문 내역</a>
             <a href="mypage.html?tab=info">✏️ 내 정보 수정</a>
             <div class="m-link" onclick="Auth.logout()">🚪 로그아웃</div>`
          : `<a href="login.html">🔑 로그인</a><a href="register.html">✏️ 회원가입</a>`}
      </div>
    `;
    menu.addEventListener('click', e => { if (e.target === menu) menu.style.display = 'none'; });
    document.body.appendChild(menu);
  }
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

// ===== COLOR MAP =====
const COLOR_MAP = {
  '화이트':'#FFFFFF','흰색':'#FFFFFF','아이보리':'#FFFFF0','크림':'#FFFDD0',
  '블랙':'#111111','검정':'#111111','블랙계열':'#222222',
  '그레이':'#9CA3AF','회색':'#9CA3AF','라이트그레이':'#D1D5DB','다크그레이':'#4B5563',
  '네이비':'#1E3A5F','남색':'#1E3A5F','블루':'#3B82F6','파랑':'#3B82F6','라이트블루':'#93C5FD','스카이블루':'#7DD3FC',
  '레드':'#EF4444','빨강':'#EF4444','버건디':'#7F1D1D','와인':'#881337',
  '핑크':'#EC4899','분홍':'#EC4899','라이트핑크':'#FBCFE8',
  '옐로우':'#F59E0B','노랑':'#FCD34D','머스타드':'#B45309',
  '그린':'#10B981','초록':'#10B981','다크그린':'#065F46','올리브':'#65A30D','민트':'#6EE7B7','카키':'#6B7280',
  '베이지':'#D4B896','브라운':'#92400E','갈색':'#92400E','카멜':'#C19A6B','커피':'#6B3A2A',
  '퍼플':'#7C3AED','보라':'#7C3AED','라벤더':'#C4B5FD','바이올렛':'#8B5CF6',
  '오렌지':'#F97316','코랄':'#FB7185','살구':'#FDBA74',
  '실버':'#CBD5E1','골드':'#F59E0B',
};
function getColorHex(name) { return COLOR_MAP[name] || '#CBD5E1'; }

// ===== IMAGE PLACEHOLDER =====
function productImageHtml(thumbnail, name, size = '52px') {
  if (thumbnail) {
    return `<img src="${thumbnail}" alt="${name || ''}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<span style=\\'font-size:${size}\\'>🛍️</span>'">`;
  }
  return `<span style="font-size:${size}">🛍️</span>`;
}

// ===== PAYMENT STATUS =====
const PAYMENT_STATUS = {
  pending: { label: '결제 대기', badge: 'badge-warning' },
  transfer_confirmed: { label: '입금완료(고객)', badge: 'badge-info' },
  payment_confirmed: { label: '결제 확인', badge: 'badge-success' },
  shipped: { label: '배송 중', badge: 'badge-primary' },
  delivered: { label: '배송 완료', badge: 'badge-success' },
  cancelled: { label: '취소됨', badge: 'badge-danger' }
};
function statusBadge(status) {
  const s = PAYMENT_STATUS[status] || { label: status || '-', badge: 'badge-secondary' };
  return `<span class="badge ${s.badge}">${s.label}</span>`;
}

// ===== PARSE ARRAY FIELD =====
function parseArr(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}
