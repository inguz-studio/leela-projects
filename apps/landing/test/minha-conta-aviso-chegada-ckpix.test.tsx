/**
 * minha-conta-aviso-chegada-ckpix.test.tsx — CKPIX-FLOW · RN-560, ramo 2
 *
 * A OUTRA METADE do ramo do PIX vencido. O dono decidiu que a tela
 * *"redireciona AVISANDO que o pix foi cancelado após o prazo vencer, e leva
 * também para a área do cliente"* — aviso e destino são um gesto só, e o
 * `checkout-ckpix-fluxo.test.tsx` prova a metade que acontece no checkout
 * (guardar o recado e sair). Aqui prova-se a chegada.
 *
 * Os três aceites falsificáveis:
 *
 *   - o aviso APARECE na chegada, com a frase do prazo. Falsificação: não ler
 *     o `sessionStorage` na montagem deixa a pessoa chegar sem explicação
 *     nenhuma, que é o susto que a decisão veio evitar;
 *   - ele aparece TAMBÉM para quem chega sem conta nomeada — é essa pessoa que
 *     mais precisa dele, porque para ela o checkout virou uma tela de login sem
 *     uma palavra sobre o PIX que morreu. Falsificação: pendurar o aviso dentro
 *     do ramo autenticado mata este caso;
 *   - a leitura é DESTRUTIVA: sem isso a área repetiria "seu PIX venceu" em
 *     toda visita da sessão, muito depois de a pessoa já ter comprado de novo.
 *
 * Nada disso viaja na URL — a invariante do `AreaDoCliente` continua de pé, e
 * é justamente por causa dela que o recado anda por `sessionStorage`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';

vi.setConfig({ testTimeout: 20_000 });

const getMeusIngressos = vi.fn();
const getMinhasCompras = vi.fn();
const getMeusClubesEConvites = vi.fn();
let assinante: ((u: unknown) => void) | null = null;

vi.mock('@leela/api-client', () => ({
  getMeusIngressos: () => getMeusIngressos(),
  getMinhasCompras: () => getMinhasCompras(),
  getMeusClubesEConvites: () => getMeusClubesEConvites(),
  enviarVerificacaoEmail: () => Promise.resolve(),
  loginComEmail: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  emailValido: (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()),
  mensagemErroLogin: () => 'Não foi possível entrar. Confira o e-mail e a senha.',
  onSessionChange: (cb: (u: unknown) => void) => {
    assinante = cb;
    return () => {
      assinante = null;
    };
  },
  lerMeusDados: () => Promise.resolve({ nome: 'Ana Souza', email: 'ana@exemplo.dev' }),
  salvarMeusDados: () => Promise.resolve(),
  trocarSenha: () => Promise.resolve(),
  senhaAtendeMinimo: (s: string) => s.length >= 6,
  SENHA_MIN: 6,
  getClaims: () => Promise.resolve({ role: 'athlete' }),
}));
vi.mock('@/lib/leelaClient', () => ({ ensureLeela: () => undefined }));

import { AreaDoCliente } from '../app/(public)/minha-conta/AreaDoCliente';

const CHAVE = 'leela.aviso-area';

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  assinante = null;
  getMeusIngressos.mockResolvedValue({
    estado: 'ok',
    proximos: [],
    passados: [],
    listaCompleta: true,
    linksDisponiveis: true,
  });
  getMinhasCompras.mockResolvedValue({ estado: 'ok', compras: [] });
  getMeusClubesEConvites.mockResolvedValue({
    estado: 'ok',
    clubes: [],
    convites: [],
    clubesCompletos: true,
    convitesCompletos: true,
  });
});

afterEach(cleanup);

/** Sessão anônima do checkout — para o SDK é sessão; para a área, não é. */
async function chegarSemConta(): Promise<void> {
  await act(async () => {
    render(<AreaDoCliente />);
  });
  await act(async () => {
    assinante?.({ uid: 'anon-ckpix', isAnonymous: true });
  });
}

async function chegarComConta(): Promise<void> {
  await act(async () => {
    render(<AreaDoCliente />);
  });
  await act(async () => {
    assinante?.({
      uid: 'u-ckpix',
      isAnonymous: false,
      email: 'ana@exemplo.dev',
      emailVerified: true,
      displayName: null,
    });
  });
}

describe('RN-560 · o aviso do PIX vencido chega junto com a pessoa', () => {
  it('conta nomeada vê a explicação acima da área', async () => {
    window.sessionStorage.setItem(CHAVE, 'pix-vencido');
    await chegarComConta();
    await waitFor(() =>
      expect(screen.getByText(/foi cancelado depois que o prazo venceu/i)).toBeTruthy(),
    );
    expect(screen.getByText(/nada foi cobrado de você/i)).toBeTruthy();
    // A área em si continua desenhando normalmente por baixo do aviso.
    expect(screen.getByText(/olá,/i)).toBeTruthy();
  });

  it('quem chega SEM conta nomeada vê a porta E a explicação', async () => {
    window.sessionStorage.setItem(CHAVE, 'pix-vencido');
    await chegarSemConta();
    await waitFor(() => expect(screen.getByText('Entre para ver seus ingressos')).toBeTruthy());
    // Sem esta linha, para essa pessoa o checkout virou uma tela de login sem
    // uma palavra sobre o PIX que morreu.
    expect(screen.getByText(/foi cancelado depois que o prazo venceu/i)).toBeTruthy();
  });

  it('a leitura é destrutiva — o aviso não se repete na visita seguinte', async () => {
    window.sessionStorage.setItem(CHAVE, 'pix-vencido');
    await chegarComConta();
    await waitFor(() =>
      expect(screen.getByText(/foi cancelado depois que o prazo venceu/i)).toBeTruthy(),
    );
    expect(window.sessionStorage.getItem(CHAVE)).toBeNull();

    cleanup();
    await chegarComConta();
    await waitFor(() => expect(screen.getByText(/olá,/i)).toBeTruthy());
    expect(screen.queryByText(/prazo venceu/i)).toBeNull();
  });

  it('sem recado guardado, a área não inventa aviso nenhum', async () => {
    await chegarComConta();
    await waitFor(() => expect(screen.getByText(/olá,/i)).toBeTruthy());
    expect(screen.queryByText(/prazo venceu/i)).toBeNull();
  });

  it('valor estranho no armazenamento não vira aviso — e sai do caminho', async () => {
    // Aba compartilhada, extensão, versão antiga: o que não é do vocabulário
    // não é traduzido para uma frase sobre o dinheiro de ninguém.
    window.sessionStorage.setItem(CHAVE, 'qualquer-coisa');
    await chegarComConta();
    await waitFor(() => expect(screen.getByText(/olá,/i)).toBeTruthy());
    expect(screen.queryByText(/prazo venceu/i)).toBeNull();
    expect(window.sessionStorage.getItem(CHAVE)).toBeNull();
  });
});
