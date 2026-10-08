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
  $$('[data-insta]').forEach((a) => { a.href = `https://www.instagram.com/${loja.instagram}/`; });
  const enderecos = { 'Ijuí': loja.mapa, 'Cruz Alta': loja.mapaCruzAlta };
  $$('iframe[data-mapa]').forEach((f) => {
    f.src = `https://maps.google.com/maps?q=${encodeURIComponent(enderecos[f.dataset.mapa])}&z=16&output=embed`;
  });
  $('#ano').textContent = new Date().getFullYear();

  // ---------- Fotos que ainda não existem: mostra o aviso do placeholder no lugar
  $$('.ph img, .avatar img').forEach((img) => {
    const ph = img.closest('.ph, .avatar');
    const falhou = () => { img.hidden = true; ph.classList.add('is-empty'); };
    const carregou = () => ph.classList.add('is-loaded');
    if (img.complete && img.getAttribute('src')) (img.naturalWidth ? carregou : falhou)();
    img.addEventListener('error', falhou);
    img.addEventListener('load', carregou);
  });

  // ---------- Links de WhatsApp
  $$('[data-wa]').forEach((a) => setWa(a, a.dataset.wa || 'Olá, KTEC! Vim pelo site.', a.dataset.cidade));

  // Botões gerais: perguntam com qual loja falar
  const dialog = $('#wa-dialog');
  const escolher = (msg) => {
    $$('[data-wa-loja]', dialog).forEach((a) => setWa(a, msg, a.dataset.waLoja));
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else window.open(waLink(msg), '_blank', 'noopener');
  };
  $$('[data-wa-escolher]').forEach((b) => b.addEventListener('click', () => escolher(b.dataset.waEscolher)));
  $$('[data-wa-loja]', dialog).forEach((a) => a.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  // ---------- Vitrine (produtos cadastrados no painel do administrador)
  const grid = $('#grid-produtos');
  const status = $('#vitrine-status');
  const labelCond = { novo: 'Novo', seminovo: 'Seminovo', com_defeito: 'Com defeito' };
  const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fotoUrl = (path) => `${db.url}/storage/v1/object/public/produtos/${path.split('/').map(encodeURIComponent).join('/')}`;
  const filtro = { categoria: 'todos', condicao: 'todos', cidade: 'todos' };
  let produtos = [];
  let carregado = false;

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
      ? `<div class="card-photos">${fotos.map((f, i) => `<img src="${esc(fotoUrl(f))}" alt="${esc(p.nome)}, foto ${i + 1} de ${fotos.length}" width="800" height="800" loading="lazy" decoding="async">`).join('')}</div>
         ${fotos.length > 1 ? `<button class="photo-nav prev" type="button" aria-label="Foto anterior">‹</button><button class="photo-nav next" type="button" aria-label="Próxima foto">›</button><span class="photo-count">1/${fotos.length}</span>` : ''}`
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
    if (!carregado) return;
    const lista = produtos.filter((p) =>
      (filtro.categoria === 'todos' || p.categoria === filtro.categoria)
      && (filtro.condicao === 'todos' || p.condicao === filtro.condicao)
      && (filtro.cidade === 'todos' || p.cidade === filtro.cidade));

    grid.replaceChildren();
    if (!produtos.length) return setStatus('Nenhum produto cadastrado no momento. Chama a gente no WhatsApp que a gente te mostra o que tem na loja.');
    if (!lista.length) return setStatus('Nenhum produto com esses filtros agora. Chama a gente no WhatsApp que a gente verifica pra você.');
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
      carregado = true;
      render();
    } catch (err) {
      console.error('Vitrine:', err);
      setStatus('Não conseguimos carregar os produtos agora. Chama a gente no WhatsApp.');
    }
  }

  // ---------- Filtros (categoria, condição e cidade)
  const filters = $$('.filter');
  function marcar(grupo, valor) {
    filtro[grupo] = valor;
    filters.filter((b) => b.dataset.grupo === grupo).forEach((b) => {
      const on = b.dataset.valor === valor;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on);
    });
  }
  filters.forEach((b) => b.addEventListener('click', () => { marcar(b.dataset.grupo, b.dataset.valor); render(); }));

  // "Ver na vitrine": aplica os filtros do bloco (ex.: data-ver="categoria=iphone&condicao=novo")
  function aplicarFiltros(params) {
    Object.keys(filtro).forEach((g) => marcar(g, params.get(g) || 'todos'));
    render();
  }
  $$('[data-ver]').forEach((a) => a.addEventListener('click', () => aplicarFiltros(new URLSearchParams(a.dataset.ver))));
  // Também aceita os filtros no endereço: ?categoria=xiaomi&cidade=Cruz%20Alta#vitrine
  aplicarFiltros(new URLSearchParams(location.search));

  carregarProdutos();

  // ---------- Menu
  const topbar = $('.topbar');
  const onScroll = () => topbar.classList.toggle('scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = $('.menu-btn');
  const menu = $('#menu');
  const setMenu = (open) => {
    topbar.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && topbar.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
  });

  // Destaca no menu a seção visível
  const navLinks = $$('a', menu).filter((a) => !a.dataset.ver); // Seminovos abre a vitrine filtrada, não é uma seção
  // Observa também as seções fora do menu (vitrine, depoimentos…), para o destaque sumir nelas
  const alvo = [...new Set([...navLinks.map((a) => $(a.getAttribute('href'))), ...$$('main > section[id]')])].filter(Boolean);
  const navIo = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    navLinks.forEach((a) => {
      if (a.getAttribute('href') === `#${e.target.id}`) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }), { rootMargin: '-45% 0px -50% 0px' });
  alvo.forEach((s) => navIo.observe(s));

  // ---------- Revelar ao rolar (desligado com prefers-reduced-motion, no CSS)
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => io.observe(el));
})();
