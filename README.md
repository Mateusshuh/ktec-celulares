# KTEC Celulares

Site da KTEC, loja e assistência de celulares em Ijuí/RS: lançamento do iPhone 18 Pro, vitrine de iPhones novos e seminovos, assistência técnica e contato.

No topo, o iPhone da foto se desmonta peça por peça conforme a página é rolada e se monta de novo ao voltar para o topo.

## Rodar localmente

É um site estático, sem build. Sirva a pasta com qualquer servidor, por exemplo:

```bash
npx serve .
```

## Onde editar

- `js/dados.js`: WhatsApp, endereço, Instagram e os produtos da vitrine (modelos, cores, fotos, capacidades e preço)
- `assets/produtos/`: fotos dos aparelhos
- `js/teardown.js`: animação do iPhone desmontando (abra o site com `?debug` para ver os recortes sobre a foto)
- `css/style.css`: cores e estilos

Apple, iPhone e as imagens dos produtos são marcas e propriedade da Apple Inc.
