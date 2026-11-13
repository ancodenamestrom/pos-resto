    /* ==========================================================================
       UTILITIES & SECURITY
       ========================================================================== */
    function escapeHTML(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function formatRp(num) {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
    }

    function getNowFormatted() {
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    function showToast(msg, type = 'info') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `<span>${escapeHTML(msg)}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;">✕</button>`;
      container.appendChild(toast);
      setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4000);
    }

    /* FITUR KEAMANAN: VERIFIKASI KATA KUNCI / PIN */
    function verifyAuth(actionTitle = "aksi ini") {
      const pinRequired = appData.settings.authPin || "1234";
      const inputPin = prompt(`🔐 Masukkan Kata Kunci / PIN Keamanan untuk ${actionTitle}:`);
      if (inputPin === null) return false;
      if (inputPin === pinRequired) return true;
      showToast("Kata Kunci / PIN Keamanan Salah!", "danger");
      return false;
    }

    function verifyReservationDeleteAuth(actionTitle = "aksi reservasi") {
      const pinRequired = appData.settings.authPin || "1234";
      return new Promise(resolve => {
        let modal = document.getElementById('reservation-code-auth-modal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'reservation-code-auth-modal';
          modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.62);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px;';
          modal.innerHTML = `<div style="width:min(380px,100%);background:var(--card-bg,#fff);color:var(--text-color,#1f2937);border-radius:14px;padding:22px;box-shadow:0 18px 50px rgba(0,0,0,.28);">
            <h3 style="margin:0 0 8px;">🔐 Verifikasi Kata Sandi</h3>
            <p id="reservation-code-auth-title" style="margin:0 0 14px;font-size:.9rem;"></p>
            <label for="reservation-code-auth-input" style="display:block;margin-bottom:6px;font-size:.85rem;font-weight:700;">Kata sandi / PIN</label>
            <input id="reservation-code-auth-input" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi" style="width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:1rem;">
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
              <button type="button" id="reservation-code-auth-cancel" class="btn btn-outline">Batal</button>
              <button type="button" id="reservation-code-auth-confirm" class="btn btn-primary">Konfirmasi</button>
            </div>
          </div>`;
          document.body.appendChild(modal);
        }
        const input = modal.querySelector('#reservation-code-auth-input');
        const title = modal.querySelector('#reservation-code-auth-title');
        const cancel = modal.querySelector('#reservation-code-auth-cancel');
        const confirmBtn = modal.querySelector('#reservation-code-auth-confirm');
        title.textContent = `Masukkan kata sandi untuk ${actionTitle}.`;
        input.value = '';
        modal.style.display = 'flex';
        const finish = result => {
          modal.style.display = 'none';
          cancel.onclick = confirmBtn.onclick = input.onkeydown = null;
          resolve(result);
        };
        cancel.onclick = () => finish(false);
        confirmBtn.onclick = () => {
          if (input.value === pinRequired) finish(true);
          else {
            showToast('Kata sandi / PIN salah!', 'danger');
            input.value = '';
            input.focus();
          }
        };
        input.onkeydown = e => {
          if (e.key === 'Enter') confirmBtn.click();
          if (e.key === 'Escape') cancel.click();
        };
        setTimeout(() => input.focus(), 0);
      });
    }
    /* ==========================================================================
       STATE MANAGEMENT & LOCAL STORAGE
       ========================================================================== */
    let appData = {
      savedAt: new Date().toISOString(),
      settings: {},
      products: [],
      pendingOrders: [],
      reservations: [],
      sales: [],
      queueCounter: 1,
      stokHistory: []
    };

    let cart = [];
    let currentOrderType = 'Dine In';
    let currentKasirName = '';
    let currentReceiptTrx = null;

    function initApp() {
      try {
        const seedElement = document.getElementById('seed');
        const seedData = JSON.parse(seedElement.textContent);
        const localRaw = localStorage.getItem('world_taste_pos_app_data');
        let localResList = [];

        if (localRaw) {
          const localData = JSON.parse(localRaw);
          localResList = Array.isArray(localData.reservations) ? localData.reservations : [];
          if (new Date(localData.savedAt || 0) > new Date(seedData.savedAt || 0)) {
            appData = localData;
          } else {
            appData = seedData;
          }
        } else {
          appData = seedData;
        }

        // Pastikan konfigurasi meja dinamis tersedia untuk data lama maupun baru.
        if (!appData.settings) appData.settings = {};
        if (!appData.settings.tableCounts) appData.settings.tableCounts = {};
        // RIWAYAT RESERVASI TIDAK BOLEH HILANG: gabungkan reservasi tanggal lewat dari file (seed), data browser, dan arsip
        if (!Array.isArray(appData.reservations)) appData.reservations = [];
        appData.reservations = mergeReservationHistory(appData.reservations, [seedData.reservations, localResList, loadReservationArchive()]);

        // Migrasi nama kelompok lama -> Group 3 5C Manajerial Accounting
        if (!appData.settings.groupName || /Kelompok 1 D4/i.test(appData.settings.groupName)) {
          appData.settings.groupName = 'Group 3 5C Manajerial Accounting';
        }
        if (appData.settings.ppnRate === undefined) appData.settings.ppnRate = 10;
        if (appData.settings.serviceRate === undefined) appData.settings.serviceRate = 5;
        if (appData.settings.takeAwayFee === undefined) appData.settings.takeAwayFee = 2000;
        if (!appData.settings.defaultKasir) appData.settings.defaultKasir = 'Kasir Utama';
        if (!appData.settings.authPin) appData.settings.authPin = '1234';
        if (!appData.pendingOrders) appData.pendingOrders = [];
        if (!appData.reservations) appData.reservations = [];
        if (!appData.queueCounter) appData.queueCounter = 1;

        currentKasirName = appData.settings.defaultKasir;
        document.getElementById('cart-kasir-name').value = currentKasirName;

      } catch (e) {
        console.error("Gagal membaca storage, menggunakan default state:", e);
      }

      const autoCancelledOnLoad = autoCancelLateReservations(true);
      applySettingsToUI();
      renderAll();
      checkLowStockAlerts(true);
      if (autoCancelledOnLoad > 0) {
        showToast(`${autoCancelledOnLoad} reservasi dibatalkan otomatis karena tamu terlambat lebih dari ${RESERVATION_GRACE_MINUTES} menit.`, "warning");
      }
      startReservationWatcher();
      publishMenuPublic(true);
      startOnlineOrderWatcher();
    }

    /* ==========================================================================
       ARSIP RIWAYAT RESERVASI
       Reservasi yang tanggalnya sudah lewat = riwayat: tidak bisa dihapus, ikut tersimpan di file HTML,
       dan disalin ke arsip terpisah di browser agar tetap ada walau data aplikasi di-reset / diganti.
       ========================================================================== */
    const RES_ARCHIVE_KEY = 'world_taste_reservation_archive';
    function todayDateStr() {
      const d = new Date(), p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }
    function isPastReservation(r) {
      const day = String((r && r.datetime) || '').substring(0, 10);
      return !!day && day < todayDateStr();
    }
    function loadReservationArchive() {
      try { const v = JSON.parse(localStorage.getItem(RES_ARCHIVE_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
    }
    // Tambahkan reservasi riwayat (tanggal lewat) dari sumber lain yang belum ada di daftar utama
    function mergeReservationHistory(list, others) {
      const map = new Map();
      (list || []).forEach(r => { if (r && r.id) map.set(r.id, r); });
      (others || []).forEach(src => (src || []).forEach(r => {
        if (r && r.id && !map.has(r.id) && isPastReservation(r)) map.set(r.id, r);
      }));
      return Array.from(map.values());
    }
    function archiveReservationHistory() {
      try {
        const map = new Map(loadReservationArchive().map(r => [r.id, r]));
        (appData.reservations || []).forEach(r => { if (r && r.id && isPastReservation(r)) map.set(r.id, r); });
        localStorage.setItem(RES_ARCHIVE_KEY, JSON.stringify(Array.from(map.values())));
      } catch (e) { console.warn('Arsip reservasi gagal:', e); }
    }


    /* ==========================================================================
       SINKRONISASI DENGAN HALAMAN "PESAN ONLINE"
       - Kasir menerbitkan menu (harga, DISKON, stok) + status meja ke localStorage
         key "wt_menu_public" setiap ada perubahan data. Tombol Refresh di
         Pesan_Online mengambil data ini.
       - Pesanan dari Pesan_Online (key "wt_online_queue") otomatis masuk ke
         Pesanan Aktif; hasilnya dikabarkan balik lewat "wt_online_status".
       ========================================================================== */
    const WT_PUB_KEY = 'wt_menu_public', WT_QUEUE_KEY = 'wt_online_queue', WT_STATUS_KEY = 'wt_online_status';
    let wtLastPub = '';

    function wtReadJSON(key, fallback) {
      try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; }
    }

    function publishMenuPublic(force) {
      try {
        syncTableCounts();
        const busyMap = getTableStatusMap(todayDateStr());
        const sold = {};
        (appData.sales || []).forEach(s => (s.items || []).forEach(i => { sold[i.productId] = (sold[i.productId] || 0) + (Number(i.qty) || 0); }));
        const tables = {};
        getAllTables().forEach(t => { const s = busyMap[tableKey(t.label)]; tables[t.label] = s ? s.status : 'free'; });
        const st = appData.settings || {};
        const pub = {
          settings: { storeName: st.storeName, serviceRate: st.serviceRate, ppnRate: st.ppnRate, takeAwayFee: st.takeAwayFee, tableCounts: st.tableCounts, contactWA: st.contactWA || '' },
          products: (appData.products || []).map(p => ({
            id: p.id, name: p.name, category: p.category, price: Number(p.price) || 0, stock: Number(p.stock) || 0,
            discountType: p.discountType === 'rupiah' ? 'rupiah' : 'percent', discountValue: Number(p.discountValue) || 0, sold: sold[p.id] || 0
          })),
          tables: tables
        };
        const sig = JSON.stringify(pub);
        if (!force && sig === wtLastPub) return;      // tidak ada perubahan -> jangan ganggu halaman pelanggan
        wtLastPub = sig;
        pub.at = new Date().toISOString();
        localStorage.setItem(WT_PUB_KEY, JSON.stringify(pub));
      } catch (e) { console.warn('Publikasi menu ke Pesan Online gagal:', e); }
    }

    function importOnlineOrder(o) {
      const items = Array.isArray(o.items) ? o.items : [];
      if (!items.length) return { status: 'ditolak', reason: 'kosong' };
      if ((appData.pendingOrders || []).some(x => x.onlineCode === o.code)) return { status: 'diterima', ref: (appData.pendingOrders.find(x => x.onlineCode === o.code) || {}).orderRef || '' };

      // Validasi memakai data KASIR (harga, diskon & stok terbaru), bukan angka dari pelanggan
      for (const it of items) {
        const p = appData.products.find(x => x.id == it.id), q = Number(it.qty) || 0;
        if (!p || q <= 0 || p.stock < q) return { status: 'ditolak', reason: 'stok', name: p ? p.name : '' };
      }
      const type = o.type === 'Take Away' ? 'Take Away' : 'Dine In';
      let ref;
      if (type === 'Dine In') {
        const t = getAllTables().find(x => tableKey(x.label) === tableKey(o.table));
        if (!t) return { status: 'ditolak', reason: 'meja', name: String(o.table || '') };
        ref = t.label;
      } else {
        ref = `Antrean A-${String(appData.queueCounter++).padStart(3, '0')}`;
      }

      const now = getNowFormatted();
      let gross = 0, disc = 0, net = 0;
      const orderItems = items.map(it => {
        const p = appData.products.find(x => x.id == it.id), q = Number(it.qty);
        const g = p.price * q, d = getProductDiscountAmount(p, q), line = Math.max(0, g - d);
        gross += g; disc += d; net += line;
        p.stock -= q;
        appData.stokHistory.unshift({
          id: 'MUT-' + Math.random().toString(36).substr(2, 9), time: now, productId: p.id, productName: p.name,
          type: 'Keluar', qty: q, notes: `Pesanan Online ${o.code} (${type}: ${ref})`
        });
        return { productId: p.id, productName: p.name, category: p.category, qty: q, unitPrice: p.price, discount: d, netSales: line };
      });
      const ta = type === 'Take Away' ? (parseFloat(appData.settings.takeAwayFee) || 0) : 0;
      const sr = parseFloat(appData.settings.serviceRate) || 5, sc = Math.round(net * sr / 100);
      const pr = parseFloat(appData.settings.ppnRate) || 10, ppn = Math.round((net + ta + sc) * pr / 100);
      appData.pendingOrders.unshift({
        id: 'PEND-' + Math.random().toString(36).substr(2, 9), orderRef: ref, orderType: type,
        orderNotes: `[ONLINE ${o.code}] ${o.name || ''} (${o.phone || '-'})` + (o.notes ? ' – ' + o.notes : ''),
        date: now, kasirName: 'Pesan Online', items: orderItems,
        grossSubtotal: gross, totalDiscount: disc, subtotal: net, takeAwayFee: ta, serviceRate: sr, serviceCharge: sc,
        ppnRate: pr, ppnTax: ppn, grandTotal: net + ta + sc + ppn, onlineCode: o.code
      });
      if (type === 'Dine In') occupyTable(ref);
      return { status: 'diterima', ref };
    }

    function processOnlineOrders() {
      try {
        const queue = wtReadJSON(WT_QUEUE_KEY, []);
        if (!Array.isArray(queue) || !queue.length) return;
        const status = wtReadJSON(WT_STATUS_KEY, {});
        let changed = false, accepted = 0;
        queue.forEach(o => {
          if (!o || !o.code || status[o.code]) return;
          if (Date.now() - (Number(o.createdAt) || 0) > 2 * 864e5) return;   // abaikan antrean basi (> 2 hari)
          const res = importOnlineOrder(o);
          status[o.code] = Object.assign({ at: Date.now() }, res);
          changed = true; if (res.status === 'diterima') accepted++;
        });
        if (!changed) return;
        const keys = Object.keys(status);
        if (keys.length > 500) keys.sort((a, b) => (status[a].at || 0) - (status[b].at || 0)).slice(0, keys.length - 500).forEach(c => delete status[c]);
        localStorage.setItem(WT_STATUS_KEY, JSON.stringify(status));
        saveData();               // sekaligus menerbitkan stok & status meja terbaru
        renderAll();
        if (accepted) { showToast(`${accepted} pesanan online baru masuk ke Pesanan Aktif.`, 'success'); checkLowStockAlerts(); }
      } catch (e) { console.warn('Proses pesanan online gagal:', e); }
    }

    function refreshKasirSync(manual) {
      try {
        const before = (appData.pendingOrders || []).length;
        const stBefore = Object.keys(wtReadJSON(WT_STATUS_KEY, {})).length;
        processOnlineOrders();
        const stAfter = wtReadJSON(WT_STATUS_KEY, {});
        const handled = Object.keys(stAfter).length - stBefore;
        const added = (appData.pendingOrders || []).length - before;
        publishMenuPublic(true);
        renderAll();
        if (manual) {
          if (handled > 0) showToast(`Refresh selesai: ${added} pesanan online masuk${handled - added > 0 ? `, ${handled - added} ditolak (stok/meja)` : ''}. Menu, diskon & stok sudah diterbitkan ke Pesan Online.`, 'success');
          else showToast('Refresh selesai: tidak ada pesanan online baru. Menu, diskon & stok sudah diterbitkan ke Pesan Online.', 'info');
        }
      } catch (e) { console.warn('Refresh gagal:', e); if (manual) showToast('Refresh gagal, coba lagi.', 'danger'); }
    }

    function startOnlineOrderWatcher() {
      processOnlineOrders();
      publishMenuPublic();                      // terbitkan menu sejak awal agar halaman pesan langsung tersambung
      setInterval(processOnlineOrders, 2000);
      setInterval(publishMenuPublic, 15000);     // jaga status meja/reservasi tetap segar (hanya menulis bila berubah)
      window.addEventListener('storage', e => { if (e.key === WT_QUEUE_KEY) processOnlineOrders(); });
      // Data kasir diubah dari perangkat/tab lain (sinkron Supabase) -> pakai versi yang lebih baru
      window.addEventListener('storage', e => {
        if (e.key !== 'world_taste_pos_app_data' || !e.newValue) return;
        try {
          const d = JSON.parse(e.newValue);
          if (!d || !Array.isArray(d.products) || new Date(d.savedAt || 0) <= new Date(appData.savedAt || 0)) return;
          appData = d;
          wtLastPub = '';
          renderAll();
        } catch (err) { console.warn('Gagal memuat data kasir terbaru:', err); }
      });
      window.addEventListener('focus', () => refreshKasirSync(false));
    }

    function saveData() {
      appData.savedAt = new Date().toISOString();
      archiveReservationHistory();
      try {
        localStorage.setItem('world_taste_pos_app_data', JSON.stringify(appData));
        publishMenuPublic();
      } catch (e) {
        showToast("Storage penuh! Gagal menyimpan foto berukuran besar.", "danger");
      }
    }

    function handleImageUpload(inputEl, maxPx, callback) {
      const file = inputEl.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast("Hanya file gambar yang diperbolehkan!", "danger");
        inputEl.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > h) {
            if (w > maxPx) { h *= maxPx / w; w = maxPx; }
          } else {
            if (h > maxPx) { w *= maxPx / h; h = maxPx; }
          }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const base64 = canvas.toDataURL('image/jpeg', 0.75);
          callback(base64);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    /* ==========================================================================
       UI & NAVIGATION
       ========================================================================== */
    function switchTab(tabId) {
      document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

      const targetPane = document.getElementById(`tab-${tabId}`);
      if (targetPane) targetPane.classList.add('active');
      
      const eventBtn = Array.from(document.querySelectorAll('.nav-tab')).find(b => b.getAttribute('onclick').includes(tabId));
      if (eventBtn) eventBtn.classList.add('active');

      renderAll();
    }

    function renderAll() {
      renderKasirCategoryFilter();
      renderKasirCategoryPills();
      renderKasirProducts();
      renderCart();
      renderActiveOrders();
      renderReservations();
      renderMasterTable();
      renderStokOverview();
      renderStokTable();
      renderStokHistory();
      renderSalesHistory();
      renderTablePicker();
    }

    /* ==========================================================================
       FITUR MEJA TERSEDIA (INDOOR 15 MEJA, OUTDOOR 15 MEJA)
       Status: Terisi = ada tamu Dine In di meja tsb. Meja tetap terisi sampai kasir
                        menekan tombol "Selesai" (tamu sudah selesai memakai meja).
               Dipesan = ada reservasi berstatus Pending pada tanggal yang sama.
       ========================================================================== */
    const TABLE_AREAS = [
      { name: 'Indoor', count: 15 },
      { name: 'Outdoor', count: 15 }
    ];
    let currentTableArea = 'Indoor';
    let currentReservationTableArea = 'Indoor';

    function syncTableCounts() {
      if (!appData.settings) appData.settings = {};
      if (!appData.settings.tableCounts) appData.settings.tableCounts = {};
      TABLE_AREAS.forEach(a => {
        const saved = Number(appData.settings.tableCounts[a.name]);
        if (Number.isFinite(saved) && saved >= 1) a.count = Math.min(500, Math.floor(saved));
        else appData.settings.tableCounts[a.name] = a.count;
      });
    }

    function addRestaurantTable(area) {
      const config = TABLE_AREAS.find(a => a.name === area);
      if (!config) return;
      syncTableCounts();
      if (config.count >= 500) {
        showToast('Maksimal 500 meja per area.', 'warning');
        return;
      }
      config.count += 1;
      appData.settings.tableCounts[area] = config.count;
      saveData();
      renderTablePicker();
      renderResTablePicker();
      showToast(`Meja ${area} ${String(config.count).padStart(2, '0')} berhasil ditambahkan.`, 'success');
    }

    function getAllTables() {
      syncTableCounts();
      const list = [];
      TABLE_AREAS.forEach(a => {
        for (let i = 1; i <= a.count; i++) list.push({ area: a.name, no: i, label: `${a.name} ${String(i).padStart(2, '0')}` });
      });
      return list;
    }

    // Menyamakan penulisan: "Meja Indoor 5" = "indoor 05" = "Indoor-05"
    function tableKey(name) {
      return String(name || '').toLowerCase().replace(/meja/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\b0+(\d)/g, '$1');
    }

    function todayDateStr() {
      const d = new Date(), p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }

    // dateStr format YYYY-MM-DD; excludeResId = reservasi yang sedang diedit
    function getTableStatusMap(dateStr, excludeResId) {
      const map = {};
      (appData.reservations || []).forEach(r => {
        if (r.id === excludeResId || r.status !== 'Pending') return;
        if (String(r.datetime || '').slice(0, 10) !== dateStr) return;
        const k = tableKey(r.table);
        if (!map[k]) map[k] = { status: 'booked', info: `Reservasi ${r.name} jam ${String(r.datetime).slice(11, 16)}` };
      });
      if (dateStr === todayDateStr()) {
        // Meja terisi sampai dikosongkan manual oleh kasir
        const occ = appData.tableOccupancy || {};
        Object.keys(occ).forEach(k => {
          map[k] = { status: 'busy', since: occ[k].since, info: `Terisi sejak ${String(occ[k].since || '').slice(11, 16)}` };
        });
      }
      return map;
    }

    // Tandai meja terisi (dipanggil saat pesanan Dine In disimpan / dibayar langsung)
    function occupyTable(label) {
      const t = getAllTables().find(x => tableKey(x.label) === tableKey(label));
      if (!t) return; // hanya meja Indoor / Outdoor yang dilacak
      if (!appData.tableOccupancy) appData.tableOccupancy = {};
      const k = tableKey(t.label);
      if (!appData.tableOccupancy[k]) appData.tableOccupancy[k] = { label: t.label, since: getNowFormatted() };
    }

    // Kosongkan meja secara manual (tamu sudah selesai)
    function releaseTable(label) {
      const k = tableKey(label);
      if (!appData.tableOccupancy || !appData.tableOccupancy[k]) return;
      const hasUnpaid = (appData.pendingOrders || []).some(o => o.orderType === 'Dine In' && tableKey(o.orderRef) === k);
      const msg = hasUnpaid
        ? `Meja ${label} masih punya pesanan yang BELUM DIBAYAR.\nTetap kosongkan meja ini?`
        : `Tamu di meja ${label} sudah selesai?\nMeja akan ditandai TERSEDIA.`;
      if (!confirm(msg)) return;
      delete appData.tableOccupancy[k];
      saveData();
      renderTablePicker();
      showToast(`Meja ${label} sekarang tersedia.`, "success");
    }

    function renderTablePicker() {
      const grid = document.getElementById('tp-grid');
      const tabs = document.getElementById('tp-tabs');
      if (!grid || !tabs || typeof appData === 'undefined' || !appData) return;

      const statusMap = getTableStatusMap(todayDateStr());
      const selectedKey = tableKey(document.getElementById('cart-table-no').value);
      const tables = getAllTables();
      const isFree = t => !statusMap[tableKey(t.label)];

      tabs.innerHTML = TABLE_AREAS.map(a => {
        const inArea = tables.filter(t => t.area === a.name);
        const free = inArea.filter(isFree).length;
        return `<button type="button" class="tp-tab ${a.name === currentTableArea ? 'active' : ''}" onclick="selectTableArea('${a.name}')">${a.name} (${free}/${a.count})</button>`;
      }).join('') + TABLE_AREAS.map(a => `<button type="button" class="tp-tab tp-add-table" onclick="addRestaurantTable('${a.name}')">＋ ${a.name}</button>`).join('');

      grid.innerHTML = tables.filter(t => t.area === currentTableArea).map(t => {
        const st = statusMap[tableKey(t.label)];
        const cls = st ? st.status : 'free';
        const title = st ? `${t.label}: ${st.info}` : `${t.label}: Tersedia`;
        const sel = tableKey(t.label) === selectedKey ? 'selected' : '';
        return `<button type="button" class="tp-seat ${cls} ${sel}" title="${escapeHTML(title)}" onclick="pickTable('${t.label}')">${String(t.no).padStart(2, '0')}</button>`;
      }).join('');

      const totalFree = tables.filter(isFree).length;
      document.getElementById('tp-summary').innerText = `Tersedia: ${totalFree}/${tables.length}`;

      // Daftar meja terisi + tombol Selesai (kosongkan manual)
      const busyList = document.getElementById('tp-busy-list');
      if (busyList) {
        const occ = Object.values(appData.tableOccupancy || {}).sort((a, b) => a.label.localeCompare(b.label));
        busyList.innerHTML = occ.length === 0 ? '' : `
          <div style="font-size:0.75rem; font-weight:700; margin:8px 0 4px; color:var(--text-main);">Meja Terisi (klik Selesai jika tamu sudah pergi):</div>
          <div style="display:flex; flex-wrap:wrap; gap:4px;">
            ${occ.map(o => `
              <span style="display:inline-flex; align-items:center; gap:4px; padding:3px 4px 3px 8px; border-radius:999px; background:rgba(239,68,68,.12); color:var(--danger); font-size:0.75rem; font-weight:700;">
                ${escapeHTML(o.label)} · ${String(o.since || '').slice(11, 16)}
                <button type="button" onclick="releaseTable('${o.label}')" style="border:none; border-radius:999px; padding:2px 8px; background:var(--success); color:#fff; font-size:0.7rem; font-weight:700; cursor:pointer;">✔ Selesai</button>
              </span>`).join('')}
          </div>`;
      }
    }

    function selectTableArea(area) {
      currentTableArea = area;
      renderTablePicker();
    }

    function pickTable(label) {
      const st = getTableStatusMap(todayDateStr())[tableKey(label)];
      if (st && st.status === 'busy') {
        // Meja terisi: tawarkan untuk mengosongkan, atau tambah pesanan ke meja yang sama
        if (confirm(`Meja ${label} sedang TERISI (${st.info}).\n\nOK = Tamu sudah selesai, kosongkan meja\nBatal = Tidak jadi`)) {
          releaseTable(label);
        }
        return;
      }
      if (!confirmTableUse(label)) return;
      document.getElementById('cart-table-no').value = label;
      renderTablePicker();
    }

    // Konfirmasi bila meja sedang terisi / sudah dipesan. true = boleh dipakai.
    function confirmTableUse(label) {
      const st = getTableStatusMap(todayDateStr())[tableKey(label)];
      if (!st) return true;
      if (st.status === 'busy') return confirm(`Meja ${label} sedang TERISI (${st.info}).\nTambahkan pesanan ke meja ini?`);
      return confirm(`Meja ${label} sudah DIPESAN (${st.info}).\nTetap gunakan meja ini?`);
    }

    // Dropdown meja di form reservasi, status mengikuti tanggal reservasi yang dipilih
    function selectReservationTableArea(area) {
      currentReservationTableArea = area;
      renderResTablePicker();
    }

    function chooseReservationTable(label) {
      const dateStr = (document.getElementById('res-datetime').value || '').slice(0, 10) || todayDateStr();
      const statusMap = getTableStatusMap(dateStr, document.getElementById('res-id').value);
      const status = statusMap[tableKey(label)];
      if (status) {
        showToast(`${label} tidak tersedia: ${status.info}. Silakan pilih meja lain.`, 'warning');
        renderResTablePicker();
        return;
      }
      document.getElementById('res-table').value = label;
      renderResTablePicker();
    }

    function renderResTablePicker() {
      const grid = document.getElementById('res-tp-grid');
      const tabs = document.getElementById('res-tp-tabs');
      if (!grid || !tabs) return;
      const dateStr = (document.getElementById('res-datetime').value || '').slice(0, 10) || todayDateStr();
      const statusMap = getTableStatusMap(dateStr, document.getElementById('res-id').value);
      const current = tableKey(document.getElementById('res-table').value);
      const tables = getAllTables();
      const freeTables = tables.filter(t => !statusMap[tableKey(t.label)]).length;

      tabs.innerHTML = TABLE_AREAS.map(a => {
        const free = tables.filter(t => t.area === a.name && !statusMap[tableKey(t.label)]).length;
        return `<button type="button" class="tp-tab ${a.name === currentReservationTableArea ? 'active' : ''}" onclick="selectReservationTableArea('${a.name}')">${a.name} (${free}/${a.count})</button>`;
      }).join('') + TABLE_AREAS.map(a => `<button type="button" class="tp-tab tp-add-table" onclick="addRestaurantTable('${a.name}')">＋ ${a.name}</button>`).join('');

      grid.innerHTML = tables.filter(t => t.area === currentReservationTableArea).map(t => {
        const st = statusMap[tableKey(t.label)];
        const cls = st ? st.status : 'free';
        const selected = tableKey(t.label) === current ? 'selected' : '';
        const title = st ? `${t.label}: ${st.info}` : `${t.label}: Tersedia`;
        return `<button type="button" class="tp-seat ${cls} ${selected}" title="${escapeHTML(title)}" ${st ? 'disabled aria-disabled="true"' : `onclick="chooseReservationTable('${t.label}')"`}>${String(t.no).padStart(2, '0')}</button>`;
      }).join('');

      const summary = document.getElementById('res-table-summary');
      if (summary) summary.innerText = `${freeTables} meja tersedia · ${dateStr}`;
      const sel = document.getElementById('res-table-pick');
      if (sel) {
        sel.innerHTML = '<option value="">Pilih meja</option>' + tables.map(t => {
          const st = statusMap[tableKey(t.label)];
          return `<option value="${t.label}" ${st ? 'disabled' : ''} ${tableKey(t.label) === current ? 'selected' : ''}>${t.label}${st ? ' - Tidak tersedia' : ' - Tersedia'}</option>`;
        }).join('');
      }
    }

    /* ==========================================================================
       1. KASIR & DINE IN / TAKE AWAY QUEUE LOGIC
       ========================================================================== */
    function setOrderType(type) {
      currentOrderType = type;
      document.getElementById('btn-dine-in').classList.toggle('active', type === 'Dine In');
      document.getElementById('btn-take-away').classList.toggle('active', type === 'Take Away');
      
      const fieldDineIn = document.getElementById('field-dine-in');
      const fieldTakeAway = document.getElementById('field-take-away');
      const takeawayRow = document.getElementById('row-takeaway-fee');

      if (type === 'Dine In') {
        fieldDineIn.style.display = 'block';
        fieldTakeAway.style.display = 'none';
        takeawayRow.style.display = 'none';
      } else {
        fieldDineIn.style.display = 'none';
        fieldTakeAway.style.display = 'block';
        takeawayRow.style.display = 'flex';
        if (!document.getElementById('cart-customer-name').value.trim()) {
          autoGenerateQueueNo();
        }
      }
      renderCart(false);
    }

    function autoGenerateQueueNo() {
      const pad = String(appData.queueCounter).padStart(3, '0');
      document.getElementById('cart-customer-name').value = `Antrean A-${pad}`;
    }

    function updateKasirName(name) {
      currentKasirName = name.trim() || appData.settings.defaultKasir;
      document.getElementById('disp-kasir-header').innerText = currentKasirName;
    }

    
    let selectedCategory = '';

    function selectCategoryFilter(catName) {
      selectedCategory = catName;
      const sel = document.getElementById('kasir-category-filter');
      if(sel) sel.value = catName;
      renderKasirCategoryPills();
      renderKasirProducts();
    }

    function renderKasirCategoryPills() {
      const container = document.getElementById('category-pills-container');
      if (!container) return;

      const categoryIcons = {
        'Semua': '🌐',
        'Japanese': '🍱',
        'Chinese': '🥟',
        'Indian': '🍛',
        'Western': '🥩',
        'Indonesian': '🍚',
        'Hot Drinks': '☕',
        'Ice Drinks': '🍹',
        'Dessert & Snacks': '🧇',
        'Ice Cream': '🍦'
      };

      const cats = [...new Set(appData.products.map(p => p.category).filter(Boolean))];
      
      let html = `
        <button type="button" class="category-pill ${selectedCategory === '' ? 'active' : ''}" onclick="selectCategoryFilter('')">
          <span>🌐 Semua</span> <span style="opacity:0.8; font-size:0.75rem;">(${appData.products.length})</span>
        </button>
      `;

      cats.forEach(c => {
        const count = appData.products.filter(p => p.category === c).length;
        const icon = categoryIcons[c] || '🍽️';
        const isActive = selectedCategory === c ? 'active' : '';
        html += `
          <button type="button" class="category-pill ${isActive}" onclick="selectCategoryFilter('${c}')">
            <span>${icon} ${escapeHTML(c)}</span> <span style="opacity:0.8; font-size:0.75rem;">(${count})</span>
          </button>
        `;
      });

      container.innerHTML = html;
    }

    function renderKasirCategoryFilter() {
      const select = document.getElementById('kasir-category-filter');
      const datalist = document.getElementById('category-datalist');
      const cats = [...new Set(appData.products.map(p => p.category).filter(Boolean))];
      
      select.innerHTML = '<option value="">Semua Kategori</option>' + cats.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
      datalist.innerHTML = cats.map(c => `<option value="${escapeHTML(c)}">`).join('');
    }

    function renderKasirProducts() {
      const search = document.getElementById('kasir-search').value.toLowerCase();
      const cat = selectedCategory || document.getElementById('kasir-category-filter').value;
      const grid = document.getElementById('kasir-product-grid');
      
      const filtered = appData.products.filter(p => {
        const matchName = p.name.toLowerCase().includes(search);
        const matchCat = !cat || p.category === cat;
        return matchName && matchCat;
      });

      // Peringkat 1-3 untuk kelompok besar: Makanan, Minuman, Dessert.
      // Selain itu, tetap tampilkan juara untuk setiap kategori asli (Japanese, Chinese, dll).
      const normalizeBestCategory = value => {
        const c = String(value || '').toLowerCase().trim();
        if (/minum|drink|beverage|juice|coffee|kopi|tea|teh|ice drinks|hot drinks/.test(c)) return 'minuman';
        if (/dessert|desert|penutup|pencuci|sweet|manis|ice cream/.test(c)) return 'dessert';
        if (/makan|food|main course|appetizer|rice|noodle|mie|ramen|japanese|chinese|indian|western|indonesian|korean|thai|italian|asian|snack/.test(c)) return 'makanan';
        return '';
      };
      const productCategoryByName = new Map((appData.products || []).map(p => [
        String(p.name || '').trim().toLowerCase(), p.category || ''
      ]));
      const soldByMacroMenu = new Map();
      const soldByOriginalCategory = new Map();
      (appData.sales || []).forEach(sale => (sale.items || []).forEach(item => {
        const name = String(item.productName || item.name || '').trim().toLowerCase();
        const qty = Math.max(0, Number(item.qty) || 0);
        const rawCategory = String(item.category || productCategoryByName.get(name) || 'Tanpa Kategori').trim();
        const macro = normalizeBestCategory(rawCategory);
        if (!name || !qty) return;
        if (macro) {
          const key = `${macro}|||${name}`;
          const current = soldByMacroMenu.get(key) || { name, category: macro, qty: 0 };
          current.qty += qty;
          soldByMacroMenu.set(key, current);
        }
        const rawKey = `${rawCategory.toLowerCase()}|||${name}`;
        const rawCurrent = soldByOriginalCategory.get(rawKey) || { name, category: rawCategory, qty: 0 };
        rawCurrent.qty += qty;
        soldByOriginalCategory.set(rawKey, rawCurrent);
      }));
      const rankedMenus = new Map();
      ['makanan', 'minuman', 'dessert'].forEach(category => {
        [...soldByMacroMenu.values()]
          .filter(item => item.category === category)
          .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name))
          .slice(0, 3)
          .forEach((item, index) => rankedMenus.set(`${category}|||${item.name}`, index + 1));
      });
      const bestSellerByOriginalCategory = new Map();
      const rawCategories = new Map();
      [...soldByOriginalCategory.values()].forEach(item => {
        const key = item.category.toLowerCase();
        const current = rawCategories.get(key);
        if (!current || item.qty > current.qty || (item.qty === current.qty && item.name.localeCompare(current.name) < 0)) {
          rawCategories.set(key, item);
        }
      });
      rawCategories.forEach((winner, key) => bestSellerByOriginalCategory.set(key, winner.name));

      grid.innerHTML = filtered.map(p => {
        const isOutOfStock = p.stock <= 0;
        const initial = p.name ? p.name.charAt(0).toUpperCase() : '?';
        const imgHtml = p.img
          ? `<img class="product-img" src="${p.img}" alt="${escapeHTML(p.name)}">`
          : `<div class="product-img">${initial}</div>`;
        const productNameKey = String(p.name || '').trim().toLowerCase();
        const productBestCategory = normalizeBestCategory(p.category || '');
        const categoryLabel = productBestCategory === 'makanan' ? 'MAKANAN'
          : productBestCategory === 'minuman' ? 'MINUMAN' : 'DESSERT';
        const rank = productBestCategory ? rankedMenus.get(`${productBestCategory}|||${productNameKey}`) : null;
        const originalCategoryKey = String(p.category || 'Tanpa Kategori').trim().toLowerCase();
        const isOriginalCategoryWinner = bestSellerByOriginalCategory.get(originalCategoryKey) === productNameKey;
        const rankLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
        const rankBadge = rank
          ? `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 3px 7px 0;padding:5px 9px;border-radius:8px;background:${rank === 1 ? '#fff0b3' : rank === 2 ? '#eef2f7' : '#fbe5d5'};color:#754700;border:1px solid ${rank === 1 ? '#e5b83f' : rank === 2 ? '#b8c2cf' : '#d9a17d'};font-size:.72rem;font-weight:900;letter-spacing:.2px;">${rankLabel} BEST SELLER NO. ${rank} · ${categoryLabel}</span>`
          : '';
        const originalCategoryBadge = isOriginalCategoryWinner
          ? `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 0 7px;padding:5px 9px;border-radius:8px;background:#e8f5e9;color:#246b32;border:1px solid #9ac99f;font-size:.7rem;font-weight:900;">🏆 BEST SELLER KATEGORI ${escapeHTML(p.category || 'LAINNYA')}</span>`
          : '';
        const bestSellerBadge = rankBadge + originalCategoryBadge;

        let badgeClass = 'badge-success';
        let badgeText = `Stok: ${p.stock}`;
        if (p.stock <= 0) { badgeClass = 'badge-danger'; badgeText = 'Habis'; }
        else if (p.stock <= p.minStock) { badgeClass = 'badge-warning'; badgeText = `Sisa: ${p.stock}`; }

        return `
          <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" onclick="${isOutOfStock ? '' : `addToCart('${p.id}')`}">
            ${imgHtml}
            ${bestSellerBadge}
            <div class="product-name">${escapeHTML(p.name)}</div>
            <div class="product-price">${getProductDiscountAmount(p, 1) > 0 ? `<span style="text-decoration:line-through;color:var(--text-muted);font-size:.78rem;font-weight:400;">${formatRp(p.price)}</span><br><span style="color:var(--danger);">${formatRp(p.price - getProductDiscountAmount(p, 1))}</span> <span class="badge badge-danger">Diskon</span>` : formatRp(p.price)}</div>
            <div><span class="badge ${badgeClass}">${badgeText}</span></div>
          </div>
        `;
      }).join('');
    }

    function getProductDiscountAmount(prod, qty = 1) {
      if (!prod) return 0;
      const value = Math.max(0, Number(prod.discountValue) || 0);
      const gross = Math.max(0, (Number(prod.price) || 0) * qty);
      const discount = prod.discountType === 'rupiah'
        ? value * qty
        : gross * Math.min(value, 100) / 100;
      return Math.min(gross, Math.max(0, discount));
    }

    function addToCart(productId) {
      const prod = appData.products.find(p => p.id === productId);
      if (!prod) return;

      const cartItem = cart.find(item => item.productId === productId);
      const currentQty = cartItem ? cartItem.qty : 0;

      if (currentQty + 1 > prod.stock) {
        showToast(`Stok menu tidak cukup! Maksimal ${prod.stock} porsi.`, "danger");
        return;
      }

      if (cartItem) {
        cartItem.qty += 1;
      } else {
        cart.push({ productId, qty: 1, discount: 0 });
      }
      renderCart();
    }

    function updateCartQty(productId, delta) {
      const cartItem = cart.find(item => item.productId === productId);
      const prod = appData.products.find(p => p.id === productId);
      if (!cartItem || !prod) return;

      if (cartItem.qty + delta > prod.stock) {
        showToast(`Stok terbatas! Maksimal ${prod.stock} porsi.`, "warning");
        return;
      }

      cartItem.qty += delta;
      if (cartItem.qty <= 0) {
        cart = cart.filter(item => item.productId !== productId);
      }
      renderCart();
    }

    function updateCartDiscount(productId, val) {
      const cartItem = cart.find(item => item.productId === productId);
      if (cartItem) {
        cartItem.discount = Math.max(0, parseFloat(val) || 0);
        renderCart(false);
      }
    }

    function calculateCartTotals() {
      const isPercent = appData.settings.discountType === 'percent';
      let grossSubtotal = 0;
      let totalDiscount = 0;
      let netSubtotal = 0;
      let totalItemCount = 0;

      cart.forEach(item => {
        const prod = appData.products.find(p => p.id === item.productId);
        if (!prod) return;

        let itemGross = prod.price * item.qty;
        const productDiscRp = getProductDiscountAmount(prod, item.qty);
        const manualDiscRp = isPercent ? (itemGross * (item.discount / 100)) : item.discount;
        let discRp = Math.min(itemGross, productDiscRp + manualDiscRp);
        let lineTotal = Math.max(0, itemGross - discRp);
        
        grossSubtotal += itemGross;
        totalDiscount += discRp;
        netSubtotal += lineTotal;
        totalItemCount += item.qty;
      });

      const takeAwayFee = (currentOrderType === 'Take Away') ? (parseFloat(appData.settings.takeAwayFee) || 0) : 0;
      const serviceRate = parseFloat(appData.settings.serviceRate) || 5;
      const serviceCharge = Math.round(netSubtotal * (serviceRate / 100));

      const ppnRate = parseFloat(appData.settings.ppnRate) || 10;
      const ppnTax = Math.round((netSubtotal + takeAwayFee + serviceCharge) * (ppnRate / 100));
      const grandTotal = netSubtotal + takeAwayFee + serviceCharge + ppnTax;

      return { grossSubtotal, totalDiscount, subtotal: netSubtotal, takeAwayFee, serviceRate, serviceCharge, ppnRate, ppnTax, grandTotal, totalItemCount };
    }

    function renderCart(fullRender = true) {
      const container = document.getElementById('cart-items');
      const isPercent = appData.settings.discountType === 'percent';
      const totals = calculateCartTotals();

      if (fullRender) {
        container.innerHTML = cart.length === 0 ? '<div style="text-align:center; color:var(--text-muted); padding:20px;">Keranjang pesanan kosong</div>' : '';
      }

      cart.forEach(item => {
        const prod = appData.products.find(p => p.id === item.productId);
        if (!prod) return;

        const itemGross = prod.price * item.qty;
        const productDiscRp = getProductDiscountAmount(prod, item.qty);
        const manualDiscRp = isPercent ? (itemGross * (item.discount / 100)) : item.discount;
        let discRp = Math.min(itemGross, productDiscRp + manualDiscRp);
        let lineTotal = Math.max(0, itemGross - discRp);

        if (fullRender) {
          const div = document.createElement('div');
          div.className = 'cart-item';
          div.innerHTML = `
            <div class="cart-row">
              <span style="font-weight:600;">${escapeHTML(prod.name)}</span>
              <button onclick="updateCartQty('${prod.id}', -${item.qty})" style="color:var(--danger); border:none; background:none; cursor:pointer;">✕</button>
            </div>
            <div class="cart-row" style="font-size:0.82rem; color:var(--text-muted);">
              <span>${formatRp(prod.price)} / porsi${productDiscRp > 0 ? ` <span style="color:var(--danger);">(-${formatRp(productDiscRp)} diskon menu)</span>` : ''}</span>
              <span>Subtotal: ${formatRp(lineTotal)}</span>
            </div>
            <div class="cart-row">
              <div style="display:flex; align-items:center; gap:6px;">
                <button class="qty-btn" onclick="updateCartQty('${prod.id}', -1)">-</button>
                <span>${item.qty}</span>
                <button class="qty-btn" onclick="updateCartQty('${prod.id}', 1)">+</button>
              </div>
              <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:0.78rem;">Disc (${isPercent ? '%' : 'Rp'}):</span>
                <input type="number" class="form-control" style="width:65px; padding:3px 6px; font-size:0.8rem;" value="${item.discount}" onchange="updateCartDiscount('${prod.id}', this.value)">
              </div>
            </div>
          `;
          container.appendChild(div);
        }
      });

      document.getElementById('cart-item-count').innerText = `${totals.totalItemCount} Item`;
      document.getElementById('cart-subtotal-gross').innerText = formatRp(totals.grossSubtotal);
      document.getElementById('cart-total-discount').innerText = `- ${formatRp(totals.totalDiscount)}`;
      document.getElementById('cart-subtotal').innerText = formatRp(totals.subtotal);
      document.getElementById('cart-takeaway-fee').innerText = formatRp(totals.takeAwayFee);
      document.getElementById('disp-service-rate').innerText = totals.serviceRate;
      document.getElementById('cart-service').innerText = formatRp(totals.serviceCharge);
      document.getElementById('disp-tax-rate').innerText = totals.ppnRate;
      document.getElementById('cart-ppn').innerText = formatRp(totals.ppnTax);
      document.getElementById('cart-grand-total').innerText = formatRp(totals.grandTotal);
      updateCashChange('cart');
    }

    /* ==========================================================================
       FITUR UANG DITERIMA & KEMBALIAN (PEMBAYARAN TUNAI)
       prefix: 'cart' (bayar langsung) atau 'pay-pending' (pelunasan pesanan)
       ========================================================================== */
    function getCashDueTotal(prefix) {
      if (prefix === 'cart') return calculateCartTotals().grandTotal || 0;
      const pendingId = document.getElementById('pay-pending-id').value;
      const order = (appData.pendingOrders || []).find(o => o.id === pendingId);
      return order ? (order.grandTotal || 0) : 0;
    }

    function updateCashChange(prefix) {
      const box = document.getElementById(prefix + '-cash-box');
      const input = document.getElementById(prefix + '-cash-paid');
      const out = document.getElementById(prefix + '-cash-change');
      if (!box || !input || !out) return;

      const method = document.getElementById(prefix + '-payment-method') || document.getElementById(prefix + '-method');
      const isCash = method && method.value === 'Tunai';
      box.style.display = isCash ? '' : 'none';
      if (!isCash) return;

      const total = getCashDueTotal(prefix);
      if (input.value === '') {
        out.style.color = 'var(--text-muted)';
        out.innerText = 'Kembalian: ' + formatRp(0);
        return;
      }
      const paid = Number(input.value) || 0;
      const diff = paid - total;
      if (diff < 0) {
        out.style.color = 'var(--danger)';
        out.innerText = 'Uang kurang: ' + formatRp(Math.abs(diff));
      } else {
        out.style.color = 'var(--success)';
        out.innerText = 'Kembalian: ' + formatRp(diff);
      }
    }

    function setExactCash(prefix) {
      const input = document.getElementById(prefix + '-cash-paid');
      if (!input) return;
      input.value = getCashDueTotal(prefix);
      updateCashChange(prefix);
    }

    // Mengembalikan { cashPaid, change } jika valid, null jika tidak valid. Non-tunai -> objek kosong.
    function readCashPayment(prefix, paymentMethod, total) {
      if (paymentMethod !== 'Tunai') return {};
      const input = document.getElementById(prefix + '-cash-paid');
      if (!input || input.value === '') {
        showToast("Masukkan jumlah uang diterima dari pelanggan (atau klik Uang Pas).", "warning");
        if (input) input.focus();
        return null;
      }
      const paid = Number(input.value) || 0;
      if (paid < total) {
        showToast(`Uang diterima kurang ${formatRp(total - paid)}!`, "warning");
        input.focus();
        return null;
      }
      return { cashPaid: paid, change: paid - total };
    }

    function resetCashInput(prefix) {
      const input = document.getElementById(prefix + '-cash-paid');
      if (input) input.value = '';
      updateCashChange(prefix);
    }

    function clearCart() {
      cart = [];
      document.getElementById('cart-order-notes').value = '';
      renderCart();
    }

    function generateDailyTrxId() {
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      const dateStr = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
      
      const todaySales = appData.sales.filter(s => s.trxId && s.trxId.includes(`RST-${dateStr}`));
      const seq = String(todaySales.length + 1).padStart(4, '0');
      return `RST-${dateStr}-${seq}`;
    }

    /* FITUR SIMPAN PESANAN DAHULU (DINE IN OPEN BILL / ANTREAN TAKE AWAY WITH NOTES) */
    function saveOrderPending() {
      if (cart.length === 0) {
        showToast("Keranjang pesanan masih kosong!", "warning");
        return;
      }

      let orderRef = '';
      if (currentOrderType === 'Dine In') {
        orderRef = document.getElementById('cart-table-no').value.trim();
        if (!orderRef) {
          showToast("Nomor Meja Wajib Diisi untuk Dine In!", "warning");
          return;
        }
        if (!confirmTableUse(orderRef)) return;
      } else {
        orderRef = document.getElementById('cart-customer-name').value.trim();
        if (!orderRef) {
          autoGenerateQueueNo();
          orderRef = document.getElementById('cart-customer-name').value.trim();
        }
        appData.queueCounter++;
      }

      const orderNotes = document.getElementById('cart-order-notes').value.trim();
      const totals = calculateCartTotals();
      const now = getNowFormatted();
      const kasirName = currentKasirName || appData.settings.defaultKasir;
      const isPercent = appData.settings.discountType === 'percent';

      // Potong Stok Menu
      const orderItems = cart.map(item => {
        const prod = appData.products.find(p => p.id === item.productId);
        let discRp = isPercent ? (prod.price * item.qty * (item.discount / 100)) : item.discount;
        let lineTotal = Math.max(0, (prod.price * item.qty) - discRp);

        prod.stock -= item.qty;
        
        appData.stokHistory.unshift({
          id: 'MUT-' + Math.random().toString(36).substr(2, 9),
          time: now,
          productId: prod.id,
          productName: prod.name,
          type: 'Keluar',
          qty: item.qty,
          notes: `Pesanan Baru (${currentOrderType}: ${orderRef})`
        });

        return {
          productId: prod.id,
          productName: prod.name,
          category: prod.category,
          qty: item.qty,
          unitPrice: prod.price,
          discount: discRp,
          netSales: lineTotal
        };
      });

      const pendingTrx = {
        id: 'PEND-' + Math.random().toString(36).substr(2, 9),
        orderRef: orderRef,
        orderType: currentOrderType,
        orderNotes: orderNotes,
        date: now,
        kasirName: kasirName,
        items: orderItems,
        grossSubtotal: totals.grossSubtotal,
        totalDiscount: totals.totalDiscount,
        subtotal: totals.subtotal,
        takeAwayFee: totals.takeAwayFee,
        serviceRate: totals.serviceRate,
        serviceCharge: totals.serviceCharge,
        ppnRate: totals.ppnRate,
        ppnTax: totals.ppnTax,
        grandTotal: totals.grandTotal
      };

      appData.pendingOrders.unshift(pendingTrx);
      if (currentOrderType === 'Dine In') occupyTable(orderRef);
      saveData();

      clearCart();
      if (currentOrderType === 'Dine In') document.getElementById('cart-table-no').value = '';
      else document.getElementById('cart-customer-name').value = '';

      renderAll();
      showToast(`Pesanan ${currentOrderType} (${orderRef}) berhasil dibuat & dikirim ke dapur!`, "success");
      checkLowStockAlerts();
    }

    function renderActiveOrders() {
      const dineInList = document.getElementById('list-dine-in-active');
      const takeAwayList = document.getElementById('list-takeaway-active');
      const badge = document.getElementById('open-bills-badge');

      const dineInOrders = appData.pendingOrders.filter(o => o.orderType === 'Dine In');
      const takeAwayOrders = appData.pendingOrders.filter(o => o.orderType === 'Take Away');

      const totalActive = appData.pendingOrders.length;
      if (totalActive > 0) {
        badge.innerText = totalActive;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }

      dineInList.innerHTML = dineInOrders.length === 0 ? '<div style="color:var(--text-muted);">Tidak ada pesanan Dine In aktif.</div>' : dineInOrders.map(o => `
        <div class="active-order-card">
          <div>
            <div style="font-weight:700; font-size:1rem; color:var(--primary);">🍽️ ${escapeHTML(o.orderRef)}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">${o.date} | Kasir: ${escapeHTML(o.kasirName)}</div>
            ${o.orderNotes ? `<div style="font-size:0.8rem; color:var(--warning); font-weight:600;">📝 Catatan: ${escapeHTML(o.orderNotes)}</div>` : ''}
            <div style="font-size:0.85rem; margin-top:4px;">${o.items.map(i => `${i.productName} (x${i.qty})`).join(', ')}</div>
            <div style="font-weight:bold; margin-top:4px;">Total Tagihan: ${formatRp(o.grandTotal)}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-success" onclick="openPayPendingModal('${o.id}')">💳 Bayar &amp; Struk</button>
            <button class="btn btn-danger" onclick="cancelPendingOrder('${o.id}')">✕ Batal</button>
          </div>
        </div>
      `).join('');

      takeAwayList.innerHTML = takeAwayOrders.length === 0 ? '<div style="color:var(--text-muted);">Tidak ada antrean Take Away aktif.</div>' : takeAwayOrders.map(o => `
        <div class="active-order-card">
          <div>
            <div style="font-weight:700; font-size:1rem; color:var(--warning);">🛍️ ${escapeHTML(o.orderRef)}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">${o.date} | Kasir: ${escapeHTML(o.kasirName)}</div>
            ${o.orderNotes ? `<div style="font-size:0.8rem; color:var(--warning); font-weight:600;">📝 Catatan: ${escapeHTML(o.orderNotes)}</div>` : ''}
            <div style="font-size:0.85rem; margin-top:4px;">${o.items.map(i => `${i.productName} (x${i.qty})`).join(', ')}</div>
            <div style="font-weight:bold; margin-top:4px;">Total Tagihan: ${formatRp(o.grandTotal)}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-success" onclick="openPayPendingModal('${o.id}')">💳 Pelunasan &amp; Struk</button>
            <button class="btn btn-danger" onclick="cancelPendingOrder('${o.id}')">✕ Batal</button>
          </div>
        </div>
      `).join('');
    }

    function openPayPendingModal(pendingId) {
      const order = appData.pendingOrders.find(o => o.id === pendingId);
      if (!order) return;

      document.getElementById('pay-pending-id').value = pendingId;
      document.getElementById('pay-pending-summary').innerHTML = `
        <div style="font-weight:bold;">${order.orderType}: ${escapeHTML(order.orderRef)}</div>
        ${order.orderNotes ? `<div style="font-size:0.82rem; color:var(--warning);">📝 Catatan: ${escapeHTML(order.orderNotes)}</div>` : ''}
        <div>Total Yang Harus Dibayar: <strong style="color:var(--primary); font-size:1.1rem;">${formatRp(order.grandTotal)}</strong></div>
      `;
      resetCashInput('pay-pending');
      document.getElementById('modal-pay-pending').classList.add('show');
    }

    function closePayPendingModal() {
      document.getElementById('modal-pay-pending').classList.remove('show');
    }

    function confirmPayPending() {
      const pendingId = document.getElementById('pay-pending-id').value;
      const orderIdx = appData.pendingOrders.findIndex(o => o.id === pendingId);
      if (orderIdx === -1) return;

      const order = appData.pendingOrders[orderIdx];
      const paymentMethod = document.getElementById('pay-pending-method').value;
      const cashInfo = readCashPayment('pay-pending', paymentMethod, order.grandTotal);
      if (!cashInfo) return;
      const trxId = generateDailyTrxId();

      const newTransaction = {
        id: 'SALE-' + Math.random().toString(36).substr(2, 9),
        trxId: trxId,
        date: getNowFormatted(),
        orderType: order.orderType,
        orderRef: order.orderRef,
        orderNotes: order.orderNotes || '',
        kasirName: order.kasirName,
        items: order.items,
        grossSubtotal: order.grossSubtotal || order.subtotal,
        totalDiscount: order.totalDiscount || 0,
        subtotal: order.subtotal,
        takeAwayFee: order.takeAwayFee,
        serviceRate: order.serviceRate || 5,
        serviceCharge: order.serviceCharge || 0,
        ppnRate: order.ppnRate,
        ppnTax: order.ppnTax,
        grandTotal: order.grandTotal,
        paymentMethod: paymentMethod,
        ...cashInfo
      };

      appData.sales.unshift(newTransaction);
      appData.pendingOrders.splice(orderIdx, 1);
      saveData();

      closePayPendingModal();
      renderAll();
      renderReceipt(newTransaction);
      showToast(`Pelunasan pesanan (${order.orderRef}) berhasil! Struk diterbitkan.`, "success");
    }

    function cancelPendingOrder(pendingId) {
      const order = appData.pendingOrders.find(o => o.id === pendingId);
      if (!order) return;

      if (confirm(`Pembatalan pesanan ${order.orderType} (${order.orderRef})? Stok menu akan dikembalikan.`)) {
        order.items.forEach(item => {
          const p = appData.products.find(x => x.id === item.productId);
          if (p) p.stock += item.qty;

          appData.stokHistory.unshift({
            id: 'MUT-' + Math.random().toString(36).substr(2, 9),
            time: getNowFormatted(),
            productId: item.productId,
            productName: item.productName,
            type: 'Masuk',
            qty: item.qty,
            notes: `Pembatalan Pesanan ${order.orderRef}`
          });
        });

        appData.pendingOrders = appData.pendingOrders.filter(o => o.id !== pendingId);
        saveData();
        renderAll();
        showToast("Pesanan dibatalkan & stok dikembalikan.", "info");
      }
    }

    /* PROSES BAYAR LANGSUNG KASIR */
    function processPayment() {
      if (cart.length === 0) {
        showToast("Keranjang pesanan masih kosong!", "warning");
        return;
      }

      const cashInfo = readCashPayment('cart', document.getElementById('cart-payment-method').value, calculateCartTotals().grandTotal);
      if (!cashInfo) return;

      let orderRef = '';
      if (currentOrderType === 'Dine In') {
        orderRef = document.getElementById('cart-table-no').value.trim() || 'Meja Umum';
        if (orderRef !== 'Meja Umum' && !confirmTableUse(orderRef)) return;
      } else {
        orderRef = document.getElementById('cart-customer-name').value.trim() || `Antrean A-${String(appData.queueCounter++).padStart(3, '0')}`;
      }

      const orderNotes = document.getElementById('cart-order-notes').value.trim();
      const totals = calculateCartTotals();
      const trxId = generateDailyTrxId();
      const now = getNowFormatted();
      const paymentMethod = document.getElementById('cart-payment-method').value;
      const isPercent = appData.settings.discountType === 'percent';
      const kasirName = currentKasirName || appData.settings.defaultKasir;

      const purchasedItems = cart.map(item => {
        const prod = appData.products.find(p => p.id === item.productId);
        let discRp = isPercent ? (prod.price * item.qty * (item.discount / 100)) : item.discount;
        let lineTotal = Math.max(0, (prod.price * item.qty) - discRp);
        
        prod.stock -= item.qty;
        
        appData.stokHistory.unshift({
          id: 'MUT-' + Math.random().toString(36).substr(2, 9),
          time: now,
          productId: prod.id,
          productName: prod.name,
          type: 'Keluar',
          qty: item.qty,
          notes: `Penjualan ${trxId} (${currentOrderType}: ${orderRef})`
        });

        return {
          productId: prod.id,
          productName: prod.name,
          category: prod.category,
          qty: item.qty,
          unitPrice: prod.price,
          discount: discRp,
          netSales: lineTotal
        };
      });

      const newTransaction = {
        id: 'SALE-' + Math.random().toString(36).substr(2, 9),
        trxId: trxId,
        date: now,
        orderType: currentOrderType,
        orderRef: orderRef,
        orderNotes: orderNotes,
        kasirName: kasirName,
        items: purchasedItems,
        grossSubtotal: totals.grossSubtotal,
        totalDiscount: totals.totalDiscount,
        subtotal: totals.subtotal,
        takeAwayFee: totals.takeAwayFee,
        serviceRate: totals.serviceRate,
        serviceCharge: totals.serviceCharge,
        ppnRate: totals.ppnRate,
        ppnTax: totals.ppnTax,
        grandTotal: totals.grandTotal,
        paymentMethod: paymentMethod,
        ...cashInfo
      };

      appData.sales.unshift(newTransaction);
      if (currentOrderType === 'Dine In') occupyTable(orderRef);
      saveData();

      renderReceipt(newTransaction);

      clearCart();
      resetCashInput('cart');
      if (currentOrderType === 'Dine In') document.getElementById('cart-table-no').value = '';
      else document.getElementById('cart-customer-name').value = '';

      renderAll();
      showToast(`Transaksi ${trxId} berhasil! Struk telah diterbitkan.`, "success");
      checkLowStockAlerts();
    }

    /* ==========================================================================
       MANAJEMEN RESERVASI MEJA LOGIC
       ========================================================================== */
    function renderReservations() {
      const tbody = document.getElementById('reservation-table-body');
      const allPending = appData.reservations.filter(r => r.status === 'Pending');
      const q = (document.getElementById('res-search')?.value || '').trim().toLowerCase();
      const dFrom = document.getElementById('res-date-from')?.value || '';
      const dTo = document.getElementById('res-date-to')?.value || '';
      const period = document.getElementById('res-period')?.value || 'ALL';
      const isFiltered = !!(q || dFrom || dTo || period !== 'ALL');
      const todayStr = todayDateStr();
      const filteredRes = appData.reservations.filter(r => {
        const day = String(r.datetime || '').substring(0, 10);
        if (dFrom && day < dFrom) return false;
        if (dTo && day > dTo) return false;
        if (period === 'UPCOMING' && day < todayStr) return false;
        if (period === 'HISTORY' && !(day && day < todayStr)) return false;
        if (q) {
          const hay = [r.datetime ? r.datetime.replace('T', ' ') : '', r.name, r.phone, r.table, r.id].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }).sort((a, b) => {
        // Hari ini & mendatang di atas (terdekat dulu), riwayat di bawah (terbaru dulu) - riwayat TIDAK pernah disembunyikan
        const pa = isPastReservation(a), pb = isPastReservation(b);
        if (pa !== pb) return pa ? 1 : -1;
        const da = String(a.datetime || ''), db = String(b.datetime || '');
        return pa ? db.localeCompare(da) : da.localeCompare(db);
      });
      const totalRes = filteredRes.length;
      const pendingRes = filteredRes.filter(r => r.status === 'Pending');
      const arrivedRes = filteredRes.filter(r => r.status === 'Arrived');
      const historyCount = appData.reservations.filter(isPastReservation).length;
      const infoEl = document.getElementById('res-filter-info');
      if (infoEl) infoEl.innerText = (isFiltered ? `Menampilkan ${filteredRes.length} dari ${appData.reservations.length} reservasi (ringkasan di atas mengikuti hasil pencarian). ` : '') +
        (historyCount ? `🗂️ ${historyCount} riwayat reservasi tanggal lewat tersimpan permanen (tidak bisa dihapus).` : '');

      document.getElementById('res-stat-total').innerText = totalRes;
      document.getElementById('res-stat-pending').innerText = pendingRes.length;
      document.getElementById('res-stat-arrived').innerText = arrivedRes.length;

      const badge = document.getElementById('reservasi-badge');
      if (allPending.length > 0) {
        badge.innerText = allPending.length;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }

      tbody.innerHTML = filteredRes.length === 0 
        ? `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:16px;">${isFiltered ? 'Tidak ada reservasi yang cocok dengan pencarian.' : 'Belum ada reservasi meja terdaftar.'}</td></tr>` 
        : filteredRes.map(r => {
            let statusBadge = 'badge-warning';
            let statusText = 'Pending';
            if (r.status === 'Arrived') { statusBadge = 'badge-info'; statusText = 'Tiba (Check-In)'; }
            else if (r.status === 'Completed') { statusBadge = 'badge-success'; statusText = 'Selesai'; }
            else if (r.status === 'Cancelled') { statusBadge = 'badge-danger'; statusText = r.autoCancelled ? 'Batal (Otomatis)' : 'Batal'; }

            const displayTime = r.datetime ? r.datetime.replace('T', ' ') : '-';
            const past = isPastReservation(r);
            const histTag = past ? `<span style="display:block; font-size:0.7rem; font-weight:600; color:var(--text-muted);">🗂️ Riwayat</span>` : '';

            return `
              <tr${past ? ' style="opacity:0.92;"' : ''}>
                <td style="font-weight:600;">${escapeHTML(displayTime)}${histTag}${reservationTimeInfo(r)}</td>
                <td style="font-weight:700; color:var(--primary);">${escapeHTML(r.name)}</td>
                <td>${escapeHTML(r.phone)}</td>
                <td><strong>${escapeHTML(r.table)}</strong> (${r.pax} Pax)</td>
                <td><span class="badge ${statusBadge}">${statusText}</span></td>
                <td style="font-size:0.8rem;">${escapeHTML(r.notes || '-')}</td>
                <td>
                  <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    ${r.status === 'Pending' ? `<button class="btn btn-success" style="padding:3px 8px; font-size:0.75rem;" onclick="checkInReservation('${r.id}')">▶️ Check-In</button>` : ''}
                    <button class="btn btn-primary" style="padding:3px 8px; font-size:0.75rem;" onclick="openReservationDocModal('${r.id}')">📄 Bukti Reservasi</button>
                    <button class="btn btn-outline" style="padding:3px 8px; font-size:0.75rem;" onclick="openReservationModalWithAuth('${r.id}')">Edit</button>
                    ${past
                      ? `<span title="Riwayat reservasi tanggal yang sudah lewat tidak dapat dihapus" style="padding:3px 8px; font-size:0.75rem; color:var(--text-muted); border:1px dashed var(--border-color, #cbd5e1); border-radius:6px;">🔒 Riwayat</span>`
                      : `<button class="btn btn-danger" style="padding:3px 8px; font-size:0.75rem;" onclick="deleteReservation('${r.id}')">Hapus</button>`}
                  </div>
                </td>
              </tr>
            `;
          }).join('');
    }

    function resetReservationFilter() {
      ['res-search', 'res-date-from', 'res-date-to'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      const per = document.getElementById('res-period'); if (per) per.value = 'ALL';
      renderReservations();
    }

    async function openReservationModalWithAuth(resId = null) {
      if (resId) {
        const r = appData.reservations.find(x => x.id === resId);
        if (!r) return;
        if (!(await verifyReservationDeleteAuth(`mengedit reservasi atas nama ${r.name}`))) return;
      }
      openReservationModal(resId);
    }

    function openReservationModal(resId = null) {
      const modal = document.getElementById('modal-reservation');
      const title = document.getElementById('modal-res-title');
      modal.classList.add('show');

      if (resId) {
        const r = appData.reservations.find(x => x.id === resId);
        title.innerText = "Edit Data Reservasi Meja";
        document.getElementById('res-id').value = r.id;
        document.getElementById('res-name').value = r.name;
        document.getElementById('res-phone').value = r.phone;
        document.getElementById('res-datetime').value = r.datetime || '';
        document.getElementById('res-pax').value = r.pax || 2;
        document.getElementById('res-table').value = r.table;
        document.getElementById('res-status').value = r.status || 'Pending';
        document.getElementById('res-notes').value = r.notes || '';
      } else {
        title.innerText = "Buat Reservasi Meja Baru";
        document.getElementById('res-id').value = '';
        document.getElementById('res-name').value = '';
        document.getElementById('res-phone').value = '';
        
        // Default datetime offset
        const now = new Date();
        now.setHours(now.getHours() + 2);
        const pad2 = n => String(n).padStart(2, '0');
        const isoStr = `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
        document.getElementById('res-datetime').value = isoStr;
        
        document.getElementById('res-pax').value = '2';
        document.getElementById('res-table').value = ''; 
        document.getElementById('res-status').value = 'Pending';
        document.getElementById('res-notes').value = '';
      }
      renderResTablePicker();
    }

    function closeReservationModal() {
      document.getElementById('modal-reservation').classList.remove('show');
    }

    function saveReservation() {
      const id = document.getElementById('res-id').value;
      const name = document.getElementById('res-name').value.trim();
      const phone = document.getElementById('res-phone').value.trim();
      const datetime = document.getElementById('res-datetime').value;
      const pax = parseInt(document.getElementById('res-pax').value) || 1;
      const table = document.getElementById('res-table').value.trim();
      const status = document.getElementById('res-status').value;
      const notes = document.getElementById('res-notes').value.trim();

      if (!name || !phone || !table) {
        showToast("Nama, Nomor Kontak, dan Meja wajib diisi!", "warning");
        return;
      }
      if (!datetime) {
        showToast("Tanggal & waktu kedatangan wajib diisi!", "warning");
        return;
      }
      if (status === 'Pending') {
        const conflict = (appData.reservations || []).find(r =>
          r.id !== id && r.status === 'Pending' &&
          String(r.datetime || '').slice(0, 10) === String(datetime).slice(0, 10) &&
          tableKey(r.table) === tableKey(table)
        );
        const occupiedNow = String(datetime).slice(0, 10) === todayDateStr() &&
          !!(appData.tableOccupancy || {})[tableKey(table)];
        if (conflict || occupiedNow) {
          showToast(occupiedNow ? 'Meja sedang terisi dan tidak dapat direservasi.' : `Meja sudah dipesan oleh ${conflict.name} pada tanggal tersebut.`, 'warning');
          renderResTablePicker();
          return;
        }
        const dl = getReservationDeadline({ datetime });
        if (dl && new Date() > dl) {
          showToast(`Waktu reservasi sudah lewat lebih dari ${RESERVATION_GRACE_MINUTES} menit. Ubah jam reservasi ke waktu yang akan datang.`, "warning");
          return;
        }
      }

      if (id) {
        const r = appData.reservations.find(x => x.id === id);
        if (r) {
          r.name = name; r.phone = phone; r.datetime = datetime;
          r.pax = pax; r.table = table; r.status = status; r.notes = notes;
          if (status !== 'Cancelled') { delete r.autoCancelled; delete r.cancelledAt; }
        }
      } else {
        const newId = 'RES-' + Math.random().toString(36).substr(2, 7).toUpperCase();
        appData.reservations.unshift({
          id: newId, name, phone, datetime, pax, table, status, notes
        });
      }

      saveData();
      closeReservationModal();
      renderAll();
      showToast("Data reservasi berhasil disimpan!", "success");
    }

    /* ==========================================================================
       PEMBATALAN OTOMATIS RESERVASI (TELAT > 30 MENIT)
       ========================================================================== */
    const RESERVATION_GRACE_MINUTES = 30;
    let reservationWatcherId = null;

    function getReservationDeadline(r) {
      if (!r || !r.datetime) return null;
      const t = new Date(r.datetime);
      if (isNaN(t.getTime())) return null;
      return new Date(t.getTime() + RESERVATION_GRACE_MINUTES * 60000);
    }

    function fmtClock(d) {
      const pad = n => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    // Membatalkan semua reservasi berstatus Pending yang sudah melewati jam reservasi + 30 menit.
    // Mengembalikan jumlah reservasi yang dibatalkan.
    function autoCancelLateReservations(silent = false) {
      const now = new Date();
      const cancelled = [];
      (appData.reservations || []).forEach(r => {
        if (r.status !== 'Pending') return;
        const dl = getReservationDeadline(r);
        if (dl && now > dl) {
          r.status = 'Cancelled';
          r.autoCancelled = true;
          r.cancelledAt = getNowFormatted();
          const tag = `[Dibatalkan otomatis oleh sistem ${r.cancelledAt}: terlambat lebih dari ${RESERVATION_GRACE_MINUTES} menit dari jam reservasi]`;
          r.notes = r.notes ? `${r.notes} ${tag}` : tag;
          cancelled.push(r);
        }
      });
      if (cancelled.length) {
        saveData();
        if (!silent) {
          renderAll();
          cancelled.forEach(r => showToast(`Reservasi a.n ${r.name} (${r.table}) dibatalkan otomatis: terlambat lebih dari ${RESERVATION_GRACE_MINUTES} menit.`, "warning"));
        }
      }
      return cancelled.length;
    }

    function reservationTimeInfo(r) {
      const base = 'display:block; font-size:0.72rem; font-weight:600; margin-top:2px;';
      if (r.status === 'Pending') {
        const t = r.datetime ? new Date(r.datetime) : null;
        const dl = getReservationDeadline(r);
        if (!t || !dl || isNaN(t.getTime())) return '';
        const now = new Date();
        if (now < t) return `<span style="${base} color:var(--text-muted);">Batas tiba: ${fmtClock(dl)}</span>`;
        const late = Math.max(1, Math.floor((now - t) / 60000));
        return `<span style="${base} color:#dc2626;">⚠️ Terlambat ${late} mnt · batal otomatis ${fmtClock(dl)}</span>`;
      }
      if (r.status === 'Cancelled' && r.autoCancelled) {
        return `<span style="${base} color:#dc2626;">🤖 Dibatalkan otomatis (telat &gt; ${RESERVATION_GRACE_MINUTES} mnt)</span>`;
      }
      return '';
    }

    function startReservationWatcher() {
      if (reservationWatcherId) clearInterval(reservationWatcherId);
      reservationWatcherId = setInterval(() => {
        const n = autoCancelLateReservations(false);
        if (!n) {
          const pane = document.getElementById('tab-reservasi');
          if (pane && pane.classList.contains('active')) renderReservations();
        }
      }, 20000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) autoCancelLateReservations(false);
      });
    }

    function checkInReservation(resId) {
      // Pastikan reservasi yang sudah lewat batas toleransi dibatalkan dulu oleh sistem
      if (autoCancelLateReservations(true) > 0) {
        renderAll();
      }
      const r = appData.reservations.find(x => x.id === resId);
      if (!r) return;
      if (r.status === 'Cancelled') {
        showToast(`Reservasi a.n ${r.name} sudah dibatalkan otomatis (terlambat lebih dari ${RESERVATION_GRACE_MINUTES} menit).`, "danger");
        return;
      }

      r.status = 'Arrived';
      saveData();

      // Pindahkan langsung ke Kasir
      switchTab('kasir');
      setOrderType('Dine In');
      document.getElementById('cart-table-no').value = r.table;
      
      let noteText = `[Reservasi: ${r.name} (${r.phone}) - ${r.pax} Pax]`;
      if (r.notes) noteText += ` ${r.notes}`;
      
      document.getElementById('cart-order-notes').value = noteText;
      showToast(`Tamu ${r.name} telah check-in. Meja (${r.table}) diisikan ke Form Kasir!`, "success");
    }

    async function deleteReservation(resId) {
      const r = appData.reservations.find(x => x.id === resId);
      if (!r) return;

      // Riwayat reservasi (tanggal sudah lewat) dikunci: tidak boleh dihapus
      if (isPastReservation(r)) {
        showToast(`Reservasi a.n ${r.name} adalah riwayat (tanggal sudah lewat) dan tidak dapat dihapus.`, "warning");
        return;
      }

      if (!(await verifyReservationDeleteAuth(`menghapus reservasi atas nama ${r.name}`))) return;

      if (confirm(`Hapus reservasi atas nama "${r.name}" (${r.table})?`)) {
        appData.reservations = appData.reservations.filter(x => x.id !== resId);
        saveData();
        renderAll();
        showToast("Reservasi telah dihapus.", "info");
      }
    }

    /* FITUR DOKUMEN KONFIRMASI RESERVASI PELANGGAN */
    function openReservationDocModal(resId) {
      const r = appData.reservations.find(x => x.id === resId);
      if (!r) return;

      const docEl = document.getElementById('reservation-doc-content');
      const storeName = appData.settings.storeName || 'Restoran Nusantara SIM';
      const groupName = appData.settings.groupName || 'Kasir Resto SIM';
      const displayTime = r.datetime ? r.datetime.replace('T', ' Pukul ') : '-';

      docEl.innerHTML = `
        <div style="text-align:center; border-bottom:2px solid #2563eb; padding-bottom:12px; margin-bottom:16px;">
          <h2 style="color:#2563eb; font-size:1.3rem; margin-bottom:4px;">${escapeHTML(storeName)}</h2>
          <div style="font-size:0.8rem; color:#64748b;">${escapeHTML(groupName)}</div>
          <div style="font-size:0.95rem; font-weight:bold; margin-top:8px; background:#e0f2fe; color:#0369a1; padding:4px 8px; border-radius:6px; display:inline-block;">
            TANDA TERIMA & BUKTI RESERVASI MEJA
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:0.88rem; margin-bottom:16px;">
          <tr>
            <td style="padding:6px 0; color:#64748b; width:40%;">Kode Reservasi</td>
            <td style="padding:6px 0; font-weight:bold; font-family:monospace; color:#2563eb;">: ${r.id}</td>
          </tr>
          <tr>
            <td style="padding:6px 0; color:#64748b;">Nama Pemesan / Tamu</td>
            <td style="padding:6px 0; font-weight:bold;">: ${escapeHTML(r.name)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0; color:#64748b;">Nomor Kontak / WhatsApp</td>
            <td style="padding:6px 0;">: ${escapeHTML(r.phone)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0; color:#64748b;">Waktu Kedatangan</td>
            <td style="padding:6px 0; font-weight:bold; color:#059669;">: ${escapeHTML(displayTime)} WITA</td>
          </tr>
          <tr>
            <td style="padding:6px 0; color:#64748b;">Lokasi / Nomor Meja</td>
            <td style="padding:6px 0; font-weight:bold;">: ${escapeHTML(r.table)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0; color:#64748b;">Jumlah Tamu (Pax)</td>
            <td style="padding:6px 0;">: ${r.pax} Orang</td>
          </tr>
          <tr>
            <td style="padding:6px 0; color:#64748b;">Status Terkini</td>
            <td style="padding:6px 0; font-weight:bold;">: ${r.status}</td>
          </tr>
          <tr>
            <td style="padding:6px 0; color:#64748b;">Catatan Khusus</td>
            <td style="padding:6px 0;">: ${escapeHTML(r.notes || '-')}</td>
          </tr>
        </table>

        <div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px; padding:10px; font-size:0.78rem; color:#475569; margin-bottom:16px;">
          <strong>* Syarat &amp; Ketentuan Reservasi:</strong><br>
          1. Harap menunjukkan bukti reservasi ini saat tiba di restoran.<br>
          2. Meja reservasi ditahan maksimal 30 menit dari jam kedatangan yang dijadwalkan. Setelah itu reservasi <strong>dibatalkan otomatis oleh sistem</strong>.
        </div>

        <div style="display:flex; justify-content:space-between; align-items:flex-end; font-size:0.8rem; border-top:1px solid #e2e8f0; padding-top:12px;">
          <div>
            <div>Dicetak Pada: ${getNowFormatted()}</div>
            <div>Petugas Resto: ${escapeHTML(currentKasirName || 'Admin Resto')}</div>
          </div>
          <div style="text-align:center;">
            <div style="margin-bottom:35px;">Stempel / Tanda Tangan Resto</div>
            <div>( _____________________ )</div>
          </div>
        </div>
      `;

      document.getElementById('modal-reservation-doc').classList.add('show');
    }

    function closeReservationDocModal() {
      document.getElementById('modal-reservation-doc').classList.remove('show');
    }

    function printReservationDoc() {
      const content = document.getElementById('reservation-doc-content').innerHTML;
      const printWin = window.open('', '', 'width=650,height=750');
      printWin.document.write(`
        <html>
          <head>
            <title>Dokumen Konfirmasi Reservasi Meja</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; }
              @media print {
                body { padding: 0; }
              }
            
    /* Category Filter Pills ( Layout Luar - Persis Screenshot ) */
    .category-pills-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 10px;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .category-pill {
      background: rgba(60, 30, 10, 0.45);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 8px 14px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }
    .category-pill:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-1px);
    }
    .category-pill.active {
      background: #f59e0b;
      color: #1e1b4b;
      font-weight: 700;
      border-color: #f59e0b;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5);
    }

  </style>
          </head>
          <body>
            ${content}
            <script>
              window.onload = function() { window.print(); window.close(); }
            <\/script>
          </body>
        </html>
      `);
      printWin.document.close();
    }

    /* ==========================================================================
       STRUK PEMBAYARAN RECEIPT
       ========================================================================== */
    function renderReceipt(trx) {
      currentReceiptTrx = trx;
      const receiptEl = document.getElementById('receipt-content');
      
      let itemsText = trx.items.map(item => `
        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
          <span>${escapeHTML(item.productName)} x${item.qty}</span>
          <span>${formatRp(item.netSales)}</span>
        </div>
      `).join('');

      receiptEl.innerHTML = `
        <div style="text-align:center; font-weight:bold; font-size:1.05rem; margin-bottom:4px;">
          ${escapeHTML(appData.settings.storeName)}
        </div>
        <div style="text-align:center; font-size:0.75rem; margin-bottom:10px;">
          ${escapeHTML(appData.settings.groupName)}
        </div>
        <div style="border-bottom:1px dashed #000; margin-bottom:8px;"></div>
        <div style="font-size:0.78rem;">
          <div>No. Struk  : ${trx.trxId}</div>
          <div>Tanggal    : ${trx.date}</div>
          <div>Kasir      : ${escapeHTML(trx.kasirName)}</div>
          <div>Tipe Order : <strong>${trx.orderType} (${escapeHTML(trx.orderRef || '-')})</strong></div>
          ${trx.orderNotes ? `<div style="margin-top:2px; font-weight:bold;">Catatan : ${escapeHTML(trx.orderNotes)}</div>` : ''}
        </div>
        <div style="border-bottom:1px dashed #000; margin:8px 0;"></div>
        ${itemsText}
        <div style="border-bottom:1px dashed #000; margin:8px 0;"></div>
        <div style="font-size:0.8rem;">
          ${trx.totalDiscount > 0 ? `
          <div style="display:flex; justify-content:space-between;">
            <span>Diskon Total:</span><span>-${formatRp(trx.totalDiscount)}</span>
          </div>` : ''}
          <div style="display:flex; justify-content:space-between;">
            <span>Subtotal Menu:</span><span>${formatRp(trx.subtotal)}</span>
          </div>
          ${trx.takeAwayFee > 0 ? `
          <div style="display:flex; justify-content:space-between;">
            <span>Biaya Kemasan:</span><span>${formatRp(trx.takeAwayFee)}</span>
          </div>` : ''}
          ${trx.serviceCharge > 0 ? `
          <div style="display:flex; justify-content:space-between;">
            <span>Service (${trx.serviceRate || 5}%):</span><span>${formatRp(trx.serviceCharge)}</span>
          </div>` : ''}
          <div style="display:flex; justify-content:space-between;">
            <span>Tax (${trx.ppnRate || 10}%):</span><span>${formatRp(trx.ppnTax)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:0.95rem; margin-top:4px; border-top:1px dashed #000; padding-top:4px;">
            <span>TOTAL:</span><span>${formatRp(trx.grandTotal)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:2px;">
            <span>Metode:</span><span>${trx.paymentMethod}</span>
          </div>
          ${trx.cashPaid != null ? `
          <div style="display:flex; justify-content:space-between;">
            <span>Tunai Diterima:</span><span>${formatRp(trx.cashPaid)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-weight:bold;">
            <span>Kembalian:</span><span>${formatRp(trx.change)}</span>
          </div>` : ''}
        </div>
        <div style="border-bottom:1px dashed #000; margin:10px 0;"></div>
        <div style="text-align:center; font-size:0.75rem;">
          Terima kasih atas kunjungan Anda!<br>Selamat Menikmati Hidangan
        </div>
      `;

      document.getElementById('modal-receipt').classList.add('show');
    }

    function closeReceiptModal() {
      document.getElementById('modal-receipt').classList.remove('show');
    }

    function printReceipt() {
      const content = document.getElementById('receipt-content').innerHTML;
      const printWin = window.open('', '', 'width=400,height=600');
      printWin.document.write(`
        <html>
          <head>
            <title>Cetak Struk Resto</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; }
            
    /* Category Filter Pills ( Layout Luar - Persis Screenshot ) */
    .category-pills-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 10px;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .category-pill {
      background: rgba(60, 30, 10, 0.45);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 8px 14px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }
    .category-pill:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-1px);
    }
    .category-pill.active {
      background: #f59e0b;
      color: #1e1b4b;
      font-weight: 700;
      border-color: #f59e0b;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5);
    }

  </style>
          </head>
          <body>
            ${content}
            <script>
              window.onload = function() { window.print(); window.close(); }
            <\/script>
          </body>
        </html>
      `);
      printWin.document.close();
    }

    /* ==========================================================================
       2. MASTER DATA MENU LOGIC
       ========================================================================== */
    function renderMasterTable() {
      const tbody = document.getElementById('master-table-body');
      tbody.innerHTML = appData.products.map(p => {
        let badgeClass = 'badge-success';
        let badgeText = 'Aman';
        if (p.stock <= 0) { badgeClass = 'badge-danger'; badgeText = 'Habis'; }
        else if (p.stock <= p.minStock) { badgeClass = 'badge-warning'; badgeText = 'Menipis'; }

        const imgHtml = p.img ? `<img src="${p.img}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">` : '-';

        return `
          <tr>
            <td>${imgHtml}</td>
            <td style="font-weight:600;">${escapeHTML(p.name)}</td>
            <td>${escapeHTML(p.category)}</td>
            <td>${formatRp(p.price)}</td>
            <td>${(Number(p.discountValue) || 0) > 0 ? (p.discountType === 'percent' ? `${p.discountValue}%` : formatRp(p.discountValue)) : '-'}</td>
            <td>${p.stock} porsi</td>
            <td>${p.minStock}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>
              <button class="btn btn-outline" style="padding:4px 8px; font-size:0.8rem;" onclick="openProductModalWithAuth('${p.id}')">Edit</button>
              <button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="deleteProduct('${p.id}')">Hapus</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    /* VERIFIKASI DENGAN KATA KUNCI UNTUK MENGEDIT DAN MENAMBAH MENU */
    async function openProductModalWithAuth(prodId = null) {
      if (prodId && !(await verifyReservationDeleteAuth("mengedit data menu restoran"))) return;
      openProductModal(prodId);
    }

    function openProductModal(prodId = null) {
      const modal = document.getElementById('modal-product');
      const title = document.getElementById('modal-product-title');
      const grpStock = document.getElementById('grp-prod-stock');
      modal.classList.add('show');

      if (prodId) {
        const p = appData.products.find(x => x.id === prodId);
        title.innerText = "Edit Menu Restoran";
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-category').value = p.category;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-discount-type').value = p.discountType || 'percent';
        document.getElementById('prod-discount-value').value = p.discountValue || 0;
        document.getElementById('prod-min').value = p.minStock;
        document.getElementById('prod-reorder').value = p.reorderQty;
        document.getElementById('prod-img-base64').value = p.img || '';
        grpStock.style.display = 'none';
      } else {
        title.innerText = "Tambah Menu Baru";
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-name').value = '';
        document.getElementById('prod-category').value = '';
        document.getElementById('prod-price').value = '';
        document.getElementById('prod-discount-type').value = 'percent';
        document.getElementById('prod-discount-value').value = '0';
        document.getElementById('prod-stock').value = '10';
        document.getElementById('prod-min').value = '5';
        document.getElementById('prod-reorder').value = '25';
        document.getElementById('prod-img-base64').value = '';
        grpStock.style.display = 'block';
      }
    }

    function closeProductModal() {
      document.getElementById('modal-product').classList.remove('show');
    }

    function setProductImgTemp(base64) {
      document.getElementById('prod-img-base64').value = base64;
    }

    function saveProduct() {
      const id = document.getElementById('prod-id').value;
      const name = document.getElementById('prod-name').value.trim();
      const category = document.getElementById('prod-category').value.trim();
      const price = parseFloat(document.getElementById('prod-price').value) || 0;
      const discountType = document.getElementById('prod-discount-type').value;
      const discountValue = Math.max(0, parseFloat(document.getElementById('prod-discount-value').value) || 0);
      const minStock = parseInt(document.getElementById('prod-min').value) || 0;
      const reorderQty = parseInt(document.getElementById('prod-reorder').value) || 10;
      const img = document.getElementById('prod-img-base64').value;

      if (!name || !category) {
        showToast("Nama dan Kategori menu wajib diisi!", "warning");
        return;
      }

      if (id) {
        const p = appData.products.find(x => x.id === id);
        if (p) {
          p.name = name; p.category = category; p.price = price;
          p.discountType = discountType; p.discountValue = discountValue;
          p.minStock = minStock; p.reorderQty = reorderQty; p.img = img;
        }
      } else {
        const initialStock = parseInt(document.getElementById('prod-stock').value) || 0;
        const newId = 'PRD-' + String(appData.products.length + 1).padStart(3, '0');
        const now = getNowFormatted();

        appData.products.push({
          id: newId, name, category, price, discountType, discountValue, stock: initialStock, minStock, reorderQty, img
        });

        if (initialStock > 0) {
          appData.stokHistory.unshift({
            id: 'MUT-' + Math.random().toString(36).substr(2, 9),
            time: now, productId: newId, productName: name, type: 'Masuk', qty: initialStock, notes: 'Stok awal menu'
          });
        }
      }

      saveData();
      closeProductModal();
      renderAll();
      showToast("Menu berhasil disimpan!", "success");
    }

    /* VERIFIKASI DENGAN KATA KUNCI UNTUK MENGHAPUS MENU */
    async function deleteProduct(prodId) {
      const p = appData.products.find(x => x.id === prodId);
      if (!p) return;

      if (!(await verifyReservationDeleteAuth(`menghapus menu "${p.name}"`))) return;

      if (confirm(`Hapus menu "${p.name}" dari daftar?`)) {
        appData.products = appData.products.filter(x => x.id !== prodId);
        saveData();
        renderAll();
        showToast("Menu telah dihapus.", "info");
      }
    }

    /* ==========================================================================
       3. STOK BAHAN & MUTASI LOGIC
       ========================================================================== */
    function renderStokOverview() {
      const totalJenis = appData.products.length;
      const totalUnit = appData.products.reduce((acc, p) => acc + p.stock, 0);
      const lowStock = appData.products.filter(p => p.stock > 0 && p.stock <= p.minStock);
      const outStock = appData.products.filter(p => p.stock <= 0);

      document.getElementById('stok-stat-jenis').innerText = totalJenis;
      document.getElementById('stok-stat-total').innerText = totalUnit + " Porsi";
      document.getElementById('stok-stat-menipis').innerText = lowStock.length;
      document.getElementById('stok-stat-habis').innerText = outStock.length;

      const totalAlerts = lowStock.length + outStock.length;
      const badge = document.getElementById('stok-badge');
      if (totalAlerts > 0) {
        badge.innerText = totalAlerts;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }

      const reorderCard = document.getElementById('reorder-card');
      const reorderTbody = document.getElementById('reorder-table-body');
      const needReorder = [...outStock, ...lowStock];

      if (needReorder.length > 0) {
        reorderCard.style.display = 'flex';
        reorderTbody.innerHTML = needReorder.map(p => `
          <tr>
            <td style="font-weight:600;">${escapeHTML(p.name)}</td>
            <td style="color:var(--danger); font-weight:bold;">${p.stock}</td>
            <td>${p.minStock}</td>
            <td>${p.reorderQty} unit</td>
            <td>
              <button class="btn btn-success" style="padding:4px 8px; font-size:0.8rem;" onclick="openStokModalWithAuth('${p.id}', 'Masuk', ${p.reorderQty}, 'Hasil Masak / Restok Porsi')">Terima / Restok</button>
            </td>
          </tr>
        `).join('');
      } else {
        reorderCard.style.display = 'none';
      }
    }

    function checkLowStockAlerts(isInitial = false) {
      const lowOrOut = appData.products.filter(p => p.stock <= p.minStock);
      const alertBanner = document.getElementById('kasir-alert');
      const alertText = document.getElementById('kasir-alert-text');

      if (lowOrOut.length > 0) {
        alertBanner.style.display = 'flex';
        alertText.innerText = `⚠️ Perhatian Resto: Ada ${lowOrOut.length} menu dengan stok porsi menipis/habis!`;
        if (isInitial) {
          showToast(`Segera siapkan bahan! ${lowOrOut.length} menu menyentuh stok minimal.`, "warning");
        }
      } else {
        alertBanner.style.display = 'none';
      }
    }

    function copyReorderList() {
      const needReorder = appData.products.filter(p => p.stock <= p.minStock);
      if (needReorder.length === 0) return;

      let text = `DAFTAR RESTOK BAHAN/MENU - ${appData.settings.storeName}\nTanggal: ${getNowFormatted()}\n------------------------------------\n`;
      needReorder.forEach((p, idx) => {
        text += `${idx+1}. ${p.name} | Sisa: ${p.stock} porsi | Rekomendasi Restok: ${p.reorderQty} porsi\n`;
      });

      navigator.clipboard.writeText(text).then(() => {
        showToast("Daftar pesanan restok berhasil disalin!", "success");
      });
    }

    function renderStokTable() {
      const tbody = document.getElementById('stok-table-body');
      tbody.innerHTML = appData.products.map(p => {
        let badgeClass = 'badge-success';
        let badgeText = 'Aman';
        if (p.stock <= 0) { badgeClass = 'badge-danger'; badgeText = 'Habis'; }
        else if (p.stock <= p.minStock) { badgeClass = 'badge-warning'; badgeText = 'Menipis'; }

        return `
          <tr>
            <td style="font-weight:600;">${escapeHTML(p.name)}</td>
            <td>${p.stock}</td>
            <td>${p.minStock}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>
              <button class="btn btn-success" style="padding:4px 8px; font-size:0.8rem;" onclick="openStokModalWithAuth('${p.id}', 'Masuk')">+ Masuk</button>
              <button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="openStokModalWithAuth('${p.id}', 'Keluar')">− Keluar</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    /* VERIFIKASI KATA KUNCI SAAT PERUBAHAN STOK */
    async function openStokModalWithAuth(prodId, type, defaultQty = 1, defaultNotes = 'Penerimaan Bahan Supplier') {
      if (!(await verifyReservationDeleteAuth(`mencatat stok bahan ${type.toLowerCase()}`))) return;
      openStokModal(prodId, type, defaultQty, defaultNotes);
    }

    function openStokModal(prodId, type, defaultQty = 1, defaultNotes = 'Penerimaan Bahan Supplier') {
      const p = appData.products.find(x => x.id === prodId);
      if (!p) return;

      document.getElementById('modal-stok').classList.add('show');
      document.getElementById('modal-stok-title').innerText = `Adjust Stok ${type}: ${p.name}`;
      document.getElementById('stok-prod-id').value = p.id;
      document.getElementById('stok-type').value = type;
      document.getElementById('stok-qty').value = defaultQty;
      document.getElementById('stok-notes').value = defaultNotes;
    }

    function closeStokModal() {
      document.getElementById('modal-stok').classList.remove('show');
    }

    function submitStokAdjustment() {
      const prodId = document.getElementById('stok-prod-id').value;
      const type = document.getElementById('stok-type').value;
      const qty = parseInt(document.getElementById('stok-qty').value) || 0;
      const notes = document.getElementById('stok-notes').value;

      const p = appData.products.find(x => x.id === prodId);
      if (!p || qty <= 0) {
        showToast("Jumlah mutasi porsi harus lebih dari 0!", "warning");
        return;
      }

      if (type === 'Keluar' && qty > p.stock) {
        showToast(`Stok keluar (${qty}) melebihi sisa (${p.stock})!`, "danger");
        return;
      }

      if (type === 'Masuk') p.stock += qty;
      else p.stock -= qty;

      appData.stokHistory.unshift({
        id: 'MUT-' + Math.random().toString(36).substr(2, 9),
        time: getNowFormatted(),
        productId: p.id,
        productName: p.name,
        type: type,
        qty: qty,
        notes: notes
      });

      if (appData.stokHistory.length > 200) appData.stokHistory.pop();

      saveData();
      closeStokModal();
      renderAll();
      showToast(`Mutasi stok ${type} berhasil dicatat!`, "success");
      checkLowStockAlerts();
    }

    function renderStokHistory() {
      const filter = document.getElementById('stok-history-filter').value;
      const tbody = document.getElementById('stok-history-body');

      const filtered = appData.stokHistory.filter(h => filter === 'Semua' || h.type === filter);

      tbody.innerHTML = filtered.map(h => `
        <tr>
          <td>${h.time}</td>
          <td style="font-weight:600;">${escapeHTML(h.productName)}</td>
          <td><span class="badge ${h.type === 'Masuk' ? 'badge-success' : 'badge-danger'}">${h.type}</span></td>
          <td>${h.qty}</td>
          <td>${escapeHTML(h.notes)}</td>
          <td>
            <button class="btn btn-outline" style="padding:2px 6px; font-size:0.75rem;" onclick="revertStokMutasi('${h.id}')">Batalkan</button>
          </td>
        </tr>
      `).join('');
    }

    async function revertStokMutasi(mutasiId) {
      const mut = appData.stokHistory.find(m => m.id === mutasiId);
      if (!mut) return;

      if (!(await verifyReservationDeleteAuth("membatalkan mutasi stok bahan"))) return;

      const p = appData.products.find(x => x.id === mut.productId);
      if (confirm(`Batalkan mutasi stok "${mut.notes}" (${mut.type} ${mut.qty} unit)?`)) {
        if (mut.type === 'Masuk') {
          if (p && p.stock < mut.qty) {
            showToast("Gagal membatalkan! Stok tersisa lebih kecil dari mutasi.", "danger");
            return;
          }
          if (p) p.stock -= mut.qty;
        } else {
          if (p) p.stock += mut.qty;
        }

        appData.stokHistory = appData.stokHistory.filter(m => m.id !== mutasiId);
        saveData();
        renderAll();
        showToast("Catatan mutasi telah dibatalkan.", "info");
      }
    }

    async function clearStokHistoryWithAuth() {
      if (!(await verifyReservationDeleteAuth("menghapus seluruh riwayat mutasi stok bahan"))) return;
      clearStokHistory();
    }

    function clearStokHistory() {
      if (confirm("Hapus seluruh catatan riwayat mutasi stok? (Stok saat ini tidak berubah)")) {
        appData.stokHistory = [];
        saveData();
        renderStokHistory();
        showToast("Riwayat mutasi stok telah dikosongkan.", "info");
      }
    }

    /* ==========================================================================
       4. RIWAYAT TRANSAKSI RESTORAN LOGIC
       ========================================================================== */
    function renderBestSeller(salesList) {
      const categoryTotals = new Map();
      const menuTotals = new Map();
      const perCategoryMenu = new Map();
      (salesList || []).forEach(sale => (sale.items || []).forEach(item => {
        const qty = Math.max(0, Number(item.qty) || 0);
        if (!qty) return;
        const category = String(item.category || 'Tanpa Kategori');
        const name = String(item.productName || item.name || 'Menu Tanpa Nama');
        const key = `${category}|||${name}`;
        const revenue = Number(item.netSales) || (Number(item.unitPrice) || 0) * qty;
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + qty);
        const menu = menuTotals.get(name) || { name, qty: 0, revenue: 0, category };
        menu.qty += qty; menu.revenue += revenue;
        if (revenue > 0) menu.category = category;
        menuTotals.set(name, menu);
        const catMap = perCategoryMenu.get(category) || new Map();
        const catMenu = catMap.get(name) || { name, qty: 0, revenue: 0 };
        catMenu.qty += qty; catMenu.revenue += revenue;
        catMap.set(name, catMenu); perCategoryMenu.set(category, catMap);
      }));

      const bestCategory = [...categoryTotals.entries()].sort((a,b) => b[1]-a[1])[0];
      const bestMenu = [...menuTotals.values()].sort((a,b) => b.qty-a.qty || b.revenue-a.revenue)[0];
      const categoryEl = document.getElementById('best-category-name');
      const categoryUnitsEl = document.getElementById('best-category-units');
      const menuEl = document.getElementById('best-menu-name');
      const menuDetailEl = document.getElementById('best-menu-detail');
      if (categoryEl) categoryEl.innerText = bestCategory ? bestCategory[0] : '-';
      if (categoryUnitsEl) categoryUnitsEl.innerText = bestCategory ? `${bestCategory[1]} unit terjual` : '0 unit terjual';
      if (menuEl) menuEl.innerText = bestMenu ? bestMenu.name : '-';
      if (menuDetailEl) menuDetailEl.innerText = bestMenu ? `${bestMenu.qty} unit · Kategori ${bestMenu.category} · ${formatRp(bestMenu.revenue)}` : 'Belum ada penjualan';

      const tbody = document.getElementById('best-category-table');
      if (!tbody) return;
      const rows = [...perCategoryMenu.entries()].map(([category, menus]) => {
        const top = [...menus.values()].sort((a,b) => b.qty-a.qty || b.revenue-a.revenue)[0];
        return { category, ...top };
      }).sort((a,b) => b.qty-a.qty);
      tbody.innerHTML = rows.length ? rows.map(row => `
        <tr><td><strong>${escapeHTML(row.category)}</strong></td><td>${escapeHTML(row.name)}</td>
        <td><strong>${row.qty}</strong></td><td>${formatRp(row.revenue)}</td></tr>`).join('') :
        '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:14px;">Belum ada data penjualan menu pada filter ini.</td></tr>';
    }

    function renderSalesHistory() {
      const tbody = document.getElementById('sales-table-body');
      let totalGross = 0;
      let totalPpn = 0;
      let totalService = 0;

      const q = (document.getElementById('riwayat-search')?.value || '').trim().toLowerCase();
      const dFrom = document.getElementById('riwayat-date-from')?.value || '';
      const dTo = document.getElementById('riwayat-date-to')?.value || '';
      const filtered = appData.sales.filter(s => {
        const day = String(s.date || '').substring(0, 10);
        if (dFrom && day < dFrom) return false;
        if (dTo && day > dTo) return false;
        if (q && !(String(s.date || '').toLowerCase().includes(q) || String(s.trxId || '').toLowerCase().includes(q))) return false;
        return true;
      });
      const isFiltered = !!(q || dFrom || dTo);
      renderBestSeller(filtered);
      const infoEl = document.getElementById('riwayat-filter-info');
      if (infoEl) infoEl.innerText = isFiltered ? `Menampilkan ${filtered.length} dari ${appData.sales.length} transaksi (ringkasan di atas mengikuti hasil pencarian).` : '';

      tbody.innerHTML = filtered.length === 0 ? `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:16px;">${isFiltered ? 'Tidak ada transaksi pada tanggal tersebut.' : 'Belum ada transaksi.'}</td></tr>` : filtered.map(s => {
        totalGross += (s.grandTotal || 0);
        totalPpn += (s.ppnTax || 0);
        totalService += (s.serviceCharge || 0);

        return `
          <tr>
            <td>${s.date}</td>
            <td style="font-weight:600; font-family:monospace;">${s.trxId}</td>
            <td><span class="badge ${s.orderType === 'Take Away' ? 'badge-warning' : 'badge-info'}">${s.orderType || 'Dine In'}</span></td>
            <td><strong>${escapeHTML(s.orderRef || '-')}</strong></td>
            <td>${escapeHTML(s.kasirName || 'Kasir')}</td>
            <td style="font-weight:700; color:var(--primary);">${formatRp(s.grandTotal)}</td>
            <td>${s.paymentMethod}</td>
            <td>
              <button class="btn btn-outline" style="padding:2px 6px; font-size:0.75rem;" onclick='renderReceipt(${JSON.stringify(s)})'>Struk</button>
              <button class="btn btn-danger" style="padding:2px 6px; font-size:0.75rem;" onclick="deleteSaleTransaction('${s.id}')">Hapus</button>
            </td>
          </tr>
        `;
      }).join('');

      document.getElementById('riwayat-stat-trx').innerText = filtered.length;
      document.getElementById('riwayat-stat-service').innerText = formatRp(totalService);
      document.getElementById('riwayat-stat-ppn').innerText = formatRp(totalPpn);
      document.getElementById('riwayat-stat-total').innerText = formatRp(totalGross);
    }

    function resetRiwayatFilter() {
      ['riwayat-search', 'riwayat-date-from', 'riwayat-date-to'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      renderSalesHistory();
    }

    async function deleteSaleTransaction(saleId) {
      const sale = appData.sales.find(s => s.id === saleId);
      if (!sale) return;

      if (!(await verifyReservationDeleteAuth(`menghapus transaksi ${sale.trxId}`))) return;

      if (confirm(`Hapus transaksi ${sale.trxId}? Stok menu akan dikembalikan.`)) {
        if (sale.items) {
          sale.items.forEach(item => {
            const p = appData.products.find(x => x.id === item.productId);
            if (p) p.stock += item.qty;

            appData.stokHistory.unshift({
              id: 'MUT-' + Math.random().toString(36).substr(2, 9),
              time: getNowFormatted(),
              productId: item.productId,
              productName: item.productName,
              type: 'Masuk',
              qty: item.qty,
              notes: `Pembatalan Transaksi ${sale.trxId}`
            });
          });
        }

        appData.sales = appData.sales.filter(s => s.id !== saleId);
        saveData();
        renderAll();
        showToast("Transaksi dibatalkan & stok dikembalikan.", "info");
      }
    }

    async function clearSalesHistory() {
      if (!(await verifyReservationDeleteAuth("menghapus seluruh riwayat penjualan"))) return;
      if (confirm("Hapus SELURUH riwayat transaksi penjualan restoran? Data tidak bisa dikembalikan.")) {
        appData.sales = [];
        saveData();
        renderAll();
        showToast("Riwayat penjualan berhasil dikosongkan.", "info");
      }
    }

    /* ==========================================================================
       5. EXCEL EXPORT (SHEETJS XLSX)
       ========================================================================== */
    function exportFullExcel() {
      try {
        if (typeof XLSX === 'undefined' || !XLSX.utils) {
          // Library tertanam hilang? coba muat dari internet lalu ulangi otomatis
          if (!window.__xlsxRetry) {
            window.__xlsxRetry = true;
            showToast("Memuat library Excel, mohon tunggu...", "info");
            const sc = document.createElement('script');
            sc.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
            sc.onload = () => { window.__xlsxRetry = false; exportFullExcel(); };
            sc.onerror = () => { window.__xlsxRetry = false; showToast("Library Excel gagal dimuat. Periksa internet lalu coba lagi.", "danger"); };
            document.head.appendChild(sc);
            return;
          }
          throw new Error("Library SheetJS tidak terisi.");
        }

        const wb = XLSX.utils.book_new();
        const BROWN = '3B2010', ORANGE = 'EA580C', CREAM = 'FFF7ED', LINE = 'D6C4B5';
        const border = { style: 'thin', color: { rgb: LINE } };
        const allBorder = { top: border, bottom: border, left: border, right: border };
        const FMT = { text: '@', rp: '#,##0', num: '#,##0', pct: '0"%"' };

        // Membuat sheet rapi: header berwarna, lebar kolom, format angka, filter & freeze header
        function buildSheet(name, rows, cols) {
          try { buildSheetStyled(name, rows, cols); } catch (err) {
            console.error('Sheet ' + name + ' gagal diberi gaya, dibuat polos:', err);
            const plain = [cols.map(c => c.h)].concat(rows.map(r => cols.map(c => (r[c.h] === undefined || r[c.h] === null) ? '' : r[c.h])));
            const wsP = XLSX.utils.aoa_to_sheet(plain);
            wsP['!cols'] = cols.map(c => ({ wch: c.w }));
            XLSX.utils.book_append_sheet(wb, wsP, name);
          }
        }
        function buildSheetStyled(name, rows, cols) {
          const aoa = [cols.map(c => c.h)];
          rows.forEach(r => aoa.push(cols.map(c => {
            const v = r[c.h];
            return (v === undefined || v === null) ? '' : v;
          })));
          const ws = XLSX.utils.aoa_to_sheet(aoa);
          const range = XLSX.utils.decode_range(ws['!ref']);

          for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
              const addr = XLSX.utils.encode_cell({ r: R, c: C });
              if (!ws[addr]) ws[addr] = { t: 's', v: '' };
              const col = cols[C];
              if (R === 0) {
                ws[addr].s = {
                  font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Calibri', sz: 11 },
                  fill: { patternType: 'solid', fgColor: { rgb: BROWN } },
                  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                  border: allBorder
                };
              } else {
                const isNum = col.t === 'rp' || col.t === 'num' || col.t === 'pct';
                if (isNum && ws[addr].t === 'n') ws[addr].z = FMT[col.t];
                const st = {
                  font: { name: 'Calibri', sz: 11 },
                  alignment: { horizontal: isNum ? 'right' : (col.t === 'center' ? 'center' : 'left'), vertical: 'center', wrapText: !!col.wrap },
                  border: allBorder
                };
                if (R % 2 === 0) st.fill = { patternType: 'solid', fgColor: { rgb: CREAM } };
                ws[addr].s = st;
              }
            }
          }
          ws['!cols'] = cols.map(c => ({ wch: c.w }));
          ws['!rows'] = [{ hpt: 32 }];
          ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(range.e.r, 1), c: range.e.c } }) };
          XLSX.utils.book_append_sheet(wb, ws, name);
        }

        // ---------- Data ----------
        const salesSorted = (appData.sales || []).slice().sort((x, y) => String(x.date || '').localeCompare(String(y.date || '')));
        const salesData = salesSorted.map(s => ({
          'Waktu Transaksi': s.date,
          'ID Struk': s.trxId,
          'Jenis Order': s.orderType || 'Dine In',
          'Meja / Antrean': s.orderRef || '-',
          'Catatan Khusus': s.orderNotes || '-',
          'Kasir / Petugas': s.kasirName || '-',
          'Subtotal Kotor (Rp)': Number(s.grossSubtotal || s.subtotal) || 0,
          'Total Diskon (Rp)': Number(s.totalDiscount) || 0,
          'Subtotal Menu Net (Rp)': Number(s.subtotal) || 0,
          'Biaya Take Away (Rp)': Number(s.takeAwayFee) || 0,
          'Service Rate (%)': Number(s.serviceRate !== undefined ? s.serviceRate : 5),
          'Biaya Service (Rp)': Number(s.serviceCharge) || 0,
          'Tarif Tax (%)': Number(s.ppnRate !== undefined ? s.ppnRate : 10),
          'Nilai Tax (Rp)': Number(s.ppnTax) || 0,
          'Total Net / Grand Total (Rp)': Number(s.grandTotal) || 0,
          'Metode Pembayaran': s.paymentMethod || '-'
        }));

        const itemRows = [];
        salesSorted.forEach(s => {
          (s.items || []).forEach(item => {
            itemRows.push({
              'Waktu': s.date,
              'ID Struk': s.trxId,
              'Kasir': s.kasirName || '-',
              'Jenis Order': s.orderType || 'Dine In',
              'Meja / Antrean': s.orderRef || '-',
              'Nama Menu': item.productName,
              'Kategori': item.category || '-',
              'Qty Porsi': Number(item.qty) || 0,
              'Harga Satuan (Rp)': Number(item.unitPrice) || 0,
              'Diskon Item (Rp)': Number(item.discount) || 0,
              'Total Jual (Rp)': Number(item.netSales) || 0,
              'Metode Pembayaran': s.paymentMethod || '-'
            });
          });
        });

        const resData = (appData.reservations || []).slice().sort((x, y) => String(x.datetime || '').localeCompare(String(y.datetime || ''))).map(r => ({
          'ID Reservasi': r.id,
          'Waktu Kedatangan': r.datetime ? r.datetime.replace('T', ' ') : '-',
          'Nama Tamu': r.name,
          'Kontak HP': r.phone,
          'Meja': r.table,
          'Jumlah Pax': Number(r.pax) || 0,
          'Status': r.status,
          'Catatan': r.notes || '-'
        }));

        const stokData = (appData.products || []).map(p => ({
          'ID Menu': p.id,
          'Nama Menu': p.name,
          'Kategori': p.category,
          'Harga Satuan (Rp)': Number(p.price) || 0,
          'Stok Sisa Porsi': Number(p.stock) || 0,
          'Stok Minimum': Number(p.minStock) || 0,
          'Status': p.stock <= 0 ? 'Habis' : (p.stock <= p.minStock ? 'Menipis' : 'Aman')
        }));

        const mutasiData = (appData.stokHistory || []).map(h => ({
          'Waktu': h.time,
          'ID Menu': h.productId,
          'Nama Menu': h.productName,
          'Jenis Mutasi': h.type,
          'Jumlah Porsi': Number(h.qty) || 0,
          'Keterangan': h.notes || '-'
        }));

        // ---------- Sheet Ringkasan ----------
        const totalOmset = salesSorted.reduce((a, s) => a + (Number(s.grandTotal) || 0), 0);
        const totalPorsi = itemRows.reduce((a, i) => a + i['Qty Porsi'], 0);
        const sum = [
          [appData.settings.storeName || 'Restoran', ''],
          [appData.settings.groupName || '', ''],
          ['', ''],
          ['Tanggal Ekspor', new Date().toLocaleString('id-ID')],
          ['Petugas', currentKasirName || appData.settings.defaultKasir || '-'],
          ['Jumlah Transaksi', salesSorted.length],
          ['Versi Format Excel', 'POS-XLSX v2 (kolom tetap, aman diunggah ke Dashboard)'],
          ['Total Porsi Terjual', totalPorsi],
          ['Total Omset (Grand Total)', totalOmset],
          ['Jumlah Reservasi', appData.reservations.length],
          ['Jumlah Menu', appData.products.length],
          ['', ''],
          ['Catatan', 'Unggah file ini ke Dashboard SIM (tombol "Unggah Excel/CSV"). Dashboard membaca sheet "Detail Item Terjual" (penjualan + stok bahan baku), "Stok Menu" (daftar menu & harga) dan "Reservasi Meja" (riwayat reservasi, tidak pernah dihapus).']
        ];
        const wsSum = XLSX.utils.aoa_to_sheet(sum);
        wsSum['!cols'] = [{ wch: 28 }, { wch: 70 }];
        wsSum['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }];
        wsSum['A1'].s = { font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: BROWN } }, alignment: { vertical: 'center' } };
        wsSum['B1'].s = wsSum['A1'].s;
        wsSum['A2'].s = { font: { italic: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: BROWN } } };
        wsSum['B2'].s = wsSum['A2'].s;
        for (let r = 3; r < sum.length; r++) {
          const a = wsSum[XLSX.utils.encode_cell({ r, c: 0 })], b = wsSum[XLSX.utils.encode_cell({ r, c: 1 })];
          if (sum[r][0]) {
            a.s = { font: { bold: true }, fill: { patternType: 'solid', fgColor: { rgb: CREAM } }, border: allBorder };
            b.s = { alignment: { horizontal: 'left', wrapText: true, vertical: 'top' }, border: allBorder };
            if (b.t === 'n') b.z = (sum[r][0].indexOf('Omset') >= 0) ? '"Rp" #,##0' : '#,##0';
          }
        }
        wsSum['!rows'] = [{ hpt: 28 }];
        XLSX.utils.book_append_sheet(wb, wsSum, 'Ringkasan');

        // ---------- Sheet data ----------
        buildSheet('Laporan Transaksi', salesData, [
          { h: 'Waktu Transaksi', w: 20, t: 'center' }, { h: 'ID Struk', w: 16, t: 'center' },
          { h: 'Jenis Order', w: 13, t: 'center' }, { h: 'Meja / Antrean', w: 15, t: 'center' },
          { h: 'Catatan Khusus', w: 26, t: 'text', wrap: true }, { h: 'Kasir / Petugas', w: 17 },
          { h: 'Subtotal Kotor (Rp)', w: 19, t: 'rp' }, { h: 'Total Diskon (Rp)', w: 17, t: 'rp' },
          { h: 'Subtotal Menu Net (Rp)', w: 22, t: 'rp' }, { h: 'Biaya Take Away (Rp)', w: 20, t: 'rp' },
          { h: 'Service Rate (%)', w: 15, t: 'pct' }, { h: 'Biaya Service (Rp)', w: 17, t: 'rp' },
          { h: 'Tarif Tax (%)', w: 13, t: 'pct' }, { h: 'Nilai Tax (Rp)', w: 15, t: 'rp' },
          { h: 'Total Net / Grand Total (Rp)', w: 27, t: 'rp' }, { h: 'Metode Pembayaran', w: 19, t: 'center' }
        ]);
        buildSheet('Detail Item Terjual', itemRows, [
          { h: 'Waktu', w: 20, t: 'center' }, { h: 'ID Struk', w: 16, t: 'center' }, { h: 'Kasir', w: 16 },
          { h: 'Jenis Order', w: 13, t: 'center' }, { h: 'Meja / Antrean', w: 15, t: 'center' },
          { h: 'Nama Menu', w: 30 }, { h: 'Kategori', w: 18 }, { h: 'Qty Porsi', w: 11, t: 'num' },
          { h: 'Harga Satuan (Rp)', w: 18, t: 'rp' }, { h: 'Diskon Item (Rp)', w: 17, t: 'rp' },
          { h: 'Total Jual (Rp)', w: 17, t: 'rp' }, { h: 'Metode Pembayaran', w: 19, t: 'center' }
        ]);
        buildSheet('Reservasi Meja', resData, [
          { h: 'ID Reservasi', w: 15, t: 'center' }, { h: 'Waktu Kedatangan', w: 20, t: 'center' },
          { h: 'Nama Tamu', w: 22 }, { h: 'Kontak HP', w: 16, t: 'center' }, { h: 'Meja', w: 10, t: 'center' },
          { h: 'Jumlah Pax', w: 12, t: 'num' },
          { h: 'Status', w: 14, t: 'center' }, { h: 'Catatan', w: 30, t: 'text', wrap: true }
        ]);
        buildSheet('Stok Menu', stokData, [
          { h: 'ID Menu', w: 10, t: 'center' }, { h: 'Nama Menu', w: 30 }, { h: 'Kategori', w: 18 },
          { h: 'Harga Satuan (Rp)', w: 18, t: 'rp' }, { h: 'Stok Sisa Porsi', w: 16, t: 'num' },
          { h: 'Stok Minimum', w: 14, t: 'num' }, { h: 'Status', w: 12, t: 'center' }
        ]);
        buildSheet('Mutasi Stok', mutasiData, [
          { h: 'Waktu', w: 20, t: 'center' }, { h: 'ID Menu', w: 10, t: 'center' }, { h: 'Nama Menu', w: 30 },
          { h: 'Jenis Mutasi', w: 16, t: 'center' }, { h: 'Jumlah Porsi', w: 14, t: 'num' },
          { h: 'Keterangan', w: 36, t: 'text', wrap: true }
        ]);

        const cleanName = (appData.settings.storeName || 'Resto').replace(/[^a-zA-Z0-9]/g, '_');
        XLSX.writeFile(wb, `Laporan_Resto_${cleanName}.xlsx`);
        showToast("Berhasil mengunduh Excel (.xlsx) rapi, siap diunggah ke Dashboard!", "success");

      } catch (e) {
        console.error("Export XLSX error:", e);
        showToast("Gagal membuat Excel: " + (e && e.message ? e.message : e) + ". Mengunduh CSV sebagai cadangan.", "danger");
        fallbackCSVExport();
      }
    }

    function fallbackCSVExport() {
      let csv = "\uFEFFWaktu,ID Struk,Tipe Order,Meja/Antrean,Kasir,Subtotal,Diskon,Service,Tax,Grand Total,Metode\n";
      appData.sales.forEach(s => {
        csv += `"${s.date}","${s.trxId}","${s.orderType}","${s.orderRef}","${s.kasirName}",${s.subtotal},${s.totalDiscount || 0},${s.serviceCharge || 0},${s.ppnTax},${s.grandTotal},"${s.paymentMethod}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Laporan_Resto_${appData.settings.storeName}.csv`;
      link.click();
      showToast("Diunduh dalam format Fallback CSV.", "info");
    }

    /* ==========================================================================
       6. PENGATURAN RESTO & TEMA
       ========================================================================== */
    function applySettingsToUI() {
      const cfg = appData.settings;
      // Migrasi: background lama diganti background World Taste (sekali). Upload background baru setelahnya tetap tersimpan.
      if (cfg.bgTheme !== 'worldtaste-v1') {
        cfg.mainBg = ''; cfg.headerBg = ''; cfg.bgTheme = 'worldtaste-v1';
        try { saveData(); } catch (e) {}
      }
      document.getElementById('cfg-store-name').value = cfg.storeName || '';
      document.getElementById('cfg-group-name').value = cfg.groupName || '';
      document.getElementById('cfg-default-kasir').value = cfg.defaultKasir || '';
      document.getElementById('cfg-contact-wa').value = cfg.contactWA || '';
      document.getElementById('cfg-auth-pin').value = cfg.authPin || '1234';
      document.getElementById('cfg-ppn-rate').value = cfg.ppnRate !== undefined ? cfg.ppnRate : 10;
      document.getElementById('cfg-service-rate').value = cfg.serviceRate !== undefined ? cfg.serviceRate : 5;
      document.getElementById('cfg-takeaway-fee').value = cfg.takeAwayFee !== undefined ? cfg.takeAwayFee : 2000;
      document.getElementById('cfg-discount-type').value = cfg.discountType || 'percent';
      document.getElementById('cfg-theme').value = cfg.theme || 'light';
      document.getElementById('cfg-header-overlay').value = cfg.headerOverlay || 40;
      document.getElementById('cfg-card-opacity').value = cfg.cardOpacity || 94;

      document.getElementById('disp-store-name').innerText = cfg.storeName || 'Restoran Usaha Kami';
      document.getElementById('disp-group-name').innerText = cfg.groupName || 'Kasir Resto SIM';
      document.getElementById('disp-kasir-header').innerText = currentKasirName || cfg.defaultKasir || 'Kasir';

      if (cfg.logo) document.getElementById('header-logo').src = cfg.logo;
      if (cfg.headerBg) document.getElementById('app-header').style.backgroundImage = `url(${cfg.headerBg})`;
      if (cfg.mainBg) document.body.style.backgroundImage = `url(${cfg.mainBg})`;

      applyTheme(cfg.theme || 'light');
      updateOpacitySettings();
    }

    function saveSettingsIdentitas() {
      appData.settings.storeName = document.getElementById('cfg-store-name').value.trim();
      appData.settings.groupName = document.getElementById('cfg-group-name').value.trim();
      appData.settings.defaultKasir = document.getElementById('cfg-default-kasir').value.trim() || 'Kasir Utama';
      appData.settings.contactWA = document.getElementById('cfg-contact-wa').value.trim();
      appData.settings.authPin = document.getElementById('cfg-auth-pin').value.trim() || '1234';
      appData.settings.ppnRate = parseFloat(document.getElementById('cfg-ppn-rate').value) || 0;
      appData.settings.serviceRate = parseFloat(document.getElementById('cfg-service-rate').value) || 0;
      appData.settings.takeAwayFee = parseFloat(document.getElementById('cfg-takeaway-fee').value) || 0;
      appData.settings.discountType = document.getElementById('cfg-discount-type').value;

      currentKasirName = appData.settings.defaultKasir;
      document.getElementById('cart-kasir-name').value = currentKasirName;

      saveData();
      applySettingsToUI();
      renderCart(false);
      showToast("Pengaturan resto & pajak berhasil disimpan!", "success");
    }

    function applyTheme(themeName) {
      document.body.setAttribute('data-theme', themeName);
      appData.settings.theme = themeName;
      saveData();
    }

    function updateOpacitySettings() {
      const overlayVal = document.getElementById('cfg-header-overlay').value;
      const cardVal = document.getElementById('cfg-card-opacity').value;

      document.documentElement.style.setProperty('--header-overlay', `rgba(15, 23, 42, ${overlayVal / 100})`);
      document.documentElement.style.setProperty('--card-opacity', `${cardVal / 100}`);
      
      appData.settings.headerOverlay = overlayVal;
      appData.settings.cardOpacity = cardVal;
      saveData();
    }

    function setLogo(base64) {
      appData.settings.logo = base64;
      document.getElementById('header-logo').src = base64;
      saveData();
      showToast("Logo resto diperbarui!", "success");
    }

    function setHeaderBg(base64) {
      appData.settings.headerBg = base64;
      document.getElementById('app-header').style.backgroundImage = `url(${base64})`;
      saveData();
      showToast("Header background diperbarui!", "success");
    }

    function setMainBg(base64) {
      appData.settings.mainBg = base64;
      document.body.style.backgroundImage = `url(${base64})`;
      saveData();
      showToast("Background utama diperbarui!", "success");
    }

    function resetAllData() {
      if (!verifyAuth("Mereset Seluruh Data Aplikasi")) return;
      if (confirm("⚠️ Yakin ingin MERESET SEMUA DATA RESTORAN ke bawaan awal? Semua menu baru & transaksi akan terhapus. (Riwayat reservasi tanggal lewat tetap dipertahankan.)")) {
        localStorage.removeItem('world_taste_pos_app_data');
        location.reload();
      }
    }

    /* ==========================================================================
       7. SELF-CONTAINED HTML EXPORT
       ========================================================================== */
    function exportSelfHTML(isTemplateOnly = false) {
      const cloneData = JSON.parse(JSON.stringify(appData));
      cloneData.savedAt = new Date().toISOString();

      if (isTemplateOnly) {
        cloneData.sales = [];
        cloneData.pendingOrders = [];
        // Riwayat reservasi sengaja TIDAK dikosongkan (data riwayat tidak boleh hilang)
        cloneData.stokHistory = [];
        cloneData.queueCounter = 1;
      }

      const jsonString = JSON.stringify(cloneData, null, 2).replace(/</g, '\\u003c');
      const docType = "<!DOCTYPE html>\n";
      let currentHTML = document.documentElement.outerHTML;

      currentHTML = currentHTML.replace(
        /<script id="seed" type="application\/json">[\s\S]*?<\/script>/,
        () => `<script id="seed" type="application/json">\n${jsonString}\n<\/script>`
      );

      const blob = new Blob([docType + currentHTML], { type: 'text/html;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = isTemplateOnly ? 'POS_Resto_Template_Clean.html' : 'POS_Resto_SavedData.html';
      link.click();

      showToast(isTemplateOnly ? "File template bersih tanpa transaksi diunduh!" : "File POS HTML lengkap dengan data disimpan!", "success");
    }

    // Initialize Application on DOM Ready
    window.addEventListener('DOMContentLoaded', initApp);
  
