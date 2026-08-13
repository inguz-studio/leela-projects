// =============================================================================
// ResultCount — o contador da lista recortada.
//
// Cada bloco aqui existe por um fato medido no inventário de 2026-08-12 (§4.3):
//
//   - o CANAL DE ARIA. Três dialetos em doze escritas, duas delas sem canal
//     nenhum. O default vira polido, e o teste prova que ele existe sem que a
//     tela peça.
//   - a HONESTIDADE DO NÚMERO. Dez das doze afirmam um total que só é verdade
//     porque a lista é pequena. Com `temMais`, o total é ignorado — e o teste
//     passa um total DE PROPÓSITO para provar que ele não aparece.
//   - a CONCORDÂNCIA. Duas grafias medidas ("Mostrando" e "mostrando"); aqui é
//     uma só, e o singular também.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultCount, textoDoContador } from '../ResultCount';

const COMUNICADOS = { singular: 'comunicado', plural: 'comunicados' };

describe('ResultCount · as três frases', () => {
  it('com total conhecido diz "Mostrando X de Y"', () => {
    render(<ResultCount visiveis={12} total={40} substantivo={COMUNICADOS} />);
    expect(screen.getByText('Mostrando 12 de 40 comunicados')).toBeInTheDocument();
  });

  it('com cursor aberto diz o que está na tela e que há mais', () => {
    render(<ResultCount visiveis={20} temMais substantivo={COMUNICADOS} />);
    expect(
      screen.getByText('Mostrando 20 comunicados · há mais para carregar'),
    ).toBeInTheDocument();
  });

  it('com cursor fechado o carregado É o total do recorte', () => {
    render(<ResultCount visiveis={37} substantivo={COMUNICADOS} />);
    expect(screen.getByText('37 comunicados · fim da lista')).toBeInTheDocument();
  });

  it('formata milhar em pt-BR', () => {
    render(<ResultCount visiveis={1234} total={45678} substantivo={COMUNICADOS} />);
    expect(screen.getByText('Mostrando 1.234 de 45.678 comunicados')).toBeInTheDocument();
  });

  it.each([
    [{ visiveis: 1, total: 1 }, 'Mostrando 1 de 1 comunicado'],
    [{ visiveis: 1, temMais: true }, 'Mostrando 1 comunicado · há mais para carregar'],
    [{ visiveis: 1 }, '1 comunicado · fim da lista'],
  ])('concorda no singular: %j', (args, esperado) => {
    expect(textoDoContador({ ...args, substantivo: COMUNICADOS })).toBe(esperado);
  });

  // "Mostrando 3 de 1 comunicado" nunca acontece; a concordância do total é a
  // que importa quando ele existe.
  it('a concordância de "de N" segue o TOTAL, não o visível', () => {
    expect(textoDoContador({ visiveis: 1, total: 40, substantivo: COMUNICADOS })).toBe(
      'Mostrando 1 de 40 comunicados',
    );
  });
});

describe('ResultCount · a honestidade do número', () => {
  // O defeito que a peça existe para impedir: apresentar o carregado como
  // total quando a paginação por cursor nunca computou total nenhum.
  it('com temMais, o total passado é IGNORADO — nunca aparece "de N"', () => {
    render(<ResultCount visiveis={20} total={999} temMais substantivo={COMUNICADOS} />);
    expect(screen.queryByText(/de 999/)).toBeNull();
    expect(screen.getByText(/há mais para carregar/)).toBeInTheDocument();
  });

  it('sem total e sem temMais não inventa total nenhum', () => {
    render(<ResultCount visiveis={37} substantivo={COMUNICADOS} />);
    expect(screen.queryByText(/ de /)).toBeNull();
  });
});

describe('ResultCount · o canal de ARIA', () => {
  it('nasce polido sem a tela pedir — role=status + aria-live=polite', () => {
    render(<ResultCount visiveis={12} total={40} substantivo={COMUNICADOS} />);
    const no = screen.getByRole('status');
    expect(no).toHaveAttribute('aria-live', 'polite');
    expect(no).toHaveTextContent('Mostrando 12 de 40 comunicados');
  });

  it('live="none" desliga a live region inteira', () => {
    render(<ResultCount visiveis={12} total={40} substantivo={COMUNICADOS} live="none" />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText(/Mostrando 12/)).not.toHaveAttribute('aria-live');
  });

  // `role` e `aria-live` saem de UMA prop porque a contradição entre eles é
  // resolvida pelo navegador do jeito dele — mesma decisão do `Alert`.
  it('não existe canal assertivo na escala', () => {
    render(<ResultCount visiveis={12} total={40} substantivo={COMUNICADOS} />);
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-live', 'assertive');
  });
});

describe('ResultCount · superfície', () => {
  it('é um parágrafo com o tom secundário por token', () => {
    render(<ResultCount visiveis={1} substantivo={COMUNICADOS} data-testid="c" />);
    const no = screen.getByTestId('c');
    expect(no.tagName).toBe('P');
    expect(no.className).toContain('text-[var(--text-tertiary)]');
    expect(no.className).toContain('text-[length:var(--font-size-sm)]');
  });

  it('aceita className e props nativas', () => {
    render(
      <ResultCount visiveis={1} substantivo={COMUNICADOS} className="teste-contador" data-testid="c" />,
    );
    expect(screen.getByTestId('c')).toHaveClass('teste-contador');
  });
});
