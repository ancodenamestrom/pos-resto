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
    if (/57014|statement timeout/i.test(b))
      return 'Supabase membatalkan penyimpanan karena terlalu lama (timeout). Jalankan perintah "statement_timeout" dari README di SQL Editor, lalu muat ulang halaman.';
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
  // Kalau data awal gagal diambil, data di browser ini mungkin sudah lama.
  // Tahan pengiriman sampai data server berhasil diambil, supaya data lama tidak menimpa data baru.
  var holdPush = false;
  var lastBlob = {};      // nilai terakhir yang sudah sama dengan server
  var knownItems = {};    // key -> {item_id: true}
  var pending = {};       // kunci yang menunggu dikirim
  var inflight = {};      // kunci yang sedang dikirim
  var sinceStore = null, sinceItems = null;
  var knownTs = {};       // key -> updated_at versi yang sudah dimiliki browser ini (hindari unduh ulang)

  function applyBlob(k, v, notify) {
    var old = origGet.call(ls, k);
    lastBlob[k] = v;
    if (old === v) return false;
    try { origSet.call(ls, k, v); } catch (e) { console.warn('[sync] localStorage penuh, gagal menyimpan', k); return false; }
    if (notify) fire(k, old, v);
    return true;
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

  /* ---------- Foto disimpan terpisah ----------
     Foto (data:image/...;base64) di dalam data diganti "kode foto" (wtimg:...) sebelum dikirim,
     dan fotonya disimpan sekali sebagai baris sendiri di kv_store. Data kasir/menu jadi kecil,
     dan foto yang sama tidak dikirim ulang setiap kali kasir menyimpan. Di browser, data tetap utuh. */
  var IMG_RE = /data:image\/[A-Za-z0-9.+-]+;base64,[A-Za-z0-9+\/=]{1500,}/g;
  var TOK_RE = /wtimg:[0-9a-z]+_[0-9a-z]+_[0-9]+/g;
  var NOT_IMG = '&key=not.like.' + enc('wtimg:*');
  var imgCache = {};      // kode -> foto
  var imgOnServer = {};   // kode yang sudah pasti ada di server
  var repack = {};        // data di server yang fotonya masih menempel -> kirim ulang dalam bentuk ringkas
  function hasInlineImg(v) { IMG_RE.lastIndex = 0; var r = IMG_RE.test(v || ''); IMG_RE.lastIndex = 0; return r; }
  function h2(str) {
    var a = 5381, b = 0;
    for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); a = ((a << 5) + a + c) | 0; b = (c + (b << 6) + (b << 16) - b) | 0; }
    return (a >>> 0).toString(36) + '_' + (b >>> 0).toString(36);
  }
  function imgToken(d) { return 'wtimg:' + h2(d) + '_' + d.length; }
  function harvest(v) {
    if (v && v.indexOf('data:image') >= 0) v.replace(IMG_RE, function (d) { imgCache[imgToken(d)] = d; return d; });
  }
  function pack(v) {
    var toks = [];
    var out = v.replace(IMG_RE, function (d) { var t = imgToken(d); imgCache[t] = d; if (toks.indexOf(t) < 0) toks.push(t); return t; });
    return { value: out, toks: toks };
  }
  function tokensIn(v) { var m = (v && v.indexOf('wtimg:') >= 0) ? v.match(TOK_RE) : null; return m || []; }
  function missingOf(values) {
    var miss = [];
    values.forEach(function (v) { tokensIn(v).forEach(function (t) { imgOnServer[t] = 1; if (!imgCache[t] && miss.indexOf(t) < 0) miss.push(t); }); });
    return miss;
  }
  function unpack(v) { return tokensIn(v).length ? v.replace(TOK_RE, function (t) { return imgCache[t] || t; }) : v; }
  function imgPath(toks) { return 'kv_store?select=key,value&key=in.(' + toks.map(function (t) { return '"' + t + '"'; }).join(',') + ')'; }
  function chunks(arr, n) { var out = []; for (var i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }
  function storeImgs(rows) { rows.forEach(function (r) { imgCache[r.key] = r.value; imgOnServer[r.key] = 1; }); }
  function fetchImgsSync(toks) { chunks(toks, 30).forEach(function (c) { storeImgs(syncGet(imgPath(c))); }); }
  function fetchImgs(toks) {
    return chunks(toks, 30).reduce(function (pr, c) { return pr.then(function () { return getJSON(imgPath(c)).then(storeImgs); }); }, Promise.resolve());
  }
  // Unggah foto yang belum ada di server, sedikit demi sedikit (maks ~400 KB per kiriman)
  function uploadImgs(toks) {
    var need = toks.filter(function (t) { return !imgOnServer[t] && imgCache[t]; });
    var batches = [], cur = [], size = 0;
    need.forEach(function (t) {
      var row = { key: t, value: imgCache[t], client_id: clientId };
      if (cur.length && size + row.value.length > 400000) { batches.push(cur); cur = []; size = 0; }
      cur.push(row); size += row.value.length;
    });
    if (cur.length) batches.push(cur);
    return batches.reduce(function (pr, b) {
      return pr.then(function () {
        return send('POST', 'kv_store?on_conflict=key', JSON.stringify(b), 'resolution=ignore-duplicates,return=minimal')
          .then(function () { b.forEach(function (r) { imgOnServer[r.key] = 1; }); });
      });
    }, Promise.resolve());
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
    blobPath += SCOPE === 'customer' ? '&key=in.(' + CUSTOMER_BLOBS.join(',') + ')' : NOT_IMG;
    var blobs = syncGet(blobPath), remote = {};
    // Foto yang sudah ada di browser ini tidak perlu diunduh lagi
    for (var j = 0; j < ls.length; j++) { var lk = ls.key(j); if (isSynced(lk)) harvest(origGet.call(ls, lk)); }
    var use = blobs.filter(function (r) { return canPullBlob(r.key); });
    var miss = missingOf(use.map(function (r) { return r.value; }));
    if (miss.length) fetchImgsSync(miss);
    blobs.forEach(function (r) {
      remote[r.key] = 1;
      sinceStore = later(sinceStore, r.updated_at);
      knownTs[r.key] = r.updated_at;
    });
    use.forEach(function (r) {
      applyBlob(r.key, unpack(r.value), false);
      if (SCOPE === 'staff' && canPush(r.key) && hasInlineImg(r.value)) { repack[r.key] = 1; pending[r.key] = 1; }
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

  // Satu kunci = satu kiriman, dan kunci yang sama tidak pernah dikirim dua kali bersamaan.
  // Perubahan yang terjadi selama kiriman berjalan digabung dan dikirim sesudahnya.
  var failCount = {};
  function backoff(k) { return failCount[k] ? Math.min(30000, 2000 * Math.pow(2, failCount[k] - 1)) : 300; }

  function flush(keepalive) {
    if (holdPush) return;
    Object.keys(pending).forEach(function (k) {
      if (inflight[k]) return;                 // tunggu kiriman sebelumnya selesai
      delete pending[k];
      var v = origGet.call(ls, k);
      if (v === null) {
        if (lastBlob[k] === undefined) return;
        inflight[k] = 1;
        send('DELETE', 'kv_store?key=eq.' + enc(k), null, 'return=minimal', keepalive === true)
          .then(function () { delete lastBlob[k]; failCount[k] = 0; })
          .catch(function (e) { failCount[k] = (failCount[k] || 0) + 1; reportError('Gagal menghapus ' + k, e); pending[k] = 1; })
          .then(function () { delete inflight[k]; if (pending[k]) setTimeout(flush, backoff(k)); });
        return;
      }
      if (v === lastBlob[k] && !repack[k]) return;
      inflight[k] = 1;
      var pk = pack(v);
      uploadImgs(pk.toks).then(function () {
        return send('POST', 'kv_store?on_conflict=key', JSON.stringify([{ key: k, value: pk.value, client_id: clientId }]),
           'resolution=merge-duplicates,return=minimal', keepalive === true && pk.toks.every(function (t) { return imgOnServer[t]; }));
      })
        .then(function () {
          lastBlob[k] = v; failCount[k] = 0; delete repack[k];
          pushFailing = Object.keys(failCount).some(function (x) { return failCount[x] > 0; });
          if (!pushFailing && PosSync.status === 'error') setStatus(rtLive ? 'live' : 'poll');
        })
        .catch(function (e) {
          failCount[k] = (failCount[k] || 0) + 1; pushFailing = true;
          reportError('Gagal mengirim ' + k + ' (' + Math.round(pk.value.length / 1024) + ' KB)', e);
          pending[k] = 1;
        })
        .then(function () { delete inflight[k]; if (pending[k]) setTimeout(flush, backoff(k)); });
    });
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
    // Tahap 1: hanya kunci & waktu ubah (sangat kecil). Isi data diambil di tahap 2 hanya untuk yang benar-benar baru.
    var bPath = 'kv_store?select=key,updated_at&updated_at=gte.' + enc(sinceParam(sinceStore)) + notMe + (SCOPE === 'customer' ? '' : NOT_IMG);
    var iPath = 'kv_items?select=key,item_id,value,created_at&order=created_at.asc&limit=1000&created_at=gte.' + enc(sinceParam(sinceItems)) + notMe;
    if (SCOPE === 'customer') {
      bPath += '&key=in.(' + CUSTOMER_BLOBS.join(',') + ')';
      iPath += '&key=in.(' + CUSTOMER_ITEMS.join(',') + ')';
    }
    Promise.all([getJSON(bPath), getJSON(iPath)]).then(function (res) {
      var changed = res[0].filter(function (r) {
        sinceStore = later(sinceStore, r.updated_at);
        return canPullBlob(r.key) && knownTs[r.key] !== r.updated_at;
      }).map(function (r) { return r.key; });
      if (!changed.length) { res[0] = []; return res; }
      var vPath = 'kv_store?select=key,value,updated_at&key=in.(' + changed.map(function (k) { return '"' + k + '"'; }).join(',') + ')';
      return getJSON(vPath).then(function (rows) { res[0] = rows; return res; });
    }).then(function (res) {
      var miss = missingOf(res[0].filter(function (r) { return canPullBlob(r.key); }).map(function (r) { return r.value; }));
      return miss.length ? fetchImgs(miss).then(function () { return res; }) : res;
    }).then(function (res) {
      var changedOnRecover = false;
      res[0].forEach(function (r) {
        sinceStore = later(sinceStore, r.updated_at);
        if (canPullBlob(r.key) && (holdPush || !pending[r.key]) && !inflight[r.key]) {
          if (applyBlob(r.key, unpack(r.value), true) && holdPush) changedOnRecover = true;
          knownTs[r.key] = r.updated_at;
        }
      });
      var by = groupItems(res[1]);
      Object.keys(by).forEach(function (k) { applyItems(k, by[k], true); });
      if (holdPush) {
        // Data server berbeda dari yang sudah dimuat aplikasi: muat ulang halaman staf sekali
        // agar kasir/dashboard memakai data terbaru (maksimal sekali per menit, mencegah loop).
        var last = 0; try { last = Number(sessionStorage.getItem('pos_sync_reload') || 0); } catch (e) {}
        if (changedOnRecover && SCOPE === 'staff' && Date.now() - last > 60000) {
          try { sessionStorage.setItem('pos_sync_reload', String(Date.now())); } catch (e) {}
          console.info('[sync] Tersambung kembali. Memuat ulang halaman dengan data terbaru...');
          pending = {};
          location.reload();
          return;
        }
        holdPush = false;
        console.info('[sync] Tersambung kembali. Data terbaru dari server sudah dimuat.');
        if (changedOnRecover) Object.keys(pending).forEach(function (k) { if (origGet.call(ls, k) === lastBlob[k]) delete pending[k]; });
        if (Object.keys(pending).length) setTimeout(flush, 300);
      }
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
        if (p.new && (p.new.client_id === clientId || String(p.new.key || '').indexOf('wtimg:') === 0)) return;
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
    holdPush = true;
    reportError('Data awal belum bisa diambil, mencoba lagi otomatis', e);
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
