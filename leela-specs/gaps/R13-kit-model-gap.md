# Lacuna de modelo — visão de kit no checkout (para o lote R9-C)

trace: leela-build-2d6ee98d · lote: LEELA-R13 (checkout) · registrado por: sf-frontend-engineer

## Contexto
O adendo 10 do Vitor pediu, no checkout, a **visão do kit**: descrição do que
está incluso e imagem, com hierarquia de H's/textos. O R13 entregou isso na UI
(`checkout/KitDetalhe.tsx` + `checkout/kitDetalhe.ts`), mas o modelo de dados
não suporta esses campos hoje.

## A lacuna
O shape público `KitPublico` (`apps/landing/lib/tipos.ts`) e o doc
`eventos/{id}/kits/{kitId}` expõem apenas:

```
{ id, nome, preco, modalidades, capacidade }
```

Faltam, para a visão de compra:
- `descricao: string` — frase que posiciona o kit.
- `itens: string[]` — "o que está incluso".
- `imagemUrl: string | null` — imagem 1:1 do kit (upload real).

## O que o R13 fez (sem tocar core/lib)
- Catálogo DEMO app-side em `checkout/kitDetalhe.ts`, chaveado pelo enum
  canônico do kit (`kit_ouro`/`kit_prata`/`kit_basico`/`sem_kit`). Texto honesto
  de kit de corrida de rua; substituível pelo dado real sem mudar a UI.
- Imagem = **slot 1:1 mock** (placeholder digno, gradiente + ícone), pois o
  upload real é do R9-C. `imagemUrl` nunca é fabricada — quando `null`, mostra o
  placeholder.

## Pedido ao R9-C / R9-E (fora do território do R13)
1. Estender o modelo do kit no core + projeção no leitor (`lib/leitor.ts`) com
   `descricao`, `itens`, `imagemUrl`.
2. Upload 1:1 real da imagem do kit (mesmo padrão do upload de capa do R7).
3. Ao chegar o modelo real, trocar `detalheDoKit` (catálogo demo) por leitura
   direta dos campos do `KitPublico` — a UI que consome (`KitDetalhe.tsx`) não
   muda.

## Nota correlata (adendo 11)
O adendo 11 pede campo de imagem 1:1 para **patrocinadores/organizador**
(logo do clube na própria página). É a mesma primitiva de upload 1:1; vale
tratar junto no R9-C. Fora do território do R13 (checkout).
