'use client';

// =============================================================================
// KitImagem — slot 1:1 do kit + LIGHTBOX (KIT-IMG-LANDING / T2).
//
// Fonte ÚNICA da imagem de kit nas duas superfícies: seção de kits da página de
// vendas (server) e detalhe do kit no checkout (client). A resolução da cascata
// (real → mock preview → placeholder Leela) fica em `lib/kitImagem.ts`; aqui só
// APRESENTA a `src` já resolvida — dimensão intrínseca 1:1 (zero CLS), alt real,
// lazy por padrão.
//
// Ampliação (pedido do Vitor: "clicar e visualizar o kit em imagem aumentada"):
// quando a imagem é FOTO (`ampliavel`), o slot vira um <button> que abre o
// Dialog RADIX-FREE do DS (ADR-017 — REUSO, não lightbox próprio), com foco no
// X, retorno de foco ao botão, Esc/overlay/X para fechar e scroll travado (tudo
// no `useDialogBehavior` do DS). No mobile o Dialog é bottom-sheet e a imagem é
// `object-contain` com teto de viewport — cabe na tela. O PLACEHOLDER padrão
// Leela não é ampliável (wordmark não tem o que ampliar) → renderiza estático.
// =============================================================================

import { useRef, useState } from 'react';
import { ZoomIn } from 'lucide-react';
import { Dialog } from '@leela/design-system/dialog';

/** Dimensão intrínseca 1:1 dos assets de kit (fotos 800×800 / SVG 1:1). */
const LADO = 800;

export function KitImagem({
  src,
  alt,
  ampliavel,
  className,
  priority = false,
}: {
  src: string;
  /** Alt descritivo real do kit (ex.: "Kit Ouro"). */
  alt: string;
  /** FOTO (real/mock) → abre lightbox; placeholder brandado → estático. */
  ampliavel: boolean;
  /** Classe do contêiner quadrado (sizing por superfície). */
  className?: string;
  /** Acima da dobra → eager; o resto fica lazy. */
  priority?: boolean;
}): React.JSX.Element {
  const [aberto, setAberto] = useState(false);
  const botaoRef = useRef<HTMLButtonElement | null>(null);

  const img = (
    <img
      src={src}
      alt={alt}
      width={LADO}
      height={LADO}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className="h-full w-full object-cover"
    />
  );

  const contorno = `aspect-square w-full overflow-hidden rounded-ds-md border border-border-subtle bg-surface-sunken ${className ?? ''}`;

  // Placeholder Leela: nada a ampliar → estático (sem botão, sem lightbox).
  if (!ampliavel) {
    return <div className={contorno}>{img}</div>;
  }

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto(true)}
        aria-label={`Ampliar imagem do ${alt}`}
        className={`group relative block cursor-zoom-in ${contorno} transition-shadow hover:shadow-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus`}
      >
        {img}
        {/* Affordance de ampliar — decorativa, só reforça o cursor-zoom */}
        <span
          aria-hidden
          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-ds-sm bg-surface-base/70 text-text-primary opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <ZoomIn size={16} strokeWidth={2} />
        </span>
      </button>

      <Dialog
        open={aberto}
        onOpenChange={setAberto}
        title={alt}
        description="Toque fora, Esc ou o X para fechar."
        returnFocusRef={botaoRef}
        panelClassName="w-full max-w-xl"
        bodyClassName="p-0 sm:p-0"
      >
        {/* object-contain + teto de viewport: a imagem cabe na tela (mobile digno) */}
        <img
          src={src}
          alt={alt}
          width={LADO}
          height={LADO}
          decoding="async"
          className="mx-auto max-h-[75vh] w-full rounded-b-ds-lg object-contain sm:rounded-b-ds-lg"
        />
      </Dialog>
    </>
  );
}
