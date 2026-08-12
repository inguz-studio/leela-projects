import { Suspense } from 'react';
import type { EventoPublico } from '@/lib/tipos';
import { formatarPreco } from '@/lib/formato';
import { CtaInscricao } from '../CtaInscricao';
import { CtaFallback } from '../CtaFallback';
import { Dobra } from './Dobra';

/**
 * Seção de lotes (S1201-T2): banda de urgência + CTA colado ao preço vigente
 * (cue da Shotgun — "CTA amarrado ao lote atual"). Não inventa preço de lote
 * futuro; comunica a mecânica ("sobe por lote") e mostra o valor vigente real.
 */
export function LotesSection({ evento }: { evento: EventoPublico }): React.JSX.Element {
  const aberta = evento.estadoVenda === 'aberto';

  return (
    <Dobra>
      <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <div className="max-w-xl">
          <h2 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
            {aberta ? 'Garanta o preço do lote atual' : 'Lotes encerrados'}
          </h2>
          <p className="mt-2 text-text-secondary">
            {aberta
              ? 'Os valores sobem a cada lote conforme a data e as vagas. Este é o preço vigente hoje.'
              : 'As vendas deste evento não estão mais abertas. As informações abaixo seguem disponíveis para consulta.'}
          </p>
          {aberta && evento.precoMinimo !== null ? (
            <p className="mt-3 text-lg">
              <span className="text-text-secondary">a partir de </span>
              <span className="font-display text-2xl font-extrabold text-text-brand">
                {formatarPreco(evento.precoMinimo)}
              </span>
              {/* A-5/CKFORM-T4: badge SÓ quando o evento repassa (RN-347). */}
              {evento.taxaRepassada ? (
                <span className="text-sm text-text-tertiary"> + Serviço</span>
              ) : null}
            </p>
          ) : null}
        </div>
        <Suspense fallback={<CtaFallback slug={evento.slug} disabled={!aberta} estado={evento.estadoVenda} />}>
          <CtaInscricao slug={evento.slug} disabled={!aberta} estado={evento.estadoVenda} />
        </Suspense>
      </div>
    </Dobra>
  );
}
