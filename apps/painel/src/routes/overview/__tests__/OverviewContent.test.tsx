// =============================================================================
// OverviewContent — a grade do protótipo v3 (HIFI-REC) e os contratos de
// honestidade que sobreviveram ao redesign: erro nunca vira estado feliz
// (#03), staff vê nota de escopo (#16), seção sem fonte é "em breve" nomeado.
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OverviewAlert } from '@leela/core';
import { OverviewContent, type OverviewContentProps } from '../OverviewContent';
import { mkKpis } from '../_test/fixtures';

function props(over: Partial<OverviewContentProps> = {}): OverviewContentProps {
  return {
    kpis: mkKpis(),
    kpisLoading: false,
    kpisError: null,
    alerts: [],
    insights: [],
    agenda: [],
    eventosLoading: false,
    countdown: null,
    countdownLoading: false,
    ocupacao: { linhas: [], semCapacidade: 0 },
    hojeISO: '2026-08-06',
    onNavigate: vi.fn(),
    ...over,
  };
}

describe('OverviewContent (HIFI-REC · grade do protótipo v3)', () => {
  it('grade do protótipo: 1 coluna estreito, 1.15fr/1fr em lg (minmax fecha a coluna direita)', () => {
    const { container } = render(<OverviewContent {...props()} />);
    const grid = container.querySelector('.grid');
    expect(grid?.className).toContain('grid-cols-1');
    expect(grid?.className).toContain('lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]');
  });

  it('as seções do protótipo estão presentes, na ordem dele', () => {
    render(<OverviewContent {...props()} />);
    for (const nome of [
      'Próximo evento',
      'Clubs',
      'Agenda de eventos',
      'Indicadores consolidados',
      'Presença por semana',
      'Formas de pagamento',
      'Ocupação dos últimos eventos',
      'Insights da Leela',
      'Alertas operacionais',
    ]) {
      expect(screen.getByRole('region', { name: nome })).toBeInTheDocument();
    }
  });

  it('seções sem fonte são "em breve" NOMEADOS — nunca gráfico zerado', () => {
    render(<OverviewContent {...props()} />);
    expect(screen.getAllByText('Em breve')).toHaveLength(2);
    expect(screen.getByText(/não há série semanal legível/)).toBeInTheDocument();
    expect(screen.getByText(/forma de pagamento chega ao cliente/)).toBeInTheDocument();
  });

  it('"Eventos ativos" e "Últimas inscrições" saíram (o protótipo não os tem)', () => {
    render(<OverviewContent {...props()} />);
    expect(screen.queryByText('Eventos ativos')).not.toBeInTheDocument();
    expect(screen.queryByText('Últimas inscrições')).not.toBeInTheDocument();
  });

  it('kpisLoading → 4 skeletons (nunca spinner)', () => {
    render(<OverviewContent {...props({ kpis: null, kpisLoading: true })} />);
    expect(screen.getByRole('status', { name: 'Carregando indicadores' })).toBeInTheDocument();
  });

  it('permission-denied → mensagem de erro sem quebrar', () => {
    render(<OverviewContent {...props({ kpis: null, kpisError: 'permission-denied' })} />);
    expect(screen.getByText(/não tem um painel de produtor/i)).toBeInTheDocument();
    // Alertas NÃO fabricam "Tudo em dia" sobre erro (#03).
    expect(screen.queryByText('Tudo em dia. Nenhum alerta.')).not.toBeInTheDocument();
  });

  it('unknown com retry → botão "Tentar novamente" recarrega o resumo (#03)', async () => {
    const onRetryOverview = vi.fn();
    render(<OverviewContent {...props({ kpis: null, kpisError: 'unknown', onRetryOverview })} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tentar novamente' })[0]!);
    expect(onRetryOverview).toHaveBeenCalled();
  });

  it('erro de eventos → Agenda e Countdown mostram erro, não empty fabricado (#03)', () => {
    render(
      <OverviewContent {...props({ agenda: null, eventosError: true, countdown: null })} />
    );
    expect(
      screen.getByText('Não foi possível carregar a agenda dos seus eventos.')
    ).toBeInTheDocument();
    expect(screen.getByText('Não foi possível carregar o próximo evento.')).toBeInTheDocument();
    // Estados felizes fabricados NÃO aparecem sobre erro.
    expect(screen.queryByText('Nenhum evento agendado.')).not.toBeInTheDocument();
    expect(screen.queryByText('Nada agendado')).not.toBeInTheDocument();
  });

  it('renderiza KPIs quando disponíveis', () => {
    render(<OverviewContent {...props()} />);
    expect(screen.getByText('1.284')).toBeInTheDocument();
  });

  it('staff → nota de escopo em vez de zeros mudos (#16)', () => {
    render(<OverviewContent {...props({ papel: 'tenant_staff', countdown: null })} />);
    expect(screen.getByRole('note')).toHaveTextContent('apenas os eventos que você organiza');
  });

  it('produtor (owner) → sem nota de escopo de staff (#16)', () => {
    render(<OverviewContent {...props({ papel: 'tenant_owner' })} />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('cascata de entrada (§5): as seções ganham o passo por índice', () => {
    const { container } = render(<OverviewContent {...props()} />);
    const animadas = container.querySelectorAll('.animate-revela-secao');
    expect(animadas.length).toBeGreaterThanOrEqual(7);
    // O passo vem do token --motion-stagger, nunca de ms literal.
    expect((animadas[1] as HTMLElement).style.animationDelay).toContain(
      'var(--motion-stagger)'
    );
  });
});

/**
 * VG-INSIGHTS (leva 23) — a segunda cobrança do mesmo bloco: *"nao foi o que
 * pedi. Já falei para enriquecermos a visao geral, e os insights da leela devem
 * estar lá."*
 *
 * O que estes casos guardam não é o bloco (isso um `getByRole` resolve): é a
 * RECONCILIAÇÃO com o `AlertsPanel` que já morava nesta tela. Alerta de evento
 * e insight de conjunto não podem publicar o mesmo fato na mesma dobra
 * (RN-573), e a partição precisa estar cobrada em teste ou vira acordo verbal.
 */
describe('OverviewContent · Insights da Leela × AlertsPanel (RN-573)', () => {
  const alertaDeConjunto: OverviewAlert = {
    id: 'pendentes-24h',
    severidade: 'info',
    titulo: '9 inscrições pendentes aguardam pagamento há mais de 24h',
    quando: 'há 2h',
    em: '2026-08-17T10:00:00.000Z',
  };
  const alertaDeEvento: OverviewAlert = {
    id: 'ocupacao-corrida-do-sol',
    severidade: 'warn',
    titulo: 'Corrida do Sol está com 92% das vagas preenchidas',
    quando: 'há 1h',
    em: '2026-08-17T11:00:00.000Z',
    href: '/eventos/corrida-do-sol',
  };

  it('o bloco vem LOGO ABAIXO da régua de números — a posição do template do dono', () => {
    const { container } = render(<OverviewContent {...props()} />);
    const texto = container.textContent ?? '';
    expect(texto.indexOf('Indicadores')).toBeLessThan(texto.indexOf('Insights da Leela'));
    expect(texto.indexOf('Insights da Leela')).toBeLessThan(texto.indexOf('Alertas'));
  });

  it('o alerta de CONJUNTO sai do painel de alertas e vira insight — nunca os dois', () => {
    render(
      <OverviewContent
        {...props({
          alerts: [alertaDeConjunto, alertaDeEvento],
          insights: [
            {
              id: 'pagamentos-pendentes',
              tom: 'atencao',
              tag: 'Atenção',
              titulo: alertaDeConjunto.titulo,
              detalhe: 'Inscrição pendente é vaga presa.',
              destino: { tipo: 'rota', href: '/eventos' },
              caminho: 'Ver seus eventos',
            },
          ],
        })}
      />
    );
    const painel = screen.getByRole('region', { name: 'Alertas operacionais' });
    const bloco = screen.getByRole('region', { name: 'Insights da Leela' });

    // O fato aparece UMA vez, e na casa nova.
    expect(within(bloco).getByText(alertaDeConjunto.titulo)).toBeInTheDocument();
    expect(within(painel).queryByText(alertaDeConjunto.titulo)).not.toBeInTheDocument();
    // E o alerta DE EVENTO continua onde sempre esteve — nada foi esvaziado.
    expect(within(painel).getByText(alertaDeEvento.titulo)).toBeInTheDocument();
  });

  it('a contagem do painel acompanha a partição — "1 ativo", não "2 ativos"', () => {
    render(<OverviewContent {...props({ alerts: [alertaDeConjunto, alertaDeEvento] })} />);
    const painel = screen.getByRole('region', { name: 'Alertas operacionais' });
    expect(within(painel).getByText(/^1 ativo$/)).toBeInTheDocument();
  });

  it('sobrou só o alerta de conjunto → o painel diz "Tudo em dia", e é verdade', () => {
    render(<OverviewContent {...props({ alerts: [alertaDeConjunto] })} />);
    const painel = screen.getByRole('region', { name: 'Alertas operacionais' });
    expect(within(painel).getByText('Tudo em dia. Nenhum alerta.')).toBeInTheDocument();
  });

  it('o caminho de destino `rota` navega pelo SPA — link de página recarregaria o app', async () => {
    const onNavigate = vi.fn();
    render(
      <OverviewContent
        {...props({
          onNavigate,
          insights: [
            {
              id: 'comunidade-sem-desafio',
              tom: 'oportunidade',
              tag: 'Oportunidade',
              titulo: '138 membros ativos e nenhum desafio rodando',
              detalhe: 'O desafio é o que dá o que fazer entre um evento e outro.',
              destino: { tipo: 'rota', href: '/clubes' },
              caminho: 'Ver seus clubs',
            },
          ],
        })}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ver seus clubs' }));
    expect(onNavigate).toHaveBeenCalledWith('/clubes');
  });

  it('nenhum insight → uma linha, nunca card vazio com cara de bloco quebrado', () => {
    render(<OverviewContent {...props({ insights: [] })} />);
    const bloco = screen.getByRole('region', { name: 'Insights da Leela' });
    expect(within(bloco).getByText('Nada pedindo atenção agora.')).toBeInTheDocument();
  });

  it('NÃO promete janela temporal que o dado não tem (o template dizia "4 semanas")', () => {
    render(<OverviewContent {...props()} />);
    const bloco = screen.getByRole('region', { name: 'Insights da Leela' });
    expect(
      within(bloco).getByText(/leitura automática dos seus eventos e clubs/i)
    ).toBeInTheDocument();
    expect(
      within(bloco).queryByText(/4 semanas|últimas semanas|últimos \d+ dias/i)
    ).not.toBeInTheDocument();
  });
});
