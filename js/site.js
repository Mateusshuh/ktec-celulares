(() => {
  const { loja } = window.KTEC;
  const cfg = window.KTEC_SUPABASE || {};
  const db = { url: (cfg.url || '').trim().replace(/\/+$/, ''), chave: (cfg.chave || '').trim() };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const waCidade = { 'Ijuí': loja.whatsapp, 'Cruz Alta': loja.whatsappCruzAlta };
  const waLink = (msg, cidade) => `https://wa.me/${waCidade[cidade] || loja.whatsapp}?text=${encodeURIComponent(msg)}`;
  const setWa = (a, msg, cidade) => { a.href = waLink(msg, cidade); a.target = '_blank'; a.rel = 'noopener'; };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Dados da loja no HTML
  $$('[data-loja]').forEach((el) => { el.textContent = loja[el.dataset.loja] ?? ''; });
  const insta = $('#link-insta');
  if (insta) insta.href = `https://www.instagram.com/${loja.instagram}/`;
  const mapa = $('#mapa');
  const enderecos = { 'Ijuí': loja.mapa, 'Cruz Alta': loja.mapaCruzAlta };
  function mostrarMapa(cidade) {
    mapa.src = `https://maps.google.com/maps?q=${encodeURIComponent(enderecos[cidade])}&z=16&output=embed`;
    mapa.title = `Mapa da KTEC Celulares em ${cidade}`;
    $$('.map-tab').forEach((b) => { const on = b.dataset.mapa === cidade; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
  }
  if (mapa) {
    mostrarMapa('Ijuí');
    $$('.map-tab').forEach((b) => b.addEventListener('click', () => mostrarMapa(b.dataset.mapa)));
  }
  $('#ano').textContent = new Date().getFullYear();

  // ---------- Vitrine (produtos cadastrados no painel /paineldoadmin)
  const grid = $('#grid-produtos');
  const status = $('#vitrine-status');
  const labelCond = { novo: 'Novo', seminovo: 'Seminovo', com_defeito: 'Com defeito' };
  const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fotoUrl = (path) => `${db.url}/storage/v1/object/public/produtos/${path.split('/').map(encodeURIComponent).join('/')}`;
  const filtro = { categoria: 'todos', condicao: 'todos', cidade: 'todos' };
  let produtos = [];

  function setStatus(msg) {
    status.textContent = msg;
    status.hidden = !msg;
  }

  function cardHTML(p) {
    const fotos = p.fotos || [];
    const detalhes = [p.capacidade, p.cor, p.bateria != null ? `Bateria ${p.bateria}%` : ''].filter(Boolean).map(esc).join(' · ');
    const price = p.preco != null
      ? `${fmt(p.preco)}<small>ou em até ${loja.parcelas}x no cartão</small>`
      : `Consulte o valor<small>em até ${loja.parcelas}x no cartão</small>`;
    const media = fotos.length
      ? `<div class="card-photos">${fotos.map((f, i) => `<img src="${esc(fotoUrl(f))}" alt="${esc(p.nome)}, foto ${i + 1} de ${fotos.length}" loading="lazy" decoding="async">`).join('')}</div>
         ${fotos.length > 1 ? `<button class="photo-nav prev" aria-label="Foto anterior">‹</button><button class="photo-nav next" aria-label="Próxima foto">›</button><span class="photo-count">1/${fotos.length}</span>` : ''}`
      : `<svg class="i card-nophoto" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-phone"/></svg>`;
    return `
      <div class="card-media">
        ${media}
        <span class="badge ${p.condicao === 'novo' ? 'hot' : p.condicao === 'com_defeito' ? 'warn' : ''}">${labelCond[p.condicao]}</span>
        <span class="badge badge-city"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-pin"/></svg>${esc(p.cidade)}</span>
      </div>
      <div class="card-body">
        <h3>${esc(p.nome)}</h3>
        ${detalhes ? `<p class="card-sub">${detalhes}</p>` : ''}
        ${p.condicao === 'com_defeito' && p.defeito ? `<p class="card-defeito"><b>Problema:</b> ${esc(p.defeito)}</p>` : ''}
        ${p.descricao ? `<p class="card-desc">${esc(p.descricao)}</p>` : ''}
        <div class="card-foot">
          <p class="price">${price}</p>
          <a class="btn btn-green">Quero este</a>
        </div>
      </div>`;
  }

  function render() {
    const lista = produtos.filter((p) =>
      (filtro.categoria === 'todos' || p.categoria === filtro.categoria)
      && (filtro.condicao === 'todos' || p.condicao === filtro.condicao)
      && (filtro.cidade === 'todos' || p.cidade === filtro.cidade));

    grid.replaceChildren();
    if (!produtos.length) return setStatus('Nenhum produto cadastrado no momento. Chama a gente no WhatsApp que a gente te mostra o que tem na loja.');
    if (!lista.length) return setStatus('Nenhum produto com esses filtros agora.');
    setStatus('');

    lista.forEach((p) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = cardHTML(p);
      const extras = [p.capacidade, p.cor].filter(Boolean).join(' ');
      setWa($('.card-foot .btn', card), `Olá, KTEC! Tenho interesse no ${p.nome}${extras ? ` ${extras}` : ''} (${labelCond[p.condicao].toLowerCase()}, em ${p.cidade}). Pode me passar valores e condições?`, p.cidade);

      const track = $('.card-photos', card);
      const count = $('.photo-count', card);
      if (track && count) {
        const total = track.children.length;
        const atual = () => Math.round(track.scrollLeft / track.clientWidth);
        track.addEventListener('scroll', () => { count.textContent = `${atual() + 1}/${total}`; }, { passive: true });
        $('.prev', card).addEventListener('click', () => track.scrollTo({ left: (atual() - 1 + total) % total * track.clientWidth, behavior: 'smooth' }));
        $('.next', card).addEventListener('click', () => track.scrollTo({ left: (atual() + 1) % total * track.clientWidth, behavior: 'smooth' }));
      }
      grid.appendChild(card);
    });
  }

  async function carregarProdutos() {
    if (!db.url || !db.chave) return setStatus('Vitrine em atualização. Chama a gente no WhatsApp para ver os produtos disponíveis.');
    setStatus('Carregando produtos…');
    try {
      const res = await fetch(`${db.url}/rest/v1/produtos?select=*&visivel=eq.true&order=criado_em.desc`, { headers: { apikey: db.chave } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      produtos = await res.json();
      render();
    } catch (err) {
      console.error('Vitrine:', err);
      setStatus('Não conseguimos carregar os produtos agora. Chama a gente no WhatsApp.');
    }
  }

  // ---------- Filtros (tipo, condição e cidade)
  const filters = $$('.filter');
  function applyFilter(grupo, valor) {
    filtro[grupo] = valor;
    filters.filter((b) => b.dataset.grupo === grupo).forEach((b) => {
      const on = b.dataset.valor === valor;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on);
    });
    render();
  }
  filters.forEach((b) => b.addEventListener('click', () => applyFilter(b.dataset.grupo, b.dataset.valor)));
  $$('[data-filter-link]').forEach((a) => a.addEventListener('click', () => {
    applyFilter('categoria', 'todos');
    applyFilter('condicao', a.dataset.filterLink);
  }));

  carregarProdutos();

  // ---------- Links de WhatsApp
  $$('[data-wa]').forEach((a) => setWa(a, a.dataset.wa || 'Olá, KTEC! Vim pelo site.', a.dataset.cidade));

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
