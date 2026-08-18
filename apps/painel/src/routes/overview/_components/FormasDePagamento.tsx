// =============================================================================
// FormasDePagamento — a rosca que saiu do "em breve" (E11 · S825-T2).
//
// O bloco existia desde a HIFI-REC como `EmBreveV3` com uma causa honesta:
// *"Nenhum agregado por forma de pagamento chega ao cliente hoje… Assim que a
// série financeira existir, o donut aparece aqui."* A série existe agora, e
// este componente é o "aqui".
//
// TRÊS ESTADOS, E ELES NÃO SÃO O MESMO ESTADO
//
//   série === null  → o "em breve" ORIGINAL, palavra por palavra. Quer dizer
//                     "o servidor que respondeu não sabe somar isto ainda" —
//                     em produção, o intervalo entre o merge e o deploy das
//                     Functions. É o único estado que promete algo.
//   série sem venda → vazio HONESTO: "Nenhuma venda confirmada ainda". É uma
//                     afirmação, não uma promessa, e a diferença importa: um
//                     organizador que ainda não vendeu precisa ler "ninguém
//                     comprou", não "estamos construindo".
//   série com venda → a rosca.
//
// Desenhar uma rosca zerada sobre o primeiro caso seria afirmar "ninguém
// pagou" quando a verdade é "ninguém somou" — a mentira exata que o `null` do
// core existe para impedir, e que morreria aqui se esta tela achatasse os dois
// num `?? []`.
//
// A NOTA DE COBERTURA NÃO É ENFEITE. A série cobre as vendas que têm doc de
// pagamento; `receitaConfirmada` cobre toda venda. No mock da casa a diferença
// é brutal (R$ 2.500 de rosca contra R$ 49.780 de receita, porque o seed
// escreve 17 cobranças para 299 inscritos confirmados) e a mesma forma aparece
// em qualquer base com venda anterior ao doc de pagamento. Sem a nota, o
// organizador lê dois números do mesmo dinheiro discordando na mesma dobra e
// conclui, com toda razão, que sumiu grana. A nota é o que transforma a
// discrepância em informação.
// =============================================================================

import { CreditCard } from 'lucide-react';
import { DonutChart, EmptyState, Skeleton } from '@leela/design-system';
import {
  ROTULO_FORMA_PAGAMENTO,
  coberturaDaSerie,
  serieTemVenda,
  totalValorDaSerie,
  totalVendasDaSerie,
  type FatiaFormaPagamento,
} from '@leela/core';
import { CartaoV3, EyebrowV3 } from '../../../components/CartaoV3';
import { EmBreveV3 } from './EmBreveV3';
import { formatBRL, formatInt } from '../_lib/format';

/** Título e causa vivem aqui para os três estados escreverem a MESMA palavra. */
const TITULO = 'Formas de pagamento';

/**
 * A causa do "em breve", preservada da HIFI-REC. Mudou uma coisa só: o tempo
 * do verbo do último período, porque a série passou a existir e o que falta
 * agora é o agregado chegar — prometer construção já construída seria a
 * desonestidade oposta.
 */
const CAUSA_SEM_SERIE =
  'O resumo por forma de pagamento ainda não chegou a este painel. Ele é ' +
  'calculado no servidor a cada venda, e aparece aqui assim que o próximo ' +
  'agregado do seu portfólio for gravado.';

/** Abaixo disto a rosca está contando um pedaço, e precisa dizer. */
const COBERTURA_MINIMA = 0.995;

export interface FormasDePagamentoProps {
  /**
   * Série consolidada do portfólio. `null` = não computada (mantém o "em
   * breve"); série zerada = computada e sem venda (vazio honesto).
   */
  serie: FatiaFormaPagamento[] | null;
  /** Receita confirmada do mesmo agregado — denominador da nota de cobertura. */
  receitaConfirmada: number | null;
  loading: boolean;
  className?: string;
}

export function FormasDePagamento({
  serie,
  receitaConfirmada,
  loading,
  className,
}: FormasDePagamentoProps): JSX.Element {
  if (loading) {
    return (
      <CartaoV3 aria={TITULO} elev={2} padding="lg" className={className}>
        <EyebrowV3>{TITULO}</EyebrowV3>
        <div role="status" aria-label="Carregando formas de pagamento">
          <Skeleton variant="rect" className="mx-auto h-[180px] w-[180px] rounded-full" />
          <Skeleton variant="rect" className="mt-[var(--spacing-4)] h-16" />
        </div>
      </CartaoV3>
    );
  }

  // Estado 1 — o servidor não sabe responder. O "em breve" continua sendo a
  // resposta certa, e é o MESMO componente de antes: nada de card parecido.
  if (serie === null) {
    return (
      <EmBreveV3
        titulo={TITULO}
        icon={<CreditCard aria-hidden />}
        causa={CAUSA_SEM_SERIE}
        className={className}
      />
    );
  }

  // Estado 2 — o servidor somou e não achou venda. Afirmação, não promessa.
  if (!serieTemVenda(serie)) {
    return (
      <CartaoV3 aria={TITULO} elev={2} padding="lg" className={className}>
        <EyebrowV3>{TITULO}</EyebrowV3>
        <EmptyState
          icon={<CreditCard aria-hidden />}
          title="Nenhuma venda confirmada ainda"
          description="Quando a primeira inscrição for paga, a divisão entre Pix e cartão aparece aqui."
        />
      </CartaoV3>
    );
  }

  // Estado 3 — a rosca.
  const total = totalValorDaSerie(serie);
  const vendas = totalVendasDaSerie(serie);
  const cobre = coberturaDaSerie(serie, receitaConfirmada);
  const parcial = cobre !== null && cobre < COBERTURA_MINIMA;

  return (
    <CartaoV3 aria={TITULO} elev={2} padding="lg" className={className}>
      <EyebrowV3>{TITULO}</EyebrowV3>
      <DonutChart
        // Ordem canônica preservada do core: a cor de cada forma é identidade
        // e não pode depender de quem vendeu mais neste recorte.
        data={serie.map((f) => ({
          label: ROTULO_FORMA_PAGAMENTO[f.forma],
          value: f.valor,
        }))}
        aria-label={`Distribuição por forma de pagamento — ${formatBRL(total)} em ${formatInt(vendas)} vendas confirmadas`}
        centerValue={formatBRL(total)}
        centerLabel="confirmado"
        formatValue={formatBRL}
        size={180}
      />
      <p className="mt-[var(--spacing-3)] text-center text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
        {vendas === 1
          ? '1 venda confirmada'
          : `${formatInt(vendas)} vendas confirmadas`}
      </p>
      {parcial ? (
        <p className="mt-[var(--spacing-2)] text-[length:var(--font-size-xs)] leading-snug text-[var(--text-tertiary)]">
          A rosca cobre {formatBRL(total)} dos {formatBRL(receitaConfirmada ?? 0)}{' '}
          confirmados. O resto veio de inscrições sem cobrança registrada, que
          não têm forma de pagamento para somar.
        </p>
      ) : null}
    </CartaoV3>
  );
}

FormasDePagamento.displayName = 'FormasDePagamento';
