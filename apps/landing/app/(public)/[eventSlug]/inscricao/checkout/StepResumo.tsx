'use client';

import { Pencil } from 'lucide-react';
import { Card } from '@leela/design-system/server';
import { Button, Field, Input, Select } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import type { CotarInscricaoCheckoutResult, CotarParcelaResult } from '@leela/api-client';
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
  taxaRepassada,
  forma,
  onForma,
  parcelas,
  onParcelas,
  opcoesParcelamento,
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
  /**
   * S1216-T3 (RN-435 · D-ACH-5): `true` = o evento REPASSA a taxa de serviço
   * ao comprador (`taxaModo: 'repassada'` no leitor — RN-347). Vem do flag
   * real do evento, não de `taxaServico > 0`: um meio pode ter taxa zerada
   * por override num evento que repassa, e chamar isso de "inclusa" seria
   * mentira. Em `false` (incorporada) a linha existe SEM valor.
   */
  taxaRepassada: boolean;
  /**
   * S1217-T2 · RN-440: `null` = a pessoa ainda não escolheu o meio. O bloco de
   * totais continua tendo o que mostrar — a composição da cotação vigente, que
   * assume PIX à vista — e cada opção carrega o próprio total no rótulo.
   */
  forma: FormaUI | null;
  onForma: (f: FormaUI) => void;
  parcelas: number;
  onParcelas: (n: number) => void;
  /**
   * C2-0803 · a escada de parcelamento do CARTÃO, calculada pelo servidor.
   * `null` = ainda não está na mão, e aí a tela DIZ isso: o seletor não
   * aparece com uma opção só. Ele saía de `cotacao.opcoesParcelamento`, que
   * enquanto ninguém escolhe meio é a cotação de PIX — uma linha por contrato
   * do servidor. Era essa linha única que o dono lia como "não tem
   * parcelamento" na primeira abertura do select.
   */
  opcoesParcelamento: readonly CotarParcelaResult[] | null;
  /** D-0729-6 · os campos do cartão vivem na própria opção "Cartão". */
  cartao?: CartaoForm;
  onCartao?: (patch: Partial<CartaoForm>) => void;
}): React.JSX.Element {
  const cupomAtivo = cotacao?.cupomAplicado ?? null;
  const parcelado = forma === 'cartao_credito' && parcelas > 1;

  // S1216-T3 · RN-435/D-ACH-5 — a taxa repassada diz, na PRÓPRIA linha, de que
  // meio ela é. Hoje o rótulo é mudo e a variação por forma de pagamento só
  // apareceria se a pessoa trocasse de opção e comparasse dois totais que já
  // sumiram da tela. Nome do meio, nunca percentual (confidencialidade
  // 703db9c) e nunca o valor no modo incorporada (seria o termo do
  // organizador vazando).
  const meioDaTaxa = forma === 'cartao_credito' ? 'cartão' : 'PIX';
  const taxaServico = cotacao?.taxaServico ?? 0;
  // RN-437 · o juro do parcelamento chega PRONTO do servidor (S1216-T2). A
  // tela renderiza; não subtrai. Derivar por `totalCobrado − totalAVista`
  // aqui criaria uma segunda autoridade sobre o mesmo número — é exatamente o
  // caminho barato que a regra proíbe. Ausente = servidor antigo ⇒ sem linha.
  const jurosParcelamento = cotacao?.jurosParcelamento ?? 0;

  // TAXAFLEX (RN-180 · S1210) → S1216-T4 (RN-435 · D-ACH-6): o total à vista
  // de CADA opção aparece no rótulo dela.
  //
  // O critério era "os totais DIFEREM". Em taxa incorporada eles nunca diferem,
  // então a feature inteira ficava invisível — e foi exatamente esse o evento
  // que o dono testou. O critério passa a ser "o total daquela opção existe",
  // por opção. Totais iguais nas duas opções são INFORMAÇÃO: o comprador
  // aprende que a escolha do meio não muda o que ele paga, que era a dúvida
  // dele.
  //
  // Por opção, e não um gate único, porque a RN-180 já prometia que falha
  // parcial na derivação do meio alternativo nunca derruba a opção principal:
  // `null` num meio devolve o rótulo genérico DAQUELE meio e só. Servidor
  // antigo sem o campo cai nos dois rótulos genéricos. Valores prontos do
  // servidor — o componente nunca soma.
  const totalPix = cotacao?.totaisPorMeio?.pix ?? null;
  const totalCartao = cotacao?.totaisPorMeio?.cartao_credito ?? null;
  const labelPix =
    totalPix !== null ? `PIX (à vista) — ${formatarPreco(totalPix)}` : 'PIX (à vista)';
  const labelCartao =
    totalCartao !== null
      ? `Cartão de crédito — ${formatarPreco(totalCartao)}`
      : 'Cartão de crédito';

  return (
    <div className="flex flex-col gap-6">
      {/* Itens do pedido — D-0729-3: visível na hora de pagar e EDITÁVEL. */}
      <Card className="border-border-subtle">
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
      </Card>

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
              {opcoesParcelamento !== null && opcoesParcelamento.length > 0 ? (
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
                  {/* C2-0803 · o `id` fecha o `htmlFor` do rótulo: sem ele o
                      Select do DS renderiza um <label> solto e o controle fica
                      SEM nome acessível (WCAG 1.3.1/4.1.2). O leitor de tela
                      anunciava "combo box" e mais nada na tela do dinheiro. */}
                  <Select
                    id="checkout-parcelas"
                    variant="bordered"
                    label="Parcelas"
                    value={String(parcelas)}
                    onChange={(e) => onParcelas(Number.parseInt(e.target.value, 10))}
                    options={opcoesParcelamento.map((o) => ({
                      value: String(o.parcelas),
                      label:
                        o.parcelas === 1
                          ? `À vista — ${formatarPreco(o.valorTotal)}`
                          : `${o.parcelas}x de ${formatarPreco(o.valorParcela)} (total ${formatarPreco(o.valorTotal)})`,
                    }))}
                  />
                </div>
              ) : (
                <p role="status" className="text-[length:var(--font-size-sm)] text-text-secondary">
                  Calculando as opções de parcelamento…
                </p>
              )}

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
                  {/* PIXREAL-FIX T3 · esta tela não pode afirmar ambiente.
                      A frase antiga abria com "Ambiente de simulação:" — em
                      produção isso é falso, e é a mesma mentira que o banner
                      do PIX contava sobre uma cobrança real. Lá o conserto foi
                      o sinal `gatewayReal` do servidor; aqui ele não existe:
                      os campos de cartão são desenhados ANTES de qualquer
                      cobrança, e nada nesta etapa sabe qual provider será
                      construído. Inventar um segundo sinal (env de build,
                      palpite pela cotação) seria recriar a fonte dupla que
                      produziu o incidente. Então a tela diz só o que é
                      verdade nos dois ambientes — e o que fazer com o próprio
                      formulário de cartão em produção está ESCALADO no
                      relatório da lane, porque é decisão de produto. */}
                  <p className="text-[length:var(--font-size-xs)] text-text-tertiary">
                    Os dados do cartão não são enviados por esta tela.
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
            {/* RN-347 + RN-435 (S1216-T3 · D-ACH-5): o resumo declara a
                composição do total nos DOIS modos de taxa.

                · repassada — valor em R$ e o MEIO no rótulo ("Taxa de serviço
                  (PIX)"), porque é o meio que define quanto ela custa;
                · incorporada — a linha EXISTE e não tem valor. "R$ 0,00"
                  afirmaria ausência de taxa (mentira por outro caminho) e o
                  valor real vazaria o termo comercial do organizador
                  (confidencialidade 703db9c). "Inclusa no valor" é o único
                  enunciado verdadeiro para o comprador e mudo sobre o
                  contrato de terceiro.

                Percentual não aparece em nenhum dos dois ramos. Evento
                repassado com taxa 0 no meio escolhido continua sem linha: não
                há o que discriminar, e chamar isso de "inclusa" seria falso. */}
            {taxaRepassada ? (
              taxaServico > 0 ? (
                <div className="flex items-center justify-between">
                  <dt className="text-text-secondary">Serviço ({meioDaTaxa})</dt>
                  <dd className="text-text-primary">{formatarPreco(taxaServico)}</dd>
                </div>
              ) : null
            ) : (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">Serviço</dt>
                <dd className="whitespace-nowrap text-text-secondary">inclusa no valor</dd>
              </div>
            )}
            {/* RN-437: o juro tem NOME próprio. Não existe caminho em que ele
                se apresente como parte do "total" sem se declarar. Zero no
                PIX, zero no cartão à vista e zero com termo sem juros ⇒ sem
                linha, porque não há o que dizer. */}
            {jurosParcelamento > 0 ? (
              <div className="flex items-center justify-between">
                <dt className="text-text-secondary">Juros do parcelamento</dt>
                <dd className="text-text-primary">{formatarPreco(jurosParcelamento)}</dd>
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
