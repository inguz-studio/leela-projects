// =============================================================================
// SolicitarRepasseModal — DEC-0727C · RN-369.
//
// O mundo que este arquivo cravava tinha um seletor "Associar a um evento
// (opcional)" com o default "Sem associação (saldo geral)", e a asserção
// central era "valor válido SEM associação → confirma com (valor, undefined)".
// Esse caminho era o mais provável de uso e criava um repasse que não abatia
// evento nenhum — o R$ 500 fantasma do §P-IAMENU-2, escalado como E-2 pela
// review CAIXADISP-REV e fechado pelo dono no item 38.
//
// A asserção saiu e a substituta é mais forte: agora se prova que sem evento o
// envio é IMPOSSÍVEL, e que o teto validado é o DAQUELE evento — o mesmo número
// do card "Disponível para Repasse" da Caixa (RN-367/368).
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DadosBancarios, Timestamp } from '@leela/core';
import { SolicitarRepasseModal, type EventoAssociavel } from '../SolicitarRepasseModal';

function ts(ms: number): Timestamp {
  return { seconds: Math.floor(ms / 1000), nanoseconds: 0, toDate: () => new Date(ms), toMillis: () => ms };
}

function mkDados(over: Partial<DadosBancarios> = {}): DadosBancarios {
  return {
    tenantId: 'castelo',
    banco: '260 — Nubank',
    agencia: '0001',
    contaMascarada: '****1234',
    tipo: 'corrente',
    pixMascarado: null,
    titular: 'Marina Castelo',
    cpfCnpjMascarado: '***.***.***-12',
    criadoEm: ts(0),
    atualizadoEm: ts(0),
    ...over,
  };
}

/** Dois eventos com tetos DIFERENTES — é o que expõe o teto por evento. */
const EVENTOS: EventoAssociavel[] = [
  { id: 'meia-floripa-2026', nome: 'Meia de Floripa 2026', disponivel: 8500 },
  { id: 'trail-serra', nome: 'Trail da Serra', disponivel: 1200 },
];

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ');

function montar(over: Partial<React.ComponentProps<typeof SolicitarRepasseModal>> = {}) {
  const onConfirmar = vi.fn(async () => true);
  render(
    <SolicitarRepasseModal
      open
      onOpenChange={vi.fn()}
      dados={mkDados()}
      disponivel={17000}
      eventos={EVENTOS}
      running={false}
      onConfirmar={onConfirmar}
      {...over}
    />,
  );
  return { onConfirmar };
}

