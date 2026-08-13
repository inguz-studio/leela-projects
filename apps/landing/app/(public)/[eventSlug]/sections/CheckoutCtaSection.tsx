import { Suspense } from 'react';
import type { EventoPublico } from '@/lib/tipos';
import { formatarPreco } from '@/lib/formato';
import { CtaInscricao } from '../CtaInscricao';
import { CtaFallback } from '../CtaFallback';
import { Dobra } from './Dobra';

/**
 * Seção "checkout" (config sempre travada+ativa — invariante S300). Na
 * superfície pública ela materializa o BLOCO de conversão que leva ao checkout
 * de 5 etapas (S1203, próximo lote). Aqui é só o CTA + preço vigente; o cálculo
 * do pedido é do checkout, não reimplementado.
 */
export function CheckoutCtaSection({ evento }: { evento: EventoPublico }): React.JSX.Element {
  const aberta = evento.estadoVenda === 'aberto';

  return (
    <Dobra center className="relative isolate overflow-hidden">
      {/* Brilho de brasa (mesmo eixo dark, some em transparente) — fecha a
          página com ênfase deliberada, sem nenhuma linha na divisória. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background:var(--countdown-bg)]"
      />
      {/* S1254-T1 (rodada 2026-08-12-copy-landing · achados B2 e M5) · dois
          defeitos numa dobra só, e ela é servida a TODO evento com seções.
          "Largar" é o gesto de uma prova, e esta mesma dobra fecha a página do
          retiro de respiração. "Percurso" já tinha sido aposentado pela
          varredura S1218-T3 em `ModalidadesSection` e em `StepModalidadeKit`
          (D-0802-1 §3); esta ficou de fora, e a página falava duas línguas
          sobre a mesma escolha.

          O travessão que emendava "sem criar conta" também sai: a home usava a
          MESMA estrutura com a MESMA pontuação, e o leitor sentia o molde antes
          do argumento (gate de voz, Categoria 7).

          O ramo fechado estava correto e não muda. */}
      <h2 className="font-display text-3xl font-extrabold tracking-tight text-text-primary">
        {aberta ? 'Bora garantir sua vaga?' : 'Fique de olho na próxima edição'}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-text-secondary">
        {aberta
          ? 'Poucos passos e sem criar conta. Você escolhe a modalidade e o kit na hora.'
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
            {/* A-5/CKFORM-T4: sublinha condicional pelo flag RN-347. */}
            {evento.taxaRepassada ? (
              <span className="text-text-tertiary"> + Serviço</span>
            ) : null}
          </p>
        ) : null}
      </div>
    </Dobra>
  );
}
