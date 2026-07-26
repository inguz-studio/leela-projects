'use client';

import { Button, Select } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import type { CotarInscricaoCheckoutResult } from '@leela/api-client';
import type { FormaUI } from './tipos';
import { CupomCampo } from './CupomCampo';
import { SeletorForma } from './SeletorForma';

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
  onTentarCotacao,
  linhas,
  cupomInput,
  onCupomInput,
  onAplicarCupom,
  onRemoverCupom,
  aplicandoCupom,
  erroCupomUrl,
  forma,
  onForma,
  parcelas,
  onParcelas,
}: {
  cotacao: CotarInscricaoCheckoutResult | null;
  cotando: boolean;
  erroCotacao: string | null;
  /** BC-1 · re-dispara a cotação a partir do bloco de erro (sem beco). */
  onTentarCotacao: () => void;
  linhas: LinhaResumo[];
  cupomInput: string;
  onCupomInput: (v: string) => void;
  onAplicarCupom: () => void;
  onRemoverCupom: () => void;
  aplicandoCupom: boolean;
  /** A-2 · aviso honesto quando o cupom do link não pôde ser aplicado. */
  erroCupomUrl: string | null;
  forma: FormaUI;
  onForma: (f: FormaUI) => void;
  parcelas: number;
  onParcelas: (n: number) => void;
}): React.JSX.Element {
  const cupomAtivo = cotacao?.cupomAplicado ?? null;
  const parcelado = forma === 'cartao_credito' && parcelas > 1;

  // TAXAFLEX (RN-180 · S1210): quando o total VARIA por meio (taxa
  // repassada com linhas distintas), exibir o total à vista EM CADA OPÇÃO
  // antes de pagar (PIX R$ 108,00 · Cartão R$ 110,30). Critério = totais
  // DIFERENTES (review F6: cobre override zero num meio — a forma atual
  // pode ter taxa 0 e a outra não); iguais (incorporada ou mesma linha) =
  // rótulos vigentes sem ruído. Valores prontos do servidor — o componente
  // nunca soma; servidor antigo sem o campo cai nos rótulos vigentes.
  const totaisPorMeio = cotacao?.totaisPorMeio;
  const totalPorOpcao =
    totaisPorMeio !== undefined &&
    totaisPorMeio.pix !== null &&
    totaisPorMeio.cartao_credito !== null &&
    totaisPorMeio.pix !== totaisPorMeio.cartao_credito;
  const labelPix =
    totalPorOpcao && totaisPorMeio.pix !== null
      ? `PIX (à vista) — ${formatarPreco(totaisPorMeio.pix)}`
      : 'PIX (à vista)';
  const labelCartao =
    totalPorOpcao && totaisPorMeio.cartao_credito !== null
      ? `Cartão de crédito — ${formatarPreco(totaisPorMeio.cartao_credito)}`
      : 'Cartão de crédito';

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

      {/* Cupom — MESMO componente do step 0 (D-4): a pessoa confere aqui o que
          já aplicou lá, ou aplica agora. Lógica única no CheckoutFlow. */}
      <CupomCampo
        valor={cupomInput}
        onValor={onCupomInput}
        onAplicar={onAplicarCupom}
        onRemover={onRemoverCupom}
        aplicando={aplicandoCupom}
        codigoAplicado={cupomAtivo?.codigo ?? null}
        descontoLabel={
          cotacao && cotacao.desconto > 0 ? `menos ${formatarPreco(cotacao.desconto)}` : ''
        }
        erro={erroCupomUrl}
        bloqueio={null}
      />

      {/* Forma de pagamento — D-5: BOTÕES (RadioCard do DS), sem toggle. */}
      <section className="flex flex-col gap-3">
        <SeletorForma
          forma={forma}
          onForma={onForma}
          labelPix={labelPix}
          labelCartao={labelCartao}
        />

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
          <div role="alert" className="flex flex-col gap-3">
            <p className="text-sm font-medium text-feedback-danger-fg">{erroCotacao}</p>
            <div>
              <Button variant="secondary" size="sm" onClick={onTentarCotacao} disabled={cotando}>
                {cotando ? 'Calculando…' : 'Tentar novamente'}
              </Button>
            </div>
          </div>
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