describe('SolicitarRepasseModal (E09s-L3-T3 · RN-349/369)', () => {
  it('lista os dados bancários MASCARADOS', () => {
    montar();
    const dialog = screen.getByRole('dialog');
    expect(norm(dialog.textContent)).toContain('****1234');
    expect(norm(dialog.textContent)).toContain('Marina Castelo');
  });

  it('botão Solicitar bloqueado com campo vazio', () => {
    montar();
    expect(screen.getByRole('button', { name: 'Solicitar' })).toBeDisabled();
  });

  it('running → botão em "Enviando…" e desabilitado', () => {
    montar({ running: true });
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// RN-369 — o evento é obrigatório; o "sem associação" morreu
// ---------------------------------------------------------------------------

describe('RN-369 · sem evento não há repasse', () => {
  it('a opção "Sem associação (saldo geral)" NÃO existe mais, nem o rótulo opcional', () => {
    montar();
    expect(screen.queryByText('Sem associação (saldo geral)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Associar a um evento (opcional)')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Evento deste repasse')).toBeInTheDocument();
  });

  it('valor digitado SEM escolher evento: botão bloqueado + o que falta, dito', async () => {
    const { onConfirmar } = montar();
    await userEvent.type(screen.getByLabelText('Valor do repasse (R$)'), '5000');
    expect(screen.getByText('Escolha o evento deste repasse.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar' })).toBeDisabled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('com evento escolhido, confirma com (valor, eventoId) — nunca undefined', async () => {
    const { onConfirmar } = montar();
    await userEvent.selectOptions(
      screen.getByLabelText('Evento deste repasse'),
      'meia-floripa-2026',
    );
    await userEvent.type(screen.getByLabelText('Valor do repasse (R$)'), '5000');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar' }));
    expect(onConfirmar).toHaveBeenCalledWith(5000, 'meia-floripa-2026');
  });

  it('evento ÚNICO já vem escolhido — sem passo inútil, e sem placeholder', async () => {
    const { onConfirmar } = montar({ eventos: [EVENTOS[0] as EventoAssociavel] });
    expect(screen.queryByText('Selecione o evento')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Valor do repasse (R$)'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar' }));
    expect(onConfirmar).toHaveBeenCalledWith(100, 'meia-floripa-2026');
  });

  it('sem eventos associáveis: estado honesto e campo de valor travado', () => {
    montar({ eventos: [] });
    expect(
      screen.getByText('Nenhum evento com receita confirmada para repassar.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Valor do repasse (R$)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Solicitar' })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// RN-367/368 — o teto é o do evento, e é o mesmo número da Caixa
// ---------------------------------------------------------------------------

describe('RN-368 · o teto exibido e validado é o DAQUELE evento', () => {
  it('antes de escolher, o modal não finge saber o teto', () => {
    montar();
    expect(
      screen.getByText('Escolha o evento para ver quanto ele tem disponível.'),
    ).toBeInTheDocument();
  });

  it('escolher o evento mostra o disponível DELE — e trocar de evento troca o número', async () => {
    montar();
    const seletor = screen.getByLabelText('Evento deste repasse');

    // `formatBRL` deste módulo sai COM centavos (o do dashboard arredonda):
    // aqui é dinheiro que a pessoa vai conferir contra o extrato.
    await userEvent.selectOptions(seletor, 'meia-floripa-2026');
    expect(screen.getByText(/^R\$\s*8\.500,00$/)).toBeInTheDocument();

    await userEvent.selectOptions(seletor, 'trail-serra');
    expect(screen.getByText(/^R\$\s*1\.200,00$/)).toBeInTheDocument();
    expect(screen.queryByText(/^R\$\s*8\.500,00$/)).not.toBeInTheDocument();
  });

  it('valor acima do teto DO EVENTO bloqueia, mesmo com folga no tenant', async () => {
    const { onConfirmar } = montar();
    await userEvent.selectOptions(screen.getByLabelText('Evento deste repasse'), 'trail-serra');
    // 5.000 cabe folgado nos 17.000 do tenant e NÃO cabe nos 1.200 do evento —
    // era exatamente assim que um evento consumia o liberado do vizinho.
    await userEvent.type(screen.getByLabelText('Valor do repasse (R$)'), '5000');
    expect(screen.getByText('O valor excede o disponível deste evento.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar' })).toBeDisabled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('cabe no evento mas não no tenant: o hint diz qual dos dois tetos barrou', async () => {
    montar({ disponivel: 500 });
    await userEvent.selectOptions(
      screen.getByLabelText('Evento deste repasse'),
      'meia-floripa-2026',
    );
    await userEvent.type(screen.getByLabelText('Valor do repasse (R$)'), '1000');
    expect(
      screen.getByText('O valor cabe neste evento, mas excede o saldo disponível da sua conta.'),
    ).toBeInTheDocument();
  });

  it('evento sem termo comercial: sem teto, sem envio, com a razão na tela', async () => {
    montar({ eventos: [{ id: 'sem-termo', nome: 'Evento sem termo', disponivel: null }] });
    expect(screen.getByText('Este evento ainda não tem termo comercial.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Valor do repasse (R$)'), '10');
    expect(
      screen.getByText(
        'Este evento ainda não tem termo comercial: não há disponível para repassar.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar' })).toBeDisabled();
  });
});
