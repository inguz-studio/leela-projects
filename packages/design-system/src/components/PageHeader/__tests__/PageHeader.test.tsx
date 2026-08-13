import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
  it('renders h1 with title', () => {
    render(<PageHeader title="Meia Floripa 2026" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Meia Floripa 2026' })).toBeInTheDocument();
  });

  it('renders header landmark with aria-label matching title', () => {
    render(<PageHeader title="Meia Floripa 2026" />);
    expect(screen.getByRole('banner', { name: 'Meia Floripa 2026' })).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Evento" subtitle="21 de Junho · Florianópolis" />);
    expect(screen.getByText('21 de Junho · Florianópolis')).toBeInTheDocument();
  });

  it('renders avatar slot when provided', () => {
    render(<PageHeader title="Evento" avatar={<img src="/logo.png" alt="logo" />} />);
    expect(screen.getByAltText('logo')).toBeInTheDocument();
  });

  it('renders actions slot when provided', () => {
    render(<PageHeader title="Evento" actions={<button type="button">Editar</button>} />);
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('renders badges slot when provided', () => {
    render(<PageHeader title="Evento" badges={<span>Publicado</span>} />);
    expect(screen.getByText('Publicado')).toBeInTheDocument();
  });

  it('renders metadata slot when provided', () => {
    render(<PageHeader title="Evento" metadata={<span>1.200 inscritos</span>} />);
    expect(screen.getByText('1.200 inscritos')).toBeInTheDocument();
  });

  it('does not render avatar container when absent', () => {
    const { container } = render(<PageHeader title="Evento" />);
    // Only the h1 and header should exist, no extra avatar wrapper
    expect(container.querySelector('[aria-hidden]')).not.toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<PageHeader title="Evento" className="test-class" />);
    expect(container.firstChild).toHaveClass('test-class');
  });

  // ---------------------------------------------------------------------------
  // RESPONSIVO-FIX (12/08) — os dois defeitos que o dono viu em tablet/mobile.
  // jsdom não resolve media query nem calcula layout, então a prova aqui é a
  // ASSINATURA das classes; a prova renderizada nos 4 breakpoints está nos
  // screenshots da lane. Sem estes casos, qualquer edição futura devolve os
  // defeitos em silêncio — foi exatamente assim que o degrau do H1 declarado no
  // §4 do handoff-v2 ficou dois meses sem existir.
  // ---------------------------------------------------------------------------

  it('não deixa a moldura ser comprimida: header é shrink-0 (sobreposição em <lg)', () => {
    // O header é item de um flex COLUNA com altura definida; sem `shrink-0` a
    // caixa colapsa no `min-height` (96px) e a linha de ações embrulhada pinta
    // por cima do primeiro bloco da página.
    const { container } = render(<PageHeader title="Visão geral" />);
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass('shrink-0');
    expect(header).toHaveClass('min-h-[var(--header-height)]');
  });

  it('H1 escala por token: compacto por padrão, cheio a partir de md', () => {
    render(<PageHeader title="Visão geral" />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveClass('text-[length:var(--header-title-size-compact)]');
    expect(h1).toHaveClass('md:text-[length:var(--header-title-size)]');
    // O tamanho é decisão do DS, não da tela: nada de degrau solto sem token.
    expect(h1.className).not.toMatch(/text-\[length:\d/);
  });

  it('H1 só trunca a partir de md (abaixo dele o título embrulha inteiro)', () => {
    render(<PageHeader title="Meia Maratona Floripa 2026" />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveClass('md:truncate');
    expect(h1).not.toHaveClass('truncate');
  });
});
