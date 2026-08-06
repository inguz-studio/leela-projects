/**
 * convite-senha-fronteira-auth.test.tsx — FRONTEIRA-AUTH
 *
 * As duas portas de convite da landing — assessoria (`/convite`) e
 * influenciador PF (`/convite/afiliado`) — são onde uma conta NASCE com senha
 * escolhida por quem aceita. Elas nunca tiveram teste, e carregavam cada uma a
 * sua cópia do piso (`SENHA_MIN_ASSESSORIA` e `SENHA_MIN_AFILIADO`, 8 em
 * ambas): duas constantes locais para uma regra só, esperando para divergir na
 * primeira vez que o piso subisse.
 *
 * Agora as duas leem a política única de `@leela/core` — que NÃO é mockada
 * aqui, de propósito. É função pura, e mockar a validação faria esta suíte
 * ficar verde exatamente enquanto a tela real recusa a senha.
 *
 * O que cada caso trava, e como se falsifica:
 *   1. o envio só libera com a regra INTEIRA atendida — devolver a régua de
 *      comprimento faz `novasenha9` voltar a passar;
 *   2. a dica sob o campo é a frase da política, palavra por palavra —
 *      reescrevê-la à mão descola a tela da mensagem que a Function devolve;
 *   3. o olho de mostrar a senha é inerte — um `<button>` sem `type` dentro de
 *      `<form>` submete, e clicar para VER a senha criaria a conta;
 *   4. o medidor está na senha NOVA e não na confirmação — medir o mesmo
 *      segredo duas vezes convida a comparar dois medidores.
 *
 * O SDK é mockado; nada sobe Firebase.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const provisionAssessoriaAccount = vi.fn();
const provisionAfiliadoAccount = vi.fn();

vi.mock('@leela/api-client', () => ({
  provisionAssessoriaAccount: (...a: unknown[]) => provisionAssessoriaAccount(...a),
  provisionAfiliadoAccount: (...a: unknown[]) => provisionAfiliadoAccount(...a),
}));

vi.mock('@/lib/leelaClient', () => ({ ensureLeela: () => undefined }));

// As telas entram por import ESTÁTICO, e não pelo `await import()` que as
// outras suítes da landing usam. O motivo é medido: o primeiro render puxa o
// barrel inteiro do DS (~15s nesta máquina) e, com o import dentro do caso,
// esse custo é cobrado do relógio do PRIMEIRO teste — que estourava o teto e
// derrubava o arquivo por IMPORT, não por comportamento. Estático, o barrel é
// resolvido na coleta, fora de qualquer timeout. O `vi.mock` acima continua
// valendo: a transformação do Vitest o iça acima dos imports.
import { ConviteForm } from '@/app/(public)/convite/ConviteForm';
import { AfiliadoConviteForm } from '@/app/(public)/convite/afiliado/AfiliadoConviteForm';

/**
 * As duas telas são gêmeas de comportamento e divergentes em `id`, rótulo e
 * seam. A tabela abaixo é o que permite rodar a MESMA bateria nas duas sem
 * copiar caso nenhum — e é também o que denuncia o dia em que uma das duas
 * receber um tratamento diferente da outra.
 */
const PORTAS = [
  {
    nome: 'assessoria (/convite)',
    idSenha: 'convite-senha',
    idConfirmar: 'convite-confirmar',
    idDica: 'convite-senha-regra',
    seam: provisionAssessoriaAccount,
    montar: async (): Promise<void> => {
      await act(async () => {
        render(<ConviteForm tenantId="tenant-1" parceriaId="parceria-1" token="tok" />);
      });
    },
  },
  {
    nome: 'influenciador PF (/convite/afiliado)',
    idSenha: 'afiliado-senha',
    idConfirmar: 'afiliado-confirmar',
    idDica: 'afiliado-senha-regra',
    seam: provisionAfiliadoAccount,
    montar: async (): Promise<void> => {
      await act(async () => {
        render(<AfiliadoConviteForm eventoId="evento-1" afiliadoId="afiliado-1" token="tok" />);
      });
    },
  },
] as const;

function campoSenha(): HTMLInputElement {
  return screen.getByLabelText(/crie uma senha/i) as HTMLInputElement;
}

function campoConfirmar(): HTMLInputElement {
  return screen.getByLabelText(/confirme a senha/i) as HTMLInputElement;
}

function botaoAceitar(): HTMLButtonElement {
  return screen.getByRole('button', { name: /aceitar convite/i }) as HTMLButtonElement;
}

/** O medidor do DS mora em `{id}-forca`; sem `avaliacao` ele não existe. */
function medidorDe(id: string): HTMLElement | null {
  return document.getElementById(`${id}-forca`);
}

beforeEach(() => {
  provisionAssessoriaAccount.mockReset();
  provisionAfiliadoAccount.mockReset();
  provisionAssessoriaAccount.mockResolvedValue({ replay: false });
  provisionAfiliadoAccount.mockResolvedValue({ replay: false });
});

afterEach(() => {
  // A suíte da landing roda sem `globals`: o auto-cleanup do RTL não se
  // registra sozinho e o DOM anterior sobreviveria à próxima query.
  cleanup();
});

