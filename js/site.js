(() => {
  const { loja, produtos } = window.KTEC;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const waLink = (msg) => `https://wa.me/${loja.whatsapp}?text=${encodeURIComponent(msg)}`;
  const setWa = (a, msg) => { a.href = waLink(msg); a.target = '_blank'; a.rel = 'noopener'; };

  // ---------- Dados da loja no HTML
  $$('[data-loja]').forEach((el) => { el.textContent = loja[el.dataset.loja] ?? ''; });
  const insta = $('#link-insta');
  if (insta) insta.href = `https://www.instagram.com/${loja.instagram}/`;
  const mapa = $('#mapa');
  if (mapa) mapa.src = `https://maps.google.com/maps?q=${encodeURIComponent(loja.mapa)}&z=16&output=embed`;
  $('#ano').textContent = new Date().getFullYear();

  // ---------- Vitrine
  const grid = $('#grid-produtos');
  const labelCat = { novo: 'Novo', seminovo: 'Seminovo' };
  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  produtos.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.cat = p.categoria;
    let cor = p.cores[0];

    const priceHTML = p.preco
      ? `${fmt(p.preco)}<small>ou em até ${loja.parcelas}x no cartão</small>`
      : `Consulte o valor<small>em até ${loja.parcelas}x no cartão</small>`;
    const sub = p.capacidades.join(' · ');

    card.innerHTML = `
      <div class="card-media">
        <img class="ph" src="${cor.foto}" alt="${p.nome} ${cor.nome}" loading="lazy" decoding="async">
        <span class="badge ${p.selo ? 'hot' : ''}">${p.selo || labelCat[p.categoria]}</span>
      </div>
      <div class="card-body">
        <h3>${p.nome}</h3>
        <p class="card-sub">${sub}</p>
        ${p.cores ? `<div class="swatches" role="group" aria-label="Cores">
          ${p.cores.map((c, i) => `<button class="swatch ${i === 0 ? 'is-on' : ''}" style="background:${c.hex}" data-i="${i}" aria-label="${c.nome}" aria-pressed="${i === 0}"></button>`).join('')}
          <span class="swatch-name">${cor.nome}</span></div>` : ''}
        <div class="card-foot">
          <p class="price">${priceHTML}</p>
          <a class="btn btn-green">Quero este</a>
        </div>
      </div>`;

    const media = $('.card-media', card);
    const btn = $('.card-foot .btn', card);
    const updateWa = () => setWa(btn, `Olá, KTEC! Tenho interesse no ${p.nome}${cor ? ` na cor ${cor.nome}` : ''}. Pode me passar valores e condições?`);
    if (cor) media.style.setProperty('--c', cor.hex);
    updateWa();

    $$('.swatch', card).forEach((sw) => sw.addEventListener('click', () => {
      cor = p.cores[+sw.dataset.i];
      $$('.swatch', card).forEach((s) => { s.classList.toggle('is-on', s === sw); s.setAttribute('aria-pressed', s === sw); });
      $('.swatch-name', card).textContent = cor.nome;
      const img = $('.ph', media); img.src = cor.foto; img.alt = `${p.nome} ${cor.nome}`;
      media.style.setProperty('--c', cor.hex);
      updateWa();
    }));
    grid.appendChild(card);
  });

  // ---------- Filtros
  const filters = $$('.filter');
  function applyFilter(f) {
    filters.forEach((b) => { const on = b.dataset.filter === f; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    $$('.card', grid).forEach((c) => {
      const show = f === 'todos' || c.dataset.cat === f;
      c.hidden = !show;
      if (show) { c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; }
    });
  }
  filters.forEach((b) => b.addEventListener('click', () => applyFilter(b.dataset.filter)));
  $$('[data-filter-link]').forEach((a) => a.addEventListener('click', () => applyFilter(a.dataset.filterLink)));

  // ---------- Links de WhatsApp (depois da vitrine, para pegar tudo)
  $$('[data-wa]').forEach((a) => setWa(a, a.dataset.wa || 'Olá, KTEC! Vim pelo site.'));

  // ---------- Topo e menu
  const topbar = $('.topbar');
  const onScroll = () => topbar.classList.toggle('scrolled', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = $('.menu-btn');
  const menu = $('#menu-mobile');
  const setMenu = (open) => { menu.hidden = !open; menuBtn.setAttribute('aria-expanded', open); topbar.classList.toggle('scrolled', open || scrollY > 20); };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  // ---------- Revelar ao rolar
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => io.observe(el));
})();
