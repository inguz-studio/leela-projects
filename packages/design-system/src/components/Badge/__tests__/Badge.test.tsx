import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders neutro variant by default', () => {
    render(<Badge>Ativo</Badge>);
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it.each(['brand', 'heroico', 'vulcao', 'vitoria', 'alerta', 'neutro'] as const)(
    'renders %s variant',
    (variant) => {
      render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
    },
  );

  it('accepts custom className', () => {
    render(<Badge className="test-badge">Label</Badge>);
    expect(screen.getByText('Label')).toHaveClass('test-badge');
  });

  it('renders children', () => {
    render(<Badge variant="vitoria">Confirmado</Badge>);
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });

  // QA m5: tipografia do mockup `.badge` — 10px/700 uppercase, altura nasce
  // do padding (sem height fixa).
  it('usa a tipografia do mockup por token (m5)', () => {
    render(<Badge>Publicado</Badge>);
    const el = screen.getByText('Publicado');
    expect(el.className).toContain('uppercase');
    expect(el.className).toContain('tracking-[var(--badge-spacing)]');
    expect(el.className).toContain('py-[var(--badge-py)]');
    expect(el.className).toContain('text-[length:var(--badge-font-size)]');
    expect(el.className).not.toContain('--badge-height');
  });
});

// ===========================================================================
// `outline` e `size` — Onda 0 Parte B · CANONE-1
//
// A esteira shadcn→brasa dropou a variante `outline` do stock, e a landing
// pagou: cinco pílulas informativas de contorno escritas à mão em
// `sections/HeroSection.tsx:94`, `sections/HeroMinimo.tsx:57`,
// `sections/KitsSection.tsx:57`, `_perfil/PerfilView.tsx:84` e
// `components/PublicHeader.tsx:89`. A Onda 1 não as converteu porque a peça
// não existia (handoff §3.2). Cada caso abaixo é uma dessas cinco, ou a razão
// pela qual elas existiam.
// ===========================================================================

describe('Badge · outline (a pílula de contorno que faltava)', () => {
  it('renderiza a variante outline', () => {
    render(<Badge variant="outline">5K</Badge>);
    expect(screen.getByText('5K')).toBeInTheDocument();
  });

  it('é transparente e tem borda — sem preenchimento, ao contrário das seis', () => {
    render(<Badge variant="outline">10K</Badge>);
    const el = screen.getByText('10K');
    expect(el.className).toContain('bg-transparent');
    expect(el.className).toContain('border');
  });

  // A borda é `border-strong`, NÃO `border-default`. Numa pílula transparente
  // a borda é o componente inteiro, o que a tira da isenção de "frame
  // decorativo" e a põe sob a 1.4.11 (≥ 3:1). `border-default` dá 1.67:1 no
  // brasa e 1.46:1 no wine — o mesmo número que fez o ConfirmModal migrar (M1
  // da matriz de contraste). As cinco instâncias da landing usam
  // `border-default`: converter SOBE o contraste.
  it('a borda é border-strong — 1.4.11, e não a isenção de frame do Card', () => {
    render(<Badge variant="outline">21K</Badge>);
    const el = screen.getByText('21K');
    expect(el.className).toContain('border-[var(--border-strong)]');
    expect(el.className).not.toContain('border-[var(--border-default)]');
  });

  it('o border-0 da base não sobrevive ao outline', () => {
    render(<Badge variant="outline">42K</Badge>);
    expect(screen.getByText('42K').className.split(' ')).not.toContain('border-0');
  });

  it('as seis variantes de preenchimento seguem sem borda', () => {
    for (const variant of ['brand', 'heroico', 'vulcao', 'vitoria', 'alerta', 'neutro'] as const) {
      const { unmount } = render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant).className).toContain('border-0');
      unmount();
    }
  });
});

