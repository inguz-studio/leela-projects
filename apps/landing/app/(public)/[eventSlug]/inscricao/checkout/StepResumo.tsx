'use client';

import { Button, Input, Radio, RadioGroup, Select } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import type { CotarInscricaoCheckoutResult } from '@leela/api-client';
import type { FormaUI } from './tipos';

/** Uma linha do resumo (metadados do inscrito — o preço vem da cotação). */
export interface LinhaResumo {
  titulo: string;
  kitLabel: string;
}

/**
 * Etapa 3 — Resumo. TODOS os números vêm da cotação (`cotarInscricaoCheckout`
 * → computeSaleState no servidor). O componente NÃO soma nada: só renderiza
 * base → desconto → total e as opções de parcelamento derivadas do termo.
 */
export function StepResumo({
  cotacao,
  cotando,
  erroCotacao,
  linhas,
  cupomInput,
  onCupomInput,
  onAplicarCupom,
  onRemoverCupom,
  aplicandoCupom,
  forma,
  onForma,
  parcelas,
  onParcelas,
}: {
  cotacao: CotarInscricaoCheckoutResult | null;
  cotando: boolean;
  erroCotacao: string | null;
  linhas: LinhaResumo[];
  cupomInput: string;
  onCupomInput: (v: string) => void;
  onAplicarCupom: () => void;
  onRemoverCupom: () => void;
  aplicandoCupom: boolean;
  forma: FormaUI;
  onForma: (f: FormaUI) => void;
  parcelas: number;
  onParcelas: (n: number) => void;
}): React.JSX.Element {
  const cupomAtivo = cotacao?.cupomAplicado ?? null;
  const parcelado = forma === 'cartao_credito' && parcelas > 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Itens do pedido */}
      <section className="rounded-ds-lg border border-border-subtle bg-surface-raised">
        <h2 className="border-b border-border-subtle px-4 py-3 text-sm font-semibold text-text-primary sm:px-5">
          Seu pedido
        </h2>
        <ul className="divide-y divide-border-subtle">
          {linhas.map((linha, i) => {
            const item = cotacao?.itens[i];
            return (
              <li key={i} className="flex items-start justify-between gap-4 px-4 py-3 sm:px-5">
                <div>
                  <p className="text-sm font-medium text-text-primary">{linha.titulo}</p>
                  <p className="text-sm text-text-secondary">
                    {item ? item.modalidade : '—'}
                    {item?.loteNome ? ` · ${item.loteNome}` : ''} · {linha.kitLabel}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-text-primary">
                  {item ? formatarPreco(item.preco) : '—'}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Cupom */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-primary">Cupom de desconto</h2>
        {cupomAtivo ? (
          <div className="flex items-center justify-between gap-3 rounded-ds-md border border-border-subtle bg-feedback-success-surface px-4 py-3">
            <p className="text-sm font-medium text-feedback-success-fg">
              Cupom {cupomAtivo.codigo} aplicado
              {cotacao && cotacao.desconto > 0 ? ` — menos ${formatarPreco(cotacao.desconto)}` : ''}
            </p>
            <Button variant="ghost" size="sm" onClick={onRemoverCupom}>
              Remover
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                aria-label="Código do cupom"
                value={cupomInput}
                placeholder="Ex.: HEROI10"
                onChange={(e) => onCupomInput(e.target.value.toUpperCase())}
              />
            </div>
            <Button
              variant="secondary"
              onClick={onAplicarCupom}
              disabled={aplicandoCupom || cupomInput.trim().length === 0}
            >
              {aplicandoCupom ? 'Aplicando…' : 'Aplicar'}
            </Button>
          </div>
        )}
      </section>

      {/* Forma de pagamento */}
      <section className="flex flex-col gap-3">
        <RadioGroup
          name="forma-pagamento"
          label="Forma de pagamento"
          value={forma}
          onValueChange={(v) => onForma(v as FormaUI)}
          orientation="horizontal"
        >
          <Radio value="pix" label="PIX (à vista)" />
          <Radio value="cartao_credito" label="Cartão de crédito" />
        </RadioGroup>

        {forma === 'cartao_credito' && cotacao ? (
          <div className="max-w-xs">
            <Select
              label="Parcelas"
              value={String(parcelas)}
              onChange={(e) => onParcelas(Number.parseInt(e.target.value, 10))}
              options={cotacao.opcoesParcelamento.map((o) => ({
                value: String(o.parcelas),
                label:
                  o.parcelas === 1
                    ? `À vista — ${formatarPreco(o.valorTotal)}`
                    : `${o.parcelas}x de ${formatarPreco(o.valorParcela)} (total ${formatarPreco(o.valorTotal)})`,
              }))}
            />
          </div>
        ) : null}
      </section>

      {/* Totais — renderizados da cotação, sem cálculo local */}
      <section className="rounded-ds-lg border border-border-default bg-surface-sunken p-4 sm:p-5">
        {erroCotacao ? (
          <p className="text-sm font-medium text-feedback-danger-fg">{erroCotacao}</p>
        ) : cotacao === null ? (
          <p className="text-sm text-text-secondary">
            {cotando ? 'Calculando o total…' : 'Escolha a modalidade para ver o total.'}
          </p>
        ) : (
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-text-secondary">Subtotal</dt>
              <dd className="text-text-primary">{formatarPreco(cotacao.valorBase)}</dd>
            </div>
            {cotacao.desconto > 0 ? (
              <div className="flex items-center justify-between">
                <dt className="text-text-secondary">Desconto</dt>
                <dd className="text-feedback-success-fg">− {formatarPreco(cotacao.desconto)}</dd>
              </div>
            ) : null}
            {/* RN-347: linha SÓ quando o evento repassa a taxa ao comprador
                (taxaServico > 0). Sempre VALOR em R$ — nunca percentual do
                termo (confidencialidade 703db9c). Cotação de servidor antigo
                sem o campo (undefined) cai no ramo sem linha. */}
            {(cotacao.taxaServico ?? 0) > 0 ? (
              <div className="flex items-center justify-between">
                <dt className="text-text-secondary">Taxa de serviço</dt>
                <dd className="text-text-primary">{formatarPreco(cotacao.taxaServico)}</dd>
              </div>
            ) : null}
            <div className="mt-1 flex items-center justify-between border-t border-border-subtle pt-2">
              <dt className="font-semibold text-text-primary">
                {parcelado ? 'Total parcelado' : 'Total'}
              </dt>
              <dd className="text-lg font-bold text-text-primary">
                {formatarPreco(cotacao.totalCobrado)}
              </dd>
            </div>
            {parcelado ? (
              <p className="text-right text-xs text-text-tertiary">
                {cotacao.parcelamento.parcelas}x de {formatarPreco(cotacao.parcelamento.valorParcela)} ·
                à vista sai por{' '}
                {formatarPreco(
                  // Total à vista do COMPRADOR sem juros (RN-347: inclui a
                  // taxa de serviço quando repassada). Fallback valorFinal =
                  // servidor antigo sem o campo (== comportamento anterior).
                  cotacao.totalAVista ?? cotacao.valorFinal
                )}
              </p>
            ) : null}
          </dl>
        )}
      </section>
    </div>
  );
}
