// =============================================================================
// ExtratoRepasses — uma linha POR REPASSE, a mesma nos dois lados (S705-T3 ·
// RN-385).
//
// Com o repasse parcial, "quanto já foi repassado" deixou de ser um número e
// virou uma sequência de eventos: 500 no dia 18, 300 no dia 25. Um total somado
// esconde exatamente o que o parcial cria — o organizador não lembra o que já
// adiantou e o afiliado não consegue conferir. Então cada registro vira uma
// linha com valor, data e a observação que o organizador escreveu.
//
// UM componente, DOIS consumidores (`MinhasAfiliacoesPage`, lado de quem
// recebe, e `InfluenciadoresPage`, lado de quem paga) — a projeção `ultimosRepasses`
// do reader já é a mesma para os dois, e a leitura também tem de ser, senão os
// dois lados voltam a divergir por caminho de renderização.
//
// RN-318 continua valendo: a lista carrega só valor, instante e observação —
// nada de terceiro entra aqui porque nada de terceiro entra na projeção.
// =============================================================================

import { Table } from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import type { RepasseProjetado } from '@leela/api-client';

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(millis: number | null): string {
  if (millis === null) return '—';
  return new Date(millis).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const COLUNAS_REPASSE: TableColumn<RepasseProjetado>[] = [
  { key: 'quando', header: 'Registrado em', render: (r) => formatData(r.criadoEmMillis) },
  { key: 'valor', header: 'Valor', align: 'right', render: (r) => formatBRL(r.valor) },
  { key: 'obs', header: 'Observação', render: (r) => r.observacao ?? '—' },
];

export interface ExtratoRepassesProps {
  repasses: readonly RepasseProjetado[];
  /** Prefixo de chave — o refCodigo do afiliado no contexto do consumidor. */
  chaveBase: string;
  /** Legenda da tabela (leitor de tela) — quem/qual evento. */
  caption: string;
  /** Título visível acima da tabela. */
  titulo?: string;
}

/**
 * Extrato de repasses. Nada renderiza quando não há repasse: uma tabela vazia
 * de dinheiro sugere que algo se perdeu.
 */
export function ExtratoRepasses({
  repasses,
  chaveBase,
  caption,
  titulo = 'Repasses registrados',
}: ExtratoRepassesProps): JSX.Element | null {
  if (repasses.length === 0) return null;
  const total = repasses.reduce((acc, r) => acc + r.valor, 0);
  return (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <h3 className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-secondary)]">
        {titulo}
      </h3>
      <Table
        columns={COLUNAS_REPASSE}
        data={[...repasses]}
        keyExtractor={(r) =>
          `${chaveBase}-repasse-${r.criadoEmMillis ?? 'sem-data'}-${r.valor}-${r.observacao ?? ''}`
        }
        caption={caption}
      />
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
        {repasses.length === 1
          ? `1 repasse · ${formatBRL(total)}`
          : `${repasses.length} repasses · ${formatBRL(Math.round(total * 100) / 100)} no total`}
      </p>
    </div>
  );
}

ExtratoRepasses.displayName = 'ExtratoRepasses';
