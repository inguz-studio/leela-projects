import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Exo_2, JetBrains_Mono } from 'next/font/google';
import { baseUrl } from '../lib/seo';
import './globals.css';

// Tipografia oficial do DS (tema brasa) carregada e AUTO-HOSPEDADA por next/font
// — o `@import url(google)` em globals.css era DERRUBADO pelo pipeline de CSS do
// Next (document.fonts vazio ⇒ a LP/checkout caíam no sans-serif do sistema).
// next/font expõe variáveis CSS que os tokens --font-* passam a apontar
// (globals.css), então a família "Exo 2" dos tokens resolve DE FATO, sem <head>
// manual (que suprimia a injeção de CSS do Next). Pesos batem com os tokens.
const exo2 = Exo_2({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--leela-font-exo2',
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--leela-font-mono',
});

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
    <html
      lang="pt-BR"
      data-theme="brasa"
      className={`${exo2.variable} ${jetBrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
