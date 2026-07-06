# LEELA Design System — Showroom

Vitrine estática e navegável do design system, construída com os próprios componentes do DS (AppShell, Sidebar, PageHeader, Cards, Table, Modal, Toast…), na identidade brasa, com troca ao vivo para o tema leela.

## Rodar

Na raiz do pacote (`packages/design-system`):

```bash
# desenvolvimento (servidor local; sem fast-refresh — recarrega a página ao salvar)
npm run showcase

# build estático + abrir (1 comando serve o dist em http://localhost:4173)
npm run showcase:build && npm run showcase:preview
```

O build usa `base: './'` (assets relativos), mas Chrome e Edge bloqueiam ES modules carregados via `file://` — abrir o `dist/index.html` por duplo clique resulta em página em branco. Sirva por HTTP: `npm run showcase:preview` (dist) ou `npm run showcase` (dev).

## Auditoria interna (S4 · 2026-07-05)

Veredito do gate mds-ux-heuristics: **APPROVE** — 0 findings críticos.
Contraste AA nas superfícies do showroom (medido via Playwright, 2 temas): mínimo 5.29:1 (`--text-tertiary`/`--surface-base` em leela), pares primários entre 7.5:1 e 18.6:1. Toggle de tema muda `data-theme` e persiste após reload. Teclado: 11/11 elementos tabuláveis com foco visível, troca de rota via Tab+Enter. Zero erro de console e zero request falho servindo por HTTP.

## Estrutura

```
showcase/
├── index.html              # entrada (pt-BR, anti-FOUC de tema, zero request externo)
├── vite.config.ts          # root local, alias @leela/design-system → ../src/index.ts
├── tailwind.config.ts      # preset ../src/tailwind-preset + content absoluto
├── postcss.config.cjs      # tailwind (config local) + autoprefixer
└── src/
    ├── main.tsx            # ThemeProvider + TooltipProvider + ToastProvider
    ├── App.tsx             # AppShell + Sidebar própria + rotas por hash (#/inicio…)
    ├── ui.tsx              # Section / DemoCard / TokenLabel (sobre o Card do DS)
    ├── showcase.css        # importa themes/index.css + @tailwind base/components/utilities
    └── sections/
        ├── HomePage.tsx        # hero, contagens, marca em destaque
        ├── TokensPage.tsx      # rampas, semânticos, tipografia, spacing, radius, elevação, motion
        ├── ComponentsPage.tsx  # galeria interativa por categoria
        ├── IconsPage.tsx       # 8 ícones da nav default + amostra Lucide
        └── ThemesPage.tsx      # brasa × leela lado a lado
```

## Regras

- Zero token cru: cor, espaço, tipo, raio, sombra e motion sempre via `var(--token)` ou classes do preset do DS. Hex aparece apenas como texto informativo, lido dos JSON em `tokens/`.
- Zero `dark:` e zero request externo (sem CDN, sem Google Fonts — as famílias declaradas nos tokens usam fallback do sistema quando não instaladas).
- Tema via `data-theme` no `<html>`, persistido pelo ThemeProvider do DS na chave `leela-theme-preference`.
- Navegação por teclado funcional: itens interativos são `<a>`/`<button>` reais, foco visível herdado do DS.
