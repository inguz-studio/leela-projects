/**
 * BrandLogo — wordmark oficial da Leela para o showroom.
 *
 * Escopo: showcase apenas — NÃO é componente do DS (mesma regra da ShowroomBar).
 * O painel já renderiza a marca com um `<img>` inline próprio (RootShell); NÃO
 * promovemos um `Brand`/`Logo` ao DS para não duplicar/derivar desse contrato.
 * Aqui basta o asset, mas com uma decisão que o painel não precisa: variante por
 * TEMA.
 *
 * Por que trocar por tema: o wordmark oficial é verde-limão (#C8E84A) sobre
 * transparente. Ele lê no `brasa` (surface-base = neutral-950, escuro), mas some
 * no `leela` (surface-base = neutral-50, claro). Então:
 *   - brasa → `leela-logo-brasa.svg`     (wordmark limão sobre transparente)
 *   - leela → `leela-logo-brasa-box.svg` (wordmark limão em caixa ameixa #2A1018,
 *                                          que carrega o próprio contraste)
 * Assim a marca lê bem nos DOIS temas sem valor cru nem CSS frágil.
 *
 * Assets vêm de `brand/` copiados para `showcase/public/` (caminho idiomático do
 * vite; `import.meta.env.BASE_URL` respeita o `base: './'` do build por duplo
 * clique). A11y: a marca é significativa (identidade), não puramente decorativa,
 * então `alt="Leela"` — mas NÃO é link no showroom (a navegação é a sidebar).
 */

import { cn, useTheme, type Theme } from '@leela/design-system';

const VARIANT_BY_THEME: Record<Theme, string> = {
  brasa: 'leela-logo-brasa.svg',
  leela: 'leela-logo-brasa-box.svg',
};

export interface BrandLogoProps {
  /** Classe extra (altura vem daqui; largura é sempre auto). */
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps): JSX.Element {
  const { theme } = useTheme();
  return (
    <img
      src={`${import.meta.env.BASE_URL}${VARIANT_BY_THEME[theme]}`}
      alt="Leela"
      data-slot="brand-logo"
      className={cn('w-auto', className)}
    />
  );
}

BrandLogo.displayName = 'BrandLogo';
