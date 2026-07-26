'use client';

import Link from 'next/link';
import { Button } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import type {
  ConfirmarPagamentoSandboxResult,
  CreateInscricaoChargeResult,
} from '@leela/api-client';
import { Ticket } from './Ticket';
import { PixCobranca, payloadPix } from './PixCobranca';

/** Metadados por inscrito, na MESMA ordem de `charge.inscritoIds`. */
export interface LinhaConfirmacao {
  titulo: string;
  modalidade: string;
  kitLabel: string;
}

/**
 * Etapa 5 — Confirmação. Mostra o estado real do pedido, resumo, ingresso/QR
 * por inscrito e o aviso de e-mail. Trata o estado "pendente" (PIX ainda não
 * confirmado) com honestidade — nada de "confirmado" fabricado.
 */
export function StepConfirmacao({
  charge,
  confirmacao,
  eventoNome,
  slug,
  responsavelEmail,
  linhas,
  forma,
  pixExpirado = false,
  onPixExpirar,
  onNovaCobranca,
}: {
  charge: CreateInscricaoChargeResult;
  confirmacao: ConfirmarPagamentoSandboxResult | null;
  eventoNome: string;
  slug: string;
  responsavelEmail: string;
  linhas: LinhaConfirmacao[];
  /** Forma escolhida — o bloco do PIX só existe quando a cobrança é PIX. */
  forma?: 'pix' | 'cartao_credito';
  /** RN-157: cobrança já expirada (timer zerou / servidor cancelou). */
  pixExpirado?: boolean;
  /** RN-157: o timer zerou — materializar a expiração no servidor. */
  onPixExpirar?: () => void;
  /** RN-157: recomeçar com uma cobrança NOVA. */
  onNovaCobranca?: () => void;
}): React.JSX.Element {
  const pago = confirmacao?.statusPedido === 'pago';
  const { valores } = charge;
  // D-6 · RN-157: enquanto o PIX está PENDENTE, o QR e o copia-e-cola valem
  // também AQUI — esta é a "tela do pedido pendente" do checkout. Pedido pago
  // não mostra cobrança: não há mais o que pagar.
  const mostraPix = !pago && forma === 'pix';

  return (
    <div className="flex flex-col gap-6">
      <section
        className={
          pago
            ? 'rounded-ds-lg border border-border-subtle bg-feedback-success-surface p-5'
            : 'rounded-ds-lg border border-border-subtle bg-feedback-warning-surface p-5'
        }
      >
        <h2
          className={
            pago
              ? 'text-lg font-bold text-feedback-success-fg'
              : 'text-lg font-bold text-feedback-warning-fg'
          }
        >
          {pago ? 'Inscrição confirmada!' : 'Pagamento pendente'}
        </h2>
        <p className="mt-1 text-sm text-text-primary">
          {pago
            ? `${linhas.length === 1 ? 'Sua vaga está garantida' : 'As vagas estão garantidas'} em ${eventoNome}.`
            : `Assim que o pagamento for confirmado, ${linhas.length === 1 ? 'sua inscrição' : 'as inscrições'} de ${eventoNome} ${linhas.length === 1 ? 'fica' : 'ficam'} confirmada${linhas.length === 1 ? '' : 's'}.`}
        </p>
        <p className="mt-2 font-mono text-xs text-text-tertiary">Pedido {charge.pedidoId}</p>
      </section>

      {/* PIX pendente: a chave continua à mão (D-6) com a MESMA contagem da
          tela de pagamento — quem fechou o app e voltou paga daqui. */}
      {mostraPix ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-text-primary">Pague com PIX</h3>
          <PixCobranca
            codigo={payloadPix(charge)}
            expiraEmMillis={charge.pixExpiraEmMillis}
            expirado={pixExpirado}
            onExpirar={onPixExpirar}
            onNovaCobranca={onNovaCobranca}
          />
        </section>
      ) : null}

      {/* Resumo financeiro — valores do resultado da cobrança (core) */}
      <section className="rounded-ds-lg border border-border-subtle bg-surface-raised p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-text-primary">Resumo do pedido</h3>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-text-secondary">Subtotal</dt>
            <dd className="text-text-primary">{formatarPreco(valores.valorBase)}</dd>
          </div>
          {valores.desconto > 0 ? (
            <div className="flex items-center justify-between">
              <dt className="text-text-secondary">Desconto</dt>
              <dd className="text-feedback-success-fg">− {formatarPreco(valores.desconto)}</dd>
            </div>
          ) : null}
          {/* RN-347: linha SÓ em evento com taxa repassada (taxaServico > 0);
              sempre VALOR em R$, nunca percentual (703db9c). */}
          {(valores.taxaServico ?? 0) > 0 ? (
            <div className="flex items-center justify-between">
              <dt className="text-text-secondary">Taxa de serviço</dt>
              <dd className="text-text-primary">{formatarPreco(valores.taxaServico)}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-border-subtle pt-2">
            <dt className="font-semibold text-text-primary">
              {valores.parcelas > 1 ? `Total em ${valores.parcelas}x` : 'Total pago'}
            </dt>
            <dd className="text-base font-bold text-text-primary">
              {formatarPreco(valores.totalCobrado)}
            </dd>
          </div>
          {valores.parcelas > 1 ? (
            <p className="text-right text-xs text-text-tertiary">
              {valores.parcelas}x de {formatarPreco(valores.valorParcela)}
            </p>
          ) : null}
        </dl>
      </section>

      {/* Ingressos por inscrito */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text-primary">
          {charge.inscritoIds.length > 1 ? 'Seus ingressos' : 'Seu ingresso'}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {charge.inscritoIds.map((id, i) => {
            const linha = linhas[i];
            return (
              <Ticket
                key={id}
                inscritoId={id}
                titulo={linha?.titulo ?? `Atleta ${i + 1}`}
                modalidade={linha?.modalidade ?? '—'}
                kitLabel={linha?.kitLabel ?? 'Sem kit'}
              />
            );
          })}
        </div>
      </section>

      {/* E-mail ao responsável — stub honesto */}
      <p className="text-sm text-text-secondary">
        {responsavelEmail
          ? `Um comprovante iria para ${responsavelEmail}. `
          : ''}
        O envio de e-mail ainda não está ativo neste ambiente — guarde esta tela; cada ingresso tem
        seu QR de check-in.
      </p>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button asChild variant="secondary">
          <Link href={`/${slug}`}>Voltar ao evento</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">Ver outros eventos</Link>
        </Button>
      </div>
    </div>
  );
}
