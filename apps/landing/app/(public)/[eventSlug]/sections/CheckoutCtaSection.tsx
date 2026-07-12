import { Suspense } from 'react';
import type { EventoPublico } from '@/lib/tipos';
import { formatarPreco } from '@/lib/formato';
import { CtaInscricao } from '../CtaInscricao';
import { CtaFallback } from '../CtaFallback';

/**
 * Seção "checkout" (config sempre travada+ativa — invariante S300). Na
 * superfície pública ela materializa o BLOCO de conversão que leva ao checkout
 * de 5 etapas (S1203, próximo lote). Aqui é só o CTA + preço vigente; o cálculo
 * do pedido é do checkout, não reimplementado.
 */
export function CheckoutCtaSection({ evento }: { evento: EventoPublico }): React.JSX.Element {
  const aberta = evento.estadoVenda === 'aberto';

  return (
    <section className="border-t border-border-subtle bg-surface-base">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-text-primary">
          {aberta ? 'Pronto para largar?' : 'Fique de olho na próxima edição'}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">
          {aberta
            ? 'Garanta sua vaga em poucos passos — sem criar conta. Você escolhe o percurso e o kit na hora.'
            : 'As inscrições deste evento estão encerradas. Salve o link para acompanhar novidades.'}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Suspense fallback={<CtaFallback slug={evento.slug} disabled={!aberta} estado={evento.estadoVenda} />}>
            <CtaInscricao slug={evento.slug} disabled={!aberta} estado={evento.estadoVenda} />
          </Suspense>
          {aberta && evento.precoMinimo !== null ? (
            <p className="text-sm text-text-secondary">
              inscrições a partir de{' '}
              <span className="font-semibold text-text-primary">
                {formatarPreco(evento.precoMinimo)}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
