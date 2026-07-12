import Link from 'next/link';
import { CTA_BASE, CTA_DISABLED, CTA_ENABLED, rotuloCta } from './ctaStyles';

/**
 * Fallback SSR do CTA (Suspense boundary de `CtaInscricao`). Render no servidor
 * SEM os parâmetros de atribuição — o `CtaInscricao` (cliente) reidrata e
 * enriquece o link com `?c=` etc. Visualmente idêntico ao CTA final.
 */
export function CtaFallback({
  slug,
  disabled,
  estado,
}: {
  slug: string;
  disabled: boolean;
  estado: 'aberto' | 'encerrado' | 'esgotado';
}): React.JSX.Element {
  if (disabled) {
    return (
      <span aria-disabled className={`${CTA_BASE} ${CTA_DISABLED}`}>
        {rotuloCta(estado)}
      </span>
    );
  }
  return (
    <Link href={`/${slug}/inscricao`} className={`${CTA_BASE} ${CTA_ENABLED}`}>
      {rotuloCta(estado)}
    </Link>
  );
}
