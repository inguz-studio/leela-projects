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
      <body>{children}</body>
    </html>
  );
}
