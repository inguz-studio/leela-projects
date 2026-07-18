'use client';

// =============================================================================
// KitDetalhe — a VISÃO do kit selecionado (LEELA-R13 · frente 7).
//
// Aparece sob o kit escolhido no Step de modalidade+kit: imagem 1:1 (slot mock,
// R9-C traz o upload real), descrição e "o que está incluso" com hierarquia de
// H's/textos do DS (pedido do Vitor: "as hierarquias de H's E TEXTOS não estão
// sendo aplicadas nos kits"). Sem preço aqui — o total vem do core (cotação).
// =============================================================================

import { Check, PackageOpen } from 'lucide-react';
import type { KitPublico } from '@/lib/tipos';
import { detalheDoKit } from './kitDetalhe';

/** Slot de imagem 1:1 do kit — imagem real quando existir, senão mock digno. */
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
  // Placeholder 1:1 mock (mesmo espírito da capa mock do R7): gradiente da
  // identidade brasa + ícone de apoio. Marcado como decorativo; o texto ao
  // lado carrega a informação.
  return (
    <div
      aria-hidden
      className="flex aspect-square w-full items-center justify-center rounded-ds-md border border-border-subtle bg-gradient-to-br from-[var(--surface-high)] to-[var(--surface-overlay)]"
    >
      <PackageOpen size={32} strokeWidth={1.5} className="text-text-brand" />
    </div>
  );
}

/**
 * Painel de detalhe do kit selecionado. `kit` é o KitPublico escolhido; a
 * visão (descrição/itens/imagem) vem de `detalheDoKit` (catálogo demo app-side
 * até o modelo real do R9-C).
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
