(function(){
  "use strict";
  /* Password bawaan (bisa diganti Pemilik di Pengaturan). Password Pemilik memakai kunci yang sama dengan Dashboard. */
  const defaults = {kasir:'kasir123', inventory:'inventory123', owner:'owner123'};
  const ROLE_LABEL = {kasir:'Kasir', inventory:'Manager Inventory', owner:'Pemilik'};
  /* HAK AKSES FITUR: Pemilik = semua fitur. Kasir & Manager Inventory mengikuti centang di Pengaturan > Hak Akses Fitur. */
  const ACCESS_KEYS = {kasir:'resto_kasir_access_kasir', inventory:'resto_kasir_access_inventory'};
  const ACCESS_ROLES = ['kasir','inventory'];
  const DEFAULT_ACCESS = {
    kasir:['kasir','open-bills','master','reservasi'],
    inventory:['master','stok','bahanbaku']
  };
  const OWNER_ONLY = ['pengaturan'];
  const FEATURE_LABELS = {
    'kasir':'🛒 Kasir Resto','open-bills':'🍽️ Pesanan & Antrean Aktif','reservasi':'📅 Reservasi Meja',
    'master':'🍽️ Menu & Produk','stok':'📊 Stok Bahan','bahanbaku':'🥬 Bahan Baku','riwayat':'📜 Riwayat Transaksi'
  };
  let currentRole = null;
  try { Object.defineProperty(window,'simCurrentRole',{get:function(){return currentRole;},set:function(){},configurable:true}); } catch(e) {}

  function pass(role){ let v=null; try{ v=localStorage.getItem('resto_sim_login_'+role); }catch(e){} return v || defaults[role]; }
  function tabIdOf(btn){
    const m=(btn.getAttribute('onclick')||'').match(/switchTab\(['"]([^'"]+)['"]\)/);
    return m?m[1]:null;
  }
  function cleanIds(arr){
    const out=[];
    (Array.isArray(arr)?arr:[]).forEach(function(x){
      if(typeof x==='string' && x && OWNER_ONLY.indexOf(x)<0 && out.indexOf(x)<0) out.push(x);
    });
    return out;
  }
  function labelOf(btn,id){
    if(FEATURE_LABELS[id]) return FEATURE_LABELS[id];
    const c=btn.cloneNode(true);
    c.querySelectorAll('.badge-count').forEach(function(b){b.remove();});
    return c.textContent.trim().replace(/\s+/g,' ')||id;
  }
  /* Daftar fitur diambil otomatis dari menu yang ada, sehingga fitur baru langsung muncul di pengaturan. */
  function featureList(){
    const list=[], seen={};
    function add(id,label){
      if(!id || seen[id] || OWNER_ONLY.indexOf(id)>=0) return;
      seen[id]=true; list.push({id:id,label:label||id});
    }
    document.querySelectorAll('.nav-tab').forEach(function(btn){
      const id=tabIdOf(btn);
      if(id) add(id,labelOf(btn,id));
    });
    document.querySelectorAll('.tab-pane[id^="tab-"]').forEach(function(p){ add(p.id.slice(4),FEATURE_LABELS[p.id.slice(4)]); });
    return list;
  }
  function readAccess(role){
    const key=ACCESS_KEYS[role];
    if(!key) return [];
    let raw=null;
    try { raw=localStorage.getItem(key); } catch(e) {}
    if(raw===null) return DEFAULT_ACCESS[role].slice();
    try {
      const v=JSON.parse(raw);
      if(Array.isArray(v)) return cleanIds(v);
    } catch(e) {}
    return DEFAULT_ACCESS[role].slice();
  }
  function canAccess(role,id){
    if(role==='owner') return true;
    if(!ACCESS_KEYS[role]) return false;
    if(OWNER_ONLY.indexOf(id)>=0) return false;
    return readAccess(role).indexOf(id)>=0;
  }
  function updateNoAccessBox(){
    const container=document.querySelector('.container');
    if(!container) return;
    let box=document.getElementById('sim-no-access');
    if(!box){
      box=document.createElement('div');
      box.id='sim-no-access'; box.className='card';
      box.style.cssText='display:none;margin:16px 0;text-align:center;';
      box.innerHTML='<h3>🔒 Belum ada fitur yang diizinkan</h3><p style="color:var(--text-muted);font-size:.9rem;margin-top:6px;">Jabatan Anda belum diberi hak akses ke fitur kasir. Silakan hubungi Pemilik untuk mengatur hak akses.</p>';
      container.insertBefore(box,container.firstChild);
    }
    const has=!!currentRole && featureList().some(function(f){
      return canAccess(currentRole,f.id) && !!document.getElementById('tab-'+f.id);
    });
    box.style.display=(currentRole && !has)?'block':'none';
  }
  function openFirstAllowed(){
    const role=currentRole;
    if(!role) return;
    const first=featureList().map(function(f){return f.id;}).find(function(id){
      return canAccess(role,id) && !!document.getElementById('tab-'+id);
    });
    if(first && typeof window.switchTab==='function') window.switchTab(first);
  }
  /* Menerapkan hak akses ke menu dan panel. */
  function enforce(){
    const role=currentRole;
    const ok=function(id){ return !!role && canAccess(role,id); };
    const denied=[];
    document.querySelectorAll('.nav-tab').forEach(function(btn){
      const id=tabIdOf(btn);
      if(!id) return;
      btn.setAttribute('data-sim-feature',id);
      if(ok(id)){ btn.style.display=''; } else { btn.style.display='none'; denied.push(id); }
    });
    document.querySelectorAll('.tab-pane[id^="tab-"]').forEach(function(p){
      const id=p.id.slice(4);
      p.setAttribute('data-sim-feature',id);
      if(ok(id)){ p.style.removeProperty('display'); }
      else { p.style.setProperty('display','none','important'); p.classList.remove('active'); if(denied.indexOf(id)<0) denied.push(id); }
    });
    let st=document.getElementById('sim-access-style');
    if(!st){ st=document.createElement('style'); st.id='sim-access-style'; document.head.appendChild(st); }
    st.textContent=denied.filter(function(id){return /^[A-Za-z0-9_-]+$/.test(id);}).map(function(id){
      return '.nav-tab[data-sim-feature="'+id+'"],#tab-'+id+'{display:none !important;}';
    }).join('\n');
    updateNoAccessBox();
    if(role && !document.querySelector('.tab-pane.active')) openFirstAllowed();
  }
  /* Penjaga pemanggilan langsung switchTab(): fitur tanpa izin tidak akan dibuka. */
  function installGuard(){
    if(typeof window.switchTab!=='function' || window.switchTab.__simGuarded) return;
    const original=window.switchTab;
    const guarded=function(tabId){
      if(!currentRole || !canAccess(currentRole,tabId)){
        console.warn('Akses ditolak ke fitur "'+tabId+'" untuk jabatan saat ini.');
        return false;
      }
      const result=original.apply(this,arguments);
      if(tabId==='pengaturan' && currentRole==='owner'){ renderAccessSettings(); refreshPasswordPlaceholders(); }
      return result;
    };
    guarded.__simGuarded=true;
    window.switchTab=guarded;
  }
  /* Jika class "active" ditambahkan manual ke panel tanpa izin, langsung dicabut. */
  function watchPanes(){
    if(typeof MutationObserver==='undefined') return;
    const mo=new MutationObserver(function(muts){
      muts.forEach(function(m){
        const p=m.target;
        if(p.classList && p.classList.contains('active') && p.id && p.id.indexOf('tab-')===0){
          if(!currentRole || !canAccess(currentRole,p.id.slice(4))) p.classList.remove('active');
        }
      });
    });
    document.querySelectorAll('.tab-pane').forEach(function(p){ mo.observe(p,{attributes:true,attributeFilter:['class']}); });
  }

  /* ----- UI Pengaturan Hak Akses (hanya Pemilik) ----- */
  function setStatus(msg,kind){
    const el=document.getElementById('access-status');
    if(!el) return;
    el.textContent=msg||'';
    el.style.color=kind==='error'?'#b91c1c':(kind==='warn'?'#b45309':'#15803d');
  }
  function renderAccessSettings(){
    if(currentRole!=='owner') return;
    const feats=featureList();
    ACCESS_ROLES.forEach(function(role){
      const box=document.getElementById('access-list-'+role);
      if(!box) return;
      const allowed=readAccess(role);
      box.innerHTML='';
      feats.forEach(function(f){
        const label=document.createElement('label');
        label.className='feature-toggle-item';
        const cb=document.createElement('input');
        cb.type='checkbox';
        cb.setAttribute('data-access-role',role);
        cb.setAttribute('data-access-feature',f.id);
        cb.checked=allowed.indexOf(f.id)>=0;
        cb.addEventListener('change',function(){ setStatus('● Ada perubahan yang belum disimpan.','warn'); });
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' '+f.label));
        box.appendChild(label);
      });
    });
    setStatus('');
  }
  function saveAccess(){
    if(currentRole!=='owner'){ alert('Hanya Pemilik yang dapat mengubah hak akses.'); return false; }
    const result={kasir:[],inventory:[]};
    document.querySelectorAll('#access-settings-card input[data-access-role]').forEach(function(cb){
      if(cb.checked && result[cb.getAttribute('data-access-role')]) result[cb.getAttribute('data-access-role')].push(cb.getAttribute('data-access-feature'));
    });
    try {
      ACCESS_ROLES.forEach(function(r){ localStorage.setItem(ACCESS_KEYS[r],JSON.stringify(cleanIds(result[r]))); });
    } catch(e) { setStatus('Gagal menyimpan: '+e.message,'error'); return false; }
    enforce();
    setStatus('✅ Hak akses tersimpan dan langsung diterapkan.');
    return true;
  }
  function resetAccess(){
    if(currentRole!=='owner'){ alert('Hanya Pemilik yang dapat mengubah hak akses.'); return false; }
    if(!confirm('Kembalikan hak akses Kasir dan Manager Inventory ke pengaturan awal?')) return false;
    try {
      ACCESS_ROLES.forEach(function(r){ localStorage.setItem(ACCESS_KEYS[r],JSON.stringify(DEFAULT_ACCESS[r])); });
    } catch(e) { setStatus('Gagal mereset: '+e.message,'error'); return false; }
    renderAccessSettings();
    enforce();
    setStatus('↩️ Hak akses dikembalikan ke pengaturan awal dan langsung diterapkan.');
    return true;
  }
  window.simAccess = {
    save:saveAccess,
    reset:resetAccess,
    render:renderAccessSettings,
    exportConfig:function(){ return {kasir:readAccess('kasir'), inventory:readAccess('inventory')}; },
    canAccess:function(id){ return !!currentRole && canAccess(currentRole,id); }
  };

  /* ----- Password login (hanya Pemilik) ----- */
  const PW_FIELDS=[['kasir','cfg-login-kasir'],['inventory','cfg-login-inventory'],['owner','cfg-login-owner']];
  function refreshPasswordPlaceholders(){
    PW_FIELDS.forEach(function(p){
      const el=document.getElementById(p[1]); if(!el) return;
      let has=false; try{ has=!!localStorage.getItem('resto_sim_login_'+p[0]); }catch(e){}
      el.placeholder=has?'Password sudah diatur — isi untuk mengganti':'Password bawaan tersedia — isi untuk mengganti';
    });
  }
  window.simSaveLoginPasswords=function(){
    const st=document.getElementById('login-password-status');
    if(currentRole!=='owner'){ alert('Hanya Pemilik yang dapat mengubah password login.'); return; }
    let changed=0;
    try{
      PW_FIELDS.forEach(function(p){
        const el=document.getElementById(p[1]); if(!el) return;
        const v=el.value.trim();
        if(v){ localStorage.setItem('resto_sim_login_'+p[0],v); changed++; }
        el.value='';
      });
    }catch(e){ if(st){st.style.color='#b91c1c';st.textContent='Gagal menyimpan: '+e.message;} return; }
    refreshPasswordPlaceholders();
    if(st){ st.style.color=changed?'#15803d':'#b45309'; st.textContent=changed?'✅ Password login berhasil disimpan.':'Tidak ada password yang diisi.'; }
  };

  function applyRole(role){
    currentRole=role;
    document.body.classList.add('sim-authenticated');
    document.getElementById('sim-login-screen').style.display='none';
    const lo=document.getElementById('sim-logout-btn');
    lo.textContent='Keluar ('+ROLE_LABEL[role]+')';
    lo.style.display='block';
    installGuard();
    enforce();
    openFirstAllowed();
    if(role==='owner'){ renderAccessSettings(); refreshPasswordPlaceholders(); }
  }
  window.simLogout=function(){
    currentRole=null;
    enforce();
    document.body.classList.remove('sim-authenticated');
    document.getElementById('sim-login-screen').style.display='flex';
    document.getElementById('sim-logout-btn').style.display='none';
    document.getElementById('sim-login-password').value='';
    document.getElementById('sim-login-error').textContent='';
  };
  function resetToLoggedOut(){
    /* File hasil "Simpan File POS HTML" bisa membawa status login lama: selalu mulai dari layar login. */
    currentRole=null;
    document.body.classList.remove('sim-authenticated');
    const ls=document.getElementById('sim-login-screen'); if(ls) ls.style.display='flex';
    const lo=document.getElementById('sim-logout-btn'); if(lo) lo.style.display='none';
  }
  resetToLoggedOut();
  installGuard();
  function initAccess(){ resetToLoggedOut(); installGuard(); watchPanes(); enforce(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initAccess,{once:true}); else initAccess();
  // Perubahan hak akses dari tab browser lain langsung berlaku.
  window.addEventListener('storage',function(e){
    if(e.key===null || e.key===ACCESS_KEYS.kasir || e.key===ACCESS_KEYS.inventory){
      enforce();
      if(currentRole==='owner') renderAccessSettings();
    }
  });
  document.getElementById('sim-login-form').addEventListener('submit',function(e){
    e.preventDefault();
    const role=document.getElementById('sim-login-role').value;
    const entered=document.getElementById('sim-login-password').value;
    if(defaults[role]!==undefined && entered===pass(role)){ applyRole(role); }
    else document.getElementById('sim-login-error').textContent='Password salah. Silakan coba lagi.';
  });
  document.addEventListener('DOMContentLoaded',refreshPasswordPlaceholders);
})();
