/* ==========================================================================
   SINKRONISASI REAL TIME VIA SUPABASE
   Cara kerja:
   - Aplikasi tetap menyimpan data di localStorage seperti biasa.
   - File ini mencerminkan setiap localStorage.setItem/removeItem ke Supabase,
     lalu menerima perubahan dari perangkat lain secara real time dan
     menuliskannya kembali ke localStorage + memicu event "storage",
     sehingga kode kasir, dashboard dan pesan online yang sudah ada langsung
     bereaksi tanpa perlu diubah.
   - Saat halaman dibuka, data terbaru diambil dulu dari Supabase sebelum
     script aplikasi berjalan.

   Pasang di <head>, SEBELUM script aplikasi:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="assets/js/supabase-config.js"></script>
     <script src="assets/js/supabase-sync.js" data-scope="staff"></script>
   data-scope="staff"    -> kasir & dashboard: semua data disinkronkan
   data-scope="customer" -> pesan online: hanya menu, status pesanan & ulasan
   ========================================================================== */
(function () {
  'use strict';

  var SCRIPT = document.currentScript;
  var SCOPE = (SCRIPT && SCRIPT.getAttribute('data-scope')) === 'customer' ? 'customer' : 'staff';
  // Rapikan isian config: buang spasi/kutip, "/rest/v1", dan "/" di akhir.
  var BASE = String(window.SUPABASE_URL || '').trim().replace(/^['"\s]+|['"\s]+$/g, '')
    .replace(/\/+$/, '').replace(/\/rest\/v1$/i, '').replace(/\/+$/, '');
  if (BASE && !/^https?:\/\//i.test(BASE)) BASE = 'https://' + BASE;
  var KEY = String(window.SUPABASE_KEY || '').replace(/\s+/g, '').replace(/^['"]+|['"]+$/g, '');

  var ls;
  try { ls = window.localStorage; } catch (e) { return; }

  var PosSync = window.PosSync = { enabled: false, status: 'off', scope: SCOPE };
  if (!BASE || !KEY) {
    console.info('[sync] Supabase belum dikonfigurasi (assets/js/supabase-config.js). Aplikasi berjalan offline.');
    return;
  }

  /* ---------- Diagnosis error ---------- */
  function httpError(status, body) {
    var e = new Error('HTTP ' + status + ' ' + String(body || '').slice(0, 300));
    e.status = status; e.body = String(body || ''); return e;
  }
  function b64json(part) {
    var t = part.replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    return JSON.parse(atob(t));
  }
  function configProblem() {
    if (/^sb_secret_/.test(KEY)) return 'Yang dipasang adalah SECRET key. Ganti dengan "anon public" key atau "Publishable key" (sb_publishable_...).';
    if (/^eyJ/.test(KEY)) {
      var pl;
      try { pl = b64json(KEY.split('.')[1] || ''); } catch (e) { return 'Anon key tidak valid, kemungkinan terpotong saat disalin. Salin ulang key-nya secara utuh.'; }
      if (pl.role === 'service_role') return 'Yang dipasang adalah service_role key. Ganti dengan "anon public" key.';
      if (pl.ref && BASE.toLowerCase().indexOf(String(pl.ref).toLowerCase()) < 0 && /\.supabase\.co$/i.test(BASE))
        return 'Key ini milik project "' + pl.ref + '", tapi Project URL menunjuk project lain (' + BASE + '). Pakai URL dan key dari project yang sama.';
    } else if (!/^sb_publishable_/.test(KEY)) {
      return 'Format key tidak dikenali. Key yang benar diawali "eyJ" (anon public) atau "sb_publishable_".';
    }
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(BASE))
      return 'Project URL tidak berbentuk https://xxxx.supabase.co (sekarang: ' + BASE + '). Cek lagi URL-nya.';
    return '';
  }
  function explain(e) {
    if (e && e.cfg) return e.cfg;
    var st = e && e.status || 0, b = (e && (e.body || e.message)) || '';
    if (/PGRST205|42P01|Could not find the table|does not exist/i.test(b))
      return 'Tabel kv_store / kv_items belum ada di project ini. Jalankan supabase-setup.sql di SQL Editor Supabase (project yang sama dengan Project URL), lalu muat ulang halaman.';
    if (/secret API key/i.test(b)) return 'Secret key tidak boleh dipakai di browser. Ganti dengan anon public / Publishable key.';
    if (st === 401 || /Invalid API key|No API key/i.test(b)) return 'API key ditolak (401). Salin ulang "anon public" key dari project yang sama dengan Project URL.';
    if (st === 403 || /42501|row-level security|permission denied/i.test(b)) return 'Akses ditolak (403). Jalankan ulang supabase-setup.sql agar izin untuk anon terpasang.';
    if (st === 404) return 'Alamat tidak ditemukan (404). Project URL harus seperti https://xxxx.supabase.co.';
    if (st >= 500) return 'Server Supabase sedang bermasalah (' + st + '). Coba lagi sebentar lagi.';
    if (!st) return 'Tidak bisa menghubungi Supabase. Cek internet, ejaan Project URL, dan apakah project sedang "Paused" di dashboard Supabase (klik Restore).';
    return 'HTTP ' + st + ': ' + b.slice(0, 200);
  }
  var lastErrMsg = '', pushFailing = false;
  function reportError(where, e) {
    var msg = explain(e);
    PosSync.lastError = msg;
    if (msg !== lastErrMsg) {
      lastErrMsg = msg;
      console.error('[sync] ' + where + ': ' + msg + (e && e.message ? '\n  Detail: ' + e.message : ''));
    }
    setStatus(navigator.onLine === false ? 'offline' : 'error');
  }

  /* ---------- Aturan kunci yang disinkronkan ---------- */
  var PREFIXES = ['world_taste_', 'wt_', 'resto_', 'pos_resto_'];
  // Tetap lokal per perangkat: riwayat "Pesanan Saya" pelanggan dan password login.
  var NEVER = ['wt_my_orders', 'resto_sim_admin_pin'];
  var NEVER_PREFIX = ['resto_sim_login_'];
  // Data berbentuk daftar yang bisa ditambah banyak orang sekaligus:
  // disimpan per baris agar pesanan/ulasan tidak saling menimpa.
  var ITEM_KEYS = ['wt_online_queue', 'wt_reviews', 'wt_service_reviews', 'wt_complaints'];
  // Yang boleh dibaca halaman pelanggan.
  var CUSTOMER_BLOBS = ['wt_menu_public', 'wt_online_status'];
  var CUSTOMER_ITEMS = ['wt_reviews', 'wt_service_reviews'];
  var QUEUE_DAYS = 3;

  function startsWithAny(k, list) { for (var i = 0; i < list.length; i++) if (k.indexOf(list[i]) === 0) return true; return false; }
  function isSynced(k) {
    return typeof k === 'string' && NEVER.indexOf(k) < 0 && !startsWithAny(k, NEVER_PREFIX) && startsWithAny(k, PREFIXES);
  }
  function isItemKey(k) { return ITEM_KEYS.indexOf(k) >= 0; }
  function canPush(k) { return isSynced(k) && (SCOPE === 'staff' || isItemKey(k)); }
  function canPullBlob(k) { return isSynced(k) && !isItemKey(k) && (SCOPE === 'staff' || CUSTOMER_BLOBS.indexOf(k) >= 0); }
  function canPullItems(k) { return isItemKey(k) && (SCOPE === 'staff' || CUSTOMER_ITEMS.indexOf(k) >= 0); }

  /* ---------- Utilitas ---------- */
  var origSet = Storage.prototype.setItem;
  var origRemove = Storage.prototype.removeItem;
  var origGet = Storage.prototype.getItem;
  var clientId = 'c-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  function headers(json) {
    var h = { apikey: KEY };
    if (/^eyJ/.test(KEY)) h.Authorization = 'Bearer ' + KEY;   // anon key lama (JWT)
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }
  function rest(path) { return BASE + '/rest/v1/' + path; }
  function enc(v) { return encodeURIComponent(v); }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function itemId(o) {
    if (o && typeof o === 'object') {
      if (o.code) return 'c:' + o.code;
      if (o.id) return 'i:' + o.id;
    }
    var s = JSON.stringify(o) || '';
    return 'h:' + hash(s) + ':' + s.length;
  }
  function parseArr(s) { try { var a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function later(a, b) { return !a || (b && new Date(b) > new Date(a)) ? b : a; }
  function sinceParam(iso) { return new Date(new Date(iso || 0).getTime() - 5000).toISOString(); }

  function fire(key, oldV, newV) {
    var ev;
    try { ev = new StorageEvent('storage', { key: key, oldValue: oldV, newValue: newV, url: location.href, storageArea: ls }); }
    catch (e) { ev = document.createEvent('Event'); ev.initEvent('storage', false, false); ev.key = key; ev.oldValue = oldV; ev.newValue = newV; }
    window.dispatchEvent(ev);
  }

  /* ---------- Status kecil di pojok layar (halaman staf) ---------- */
  var badge = null;
  var STATUS_TEXT = { live: '● Live', poll: '● Sinkron berkala', offline: '● Offline', error: '● Gagal sinkron' };
  var STATUS_COLOR = { live: '#16a34a', poll: '#d97706', offline: '#dc2626', error: '#dc2626' };
  var badgeOpen = false;
  function setStatus(s) {
    PosSync.status = s;
    if (s === 'live' || s === 'poll') { PosSync.lastError = ''; lastErrMsg = ''; }
    if (!badge) return;
    var bad = (s === 'error' || s === 'offline') && PosSync.lastError;
    badge.textContent = (STATUS_TEXT[s] || s) + (bad ? (badgeOpen ? ': ' + PosSync.lastError : ' (klik untuk detail)') : '');
    badge.title = bad ? PosSync.lastError : 'Status sinkronisasi Supabase';
    badge.style.background = STATUS_COLOR[s] || '#6b7280';
  }
  function mountBadge() {
    if (SCOPE !== 'staff' || badge) return;
    badge = document.createElement('div');
    badge.id = 'pos-sync-badge';
    badge.title = 'Status sinkronisasi Supabase';
    badge.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:99999;color:#fff;font:600 11px/1.35 system-ui,sans-serif;padding:6px 9px;border-radius:12px;opacity:.9;cursor:pointer;max-width:min(420px,calc(100vw - 20px))';
    badge.addEventListener('click', function () { badgeOpen = !badgeOpen; setStatus(PosSync.status); });
    document.body.appendChild(badge);
    setStatus(PosSync.status);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBadge); else mountBadge();

  /* ---------- State ---------- */
  var ready = false;
  var lastBlob = {};      // nilai terakhir yang sudah sama dengan server
  var knownItems = {};    // key -> {item_id: true}
  var pending = {};       // kunci yang menunggu dikirim
  var inflight = {};      // kunci yang sedang dikirim
  var sinceStore = null, sinceItems = null;

  function applyBlob(k, v, notify) {
    var old = origGet.call(ls, k);
    lastBlob[k] = v;
    if (old === v) return;
    try { origSet.call(ls, k, v); } catch (e) { console.warn('[sync] localStorage penuh, gagal menyimpan', k); return; }
    if (notify) fire(k, old, v);
  }

  function applyItems(k, rows, notify) {
    var set = knownItems[k] || (knownItems[k] = {});
    var old = origGet.call(ls, k);
    var arr = parseArr(old), have = {}, added = 0;
    arr.forEach(function (o) { have[itemId(o)] = 1; });
    rows.forEach(function (r) {
      set[r.item_id] = 1;
      if (have[r.item_id]) return;
      var v; try { v = JSON.parse(r.value); } catch (e) { return; }
      have[r.item_id] = 1; arr.push(v); added++;
    });
    if (!added) return;
    var nv = JSON.stringify(arr);
    try { origSet.call(ls, k, nv); } catch (e) { console.warn('[sync] localStorage penuh, gagal menyimpan', k); return; }
    if (notify) fire(k, old, nv);
  }

  function groupItems(rows) {
    var by = {};
    rows.forEach(function (r) { sinceItems = later(sinceItems, r.created_at); if (canPullItems(r.key)) (by[r.key] = by[r.key] || []).push(r); });
    return by;
  }

  /* ---------- 1) Ambil data awal (blocking, sebelum script aplikasi jalan) ---------- */
  function syncGet(path) {
    var x = new XMLHttpRequest();
    x.open('GET', rest(path), false);
    var h = headers(false);
    for (var k in h) x.setRequestHeader(k, h[k]);
    try { x.send(null); } catch (e) { throw httpError(0, e.message); }
    if (x.status >= 200 && x.status < 300) return JSON.parse(x.responseText || '[]');
    throw httpError(x.status, x.responseText);
  }

  function initialPull() {
    var blobPath = 'kv_store?select=key,value,updated_at';
    if (SCOPE === 'customer') blobPath += '&key=in.(' + CUSTOMER_BLOBS.join(',') + ')';
    var blobs = syncGet(blobPath), remote = {};
    blobs.forEach(function (r) {
      remote[r.key] = 1;
      sinceStore = later(sinceStore, r.updated_at);
      if (canPullBlob(r.key)) applyBlob(r.key, r.value, false);
    });

    var itemPath = 'kv_items?select=key,item_id,value,created_at&order=created_at.asc&limit=5000';
    if (SCOPE === 'customer') itemPath += '&key=in.(' + CUSTOMER_ITEMS.join(',') + ')';
    else itemPath += '&or=' + enc('(key.neq.wt_online_queue,created_at.gte.' + new Date(Date.now() - QUEUE_DAYS * 864e5).toISOString() + ')');
    var by = groupItems(syncGet(itemPath));
    Object.keys(by).forEach(function (k) { applyItems(k, by[k], false); });

    // Data yang baru ada di browser ini (misal pertama kali dipakai) ikut diunggah.
    if (SCOPE === 'staff') {
      for (var i = 0; i < ls.length; i++) {
        var k = ls.key(i);
        if (canPush(k) && !isItemKey(k) && !remote[k]) pending[k] = 1;
      }
    }
  }

  /* ---------- 2) Kirim perubahan lokal ---------- */
  var flushTimer = null, retryTimer = null;
  function schedulePush(k) { pending[k] = 1; clearTimeout(flushTimer); flushTimer = setTimeout(flush, 300); }
  function retryLater() { clearTimeout(retryTimer); retryTimer = setTimeout(flush, 3000); }

  function send(method, path, body, prefer, keepalive) {
    var h = headers(!!body);
    if (prefer) h.Prefer = prefer;
    var opt = { method: method, headers: h };
    if (body) opt.body = body;
    if (keepalive && (!body || body.length < 60000)) opt.keepalive = true;
    return fetch(rest(path), opt).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw httpError(r.status, t); });
      return r;
    }, function (e) { throw httpError(0, e.message); });
  }

  function flush(keepalive) {
    var keys = Object.keys(pending);
    if (!keys.length) return;
    pending = {};
    var ups = [], dels = [];
    keys.forEach(function (k) {
      var v = origGet.call(ls, k);
      if (v === null) { if (lastBlob[k] !== undefined) dels.push(k); }
      else if (v !== lastBlob[k]) ups.push({ key: k, value: v, client_id: clientId });
    });
    if (ups.length) {
      ups.forEach(function (u) { inflight[u.key] = 1; });
      send('POST', 'kv_store?on_conflict=key', JSON.stringify(ups), 'resolution=merge-duplicates,return=minimal', keepalive === true)
        .then(function () { ups.forEach(function (u) { lastBlob[u.key] = u.value; }); pushFailing = false; if (PosSync.status === 'error') setStatus(rtLive ? 'live' : 'poll'); })
        .catch(function (e) { pushFailing = true; reportError('Gagal mengirim data', e); ups.forEach(function (u) { pending[u.key] = 1; }); retryLater(); })
        .then(function () { ups.forEach(function (u) { delete inflight[u.key]; }); });
    }
    if (dels.length) {
      send('DELETE', 'kv_store?key=in.(' + dels.map(enc).join(',') + ')', null, 'return=minimal', keepalive === true)
        .then(function () { dels.forEach(function (k) { delete lastBlob[k]; }); })
        .catch(function (e) { reportError('Gagal menghapus data', e); dels.forEach(function (k) { pending[k] = 1; }); retryLater(); });
    }
  }

  function pushItems(k) {
    var set = knownItems[k] || (knownItems[k] = {});
    var rows = [];
    parseArr(origGet.call(ls, k)).forEach(function (o) {
      var id = itemId(o);
      if (set[id]) return;
      set[id] = 1;
      rows.push({ key: k, item_id: id, value: JSON.stringify(o), client_id: clientId });
    });
    if (!rows.length) return;
    send('POST', 'kv_items?on_conflict=key,item_id', JSON.stringify(rows), 'resolution=ignore-duplicates,return=minimal')
      .then(function () { pushFailing = false; })
      .catch(function (e) {
        pushFailing = true; reportError('Gagal mengirim ' + k, e);
        rows.forEach(function (r) { delete set[r.item_id]; });
        setTimeout(function () { pushItems(k); }, 3000);
      });
  }

  function onLocalWrite(k) {
    if (!ready || !canPush(k)) return;
    if (isItemKey(k)) pushItems(k); else schedulePush(k);
  }

  Storage.prototype.setItem = function (k, v) {
    origSet.apply(this, arguments);
    if (this === ls) onLocalWrite(String(k));
  };
  Storage.prototype.removeItem = function (k) {
    origRemove.apply(this, arguments);
    if (this === ls) onLocalWrite(String(k));
  };

  /* ---------- 3) Terima perubahan dari perangkat lain ---------- */
  var pulling = false, pullAgain = false, pullTimer = null;
  function schedulePull() { clearTimeout(pullTimer); pullTimer = setTimeout(pull, 120); }

  function getJSON(path) {
    return fetch(rest(path), { headers: headers(false), cache: 'no-store' }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw httpError(r.status, t); });
      return r.json();
    }, function (e) { throw httpError(0, e.message); });
  }

  function pull() {
    if (!ready) return;
    if (pulling) { pullAgain = true; return; }
    pulling = true;
    var notMe = '&or=' + enc('(client_id.is.null,client_id.neq.' + clientId + ')');
    var bPath = 'kv_store?select=key,value,updated_at&updated_at=gte.' + enc(sinceParam(sinceStore)) + notMe;
    var iPath = 'kv_items?select=key,item_id,value,created_at&order=created_at.asc&limit=1000&created_at=gte.' + enc(sinceParam(sinceItems)) + notMe;
    if (SCOPE === 'customer') {
      bPath += '&key=in.(' + CUSTOMER_BLOBS.join(',') + ')';
      iPath += '&key=in.(' + CUSTOMER_ITEMS.join(',') + ')';
    }
    Promise.all([getJSON(bPath), getJSON(iPath)]).then(function (res) {
      res[0].forEach(function (r) {
        sinceStore = later(sinceStore, r.updated_at);
        if (canPullBlob(r.key) && !pending[r.key] && !inflight[r.key]) applyBlob(r.key, r.value, true);
      });
      var by = groupItems(res[1]);
      Object.keys(by).forEach(function (k) { applyItems(k, by[k], true); });
      if (!pushFailing && (PosSync.status === 'error' || PosSync.status === 'offline')) setStatus(rtLive ? 'live' : 'poll');
    }).catch(function (e) {
      reportError('Gagal mengambil data', e);
    }).then(function () {
      pulling = false;
      if (pullAgain) { pullAgain = false; schedulePull(); }
    });
  }

  function onRemoteDelete(k) {
    if (!k || !canPullBlob(k) || pending[k] || inflight[k]) return;
    var old = origGet.call(ls, k);
    delete lastBlob[k];
    if (old === null) return;
    origRemove.call(ls, k);
    fire(k, old, null);
  }

  var rtLive = false, pollTimer = null;
  function pollLoop() {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(function () { pull(); pollLoop(); }, rtLive ? 15000 : 4000);
  }

  function startRealtime() {
    pollLoop();
    var lib = window.supabase;
    if (!lib || !lib.createClient) { console.warn('[sync] supabase-js tidak termuat, memakai sinkron berkala.'); if (!PosSync.lastError) setStatus('poll'); return; }
    try {
      var client = lib.createClient(BASE, KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      var onChange = function (p) {
        if (p.eventType === 'DELETE') { onRemoteDelete(p.old && p.old.key); return; }
        if (p.new && p.new.client_id === clientId) return;
        schedulePull();
      };
      client.channel('pos-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kv_store' }, onChange)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kv_items' }, onChange)
        .subscribe(function (st) {
          if (st === 'SUBSCRIBED') { rtLive = true; setStatus('live'); pull(); pollLoop(); }
          else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') { rtLive = false; if (!PosSync.lastError) setStatus('poll'); pollLoop(); }
        });
      PosSync.client = client;
    } catch (e) { console.warn('[sync] realtime gagal:', e); if (!PosSync.lastError) setStatus('poll'); }
  }

  /* ---------- Mulai ---------- */
  var cfgMsg = configProblem();
  if (cfgMsg) console.error('[sync] Cek supabase-config.js: ' + cfgMsg);
  if (location.protocol === 'file:') console.warn('[sync] Halaman dibuka langsung dari file (file://). Sebaiknya buka lewat GitHub Pages atau server lokal.');
  try {
    initialPull();
    setStatus('poll');
  } catch (e) {
    reportError('Tidak bisa mengambil data awal (memakai data lokal dulu)', e);
  }
  ready = true;
  PosSync.enabled = true;
  PosSync.clientId = clientId;
  PosSync.pull = pull;
  PosSync.flush = flush;

  ITEM_KEYS.forEach(function (k) { if (canPush(k)) pushItems(k); });
  if (Object.keys(pending).length) flushTimer = setTimeout(flush, 500);

  startRealtime();
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') pull(); else flush(true); });
  window.addEventListener('online', function () { pull(); flush(); });
  window.addEventListener('pagehide', function () { flush(true); });
})();