describe.each(PORTAS)('FRONTEIRA-AUTH · convite de $nome', (porta) => {
  it('o aceite fica travado até a senha atender à regra INTEIRA', async () => {
    await porta.montar();

    // Vazia: travado.
    expect(botaoAceitar().disabled).toBe(true);

    // Dez caracteres com número e SEM especial — passava na régua antiga
    // (`senha.length >= 8`). É este caso que denuncia um retrocesso.
    fireEvent.change(campoSenha(), { target: { value: 'novasenha9' } });
    fireEvent.change(campoConfirmar(), { target: { value: 'novasenha9' } });
    expect(botaoAceitar().disabled).toBe(true);

    // Com especial e SEM número.
    fireEvent.change(campoSenha(), { target: { value: 'novasenha!' } });
    fireEvent.change(campoConfirmar(), { target: { value: 'novasenha!' } });
    expect(botaoAceitar().disabled).toBe(true);

    // Composição completa, comprimento abaixo do piso.
    fireEvent.change(campoSenha(), { target: { value: 'nov9!' } });
    fireEvent.change(campoConfirmar(), { target: { value: 'nov9!' } });
    expect(botaoAceitar().disabled).toBe(true);

    // Regra atendida, mas a confirmação não confere: continua travado.
    fireEvent.change(campoSenha(), { target: { value: 'novasenha9!' } });
    fireEvent.change(campoConfirmar(), { target: { value: 'novasenha9' } });
    expect(botaoAceitar().disabled).toBe(true);
    expect(screen.getByText(/as senhas não conferem/i)).not.toBeNull();

    // Tudo em ordem: libera.
    fireEvent.change(campoConfirmar(), { target: { value: 'novasenha9!' } });
    expect(botaoAceitar().disabled).toBe(false);
  });

  it('submeter fora da regra não chega na callable', async () => {
    await porta.montar();
    fireEvent.change(campoSenha(), { target: { value: 'novasenha9' } });
    fireEvent.change(campoConfirmar(), { target: { value: 'novasenha9' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Aceite do convite' }));
    });
    // A trava do botão é meia prova: `submit` passa por cima dela, e é a guarda
    // dentro do handler que impede a conta de nascer com senha fraca.
    expect(porta.seam).not.toHaveBeenCalled();
  });

  it('a senha que atende à regra chega inteira na callable', async () => {
    await porta.montar();
    fireEvent.change(campoSenha(), { target: { value: 'novasenha9!' } });
    fireEvent.change(campoConfirmar(), { target: { value: 'novasenha9!' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Aceite do convite' }));
    });
    expect(porta.seam).toHaveBeenCalledTimes(1);
    expect(porta.seam.mock.calls[0]?.[0]).toMatchObject({ senha: 'novasenha9!' });
  });

  it('a dica nomeia os requisitos e sai da política, palavra por palavra', async () => {
    const { exigenciaDeSenha, SENHA_MIN } = await import('@leela/core');
    await porta.montar();
    const dica = document.getElementById(porta.idDica);
    if (dica === null) throw new Error(`dica da política ausente em ${porta.nome}`);
    expect(dica.textContent).toBe(exigenciaDeSenha());
    expect(dica.textContent).toContain(String(SENHA_MIN));
    expect(dica.textContent).toMatch(/número/i);
    expect(dica.textContent).toMatch(/especial/i);
    // Anunciada junto com o campo — não é texto decorativo ao lado.
    expect(campoSenha().getAttribute('aria-describedby') ?? '').toContain(porta.idDica);
  });

  it('o medidor está na senha nova e NÃO na confirmação', async () => {
    await porta.montar();
    fireEvent.change(campoSenha(), { target: { value: 'novasenha' } });
    fireEvent.change(campoConfirmar(), { target: { value: 'novasenha' } });

    const medidor = medidorDe(porta.idSenha);
    expect(medidor).not.toBeNull();
    // Julgamento em PALAVRA, com a pendência nomeada — quem não distingue as
    // cores lê o que falta.
    expect(medidor?.textContent).toMatch(/senha fraca/i);
    expect(medidor?.textContent).toMatch(/número/i);
    expect(medidor?.textContent).toMatch(/especial/i);

    expect(medidorDe(porta.idConfirmar)).toBeNull();
  });

  it('os dois campos guardam `new-password` — a conta nasce aqui', async () => {
    await porta.montar();
    expect(campoSenha().getAttribute('autocomplete')).toBe('new-password');
    expect(campoConfirmar().getAttribute('autocomplete')).toBe('new-password');
  });

  it('⚔ o olho de mostrar a senha NÃO submete o formulário', async () => {
    await porta.montar();
    fireEvent.change(campoSenha(), { target: { value: 'novasenha9!' } });
    fireEvent.change(campoConfirmar(), { target: { value: 'novasenha9!' } });

    // Um por campo — os dois têm de ser inertes.
    const olhos = screen.getAllByRole('button', { name: /mostrar a senha/i });
    expect(olhos).toHaveLength(2);
    for (const olho of olhos) {
      expect((olho as HTMLButtonElement).type).toBe('button');
      await act(async () => {
        fireEvent.click(olho);
      });
    }
    // Nenhum clique virou aceite de convite.
    expect(porta.seam).not.toHaveBeenCalled();
    // E o formulário continua de pé, com o que foi digitado intacto.
    expect(screen.getByRole('form', { name: 'Aceite do convite' })).not.toBeNull();
    expect(campoSenha().type).toBe('text');
    expect(campoSenha().value).toBe('novasenha9!');
    expect(campoConfirmar().type).toBe('text');
  });
});
