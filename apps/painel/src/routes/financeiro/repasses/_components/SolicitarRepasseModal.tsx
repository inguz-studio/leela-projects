// =============================================================================
// SolicitarRepasseModal — modal "Solicitar repasse" (E09s-L3-T3). Lista os
// dados bancários salvos (MASCARADOS — RN-354) como destino + campo de valor.
//
// Espelho CLIENT de RN-352 (avaliarSolicitacao): valor > disponível (ou <= 0)
// ⇒ botão bloqueado + hint. Mas o SERVIDOR é autoritativo: `requestRepasse`
// relê o disponível e pode recusar (failed-precondition) — o container trata
// esse erro com Toast. Sucesso ⇒ o container fecha o modal e o histórico ganha
// o novo item em `solicitado`.
// =============================================================================

import * as React from 'react';
import { Button, Input, Modal } from '@leela/design-system';
import type { DadosBancarios } from '@leela/core';
import { formatBRL } from '../_lib/format';
import { rotuloTipoConta } from '../_lib/dadosBancariosForm';
import { avaliarSolicitacao } from '../_lib/solicitarForm';

export interface SolicitarRepasseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dados bancários salvos (destino do repasse) — mascarados. */
  dados: DadosBancarios;
  /** Disponível do saldo (espelho de RN-352; o servidor reconfere). */
  disponivel: number;
  running: boolean;
  /** Confirma; resolve `true` em sucesso (o container fecha o modal). */
  onConfirmar: (valor: number) => Promise<boolean>;
}

export function SolicitarRepasseModal({
  open,
  onOpenChange,
  dados,
  disponivel,
  running,
  onConfirmar,
}: SolicitarRepasseModalProps): JSX.Element {
  const [texto, setTexto] = React.useState('');

  // Zera o campo a cada abertura.
  React.useEffect(() => {
    if (open) setTexto('');
  }, [open]);

  const avaliacao = avaliarSolicitacao(texto, disponivel);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!avaliacao.podeEnviar || avaliacao.valor === null || running) return;
    void onConfirmar(avaliacao.valor);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Solicitar repasse"
      description="O valor cai na conta cadastrada após a aprovação. O pagamento é registrado manualmente nesta versão."
      size="md"
      footer={
        <>
          <Button variant="secondary" disabled={running} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="solicitar-repasse-form"
            variant="primary"
            disabled={running || !avaliacao.podeEnviar}
          >
            {running ? 'Enviando…' : 'Solicitar'}
          </Button>
        </>
      }
    >
      <form id="solicitar-repasse-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-[var(--spacing-4)]">
        {/* Destino — dados MASCARADOS (nunca o número em claro). */}
        <div className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--radius-md)] bg-[var(--surface-overlay)] p-[var(--spacing-3)]">
          <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">Destino</span>
          <span className="text-[length:var(--font-size-base)] text-[var(--text-primary)]">
            {dados.banco} · Ag. {dados.agencia} · {dados.contaMascarada} ({rotuloTipoConta(dados.tipo)})
          </span>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">{dados.titular}</span>
        </div>

        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)] [font-variant-numeric:tabular-nums]">
          Disponível para saque: <strong className="text-[var(--text-primary)]">{formatBRL(disponivel)}</strong>
        </p>

        <Input
          id="repasse-valor"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          label="Valor do repasse (R$)"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="0,00"
          disabled={running}
          {...(avaliacao.hint ? { 'aria-describedby': 'repasse-valor-hint' } : {})}
        />
        {avaliacao.hint && (
          <p id="repasse-valor-hint" role="note" className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]">
            {avaliacao.hint}
          </p>
        )}
      </form>
    </Modal>
  );
}

SolicitarRepasseModal.displayName = 'SolicitarRepasseModal';
