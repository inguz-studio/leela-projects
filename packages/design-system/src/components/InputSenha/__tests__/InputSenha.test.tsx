// =============================================================================
// InputSenha — testes de COMPORTAMENTO (FRONTEIRA-AUTH).
//
// Cada caso é uma forma conhecida de esta feature quebrar em produção, e não
// uma afirmação sobre como ela foi escrita. A lista veio do brief do dono e da
// experiência do padrão: botão sem `type` submetendo o formulário,
// `autocomplete` destruído pela troca do nó, foco perdido na alternância, dois
// olhos no Edge, e a cor como único portador do significado.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InputSenha } from '../InputSenha';

/** A forma exata do que `avaliarSenha()` do core devolve. */
function avaliacao(
  forca: 'vazia' | 'fraca' | 'media' | 'forte',
  rotulo: string,
  pendencias: string[] = [],
) {
  return { forca, rotulo, pendencias } as const;
}

const olho = (): HTMLElement => screen.getByRole('button', { name: /senha/i });

describe('InputSenha · revelar e ocultar', () => {
  it('nasce OCULTA — ninguém abre a tela com a senha na cara do vizinho', () => {
    render(<InputSenha label="Senha" defaultValue="segredo" />);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    expect(olho()).toHaveAttribute('aria-label', 'Mostrar a senha');
    expect(olho()).toHaveAttribute('aria-pressed', 'false');
  });

  it('alterna para texto e volta, anunciando o estado nos dois sentidos', async () => {
    const usuario = userEvent.setup();
    render(<InputSenha label="Senha" defaultValue="segredo" />);

    await usuario.click(olho());
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
    expect(olho()).toHaveAttribute('aria-label', 'Ocultar a senha');
    expect(olho()).toHaveAttribute('aria-pressed', 'true');

    await usuario.click(olho());
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    expect(olho()).toHaveAttribute('aria-pressed', 'false');
  });

  it('NÃO submete o formulário ao alternar (o defeito nº 1: botão sem type)', async () => {
    const usuario = userEvent.setup();
    const enviar = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={enviar}>
        <InputSenha label="Senha" />
      </form>,
    );
    await usuario.click(olho());
    expect(enviar).not.toHaveBeenCalled();
    expect(olho()).toHaveAttribute('type', 'button');
  });

  it('preserva o gerenciador de senha: mesmo nó, mesmo autocomplete, valor intacto', async () => {
    const usuario = userEvent.setup();
    render(<InputSenha label="Senha" autoComplete="new-password" name="senha" />);
    const antes = screen.getByLabelText('Senha');
    await usuario.type(antes, 'abc123!x');

    await usuario.click(olho());

    const depois = screen.getByLabelText('Senha');
    // Nó IDÊNTICO: trocar o elemento faria o gerenciador perder o campo.
    expect(depois).toBe(antes);
    expect(depois).toHaveAttribute('autocomplete', 'new-password');
    expect(depois).toHaveAttribute('name', 'senha');
    expect(depois).toHaveValue('abc123!x');
  });

  it('o clique no olho não rouba o foco do campo', async () => {
    const usuario = userEvent.setup();
    render(<InputSenha label="Senha" />);
    const campo = screen.getByLabelText('Senha');
    await usuario.click(campo);
    expect(campo).toHaveFocus();

    await usuario.click(olho());
    expect(campo).toHaveFocus();
  });

  it('esconde o olho NATIVO do Edge — a tela não pode ficar com dois', () => {
    render(<InputSenha label="Senha" />);
    expect(screen.getByLabelText('Senha').className).toContain('[&::-ms-reveal]:hidden');
  });

  it('campo desabilitado desabilita o olho junto', () => {
    render(<InputSenha label="Senha" disabled />);
    expect(olho()).toBeDisabled();
  });
});

describe('InputSenha · medidor de força', () => {
  it('sem avaliação não há medidor — no login, medir senha antiga não orienta ninguém', () => {
    render(<InputSenha label="Senha" autoComplete="current-password" />);
    expect(screen.queryByText(/senha (fraca|média|forte)/i)).toBeNull();
  });

  it('a força é PALAVRA, não só cor (WCAG 1.4.1)', () => {
    render(<InputSenha label="Senha" avaliacao={avaliacao('forte', 'Forte')} />);
    expect(screen.getByText('Senha forte')).toBeInTheDocument();
  });

  it('sobe e desce coerente com o nível recebido', () => {
    const { rerender } = render(
      <InputSenha label="Senha" avaliacao={avaliacao('fraca', 'Fraca', ['um número'])} />,
    );
    expect(screen.getByText('Senha fraca')).toBeInTheDocument();

    rerender(<InputSenha label="Senha" avaliacao={avaliacao('media', 'Média')} />);
    expect(screen.getByText('Senha média')).toBeInTheDocument();
    expect(screen.queryByText('Senha fraca')).toBeNull();

    rerender(<InputSenha label="Senha" avaliacao={avaliacao('forte', 'Forte')} />);
    expect(screen.getByText('Senha forte')).toBeInTheDocument();
  });

  it('campo em branco não é acusado de senha fraca', () => {
    render(<InputSenha label="Senha" avaliacao={avaliacao('vazia', '')} />);
    expect(screen.queryByText(/senha (fraca|média|forte)/i)).toBeNull();
  });

  it('diz o que falta, em português, e some quando não falta mais nada', () => {
    const { rerender } = render(
      <InputSenha
        label="Senha"
        avaliacao={avaliacao('fraca', 'Fraca', ['um número', 'um caractere especial'])}
      />,
    );
    expect(screen.getByText(/Falta um número e um caractere especial\./)).toBeInTheDocument();

    rerender(<InputSenha label="Senha" avaliacao={avaliacao('forte', 'Forte')} />);
    expect(screen.queryByText(/Falta/)).toBeNull();
  });

  it('o medidor é anunciado por região polida e descreve o campo', () => {
    render(<InputSenha label="Senha" avaliacao={avaliacao('media', 'Média')} />);
    const regiao = screen.getByText('Senha média').closest('[aria-live]');
    expect(regiao).toHaveAttribute('aria-live', 'polite');
    const campo = screen.getByLabelText('Senha');
    const descritores = campo.getAttribute('aria-describedby') ?? '';
    expect(descritores.length).toBeGreaterThan(0);
  });

  it('nunca bloqueia a digitação — o feedback orienta, o envio é que valida', async () => {
    const usuario = userEvent.setup();
    render(<InputSenha label="Senha" avaliacao={avaliacao('fraca', 'Fraca', ['um número'])} />);
    const campo = screen.getByLabelText('Senha');
    await usuario.type(campo, 'abc');
    expect(campo).toHaveValue('abc');
    expect(campo).not.toBeDisabled();
    expect(campo).not.toHaveAttribute('readonly');
  });
});

describe('InputSenha · a casca do Input continua sendo a do DS', () => {
  it('mensagem de erro do campo segue funcionando com o adorno presente', () => {
    render(<InputSenha label="Senha" errorMessage="Senha incorreta." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Senha incorreta.');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true');
  });
});
