var SR = (function (w) {
  'use strict';
  var KEY = { users: 'sr_users', session: 'sr_session', orders: 'sr_orders' };
  var AFTER_MS = { diproses: 30 * 1000, selesai: 120 * 1000 }; // status fiktif berjalan otomatis
  var STATUS = [
    { key: 'berhasil', label: 'Checkout Berhasil', desc: 'Pesanan fiktifmu sudah tercatat.' },
    { key: 'diproses', label: 'Sedang Diproses', desc: 'Pesanan sedang disiapkan (simulasi).' },
    { key: 'selesai', label: 'Selesai', desc: 'Pesanan selesai. Tidak ada barang yang dikirim.' }
  ];

  function read(k, f) { try { var v = JSON.parse(w.localStorage.getItem(k)); return v == null ? f : v; } catch (e) { return f; } }
  function write(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rupiah(n) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0); }
  function fmtDate(ts, withTime) { return new Date(ts).toLocaleString('id-ID', withTime === false ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' }); }
  function initials(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (x) { return x.charAt(0).toUpperCase(); }).join('') || '?'; }
  function hash(pw, salt) {
    var d = salt + ':' + pw;
    if (w.crypto && w.crypto.subtle && w.TextEncoder) {
      return w.crypto.subtle.digest('SHA-256', new TextEncoder().encode(d)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      });
    }
    return Promise.resolve('x' + w.btoa(unescape(encodeURIComponent(d))));
  }

  function pub(u) { return u && { id: u.id, name: u.name, email: u.email, phone: u.phone || '', address: u.address || '', createdAt: u.createdAt }; }
  function users() { return read(KEY.users, []); }
  function currentUser() {
    var id = read(KEY.session, null);
    return id ? pub(users().filter(function (x) { return x.id === id; })[0]) || null : null;
  }

  function register(d) {
    var email = String(d.email || '').trim().toLowerCase(), list = users();
    if (list.some(function (u) { return u.email === email; })) return Promise.resolve({ ok: false, field: 'email', error: 'Email ini sudah terdaftar. Silakan masuk.' });
    var salt = uid();
    return hash(d.password, salt).then(function (h) {
      var u = { id: uid(), name: String(d.name).trim(), email: email, phone: '', address: '', salt: salt, pwHash: h, createdAt: Date.now() };
      list.push(u);
      if (!write(KEY.users, list)) return { ok: false, error: 'Data tidak bisa disimpan. Pastikan penyimpanan browser aktif.' };
      write(KEY.session, u.id);
      return { ok: true };
    });
  }
  function login(email, pw) {
    email = String(email || '').trim().toLowerCase();
    var u = users().filter(function (x) { return x.email === email; })[0];
    var fail = { ok: false, error: 'Email atau kata sandi salah. Periksa lagi lalu coba masuk kembali.' };
    if (!u) return Promise.resolve(fail);
    return hash(pw, u.salt).then(function (h) { if (h !== u.pwHash) return fail; write(KEY.session, u.id); return { ok: true }; });
  }
  function logout() { try { w.localStorage.removeItem(KEY.session); } catch (e) {} }
  function updateProfile(p) {
    var id = read(KEY.session, null), list = users(), u = list.filter(function (x) { return x.id === id; })[0];
    if (!u) return null;
    ['name', 'phone', 'address'].forEach(function (k) { if (p[k] != null) u[k] = String(p[k]).trim(); });
    write(KEY.users, list); return pub(u);
  }
  function changePassword(oldPw, newPw) {
    var id = read(KEY.session, null), list = users(), u = list.filter(function (x) { return x.id === id; })[0];
    if (!u) return Promise.resolve({ ok: false, error: 'Sesi berakhir. Silakan masuk lagi.' });
    return hash(oldPw, u.salt).then(function (h) {
      if (h !== u.pwHash) return { ok: false, field: 'pw-old', error: 'Kata sandi lama tidak cocok.' };
      var salt = uid();
      return hash(newPw, salt).then(function (nh) { u.salt = salt; u.pwHash = nh; write(KEY.users, list); return { ok: true }; });
    });
  }

  function allOrders() { return read(KEY.orders, []); }
  function getOrders() {
    var u = currentUser(); if (!u) return [];
    return allOrders().filter(function (o) { return o.userId === u.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
  }
  function getOrder(id) { return getOrders().filter(function (o) { return o.id === id; })[0] || null; }
  function orderId(ts) {
    var d = new Date(ts), p = function (n) { return ('0' + n).slice(-2); };
    return 'SPR-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }
  function addOrder(items, info) {
    var u = currentUser(); if (!u) return null;
    var clean = (items || []).map(function (i) {
      return { id: String(i.id || uid()), name: String(i.name || 'Produk'), category: String(i.category || ''), price: Math.max(0, Number(i.price) || 0), qty: Math.max(1, parseInt(i.qty, 10) || 1) };
    });
    if (!clean.length) return null;
    info = info || {};
    var ts = Date.now(), sub = clean.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    var o = { id: orderId(ts), userId: u.id, createdAt: ts, items: clean,
      recipient: { name: info.name || u.name, phone: info.phone || u.phone, address: info.address || u.address },
      subtotal: sub, shipping: 0, total: sub };
    var list = allOrders(); list.push(o);
    return write(KEY.orders, list) ? o : null;
  }
  function statusOf(o) {
    var el = Date.now() - o.createdAt, i = el >= AFTER_MS.selesai ? 2 : el >= AFTER_MS.diproses ? 1 : 0;
    return { index: i, key: STATUS[i].key, label: STATUS[i].label };
  }
  function stepTimes(o) { return [o.createdAt, o.createdAt + AFTER_MS.diproses, o.createdAt + AFTER_MS.selesai]; }
  function seedDemo() {
    return addOrder([
      { id: 'facial-wash-cushion', name: 'Facial Wash Cushion', category: 'Skincare', price: 89000, qty: 1 },
      { id: 'moisturizer-blush', name: 'Moisturizer Blush', category: 'Makeup', price: 129000, qty: 2 },
      { id: 'lip-tint', name: 'Lip Tint', category: 'Lip Product', price: 65000, qty: 1 }
    ]);
  }

  return { STATUS: STATUS, esc: esc, rupiah: rupiah, fmtDate: fmtDate, initials: initials,
    currentUser: currentUser, register: register, login: login, logout: logout,
    updateProfile: updateProfile, changePassword: changePassword,
    getOrders: getOrders, getOrder: getOrder, addOrder: addOrder, statusOf: statusOf, stepTimes: stepTimes, seedDemo: seedDemo };
})(window);

/* ---------- UI bersama ---------- */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = SR.esc, view = $('view'), timer = null, nextHash = null;
  var shop = 'pages/kategori.html';

  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  function mount(html, title) {
    clearInterval(timer); timer = null;
    view.innerHTML = html;
    document.title = title + ' · SEPHORREAL';
    window.scrollTo(0, 0);
    var h1 = view.querySelector('h1'); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }
  function wrap(inner) { return '<div class="mx-auto w-full max-w-[1280px] px-4 py-10 lg:px-5 lg:py-[64px]">' + inner + '</div>'; }
  function guard() {
    var u = SR.currentUser();
    if (!u) { nextHash = location.hash; go('#/login'); }
    return u;
  }
  function setErr(id, msg) {
    var el = $(id), h = $(id + '-hint'); if (!el) return;
    if (id === 'agree') { h.textContent = msg ? '! ' + msg : ''; h.classList.toggle('hidden', !msg); return; }
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    el.setAttribute('aria-describedby', id + '-hint');
    h.textContent = msg ? '! ' + msg : '';
  }
  function msg(id, text) { var m = $(id); m.textContent = text; m.classList.toggle('hidden', !text); }
  function clearOnInput(ids, boxId) { ids.forEach(function (id) { $(id).addEventListener('input', function () { setErr(id, ''); if (boxId) msg(boxId, ''); }); }); }
  function pwToggle(ids) {
    $('toggle-pw').addEventListener('click', function () {
      var show = $(ids[0]).type === 'password';
      ids.forEach(function (i) { $(i).type = show ? 'text' : 'password'; });
      this.textContent = show ? 'Sembunyi' : 'Lihat'; this.setAttribute('aria-pressed', String(show));
    });
  }
  function badge(st) {
    var cls = ['bg-white text-black', 'bg-gray-100 text-black', 'bg-black text-white'][st.index], mark = ['●', '◐', '✓'][st.index];
    return '<span class="inline-flex items-center gap-2 border-2 border-black px-3 py-1 font-display text-[12px] font-semibold uppercase tracking-[0.08em] ' + cls + '"><span aria-hidden="true">' + mark + '</span>' + esc(st.label) + '</span>';
  }
  function pwField(id, label, ph, auto) {
    return '<div><label class="label" for="' + id + '">' + label + '</label><div class="pw-wrap relative">' +
      '<input class="field pr-[84px]" id="' + id + '" type="password" autocomplete="' + auto + '" placeholder="' + ph + '" />' +
      '<button type="button" id="toggle-pw" class="absolute right-0 top-0 h-[52px] px-4 font-display text-[12px] font-semibold uppercase tracking-[0.1em] hover:opacity-60" aria-pressed="false">Lihat</button></div>' +
      '<p class="hint" id="' + id + '-hint"></p></div>';
  }
  function textField(id, label, type, ph, auto, extra) {
    return '<div><label class="label" for="' + id + '">' + label + '</label><input class="field" id="' + id + '" type="' + type + '" autocomplete="' + auto + '" placeholder="' + ph + '" ' + (extra || '') + ' /><p class="hint" id="' + id + '-hint"></p></div>';
  }
  function receiptMock() {
    return '<div class="sr-float relative mt-10 hidden w-full max-w-[300px] self-start border-2 border-white bg-white p-5 text-black lg:block" aria-hidden="true">' +
      '<p class="font-display text-[11px] font-semibold uppercase tracking-[0.18em]">Struk checkout</p>' +
      '<div class="my-3 space-y-1 border-y-2 border-dashed border-black py-3 text-[13px]"><div class="flex justify-between"><span>Facial Wash Cushion</span><span>1×</span></div><div class="flex justify-between"><span>Moisturizer Blush</span><span>2×</span></div><div class="flex justify-between"><span>Lip Tint</span><span>1×</span></div></div>' +
      '<div class="flex items-end justify-between"><span class="text-[12px]">Total dibayar</span><span class="font-display text-[34px] font-bold leading-none">Rp 0</span></div>' +
      '<p class="mt-3 inline-block bg-black px-2 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-white">✓ Checkout berhasil</p></div>';
  }
  function marquee() {
    var t = '<span>Tanpa bayar</span><span>Tanpa kirim</span><span>Checkout sepuasnya</span><span>Cuma buat seru</span>';
    return '<div class="overflow-hidden border-y-2 border-black bg-white" aria-hidden="true"><div class="flex w-max animate-marquee motion-reduce:animate-none [&>span]:whitespace-nowrap [&>span]:px-7 [&>span]:py-[12px] [&>span]:font-display [&>span]:text-[13px] [&>span]:font-semibold [&>span]:uppercase [&>span]:tracking-[0.2em] [&>span]:after:ml-14 [&>span]:after:content-[\'✦\']">' + t + t + t + t + '</div></div>';
  }
  var rings = '<svg class="pointer-events-none absolute -right-[18%] top-[8%] aspect-square w-[78%] fill-none stroke-white stroke-[0.6] opacity-30" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="32"/><circle cx="50" cy="50" r="18"/><circle cx="50" cy="50" r="5" class="fill-white"/></svg>';
  function authShell(head, side, body) {
    return '<div class="grid lg:min-h-[calc(100vh-72px-48px)] lg:grid-cols-[1fr_1.1fr]">' +
      '<section class="relative flex flex-col overflow-hidden bg-black px-4 py-10 text-white lg:justify-between lg:px-12 lg:py-16">' + rings + '<div class="relative">' + head + '</div><div class="relative">' + side + receiptMock() + '</div></section>' +
      '<section class="dots flex items-center px-4 py-10 lg:px-12 lg:py-16"><div class="mx-auto w-full max-w-[460px] border-2 border-black bg-white p-6 hard sm:p-8">' + body +
      '<p class="mt-8 border-t border-gray-300 pt-5 text-[13px] text-gray-700">Data akun disimpan di browser ini saja dan tidak dikirim ke server mana pun.</p></div></section></div>' + marquee();
  }
  var stroke = 'outline-text';

  /* ---------- LOGIN ---------- */
  function viewLogin() {
    if (SR.currentUser()) return go('#/profil');
    mount(authShell(
      '<h1 class="text-[clamp(40px,6vw,84px)] uppercase leading-[0.95]">Masuk,<br>lalu belanja<br><span class="' + stroke + '">tanpa bayar.</span></h1>',
      '<p class="mt-6 max-w-[420px] text-[15px] text-gray-300 lg:mt-0">Semua pesanan di SEPHORREAL itu fiktif: tidak ada pembayaran, tidak ada uang yang dipotong, dan tidak ada barang yang dikirim. Akunmu hanya menyimpan riwayat checkout.</p>',
      '<h2 class="mb-2 text-[clamp(28px,4vw,40px)] uppercase">Masuk ke akun</h2>' +
      '<p class="mb-8 text-gray-700">Belum punya akun? <a class="border-b-2 border-black font-semibold hover:opacity-60" href="#/daftar">Daftar gratis</a></p>' +
      '<div id="form-error" role="alert" class="msg"></div>' +
      '<form id="f" novalidate class="space-y-5">' +
        textField('email', 'Email', 'email', 'nama@email.com', 'email', 'inputmode="email"') +
        pwField('password', 'Kata sandi', 'Masukkan kata sandi', 'current-password') +
        '<button class="btn btn-block" type="submit" id="submit-btn">Masuk</button></form>'
    ), 'Masuk');

    pwToggle(['password']); clearOnInput(['email', 'password'], 'form-error');
    $('f').addEventListener('submit', function (e) {
      e.preventDefault(); msg('form-error', '');
      var email = $('email').value.trim(), pw = $('password').value, first = null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('email', 'Masukkan email yang valid, contoh: nama@email.com.'); first = $('email'); } else setErr('email', '');
      if (!pw) { setErr('password', 'Kata sandi wajib diisi.'); first = first || $('password'); } else setErr('password', '');
      if (first) return first.focus();
      var b = $('submit-btn'); b.disabled = true; b.textContent = 'Memeriksa…';
      SR.login(email, pw).then(function (r) {
        if (r.ok) { var n = nextHash; nextHash = null; return go(n && n !== '#/login' && n !== '#/daftar' ? n : '#/profil'); }
        msg('form-error', r.error); b.disabled = false; b.textContent = 'Masuk'; $('password').focus();
      });
    });
  }

  /* ---------- DAFTAR ---------- */
  function viewRegister() {
    if (SR.currentUser()) return go('#/profil');
    mount(authShell(
      '<h1 class="text-[clamp(40px,6vw,84px)] uppercase leading-[0.95]">Satu akun,<br>semua<br><span class="' + stroke + '">checkout.</span></h1>',
      '<ul class="mt-6 max-w-[420px] space-y-3 text-[15px] text-gray-300 lg:mt-0">' +
        '<li class="border-t border-gray-700 pt-3">Riwayat checkout tersimpan dan bisa dilihat lagi kapan saja.</li>' +
        '<li class="border-t border-gray-700 pt-3">Pantau status pesanan fiktif dari Checkout Berhasil sampai Selesai.</li>' +
        '<li class="border-t border-gray-700 pt-3">Gratis, tanpa kartu, tanpa pembayaran.</li></ul>',
      '<h2 class="mb-2 text-[clamp(28px,4vw,40px)] uppercase">Buat akun</h2>' +
      '<p class="mb-8 text-gray-700">Sudah punya akun? <a class="border-b-2 border-black font-semibold hover:opacity-60" href="#/login">Masuk</a></p>' +
      '<div id="form-error" role="alert" class="msg"></div>' +
      '<form id="f" novalidate class="space-y-5">' +
        textField('name', 'Nama lengkap', 'text', 'Nama kamu', 'name', 'maxlength="60"') +
        textField('email', 'Email', 'email', 'nama@email.com', 'email', 'inputmode="email"') +
        pwField('password', 'Kata sandi', 'Minimal 6 karakter', 'new-password') +
        textField('confirm', 'Ulangi kata sandi', 'password', 'Ketik ulang kata sandi', 'new-password') +
        '<div><label class="flex cursor-pointer items-start gap-3 text-[14px]"><input id="agree" type="checkbox" class="mt-1 h-5 w-5 shrink-0 accent-black" />' +
          '<span>Saya paham SEPHORREAL adalah website belanja fiktif: tidak ada pembayaran dan tidak ada barang yang dikirim.</span></label>' +
          '<p class="mt-1.5 hidden text-[13px] font-medium" id="agree-hint"></p></div>' +
        '<button class="btn btn-block" type="submit" id="submit-btn">Daftar &amp; masuk</button></form>'
    ), 'Daftar');

    pwToggle(['password', 'confirm']); clearOnInput(['name', 'email', 'password', 'confirm'], 'form-error');
    $('agree').addEventListener('change', function () { setErr('agree', ''); });
    $('f').addEventListener('submit', function (e) {
      e.preventDefault(); msg('form-error', '');
      var name = $('name').value.trim(), email = $('email').value.trim(), pw = $('password').value, cf = $('confirm').value, first = null;
      function check(ok, id, m) { if (ok) setErr(id, ''); else { setErr(id, m); first = first || $(id); } }
      check(name.length >= 2, 'name', 'Nama minimal 2 karakter.');
      check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'email', 'Masukkan email yang valid, contoh: nama@email.com.');
      check(pw.length >= 6, 'password', 'Kata sandi minimal 6 karakter.');
      check(cf === pw && cf.length > 0, 'confirm', 'Kata sandi tidak sama. Ketik ulang dengan sama persis.');
      check($('agree').checked, 'agree', 'Centang pernyataan ini untuk melanjutkan.');
      if (first) return first.focus();
      var b = $('submit-btn'); b.disabled = true; b.textContent = 'Membuat akun…';
      SR.register({ name: name, email: email, password: pw }).then(function (r) {
        if (r.ok) { var n = nextHash; nextHash = null; return go(n && n !== '#/login' && n !== '#/daftar' ? n : '#/profil'); }
        if (r.field) { setErr(r.field, r.error); $(r.field).focus(); } else msg('form-error', r.error);
        b.disabled = false; b.textContent = 'Daftar & masuk';
      });
    });
  }

  /* ---------- PROFIL ---------- */
  function viewProfile() {
    var user = guard(); if (!user) return;
    var hero = '<section class="relative overflow-hidden bg-black text-white">' +
      '<svg class="pointer-events-none absolute -right-[6%] -top-[40%] aspect-square w-[420px] fill-none stroke-white stroke-[0.6] opacity-30" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="30"/><circle cx="50" cy="50" r="14"/></svg>' +
      '<div class="relative mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-4 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-5 lg:py-14">' +
        '<div class="flex items-center gap-5"><div class="rounded-full border-2 border-dashed border-white p-[6px]"><div id="avatar" class="grid h-[84px] w-[84px] shrink-0 place-items-center rounded-full bg-white font-display text-[30px] font-bold text-black" aria-hidden="true"></div></div>' +
        '<div class="min-w-0"><h1 id="p-name" class="break-words text-[clamp(30px,5.5vw,60px)] uppercase leading-[0.95]"></h1><p id="p-email" class="break-all text-gray-300"></p><p id="p-since" class="text-[13px] text-gray-400"></p></div></div>' +
        '<div class="flex flex-col gap-3 sm:flex-row"><a class="btn !border-white !bg-white !text-black hover:!bg-transparent hover:!text-white" href="#/riwayat">Riwayat checkout</a><button class="btn !border-white !bg-transparent !text-white hover:!bg-white hover:!text-black" type="button" id="logout-btn">Keluar</button></div></div></section>';
    mount(hero + wrap(
      '<section class="mb-12 grid border-2 border-black bg-white hard sm:grid-cols-3" aria-label="Ringkasan belanja fiktif">' +
        '<div class="border-b-2 border-black p-5 sm:border-b-0 sm:border-r-2"><p class="text-[13px] text-gray-700">Total pesanan</p><p id="s-count" class="font-display text-[36px] font-bold leading-none"></p></div>' +
        '<div class="border-b-2 border-black p-5 sm:border-b-0 sm:border-r-2"><p class="text-[13px] text-gray-700">Total belanja fiktif</p><p id="s-total" class="font-display text-[30px] font-bold leading-none sm:text-[36px]"></p></div>' +
        '<div class="p-5"><p class="text-[13px] text-gray-700">Pesanan selesai</p><p id="s-done" class="font-display text-[36px] font-bold leading-none"></p></div></section>' +
      '<div class="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16"><div class="space-y-12">' +
        '<section aria-labelledby="h-data" class="border-2 border-black bg-white p-6 hard sm:p-8"><h2 id="h-data" class="mb-5 text-[28px] uppercase">Data diri</h2><div id="profile-msg" role="status" class="msg"></div>' +
          '<form id="profile-form" novalidate class="space-y-5">' +
            textField('f-name', 'Nama lengkap', 'text', '', 'name', 'maxlength="60"') +
            '<div><label class="label" for="f-email">Email</label><input class="field bg-gray-50 text-gray-700" id="f-email" type="email" readonly aria-describedby="f-email-note" /><p class="mt-1.5 text-[13px] text-gray-700" id="f-email-note">Email dipakai untuk masuk dan tidak bisa diubah.</p></div>' +
            textField('f-phone', 'Nomor HP <span class="font-body normal-case tracking-normal text-gray-500">(opsional)</span>', 'tel', '08xxxxxxxxxx', 'tel', 'inputmode="tel" maxlength="16"') +
            '<div><label class="label" for="f-address">Alamat <span class="font-body normal-case tracking-normal text-gray-500">(opsional)</span></label><textarea class="field" id="f-address" autocomplete="street-address" maxlength="200" placeholder="Hanya untuk melengkapi tampilan pesanan. Tidak ada barang yang dikirim."></textarea></div>' +
            '<button class="btn" type="submit">Simpan perubahan</button></form></section>' +
        '<section aria-labelledby="h-pw" class="border-2 border-black bg-white p-6 hard sm:p-8"><h2 id="h-pw" class="mb-5 text-[28px] uppercase">Ganti kata sandi</h2><div id="pw-msg" role="status" class="msg"></div>' +
          '<form id="pw-form" novalidate class="space-y-5">' +
            textField('pw-old', 'Kata sandi lama', 'password', '', 'current-password') +
            textField('pw-new', 'Kata sandi baru', 'password', 'Minimal 6 karakter', 'new-password') +
            textField('pw-confirm', 'Ulangi kata sandi baru', 'password', '', 'new-password') +
            '<button class="btn btn-outline" type="submit">Perbarui kata sandi</button></form></section></div>' +
        '<section aria-labelledby="h-recent" class="lg:border-l-2 lg:border-black lg:pl-12"><div class="mb-5 flex items-end justify-between gap-4"><h2 id="h-recent" class="text-[28px] uppercase">Pesanan terakhir</h2><a class="link" href="#/riwayat">Lihat semua</a></div><div id="recent"></div></section></div>'
    ), 'Profil');

    function fill() {
      $('f-name').value = user.name; $('f-email').value = user.email; $('f-phone').value = user.phone; $('f-address').value = user.address;
    }
    function summary() {
      user = SR.currentUser(); if (!user) return go('#/login');
      var orders = SR.getOrders();
      $('avatar').textContent = SR.initials(user.name); $('p-name').textContent = user.name; $('p-email').textContent = user.email;
      $('p-since').textContent = 'Bergabung ' + SR.fmtDate(user.createdAt, false);
      $('s-count').textContent = orders.length;
      $('s-total').textContent = SR.rupiah(orders.reduce(function (s, o) { return s + o.total; }, 0));
      $('s-done').textContent = orders.filter(function (o) { return SR.statusOf(o).index === 2; }).length;
      $('recent').innerHTML = !orders.length
        ? '<div class="border-2 border-dashed border-black p-6"><p class="mb-1 font-display text-[20px] font-bold uppercase">Belum ada checkout</p><p class="mb-5 text-gray-700">Pilih produk, masukkan ke keranjang, lalu checkout. Pesanan fiktifmu akan muncul di sini.</p><a class="btn" href="' + shop + '">Mulai belanja</a></div>'
        : '<ul class="divide-y-2 divide-black border-y-2 border-black">' + orders.slice(0, 3).map(function (o) {
            var n = o.items.reduce(function (s, i) { return s + i.qty; }, 0);
            return '<li><a class="block py-4 hover:bg-gray-50" href="#/pesanan/' + encodeURIComponent(o.id) + '"><div class="mb-2 flex flex-wrap items-center justify-between gap-2"><span class="font-display text-[14px] font-semibold tracking-[0.04em]">' + esc(o.id) + '</span>' + badge(SR.statusOf(o)) + '</div><p class="text-[13px] text-gray-700">' + esc(SR.fmtDate(o.createdAt)) + ' · ' + n + ' barang</p><p class="font-display text-[18px] font-bold">' + esc(SR.rupiah(o.total)) + '</p></a></li>';
          }).join('') + '</ul>';
    }
    fill(); summary(); timer = setInterval(summary, 5000);

    clearOnInput(['f-name', 'f-phone'], 'profile-msg'); clearOnInput(['pw-old', 'pw-new', 'pw-confirm'], 'pw-msg');
    $('profile-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('f-name').value.trim(), phone = $('f-phone').value.trim(), first = null;
      if (name.length < 2) { setErr('f-name', 'Nama minimal 2 karakter.'); first = $('f-name'); } else setErr('f-name', '');
      if (phone && !/^[0-9+\-\s]{8,16}$/.test(phone)) { setErr('f-phone', 'Nomor HP hanya berisi angka, 8–16 digit.'); first = first || $('f-phone'); } else setErr('f-phone', '');
      if (first) return first.focus();
      var u = SR.updateProfile({ name: name, phone: phone, address: $('f-address').value });
      if (u) { user = u; summary(); fill(); msg('profile-msg', 'Perubahan tersimpan.'); } else msg('profile-msg', 'Perubahan gagal disimpan. Muat ulang halaman lalu coba lagi.');
    });
    $('pw-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var o = $('pw-old').value, n = $('pw-new').value, c = $('pw-confirm').value, first = null;
      function check(ok, id, m) { if (ok) setErr(id, ''); else { setErr(id, m); first = first || $(id); } }
      check(!!o, 'pw-old', 'Kata sandi lama wajib diisi.');
      check(n.length >= 6, 'pw-new', 'Kata sandi baru minimal 6 karakter.');
      check(c === n && c.length > 0, 'pw-confirm', 'Kata sandi tidak sama. Ketik ulang dengan sama persis.');
      if (first) return first.focus();
      SR.changePassword(o, n).then(function (r) {
        if (r.ok) { $('pw-form').reset(); msg('pw-msg', 'Kata sandi diperbarui.'); }
        else if (r.field) { setErr(r.field, r.error); $(r.field).focus(); } else msg('pw-msg', r.error);
      });
    });
    $('logout-btn').addEventListener('click', function () { SR.logout(); location.href = 'index.html'; });
  }

  /* ---------- RIWAYAT ---------- */
  function viewOrders() {
    if (!guard()) return;
    var filter = 'semua', lastSig = '', FILTERS = [{ key: 'semua', label: 'Semua' }].concat(SR.STATUS);
    var hero = '<section class="relative overflow-hidden bg-black text-white"><div class="relative mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between lg:px-5 lg:py-14">' +
      '<div><h1 class="text-[clamp(38px,7vw,88px)] uppercase leading-[0.92]">Riwayat<br><span class="outline-text">checkout</span></h1>' +
      '<p class="mt-4 max-w-[520px] text-gray-300">Semua barang yang pernah kamu “beli”. Semua pesanan fiktif: tidak ada pembayaran dan tidak ada pengiriman.</p></div>' +
      '<a class="btn !border-white !bg-white !text-black hover:!bg-transparent hover:!text-white" href="' + shop + '">Belanja lagi</a></div></section>';
    mount(hero + wrap(
      '<div id="tabs" role="tablist" aria-label="Filter status pesanan" class="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0"></div><div id="list" aria-live="polite"></div>'
    ), 'Riwayat Checkout');

    function card(o) {
      var st = SR.statusOf(o), qty = o.items.reduce(function (s, i) { return s + i.qty; }, 0);
      var tiles = o.items.slice(0, 3).map(function (i) { return '<span class="grid h-12 w-12 shrink-0 place-items-center border-2 border-black bg-gray-100 font-display text-[16px] font-bold" aria-hidden="true">' + esc(i.name.charAt(0).toUpperCase()) + '</span>'; }).join('');
      var more = o.items.length > 3 ? '<span class="grid h-12 w-12 shrink-0 place-items-center border-2 border-dashed border-black text-[13px] font-semibold" aria-hidden="true">+' + (o.items.length - 3) + '</span>' : '';
      var names = o.items.slice(0, 2).map(function (i) { return esc(i.name); }).join(', ') + (o.items.length > 2 ? ' dan ' + (o.items.length - 2) + ' lainnya' : '');
      return '<li><article class="lift border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"><header class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black bg-gray-50 px-4 py-3"><div><p class="font-display text-[15px] font-semibold tracking-[0.04em]">' + esc(o.id) + '</p><p class="text-[13px] text-gray-700">' + esc(SR.fmtDate(o.createdAt)) + '</p></div>' + badge(st) + '</header>' +
        '<div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div class="flex min-w-0 items-center gap-3"><div class="flex gap-2">' + tiles + more + '</div><p class="min-w-0 text-[14px] text-gray-700"><span class="block truncate font-medium text-black">' + names + '</span>' + qty + ' barang</p></div>' +
        '<div class="flex items-center justify-between gap-5 sm:justify-end"><div class="sm:text-right"><p class="text-[12px] text-gray-700">Total</p><p class="font-display text-[22px] font-bold leading-none">' + esc(SR.rupiah(o.total)) + '</p></div>' +
        '<a class="btn btn-outline !w-auto" href="#/pesanan/' + encodeURIComponent(o.id) + '">Lihat detail</a></div></div></article></li>';
    }
    function draw(force) {
      var orders = SR.getOrders();
      var sig = filter + '|' + orders.map(function (o) { return o.id + ':' + SR.statusOf(o).index; }).join(',');
      if (!force && sig === lastSig) return; lastSig = sig;
      var counts = { semua: orders.length, berhasil: 0, diproses: 0, selesai: 0 };
      orders.forEach(function (o) { counts[SR.statusOf(o).key]++; });
      $('tabs').hidden = !orders.length;
      $('tabs').innerHTML = FILTERS.map(function (f) { return '<button type="button" role="tab" class="tab" data-filter="' + f.key + '" aria-selected="' + (f.key === filter) + '">' + esc(f.label) + '<span class="opacity-70">' + counts[f.key] + '</span></button>'; }).join('');
      var list = $('list');
      if (!orders.length) {
        list.innerHTML = '<div class="border-2 border-dashed border-black px-6 py-14 text-center"><svg class="mx-auto mb-5 h-16 w-16 fill-none stroke-black stroke-[1.5]" viewBox="0 0 100 100" aria-hidden="true"><path d="M30 20h40l6 70H24l6-70Z"/><path d="M38 20v-8h24v8"/><path d="M40 55h20" stroke-dasharray="3 4"/></svg>' +
          '<h2 class="mb-2 text-[28px] uppercase">Belum ada checkout</h2><p class="mx-auto mb-7 max-w-[420px] text-gray-700">Riwayatmu masih kosong. Pilih produk, masukkan ke keranjang, lalu checkout. Tidak perlu bayar.</p>' +
          '<div class="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"><a class="btn" href="' + shop + '">Mulai belanja</a><button type="button" id="seed-btn" class="btn btn-outline">Coba pesanan contoh</button></div></div>';
        return;
      }
      var shown = filter === 'semua' ? orders : orders.filter(function (o) { return SR.statusOf(o).key === filter; });
      if (!shown.length) {
        var lb = FILTERS.filter(function (x) { return x.key === filter; })[0].label;
        list.innerHTML = '<div class="border-2 border-dashed border-black px-6 py-12 text-center"><h2 class="mb-2 text-[24px] uppercase">Tidak ada pesanan “' + esc(lb) + '”</h2><p class="mx-auto mb-6 max-w-[420px] text-gray-700">Status pesanan berubah otomatis seiring waktu. Cek lagi sebentar, atau lihat semua pesanan.</p><button type="button" data-filter="semua" class="btn btn-outline">Tampilkan semua</button></div>';
        return;
      }
      list.innerHTML = '<ul class="space-y-4">' + shown.map(card).join('') + '</ul>';
    }
    view.onclick = function (e) {
      var t = e.target.closest('[data-filter]');
      if (t) { filter = t.getAttribute('data-filter'); draw(true); var a = view.querySelector('.tab[aria-selected="true"]'); if (a) a.focus(); return; }
      if (e.target.closest('#seed-btn')) { var o = SR.seedDemo(); if (o) go('#/pesanan/' + encodeURIComponent(o.id) + '/baru'); }
    };
    draw(true); timer = setInterval(draw, 5000);
  }

  /* ---------- DETAIL PESANAN ---------- */
  function viewOrder(id, isNew) {
    if (!guard()) return;
    mount(wrap('<a href="#/riwayat" class="mb-6 inline-block border-b-2 border-black pb-[2px] font-display text-[13px] font-semibold uppercase tracking-[0.12em] hover:opacity-60">Kembali ke riwayat</a><div id="content"></div>'), 'Detail Pesanan');
    var lastIdx = -1, burst = isNew;
    function barcode(t) {
      var x = 0, bars = '';
      for (var i = 0; i < 44; i++) { var c = t.charCodeAt(i % t.length) + i * 7, w = 1 + (c % 3); if (i % 2 === 0) bars += '<rect x="' + x + '" y="0" width="' + w + '" height="40"/>'; x += w + 1; }
      return '<svg viewBox="0 0 ' + x + ' 40" preserveAspectRatio="none" class="h-12 w-full fill-black">' + bars + '</svg>';
    }
    function confetti() {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var box = document.createElement('div'); box.setAttribute('aria-hidden', 'true');
      box.className = 'pointer-events-none fixed inset-0 z-50 overflow-hidden';
      for (var i = 0; i < 46; i++) {
        var p = document.createElement('span'), sz = 6 + Math.random() * 10, dark = i % 3 !== 0;
        p.style.cssText = 'position:absolute;top:0;left:' + Math.random() * 100 + '%;width:' + sz + 'px;height:' + (i % 2 ? sz : sz * 2.2) + 'px;background:' + (dark ? '#000' : '#fff') + ';border:2px solid #000;border-radius:' + (i % 4 === 0 ? '50%' : '0') + ';animation:sr-fall ' + (2.2 + Math.random() * 2.2) + 's ' + Math.random() * 0.8 + 's cubic-bezier(.3,.6,.4,1) both';
        box.appendChild(p);
      }
      document.body.appendChild(box); setTimeout(function () { box.remove(); }, 5200);
    }

    function timeline(o, st) {
      var times = SR.stepTimes(o);
      return '<ol>' + SR.STATUS.map(function (s, i) {
        var done = i < st.index, cur = i === st.index, last = i === SR.STATUS.length - 1;
        var mk = cur ? 'bg-black text-white ring-2 ring-black ring-offset-2' : done ? 'bg-black text-white' : 'border-2 border-dashed border-black bg-white text-black';
        return '<li class="relative flex gap-4 ' + (last ? '' : 'pb-8') + '"' + (cur ? ' aria-current="step"' : '') + '>' +
          (last ? '' : '<span class="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0 border-l-2 border-black ' + (done ? '' : 'border-dashed') + '" aria-hidden="true"></span>') +
          '<span class="relative grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-[13px] font-bold ' + mk + '" aria-hidden="true">' + (done ? '✓' : i + 1) + '</span>' +
          '<div class="min-w-0 pt-[2px]"><p class="font-display text-[16px] font-bold uppercase leading-tight">' + esc(s.label) + (cur ? ' <span class="ml-1 font-body text-[12px] font-semibold normal-case tracking-normal">(status saat ini)</span>' : '') + '</p>' +
          '<p class="text-[14px] text-gray-700">' + esc(s.desc) + '</p><p class="text-[13px] text-gray-500">' + (i <= st.index ? esc(SR.fmtDate(times[i])) : 'Menunggu') + '</p></div></li>';
      }).join('') + '</ol>';
    }
    function draw() {
      var o = SR.getOrder(id);
      if (!o) {
        $('content').innerHTML = '<div class="border-2 border-dashed border-black px-6 py-14 text-center"><h1 class="mb-2 text-[clamp(28px,5vw,44px)] uppercase">Pesanan tidak ditemukan</h1><p class="mx-auto mb-7 max-w-[440px] text-gray-700">Nomor pesanan ini tidak ada di akunmu. Periksa tautannya, atau buka daftar riwayat untuk memilih pesanan.</p><a class="btn" href="#/riwayat">Buka riwayat checkout</a></div>';
        return;
      }
      var st = SR.statusOf(o); if (st.index === lastIdx) return; lastIdx = st.index;
      document.title = 'Pesanan ' + o.id + ' · SEPHORREAL';
      var qty = o.items.reduce(function (s, i) { return s + i.qty; }, 0), r = o.recipient || {};
      var banner = isNew ? '<div class="sr-pop mb-8 border-2 border-black bg-black p-5 text-white shadow-[6px_6px_0_0_#9ca3af] sm:p-7" role="status"><p class="mb-2 font-display text-[clamp(32px,6vw,64px)] font-bold uppercase leading-[0.95]">Checkout <span class="outline-text">berhasil!</span></p><p class="max-w-[560px] text-[15px] text-gray-300">Pesananmu sudah tercatat. Tidak ada uang yang dipotong dan tidak ada barang yang dikirim. Nikmati rasanya!</p></div>' : '';
      var items = o.items.map(function (i) {
        return '<li class="flex items-start gap-4 py-4"><span class="grid h-14 w-14 shrink-0 place-items-center border-2 border-black bg-gray-100 font-display text-[18px] font-bold" aria-hidden="true">' + esc(i.name.charAt(0).toUpperCase()) + '</span>' +
          '<div class="min-w-0 flex-1"><p class="font-medium">' + esc(i.name) + '</p><p class="text-[13px] text-gray-700">' + (i.category ? esc(i.category) + ' · ' : '') + i.qty + ' × ' + esc(SR.rupiah(i.price)) + '</p></div>' +
          '<p class="shrink-0 font-display text-[16px] font-bold">' + esc(SR.rupiah(i.price * i.qty)) + '</p></li>';
      }).join('');
      $('content').innerHTML = banner +
        '<header class="mb-10 flex flex-col gap-4 border-b-2 border-black pb-8 sm:flex-row sm:items-end sm:justify-between"><div class="min-w-0"><p class="text-[13px] text-gray-700">Nomor pesanan</p><h1 class="break-all text-[clamp(28px,5vw,52px)] uppercase">' + esc(o.id) + '</h1><p class="text-gray-700">' + esc(SR.fmtDate(o.createdAt)) + ' · ' + qty + ' barang</p></div><div>' + badge(st) + '</div></header>' +
        '<div class="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14"><div class="space-y-10">' +
          '<section aria-labelledby="h-items" class="border-2 border-black bg-white p-5 hard sm:p-7"><h2 id="h-items" class="mb-2 text-[26px] uppercase">Barang</h2><ul class="divide-y-2 divide-dashed divide-black border-y-2 border-dashed border-black">' + items + '</ul></section>' +
          '<section class="grid gap-8 sm:grid-cols-2"><div><h2 class="mb-2 text-[22px] uppercase">Penerima</h2><p class="font-medium">' + esc(r.name || '-') + '</p><p class="text-gray-700">' + (r.phone ? esc(r.phone) : '<span class="text-gray-500">Nomor HP belum diisi</span>') + '</p><p class="text-gray-700">' + (r.address ? esc(r.address) : '<span class="text-gray-500">Alamat belum diisi</span>') + '</p></div>' +
          '<div><h2 class="mb-2 text-[22px] uppercase">Pembayaran</h2><p class="font-medium">Simulasi</p><p class="text-gray-700">Tidak ada pembayaran dan tidak ada uang yang dipotong.</p></div></section></div>' +
        '<aside class="space-y-10 lg:border-l-2 lg:border-black lg:pl-12">' +
          '<section aria-labelledby="h-status"><h2 id="h-status" class="mb-5 text-[26px] uppercase">Status pesanan</h2>' + timeline(o, st) + '<p class="mt-6 border-t border-gray-300 pt-4 text-[13px] text-gray-700">Status berubah otomatis dan hanya simulasi. Tidak menunjukkan pengiriman yang sebenarnya.</p></section>' +
          '<section aria-labelledby="h-sum"><h2 id="h-sum" class="mb-3 text-[26px] uppercase">Ringkasan</h2><dl class="space-y-2 border-y-2 border-black py-4"><div class="flex justify-between"><dt class="text-gray-700">Subtotal</dt><dd>' + esc(SR.rupiah(o.subtotal)) + '</dd></div><div class="flex justify-between"><dt class="text-gray-700">Ongkos kirim</dt><dd>Gratis</dd></div></dl>' +
          '<div class="flex items-baseline justify-between pt-4"><span class="font-display text-[14px] font-semibold uppercase tracking-[0.1em]">Total belanja</span><span class="font-display text-[28px] font-bold">' + esc(SR.rupiah(o.total)) + '</span></div>' +
          '<div class="mt-3 flex items-center justify-between border-2 border-black bg-black px-4 py-3 text-white"><span class="font-display text-[12px] font-semibold uppercase tracking-[0.12em]">Total dibayar</span><span class="font-display text-[24px] font-bold leading-none">Rp 0</span></div>' +
          '<div class="mt-6" aria-hidden="true">' + barcode(o.id) + '<p class="mt-1 text-center font-display text-[11px] tracking-[0.3em] text-gray-500">' + esc(o.id) + '</p></div></section>' +
          '<div class="flex flex-col gap-3"><a class="btn btn-block" href="' + shop + '">Belanja lagi</a><a class="btn btn-outline btn-block" href="#/riwayat">Semua riwayat</a></div></aside></div>';
    }
    draw(); if (burst) { confetti(); burst = false; }
    timer = setInterval(draw, 5000);
  }

  /* ---------- ROUTER ---------- */
  function route() {
    view.onclick = null;
    var p = location.hash.replace(/^#\/?/, '').split('/'), name = p[0], arg = decodeURIComponent(p[1] || '');
    var ft = document.getElementById('site-footer');
    if (ft) ft.style.display = (name === 'login' || name === 'daftar' || name === 'profil') ? 'none' : '';
    if (name === 'login') return viewLogin();
    if (name === 'login') return viewLogin();
    if (name === 'daftar') return viewRegister();
    if (name === 'profil') return viewProfile();
    if (name === 'riwayat') return viewOrders();
    if (name === 'pesanan' && arg) return viewOrder(arg, p[2] === 'baru');
    go(SR.currentUser() ? '#/profil' : '#/login');
  }
  window.addEventListener('load', function () {
    var hd = $('site-header'), ft = $('site-footer');
    if (hd && !hd.children.length) hd.innerHTML = '<header class="border-b-2 border-black bg-white"><div class="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between px-4 lg:px-5"><a href="index.html" class="font-display text-[22px] font-bold uppercase tracking-[-0.02em]">SEPHORREAL</a><nav class="flex items-center gap-5 font-display text-[12px] font-semibold uppercase tracking-[0.12em]"><a class="hover:opacity-60" href="' + shop + '">Belanja</a><a class="hover:opacity-60" href="#/riwayat">Riwayat</a><a class="hover:opacity-60" href="#/profil">Akun</a></nav></div></header>';
    if (ft && !ft.children.length) ft.innerHTML = '<footer class="border-t-2 border-black bg-black px-4 py-8 text-center text-[13px] text-gray-300">SEPHORREAL · website belanja fiktif. Tidak ada pembayaran, tidak ada pengiriman.</footer>';
  });
  window.addEventListener('hashchange', route);
  route();
})();