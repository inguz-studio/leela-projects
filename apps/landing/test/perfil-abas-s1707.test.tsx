// =============================================================================
// PROVA da S1707-T3 (RN-443 · D-ACH-15/16/20) — o menu secundário da página do
// produtor.
//
// Três coisas que só um teste segura, porque as três voltam sozinhas na próxima
// edição:
//   1. as três seções continuam NO DOCUMENTO com a aba fechada — é isso que
//      mantém os eventos do produtor alcançáveis por busca, e é o primeiro
//      detalhe que some quando alguém troca `forceMount` por render condicional;
//   2. a aba inicial é Eventos (D-ACH-16), não Feed;
//   3. o card de clube NÃO tem afordância de clique (D-ACH-20) — a página
//      pública de clube não existe, e a aba deixou o card mais visível.
// =============================================================================

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PerfilView } from '../app/(public)/_perfil/PerfilView';
import type { PerfilPublicoCompleto } from '@/lib/leitorPerfil';
import type { EventoResumo } from '@/lib/tipos';

afterEach(cleanup);

const evento = (nome: string, futuro: boolean): EventoResumo =>
  ({
    slug: nome.toLowerCase().replace(/\s+/g, '-'),
    nome,
    local: 'Florianópolis',
    dataISO: futuro ? '2026-12-01T09:00:00.000Z' : '2025-01-01T09:00:00.000Z',
    diaLabel: '01',
    mesLabel: futuro ? 'dez' : 'jan',
    modalidades: ['5 km'],
    estadoVenda: 'aberto',
    precoMinimo: 12000,
    futuro,
  }) as unknown as EventoResumo;

const dados: PerfilPublicoCompleto = {
  perfil: {
    handle: 'castelo',
    nome: 'Castelo Experiências',
    indexavel: true,
    linksExternos: [],
  },
  eventos: [evento('Travessia da Lagoa', true), evento('Retiro de Inverno', false)],
  clubes: [
    {
      slug: 'clube-da-manha',
      nome: 'Clube da Manhã',
      categoria: 'Bem-estar',
      modalidade: 'Caminhada',
      qtdMembrosAtivos: 12,
    },
  ],
  patrocinadores: [],
};

function montar(): HTMLElement {
  const { container } = render(
    <PerfilView dados={dados} shareUrl="https://leela/@castelo" qrSvg="<svg/>" />,
  );
  return container;
}

describe('o menu secundário Feed · Eventos · Clubs', () => {
  it('tem as três abas, nesta ordem, num tablist nomeado', () => {
    montar();
    const tablist = screen.getByRole('tablist', { name: /seções do perfil/i });
    const abas = within(tablist).getAllByRole('tab');
    expect(abas.map((t) => t.textContent)).toEqual(['Feed', 'Eventos', 'Clubs']);
  });

  it('abre em Eventos, não em Feed (D-ACH-16)', () => {
    montar();
    expect(screen.getByRole('tab', { name: 'Eventos' })).toHaveProperty(
      'ariaSelected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Feed' })).toHaveProperty('ariaSelected', 'false');
  });

  it('as três seções ficam NO DOCUMENTO com a aba fechada — o conteúdo segue indexável', () => {
    const container = montar();
    const texto = container.textContent ?? '';
    // Eventos (aba aberta), Clubs e Feed (abas fechadas) no mesmo documento.
    expect(texto).toContain('Travessia da Lagoa');
    expect(texto).toContain('Clube da Manhã');
    expect(texto).toContain('Ainda não há publicações');
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(3);
  });

  it('a troca de aba é do cliente e não recarrega nada', () => {
    montar();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Clubs' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Clubs' }));
    expect(screen.getByRole('tab', { name: 'Clubs' })).toHaveProperty('ariaSelected', 'true');
    expect(screen.getByRole('tab', { name: 'Eventos' })).toHaveProperty('ariaSelected', 'false');
  });

  // O foco itinerante do Radix move o foco num `setTimeout`, então a asserção
  // espera — sem o `waitFor` o teste mede o estado de antes da tecla.
  it('as abas são navegáveis por teclado: seta move e Home volta ao início', async () => {
    montar();
    const eventos = screen.getByRole('tab', { name: 'Eventos' });
    eventos.focus();
    fireEvent.keyDown(eventos, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(document.activeElement?.textContent).toBe('Clubs');
      expect(screen.getByRole('tab', { name: 'Clubs' })).toHaveProperty('ariaSelected', 'true');
    });

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Clubs' }), { key: 'Home' });
    await waitFor(() => {
      expect(document.activeElement?.textContent).toBe('Feed');
      expect(screen.getByRole('tab', { name: 'Feed' })).toHaveProperty('ariaSelected', 'true');
    });
  });

  it('cada painel tem nome acessível vindo da sua aba', () => {
    montar();
    const paineis = screen.getAllByRole('tabpanel', { hidden: true });
    expect(paineis).toHaveLength(3);
    for (const painel of paineis) {
      expect(painel.getAttribute('aria-labelledby')).toBeTruthy();
    }
  });
});

describe('o card de clube não promete destino que não existe (D-ACH-20)', () => {
  it('não é link nem tem role de link', () => {
    const container = montar();
    const card = screen.getByText('Clube da Manhã').closest('div[class]');
    expect(card?.closest('a')).toBeNull();
    // Nenhum link na página inteira aponta para rota de clube.
    for (const a of Array.from(container.querySelectorAll('a[href]'))) {
      expect(a.getAttribute('href')).not.toMatch(/clube-da-manha/);
    }
  });

  it('não tem afordância visual de clique: sem cursor, sem hover, sem foco', () => {
    montar();
    const card = screen.getByText('Clube da Manhã').closest('div[class]')?.parentElement;
    const classes = card?.className ?? '';
    expect(classes).not.toContain('cursor-pointer');
    expect(classes).not.toContain('hover:');
    expect(classes).not.toContain('focus-visible:');
    expect(card?.getAttribute('tabindex')).toBeNull();
  });
});

describe('vocabulário D-0802-1 na página do produtor', () => {
  it('o estado vazio de eventos não chama a experiência de corrida', () => {
    const { container } = render(
      <PerfilView
        dados={{ ...dados, eventos: [] }}
        shareUrl="https://leela/@castelo"
        qrSvg="<svg/>"
      />,
    );
    const texto = container.textContent ?? '';
    expect(texto).toContain('publicar uma experiência');
    expect(texto).not.toMatch(/corrida/i);
  });
});
