/**
 * definir-senha-s1223.test.tsx — LEELA-S1223-T1 · RN-453
 *
 * O primeiro acesso do comprador, na tela da Leela. Os aceites falsificáveis
 * da RN-453, um por caso:
 *
 *   3. definir a senha AUTENTICA — sem segundo login. Falsificação escrita na
 *      RN: remover o login pós-confirmação faz o caminho feliz terminar em
 *      tela de entrar, que é o que o dono chamou de errado;
 *   4. link usado, expirado ou de senha já definida têm TRÊS estados
 *      distinguíveis, cada um com saída própria. Falsificação: colapsar os
 *      três num "link inválido" mata dois casos;
 *   4b. o reenvio confirma de forma NEUTRA — mesma frase exista ou não a
 *      conta, com `auth/user-not-found` engolido. A tela não vira oráculo de
 *      quem comprou.
 *
 * O SDK é mockado — o teste não sobe Firebase.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// O primeiro render puxa o barrel do DS; com o teto default de 5s o caso
// inaugural do arquivo estoura por IMPORT, não por comportamento.
vi.setConfig({ testTimeout: 20_000 });

const verificarCodigoResetSenha = vi.fn();
const confirmarResetSenha = vi.fn();
const loginComEmail = vi.fn();
const enviarResetSenha = vi.fn();

vi.mock('@leela/api-client', () => ({
  verificarCodigoResetSenha: (...a: unknown[]) => verificarCodigoResetSenha(...a),
  confirmarResetSenha: (...a: unknown[]) => confirmarResetSenha(...a),
  loginComEmail: (...a: unknown[]) => loginComEmail(...a),
  enviarResetSenha: (...a: unknown[]) => enviarResetSenha(...a),
  emailValido: (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()),
  senhaAtendeMinimo: (s: string) => s.length >= 6,
  SENHA_MIN: 6,
  mensagemErroRedefinicao: () => 'Não foi possível redefinir a senha. Tente novamente.',
}));

vi.mock('@/lib/leelaClient', () => ({ ensureLeela: () => undefined }));

async function renderFluxo(oobCode: string): Promise<void> {
  const { DefinirSenhaFlow } = await import('@/app/(public)/definir-senha/DefinirSenhaFlow');
  await act(async () => {
    render(<DefinirSenhaFlow oobCode={oobCode} />);
  });
}

beforeEach(() => {
  window.localStorage.clear();
  verificarCodigoResetSenha.mockReset();
  confirmarResetSenha.mockReset();
  loginComEmail.mockReset();
  enviarResetSenha.mockReset();
});

afterEach(() => {
  // A suíte da landing roda sem `globals`: o auto-cleanup do RTL não se
  // registra sozinho.
  cleanup();
});

describe('S1223-T1 · definir a senha deixa a pessoa DENTRO', () => {
  it('confirma o código e autentica na mesma ação, sem segundo login', async () => {
    verificarCodigoResetSenha.mockResolvedValue('ana@exemplo.dev');
    confirmarResetSenha.mockResolvedValue(undefined);
    loginComEmail.mockResolvedValue({ user: { uid: 'uid-ana' } });

    await renderFluxo('codigo-bom');
    await waitFor(() => expect(screen.getByLabelText(/nova senha/i)).not.toBeNull());

    fireEvent.change(screen.getByLabelText(/nova senha/i), { target: { value: 'senha-nova' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Definir senha' }));
    });

    await waitFor(() => expect(screen.getByText(/sua conta está pronta/i)).not.toBeNull());
    expect(confirmarResetSenha).toHaveBeenCalledWith('codigo-bom', 'senha-nova');
    // A ordem é o aceite: confirmar e ENTÃO autenticar, com a mesma senha.
    expect(loginComEmail).toHaveBeenCalledWith('ana@exemplo.dev', 'senha-nova');
    // Nenhuma tela de "entrar" no fim do caminho feliz.
    expect(screen.queryByRole('form', { name: 'Definir senha' })).toBeNull();
  });

  it('a tela mostra o e-mail do código, e não pede que a pessoa o digite', async () => {
    verificarCodigoResetSenha.mockResolvedValue('ana@exemplo.dev');
    await renderFluxo('codigo-bom');
    await waitFor(() => expect(screen.getByText('ana@exemplo.dev')).not.toBeNull());
    expect(screen.queryByLabelText(/^e-mail$/i)).toBeNull();
  });
});

describe('S1223-T1 · os três estados são distinguíveis', () => {
  it('código inválido ou expirado abre o REENVIO, não um beco', async () => {
    verificarCodigoResetSenha.mockRejectedValue(
      Object.assign(new Error('x'), { code: 'auth/expired-action-code' }),
    );
    await renderFluxo('codigo-velho');
    await waitFor(() => expect(screen.getByText(/este link não vale mais/i)).not.toBeNull());
    expect(screen.getByRole('form', { name: 'Reenviar link de acesso' })).not.toBeNull();
    // Nunca "peça ajuda": a saída é executável na própria tela.
    expect(screen.queryByText(/suporte/i)).toBeNull();
  });

  it('link já usado NESTE navegador oferece entrar, não redefinir', async () => {
    // Primeiro acesso completo: é ele que grava a marca.
    verificarCodigoResetSenha.mockResolvedValue('ana@exemplo.dev');
    confirmarResetSenha.mockResolvedValue(undefined);
    loginComEmail.mockResolvedValue({ user: { uid: 'uid-ana' } });
    await renderFluxo('codigo-bom');
    await waitFor(() => expect(screen.getByLabelText(/nova senha/i)).not.toBeNull());
    fireEvent.change(screen.getByLabelText(/nova senha/i), { target: { value: 'senha-nova' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Definir senha' }));
    });
    await waitFor(() => expect(screen.getByText(/sua conta está pronta/i)).not.toBeNull());
    cleanup();

    // Segundo clique no MESMO link.
    verificarCodigoResetSenha.mockClear();
    await renderFluxo('codigo-bom');
    await waitFor(() => expect(screen.getByText(/sua senha já foi definida/i)).not.toBeNull());
    // Estado próprio: não é o "link inválido", e nem chega a bater no Auth.
    expect(screen.queryByText(/este link não vale mais/i)).toBeNull();
    expect(screen.queryByLabelText(/nova senha/i)).toBeNull();
    expect(verificarCodigoResetSenha).not.toHaveBeenCalled();
  });

  it('sem `oobCode` na URL a tela não pede senha nenhuma', async () => {
    await renderFluxo('');
    await waitFor(() => expect(screen.getByText(/este link não vale mais/i)).not.toBeNull());
    expect(verificarCodigoResetSenha).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/nova senha/i)).toBeNull();
  });

  // A marca grava ANTES do login: o código já foi consumido de verdade, e
  // voltar para "link inválido" no reload seria mentira.
  it('falha de login depois de confirmar não desfaz a marca do código', async () => {
    verificarCodigoResetSenha.mockResolvedValue('ana@exemplo.dev');
    confirmarResetSenha.mockResolvedValue(undefined);
    loginComEmail.mockRejectedValue(
      Object.assign(new Error('x'), { code: 'auth/network-request-failed' }),
    );
    await renderFluxo('codigo-bom');
    await waitFor(() => expect(screen.getByLabelText(/nova senha/i)).not.toBeNull());
    fireEvent.change(screen.getByLabelText(/nova senha/i), { target: { value: 'senha-nova' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Definir senha' }));
    });
    await waitFor(() => expect(screen.getByRole('alert')).not.toBeNull());
    // A senha digitada não sobrevive ao erro.
    expect((screen.getByLabelText(/nova senha/i) as HTMLInputElement).value).toBe('');
    cleanup();

    await renderFluxo('codigo-bom');
    await waitFor(() => expect(screen.getByText(/sua senha já foi definida/i)).not.toBeNull());
  });
});

describe('S1223-T1 · o reenvio não vira oráculo de quem comprou', () => {
  it('conta existente e inexistente produzem a MESMA confirmação', async () => {
    verificarCodigoResetSenha.mockRejectedValue(
      Object.assign(new Error('x'), { code: 'auth/invalid-action-code' }),
    );
    const confirmacoes: string[] = [];

    for (const resposta of ['ok', 'nao-existe']) {
      if (resposta === 'ok') enviarResetSenha.mockResolvedValueOnce(undefined);
      else
        enviarResetSenha.mockRejectedValueOnce(
          Object.assign(new Error('x'), { code: 'auth/user-not-found' }),
        );

      await renderFluxo('codigo-ruim');
      await waitFor(() =>
        expect(screen.getByRole('form', { name: 'Reenviar link de acesso' })).not.toBeNull(),
      );
      fireEvent.change(screen.getByLabelText(/e-mail/i), {
        target: { value: 'alguem@exemplo.dev' },
      });
      await act(async () => {
        fireEvent.submit(screen.getByRole('form', { name: 'Reenviar link de acesso' }));
      });
      await waitFor(() => expect(screen.getByRole('status')).not.toBeNull());
      confirmacoes.push(screen.getByRole('status').textContent ?? '');
      cleanup();
    }

    expect(confirmacoes[0]).toBe(confirmacoes[1]);
    expect(confirmacoes[0]).not.toContain('não encontrad');
    expect(confirmacoes[0]).toContain('Se houver uma conta');
  });
});
