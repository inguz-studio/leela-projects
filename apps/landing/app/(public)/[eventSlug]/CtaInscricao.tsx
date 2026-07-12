'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ATRIBUICAO_KEYS, CTA_BASE, CTA_DISABLED, CTA_ENABLED, rotuloCta } from './ctaStyles';

/**
 * CTA "Garantir inscrição" que PRESERVA os parâmetros de atribuição da URL
 * (aceite S1201): lê a query atual e propaga `?c=` / cupom / utm_* para a rota
 * de checkout `/{slug}/inscricao`. Client Component (useSearchParams) atrás de
 * um Suspense na página — o restante do evento segue estático/ISR.
 *
 * Venda fechada (encerrada/esgotada) → CTA desabilitado com o rótulo do estado;
 * o conteúdo informativo da página permanece (S1201-T3).
 */
export function CtaInscricao({
  slug,
  disabled,
  estado,
}: {
  slug: string;
  disabled: boolean;
  estado: 'aberto' | 'encerrado' | 'esgotado';
}): React.JSX.Element {
  const params = useSearchParams();

  if (disabled) {
    return (
      <span aria-disabled className={`${CTA_BASE} ${CTA_DISABLED}`}>
        {rotuloCta(estado)}
      </span>
    );
  }

  const preservados = new URLSearchParams();
  for (const chave of ATRIBUICAO_KEYS) {
    const valor = params.get(chave);
    if (valor !== null && valor.length > 0) preservados.set(chave, valor);
  }
  const qs = preservados.toString();
  const href = `/${slug}/inscricao${qs.length > 0 ? `?${qs}` : ''}`;

  return (
    <Link href={href} className={`${CTA_BASE} ${CTA_ENABLED}`}>
      {rotuloCta(estado)}
    </Link>
  );
}
