// =============================================================================
// Aba Financeiro · bloco de faturamento (ADMIN-VISAO onda 2 · S1613-T4).
//
// O caso que este arquivo existe para travar: "Faturamento gerado" NÃO é um
// número. O dono nomeou TPV menos custos operacionais menos repasses, e o
// custo operacional não tem fonte no sistema — então o rótulo carrega a causa,
// e nenhuma cifra aparece debaixo dele.
//
// Componente apresentacional testado direto por props (o relógio é injetado,
// então o limiar da RN-538 é medido sem timer falso).
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import { FinanceiroTab } from '../FinanceiroTab';
import { mkTenantRollup, ts } from '../_test/fixtures';

const AGORA = new Date('2026-08-11T12:00:00Z');

function renderTab(over: Partial<React.ComponentProps<typeof FinanceiroTab>> = {}) {
  return render(
    <FinanceiroTab
      rollup={mkTenantRollup()}
      atualizadoEm={ts('2026-08-11T11:15:00Z')}
      loading={false}
      error={null}
      agora={AGORA}
      {...over}
    />
  );
}

describe('FinanceiroTab · o que existe, com o rótulo do que é', () => {
  it('TPV é o valor de face confirmado, e diz isso', () => {
    renderTab({ rollup: mkTenantRollup({ gmv: 100000 }) });

    expect(screen.getByText('TPV')).toBeInTheDocument();
    expect(screen.getByText('R$ 100.000,00')).toBeInTheDocument();
    expect(screen.getByText('Valor de face confirmado')).toBeInTheDocument();
  });

  it('a taxa da Leela chama-se Serviço acumulado, nunca faturamento', () => {
    renderTab({ rollup: mkTenantRollup({ receitaLeela: 10500 }) });

    const movimento = screen.getByRole('region', { name: 'Movimento do tenant' });
    expect(within(movimento).getByText('Serviço acumulado')).toBeInTheDocument();
    expect(within(movimento).getByText('R$ 10.500,00')).toBeInTheDocument();
    // Nenhuma cifra deste bloco carrega o rótulo que o dono nomeou.
    expect(within(movimento).queryByText(/faturamento/i)).not.toBeInTheDocument();
  });
});

describe('FinanceiroTab · o que não tem fonte fica EmBreve com a causa', () => {
  it('faturamento gerado NÃO é um número — é a causa nomeada', () => {
    renderTab();

    const bloco = screen.getByRole('region', { name: 'Faturamento gerado' });
    expect(within(bloco).getByText('Em breve')).toBeInTheDocument();
    // Nenhuma cifra debaixo do rótulo do dono.
    expect(within(bloco).queryByText(/R\$/)).not.toBeInTheDocument();
    expect(within(bloco).getByText(/custo operacional não tem fonte hoje/i)).toBeInTheDocument();
  });

  it('custos operacionais nomeiam a fonte que falta (S1610), não "em construção"', () => {
    renderTab();

    const bloco = screen.getByRole('region', { name: 'Custos operacionais' });
    expect(within(bloco).getByText(/platform\/config\.custoGateway/)).toBeInTheDocument();
    expect(within(bloco).getByText(/S1610/)).toBeInTheDocument();
    expect(within(bloco).queryByText(/em construção/i)).not.toBeInTheDocument();
  });
});

describe('FinanceiroTab · RN-538 · a idade é parte do número', () => {
  it('mostra a data do retrato ao lado das cifras', () => {
    renderTab({ atualizadoEm: ts('2026-08-11T11:15:00Z') });

    expect(screen.getByText(/^Retrato de /)).toBeInTheDocument();
  });

  it('retrato fresco NÃO acende o aviso de obsolescência', () => {
    renderTab({ atualizadoEm: ts('2026-08-11T11:15:00Z') });

    expect(screen.queryByText('Retrato desatualizado')).not.toBeInTheDocument();
  });

  it('retrato além do limiar acende o aviso e explica a cadência', () => {
    renderTab({ atualizadoEm: ts('2026-08-11T04:00:00Z') });

    expect(screen.getByText('Retrato desatualizado')).toBeInTheDocument();
    expect(screen.getByText(/minuto 15 de cada hora/)).toBeInTheDocument();
  });

  it('retrato sem carimbo conta como obsoleto (número macro sem data não passa por atual)', () => {
    renderTab({ atualizadoEm: null });

    expect(screen.getByText('Retrato desatualizado')).toBeInTheDocument();
  });
});

describe('FinanceiroTab · ausência de linha no agregado', () => {
  it('tenant fora do rollup declara a ausência e NÃO mostra R$ 0', () => {
    renderTab({ rollup: null });

    expect(screen.getByText(/ainda não aparece no agregado/i)).toBeInTheDocument();
    expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument();
    expect(screen.queryByText('TPV')).not.toBeInTheDocument();
  });
});

describe('FinanceiroTab · estados', () => {
  it('carregando mostra skeleton nomeado', () => {
    renderTab({ loading: true });
    expect(screen.getByRole('status', { name: 'Carregando o retrato financeiro' })).toBeInTheDocument();
  });

  it('erro vira alerta, e os blocos sem fonte continuam declarados', () => {
    renderTab({ error: new Error('denied') });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Faturamento gerado' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// RN-538, segunda metade: o recompute disparável da própria tela. É critério de
// aceite da S1613 — "dado que o rollup está obsoleto, quando olho a tela, então
// consigo disparar o recompute dali mesmo e o número atualiza".
// ---------------------------------------------------------------------------

describe('FinanceiroTab · RN-538 · o recompute sai da própria tela', () => {
  it('sem `onRecompute` a tela NÃO promete ação que não existe', () => {
    renderTab();
    expect(screen.queryByRole('button', { name: /Recalcular/ })).not.toBeInTheDocument();
  });

  it('com `onRecompute` o botão aparece e dispara', async () => {
    const user = userEvent.setup();
    const onRecompute = vi.fn();
    renderTab({ onRecompute });
    await user.click(screen.getByRole('button', { name: 'Recalcular agora' }));
    expect(onRecompute).toHaveBeenCalledTimes(1);
  });

  it('o botão fica desabilitado enquanto o recompute roda', () => {
    const onRecompute = vi.fn();
    renderTab({ onRecompute, recomputando: true });
    expect(screen.getByRole('button', { name: 'Recalculando…' })).toBeDisabled();
  });

  it('recompute que falha vira alerta na tela, não silêncio', () => {
    renderTab({
      onRecompute: vi.fn(),
      erroDoRecompute: 'Apenas platform_admin recomputa os rollups da plataforma.',
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/Apenas platform_admin/);
  });

  it('o botão existe mesmo com o retrato fresco — esperar a hora cheia é escolha do operador', () => {
    renderTab({ onRecompute: vi.fn(), atualizadoEm: ts('2026-08-11T11:55:00Z') });
    expect(screen.getByRole('button', { name: 'Recalcular agora' })).toBeInTheDocument();
  });
});
