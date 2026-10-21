(function () {
  const FOLDER_UTAMA = "../";           
  const KUNCI_KERANJANG = "sephora_cart"; 
  const semuaProduk = window.PRODUK || [];
  const kategoriList = window.DAFTAR_KATEGORI || {};

  /* ---------- Fungsi bantu ---------- */
  const ambil = (selector) => document.querySelector(selector);

  const formatRupiah = (angka) => "Rp" + Math.round(angka).toLocaleString("id-ID");

  // Amankan teks supaya tidak dianggap kode HTML
  const amankan = (teks) =>
    String(teks).replace(/[&<>"']/g, (h) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[h]));

  // Harga setelah diskon
  const hitungHargaAkhir = (produk) => produk.harga * (1 - (produk.diskon || 0) / 100);

  /* ---------- Kondisi halaman (diambil dari URL: ?c=makeup&q=serum) ---------- */
  const parameterUrl = new URLSearchParams(location.search);
  const kondisi = {
    kategori: kategoriList[parameterUrl.get("c")] ? parameterUrl.get("c") : "semua",
    kataKunci: (parameterUrl.get("q") || "").trim(),
    urutan: "bawaan",
  };

  /* ---------- Gambar placeholder per kategori (garis sederhana) ---------- */
  const GAMBAR_IKON = {
    makeup:   '<circle cx="50" cy="50" r="34"/><circle cx="50" cy="50" r="22"/><circle cx="50" cy="50" r="9"/>',
    skincare: '<path d="M50 12C34 36 26 48 26 62a24 24 0 0 0 48 0c0-14-8-26-24-50Z"/><path d="M50 44c-7 10-11 16-11 22a11 11 0 0 0 22 0c0-6-4-12-11-22Z"/>',
    rambut:   '<path d="M12 34c10-12 18 12 30 0s20 12 30 0 12 6 16 0"/><path d="M12 52c10-12 18 12 30 0s20 12 30 0 12 6 16 0"/><path d="M12 70c10-12 18 12 30 0s20 12 30 0 12 6 16 0"/>',
    parfum:   '<rect x="30" y="44" width="40" height="40" rx="3"/><rect x="42" y="30" width="16" height="14"/><rect x="45" y="18" width="10" height="12"/>',
    tubuh:    '<path d="M34 34h32l4 50H30l4-50Z"/><rect x="40" y="22" width="20" height="12"/><path d="M36 58h28"/>',
  };
  const buatPlaceholder = (kategori) =>
    `<svg viewBox="0 0 100 100" class="ikon-placeholder" stroke-linejoin="round" aria-hidden="true">${GAMBAR_IKON[kategori] || GAMBAR_IKON.makeup}</svg>`;

  /* ---------- Keranjang (disimpan di localStorage browser) ---------- */
  const bacaKeranjang = () => {
    try { return JSON.parse(localStorage.getItem(KUNCI_KERANJANG) || "[]"); } catch (_) { return []; }
  };
  const simpanKeranjang = (keranjang) => {
    try { localStorage.setItem(KUNCI_KERANJANG, JSON.stringify(keranjang)); } catch (_) {}
  };
  const jumlahDiKeranjang = (idProduk) => (bacaKeranjang().find((i) => i.id === idProduk) || {}).qty || 0;

  // Perbarui angka kecil di ikon tas pada header
  const perbaruiAngkaKeranjang = () => {
    const total = bacaKeranjang().reduce((hasil, i) => hasil + (i.qty || 1), 0);
    document.querySelectorAll("[data-cart-count]").forEach((el) => (el.textContent = total));
  };

  let timerNotifikasi;
  const tampilkanNotifikasi = (pesan) => {
    const kotak = ambil("#notifikasi");
    kotak.textContent = pesan;
    kotak.classList.add("notifikasi-tampil");
    clearTimeout(timerNotifikasi);
    timerNotifikasi = setTimeout(() => kotak.classList.remove("notifikasi-tampil"), 2200);
  };

  const tambahKeKeranjang = (idProduk) => {
    const produk = semuaProduk.find((p) => p.id === idProduk);
    if (!produk || produk.stok <= 0) return;

    const keranjang = bacaKeranjang();
    const itemAda = keranjang.find((i) => i.id === idProduk);

    // Jangan sampai melebihi stok
    if (itemAda && itemAda.qty >= produk.stok) {
      tampilkanNotifikasi("Stok " + produk.nama + " hanya " + produk.stok);
      return;
    }

    if (itemAda) itemAda.qty += 1;
    else keranjang.push({ id: produk.id, nama: produk.nama, merek: produk.merek, harga: Math.round(hitungHargaAkhir(produk)), qty: 1 });

    simpanKeranjang(keranjang);
    perbaruiAngkaKeranjang();
    tampilkanNotifikasi(produk.nama + " masuk keranjang");
    tampilkan(); 
  };

  /* ---------- Filter & urutkan ---------- */
  const cocokDenganFilter = (produk) => {
    // 1) cek kategori
    const cocokKategori =
      kondisi.kategori === "semua" ? true :
      kondisi.kategori === "sale"  ? produk.diskon > 0 :
      produk.kategori === kondisi.kategori;
    if (!cocokKategori) return false;

    // 2) cek kata kunci pencarian (nama, merek, kategori, atau "sale")
    if (!kondisi.kataKunci) return true;
    const teksPencarian = [produk.nama, produk.merek, kategoriList[produk.kategori].label, produk.diskon > 0 ? "sale" : ""]
      .join(" ").toLowerCase();
    return kondisi.kataKunci.toLowerCase().split(/\s+/).every((kata) => teksPencarian.includes(kata));
  };

  const urutkanProduk = (daftar) => {
    const salinan = daftar.slice();
    if (kondisi.urutan === "termurah") salinan.sort((a, b) => hitungHargaAkhir(a) - hitungHargaAkhir(b));
    if (kondisi.urutan === "termahal") salinan.sort((a, b) => hitungHargaAkhir(b) - hitungHargaAkhir(a));
    if (kondisi.urutan === "nama")     salinan.sort((a, b) => a.nama.localeCompare(b.nama));
    return salinan;
  };

  /* ---------- Membuat HTML satu kartu produk ---------- */
  const statusStok = (produk) => {
    if (produk.stok <= 0) return { teks: "Habis",        kelas: "info-stok-habis" };
    if (produk.stok <= 5) return { teks: "Stok menipis", kelas: "info-stok-menipis" };
    return { teks: "Tersedia", kelas: "" };
  };

  const buatKartu = (produk) => {
    const status = statusStok(produk);
    const habis = produk.stok <= 0;
    const mentok = !habis && jumlahDiKeranjang(produk.id) >= produk.stok; // sudah maksimal di keranjang
    const hargaAkhir = hitungHargaAkhir(produk);

    const gambar = produk.gambar
      ? `<img src="${FOLDER_UTAMA + amankan(produk.gambar)}" alt="${amankan(produk.nama)}" class="foto-produk ${habis ? "foto-habis" : ""}" loading="lazy" />`
      : buatPlaceholder(produk.kategori);

    const teksTombol = habis ? "Stok habis" : mentok ? "Maks. di keranjang" : "Tambah keranjang";
    const tombolMati = habis || mentok;

    return `
      <article class="kartu-produk">
        <div class="gambar-produk">
          ${gambar}
          <div class="label-di-gambar">
            <span class="lencana">${amankan(kategoriList[produk.kategori].label)}</span>
            ${produk.diskon > 0 ? `<span class="lencana-diskon">-${produk.diskon}%</span>` : ""}
          </div>
        </div>
        <div class="isi-kartu">
          <p class="merek-produk">${amankan(produk.merek)}</p>
          <h3 class="nama-produk">${amankan(produk.nama)}</h3>
          <div class="baris-harga">
            <span class="harga-akhir">${formatRupiah(hargaAkhir)}</span>
            ${produk.diskon > 0 ? `<span class="harga-coret">${formatRupiah(produk.harga)}</span>` : ""}
          </div>
          <p class="info-stok ${status.kelas}">${status.teks}${habis ? "" : " · Stok " + produk.stok}</p>
          <button type="button" data-tambah="${produk.id}" ${tombolMati ? "disabled" : ""}
            class="tombol-keranjang ${tombolMati ? "tombol-mati" : ""}">${teksTombol}</button>
        </div>
      </article>`;
  };

  /* ---------- Menampilkan semuanya ke layar ---------- */
  function tampilkan() {
    const infoKategori = kategoriList[kondisi.kategori];

    // judul & deskripsi
    ambil("#judul").textContent = kondisi.kataKunci ? `Hasil untuk “${kondisi.kataKunci}”` : infoKategori.judul;
    ambil("#deskripsi").textContent = kondisi.kataKunci ? `Dicari di kategori: ${infoKategori.label}.` : infoKategori.deskripsi;
    document.title = (kondisi.kataKunci ? "Cari: " + kondisi.kataKunci : infoKategori.judul) + " — SEPHORA";


    // daftar produk
    const hasil = urutkanProduk(semuaProduk.filter(cocokDenganFilter));
    ambil("#jumlah").textContent = hasil.length + " produk";
    ambil("#grid-produk").innerHTML = hasil.map(buatKartu).join("");
    ambil("#kotak-kosong").classList.toggle("hidden", hasil.length > 0);
    ambil("#grid-produk").classList.toggle("hidden", hasil.length === 0);
  }

  // Ubah alamat URL tanpa memuat ulang halaman
  const perbaruiUrl = () => {
    const url = new URLSearchParams();
    if (kondisi.kategori !== "semua") url.set("c", kondisi.kategori);
    if (kondisi.kataKunci) url.set("q", kondisi.kataKunci);
    history.replaceState(null, "", location.pathname + (url.toString() ? "?" + url : ""));
  };

  /* ---------- Menangani klik & pilihan ---------- */
  ambil("#grid-produk").addEventListener("click", (e) => {
    const tombol = e.target.closest("[data-tambah]");
    if (tombol) tambahKeKeranjang(tombol.dataset.tambah);
  });

  ambil("#pilihan-urut").addEventListener("change", (e) => {
    kondisi.urutan = e.target.value;
    tampilkan();
  });

  ambil("#tombol-reset").addEventListener("click", () => {
    kondisi.kategori = "semua";
    kondisi.kataKunci = "";
    perbaruiUrl();
    tampilkan();
  });

  /* ---------- Jalankan pertama kali ---------- */
  tampilkan();
})();
