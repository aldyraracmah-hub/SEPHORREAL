(function () {
  const script = document.currentScript;
  const ROOT = (script && script.dataset.root) || "";
  const ACTIVE = document.body.dataset.page || "";

  const MENU = [
    { key: "semua", label: "Semua", href: "pages/kategori.html?c=semua" },
    { key: "makeup", label: "Makeup", href: "pages/kategori.html?c=makeup" },
    { key: "skincare", label: "Skincare", href: "pages/kategori.html?c=skincare" },
    { key: "rambut", label: "Rambut", href: "pages/kategori.html?c=rambut" },
    { key: "parfum",label: "Parfum", href: "pages/kategori.html?c=parfum" },
    { key: "tubuh", label: "Badan & Mandi", href: "pages/kategori.html?c=tubuh" },
    { key: "sale", label: "Sale", href: "pages/kategori.html?c=sale" },
  ];

  const CONTAINER = "mx-auto w-full max-w-[2400px] px-4 lg:px-10 xl:px-16";
  const BTN_BASE = "inline-flex w-full items-center justify-center gap-2 border-2 px-8 font-display text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors duration-[250ms] ease-soft sm:w-auto";
  const BTN = {
    solid:   "border-black bg-black text-white hover:bg-white hover:text-black",
    outline: "border-black bg-transparent text-black hover:bg-black hover:text-white",
    white:   "border-white bg-white text-black hover:bg-transparent hover:text-white",
  };
  const btn = (variant, h = "h-[52px]") => `${BTN_BASE} ${h} ${BTN[variant]}`;
  const ICON_BTN = "relative grid h-11 w-11 place-items-center hover:bg-gray-100";
  const LOGO = "inline-flex items-center gap-[2px] font-display text-[28px] font-bold uppercase tracking-[0.22em]";
  const NAV_LINK = "relative py-[6px] font-display text-[13px] font-semibold uppercase tracking-[0.12em] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:origin-left after:scale-x-0 after:bg-black after:transition-transform after:duration-300 after:ease-soft hover:after:scale-x-100";
  const DRAWER_LINK = "flex items-center justify-between border-b border-line px-6 py-4 font-display text-[18px] font-semibold uppercase tracking-[0.06em]";
  const FOOT_LINK = "text-[14px] text-gray-100 hover:underline hover:underline-offset-[3px]";
  const FOOT_H5 = "mb-4 font-display text-[12px] font-bold uppercase tracking-[0.18em] text-gray-500";
  const svg = (inner, size = 22) => `<svg viewBox="0 0 24 24" class="h-[${size}px] w-[${size}px] fill-none stroke-current stroke-[1.7]" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  const ICON = {
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>'),
    home: svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>'),
    bag: svg('<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
    menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    ig: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>', 18),
    tt: svg('<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.3 2.5 2 4.2 5 4.4"/>', 18),
    yt: svg('<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9 5 3-5 3V9Z"/>', 18),
    arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
  };

  const link = (href) => ROOT + href;
  const logoImg = (cls, extra = "") => `<img src="${link("logofix.png")}" alt="SEPHORREAL" class="w-auto ${cls} ${extra}" />`;
  const links = (drawer) =>
    MENU.map((m) =>
      drawer
        ? `<a href="${link(m.href)}" class="${DRAWER_LINK}">${m.label}${ICON.arrow}</a>`
        : `<a href="${link(m.href)}" class="${NAV_LINK}${m.key === ACTIVE ? " after:scale-x-100" : ""}">${m.label}</a>`
    ).join("");

  const searchForm = (id, formCls) => `
    <form class="${formCls}" role="search" action="${link("pages/kategori.html")}">
      <label class="sr-only" for="q-${id}">Cari produk</label>
      <input id="q-${id}" name="q" type="search" placeholder="Cari produk, brand, atau kategori" class="h-11 w-full border-[1.5px] border-black bg-white pl-4 pr-11 text-[14px]" />
      <button type="submit" aria-label="Cari" class="absolute right-0 top-0 grid h-11 w-11 place-items-center">${ICON.search}</button>
    </form>`;

  const header = `
    <div class="bg-black px-4 py-[9px] text-center text-[12px] tracking-[0.08em] text-white lg:px-5">Gratis ongkir untuk pembelian di atas Rp300.000 · <a class="underline underline-offset-[3px]" href="${link("pages/kategori.html?c=sale")}">Belanja sekarang</a></div>
    <header class="sticky top-0 z-50 border-b border-line bg-white">
      <div class="${CONTAINER} flex h-[62px] items-center gap-2 lg:h-[72px] lg:gap-4 xl:gap-8">
        <button class="${ICON_BTN} -ml-[10px] lg:hidden" data-menu-open aria-label="Buka menu">${ICON.menu}</button>
        <a href="${link("index.html")}" class="${ICON_BTN}" aria-label="Kembali ke beranda">${ICON.home}</a>
        <a class="mx-auto lg:mx-0" aria-label="SEPHORREAL — beranda">${logoImg("h-12 lg:h-14", "mix-blend-multiply")}</a>
        <nav class="ml-4 hidden gap-4 lg:flex xl:gap-6" aria-label="Menu utama">${links(false)}</nav>
        ${searchForm("desktop", "relative ml-auto hidden max-w-[260px] flex-1 lg:block xl:max-w-[420px]")}
        <div class="flex items-center gap-2">
          <a href="${link("akun.html#/profil")}" class="${ICON_BTN.replace("grid ", "")} hidden lg:grid" aria-label="Akun">${ICON.user}</a>
          <a href="${link("pages/keranjang.html")}" class="${ICON_BTN}" aria-label="Keranjang">${ICON.bag}<span class="absolute right-[3px] top-1 grid h-[17px] min-w-[17px] place-items-center rounded-[9px] bg-black px-1 text-[10px] font-bold text-white" data-cart-count>0</span></a>
        </div>
      </div>
      <div class="px-4 pb-3 lg:hidden">${searchForm("mobile", "relative w-full")}</div>
    </header>

    <div class="pointer-events-none fixed inset-0 z-[90] bg-black/55 opacity-0 transition-opacity duration-300" data-backdrop data-menu-close></div>
    <aside class="fixed inset-y-0 left-0 z-[100] flex w-[min(86vw,360px)] -translate-x-full flex-col overflow-y-auto bg-white transition-transform duration-[350ms] ease-soft" data-drawer aria-label="Menu navigasi" aria-hidden="true">
      <div class="flex items-center justify-between border-b border-line px-4 py-3">
        <a href="${link("index.html")}" aria-label="SEPHORREAL — beranda">${logoImg("h-10", "mix-blend-multiply")}</a>
        <button class="${ICON_BTN}" data-menu-close aria-label="Tutup menu">${ICON.close}</button>
      </div>
      <nav>${links(true)}</nav>
      <div class="mt-auto grid gap-3 p-6">
        <a class="${btn("solid")}" href="${link("akun.html#/profil")}">Masuk / Daftar</a>
        <a class="${btn("outline")}" href="${link("pages/wishlist.html")}">Wishlist</a>
      </div>
    </aside>`;

  const footer = `
    <footer class="bg-black text-white">
      <div class="${CONTAINER}">
        <div class="grid items-center gap-8 border-b border-[#2a2a2a] py-12 lg:grid-cols-[1.1fr_1fr]">
          <h2 class="text-[clamp(28px,4vw,46px)] uppercase">Gabung &amp; dapat<br>10% voucher pertama</h2>
          <div class="flex max-w-[460px] flex-col items-start gap-4 lg:justify-self-end">
            <p class="text-[14px] text-gray-300">Buat akun gratis, dapatkan voucher 10% untuk pembelian pertama, dan jadi yang pertama tahu promo terbaru.</p>
            <a class="group inline-flex h-[60px] w-full items-center justify-center gap-3 border-2 border-white bg-white px-10 font-display text-[14px] font-semibold uppercase tracking-[0.16em] text-black transition-colors duration-[250ms] ease-soft hover:bg-transparent hover:text-white" href="${link("akun.html#/login")}">Daftar sekarang <span class="transition-transform duration-300 group-hover:translate-x-1">→</span></a>
            <ul class="flex flex-wrap gap-x-5 gap-y-1 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500"><li>✦ Voucher 10%</li><li>✦ Sample gratis</li><li>✦ Gratis ongkir</li></ul>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-8 py-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div class="col-span-full lg:col-auto">
            <a href="${link("index.html")}" aria-label="SEPHORREAL — beranda">${logoImg("h-16 lg:h-20", "invert mix-blend-screen")}</a>
            <p class="my-4 max-w-[320px] text-[14px] text-gray-500">We Belong to<br>Something Beautiful</p>
            <div class="flex gap-2">
              <a class="grid h-[42px] w-[42px] place-items-center rounded-full border-[1.5px] border-white transition-colors duration-[250ms] hover:bg-white hover:text-black" href="javascript:void(0)" aria-label="Instagram">${ICON.ig}</a>
              <a class="grid h-[42px] w-[42px] place-items-center rounded-full border-[1.5px] border-white transition-colors duration-[250ms] hover:bg-white hover:text-black" href="javascript:void(0)" aria-label="TikTok">${ICON.tt}</a>
              <a class="grid h-[42px] w-[42px] place-items-center rounded-full border-[1.5px] border-white transition-colors duration-[250ms] hover:bg-white hover:text-black" href="javascript:void(0)" aria-label="YouTube">${ICON.yt}</a>
            </div>
          </div>
          <div>
            <h5 class="${FOOT_H5}">Belanja</h5>
            <ul class="[&>li+li]:mt-2">${MENU.map((m) => `<li><a class="${FOOT_LINK}" href="${link(m.href)}">${m.label}</a></li>`).join("")}</ul>
          </div>
          <div>
            <h5 class="${FOOT_H5}">Bantuan</h5>
            <ul class="[&>li+li]:mt-2">
              <li><a class="${FOOT_LINK}" href="javascript:void(0)">Cara pemesanan</a></li>
              <li><a class="${FOOT_LINK}" href="javascript:void(0)">Pengiriman</a></li>
              <li><a class="${FOOT_LINK}" href="javascript:void(0)">Pengembalian</a></li>
              <li><a class="${FOOT_LINK}" href="javascript:void(0)">Hubungi kami</a></li>
            </ul>
          </div>
          <div>
            <h5 class="${FOOT_H5}">Tentang</h5>
            <ul class="[&>li+li]:mt-2">
              <li><a class="${FOOT_LINK}" href="javascript:void(0)">Tentang SEPHORREAL</a></li>
              <li><a class="${FOOT_LINK}" href="javascript:void(0)">Karier</a></li>
              <li><a class="${FOOT_LINK}" href="javascript:void(0)">Syarat &amp; ketentuan</a></li>
              <li><a class="${FOOT_LINK}" href="javascript:void(0)">Kebijakan privasi</a></li>
            </ul>
          </div>
        </div>

        <div class="flex flex-wrap justify-between gap-3 border-t border-[#2a2a2a] py-6 text-[12px] text-gray-500">
          <span>© ${new Date().getFullYear()} SEPHORREAL. Semua hak dilindungi.</span>
          <span>Dibuat untuk tugas kelompok</span>
        </div>
      </div>
    </footer>`;

  const h = document.getElementById("site-header");
  const f = document.getElementById("site-footer");
  if (h) h.innerHTML = header;
  if (f) f.innerHTML = footer;

  const drawer = document.querySelector("[data-drawer]");
  const backdrop = document.querySelector("[data-backdrop]");
  const setMenu = (open) => {
    if (!drawer || !backdrop) return;
    drawer.classList.toggle("-translate-x-full", !open);
    drawer.setAttribute("aria-hidden", String(!open));
    backdrop.classList.toggle("opacity-0", !open);
    backdrop.classList.toggle("pointer-events-none", !open);
    document.body.classList.toggle("overflow-hidden", open);
  };
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-menu-open]")) setMenu(true);
    else if (e.target.closest("[data-menu-close]")) setMenu(false);
  });
  document.addEventListener("keydown", (e) => e.key === "Escape" && setMenu(false));
  window.matchMedia("(min-width: 901px)").addEventListener("change", (m) => m.matches && setMenu(false));

  try {
    const cart = JSON.parse(localStorage.getItem("sephora_cart") || "[]");
    const n = cart.reduce((a, i) => a + (i.qty || 1), 0);
    document.querySelectorAll("[data-cart-count]").forEach((el) => (el.textContent = n));
  } catch (_) {}
})();