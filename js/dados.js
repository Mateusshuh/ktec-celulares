/*
 * Dados da loja e da vitrine.
 * Para atualizar o site, basta editar este arquivo:
 *  - "preco": deixe null para mostrar "Consulte o valor", ou coloque um número (ex.: 7999)
 *  - "cores": nome da cor, cor da bolinha (hex) e foto do aparelho (fotos em assets/produtos/)
 *  - para tirar um modelo da vitrine, apague o bloco dele; para voltar, copie um bloco e troque os dados
 */
window.KTEC = {
  loja: {
    nome: 'KTEC Celulares',
    whatsapp: '5555991778500',
    whatsappExibicao: '(55) 99177-8500',
    instagram: 'ktecijui',
    facebook: 'ktecijui',
    endereco: 'Rua Bento Gonçalves, 366 · Sala 8',
    cidade: 'Ijuí · RS',
    mapa: 'Rua Bento Gonçalves, 366, Ijuí - RS',
    parcelas: 21,
  },

  produtos: [
    // ---------- Novos
    {
      nome: 'iPhone 18 Pro Max', categoria: 'novo', selo: 'Lançamento', preco: null,
      capacidades: ['256 GB', '512 GB', '1 TB', '2 TB'],
      cores: [
        { nome: 'Bordô', hex: '#5b2331', foto: 'assets/produtos/iphone-18-pro-max-burgundy.png' },
        { nome: 'Glacial', hex: '#bcd0e2', foto: 'assets/produtos/iphone-18-pro-max-glacier.png' },
        { nome: 'Prateado', hex: '#dcdcde', foto: 'assets/produtos/iphone-18-pro-max-silver.png' },
        { nome: 'Preto', hex: '#2a2a2d', foto: 'assets/produtos/iphone-18-pro-max-black.png' },
      ],
    },
    {
      nome: 'iPhone 18 Pro', categoria: 'novo', selo: 'Lançamento', preco: null,
      capacidades: ['256 GB', '512 GB', '1 TB'],
      cores: [
        { nome: 'Bordô', hex: '#5b2331', foto: 'assets/produtos/iphone-18-pro-burgundy.png' },
        { nome: 'Glacial', hex: '#bcd0e2', foto: 'assets/produtos/iphone-18-pro-glacier.png' },
        { nome: 'Prateado', hex: '#dcdcde', foto: 'assets/produtos/iphone-18-pro-silver.png' },
        { nome: 'Preto', hex: '#2a2a2d', foto: 'assets/produtos/iphone-18-pro-black.png' },
      ],
    },
    {
      nome: 'iPhone Air', categoria: 'novo', preco: null,
      capacidades: ['256 GB', '512 GB', '1 TB'],
      cores: [
        { nome: 'Azul-céu', hex: '#c6d8e8', foto: 'assets/produtos/iphone-air-skyblue.png' },
        { nome: 'Dourado-claro', hex: '#e8dbc0', foto: 'assets/produtos/iphone-air-lightgold.png' },
        { nome: 'Branco-nuvem', hex: '#efeee9', foto: 'assets/produtos/iphone-air-cloudwhite.png' },
        { nome: 'Preto-espacial', hex: '#232326', foto: 'assets/produtos/iphone-air-spaceblack.png' },
      ],
    },
    {
      nome: 'iPhone 17', categoria: 'novo', preco: null,
      capacidades: ['256 GB', '512 GB'],
      cores: [
        { nome: 'Sálvia', hex: '#a6b399', foto: 'assets/produtos/iphone-17-sage.png' },
        { nome: 'Lavanda', hex: '#c8b8dc', foto: 'assets/produtos/iphone-17-lavender.png' },
        { nome: 'Azul-névoa', hex: '#9fb4c9', foto: 'assets/produtos/iphone-17-mistblue.png' },
        { nome: 'Branco', hex: '#f1f1ef', foto: 'assets/produtos/iphone-17-white.png' },
        { nome: 'Preto', hex: '#2a2a2d', foto: 'assets/produtos/iphone-17-black.png' },
      ],
    },

    // ---------- Seminovos
    {
      nome: 'iPhone 16 Pro', categoria: 'seminovo', preco: null,
      capacidades: ['128 GB', '256 GB'],
      cores: [
        { nome: 'Titânio-deserto', hex: '#bfa28c', foto: 'assets/produtos/iphone-16-pro-deserttitanium.png' },
        { nome: 'Titânio natural', hex: '#c1bbb0', foto: 'assets/produtos/iphone-16-pro-naturaltitanium.png' },
        { nome: 'Titânio branco', hex: '#e8e6e2', foto: 'assets/produtos/iphone-16-pro-whitetitanium.png' },
        { nome: 'Titânio preto', hex: '#3a393b', foto: 'assets/produtos/iphone-16-pro-blacktitanium.png' },
      ],
    },
    {
      nome: 'iPhone 15', categoria: 'seminovo', preco: null,
      capacidades: ['128 GB', '256 GB'],
      cores: [
        { nome: 'Rosa', hex: '#efd1d7', foto: 'assets/produtos/iphone-15-pink.png' },
        { nome: 'Azul', hex: '#d2dfe7', foto: 'assets/produtos/iphone-15-blue.png' },
        { nome: 'Verde', hex: '#d7e2cd', foto: 'assets/produtos/iphone-15-green.png' },
        { nome: 'Preto', hex: '#2a2a2d', foto: 'assets/produtos/iphone-15-black.png' },
      ],
    },
  ],
};
