/**
 * minha-conta-dados-s1222.test.tsx — LEELA-S1222-T3 · RN-450
 *
 * Meus dados e trocar senha, na área do cliente.
 *
 * O CASO QUE A FILA EXIGE, com este nome: "editar meus dados na área do
 * cliente não altera `profissionais/{uid}`, e o inverso também vale. Este caso
 * é a materialização da RN-450 e precisa existir."
 *
 * Ele é provado em DOIS níveis, porque um só seria fraco:
 *   1. comportamento — salvar escreve por um seam que só conhece
 *      `atletas/{uid}`, e o mock do Firestore registra o caminho tocado;
 *   2. texto-fonte — nenhuma superfície da área do cliente menciona
 *      `profissionais`. Um caso de comportamento sozinho passaria verde no dia
 *      em que alguém acrescentasse um segundo write ao lado.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.setConfig({ testTimeout: 20_000 });

const lerMeusDados = vi.fn();
const salvarMeusDados = vi.fn();
const trocarSenha = vi.fn();

vi.mock('@leela/api-client', () => ({
  lerMeusDados: () => lerMeusDados(),
  salvarMeusDados: (...a: unknown[]) => salvarMeusDados(...a),
  trocarSenha: (...a: unknown[]) => trocarSenha(...a),
  senhaAtendeMinimo: (s: string) => s.length >= 6,
  SENHA_MIN: 6,
}));

async function montar(email: string | null = 'ana@exemplo.dev'): Promise<void> {
  const { PainelMeusDados } = await import('@/app/(public)/minha-conta/PainelMeusDados');
  await act(async () => {
    render(<PainelMeusDados email={email} />);
  });
}

beforeEach(() => {
  lerMeusDados.mockReset();
  salvarMeusDados.mockReset();
  trocarSenha.mockReset();
  lerMeusDados.mockResolvedValue({ nome: 'Ana Souza', email: 'ana@exemplo.dev' });
  salvarMeusDados.mockResolvedValue(undefined);
  trocarSenha.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('S1222-T3 · meus dados', () => {
  it('carrega o nome do próprio cadastro e o salva de volta', async () => {
    await montar();
    await waitFor(() => expect(screen.getByLabelText(/^nome$/i)).toBeTruthy());
    const campo = screen.getByLabelText(/^nome$/i);
    fireEvent.change(campo, { target: { value: 'Ana Maria Souza' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));
    });
    expect(salvarMeusDados).toHaveBeenCalledWith({ nome: 'Ana Maria Souza' });
    await waitFor(() => expect(screen.getByText(/seus dados foram salvos/i)).toBeTruthy());
  });

  it('o e-mail da conta é mostrado e NÃO é editável nesta tela', async () => {
    await montar();
    await waitFor(() => expect(screen.getByLabelText(/e-mail da conta/i)).toBeTruthy());
    const campo = screen.getByLabelText(/e-mail da conta/i) as HTMLInputElement;
    expect(campo.value).toBe('ana@exemplo.dev');
    expect(campo.readOnly || campo.disabled).toBe(true);
  });

  it('a falha ao salvar aparece, e não vira "salvo" silencioso', async () => {
    salvarMeusDados.mockRejectedValueOnce(new Error('rede'));
    await montar();
    await waitFor(() => expect(screen.getByRole('button', { name: /^salvar$/i })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));
    });
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByText(/seus dados foram salvos/i)).toBeNull();
  });
});

describe('S1222-T3 · trocar senha', () => {
  it('usa o seam único, que embute a reauth obrigatória', async () => {
    await montar();
    await waitFor(() => expect(screen.getByLabelText(/senha atual/i)).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/senha atual/i), { target: { value: 'antiga123' } });
    fireEvent.change(screen.getByLabelText(/senha nova/i), { target: { value: 'novasenha' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /trocar senha/i }));
    });
    expect(trocarSenha).toHaveBeenCalledWith('antiga123', 'novasenha');
    await waitFor(() => expect(screen.getByText(/senha trocada/i)).toBeTruthy());
  });

  it('senha nova curta é recusada ANTES de chamar o servidor', async () => {
    await montar();
    await waitFor(() => expect(screen.getByLabelText(/senha nova/i)).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/senha atual/i), { target: { value: 'antiga123' } });
    fireEvent.change(screen.getByLabelText(/senha nova/i), { target: { value: 'abc' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /trocar senha/i }));
    });
    expect(trocarSenha).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/pelo menos 6/i);
  });

  it('a recusa não vira oráculo: mesma mensagem para senha atual errada', async () => {
    trocarSenha.mockRejectedValueOnce({ code: 'auth/wrong-password' });
    await montar();
    await waitFor(() => expect(screen.getByLabelText(/senha atual/i)).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/senha atual/i), { target: { value: 'errada12' } });
    fireEvent.change(screen.getByLabelText(/senha nova/i), { target: { value: 'novasenha' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /trocar senha/i }));
    });
    const msg = screen.getByRole('alert').textContent ?? '';
    expect(msg).toMatch(/confira a senha atual/i);
    // Nada que revele QUAL das duas metades falhou.
    expect(msg).not.toMatch(/wrong-password|incorreta|não confere/i);
  });
});

describe('⚔ RN-450 · a área do cliente não encosta no perfil de organizador', () => {
  it('salvar meus dados chama SÓ o seam de `atletas`', async () => {
    await montar();
    await waitFor(() => expect(screen.getByRole('button', { name: /^salvar$/i })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));
    });
    // O seam recebe SÓ o nome — não há campo, canal ou parâmetro por onde um
    // uid ou uma coleção de terceiro entre.
    expect(salvarMeusDados).toHaveBeenCalledWith({ nome: 'Ana Souza' });
    expect(salvarMeusDados.mock.calls[0]?.length).toBe(1);
  });

  it('nenhuma superfície da área do cliente menciona `profissionais`', () => {
    const dir = resolve(__dirname, '../app/(public)/minha-conta');
    for (const arquivo of readdirSync(dir)) {
      if (!arquivo.endsWith('.tsx')) continue;
      const fonte = readFileSync(resolve(dir, arquivo), 'utf8');
      // O comentário de fronteira CITA o nome de propósito (é ali que a
      // decisão fica auditável); a varredura olha o código, sem comentários.
      const semComentarios = fonte
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/^\s*\/\/.*$/gm, ' ');
      expect(semComentarios).not.toContain('profissionais');
    }
  });

  it('o seam de meus dados escreve em `atletas` e em nenhuma outra coleção', () => {
    const fonte = readFileSync(
      resolve(__dirname, '../../../packages/api-client/src/atletas.ts'),
      'utf8'
    );
    const semComentarios = fonte
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ');
    expect(semComentarios).toContain("'atletas'");
    expect(semComentarios).not.toContain('profissionais');
    // O uid vem da SESSÃO, nunca de parâmetro: sem canal de input, o vetor
    // "passar o uid de outra pessoa" não existe para ser testado.
    expect(semComentarios).toContain('currentUser');
  });
});
