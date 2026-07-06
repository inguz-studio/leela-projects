# LEELA Design System — Showroom

Vitrine estática e navegável do design system, construída com os próprios componentes do DS (AppShell, Sidebar, PageHeader, Cards, Table, Modal, Toast…), na identidade brasa, com troca ao vivo para o tema leela.

## Rodar

Na raiz do pacote (`packages/design-system`):

```bash
# desenvolvimento (servidor local; sem fast-refresh — recarrega a página ao salvar)
npm run showcase

# build estático + abrir
npm run showcase:build
start showcase/dist/index.html      # Windows; ou dê duplo clique no arquivo
```

O build usa `base: './'`, então `showcase/dist/index.html` abre direto do disco, sem servidor. Também dá para servir com `npm run showcase:preview`.

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
