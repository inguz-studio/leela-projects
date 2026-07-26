// =============================================================================
// RepassesView — telas do organizador do repasse (E09s-L3). Presentational:
// compõe o painel-slim (3 cards de saldo · T1), os dados bancários (T2), a
// solicitação de repasse (T3) e o histórico + comprovante (T4). Zero acesso a
// dados/callable aqui — tudo chega por props do container (RepassesPage).
//
// DINHEIRO: os cards leem SÓ `saldo/current` (∑ do servidor — RN-350/351); a
// tela nunca soma eventos. Estados honestos (§2.12): erro de carga mostra
// "Tentar novamente", sem venda mostra "Nenhuma movimentação".
// =============================================================================

import * as React from 'react';
import { Button, PageHeader } from '@leela/design-system';
import type { DadosBancarios, Repasse, SaldoRepasse } from '@leela/core';
import type { SaveDadosBancariosInput } from '@leela/api-client';
import { SaldoCards } from './_components/SaldoCards';
import { RepassesPorEvento } from './_components/RepassesPorEvento';
import { DadosBancariosSection } from './_components/DadosBancariosSection';
import { SolicitarRepasseModal } from './_components/SolicitarRepasseModal';
import { HistoricoRepasses } from './_components/HistoricoRepasses';
import { RepasseErro } from './_components/RepasseErro';
import {
  associarRepassesPorEvento,
  type LinhaRepasseEvento,
} from './_lib/repassesPorEvento';

export interface RepassesViewProps {
  saldo: SaldoRepasse | null;
  saldoLoading: boolean;
  saldoError: Error | null;
  onRetrySaldo: () => void;

  // Por evento (RN-349)
  porEvento: LinhaRepasseEvento[];
  porEventoLoading: boolean;
  porEventoError: Error | null;
  onRetryPorEvento: () => void;

  // Dados bancários (T2)
  dadosBancarios: DadosBancarios | null;
  dbLoading: boolean;
  dbError: Error | null;
  onRetryDb: () => void;
  dbSaving: boolean;
  dbSaveError?: string | undefined;
  onSubmitDados: (input: SaveDadosBancariosInput) => Promise<boolean>;

  // Solicitar repasse (T3) — eventoId opcional (RN-349 · associação exata)
  solicitarRunning: boolean;
  /** Solicita o repasse; resolve `true` em sucesso (o view fecha o modal). */
  onSolicitar: (valor: number, eventoId?: string) => Promise<boolean>;

  // Histórico (T4)
  historico: Repasse[];
  histLoading: boolean;
  histError: Error | null;
  onRetryHist: () => void;
}

export function RepassesView({
  saldo,
  saldoLoading,
  saldoError,
  onRetrySaldo,
  porEvento,
  porEventoLoading,
  porEventoError,
  onRetryPorEvento,
  dadosBancarios,
  dbLoading,
  dbError,
  onRetryDb,
  dbSaving,
  dbSaveError,
  onSubmitDados,
  solicitarRunning,
  onSolicitar,
  historico,
  histLoading,
  histError,
  onRetryHist,
}: RepassesViewProps): JSX.Element {
  const [solicitarAberto, setSolicitarAberto] = React.useState(false);

  const disponivel = saldo?.disponivel ?? 0;
  // Só solicita com dados bancários cadastrados E saldo disponível > 0 (o
  // servidor reconfere — RN-352). Botão desabilitado é o estado honesto.
  const podeSolicitar = dadosBancarios !== null && disponivel > 0;

  // RN-349 — associação exata repasse↔evento: agrupamento PURO do histórico
  // pelo campo `eventoId` (fim de heurística); docs legados sem o campo caem
  // na nota "sem associação" da seção Por evento.
  const associacao = React.useMemo(
    () => associarRepassesPorEvento(historico),
    [historico],
  );
  const eventosAssociaveis = React.useMemo(
    () => porEvento.map((l) => ({ id: l.eventoId, nome: l.nome })),
    [porEvento],
  );

  return (
    <div className="flex flex-col gap-[var(--spacing-6)] pb-[var(--spacing-8)]">
      <PageHeader
        title="Repasses"
        // RN-358: declara explicitamente que Repasses é a visão CONSOLIDADA de
        // todos os eventos — não o financeiro de um evento específico.
        subtitle="Saldo e repasses consolidados de todos os seus eventos"
        actions={
          <Button
            variant="primary"
            disabled={!podeSolicitar}
            onClick={() => setSolicitarAberto(true)}
          >
            Solicitar repasse
          </Button>
        }
      />

      <div className="flex flex-col gap-[var(--spacing-8)] px-[var(--spacing-6)]">
        {/* Saldo — 3 cards flat (§2.16). Erro de carga não vira zeros felizes. */}
        {saldoError ? (
          <RepasseErro
            message="Não foi possível carregar seu saldo de repasse."
            onRetry={onRetrySaldo}
          />
        ) : (
          <SaldoCards saldo={saldo} loading={saldoLoading} />
        )}

        {/* Por evento (RN-349) — quebra vendido/retido/disponível estimado por
            evento. Os cards acima seguem como saldo autoritativo (∑ do servidor). */}
        <RepassesPorEvento
          linhas={porEvento}
          associacao={associacao}
          loading={porEventoLoading}
          error={porEventoError}
          onRetry={onRetryPorEvento}
        />

        {/* Dados bancários (T2) — resumo mascarado ↔ form (RN-354). */}
        <DadosBancariosSection
          dados={dadosBancarios}
          loading={dbLoading}
          error={dbError}
          onRetry={onRetryDb}
          saving={dbSaving}
          saveError={dbSaveError}
          onSubmit={onSubmitDados}
        />

        {/* Histórico (T4) — tabela densa + comprovante do pago (RN-355/356). */}
        <HistoricoRepasses
          repasses={historico}
          loading={histLoading}
          error={histError}
          onRetry={onRetryHist}
        />
      </div>

      {/* Modal de solicitação (T3) — só com dados bancários salvos. */}
      {dadosBancarios !== null && (
        <SolicitarRepasseModal
          open={solicitarAberto}
          onOpenChange={setSolicitarAberto}
          dados={dadosBancarios}
          disponivel={disponivel}
          eventos={eventosAssociaveis}
          running={solicitarRunning}
          onConfirmar={async (valor, eventoId) => {
            const ok = await onSolicitar(valor, eventoId);
            if (ok) setSolicitarAberto(false);
            return ok;
          }}
        />
      )}
    </div>
  );
}

RepassesView.displayName = 'RepassesView';
