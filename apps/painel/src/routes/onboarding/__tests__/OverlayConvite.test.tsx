// =============================================================================
// OverlayConvite (S1609-T2 · RN-416/417) — a tela da conta travada.
//
// O que esta suíte trava:
//   - a copy do dono aparece e o overlay se anuncia como diálogo modal;
//   - o código digitado sujo (minúscula, hífen, espaço) chega NORMALIZADO;
//   - código incompleto não envia;
//   - o CTA lê o destino da CONFIG (mailto e WhatsApp), nunca uma string fixa;
//   - o erro do resgate é anunciado (role="alert") sem revelar o motivo real.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CONTATO_ONBOARDING_PADRAO } from '@leela/core';
import { OverlayConvite, type OverlayConviteProps } from '../OverlayConvite';

const base: OverlayConviteProps = {
  contato: CONTATO_ONBOARDING_PADRAO,
  enviando: false,
  erro: null,
  onResgatar: vi.fn(),
  onSair: vi.fn(),
};

function montar(over: Partial<OverlayConviteProps> = {}) {
  return render(
    <MemoryRouter>
      <OverlayConvite {...base} {...over} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OverlayConvite — bloqueio e copy', () => {
  it('anuncia-se como diálogo modal com a copy do dono', () => {
    montar();
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(
      screen.getByRole('heading', { name: /Seu acesso ainda não foi liberado/i }),
    ).toBeInTheDocument();
  });

  it('não oferece nenhum caminho de fechar/dispensar', () => {
    // Não-descartável é requisito (RN-416): um overlay que fecha deixa a pessoa
    // olhando para uma home que ela não pode usar.
    montar();
    expect(screen.queryByRole('button', { name: /fechar|dispensar|cancelar/i })).toBeNull();
  });

  it('oferece o que a conta travada PODE fazer: conta e saída', () => {
    montar();
    expect(screen.getByRole('link', { name: /Minha conta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sair$/i })).toBeInTheDocument();
  });
});

describe('OverlayConvite — resgate', () => {
  it('normaliza o código digitado antes de entregar', async () => {
    const onResgatar = vi.fn();
    montar({ onResgatar });
    await userEvent.type(screen.getByLabelText(/Código de convite/i), 'ab23-cd 45');
    await userEvent.click(screen.getByRole('button', { name: /Liberar acesso/i }));
    expect(onResgatar).toHaveBeenCalledWith('AB23CD45');
  });

  it('código incompleto não envia', async () => {
    const onResgatar = vi.fn();
    montar({ onResgatar });
    await userEvent.type(screen.getByLabelText(/Código de convite/i), 'AB23');
    expect(screen.getByRole('button', { name: /Liberar acesso/i })).toBeDisabled();
    expect(onResgatar).not.toHaveBeenCalled();
  });

  it('em voo, o botão avisa e trava', () => {
    montar({ enviando: true });
    expect(screen.getByRole('button', { name: /Liberando acesso/i })).toBeDisabled();
  });

  it('erro do resgate é anunciado sem revelar o motivo real', () => {
    montar({ erro: 'Código inválido ou já utilizado.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Código inválido ou já utilizado.');
  });
});

describe('OverlayConvite — CTA vem da config (RN-417)', () => {
  it('sem config, o destino é o mailto padrão — nunca um botão morto', () => {
    montar();
    const cta = screen.getByRole('link', { name: /Falar com o time Leela/i });
    expect(cta.getAttribute('href')).toContain('mailto:contato@leela.app');
  });

  it('config de WhatsApp muda o destino sem tocar no código', () => {
    montar({ contato: { tipo: 'whatsapp', valor: '5548999999999' } });
    const cta = screen.getByRole('link', { name: /Falar com o time Leela/i });
    expect(cta).toHaveAttribute('href', 'https://wa.me/5548999999999');
  });
});
