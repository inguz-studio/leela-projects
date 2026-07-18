import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { baseUrl } from '../lib/seo';
import './globals.css';

export const metadata: Metadata = {
  // Origem canônica para resolver URLs relativas de canonical/OG (S1205-T1).
  // Placeholder por env até o domínio real ser fixado (ação externa).
  metadataBase: new URL(baseUrl()),
  title: {
    default: 'Leela — inscrições para corridas',
    template: '%s · Leela',
  },
  description:
    'A plataforma onde você encontra corridas de rua, escolhe seu percurso e garante sua inscrição em minutos.',
};

/**
 * Root layout público.
 *
 * TEMA: a superfície pública casa com a identidade do painel — tema `brasa`
 * (DARK), aplicado de forma ESTÁTICA via `data-theme="brasa"` no <html>. O
 * seletor `[data-theme="brasa"]` do `themes/brasa.css` (importado no
 * globals.css) pinta os tokens ANTES do primeiro paint, sem JS e sem flash. O
 * `ThemeProvider` do DS é um Client Component (usa hooks +
 * document.documentElement) voltado a TROCA de tema em runtime; a superfície
 * pública tem tema fixo, então o atributo estático é o equivalente SSR-correto
 * (é exatamente o que o ThemeProvider faz por baixo). Isso mantém as páginas
 * como Server Components puros — dado e credencial ficam no servidor.
 */
export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="pt-BR" data-theme="brasa">
      <head>
        {/* Tipografia oficial do DS (tema brasa): Exo 2 (display/ui) + JetBrains
            Mono. Carregada por <link> no <head> porque o `@import url(google)`
            em globals.css é DERRUBADO pelo pipeline de CSS do Next (não vira
            request, document.fonts fica vazio) — a LP caía no sans-serif do
            sistema. O <link> garante que a família "Exo 2" dos tokens
            (--font-family-display/ui) resolva de fato, na LP E no checkout.
            Pesos batem com os tokens: 400/500/600/700/800 + itálico. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700&family=JetBrains+Mono:wght@400;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
