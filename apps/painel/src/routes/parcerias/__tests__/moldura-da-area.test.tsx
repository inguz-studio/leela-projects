// =============================================================================
// MOLDURA DA ÁREA DE PARCERIAS — a prova do D-1008-R17 com a régua do R16.
//
// A área nasce JÁ com a anatomia certa (lição da auditoria R16): o layout
// route `ParceriasAreaLayout` é o único dono do menu de 3 abas (Marcas ·
// Assessorias parceiras · Afiliações); a frente Afiliações carrega os DOIS
// lados (RN-318/319) sob a sub-nav terciária do `AfiliacoesLayout`.
//
// Rota a rota, sobre a ÁRVORE REAL (`ParceriasRoutes`): menu presente —
// exatamente UM, com o item ativo certo —; terciária presente nos dois lados
// de Afiliações; criação em tela cheia FORA da moldura por design (mesmo
// veredito do R16, precedente `/eventos/novo`). As telas viram marcadores.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';

vi.mock('../marcas/MarcasPage', () => ({
  MarcasPage: () => <div data-testid="tela">marcas</div>,
}));
vi.mock('../assessorias/AssessoriasPage', () => ({
  AssessoriasPage: () => <div data-testid="tela">assessorias</div>,
}));
vi.mock('../assessorias/CadastrarAssessoriaPage', () => ({
  CadastrarAssessoriaPage: () => <div data-testid="tela">nova-assessoria</div>,
}));
vi.mock('../assessorias/ParceriaDetailPage', () => ({
  ParceriaDetailPage: () => {
    const { parceriaId } = useParams();
    return <div data-testid="tela">{`parceria:${parceriaId ?? ''}`}</div>;
  },
}));
vi.mock('../afiliacoes/InfluenciadoresPage', () => ({
  InfluenciadoresPage: () => <div data-testid="tela">influenciadores</div>,
}));
vi.mock('../afiliacoes/MinhasAfiliacoesPage', () => ({
  MinhasAfiliacoesPage: () => <div data-testid="tela">minhas-afiliacoes</div>,
}));

const { ParceriasRoutes } = await import('../ParceriasRoutes');

const MENU = 'Seções de parcerias';
const TERCIARIA = 'Seções de afiliações';

/** Monta o módulo no MESMO ponto do App.tsx (`/parcerias/*`). */
function montarEm(rota: string): () => void {
  const { unmount } = render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/parcerias/*" element={<ParceriasRoutes />} />
      </Routes>
    </MemoryRouter>,
  );
  return unmount;
}

// Rota → [tela esperada, aba ativa do menu da área]. A régua do R16 vale
// desde o nascimento: toda aba da área na tabela.
const DENTRO_DA_MOLDURA: ReadonlyArray<[string, string, string]> = [
  ['/parcerias', 'marcas', 'Marcas'],
  ['/parcerias/assessorias', 'assessorias', 'Assessorias parceiras'],
  // O beco que o dono encontrou em clubs, resolvido aqui também: o detalhe
  // herda a aba da entrada (sub-rota), nunca fica órfão de menu.
  ['/parcerias/assessorias/p-1', 'parceria:p-1', 'Assessorias parceiras'],
  ['/parcerias/afiliacoes', 'influenciadores', 'Afiliações'],
  ['/parcerias/afiliacoes/minhas', 'minhas-afiliacoes', 'Afiliações'],
];

describe('moldura da área de Parcerias (D-1008-R17)', () => {
  it.each(DENTRO_DA_MOLDURA)(
    '%s: renderiza a tela E exatamente UM menu da área',
    (rota, tela) => {
      const unmount = montarEm(rota);
      expect(screen.getByTestId('tela').textContent).toBe(tela);
      expect(screen.getAllByRole('navigation', { name: MENU })).toHaveLength(1);
      unmount();
    },
  );

  it.each(DENTRO_DA_MOLDURA)('%s: o item ativo do menu é o certo', (rota, _tela, ativa) => {
    const unmount = montarEm(rota);
    const nav = screen.getByRole('navigation', { name: MENU });
    const marcados = Array.from(nav.querySelectorAll('[aria-current="page"]'));
    expect(
      marcados.map((e) => e.textContent),
      'a moldura tem de dizer ONDE a pessoa está — uma marca, nem zero nem duas',
    ).toHaveLength(1);
    expect(marcados[0]?.textContent).toContain(ativa);
    unmount();
  });

  it('o menu tem exatamente as 3 abas da decisão, na ordem', () => {
    const unmount = montarEm('/parcerias');
    const nav = screen.getByRole('navigation', { name: MENU });
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Marcas',
      'Assessorias parceiras',
      'Afiliações',
    ]);
    unmount();
  });

  it('criação de assessoria: FORA da moldura por design (tela cheia, retorno próprio)', () => {
    const unmount = montarEm('/parcerias/assessorias/nova');
    expect(screen.getByTestId('tela').textContent).toBe('nova-assessoria');
    expect(screen.queryByRole('navigation', { name: MENU })).toBeNull();
    unmount();
  });
});

describe('frente Afiliações · sub-nav terciária (os dois lados RN-318/319)', () => {
  it.each([
    ['/parcerias/afiliacoes', 'Influenciadores'],
    ['/parcerias/afiliacoes/minhas', 'Minhas afiliações'],
  ])('%s: terciária presente com "%s" ativa', (rota, ativa) => {
    const unmount = montarEm(rota);
    const nav = screen.getByRole('navigation', { name: TERCIARIA });
    expect(within(nav).getAllByRole('link')).toHaveLength(2);
    const marcados = Array.from(nav.querySelectorAll('[aria-current="page"]'));
    expect(marcados.map((e) => e.textContent)).toEqual([ativa]);
    unmount();
  });

  it('a terciária NÃO vaza para as outras frentes da área', () => {
    for (const rota of ['/parcerias', '/parcerias/assessorias']) {
      const unmount = montarEm(rota);
      expect(screen.queryByRole('navigation', { name: TERCIARIA })).toBeNull();
      unmount();
    }
  });
});
