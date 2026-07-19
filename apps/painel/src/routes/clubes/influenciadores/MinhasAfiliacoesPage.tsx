// =============================================================================
// MinhasAfiliacoesPage — `/clubes/minhas-afiliacoes` (R9-E · S-R9-11-T7/T8 ·
// RN-318/319, lado do INFLUENCIADOR). O clube-influenciador (dono do clube)
// ou o influenciador PF vê SÓ as PRÓPRIAS conversões — projeção fechada do
// reader (qtd/valor/instantes; nunca dado de outros compradores nem afiliado
// de terceiro). Funciona para qualquer conta logada (não exige claim de
// tenant): quem não tem afiliação vê EmptyState honesto.
// =============================================================================

import { useEffect, useState } from 'react';
import {
  Badge,
  EmptyState,
  KpiCard,
  PageHeader,
  Skeleton,
  Table,
} from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import {
  getMinhasAfiliacoes,
  type ConversaoProjetada,
  type MinhaAfiliacao,
  type RepasseProjetado,
} from '@leela/api-client';

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

const COLUNAS_REPASSE: TableColumn<RepasseProjetado>[] = [
  { key: 'quando', header: 'Registrado em', render: (r) => formatData(r.criadoEmMillis) },
  { key: 'valor', header: 'Valor', align: 'right', render: (r) => formatBRL(r.valor) },
  { key: 'obs', header: 'Observação', render: (r) => r.observacao ?? '—' },
];

function CartaoAfiliacao({ a }: { a: MinhaAfiliacao }): JSX.Element {
  const gateFechado =
    a.minimoInscricoes !== null && a.conversoes < a.minimoInscricoes;
  // RN-318: comissão só existe quando o organizador a configurou p/ este link.
  const temComissao = a.comissao !== null;
  const devendo = a.saldoComissao < 0;
  const colunas: TableColumn<ConversaoProjetada>[] = [
    { key: 'quando', header: 'Confirmada em', render: (c) => formatData(c.convertidoEmMillis) },
    { key: 'inscricoes', header: 'Inscrições', align: 'right', render: (c) => String(c.qtdInscricoes) },
    { key: 'valor', header: 'Valor', align: 'right', render: (c) => formatBRL(c.valor) },
    ...(temComissao
      ? [{ key: 'comissao', header: 'Comissão', align: 'right' as const, render: (c: ConversaoProjetada) => formatBRL(c.comissao) }]
      : []),
  ];
  return (
    <article className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)]">
        <div className="flex flex-col">
          <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
            {a.eventoNome}
          </h2>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Link <code>?ref={a.refCodigo}</code> · janela {a.janelaAtribuicaoDias} dias
            {a.cupomCodigo !== null ? ` · cupom ${a.cupomCodigo}` : ''}
          </span>
        </div>
        {a.status === 'ativo' ? (
          <Badge variant="vitoria">Ativa</Badge>
        ) : (
          <Badge variant="neutro">{a.status === 'convite_pendente' ? 'Aguardando aceite' : 'Inativa'}</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-[var(--spacing-4)] md:grid-cols-3">
        <KpiCard label="Inscrições atribuídas" value={a.conversoes.toLocaleString('pt-BR')} />
        <KpiCard label="Valor atribuído (bruto)" value={formatBRL(a.valorAtribuido)} />
        {a.minimoInscricoes !== null ? (
          <KpiCard
            label="Desconto do cupom"
            value={gateFechado ? `${a.conversoes}/${a.minimoInscricoes}` : 'Ativo'}
            hint={gateFechado ? 'ativa ao atingir o mínimo (sem retroativo)' : 'mínimo atingido'}
          />
        ) : null}
      </div>

      {temComissao ? (
        <div className="grid grid-cols-2 gap-[var(--spacing-4)] md:grid-cols-3">
          <KpiCard label="Comissão acumulada" value={formatBRL(a.comissaoAcumulada)} />
          <KpiCard label="Já repassada" value={formatBRL(a.comissaoRepassada)} />
          <KpiCard
            label="Saldo"
            value={`${formatBRL(a.saldoComissao)}${devendo ? ' (dívida)' : ''}`}
            hint={devendo ? 'estorno após repasse — saldo devedor' : 'a receber do organizador'}
          />
        </div>
      ) : null}

      {a.ultimasConversoes.length > 0 ? (
        <Table
          columns={colunas}
          data={a.ultimasConversoes}
          keyExtractor={(c) => `${a.refCodigo}-${c.convertidoEmMillis ?? 'sem-data'}-${c.valor}-${c.qtdInscricoes}`}
          caption={`Últimas conversões de ${a.eventoNome}`}
        />
      ) : (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Nenhuma conversão confirmada ainda — compartilhe seu link.
        </p>
      )}

      {temComissao && a.ultimosRepasses.length > 0 ? (
        <div className="flex flex-col gap-[var(--spacing-2)]">
          <h3 className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-secondary)]">
            Repasses registrados
          </h3>
          <Table
            columns={COLUNAS_REPASSE}
            data={a.ultimosRepasses}
            keyExtractor={(r) => `${a.refCodigo}-repasse-${r.criadoEmMillis ?? 'sem-data'}-${r.valor}`}
            caption={`Repasses de ${a.eventoNome}`}
          />
        </div>
      ) : null}
    </article>
  );
}

export function MinhasAfiliacoesPage(): JSX.Element {
  const [afiliacoes, setAfiliacoes] = useState<MinhaAfiliacao[] | null>(null);
  const [erro, setErro] = useState<Error | null>(null);

  useEffect(() => {
    let vivo = true;
    getMinhasAfiliacoes()
      .then((r) => {
        if (vivo) setAfiliacoes(r.afiliacoes);
      })
      .catch((e) => {
        if (vivo) setErro(e instanceof Error ? e : new Error('falha'));
      });
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Minhas afiliações"
        subtitle="As conversões dos SEUS links de divulgação — só as suas"
      />
      <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
        {afiliacoes === null && erro === null ? (
          <div role="status" aria-label="Carregando afiliações" className="flex flex-col gap-[var(--spacing-4)]">
            <Skeleton variant="rect" className="h-40" />
            <Skeleton variant="rect" className="h-40" />
          </div>
        ) : erro !== null ? (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            Não foi possível carregar suas afiliações. Tente novamente.
          </div>
        ) : (afiliacoes ?? []).length === 0 ? (
          <EmptyState
            title="Você ainda não tem afiliações"
            description="Quando um organizador criar um link de divulgação para você (ou para o seu clube), as conversões aparecem aqui."
          />
        ) : (
          (afiliacoes ?? []).map((a) => (
            <CartaoAfiliacao key={`${a.eventoId}:${a.refCodigo}`} a={a} />
          ))
        )}
      </div>
    </div>
  );
}

MinhasAfiliacoesPage.displayName = 'MinhasAfiliacoesPage';
