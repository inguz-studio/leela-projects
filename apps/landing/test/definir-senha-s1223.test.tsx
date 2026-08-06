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
  // FRONTEIRA-AUTH · `senhaAtendeMinimo`/`SENHA_MIN` saíram daqui junto com a
  // dependência da tela. A régua agora é `avaliarSenha`/`exigenciaDeSenha` de
  // `@leela/core` — função PURA, deliberadamente NÃO mockada: um mock dizendo
  // "6 caracteres bastam" faria esta suíte passar verde enquanto a tela real
  // recusa a senha, que é o pior defeito que um teste pode ter.
  mensagemErroRedefinicao: () => 'Não foi possível redefinir a senha. Tente novamente.',
  // BUILD-MOTION: a fase `usado` passou a montar o `EntrarOverlay` (a pessoa
  // entra AQUI, sem ser mandada caçar o botão do header). O overlay consome a
  // frase única anti-enumeração — sem esta chave o mock não resolve o import.
  mensagemErroLogin: () => 'E-mail ou senha inválidos.',
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

    fireEvent.change(screen.getByLabelText(/nova senha/i), { target: { value: 'novasenha9!' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Definir senha' }));
    });

    await waitFor(() => expect(screen.getByText(/sua conta está pronta/i)).not.toBeNull());
    expect(confirmarResetSenha).toHaveBeenCalledWith('codigo-bom', 'novasenha9!');
    // A ordem é o aceite: confirmar e ENTÃO autenticar, com a mesma senha.
    expect(loginComEmail).toHaveBeenCalledWith('ana@exemplo.dev', 'novasenha9!');
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
    fireEvent.change(screen.getByLabelText(/nova senha/i), { target: { value: 'novasenha9!' } });
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

  // ⚔ REV-AREACLIENTE — REESCRITO, não apagado. A propriedade que importava
  // (sem código não se pede senha, e o Auth não é tocado) continua provada; o
  // que muda é a MOLDURA: quem chega aqui sem código veio PEDIR um link — é o
  // destino do "Não sei minha senha" do overlay — e não teve link nenhum
  // expirado. Chamar isso de "este link não vale mais" inventa um fracasso.
  it('sem `oobCode` na URL a tela OFERECE o link, e não acusa um link que nunca existiu', async () => {
    await renderFluxo('');
    await waitFor(() => expect(screen.getByText(/receba seu link de acesso/i)).not.toBeNull());
    expect(screen.queryByText(/este link não vale mais/i)).toBeNull();
    expect(verificarCodigoResetSenha).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/nova senha/i)).toBeNull();
    // A saída é executável na própria tela — o mesmo formulário neutro.
    expect(screen.getByRole('form', { name: 'Reenviar link de acesso' })).not.toBeNull();
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
    fireEvent.change(screen.getByLabelText(/nova senha/i), { target: { value: 'novasenha9!' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Definir senha' }));
    });
    await waitFor(() => expect(screen.getByText(/sua senha já foi definida/i)).not.toBeNull());
    cleanup();

    await renderFluxo('codigo-bom');
    await waitFor(() => expect(screen.getByText(/sua senha já foi definida/i)).not.toBeNull());
  });

  // ⚔ REV-AREACLIENTE · o beco que a lane não viu. A senha JÁ ESTÁ GRAVADA e o
  // `oobCode` JÁ FOI QUEIMADO quando o login falha. Deixar a pessoa no MESMO
  // formulário com uma mensagem de erro a empurra para reenviar — e a segunda
  // tentativa bate em `auth/invalid-action-code`, dizendo "este link expirou"
  // sobre uma senha que existe. A marca sozinha só a salvava depois de um
  // recarregamento que ninguém tem motivo para fazer.
  it('⚔ senha gravada e login falho NÃO deixa a pessoa no formulário — a tela oferece entrar', async () => {
    verificarCodigoResetSenha.mockResolvedValue('ana@exemplo.dev');
    confirmarResetSenha.mockResolvedValue(undefined);
    loginComEmail.mockRejectedValue(
      Object.assign(new Error('x'), { code: 'auth/network-request-failed' }),
    );
    await renderFluxo('codigo-bom');
    await waitFor(() => expect(screen.getByLabelText(/nova senha/i)).not.toBeNull());
    fireEvent.change(screen.getByLabelText(/nova senha/i), { target: { value: 'novasenha9!' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Definir senha' }));
    });

    // SEM recarregar: a tela já tem de dizer a verdade — a senha está definida.
    await waitFor(() => expect(screen.getByText(/sua senha já foi definida/i)).not.toBeNull());
    // O formulário sumiu: reenviar a mesma senha só produziria "link inválido".
    expect(screen.queryByRole('form', { name: 'Definir senha' })).toBeNull();
    // E a tela NÃO mente dizendo que o link não presta.
    expect(screen.queryByText(/este link não vale mais/i)).toBeNull();
    // A senha digitada não sobrevive ao erro.
    expect(screen.queryByLabelText(/nova senha/i)).toBeNull();
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

// ---------------------------------------------------------------------------
// FRONTEIRA-AUTH · a senha nova passou a obedecer à política única
// ---------------------------------------------------------------------------
//
// A tela media COMPRIMENTO e só (`senhaAtendeMinimo`, 6 caracteres). Agora ela
// consome `avaliarSenha`/`exigenciaDeSenha` de `@leela/core` — a mesma régua
// que as Functions chamam. Os casos abaixo são falsificáveis por construção:
// devolver a régua antiga faz `novasenha9` (dez caracteres, sem especial)
// voltar a liberar o botão, e é exatamente isso que o primeiro caso mede.
describe('FRONTEIRA-AUTH · a política da casa manda no campo de senha nova', () => {
  /** A tela na fase `pronto`, com o campo de senha na mão. */
  async function comFormulario(): Promise<HTMLInputElement> {
    verificarCodigoResetSenha.mockResolvedValue('ana@exemplo.dev');
    await renderFluxo('codigo-bom');
    await waitFor(() => expect(screen.getByLabelText(/nova senha/i)).not.toBeNull());
    return screen.getByLabelText(/nova senha/i) as HTMLInputElement;
  }

  function botaoSalvar(): HTMLButtonElement {
    return screen.getByRole('button', { name: /salvar e entrar/i }) as HTMLButtonElement;
  }

  it('a dica nomeia os TRÊS requisitos, e não uma frase escrita à mão', async () => {
    const { exigenciaDeSenha, SENHA_MIN } = await import('@leela/core');
    await comFormulario();
    const dica = document.getElementById('definir-senha-regra');
    if (dica === null) throw new Error('dica da política ausente sob o campo de senha');
    // Palavra por palavra igual à política: se alguém reescrever a frase na
    // tela, ela deixa de bater com a mensagem que a Function devolve.
    expect(dica.textContent).toBe(exigenciaDeSenha());
    expect(dica.textContent).toContain(String(SENHA_MIN));
    expect(dica.textContent).toMatch(/número/i);
    expect(dica.textContent).toMatch(/especial/i);
    // E ela é anunciada junto com o campo, não é decoração solta.
    const campo = screen.getByLabelText(/nova senha/i);
    expect(campo.getAttribute('aria-describedby') ?? '').toContain('definir-senha-regra');
  });

  it('o envio fica travado até a senha atender à regra INTEIRA', async () => {
    const campo = await comFormulario();

    // Vazia: travado.
    expect(botaoSalvar().disabled).toBe(true);

    // Dez caracteres com número e SEM especial — passava na régua antiga.
    fireEvent.change(campo, { target: { value: 'novasenha9' } });
    expect(botaoSalvar().disabled).toBe(true);

    // Oito caracteres com especial e SEM número.
    fireEvent.change(campo, { target: { value: 'novasenha!' } });
    expect(botaoSalvar().disabled).toBe(true);

    // Curta demais, mesmo com os dois requisitos de composição.
    fireEvent.change(campo, { target: { value: 'nov9!' } });
    expect(botaoSalvar().disabled).toBe(true);

    // Os três juntos: libera.
    fireEvent.change(campo, { target: { value: 'novasenha9!' } });
    expect(botaoSalvar().disabled).toBe(false);
  });

  it('submeter com senha fora da regra não chega no Auth', async () => {
    const campo = await comFormulario();
    fireEvent.change(campo, { target: { value: 'novasenha9' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Definir senha' }));
    });
    // A trava do botão é meia prova: `fireEvent.submit` passa por cima dela, e
    // é a guarda dentro do handler que impede o pedido de sair.
    expect(confirmarResetSenha).not.toHaveBeenCalled();
  });

  it('o medidor acompanha a senha e diz o que falta — em PALAVRA, não só em cor', async () => {
    const campo = await comFormulario();
    const medidor = (): HTMLElement => {
      const alvo = document.getElementById('definir-senha-campo-forca');
      if (alvo === null) throw new Error('medidor ausente no campo de senha nova');
      return alvo;
    };
    // Campo em branco não recebe julgamento nenhum.
    expect(medidor().textContent?.trim()).toBe('');

    fireEvent.change(campo, { target: { value: 'novasenha' } });
    expect(medidor().textContent).toMatch(/senha fraca/i);
    // A pendência é nomeada: quem não distingue as cores lê o que falta.
    expect(medidor().textContent).toMatch(/número/i);
    expect(medidor().textContent).toMatch(/especial/i);

    fireEvent.change(campo, { target: { value: 'ponte.de.corda.no.7' } });
    expect(medidor().textContent).toMatch(/senha forte/i);
  });

  it('⚔ o olho de mostrar a senha NÃO submete o formulário', async () => {
    const campo = await comFormulario();
    fireEvent.change(campo, { target: { value: 'novasenha9!' } });

    const olho = screen.getByRole('button', { name: /mostrar a senha/i }) as HTMLButtonElement;
    // O defeito nº 1 desta feature: um `<button>` sem `type` dentro de `<form>`
    // é `submit` por default — clicar para VER a senha gravaria a senha.
    expect(olho.type).toBe('button');

    await act(async () => {
      fireEvent.click(olho);
    });
    expect(confirmarResetSenha).not.toHaveBeenCalled();
    expect(loginComEmail).not.toHaveBeenCalled();
    // E o formulário continua de pé, com a senha digitada intacta.
    expect(screen.getByRole('form', { name: 'Definir senha' })).not.toBeNull();
    expect((screen.getByLabelText(/nova senha/i) as HTMLInputElement).value).toBe('novasenha9!');

    // O que o clique faz de verdade: troca `type` no MESMO nó do input, sem
    // remontar (remontar perderia o gerenciador de senha e o cursor).
    const revelado = screen.getByLabelText(/nova senha/i) as HTMLInputElement;
    expect(revelado).toBe(campo);
    expect(revelado.type).toBe('text');
    // O `autoComplete` sobrevive à troca — sem ele o gerenciador não oferece
    // guardar a senha que a pessoa acabou de criar.
    expect(revelado.getAttribute('autocomplete')).toBe('new-password');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ocultar a senha/i }));
    });
    expect((screen.getByLabelText(/nova senha/i) as HTMLInputElement).type).toBe('password');
  });
});
