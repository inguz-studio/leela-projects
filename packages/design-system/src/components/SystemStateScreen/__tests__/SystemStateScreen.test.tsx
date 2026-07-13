import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SystemStateScreen } from '../SystemStateScreen';
import type { SystemStateAction } from '../types';

const noop = (): void => undefined;

function acoes(overrides: Partial<Record<'primary' | 'secondary', boolean>> = {}): SystemStateAction[] {
  void overrides;
  return [
    { label: 'Voltar', onPress: noop, variant: 'secondary' },
    { label: 'Ir para a Visão Geral', onPress: noop, variant: 'primary' },
  ];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SystemStateScreen', () => {
  it('notFound com 2 ações: exatamente 1 primary (token) + 1 secondary (token)', () => {
    render(
      <SystemStateScreen
        variant="notFound"
        title="Essa página saiu para correr"
        message="O link que você seguiu não existe ou mudou de lugar."
        actions={acoes()}
      />,
    );

    const primaria = screen.getByRole('button', { name: 'Ir para a Visão Geral' });
    const secundaria = screen.getByRole('button', { name: 'Voltar' });
    // Severidade/variante por TOKEN, nunca hex.
    expect(primaria.className).toContain('var(--action-primary)');
    expect(secundaria.className).toContain('var(--border-strong)');
  });

  it('foco inicial vai para a ação primária ao montar', () => {
    render(
      <SystemStateScreen
        variant="notFound"
        title="Essa página saiu para correr"
        message="O link que você seguiu não existe ou mudou de lugar."
        actions={acoes()}
      />,
    );
    const primaria = screen.getByRole('button', { name: 'Ir para a Visão Geral' });
    expect(document.activeElement).toBe(primaria);
  });

  it('avisa (console.error) quando recebe mais de 1 ação primary', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <SystemStateScreen
        variant="notFound"
        title="Título"
        message="Mensagem"
        actions={[
          { label: 'Uma', onPress: noop, variant: 'primary' },
          { label: 'Duas', onPress: noop, variant: 'primary' },
        ]}
      />,
    );
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.some((c) => String(c[0]).includes("máximo 1"))).toBe(true);
  });

  it('error com detail="abc123": id no DOM + card com border-left Vulcão por token', () => {
    render(
      <SystemStateScreen
        variant="error"
        title="Tropeçamos aqui, não foi você"
        message="Algo quebrou do nosso lado e a equipe já foi avisada."
        detail="abc123"
        actions={[{ label: 'Tentar novamente', onPress: noop, variant: 'primary' }]}
      />,
    );
    // id auxiliar presente
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
    // card = elemento com role="alert"; classe border-left por token (não hex)
    const card = screen.getByRole('alert');
    expect(card.className).toContain('border-l-4');
    expect(card.className).toContain('var(--border-danger)');
    expect(card.className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('role="alert" só em error; ausente em notFound e forbidden', () => {
    const { unmount } = render(
      <SystemStateScreen variant="notFound" title="t" message="m" actions={[]} />,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();

    render(<SystemStateScreen variant="forbidden" title="t" message="m" actions={[]} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ícone-fallback é decorativo (aria-hidden)', () => {
    const { container } = render(
      <SystemStateScreen variant="notFound" title="t" message="m" actions={[]} />,
    );
    const decorativo = container.querySelector('[aria-hidden="true"]');
    expect(decorativo).not.toBeNull();
    expect(decorativo?.querySelector('svg')).not.toBeNull();
  });

  it('layout="fullscreen" não renderiza container de shell', () => {
    const { container } = render(
      <SystemStateScreen
        variant="notFound"
        layout="fullscreen"
        title="t"
        message="m"
        actions={[]}
      />,
    );
    expect(container.querySelector('[data-layout="fullscreen"]')).not.toBeNull();
    expect(container.querySelector('[data-layout="shell"]')).toBeNull();
  });

  it('layout="shell" (padrão) renderiza no slot de conteúdo', () => {
    const { container } = render(
      <SystemStateScreen variant="notFound" title="t" message="m" actions={[]} />,
    );
    expect(container.querySelector('[data-layout="shell"]')).not.toBeNull();
    expect(container.querySelector('[data-layout="fullscreen"]')).toBeNull();
  });

  it('ação com href renderiza como âncora navegável (mailto/deep-link)', () => {
    render(
      <SystemStateScreen
        variant="forbidden"
        title="Esse espaço ainda não é seu"
        message="Você não tem permissão para ver esta área."
        actions={[
          { label: 'Voltar', onPress: noop, variant: 'secondary' },
          {
            label: 'Falar com o organizador',
            onPress: noop,
            variant: 'ghost',
            href: 'mailto:suporte@leela',
          },
        ]}
      />,
    );
    const link = screen.getByRole('link', { name: 'Falar com o organizador' });
    expect(link).toHaveAttribute('href', 'mailto:suporte@leela');
  });
});
