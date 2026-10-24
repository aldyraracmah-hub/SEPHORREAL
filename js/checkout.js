(() => {
  'use strict';
  const SELECTION_KEY = 'sephorreal_checkout_selection';
  const CART_KEY = 'sephora_cart';
  const ORDERS_KEY = 'sephorreal_orders';
  const $ = id => document.getElementById(id);
  const rupiah = value => 'Rp' + Math.round(Number(value) || 0).toLocaleString('id-ID');
  const products = Array.isArray(window.PRODUK) ? window.PRODUK : [];
  let selection = [];
  let total = 0;

  try { selection = JSON.parse(sessionStorage.getItem(SELECTION_KEY) || '[]'); } catch (_) { selection = []; }
  if (!Array.isArray(selection)) selection = [];

  // Cocokkan data pilihan dengan data produk utama agar harga memakai harga terbaru.
  const items = selection.map(item => {
    const product = products.find(p => p.id === item.id && (!item.nama || p.nama === item.nama));
    const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
    const price = product ? Math.round(product.harga * (1 - (product.diskon || 0) / 100)) : Math.max(0, Number(item.harga) || 0);
    return { id: item.id, nama: product?.nama || item.nama || 'Produk', merek: product?.merek || item.merek || '', gambar: product?.gambar || item.gambar || '', qty, harga: price, subtotal: price * qty };
  }).filter(item => item.qty > 0);

  const list = $('checkout-list');
  if (!items.length) {
    $('checkout-content').classList.add('hidden');
    $('empty-state').classList.remove('hidden');
  } else {
    total = items.reduce((sum, item) => sum + item.subtotal, 0);
    $('item-count').textContent = `${items.reduce((sum, item) => sum + item.qty, 0)} item`;
    $('subtotal').textContent = rupiah(total);
    $('grand-total').textContent = rupiah(total);
    items.forEach(item => {
      const row = document.createElement('article'); row.className = 'product-row';
      const img = document.createElement('img');
      if (item.gambar) img.src = '../' + item.gambar.replace(/^\.\//, '');
      img.alt = item.nama; img.onerror = () => { img.style.display = 'none'; };
      const info = document.createElement('div');
      const name = document.createElement('p'); name.className = 'text-sm font-bold leading-5'; name.textContent = item.nama;
      const brand = document.createElement('p'); brand.className = 'mt-1 text-xs text-gray-500'; brand.textContent = item.merek;
      const qty = document.createElement('p'); qty.className = 'mt-2 text-xs text-[#a04468]'; qty.textContent = `Jumlah: ${item.qty}`;
      info.append(name, brand, qty);
      const price = document.createElement('strong'); price.className = 'text-sm whitespace-nowrap'; price.textContent = rupiah(item.subtotal);
      row.append(img, info, price); list.append(row);
    });
  }

  $('confirm-checkout').addEventListener('click', () => {
    if (!items.length) return;
    const button = $('confirm-checkout');

    // [RIWAYAT] Harus punya akun dulu. Belum login -> arahkan ke halaman masuk/daftar,
    // lalu setelah masuk kembali ke halaman checkout ini (pilihan barang tetap tersimpan).
    if (window.SRSave && !SRSave.isLoggedIn()) {
      alert('Daftar atau masuk dulu untuk checkout, supaya pesananmu tercatat di riwayat.');
      try { sessionStorage.setItem('sr_return', 'pages/' + location.pathname.split('/').pop()); } catch (_) {}
      window.location.href = SRSave.loginUrl;
      return;
    }

    if (!window.confirm(`Konfirmasi pesanan simulasi sebanyak ${items.reduce((n, i) => n + i.qty, 0)} item dengan total ${rupiah(total)}?\n\nTidak ada pembayaran sungguhan.`)) return;

    const now = new Date();
    const orderNumber = 'SPR-' + now.getFullYear().toString().slice(-2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    const order = { orderNumber, tanggal: now.toISOString(), items: items.map(({id,nama,merek,qty,harga,subtotal,gambar}) => ({id,nama,merek,qty,harga,subtotal,gambar})), total, status: 'Simulasi berhasil', simulasi: true };
    try {
      const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      localStorage.setItem(ORDERS_KEY, JSON.stringify([order, ...(Array.isArray(orders) ? orders : [])]));

      // [RIWAYAT] Simpan juga ke riwayat checkout akun (nomor pesanan sama dengan yang tampil di popup).
      if (window.SRSave) {
        SRSave.save(
          items.map(i => ({ id: i.id, name: i.nama, category: i.merek, price: i.harga, qty: i.qty })),
          { id: orderNumber }
        );
      }

      // Hapus hanya produk yang dipilih untuk checkout; produk lain di cart tetap tersimpan.
      const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (Array.isArray(cart)) {
        const selectedIds = new Map(items.map(item => [String(item.id), item.qty]));
        const remaining = [];
        cart.forEach(cartItem => {
          const id = String(cartItem.id);
          if (selectedIds.has(id)) {
            const removeQty = selectedIds.get(id);
            const cartQty = Math.max(1, Number(cartItem.qty) || 1);
            if (cartQty > removeQty) { cartItem.qty = cartQty - removeQty; remaining.push(cartItem); }
            selectedIds.delete(id);
          } else remaining.push(cartItem);
        });
        localStorage.setItem(CART_KEY, JSON.stringify(remaining));
      }
      sessionStorage.removeItem(SELECTION_KEY);
    } catch (error) {
      console.error('Pesanan simulasi tidak dapat disimpan:', error);
      alert('Pesanan tidak dapat disimpan di browser. Periksa pengaturan penyimpanan browser lalu coba lagi.');
      return;
    }
    $('order-number').textContent = orderNumber;
    $('success-total').textContent = rupiah(total);
    $('success-count').textContent = items.reduce((n, item) => n + item.qty, 0);
    $('success-overlay').classList.add('show');
    document.body.style.overflow = 'hidden';
    button.disabled = true;
    celebrate();
  });

  function celebrate() {
    const colors = ['#e9a9c4', '#c76b91', '#f5d9e5', '#d6a8bc', '#f4c65e'];
    for (let i = 0; i < 65; i++) {
      const bit = document.createElement('i'); bit.className = 'confetti';
      bit.style.left = Math.random() * 100 + 'vw'; bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 1.2) + 's'; bit.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.append(bit); setTimeout(() => bit.remove(), 4300);
    }
  }

  // [RIWAYAT] Tombol "Selesai" membuka riwayat checkout (cadangan: beranda bila simpan-pesanan.js belum dimuat).
  $('finish-button').addEventListener('click', () => { window.location.href = window.SRSave ? SRSave.historyUrl : '../index.html'; });

  $('success-overlay').addEventListener('click', event => { if (event.target === $('success-overlay')) { $('success-overlay').classList.remove('show'); document.body.style.overflow = ''; } });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('success-overlay').classList.contains('show')) { $('success-overlay').classList.remove('show'); document.body.style.overflow = ''; } });
})();
