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
import { useNavigate } from 'react-router-dom';
import { Button, PageHeader, Skeleton } from '@leela/design-system';
import type { DadosBancarios, Repasse, SaldoRepasse } from '@leela/core';
import { SaldoCards } from './_components/SaldoCards';
import { RepassesPorEvento } from './_components/RepassesPorEvento';
import { PreRequisitoRecebimento } from './_components/PreRequisitoRecebimento';
import { SolicitarRepasseModal } from './_components/SolicitarRepasseModal';
import { HistoricoRepasses } from './_components/HistoricoRepasses';
import { RepasseErro } from './_components/RepasseErro';
import {
  abaterRepassesVivos,
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

  // Dados de recebimento (RN-366 · IAM-T5): LEITURA apenas. O cadastro mudou
  // de casa (Configurações › Dados de recebimento, `/conta`); aqui o dado só
  // decide se o saque é possível e, quando falta, mostra o caminho até lá.
  dadosBancarios: DadosBancarios | null;
  dbLoading: boolean;
  dbError: Error | null;
  onRetryDb: () => void;

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
  solicitarRunning,
  onSolicitar,
  historico,
  histLoading,
  histError,
  onRetryHist,
}: RepassesViewProps): JSX.Element {
  const navigate = useNavigate();
  const [solicitarAberto, setSolicitarAberto] = React.useState(false);

  const disponivel = saldo?.disponivel ?? 0;
  // Só solicita com dados bancários cadastrados E saldo disponível > 0 (o
  // servidor reconfere — RN-352). Botão desabilitado é o estado honesto.
  //
  // RISCO #5 da rodada IA-MENU: até aqui esse pré-requisito era garantido por
  // PROXIMIDADE — o formulário bancário ficava a dois centímetros do botão,
  // então "tem dado salvo" era quase tautológico. Com o cadastro em
  // Configurações a proximidade acabou, e a checagem passa a ser de propósito:
  // sem dado, o botão não habilita, o modal não monta e a tela DIZ onde
  // cadastrar. Nunca um modal de saque que o servidor vai recusar, na tela
  // onde a pessoa tira dinheiro.
  const semDadosDeRecebimento = !dbLoading && dbError === null && dadosBancarios === null;
  const podeSolicitar = dadosBancarios !== null && disponivel > 0;

  // RN-349 — associação exata repasse↔evento: agrupamento PURO do histórico
  // pelo campo `eventoId` (fim de heurística); docs legados sem o campo caem
  // na nota "sem associação" da seção Por evento.
  const associacao = React.useMemo(
    () => associarRepassesPorEvento(historico),
    [historico],
  );
  // DEC-0727 — o disponível por evento abate os repasses vivos daquele evento.
  // A junção acontece aqui porque as linhas vêm do fan-out financeiro e a
  // associação vem do histórico: dois readers que só se encontram nesta view.
  // A conta em si é pura (`abaterRepassesVivos` → `computeDisponivelPorEvento`),
  // a mesma que a Caixa do evento usa — as duas telas descontam o mesmo.
  const porEventoAbatido = React.useMemo(
    () => abaterRepassesVivos(porEvento, associacao),
    [porEvento, associacao],
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
            evento, já abatidos os repasses vivos de cada um (DEC-0727). Os cards
            acima seguem como saldo autoritativo (∑ do servidor). */}
        <RepassesPorEvento
          linhas={porEventoAbatido}
          associacao={associacao}
          loading={porEventoLoading}
          error={porEventoError}
          onRetry={onRetryPorEvento}
        />

        {/* Dados de recebimento (RN-366 · IAM-T5) — o cadastro mora em
            Configurações; aqui só o pré-requisito do saque. Enquanto carrega,
            skeleton: nunca anunciar "faltam dados" sobre um dado que ainda
            está vindo. */}
        {dbLoading ? (
          <div role="status" aria-label="Carregando dados de recebimento">
            <Skeleton variant="rect" className="h-24" />
          </div>
        ) : dbError ? (
          <RepasseErro
            message="Não foi possível verificar seus dados de recebimento."
            onRetry={onRetryDb}
          />
        ) : semDadosDeRecebimento ? (
          <PreRequisitoRecebimento onIrParaConfiguracoes={() => navigate('/conta')} />
        ) : null}

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
