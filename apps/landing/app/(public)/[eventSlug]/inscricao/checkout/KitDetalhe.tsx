'use client';

// =============================================================================
// KitDetalhe — a VISÃO do kit selecionado (LEELA-R13 · frente 7 → R9-C).
//
// Aparece sob o kit escolhido no Step de modalidade+kit: imagem 1:1, descrição
// e "o que está incluso" com hierarquia de H's/textos do DS. R9-C: o dado vem
// do MODELO REAL (`KitPublico.descricao/itens/imagemUrl`) via `detalheDoKit`,
// que aplica o fallback mock rico campo a campo quando o organizador ainda não
// preencheu. Sem preço aqui — o total vem do core (cotação).
// =============================================================================

import { Check } from 'lucide-react';
import type { KitPublico } from '@/lib/tipos';
import { detalheDoKit } from './kitDetalheDados';

/**
 * Arte 1:1 MOCK do kit (R9-C — padrão capas R14: "sem dado → mock rico,
 * nunca vazio"). SVG INLINE de flat-lay (camiseta + medalha) para que os
 * tokens `var(--…)` do DS resolvam no DOM (L-011 — data-URI não resolve
 * tokens). Decorativa (`aria-hidden`); o texto ao lado carrega a informação.
 */
function ArteKitMock(): React.JSX.Element {
  return (
    <div
      aria-hidden
      className="aspect-square w-full overflow-hidden rounded-ds-md border border-border-subtle bg-gradient-to-br from-[var(--surface-high)] to-[var(--surface-overlay)]"
    >
      <svg viewBox="0 0 400 400" className="h-full w-full" role="presentation">
        <circle cx="330" cy="70" r="90" fill="var(--text-brand)" opacity="0.1" />
        <g transform="translate(60 88)">
          <path
            d="M70 0 L110 0 Q140 26 170 34 L156 78 L128 66 L128 176 Q90 190 52 176 L52 66 L24 78 L10 34 Q40 26 70 0 Z"
            fill="var(--surface-overlay)"
            stroke="var(--text-brand)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <rect x="62" y="96" width="56" height="40" rx="6" fill="var(--surface-sunken)" />
          <rect x="70" y="108" width="40" height="6" rx="3" fill="var(--text-tertiary)" />
          <rect x="70" y="120" width="28" height="6" rx="3" fill="var(--text-tertiary)" />
        </g>
        <g transform="translate(258 190)">
          <path d="M22 0 L46 0 L58 44 L10 44 Z" fill="var(--text-brand)" />
          <circle cx="34" cy="82" r="42" fill="var(--text-brand)" opacity="0.55" />
          <circle cx="34" cy="82" r="32" fill="var(--text-brand)" />
          <path
            d="M34 62 L40 76 L56 76 L44 86 L48 102 L34 92 L20 102 L24 86 L12 76 L28 76 Z"
            fill="var(--surface-sunken)"
          />
        </g>
      </svg>
    </div>
  );
}

/** Slot de imagem 1:1 do kit — imagem REAL quando existir, senão mock rico. */
function ImagemKit({ nome, imagemUrl }: { nome: string; imagemUrl: string | null }): React.JSX.Element {
  if (imagemUrl !== null && imagemUrl.length > 0) {
    return (
      <img
        src={imagemUrl}
        alt={`Kit ${nome}`}
        className="aspect-square w-full rounded-ds-md object-cover"
      />
    );
  }
  return <ArteKitMock />;
}

/**
 * Painel de detalhe do kit selecionado. `kit` é o KitPublico escolhido; a
 * visão (descrição/itens/imagem) vem de `detalheDoKit` — dado REAL do doc
 * (R9-C) com fallback mock rico campo a campo.
 */
export function KitDetalhe({ kit }: { kit: KitPublico }): React.JSX.Element {
  const detalhe = detalheDoKit(kit);

  return (
    <div className="mt-4 rounded-ds-md border border-border-subtle bg-surface-sunken p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="w-full shrink-0 sm:w-36">
          <ImagemKit nome={kit.nome} imagemUrl={detalhe.imagemUrl} />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="font-display text-base font-bold tracking-tight text-text-primary">
            {kit.nome}
          </h4>
          <p className="mt-1 text-sm text-text-secondary">{detalhe.descricao}</p>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            O que está incluso
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {detalhe.itens.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-text-primary">
                <Check
                  size={16}
                  strokeWidth={2.25}
                  aria-hidden
                  className="mt-0.5 shrink-0 text-feedback-success-fg"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
