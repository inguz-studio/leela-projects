import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
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
 * TEMA (aceite S1200): o tema `leela` é aplicado de forma ESTÁTICA via
 * `data-theme="leela"` no <html> — o seletor `[data-theme="leela"]` do
 * `themes/leela.css` (importado no globals.css) pinta os tokens ANTES do
 * primeiro paint, sem JS e sem flash. O `ThemeProvider` do DS é um Client
 * Component (usa hooks + document.documentElement) voltado a TROCA de tema em
 * runtime; a superfície pública tem tema fixo, então o atributo estático é o
 * equivalente SSR-correto (é exatamente o que o ThemeProvider faz por baixo).
 * Isso mantém as páginas como Server Components puros — dado e credencial
 * ficam no servidor.
 */
export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="pt-BR" data-theme="leela">
      <body>{children}</body>
    </html>
  );
}
