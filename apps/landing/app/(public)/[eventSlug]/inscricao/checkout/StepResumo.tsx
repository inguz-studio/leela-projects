'use client';

import { Pencil } from 'lucide-react';
import { Button, Field, Input, Select } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import type { CotarInscricaoCheckoutResult } from '@leela/api-client';
import type { FormaUI } from './tipos';
import { CupomCampo } from './CupomCampo';
import { SeletorForma } from './SeletorForma';
import type { CartaoForm } from './StepPagamento';

/** Uma linha do resumo (metadados do inscrito — o preço vem da cotação). */
export interface LinhaResumo {
  titulo: string;
  kitLabel: string;
}

/**
 * Metade de cima do passo PAGAR — resumo do pedido, cupom e escolha do meio.
 * TODOS os números vêm da cotação (`cotarInscricaoCheckout` → computeSaleState
 * no servidor). O componente NÃO soma nada: só renderiza base → desconto →
 * total e as opções de parcelamento derivadas do termo.
 *
 * DEC-0729 · o que mudou aqui:
 *   · achado 12 / D-0729-3 — cada linha do pedido ganhou "Alterar", que leva
 *     ao card daquele atleta com o formulário inteiro preservado;
 *   · achado 17 / D-0729-6 — os campos do cartão e o seletor de parcelas
 *     moram DENTRO da opção "Cartão de crédito" e aparecem no 1º clique;
 *   · achado 5 — as parcelas deixaram de ser um `<select>` da cor do fundo.
 */
