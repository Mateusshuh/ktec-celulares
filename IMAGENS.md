# Imagens do site

Cada foto já tem o espaço reservado na página, com um aviso dizendo qual foto entra ali.
Para trocar o aviso pela foto, basta salvar o arquivo **com o nome e na pasta indicados**. Não é preciso mexer no código.

Dicas gerais:
- Salve em **JPG** (fotos) ou **SVG/PNG com fundo transparente** (logos).
- Use a **proporção** indicada. O tamanho pode ser maior, mas a proporção precisa ser a mesma, senão a foto é cortada nas bordas.
- Comprima antes de subir (ex.: squoosh.app), mirando em até ~300 KB por foto.

## Fotos principais

| Arquivo | Pasta | Tamanho recomendado | Proporção | O que deve aparecer |
|---|---|---|---|---|
| `hero.jpg` | `assets/img/` | 1200 × 1600 px | 3:4 (em pé) | **Já está no site.** Interior da loja com o logo KTEC na parede. No computador aparece na metade direita do topo; no celular, ocupa o topo inteiro. |
| `iphones-novos.jpg` | `assets/img/` | 960 × 1280 px | 3:4 (mostrada inteira) | **Já está no site.** Prateleiras iluminadas com os iPhones expostos. |
| `xiaomi.jpg` | `assets/img/` | 900 × 1600 px | 9:16 (mostrada inteira) | **Já está no site.** POCO (Xiaomi) na mão, em frente ao neon da KTEC. |
| `jbl.jpg` | `assets/img/` | 960 × 1280 px | 3:4 (mostrada inteira) | **Já está no site.** Prateleiras com AirPods Max e fones JBL. |
| `acessorios.jpg` | `assets/img/` | 960 × 1280 px | 3:4 (mostrada inteira) | **Já está no site.** Parede de capinhas coloridas, com fones nas prateleiras ao lado. |
| `assistencia.jpg` | `assets/img/` | 1200 × 1600 px | 3:4 (mostrada inteira) | **Já está no site.** iPad com a tela trincada em frente à fachada da KTEC. |
| `equipe.jpg` | `assets/` | 720 × 1280 px ou maior | 9:16 (é cortada para 4:5) | **Já está no site.** Equipe em frente à loja. Também é a imagem usada quando o link do site é compartilhado (WhatsApp, Facebook). |

## Antes e depois dos consertos

Galeria logo abaixo do bloco "Assistência". Ao rolar a página, as fotos passam para o lado. Todas em **3:4 (em pé)**, na pasta `assets/img/reparos/`.
Para trocar uma foto, salve com o mesmo nome. Para adicionar um conserto, copie um `<figure class="repair">` da seção "Antes e depois" no `index.html` (a galeria se ajusta sozinha).

| Arquivo | Tamanho | O que aparece |
|---|---|---|
| `tampa-azul-antes.jpg` / `tampa-azul-depois.jpg` | 960 × 1280 px | iPhone 13 Pro azul: tampa traseira trincada e depois da troca. |
| `tampa-preta-antes.jpg` / `tampa-preta-depois.jpg` | 960 × 1280 px | iPhone preto: vidro traseiro estourado e depois da troca. |
| `tampa-nova-e-antiga.jpg` | 1200 × 1600 px | iPhone com a tampa nova ao lado da tampa estilhaçada, em frente ao logo da KTEC. |
| `bateria-nova.jpg` | 1200 × 1600 px | Saúde da bateria em 100%, com a bateria antiga ao lado. |

## Depoimentos

Os depoimentos são em texto (avaliações do Google). Cada card tem um círculo com as iniciais do cliente; se houver foto, ela aparece no lugar das iniciais.

| Arquivo | Pasta | Tamanho recomendado | O que deve aparecer |
|---|---|---|---|
| `thaynara.png` | `assets/img/depoimentos/` | 160 × 160 px (quadrada; a atual tem 72 × 72) | Foto de rosto da cliente Thaynara Dallafavera, centralizada (é recortada em círculo). |
| `fabiana.png` | `assets/img/depoimentos/` | 160 × 160 px (quadrada; a atual tem 72 × 72) | Foto de rosto da cliente Fabiana Kiefer, centralizada (é recortada em círculo). |
| `evelyn.png` | `assets/img/depoimentos/` | 160 × 160 px (quadrada; a atual tem 72 × 72) | Foto de rosto da cliente Evelyn Ariana Winter de Jezus, centralizada (é recortada em círculo). |
| `gran-vizzo.png` | `assets/img/depoimentos/` | 160 × 160 px (quadrada; a atual tem 72 × 72) | Logo da Gran Vizzo Espaço Óptico (empresa cliente), centralizado (é recortado em círculo). |

Para pôr foto em outro depoimento, copie a tag `<img>` do card da Thaynara para o card do cliente no `index.html`, trocando o arquivo e o `alt`. Para trocar ou adicionar depoimentos, edite a seção "Depoimentos" no `index.html`.

## Imagem de compartilhamento (opcional)

Hoje o site usa `assets/equipe.jpg` quando o link é compartilhado. Para uma prévia melhor, crie
`assets/img/og-ktec.jpg` em **1200 × 630 px** (logo da KTEC + foto da loja) e troque o
`og:image` no `<head>` do `index.html`, de preferência pelo endereço completo (ex.: `https://seudominio.com.br/assets/img/og-ktec.jpg`).
