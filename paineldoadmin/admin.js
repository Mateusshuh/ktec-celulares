/*
 * Painel do administrador (/paineldoadmin): login, cadastro de produtos e fotos.
 * Os dados ficam no Supabase (js/config.js); as regras de acesso estão em supabase/setup.sql.
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CATEGORIAS = { iphone: 'iPhone', xiaomi: 'Xiaomi', jbl: 'JBL', capinha: 'Capinha', pelicula: 'Película', carregador: 'Carregador' };
const CELULARES = ['iphone', 'xiaomi'];
const CONDICOES = { novo: 'Novo', seminovo: 'Seminovo', com_defeito: 'Com defeito' };
const CIDADES = { 'Ijuí': 'Ijuí', 'Cruz Alta': 'Cruz Alta' };
const BUCKET = 'produtos';
const MAX_LADO = 1600; // px: as fotos são reduzidas antes de enviar
const ABAS = ['produtos', 'cadastrar', 'fotos'];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const cfg = window.KTEC_SUPABASE || {};
const url = (cfg.url || '').trim().replace(/\/+$/, '');
const chave = (cfg.chave || '').trim();

function mostrarTela(id) {
  ['tela-config', 'tela-login', 'tela-painel'].forEach((t) => { $(`#${t}`).hidden = t !== id; });
}

let toastTimer;
function toast(msg, erro = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('erro', erro);
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), erro ? 6000 : 3000);
}

function mostrarErro(el, msg) {
  el.textContent = msg || '';
  el.hidden = !msg;
}

if (!url || !chave) {
  mostrarTela('tela-config');
} else {
  iniciar();
}

function iniciar() {
  const sb = createClient(url, chave);
  const fotoUrl = (path) => sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  let produtos = [];

  // ------------------------------------------------------------------ fotos
  async function prepararFoto(file) {
    let bmp;
    try {
      bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // o navegador não conseguiu abrir (ex.: HEIC no Windows): manda o original se for um formato aceito
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      if (ext && file.size <= 10 * 1024 * 1024) return { blob: file, tipo: file.type, ext };
      throw new Error(`Não foi possível abrir "${file.name}". Envie a foto em JPG, PNG ou WEBP.`);
    }
    const s = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * s);
    canvas.height = Math.round(bmp.height * s);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (!blob) throw new Error(`Não foi possível preparar "${file.name}".`);
    return { blob, tipo: 'image/jpeg', ext: 'jpg' };
  }

  // Grade de fotos com envio de várias de uma vez. Guarda as mudanças até salvar().
  class EditorFotos {
    constructor(el, aoMudar) {
      this.el = el;
      this.aoMudar = aoMudar;
      this.itens = []; // { path } já salva, ou { file, preview } nova
      this.removidas = [];
      this.pendente = false;
      el.innerHTML = `
        <div class="fotos-grid"></div>
        <label class="fotos-drop">
          <input type="file" accept="image/*" multiple>
          <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-upload"/></svg>
          <b>Adicionar fotos</b>
          <span>Escolha várias de uma vez ou arraste aqui</span>
        </label>`;
      this.grid = $('.fotos-grid', el);
      const input = $('input', el);
      const drop = $('.fotos-drop', el);
      input.addEventListener('change', () => { this.adicionar(input.files); input.value = ''; });
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); this.adicionar(e.dataTransfer.files); });
      this.grid.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-a]');
        if (!btn) return;
        const i = +btn.closest('.foto').dataset.i;
        const a = btn.dataset.a;
        if (a === 'remover') this.remover(i);
        else if (a === 'capa') this.mover(i, 0);
        else if (a === 'esq') this.mover(i, i - 1);
        else if (a === 'dir') this.mover(i, i + 1);
      });
    }

    carregar(paths = []) {
      this.itens.forEach((it) => it.preview && URL.revokeObjectURL(it.preview));
      this.itens = paths.map((path) => ({ path }));
      this.removidas = [];
      this.marcar(false);
    }

    adicionar(files) {
      const novas = [...files].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
      novas.forEach((file) => this.itens.push({ file, preview: URL.createObjectURL(file) }));
      if (novas.length) this.marcar(true);
    }

    remover(i) {
      const [it] = this.itens.splice(i, 1);
      if (it.path) this.removidas.push(it.path);
      if (it.preview) URL.revokeObjectURL(it.preview);
      this.marcar(true);
    }

    mover(de, para) {
      if (para < 0 || para >= this.itens.length || de === para) return;
      const [it] = this.itens.splice(de, 1);
      this.itens.splice(para, 0, it);
      this.marcar(true);
    }

    marcar(pendente) {
      this.pendente = pendente;
      this.render();
      this.aoMudar?.(pendente);
    }

    render() {
      const n = this.itens.length;
      this.grid.innerHTML = this.itens.map((it, i) => `
        <figure class="foto${i === 0 ? ' is-capa' : ''}${it.file ? ' is-nova' : ''}" data-i="${i}">
          <img src="${esc(it.preview || fotoUrl(it.path))}" alt="Foto ${i + 1}">
          ${i === 0 ? '<span class="foto-tag">Capa</span>' : it.file ? '<span class="foto-tag nova">Nova</span>' : ''}
          <div class="foto-acoes">
            <button type="button" data-a="esq" aria-label="Mover para a esquerda" ${i === 0 ? 'disabled' : ''}>‹</button>
            ${i === 0 ? '' : '<button type="button" data-a="capa" title="Usar como capa" aria-label="Usar como capa">★</button>'}
            <button type="button" data-a="dir" aria-label="Mover para a direita" ${i === n - 1 ? 'disabled' : ''}>›</button>
            <button type="button" data-a="remover" class="perigo" aria-label="Remover foto">✕</button>
          </div>
        </figure>`).join('');
    }

    // Envia as fotos novas e devolve a lista final de caminhos e as que devem ser apagadas depois
    async enviar(produtoId, progresso) {
      const novas = this.itens.filter((it) => it.file);
      let feitas = 0;
      for (const it of novas) {
        progresso?.(feitas + 1, novas.length);
        const { blob, tipo, ext } = await prepararFoto(it.file);
        const path = `${produtoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: tipo, cacheControl: '31536000' });
        if (error) throw new Error(`Falha ao enviar "${it.file.name}": ${error.message}`);
        URL.revokeObjectURL(it.preview);
        delete it.file;
        delete it.preview;
        it.path = path;
        feitas++;
      }
      return { paths: this.itens.map((it) => it.path), removidas: [...this.removidas] };
    }

    // chamado depois que o banco foi atualizado
    concluir() {
      this.removidas = [];
      this.marcar(false);
    }
  }

  async function apagarArquivos(paths) {
    if (!paths.length) return;
    const { error } = await sb.storage.from(BUCKET).remove(paths);
    if (error) console.warn('Fotos não apagadas do armazenamento:', error.message);
  }

  // ------------------------------------------------------------------ login
  async function entrar(session) {
    if (!session) return mostrarTela('tela-login');
    const { data, error } = await sb.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (error || !data) {
      await sb.auth.signOut();
      mostrarErro($('#login-erro'), 'Este usuário não tem acesso ao painel.');
      return mostrarTela('tela-login');
    }
    $('#usuario').textContent = session.user.email;
    mostrarTela('tela-painel');
    abrirAba(location.hash.slice(1));
    await carregarProdutos();
  }

  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const btn = $('button[type=submit]', form);
    mostrarErro($('#login-erro'), '');
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    const { data, error } = await sb.auth.signInWithPassword({ email: form.email.value.trim(), password: form.senha.value });
    btn.disabled = false;
    btn.textContent = 'Entrar';
    if (error) return mostrarErro($('#login-erro'), 'E-mail ou senha incorretos.');
    form.senha.value = '';
    entrar(data.session);
  });

  $('#sair').addEventListener('click', async () => {
    if (temPendencias() && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
    await sb.auth.signOut();
    mostrarTela('tela-login');
  });

  // ------------------------------------------------------------------ abas
  function abrirAba(aba) {
    if (!ABAS.includes(aba)) aba = 'produtos';
    $$('[role=tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.aba === aba));
    $$('.adm-aba').forEach((s) => { s.hidden = s.id !== `aba-${aba}`; });
    history.replaceState(null, '', `#${aba}`);
    scrollTo({ top: 0 });
  }
  $$('[role=tab]').forEach((b) => b.addEventListener('click', () => abrirAba(b.dataset.aba)));
  $$('[data-ir]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.ir === 'cadastrar' && !descartarForm()) return;
    if (b.dataset.ir === 'cadastrar') limparForm();
    abrirAba(b.dataset.ir);
  }));

  // ------------------------------------------------------------------ lista
  const selCategoria = $('#filtro-categoria');
  const selCidade = $('#filtro-cidade');
  Object.entries(CATEGORIAS).forEach(([v, t]) => selCategoria.add(new Option(t, v)));
  Object.entries(CIDADES).forEach(([v, t]) => selCidade.add(new Option(t, v)));
  [$('#busca'), selCategoria, selCidade].forEach((el) => el.addEventListener('input', renderLista));

  async function carregarProdutos() {
    const { data, error } = await sb.from('produtos').select('*').order('criado_em', { ascending: false });
    if (error) return toast(`Não foi possível carregar os produtos: ${error.message}`, true);
    produtos = data;
    renderLista();
    renderSelectFotos();
  }

  function renderLista() {
    const busca = semAcento($('#busca').value.trim());
    const lista = produtos.filter((p) =>
      (!busca || semAcento(p.nome).includes(busca))
      && (!selCategoria.value || p.categoria === selCategoria.value)
      && (!selCidade.value || p.cidade === selCidade.value));

    $('#contagem').textContent = produtos.length
      ? `${lista.length} de ${produtos.length} produto${produtos.length > 1 ? 's' : ''}`
      : '';
    $('#lista').innerHTML = lista.length ? lista.map((p) => {
      const detalhes = [p.capacidade, p.cor, p.bateria != null ? `Bateria ${p.bateria}%` : ''].filter(Boolean).map(esc).join(' · ');
      return `
        <article class="adm-item${p.visivel ? '' : ' is-oculto'}" data-id="${p.id}">
          <div class="adm-thumb">${p.fotos[0]
            ? `<img src="${esc(fotoUrl(p.fotos[0]))}" alt="" loading="lazy">`
            : '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-phone"/></svg>'}</div>
          <div class="adm-item-info">
            <h3>${esc(p.nome)}</h3>
            <p class="tags">
              <span>${CATEGORIAS[p.categoria]}</span>
              <span class="cond-${p.condicao}">${CONDICOES[p.condicao]}</span>
              <span>${esc(p.cidade)}</span>
            </p>
            ${detalhes ? `<p class="sub">${detalhes}</p>` : ''}
            <p class="preco">${p.preco != null ? fmt(p.preco) : 'Consulte o valor'}</p>
          </div>
          <label class="switch" title="Mostrar no site">
            <input type="checkbox" data-acao="visivel" ${p.visivel ? 'checked' : ''}>
            <span>${p.visivel ? 'No site' : 'Oculto'}</span>
          </label>
          <div class="adm-item-acoes">
            <button class="btn btn-ghost btn-sm" type="button" data-acao="editar">Editar</button>
            <button class="btn btn-ghost btn-sm" type="button" data-acao="fotos">Fotos (${p.fotos.length})</button>
            <button class="btn btn-ghost btn-sm perigo" type="button" data-acao="excluir">Excluir</button>
          </div>
        </article>`;
    }).join('') : `<p class="adm-vazio">${produtos.length ? 'Nenhum produto com esses filtros.' : 'Nenhum produto cadastrado ainda. Clique em "+ Novo produto" para começar.'}</p>`;
  }

  $('#lista').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-acao]');
    if (!btn || btn.dataset.acao === 'visivel') return;
    const p = produtos.find((x) => x.id === btn.closest('.adm-item').dataset.id);
    if (!p) return;
    if (btn.dataset.acao === 'editar') {
      if (!descartarForm()) return;
      preencherForm(p);
      abrirAba('cadastrar');
    } else if (btn.dataset.acao === 'fotos') {
      abrirAba('fotos');
      escolherProdutoFotos(p.id);
    } else if (btn.dataset.acao === 'excluir') {
      if (!confirm(`Excluir "${p.nome}"? As fotos dele também serão apagadas.`)) return;
      btn.disabled = true;
      const { error } = await sb.from('produtos').delete().eq('id', p.id);
      if (error) { btn.disabled = false; return toast(`Não foi possível excluir: ${error.message}`, true); }
      await apagarArquivos(p.fotos);
      if (editando?.id === p.id) limparForm();
      if (fotosProdutoId === p.id) escolherProdutoFotos('');
      toast('Produto excluído.');
      carregarProdutos();
    }
  });

  $('#lista').addEventListener('change', async (e) => {
    if (e.target.dataset.acao !== 'visivel') return;
    const input = e.target;
    const p = produtos.find((x) => x.id === input.closest('.adm-item').dataset.id);
    input.disabled = true;
    const { error } = await sb.from('produtos').update({ visivel: input.checked }).eq('id', p.id);
    input.disabled = false;
    if (error) {
      input.checked = !input.checked;
      return toast(`Não foi possível alterar: ${error.message}`, true);
    }
    p.visivel = input.checked;
    toast(p.visivel ? 'Produto aparecendo no site.' : 'Produto escondido do site.');
    renderLista();
  });

  // ------------------------------------------------------------------ cadastro / edição
  const form = $('#form-produto');
  let editando = null; // produto em edição, ou null para um novo
  let novoId = crypto.randomUUID(); // id do produto novo (as fotos são enviadas para a pasta dele)
  let formMudou = false;
  const fotosForm = new EditorFotos($('#fotos-form'));

  function chips(el, nome, opcoes) {
    el.innerHTML = Object.entries(opcoes).map(([v, t]) =>
      `<label class="chip"><input type="radio" name="${nome}" value="${esc(v)}" required><span>${esc(t)}</span></label>`).join('');
  }
  chips($('#op-categoria'), 'categoria', CATEGORIAS);
  chips($('#op-condicao'), 'condicao', CONDICOES);
  chips($('#op-cidade'), 'cidade', CIDADES);

  function atualizarCampos() {
    const categoria = form.categoria.value;
    const condicao = form.condicao.value;
    const mostrar = {
      celular: CELULARES.includes(categoria),
      bateria: CELULARES.includes(categoria) && condicao !== 'novo',
      defeito: condicao === 'com_defeito',
    };
    $$('[data-so]', form).forEach((el) => { el.hidden = !mostrar[el.dataset.so]; });
  }
  form.addEventListener('input', () => { formMudou = true; atualizarCampos(); });
  form.addEventListener('change', atualizarCampos);

  function limparForm() {
    editando = null;
    novoId = crypto.randomUUID();
    form.reset();
    form.categoria.value = 'iphone';
    form.condicao.value = 'novo';
    form.cidade.value = 'Ijuí';
    fotosForm.carregar([]);
    $('#form-titulo').textContent = 'Cadastrar produto';
    $('#form-salvar').textContent = 'Salvar produto';
    $('#form-cancelar').hidden = true;
    mostrarErro($('#form-erro'), '');
    formMudou = false;
    atualizarCampos();
  }

  function preencherForm(p) {
    limparForm();
    editando = p;
    form.categoria.value = p.categoria;
    form.nome.value = p.nome;
    form.condicao.value = p.condicao;
    form.cidade.value = p.cidade;
    form.capacidade.value = p.capacidade ?? '';
    form.cor.value = p.cor ?? '';
    form.bateria.value = p.bateria ?? '';
    form.defeito.value = p.defeito ?? '';
    form.descricao.value = p.descricao ?? '';
    form.preco.value = p.preco != null ? Number(p.preco).toFixed(2).replace('.', ',') : '';
    form.visivel.checked = p.visivel;
    fotosForm.carregar(p.fotos);
    $('#form-titulo').textContent = 'Editar produto';
    $('#form-salvar').textContent = 'Salvar alterações';
    $('#form-cancelar').hidden = false;
    formMudou = false;
    atualizarCampos();
  }

  function descartarForm() {
    if (!formMudou && !fotosForm.pendente) return true;
    return confirm('O formulário tem alterações não salvas. Descartar?');
  }

  $('#form-cancelar').addEventListener('click', () => {
    if (!descartarForm()) return;
    limparForm();
    abrirAba('produtos');
  });

  // "3.499,90", "3499.90" ou "3499" → 3499.9; vazio → null
  function lerPreco(txt) {
    let t = txt.trim().replace(/[R$\s]/g, '');
    if (!t) return null;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const erro = $('#form-erro');
    mostrarErro(erro, '');
    const categoria = form.categoria.value;
    const condicao = form.condicao.value;
    const celular = CELULARES.includes(categoria);
    const preco = lerPreco(form.preco.value);
    const bateria = form.bateria.value.trim();

    if (!form.nome.value.trim()) return mostrarErro(erro, 'Digite o nome do produto.');
    if (condicao === 'com_defeito' && !form.defeito.value.trim()) return mostrarErro(erro, 'Descreva qual é o problema do aparelho.');
    if (Number.isNaN(preco)) return mostrarErro(erro, 'Preço inválido. Use, por exemplo, 3.499,90.');
    if (celular && condicao !== 'novo' && bateria && !(+bateria >= 0 && +bateria <= 100)) return mostrarErro(erro, 'A saúde da bateria deve ser de 0 a 100.');

    const dados = {
      categoria,
      nome: form.nome.value.trim(),
      condicao,
      cidade: form.cidade.value,
      capacidade: celular ? form.capacidade.value.trim() || null : null,
      cor: form.cor.value.trim() || null,
      bateria: celular && condicao !== 'novo' && bateria ? Math.round(+bateria) : null,
      defeito: condicao === 'com_defeito' ? form.defeito.value.trim() : null,
      descricao: form.descricao.value.trim() || null,
      preco,
      visivel: form.visivel.checked,
    };

    const btn = $('#form-salvar');
    const textoBtn = btn.textContent;
    btn.disabled = true;
    try {
      const id = editando ? editando.id : novoId;
      const { paths, removidas } = await fotosForm.enviar(id, (i, n) => { btn.textContent = `Enviando foto ${i} de ${n}…`; });
      btn.textContent = 'Salvando…';
      const { error } = editando
        ? await sb.from('produtos').update({ ...dados, fotos: paths }).eq('id', id)
        : await sb.from('produtos').insert({ id, ...dados, fotos: paths });
      if (error) throw new Error(error.message);
      await apagarArquivos(removidas);
      fotosForm.concluir();
      toast(editando ? 'Alterações salvas.' : 'Produto cadastrado.');
      limparForm(); // também volta o texto do botão
      await carregarProdutos();
      abrirAba('produtos');
    } catch (err) {
      btn.textContent = textoBtn;
      mostrarErro(erro, `Não foi possível salvar: ${err.message}`);
    } finally {
      btn.disabled = false;
    }
  });

  // ------------------------------------------------------------------ aba fotos
  const selFotos = $('#fotos-produto');
  let fotosProdutoId = '';
  const fotosAba = new EditorFotos($('#fotos-aba'), (pendente) => { $('#fotos-pendente').hidden = !pendente; });

  function renderSelectFotos() {
    selFotos.length = 1;
    produtos.forEach((p) => selFotos.add(new Option(`${p.nome} · ${p.cidade} (${p.fotos.length} foto${p.fotos.length === 1 ? '' : 's'})`, p.id)));
    if (!produtos.some((p) => p.id === fotosProdutoId)) fotosProdutoId = '';
    selFotos.value = fotosProdutoId;
    if (fotosProdutoId && !fotosAba.pendente) fotosAba.carregar(produtos.find((p) => p.id === fotosProdutoId).fotos);
    $('#fotos-aba').hidden = $('#fotos-acoes').hidden = !fotosProdutoId;
  }

  function escolherProdutoFotos(id) {
    if (id !== fotosProdutoId && fotosAba.pendente && !confirm('As fotos deste produto têm alterações não salvas. Descartar?')) {
      selFotos.value = fotosProdutoId;
      return;
    }
    fotosProdutoId = id;
    selFotos.value = id;
    const p = produtos.find((x) => x.id === id);
    fotosAba.carregar(p ? p.fotos : []);
    mostrarErro($('#fotos-erro'), '');
    $('#fotos-aba').hidden = $('#fotos-acoes').hidden = !p;
  }
  selFotos.addEventListener('change', () => escolherProdutoFotos(selFotos.value));

  $('#fotos-salvar').addEventListener('click', async () => {
    const btn = $('#fotos-salvar');
    const id = fotosProdutoId;
    mostrarErro($('#fotos-erro'), '');
    btn.disabled = true;
    try {
      const { paths, removidas } = await fotosAba.enviar(id, (i, n) => { btn.textContent = `Enviando foto ${i} de ${n}…`; });
      btn.textContent = 'Salvando…';
      const { error } = await sb.from('produtos').update({ fotos: paths }).eq('id', id);
      if (error) throw new Error(error.message);
      await apagarArquivos(removidas);
      fotosAba.concluir();
      toast('Fotos salvas.');
      await carregarProdutos();
    } catch (err) {
      mostrarErro($('#fotos-erro'), `Não foi possível salvar as fotos: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Salvar fotos';
    }
  });

  // ------------------------------------------------------------------ início
  function temPendencias() {
    return formMudou || fotosForm.pendente || fotosAba.pendente;
  }
  addEventListener('beforeunload', (e) => { if (temPendencias()) e.preventDefault(); });

  limparForm();
  sb.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') mostrarTela('tela-login');
  });
  sb.auth.getSession().then(({ data }) => entrar(data.session));
}
