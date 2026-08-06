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
  // FRONTEIRA-AUTH · `senhaAtendeMinimo`/`SENHA_MIN` saíram do mock junto com a
  // dependência da tela. A régua da senha NOVA é `avaliarSenha` de
  // `@leela/core`, função pura que roda de verdade aqui — mockar a validação
  // seria pintar de verde um formulário que a tela real recusa.
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
    fireEvent.change(screen.getByLabelText(/senha nova/i), { target: { value: 'novasenha9!' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /trocar senha/i }));
    });
    expect(trocarSenha).toHaveBeenCalledWith('antiga123', 'novasenha9!');
    await waitFor(() => expect(screen.getByText(/senha trocada/i)).toBeTruthy());
  });

  // ⚔ FRONTEIRA-AUTH · o caso mudou de nome porque mudou de régua: não é mais
  // "curta", é "fora da política". A senha usada aqui tem DEZ caracteres e um
  // número — passava com folga na régua antiga (comprimento ≥ 6) e é recusada
  // agora por não ter caractere especial. Devolver `senhaAtendeMinimo` mata o
  // caso na hora.
  it('senha nova fora da política é recusada ANTES de chamar o servidor', async () => {
    const { exigenciaDeSenha } = await import('@leela/core');
    await montar();
    await waitFor(() => expect(screen.getByLabelText(/senha nova/i)).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/senha atual/i), { target: { value: 'antiga123' } });
    fireEvent.change(screen.getByLabelText(/senha nova/i), { target: { value: 'novasenha9' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /trocar senha/i }));
    });
    expect(trocarSenha).not.toHaveBeenCalled();
    // A recusa fala a MESMA frase da política — nada escrito à mão nesta tela.
    expect(screen.getByRole('alert').textContent).toBe(exigenciaDeSenha());
  });

  it('a recusa não vira oráculo: mesma mensagem para senha atual errada', async () => {
    trocarSenha.mockRejectedValueOnce({ code: 'auth/wrong-password' });
    await montar();
    await waitFor(() => expect(screen.getByLabelText(/senha atual/i)).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/senha atual/i), { target: { value: 'errada12' } });
    fireEvent.change(screen.getByLabelText(/senha nova/i), { target: { value: 'novasenha9!' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /trocar senha/i }));
    });
    const msg = screen.getByRole('alert').textContent ?? '';
    expect(msg).toMatch(/confira a senha atual/i);
    // Nada que revele QUAL das duas metades falhou.
    expect(msg).not.toMatch(/wrong-password|incorreta|não confere/i);
  });
});

// ---------------------------------------------------------------------------
// FRONTEIRA-AUTH · dois campos de senha na mesma tela, réguas diferentes
// ---------------------------------------------------------------------------
//
// A distinção que estes casos travam: a senha ATUAL é credencial existente e
// não recebe medidor nenhum; a senha NOVA está sendo escolhida e recebe. Ligar
// o medidor na senha atual anunciaria no monitor da pessoa que a senha vigente
// dela é fraca, sem que ela possa fazer nada a respeito nesse campo.
describe('FRONTEIRA-AUTH · medidor na senha NOVA, nunca na atual', () => {
  /** O medidor de um campo, se existir. O DS o ancora em `{id}-forca`. */
  function medidorDe(id: string): HTMLElement | null {
    return document.getElementById(`${id}-forca`);
  }

  it('a senha atual não é medida; a nova é', async () => {
    await montar();
    await waitFor(() => expect(screen.getByLabelText(/senha atual/i)).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/senha atual/i), { target: { value: 'antiga123' } });
    fireEvent.change(screen.getByLabelText(/senha nova/i), { target: { value: 'novasenha' } });

    expect(medidorDe('senha-atual')).toBeNull();
    const medidor = medidorDe('senha-nova');
    expect(medidor).not.toBeNull();
    // O julgamento é PALAVRA, não só cor, e nomeia a pendência.
    expect(medidor?.textContent).toMatch(/senha fraca/i);
    expect(medidor?.textContent).toMatch(/especial/i);
  });

  it('os dois campos guardam o `autoComplete` que cada um precisa', async () => {
    await montar();
    await waitFor(() => expect(screen.getByLabelText(/senha atual/i)).toBeTruthy());
    // Trocar estes dois valores faz o gerenciador de senha oferecer a senha
    // velha no campo da nova, e vice-versa.
    expect(screen.getByLabelText(/senha atual/i).getAttribute('autocomplete')).toBe(
      'current-password',
    );
    expect(screen.getByLabelText(/senha nova/i).getAttribute('autocomplete')).toBe('new-password');
  });

  it('a dica da senha nova vem da política, palavra por palavra', async () => {
    const { exigenciaDeSenha } = await import('@leela/core');
    await montar();
    await waitFor(() => expect(screen.getByLabelText(/senha nova/i)).toBeTruthy());
    const dica = document.getElementById('senha-nova-regra');
    expect(dica?.textContent).toBe(exigenciaDeSenha());
    expect(dica?.textContent).toMatch(/número/i);
    expect(dica?.textContent).toMatch(/especial/i);
  });

  it('⚔ o olho de mostrar a senha NÃO submete o formulário de troca', async () => {
    await montar();
    await waitFor(() => expect(screen.getByLabelText(/senha atual/i)).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/senha atual/i), { target: { value: 'antiga123' } });
    fireEvent.change(screen.getByLabelText(/senha nova/i), { target: { value: 'novasenha9!' } });

    // São DOIS olhos nesta tela (um por campo) — os dois têm de ser inertes.
    const olhos = screen.getAllByRole('button', { name: /mostrar a senha/i });
    expect(olhos).toHaveLength(2);
    for (const olho of olhos) {
      expect((olho as HTMLButtonElement).type).toBe('button');
      await act(async () => {
        fireEvent.click(olho);
      });
    }
    // Nenhum dos cliques virou uma troca de senha.
    expect(trocarSenha).not.toHaveBeenCalled();
    // E os dois campos revelaram o próprio conteúdo, sem remontar nem limpar.
    expect((screen.getByLabelText(/senha atual/i) as HTMLInputElement).type).toBe('text');
    expect((screen.getByLabelText(/senha nova/i) as HTMLInputElement).value).toBe('novasenha9!');
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
