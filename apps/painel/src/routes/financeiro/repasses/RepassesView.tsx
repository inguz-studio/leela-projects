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
import { DadosBancariosSection } from './_components/DadosBancariosSection';
import { SolicitarRepasseModal } from './_components/SolicitarRepasseModal';
import { HistoricoRepasses } from './_components/HistoricoRepasses';
import { RepasseErro } from './_components/RepasseErro';

export interface RepassesViewProps {
  saldo: SaldoRepasse | null;
  saldoLoading: boolean;
  saldoError: Error | null;
  onRetrySaldo: () => void;

  // Dados bancários (T2)
  dadosBancarios: DadosBancarios | null;
  dbLoading: boolean;
  dbError: Error | null;
  onRetryDb: () => void;
  dbSaving: boolean;
  dbSaveError?: string | undefined;
  onSubmitDados: (input: SaveDadosBancariosInput) => Promise<boolean>;

  // Solicitar repasse (T3)
  solicitarRunning: boolean;
  /** Solicita o repasse; resolve `true` em sucesso (o view fecha o modal). */
  onSolicitar: (valor: number) => Promise<boolean>;

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

  return (
    <div className="flex flex-col gap-[var(--spacing-6)] pb-[var(--spacing-8)]">
      <PageHeader
        title="Repasses"
        subtitle="Seu saldo de vendas, dados bancários e histórico de saques"
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
          running={solicitarRunning}
          onConfirmar={async (valor) => {
            const ok = await onSolicitar(valor);
            if (ok) setSolicitarAberto(false);
            return ok;
          }}
        />
      )}
    </div>
  );
}

RepassesView.displayName = 'RepassesView';
