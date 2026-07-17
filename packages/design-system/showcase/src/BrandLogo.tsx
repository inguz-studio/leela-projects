/**
 * BrandLogo — wordmark oficial da Leela para o showroom.
 *
 * Escopo: showcase apenas — NÃO é componente do DS (mesma regra da ShowroomBar).
 * O painel já renderiza a marca com um `<img>` inline próprio (RootShell); NÃO
 * promovemos um `Brand`/`Logo` ao DS para não duplicar/derivar desse contrato.
 * Aqui basta o asset, mas com uma decisão que o painel não precisa: variante por
 * TEMA.
 *
 * Por que trocar por tema: a variante do wordmark é um RECOLOR do escrito (mesma
 * geometria, só muda o fill — sem caixa/fundo). O limão (#C8E84A) lê no `brasa`
 * (surface-base = neutral-950, escuro), mas some no tema claro; o vinho (#7A1520,
 * Oxblood) lê no claro (surface-base = neutral-50) e some no escuro. Então:
 *   - brasa → `leela-logo-brasa.svg`     (wordmark limão sobre transparente)
 *   - leela → `leela-wordmark-wine.svg`  (wordmark vinho sobre transparente)
 * Ambas transparentes: cada colorway carrega o próprio contraste contra o
 * surface do tema, sem caixa (a versão em caixa foi rejeitada — "parece um print").
 *
 * Assets vêm de `brand/` copiados para `showcase/public/` (caminho idiomático do
 * vite; `import.meta.env.BASE_URL` respeita o `base: './'` do build por duplo
 * clique). A11y: a marca é significativa (identidade), não puramente decorativa,
 * então `alt="Leela"` — mas NÃO é link no showroom (a navegação é a sidebar).
 */

import { cn, useTheme, type Theme } from '@leela/design-system';

const VARIANT_BY_THEME: Record<Theme, string> = {
  brasa: 'leela-logo-brasa.svg',
  leela: 'leela-wordmark-wine.svg',
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
