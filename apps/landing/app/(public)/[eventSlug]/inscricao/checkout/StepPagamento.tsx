'use client';

import { Button, Field, Input } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import type { CreateInscricaoChargeResult } from '@leela/api-client';
import type { FormaUI } from './tipos';

export interface CartaoForm {
  nome: string;
  numero: string;
  validade: string;
  cvv: string;
}

/**
 * Etapa 4 — Pagamento (via MockPaymentProvider). Chama `createInscricaoCharge`
 * (produtor de escrita) e fecha contra o Mock: PIX mostra o QR/código simulado;
 * cartão coleta os campos. A confirmação dispara o webhook assinado (sandbox).
 *
 * Idempotência VISÍVEL: a chave de idempotência é gerada UMA vez por tentativa e
 * reusada — reenviar "pagar" devolve o MESMO pedido (o servidor não duplica).
 * Os campos de cartão são cosméticos no sandbox (o Mock não os processa) e NÃO
 * são enviados — sinalizado ao usuário.
 */
export function StepPagamento({
  forma,
  total,
  charge,
  criandoCharge,
  erroCharge,
  onGerarCobranca,
  onPagarCartao,
  confirmando,
  erroConfirmar,
  onConfirmar,
  cartao,
  onCartao,
}: {
  forma: FormaUI;
  total: number | null;
  charge: CreateInscricaoChargeResult | null;
  criandoCharge: boolean;
  erroCharge: string | null;
  onGerarCobranca: () => void;
  onPagarCartao: () => void;
  confirmando: boolean;
  erroConfirmar: string | null;
  onConfirmar: () => void;
  cartao: CartaoForm;
  onCartao: (patch: Partial<CartaoForm>) => void;
}): React.JSX.Element {
  const totalLabel = total !== null ? formatarPreco(total) : '';

  return (
    <div className="flex flex-col gap-6">
      {forma === 'pix' ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-text-primary">Pagamento via PIX</h2>

          {charge === null ? (
            <>
              <p className="text-sm text-text-secondary">
                Gere o código PIX para pagar {totalLabel ? <strong>{totalLabel}</strong> : null} à
                vista. Sua vaga fica reservada como pendente até a confirmação.
              </p>
              <div>
                <Button onClick={onGerarCobranca} disabled={criandoCharge}>
                  {criandoCharge ? 'Gerando cobrança…' : 'Gerar código PIX'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-ds-lg border border-border-subtle bg-surface-raised p-4 sm:p-5">
                <p className="text-sm font-medium text-text-primary">Copia e cola / QR (sandbox)</p>
                <p className="mt-2 break-all rounded-ds-md bg-surface-sunken px-3 py-2 font-mono text-xs text-text-secondary">
                  {charge.qrCode ?? charge.paymentUrl ?? charge.chargeId}
                </p>
                <p className="mt-2 text-xs text-text-tertiary">
                  Ambiente de simulação: nenhum PIX real é cobrado. Clique abaixo para simular a
                  confirmação do pagamento (o gateway dispara o webhook).
                </p>
              </div>
              <div>
                <Button onClick={onConfirmar} disabled={confirmando}>
                  {confirmando ? 'Confirmando…' : 'Já paguei — confirmar'}
                </Button>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-text-primary">Pagamento com cartão</h2>
          <div className="grid gap-4">
            <Field label="Nome no cartão">
              <Input
                value={cartao.nome}
                autoComplete="cc-name"
                onChange={(e) => onCartao({ nome: e.target.value })}
              />
            </Field>
            <Field label="Número do cartão">
              <Input
                value={cartao.numero}
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="0000 0000 0000 0000"
                onChange={(e) => onCartao({ numero: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Validade">
                <Input
                  value={cartao.validade}
                  autoComplete="cc-exp"
                  placeholder="MM/AA"
                  onChange={(e) => onCartao({ validade: e.target.value })}
                />
              </Field>
              <Field label="CVV">
                <Input
                  value={cartao.cvv}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="123"
                  onChange={(e) => onCartao({ cvv: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <p className="text-xs text-text-tertiary">
            Ambiente de simulação: os dados do cartão não são enviados nem cobrados. O
            MockPaymentProvider confirma a cobrança e dispara o webhook.
          </p>
          <div>
            <Button onClick={onPagarCartao} disabled={criandoCharge || confirmando}>
              {criandoCharge || confirmando
                ? 'Processando…'
                : `Pagar ${totalLabel}`.trim()}
            </Button>
          </div>
        </section>
      )}

      {erroCharge ? (
        <p role="alert" className="text-sm font-medium text-feedback-danger-fg">
          {erroCharge}
        </p>
      ) : null}
      {erroConfirmar ? (
        <p role="alert" className="text-sm font-medium text-feedback-danger-fg">
          {erroConfirmar}
        </p>
      ) : null}
    </div>
  );
}
