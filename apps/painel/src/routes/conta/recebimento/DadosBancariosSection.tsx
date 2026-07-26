// =============================================================================
// DadosBancariosSection — bloco "Dados bancários" de **Configurações › Dados
// de recebimento** (`/conta`). Orquestra os dois modos: resumo MASCARADO (dado
// já salvo) ↔ form (cadastro/edição). Após salvar, a tela mostra SÓ o mascarado
// (`****1234` / PIX/CPF mascarados — RN-354); o número em claro nunca aparece.
// Presentational; o estado `editando` é UI local (o dado e o save chegam por
// props do container).
//
// RN-366: dados bancários são do TITULAR, não da origem do dinheiro. Por isso
// o cadastro é único e mora aqui, e não dentro de Repasses — quando o clube
// pago existir e trouxer a segunda origem, não há dado de titular duplicado
// para reconciliar. O saldo segue único (RN-334) e o saque acontece na origem.
//
// `RepasseErro` e `_lib/dadosBancariosForm` continuam vindo do módulo de
// repasse: são COMPARTILHADOS (ComprovanteModal, SolicitarRepasseModal,
// HistoricoRepasses e RepassesPorEvento também os usam). Mover o que é
// compartilhado por causa de um consumidor criaria a cópia que esta rodada
// existe para evitar.
// =============================================================================

import * as React from 'react';
import { Button, Skeleton } from '@leela/design-system';
import type { DadosBancarios } from '@leela/core';
import type { SaveDadosBancariosInput } from '@leela/api-client';
import { DadosBancariosForm } from './DadosBancariosForm';
import { RepasseErro } from '../../eventos/repasses/_components/RepasseErro';
import {
  DADOS_BANCARIOS_INICIAIS,
  rotuloTipoConta,
} from '../../eventos/repasses/_lib/dadosBancariosForm';

export interface DadosBancariosSectionProps {
  dados: DadosBancarios | null;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  saving: boolean;
  saveError?: string | undefined;
  /** Salva via callable; resolve `true` em sucesso → a section sai do modo edição. */
  onSubmit: (input: SaveDadosBancariosInput) => Promise<boolean>;
}

export function DadosBancariosSection({
  dados,
  loading,
  error,
  onRetry,
  saving,
  saveError,
  onSubmit,
}: DadosBancariosSectionProps): JSX.Element {
  const [editando, setEditando] = React.useState(false);

  function handleSubmit(input: SaveDadosBancariosInput) {
    void onSubmit(input).then((ok) => {
      if (ok) setEditando(false);
    });
  }

  const modoForm = dados === null || editando;

  return (
    <section aria-label="Dados bancários" className="flex flex-col gap-[var(--spacing-4)]">
      <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        Dados bancários
      </h2>

      {loading ? (
        <div role="status" aria-label="Carregando dados bancários" className="flex flex-col gap-[var(--spacing-3)]">
          <Skeleton variant="rect" className="h-40" />
        </div>
      ) : error ? (
        <RepasseErro message="Não foi possível carregar seus dados bancários." onRetry={onRetry} />
      ) : modoForm ? (
        <DadosBancariosForm
          editando={editando}
          initial={
            editando && dados
              ? {
                  ...DADOS_BANCARIOS_INICIAIS,
                  banco: dados.banco,
                  agencia: dados.agencia,
                  tipo: dados.tipo,
                  titular: dados.titular,
                }
              : DADOS_BANCARIOS_INICIAIS
          }
          saving={saving}
          saveError={saveError}
          onSubmit={handleSubmit}
          onCancel={editando ? () => setEditando(false) : undefined}
        />
      ) : (
        <DadosBancariosResumo dados={dados} onEditar={() => setEditando(true)} />
      )}
    </section>
  );
}

/** Resumo MASCARADO do dado salvo + ação de editar (nunca o número em claro). */
function DadosBancariosResumo({
  dados,
  onEditar,
}: {
  dados: DadosBancarios;
  onEditar: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <dl className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
        <Campo rotulo="Banco" valor={dados.banco} />
        <Campo rotulo="Agência" valor={dados.agencia} />
        <Campo rotulo="Conta" valor={dados.contaMascarada} />
        <Campo rotulo="Tipo" valor={rotuloTipoConta(dados.tipo)} />
        <Campo rotulo="Titular" valor={dados.titular} />
        <Campo rotulo="CPF/CNPJ" valor={dados.cpfCnpjMascarado} />
        <Campo rotulo="Chave PIX" valor={dados.pixMascarado ?? '—'} />
      </dl>
      <div>
        <Button variant="secondary" size="sm" onClick={onEditar}>
          Editar
        </Button>
      </div>
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-1)]">
      <dt className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
        {rotulo}
      </dt>
      <dd className="text-[length:var(--font-size-base)] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
        {valor}
      </dd>
    </div>
  );
}

DadosBancariosSection.displayName = 'DadosBancariosSection';
