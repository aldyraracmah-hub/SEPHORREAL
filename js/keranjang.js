
(() => {
    'use strict';

    // ==========================================
    // 1. KONFIGURASI DAN DATA KERANJANG
    // ==========================================

    const KEY = 'sephora_cart';

    const $ = id => document.getElementById(id);

    const money = n =>
        'Rp' + Math.round(n).toLocaleString('id-ID');

    // ID lama pada katalog ada yang berulang;
    // cocokkan juga nama untuk menghindari produk tertukar.
    const catalog = window.PRODUK || [];

    const lookup = item =>
        catalog.find(p => p.id === item.id && p.nama === item.nama) ||
        catalog.find(p =>
            p.id === item.id &&
            p.merek === item.merek &&
            p.harga === item.harga
        ) ||
        catalog.find(p => p.id === item.id && p.nama === item.nama) ||
        catalog.find(p => p.id === item.id);

    const key = item => item.id + '::' + item.nama;

    let cart = [];

    // Mengambil data keranjang dari LocalStorage
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) || '[]');

        cart = Array.isArray(raw)
            ? raw
                .filter(i =>
                    i &&
                    typeof i.id === 'string' &&
                    typeof i.nama === 'string'
                )
                .map(i => ({
                    ...i,
                    qty: Math.max(1, Math.floor(Number(i.qty) || 1))
                }))
            : [];

    } catch {}


    // ==========================================
    // 2. MIGRASI DATA KERANJANG LAMA
    // ==========================================

    // ID duplikat dicocokkan dengan nama dan merek.
    cart = cart.map(item => {

        const match =
            catalog.find(p =>
                p.nama === item.nama &&
                p.merek === item.merek
            ) ||
            catalog.find(p =>
                p.id === item.id &&
                p.nama === item.nama
            );

        return match
            ? { ...item, id: match.id }
            : item;

    });

    let selected = new Set(cart.map(key));


    // ==========================================
    // 3. FUNGSI BANTUAN
    // ==========================================

    // Menghitung harga setelah diskon
    const price = p =>
        Math.round(p.harga * (1 - (p.diskon || 0) / 100));

    // Menyimpan data keranjang
    const save = () => {

        localStorage.setItem(KEY, JSON.stringify(cart));

        document.querySelectorAll('[data-cart-count]').forEach(el => {

            el.textContent = cart.reduce(
                (a, i) => a + i.qty,
                0
            );

        });

    };

    // Menampilkan pesan notifikasi
    const notice = s => {
        $('cart-message').textContent = s;
    };

    // Mengambil lokasi gambar produk
    const image = p =>
        p ? '../' + encodeURI(p.gambar) : '';


    // Mencegah karakter HTML terbaca sebagai kode
    function escapeHTML(v) {

        return String(v ?? '').replace(
            /[&<>"']/g,
            c => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[c])
        );

    }


    // ==========================================
    // 4. MENAMPILKAN ISI KERANJANG
    // ==========================================

    function render() {

        selected = new Set(
            [...selected].filter(k =>
                cart.some(i => key(i) === k)
            )
        );

        const count = cart.reduce(
            (n, i) => n + i.qty,
            0
        );

        $('heading-count').textContent = `(${count})`;

        // Mengatur tampilan ketika keranjang kosong
        $('cart-toolbar').classList.toggle(
            'hidden',
            !cart.length
        );

        $('empty-cart').classList.toggle(
            'hidden',
            !!cart.length
        );

        $('recommendations').classList.toggle(
            'hidden',
            !catalog.length
        );


        // ======================================
        // MENAMPILKAN SETIAP PRODUK
        // ======================================

        $('cart-items').innerHTML = cart.map((i, index) => {

            const p = lookup(i);

            const unit = p
                ? price(p)
                : Math.max(0, Number(i.harga) || 0);

            const original = p ? p.harga : unit;

            const stock = p ? Math.max(0, p.stok) : 99;

            const checked = selected.has(key(i));

            return `
                <article
                    class="flex gap-3 border-b border-gray-200 py-6 sm:gap-5"
                    data-index="${index}"
                >

                    <!-- Checkbox Pilih Produk -->
                    <input
                        aria-label="Pilih ${escapeHTML(i.nama)}"
                        data-action="select"
                        type="checkbox"
                        ${checked ? 'checked' : ''}
                        class="mt-2 h-4 w-4 shrink-0"
                    >

                    <!-- Gambar Produk -->
                    <div class="h-28 w-24 shrink-0 bg-gray-50 sm:h-36 sm:w-32">

                        ${p ? `
                            <img
                                src="${image(p)}"
                                alt="${escapeHTML(i.nama)}"
                                class="h-full w-full object-contain"
                                loading="lazy"
                            >
                        ` : ''}

                    </div>


                    <!-- Informasi Produk -->
                    <div class="min-w-0 flex-1">

                        <div class="flex justify-between gap-3">

                            <div>

                                <!-- Merek Produk -->
                                <p class="text-[11px] font-bold uppercase tracking-[.15em] text-gray-500">
                                    ${escapeHTML(i.merek || p?.merek || '')}
                                </p>

                                <!-- Nama Produk -->
                                <h3 class="mt-1 text-sm font-bold sm:text-base">
                                    ${escapeHTML(i.nama)}
                                </h3>

                                <!-- Label Diskon -->
                                ${p?.diskon ? `
                                    <span class="mt-2 inline-block bg-black px-2 py-1 text-[10px] font-bold text-white">
                                        -${p.diskon}%
                                    </span>
                                ` : ''}

                                <!-- Informasi Stok -->
                                <p class="mt-2 text-xs ${stock <= 5 ? 'text-red-600' : 'text-gray-500'}">

                                    ${
                                        stock === 0
                                            ? 'Stok habis'
                                            : stock <= 5
                                                ? `Sisa ${stock} stok`
                                                : 'Tersedia'
                                    }

                                </p>

                            </div>


                            <!-- Tombol Hapus Produk -->
                            <button
                                data-action="remove"
                                aria-label="Hapus ${escapeHTML(i.nama)}"
                                title="Hapus produk"
                                class="h-8 shrink-0 text-xl text-gray-500 hover:text-black"
                            >
                                ×
                            </button>

                        </div>


                        <!-- Harga dan Jumlah Produk -->
                        <div class="mt-4 flex flex-wrap items-end justify-between gap-3">

                            <div>

                                <!-- Harga Setelah Diskon -->
                                <strong class="text-sm">
                                    ${money(unit)}
                                </strong>

                                <!-- Harga Sebelum Diskon -->
                                ${original > unit ? `
                                    <span class="ml-2 text-xs text-gray-400 line-through">
                                        ${money(original)}
                                    </span>
                                ` : ''}

                                <!-- Subtotal Per Produk -->
                                <p class="mt-1 text-xs text-gray-500">

                                    Subtotal:

                                    <strong class="text-black">
                                        ${money(unit * i.qty)}
                                    </strong>

                                </p>

                            </div>


                            <!-- Tombol Tambah dan Kurang Jumlah -->
                            <div class="flex h-10 items-center border border-gray-300">

                                <!-- Kurang -->
                                <button
                                    class="qty-btn h-full w-9 text-lg"
                                    data-action="minus"
                                    ${i.qty <= 1 ? 'disabled' : ''}
                                    aria-label="Kurangi ${escapeHTML(i.nama)}"
                                >
                                    −
                                </button>

                                <!-- Jumlah -->
                                <span class="w-9 text-center text-sm font-semibold">
                                    ${i.qty}
                                </span>

                                <!-- Tambah -->
                                <button
                                    class="qty-btn h-full w-9 text-lg"
                                    data-action="plus"
                                    ${i.qty >= stock ? 'disabled' : ''}
                                    aria-label="Tambah ${escapeHTML(i.nama)}"
                                >
                                    +
                                </button>

                            </div>

                        </div>

                    </div>

                </article>
            `;

        }).join('');


        // ======================================
        // 5. PERHITUNGAN RINGKASAN BELANJA
        // ======================================

        const chosen = cart.filter(i =>
            selected.has(key(i))
        );

        const qty = chosen.reduce(
            (n, i) => n + i.qty,
            0
        );

        // Menghitung subtotal
        const subtotal = chosen.reduce((n, i) => {

            const p = lookup(i);

            return n + (
                p ? price(p) : Number(i.harga) || 0
            ) * i.qty;

        }, 0);


        // Menghitung total penghematan diskon
        const savings = chosen.reduce((n, i) => {

            const p = lookup(i);

            return n + (
                p
                    ? Math.max(0, p.harga - price(p)) * i.qty
                    : 0
            );

        }, 0);


        // ======================================
        // 6. MEMPERBARUI TAMPILAN RINGKASAN
        // ======================================

        $('selected-count').textContent =
            `(${chosen.length}/${cart.length})`;

        $('select-all').checked =
            !!cart.length && chosen.length === cart.length;

        $('select-all').indeterminate =
            chosen.length > 0 && chosen.length < cart.length;

        $('delete-selected').disabled = !chosen.length;

        $('summary-count').textContent = qty;

        $('subtotal').textContent = money(subtotal);

        $('savings').textContent = '-' + money(savings);

        $('total').textContent = money(subtotal);

        $('checkout-count').textContent = qty;

        // Checkout tidak aktif jika tidak ada produk
        // atau jumlah produk melebihi stok.
        $('checkout').disabled =
            !qty ||
            chosen.some(i => {

                const p = lookup(i);

                return p && i.qty > p.stok;

            });

        save();

        renderSuggestions();

    }


    // ==========================================
    // 7. REKOMENDASI PRODUK
    // ==========================================

    function renderSuggestions() {

        const existing = new Set(cart.map(key));

        $('suggestions').innerHTML = catalog
            .filter(p =>
                p.stok > 0 &&
                !existing.has(key(p))
            )
            .slice(0, 4)
            .map(p => `

                <article class="border border-gray-200 p-3">

                    <!-- Gambar Produk -->
                    <img
                        src="${image(p)}"
                        alt="${escapeHTML(p.nama)}"
                        loading="lazy"
                        class="mb-3 aspect-square w-full bg-gray-50 object-contain"
                    >

                    <!-- Merek -->
                    <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        ${escapeHTML(p.merek)}
                    </p>

                    <!-- Nama Produk -->
                    <h3 class="mt-1 min-h-10 text-sm font-semibold">
                        ${escapeHTML(p.nama)}
                    </h3>

                    <!-- Harga Produk -->
                    <p class="my-3 text-sm font-bold">
                        ${money(price(p))}
                    </p>

                    <!-- Tombol Tambah ke Keranjang -->
                    <button
                        data-add="${catalog.indexOf(p)}"
                        class="w-full border border-black px-2 py-3 text-[11px] font-bold uppercase hover:bg-black hover:text-white"
                    >
                        + Tambah
                    </button>

                </article>

            `).join('');

    }


    // ==========================================
    // 8. FITUR TAMBAH, KURANG, DAN HAPUS PRODUK
    // ==========================================

    $('cart-items').addEventListener('click', e => {

        const b = e.target.closest('[data-action]');

        if (!b || b.dataset.action === 'select') return;

        const index = Number(
            b.closest('[data-index]').dataset.index
        );

        const i = cart[index];

        const p = lookup(i);

        if (!i) return;

        switch (b.dataset.action) {

            // Menambah jumlah produk
            case 'plus':

                if (i.qty < (p?.stok ?? 99)) {
                    i.qty++;
                } else {
                    notice('Jumlah sudah mencapai batas stok.');
                }

                break;


            // Mengurangi jumlah produk
            case 'minus':

                if (i.qty > 1) {
                    i.qty--;
                }

                break;


            // Menghapus produk
            case 'remove':

                if (confirm(`Hapus ${i.nama} dari keranjang?`)) {

                    selected.delete(key(i));

                    cart.splice(index, 1);

                    notice('Produk dihapus dari keranjang.');

                }

                break;

        }

        render();

    });


    // ==========================================
    // 9. FITUR PILIH PRODUK
    // ==========================================

    $('cart-items').addEventListener('change', e => {

        if (e.target.dataset.action !== 'select') return;

        const i = cart[
            Number(
                e.target.closest('[data-index]').dataset.index
            )
        ];

        if (e.target.checked) {

            selected.add(key(i));

        } else {

            selected.delete(key(i));

        }

        render();

    });


    // ==========================================
    // 10. FITUR PILIH SEMUA PRODUK
    // ==========================================

    $('select-all').addEventListener('change', e => {

        selected = e.target.checked
            ? new Set(cart.map(key))
            : new Set();

        render();

    });


    // ==========================================
    // 11. FITUR HAPUS PRODUK TERPILIH
    // ==========================================

    $('delete-selected').addEventListener('click', () => {

        if (
            !selected.size ||
            !confirm(
                `Hapus ${selected.size} produk terpilih dari keranjang?`
            )
        ) return;

        cart = cart.filter(i =>
            !selected.has(key(i))
        );

        selected.clear();

        notice('Produk terpilih berhasil dihapus.');

        render();

    });


    // ==========================================
    // 12. TAMBAH PRODUK DARI REKOMENDASI
    // ==========================================

    $('suggestions').addEventListener('click', e => {

        const b = e.target.closest('[data-add]');

        if (!b) return;

        const p = catalog[Number(b.dataset.add)];

        if (!p) return;

        const i = cart.find(i =>
            key(i) === key(p)
        );

        if (i) {

            if (i.qty >= p.stok) {

                notice('Stok maksimum tercapai.');

                return;

            }

            i.qty++;

        } else {

            cart.push({
                id: p.id,
                nama: p.nama,
                merek: p.merek,
                harga: price(p),
                qty: 1
            });

        }

        selected.add(key(p));

        notice(p.nama + ' ditambahkan ke keranjang.');

        render();

    });


    // ==========================================
    // 13. TOMBOL CHECKOUT
    // ==========================================

    $('checkout').addEventListener('click', () => {

        const items = cart.filter(i =>
            selected.has(key(i))
        );

        if (!items.length) return;

        // Menyimpan produk yang dipilih untuk checkout
        sessionStorage.setItem(
            'sephorreal_checkout_selection',
            JSON.stringify(items)
        );

        // Mengarahkan pengguna ke halaman checkout
        window.location.href = 'checkout.html';

    });


    // ==========================================
    // 14. SINKRONISASI LOCALSTORAGE
    // ==========================================

    window.addEventListener('storage', e => {

        if (e.key === KEY) {

            try {

                cart = JSON.parse(e.newValue || '[]');

                if (!Array.isArray(cart)) {
                    cart = [];
                }

                selected = new Set(cart.map(key));

                render();

            } catch {}

        }

    });


    // ==========================================
    // 15. MENJALANKAN TAMPILAN KERANJANG
    // ==========================================

    render();

})();