describe('Badge · size (o selo e a pílula são a mesma peça)', () => {
  // O contrato desta lane: `sm` é o selo de sempre, byte a byte. Se este caso
  // cair, algum badge já em tela mudou de tamanho sem ninguém pedir.
  it('size="sm" é o default — o selo não mudou', () => {
    const { unmount } = render(<Badge>Publicado</Badge>);
    const semSize = screen.getByText('Publicado').className;
    unmount();
    render(<Badge size="sm">Publicado</Badge>);
    expect(screen.getByText('Publicado').className).toBe(semSize);
  });

  // A regressão que o eixo `size` quase introduziu: com o raio na BASE, o
  // tailwind-merge deixava `rounded-[var(--badge-radius)]` e o raio de pílula
  // convivendo na mesma string — ele não reconhece a chave `ds-pill` do preset
  // e não vê conflito. Duas regras de mesma especificidade, vencedor decidido
  // pela ordem do stylesheet. A geometria mora no eixo por causa disto, e este
  // caso é o que impede a volta.
  it('nunca há dois raios na string — a geometria mora no eixo, não no merge', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const { unmount } = render(<Badge size={size}>X</Badge>);
      const raios = screen
        .getByText('X')
        .className.split(' ')
        .filter((c) => c.startsWith('rounded'));
      expect(raios, `size="${size}" produziu ${raios.length} raios: ${raios.join(', ')}`).toHaveLength(1);
      unmount();
    }
  });

  it('nunca há dois paddings horizontais nem dois tamanhos de texto', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const { unmount } = render(<Badge size={size}>X</Badge>);
      const classes = screen.getByText('X').className.split(' ');
      expect(classes.filter((c) => c.startsWith('px-'))).toHaveLength(1);
      expect(classes.filter((c) => c.startsWith('py-'))).toHaveLength(1);
      expect(classes.filter((c) => c.startsWith('text-[length:'))).toHaveLength(1);
      unmount();
    }
  });

  it('size="sm" mantém o selo do mockup: radius xs, 10px, uppercase', () => {
    render(<Badge>Rascunho</Badge>);
    const el = screen.getByText('Rascunho');
    expect(el.className).toContain('rounded-[var(--badge-radius)]');
    expect(el.className).toContain('text-[length:var(--badge-font-size)]');
    expect(el.className).toContain('uppercase');
  });

  it.each([
    ['md', '--font-size-sm'],
    ['lg', '--font-size-base'],
  ] as const)('size="%s" vira PÍLULA: caixa normal, radius pill, texto %s', (size, token) => {
    render(
      <Badge variant="outline" size={size}>
        Trail
      </Badge>,
    );
    const el = screen.getByText('Trail');
    const classes = el.className.split(' ');
    expect(classes).toContain('rounded-[var(--radius-pill)]');
    expect(classes).toContain('normal-case');
    expect(classes).toContain('tracking-normal');
    expect(el.className).toContain(`text-[length:var(${token})]`);
    // Nada do selo pode sobreviver: o eixo entrega a geometria inteira, não um
    // remendo por cima.
    expect(classes).not.toContain('uppercase');
    expect(classes).not.toContain('rounded-[var(--badge-radius)]');
    expect(el.className).not.toContain('text-[length:var(--badge-font-size)]');
  });

  it('a pílula herda o peso 700 do selo — delta declarado da conversão', () => {
    render(
      <Badge variant="outline" size="lg">
        Trail
      </Badge>,
    );
    // `font-[…]` é arbitrary value e o tailwind-merge não sabe se é peso ou
    // família; por isso o eixo `size` não escreve peso nenhum e a base manda.
    expect(screen.getByText('Trail').className).toContain('font-[var(--badge-font-weight)]');
  });

  it('size é ortogonal a variant — pílula preenchida também é válida', () => {
    render(
      <Badge variant="vitoria" size="md">
        Confirmado
      </Badge>,
    );
    const classes = screen.getByText('Confirmado').className;
    expect(classes).toContain('bg-[var(--feedback-success-surface)]');
    expect(classes).toContain('rounded-[var(--radius-pill)]');
  });
});