export function StepResumo({
  cotacao,
  cotando,
  erroCotacao,
  onTentarCotacao,
  linhas,
  onEditarItem,
  cupomInput,
  onCupomInput,
  onAplicarCupom,
  onRemoverCupom,
  aplicandoCupom,
  erroCupomUrl,
  descontoVeioDoLink = false,
  forma,
  onForma,
  parcelas,
  onParcelas,
  cartao,
  onCartao,
}: {
  cotacao: CotarInscricaoCheckoutResult | null;
  cotando: boolean;
  erroCotacao: string | null;
  /** BC-1 · re-dispara a cotação a partir do bloco de erro (sem beco). */
  onTentarCotacao: () => void;
  linhas: LinhaResumo[];
  /** D-0729-3 · corrigir kit/tamanho da linha `i` sem recomeçar a jornada. */
  onEditarItem?: (index: number) => void;
  cupomInput: string;
  onCupomInput: (v: string) => void;
  onAplicarCupom: () => void;
  onRemoverCupom: () => void;
  aplicandoCupom: boolean;
  /** A-2 · aviso honesto quando o cupom do link não pôde ser aplicado. */
  erroCupomUrl: string | null;
  /**
   * S1215-T2 (RN-430 · D-KC-8): o cupom aplicado chegou pelo LINK, não pelo
   * campo manual. Só marca a linha de desconto — não muda um centavo. O
   * digitado à mão não acende a marca: ali o `CupomCampo` já diz "Cupom X
   * aplicado" e repetir seria ruído.
   */
  descontoVeioDoLink?: boolean;
  forma: FormaUI;
  onForma: (f: FormaUI) => void;
  parcelas: number;
  onParcelas: (n: number) => void;
  /** D-0729-6 · os campos do cartão vivem na própria opção "Cartão". */
  cartao?: CartaoForm;
  onCartao?: (patch: Partial<CartaoForm>) => void;
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
      {/* Itens do pedido — D-0729-3: visível na hora de pagar e EDITÁVEL. */}
      <section className="rounded-ds-lg border border-border-subtle bg-surface-raised">
        <h2 className="border-b border-border-subtle px-4 py-3 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text-primary sm:px-5">
          Seu pedido
        </h2>
        <ul className="divide-y divide-border-subtle">
          {linhas.map((linha, i) => {
            const item = cotacao?.itens[i];
            return (
              <li
                key={i}
                className="flex items-start justify-between gap-[var(--spacing-4)] px-4 py-[var(--spacing-3)] sm:px-5"
              >
                <div className="min-w-0">
                  <p className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text-primary">
                    {linha.titulo}
                  </p>
                  <p className="text-[length:var(--font-size-sm)] text-text-secondary">
                    {item ? item.modalidade : '—'}
                    {item?.loteNome ? ` · ${item.loteNome}` : ''} · {linha.kitLabel}
                  </p>
                  {onEditarItem ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 mt-[var(--spacing-1)]"
                      onClick={() => onEditarItem(i)}
                    >
                      <Pencil size={14} strokeWidth={2} aria-hidden className="mr-1.5" />
                      Alterar modalidade, kit ou tamanho
                    </Button>
                  ) : null}
                </div>
                <p className="shrink-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text-primary">
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

      {/* Forma de pagamento — D-5: BOTÕES (RadioCard do DS), sem toggle.
          D-0729-6: escolher "cartão" abre os campos do cartão AQUI, no 1º
          clique — antes eles só existiam na tela seguinte.
          C3 (achado 13): a `<section>` com gap-[var(--spacing-3)] envolvia
          um ÚNICO filho — gap sem efeito (nada para espaçar). Removida; o
          ritmo com os vizinhos (Seu pedido/Cupom/Totais) já é o gap-6 do
          stack externo, o mesmo critério usado por eles. */}
        <SeletorForma
          forma={forma}
          onForma={onForma}
          labelPix={labelPix}
          labelCartao={labelCartao}
          conteudoCartao={
            <div className="flex flex-col gap-[var(--spacing-4)]">
              {cotacao ? (
                <div className="max-w-xs">
                  {/* Achado 5 · contraste do seletor de parcelas.
                      A variante `flat` (default) pinta o controle com
                      `--surface-sunken` (#0A0A0A) e borda
                      `--input-border-flat: transparent` — sobre a página, que é
                      `--surface-base` (#0C0C0C), isso dá ~1,03:1: o seletor
                      literalmente não tinha contorno. A variante `bordered` traz
                      a borda `border-input` (= `--border-strong`, #737373),
                      que fica em ~3,9:1 contra o cartão e ~4,2:1 contra a
                      página — acima do piso de 3:1 da WCAG 1.4.11 para
                      contorno de componente, em repouso, hover e foco. */}
                  <Select
                    variant="bordered"
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

              {cartao && onCartao ? (
                <div className="grid gap-[var(--spacing-4)]">
                  <Field label="Nome no cartão">
                    <Input
                      variant="bordered"
                      value={cartao.nome}
                      autoComplete="cc-name"
                      onChange={(e) => onCartao({ nome: e.target.value })}
                    />
                  </Field>
                  <Field label="Número do cartão">
                    <Input
                      variant="bordered"
                      value={cartao.numero}
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="0000 0000 0000 0000"
                      onChange={(e) => onCartao({ numero: e.target.value })}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-[var(--spacing-4)]">
                    <Field label="Validade">
                      <Input
                        variant="bordered"
                        value={cartao.validade}
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/AA"
                        onChange={(e) => onCartao({ validade: e.target.value })}
                      />
                    </Field>
                    <Field label="CVV">
                      <Input
                        variant="bordered"
                        value={cartao.cvv}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                        onChange={(e) => onCartao({ cvv: e.target.value })}
                      />
                    </Field>
                  </div>
                  <p className="text-[length:var(--font-size-xs)] text-text-tertiary">
                    Ambiente de simulação: os dados do cartão não são enviados nem cobrados.
                  </p>
                </div>
              ) : null}
            </div>
          }
        />

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
              <div className="flex items-center justify-between gap-3">
                {/* S1215-T2 · RN-430/D-KC-8: quando o desconto veio do link, a
                    linha DIZ isso. É marca de exibição — o número continua
                    vindo inteiro da cotação, e a interface não soma um
                    centavo. Com o código junto porque "(desconto aplicado)"
                    sozinho não conta QUAL cupom entrou, e o campo manual do
                    step 0 some assim que o cupom cola. */}
                <dt className="text-text-secondary">
                  Desconto
                  {descontoVeioDoLink ? (
                    <span className="block text-xs text-text-tertiary sm:inline sm:ml-1">
                      {cupomAtivo !== null ? `· cupom ${cupomAtivo.codigo} do seu link ` : ''}
                      (desconto aplicado)
                    </span>
                  ) : null}
                </dt>
                <dd className="whitespace-nowrap text-feedback-success-fg">
                  − {formatarPreco(cotacao.desconto)}
                </dd>
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
