(function (w) {
  'use strict';
  var s = document.currentScript;
  var ROOT = (s && s.dataset.root) || '../';
  var K = { users: 'sr_users', session: 'sr_session', orders: 'sr_orders' };

  function read(k, f) { try { var v = JSON.parse(w.localStorage.getItem(k)); return v == null ? f : v; } catch (e) { return f; } }
  function write(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function user() {
    var id = read(K.session, null);
    return id ? (read(K.users, []).filter(function (u) { return u.id === id; })[0] || null) : null;
  }
  function genId(ts) {
    var d = new Date(ts), p = function (n) { return ('0' + n).slice(-2); };
    return 'SPR-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function save(items, info) {
    var u = user(); if (!u) return null;
    info = info || {};
    var clean = (items || []).map(function (i) {
      return { id: String(i.id || 'produk'), name: String(i.name || 'Produk'), category: String(i.category || ''),
        price: Math.max(0, Number(i.price) || 0), qty: Math.max(1, parseInt(i.qty, 10) || 1) };
    });
    if (!clean.length) return null;
    var list = read(K.orders, []);
    var id = info.id ? String(info.id) : genId(Date.now());
    var dup = list.filter(function (o) { return o.id === id && o.userId === u.id; })[0];
    if (dup) return dup; // cegah tersimpan dua kali
    var sub = clean.reduce(function (t, i) { return t + i.price * i.qty; }, 0);
    var o = { id: id, userId: u.id, createdAt: Date.now(), items: clean,
      recipient: { name: info.name || u.name, phone: info.phone || u.phone || '', address: info.address || u.address || '' },
      subtotal: sub, shipping: 0, total: sub };
    list.push(o);
    return write(K.orders, list) ? o : null;
  }

  w.SRSave = {
    isLoggedIn: function () { return !!user(); },
    save: save,
    loginUrl: ROOT + 'akun.html#/login',
    historyUrl: ROOT + 'akun.html#/riwayat'
  };
})(window);