// =============================================================================
// SolicitarRepasseModal — modal "Solicitar repasse" (E09s-L3-T3). Lista os
// dados bancários salvos (MASCARADOS — RN-354) como destino, o evento de onde
// o dinheiro sai e o valor.
//
// DEC-0727C · RN-369: o evento é OBRIGATÓRIO. O default "Sem associação (saldo
// geral)" morreu — era o caminho mais provável de uso e criava um repasse que
// não abatia evento nenhum, o R$ 500 fantasma do §P-IAMENU-2 (escalado E-2 da
// review CAIXADISP-REV). Verbatim do dono: repasse sempre amarrado a um evento.
//
// O teto exibido e validado é o disponível DAQUELE evento (RN-367/368) — o
// MESMO número do card "Disponível para Repasse" da Caixa. Coerência ponta a
// ponta: o número que a pessoa leu na aba do evento é o número que o modal
// aceita e o que o servidor autoriza. O saldo consolidado continua sendo um
// teto (RN-352), com hint próprio quando ele é o que barra.
//
// O SERVIDOR é autoritativo: `requestRepasse` relê os dois tetos e pode recusar
// (failed-precondition) — o container trata com Toast, e o erro tipado do guard
// por evento vira frase com número (`repasseErrorMessage`).
// =============================================================================

import * as React from 'react';
import { Button, Input, Modal, Select } from '@leela/design-system';
import type { DadosBancarios } from '@leela/core';
import { formatBRL } from '../_lib/format';
import { rotuloTipoConta } from '../_lib/dadosBancariosForm';
import { avaliarSolicitacao } from '../_lib/solicitarForm';

/** Opção de associação do repasse (RN-349/369) — eventos com movimento. */
export interface EventoAssociavel {
  id: string;
  nome: string;
  /**
   * Disponível DAQUELE evento (RN-367) — o mesmo número do card da Caixa.
   * `null` = evento sem termo comercial: indeterminado, não zero.
   */
  disponivel: number | null;
}

export interface SolicitarRepasseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dados bancários salvos (destino do repasse) — mascarados. */
  dados: DadosBancarios;
  /** Saldo consolidado do tenant (espelho de RN-352; o servidor reconfere). */
  disponivel: number;
  /** Eventos associáveis (RN-349) — sem eles não há repasse a solicitar. */
  eventos: EventoAssociavel[];
  running: boolean;
  /** Confirma; resolve `true` em sucesso (o container fecha o modal). */
  onConfirmar: (valor: number, eventoId: string) => Promise<boolean>;
}

/** Valor do placeholder do Select — nunca vai ao servidor (RN-369). */
const NENHUM_EVENTO = '';

export function SolicitarRepasseModal({
  open,
  onOpenChange,
  dados,
  disponivel,
  eventos,
  running,
  onConfirmar,
}: SolicitarRepasseModalProps): JSX.Element {
  const [texto, setTexto] = React.useState('');
  const [eventoId, setEventoId] = React.useState<string>(NENHUM_EVENTO);

  // Zera os campos a cada abertura. Um único evento associável é pré-escolhido
  // — não há decisão a tomar, e obrigar o clique só adicionaria um passo.
  const unico = eventos.length === 1 ? eventos[0] : undefined;
  React.useEffect(() => {
    if (open) {
      setTexto('');
      setEventoId(unico ? unico.id : NENHUM_EVENTO);
    }
  }, [open, unico]);

  const eventoEscolhido =
    eventoId === NENHUM_EVENTO ? null : (eventos.find((e) => e.id === eventoId) ?? null);
  const avaliacao = avaliarSolicitacao({
    texto,
    eventoId: eventoEscolhido === null ? null : eventoEscolhido.id,
    disponivelDoEvento: eventoEscolhido?.disponivel ?? null,
    disponivelDoTenant: disponivel,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!avaliacao.podeEnviar || avaliacao.valor === null || eventoEscolhido === null) return;
    if (running) return;
    void onConfirmar(avaliacao.valor, eventoEscolhido.id);
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

        {/* Evento (RN-369) — OBRIGATÓRIO e primeiro: ele decide o teto que o
            campo de valor vai respeitar, então perguntar depois seria pedir um
            número contra um limite que a pessoa ainda não conhece. */}
        {eventos.length > 0 ? (
          <Select
            id="repasse-evento"
            label="Evento deste repasse"
            value={eventoId}
            onChange={(e) => setEventoId(e.target.value)}
            disabled={running}
            options={[
              ...(unico ? [] : [{ value: NENHUM_EVENTO, label: 'Selecione o evento' }]),
              ...eventos.map((ev) => ({ value: ev.id, label: ev.nome })),
            ]}
          />
        ) : (
          <p role="note" className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            Nenhum evento com receita confirmada para repassar.
          </p>
        )}

        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)] [font-variant-numeric:tabular-nums]">
          {eventoEscolhido === null ? (
            <>Escolha o evento para ver quanto ele tem disponível.</>
          ) : eventoEscolhido.disponivel === null ? (
            <>Este evento ainda não tem termo comercial.</>
          ) : (
            <>
              Disponível neste evento:{' '}
              <strong className="text-[var(--text-primary)]">
                {formatBRL(eventoEscolhido.disponivel)}
              </strong>
            </>
          )}
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
          disabled={running || eventos.length === 0}
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
