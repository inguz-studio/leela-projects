import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from '../Sparkline';

describe('Sparkline', () => {
  it('não renderiza com menos de 2 pontos (estado honesto no consumidor)', () => {
    const { container: vazio } = render(<Sparkline values={[]} />);
    expect(vazio.querySelector('svg')).toBeNull();

    const { container: umPonto } = render(<Sparkline values={[5]} />);
    expect(umPonto.querySelector('svg')).toBeNull();
  });

  it('gera linha + área fechada até a base (viewBox 120×28 do mockup)', () => {
    const { container } = render(<Sparkline values={[0, 10, 5]} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 120 28');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'none');

    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(2);
    // Fill fecha até a base do viewBox
    expect(paths[0]?.getAttribute('d')).toMatch(/L120,28 L0,28 Z$/);
    // Linha: 3 pontos → M + 2 L, extremos em x=0 e x=120
    expect(paths[1]?.getAttribute('d')).toMatch(/^M0,/);
    expect(paths[1]?.getAttribute('d')).toContain('L120,');
  });

  it('é token-only por herança: stroke e stops em currentColor, zero hex', () => {
    const { container } = render(<Sparkline values={[1, 2, 3]} />);
    const linha = container.querySelectorAll('path')[1];
    expect(linha).toHaveAttribute('stroke', 'currentColor');
    const stops = container.querySelectorAll('stop');
    expect(stops).toHaveLength(2);
    stops.forEach((stop) => expect(stop).toHaveAttribute('stop-color', 'currentColor'));
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('ids de gradiente não colidem entre instâncias (useId)', () => {
    const { container } = render(
      <>
        <Sparkline values={[1, 2]} />
        <Sparkline values={[3, 4]} />
      </>
    );
    const ids = Array.from(container.querySelectorAll('linearGradient')).map((g) => g.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    // Cada fill referencia o próprio gradiente
    const fills = Array.from(container.querySelectorAll('path[fill^="url(#"]')).map((p) =>
      p.getAttribute('fill')
    );
    expect(fills).toEqual(ids.map((id) => `url(#${id})`));
  });

  it('decorativa por padrão; com aria-label vira role img', () => {
    const { container } = render(<Sparkline values={[1, 2]} />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');

    const { container: nomeada } = render(
      <Sparkline values={[1, 2]} aria-label="Conversão em alta" />
    );
    const svg = nomeada.querySelector('svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', 'Conversão em alta');
    expect(svg).not.toHaveAttribute('aria-hidden');
  });
});
