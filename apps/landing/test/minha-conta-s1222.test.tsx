/**
 * minha-conta-s1222.test.tsx — LEELA-S1222-T2 · RN-451
 *
 * A área do cliente na landing. Os aceites falsificáveis da fila ADMINSEP,
 * um por caso:
 *
 *   - a área é INALCANÇÁVEL por sessão anônima (a do checkout é uma sessão de
 *     verdade para o SDK: uma guarda escrita como "tem usuário?" a aceitaria).
 *     Falsificação: trocar a guarda de `nomeado` por `usuario !== null` faz o
 *     caso da sessão anônima mostrar a lista;
 *   - com sessão nomeada e e-mail verificado, os ingressos aparecem nos DOIS
 *     recortes, e o recorte vem do servidor — a tela não recalcula "já
 *     passou?";
 *   - sem e-mail verificado, o estado honesto COM reenvio, e nunca a lista
 *     vazia. Falsificação: colapsar os estados num só mata este caso e o
 *     seguinte;
 *   - a lista incompleta (índice de grupo ausente) é DECLARADA na tela;
 *   - nenhum dado de perfil viaja na URL.
 *
 * O SDK é mockado — o teste não sobe Firebase.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { GetMeusIngressosResult, GetMinhasComprasResult } from '@leela/api-client';

// O primeiro render puxa o barrel do DS; com o teto default de 5 s o caso
// inaugural do arquivo estoura por IMPORT, não por comportamento.
vi.setConfig({ testTimeout: 20_000 });

const getMeusIngressos = vi.fn();
const getMinhasCompras = vi.fn();
const getMeusClubesEConvites = vi.fn();
const enviarVerificacaoEmail = vi.fn();
const loginComEmail = vi.fn();
let assinante: ((u: unknown) => void) | null = null;

vi.mock('@leela/api-client', () => ({
  getMeusIngressos: () => getMeusIngressos(),
  getMinhasCompras: () => getMinhasCompras(),
  // A aba "Clubes e convites" (S1222-T4) entra na MESMA leitura em paralelo:
  // sem este seam no mock, o `Promise.all` rejeita e a área inteira cai no
  // estado de falha — o que mataria os casos deste arquivo por um motivo que
  // não é o deles.
  getMeusClubesEConvites: () => getMeusClubesEConvites(),
  enviarVerificacaoEmail: () => enviarVerificacaoEmail(),
  loginComEmail: (...a: unknown[]) => loginComEmail(...a),
  logout: () => Promise.resolve(),
  emailValido: (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()),
  mensagemErroLogin: () => 'Não foi possível entrar. Confira o e-mail e a senha.',
  onSessionChange: (cb: (u: unknown) => void) => {
    assinante = cb;
    return () => {
      assinante = null;
    };
  },
  // A aba "Meus dados" (S1222-T3) monta junto — o `Tabs` do DS usa
  // `forceMount`, então os painéis das outras abas existem no documento desde
  // o primeiro render e os seams deles precisam estar no mock.
  lerMeusDados: () => Promise.resolve({ nome: 'Ana Souza', email: 'ana@exemplo.dev' }),
  salvarMeusDados: () => Promise.resolve(),
  trocarSenha: () => Promise.resolve(),
  senhaAtendeMinimo: (s: string) => s.length >= 6,
  SENHA_MIN: 6,
  // As portas do fim da área (S1222-T5) leem o token para saber qual desenhar.
  // Aqui a conta é só cliente — as portas têm arquivo de teste próprio.
  getClaims: () => Promise.resolve({ role: 'athlete' }),
}));

vi.mock('@/lib/leelaClient', () => ({ ensureLeela: () => undefined }));

const AGORA_ISO_FUTURO = '2027-05-10T09:00:00.000Z';
const AGORA_ISO_PASSADO = '2024-05-10T09:00:00.000Z';

function ingressos(over: Partial<GetMeusIngressosResult> = {}): GetMeusIngressosResult {
  return {
    estado: 'ok',
    listaCompleta: true,
    linksDisponiveis: true,
    proximos: [
      {
        inscritoId: 'insc-1',
        eventoId: 'meia-floripa',
        eventoNome: 'Meia de Floripa',
        eventoSlug: 'meia-floripa',
        eventoDataIso: AGORA_ISO_FUTURO,
        eventoLocal: 'Florianópolis, SC',
        titular: 'Ana Souza',
        modalidade: '21k',
        status: 'confirmado',
        codigoIngresso: 'ABC123',
        emitido: true,
        linkIngresso: 'https://leela.test/ingresso/LLIP1.k1.aa.bb',
      },
    ],
    passados: [
      {
        inscritoId: 'insc-2',
        eventoId: 'trilha-serra',
        eventoNome: 'Trilha da Serra',
        eventoSlug: 'trilha-serra',
        eventoDataIso: AGORA_ISO_PASSADO,
        eventoLocal: 'Urubici, SC',
        titular: 'Ana Souza',
        modalidade: '10k',
        status: 'confirmado',
        codigoIngresso: null,
        emitido: false,
        linkIngresso: null,
      },
    ],
    ...over,
  };
}

function compras(over: Partial<GetMinhasComprasResult> = {}): GetMinhasComprasResult {
  return {
    estado: 'ok',
    compras: [
      {
        pedidoId: 'ped-1',
        codigoPedido: 'K7M2P',
        eventoId: 'meia-floripa',
        eventoNome: 'Meia de Floripa',
        eventoSlug: 'meia-floripa',
        eventoDataIso: AGORA_ISO_FUTURO,
        status: 'pago',
        valorTotal: 189,
        formaPagamento: 'pix',
        participantes: 2,
        compradoEmIso: '2026-08-01T12:00:00.000Z',
      },
      {
        pedidoId: 'ped-antigo',
        codigoPedido: null,
        eventoId: 'trilha-serra',
        eventoNome: 'Trilha da Serra',
        eventoSlug: 'trilha-serra',
        eventoDataIso: AGORA_ISO_PASSADO,
        status: 'pago',
        valorTotal: 120,
        formaPagamento: 'pix',
        participantes: 1,
        compradoEmIso: '2024-04-01T12:00:00.000Z',
      },
    ],
    ...over,
  };
}

/** O painel de ingressos — os dois painéis do `Tabs` ficam no documento. */
function painelIngressos(): HTMLElement {
  const el = document.querySelector('[data-slot="painel-ingressos"]');
  if (el === null) throw new Error('painel de ingressos não montado');
  return el as HTMLElement;
}

async function montar(): Promise<void> {
  const { AreaDoCliente } = await import('@/app/(public)/minha-conta/AreaDoCliente');
  await act(async () => {
    render(<AreaDoCliente />);
  });
}

/** Emite um estado de sessão pelo mesmo canal que o SDK usaria. */
async function sessao(user: unknown): Promise<void> {
  await act(async () => {
    assinante?.(user);
  });
}

const ANA_NOMEADA = {
  uid: 'uid-ana',
  isAnonymous: false,
  email: 'ana@exemplo.dev',
  displayName: 'Ana Souza',
  emailVerified: true,
};

const ANA_ANONIMA = {
  uid: 'anon-ana',
  isAnonymous: true,
  email: null,
  displayName: null,
  emailVerified: false,
};

beforeEach(() => {
  assinante = null;
  getMeusIngressos.mockReset();
  getMinhasCompras.mockReset();
  getMeusClubesEConvites.mockReset();
  // Default NEUTRO: a conta deste arquivo não tem clube nem convite, e os
  // casos daqui não falam sobre isso. Cada caso que precisar de outra coisa
  // sobrescreve — o mesmo padrão dos outros dois seams.
  getMeusClubesEConvites.mockResolvedValue({
    estado: 'ok',
    clubes: [],
    convites: [],
    clubesCompletos: true,
    convitesCompletos: true,
  });
  enviarVerificacaoEmail.mockReset();
  loginComEmail.mockReset();
});

afterEach(() => {
  // A suíte da landing roda sem `globals`: o auto-cleanup do RTL não se
  // registra sozinho.
  cleanup();
});

describe('S1222-T2 · a guarda de sessão', () => {
  it('enquanto o SDK não respondeu, a tela não afirma nada', async () => {
    await montar();
    expect(screen.getByRole('status').textContent).toMatch(/carregando sua conta/i);
    expect(getMeusIngressos).not.toHaveBeenCalled();
  });

  it('sessão DESLOGADA vê a porta de entrada, e nenhuma leitura acontece', async () => {
    await montar();
    await sessao(null);
    expect(screen.getByRole('heading', { name: /entre para ver seus ingressos/i })).toBeTruthy();
    expect(getMeusIngressos).not.toHaveBeenCalled();
    expect(getMinhasCompras).not.toHaveBeenCalled();
  });

  it('a sessão ANÔNIMA do checkout NÃO alcança a área (RN-451, primeira linha)', async () => {
    await montar();
    await sessao(ANA_ANONIMA);
    expect(screen.getByRole('heading', { name: /entre para ver seus ingressos/i })).toBeTruthy();
    expect(screen.queryByText(/meus ingressos/i)).toBeNull();
    expect(getMeusIngressos).not.toHaveBeenCalled();
  });

  // ⚔ REV-AREACLIENTE · a porta de entrada AFIRMA "se você já comprou alguma
  // vez, a conta existe" — e até aqui não dava nenhum caminho para quem não
  // sabe a senha dessa conta. Quem chega nesta tela pelo CTA do checkout
  // acabou de pagar e, se o e-mail falhou (04/08), NUNCA teve senha: a frase
  // vira uma porta trancada com o aviso de que a chave existe.
  it('⚔ a porta de entrada oferece saída a quem não sabe a senha', async () => {
    await montar();
    await sessao(null);
    const saidas = document.querySelectorAll('[data-slot="esqueci-minha-senha"]');
    expect(saidas.length).toBeGreaterThan(0);
    for (const saida of saidas) {
      expect((saida as HTMLAnchorElement).getAttribute('href')).toBe('/definir-senha');
    }
  });
});

describe('S1222-T2 · os ingressos, nos dois recortes', () => {
  beforeEach(() => {
    getMeusIngressos.mockResolvedValue(ingressos());
    getMinhasCompras.mockResolvedValue(compras());
  });

  it('mostra próximos e passados como o SERVIDOR os separou', async () => {
    await montar();
    await sessao(ANA_NOMEADA);
    await waitFor(() => expect(screen.getByText('Próximos')).toBeTruthy());
    expect(screen.getByText('Passados')).toBeTruthy();
    // O `Tabs` do DS monta os DOIS painéis (forceMount — os conteúdos ficam no
    // documento e continuam alcançáveis pela busca da página), então o nome da
    // experiência aparece no ingresso E na compra. A asserção é por painel.
    const painel = within(painelIngressos());
    expect(painel.getByText('Meia de Floripa')).toBeTruthy();
    expect(painel.getByText('Trilha da Serra')).toBeTruthy();
  });

  it('o ingresso emitido leva ao link assinado; o não emitido diz o que está havendo', async () => {
    await montar();
    await sessao(ANA_NOMEADA);
    await waitFor(() => expect(screen.getByRole('link', { name: /ver ingresso/i })).toBeTruthy());
    const link = screen.getByRole('link', { name: /ver ingresso/i }) as HTMLAnchorElement;
    expect(link.href).toContain('/ingresso/LLIP1.');
    expect(screen.getByText(/estamos preparando seu ingresso/i)).toBeTruthy();
  });

  it('a lista INCOMPLETA é declarada na tela, nunca silenciada', async () => {
    getMeusIngressos.mockResolvedValue(ingressos({ listaCompleta: false }));
    await montar();
    await sessao(ANA_NOMEADA);
    await waitFor(() =>
      expect(screen.getByText(/pode estar faltando algum ingresso/i)).toBeTruthy()
    );
  });

  it('sem o keyring no servidor, a tela DIZ que não abre o ingresso por aqui (PIXREAL-FIX T5)', async () => {
    getMeusIngressos.mockResolvedValue(ingressos({ linksDisponiveis: false }));
    await montar();
    await sessao(ANA_NOMEADA);
    await waitFor(() =>
      expect(screen.getByText(/não conseguimos abrir seus ingressos por aqui/i)).toBeTruthy()
    );
    // E os ingressos pagos continuam na tela: derrubar a lista por uma
    // variável de ambiente seria o incidente de 04/08 visto do outro lado.
    expect(within(painelIngressos()).getByText('Meia de Floripa')).toBeTruthy();
  });

  it('conta sem nenhum ingresso vê o vazio HONESTO, e ele não é o mesmo texto do erro', async () => {
    getMeusIngressos.mockResolvedValue(
      ingressos({ proximos: [], passados: [], listaCompleta: true })
    );
    await montar();
    await sessao(ANA_NOMEADA);
    await waitFor(() => expect(screen.getByText(/ainda não tem ingressos/i)).toBeTruthy());
    expect(screen.queryByText(/não conseguimos carregar/i)).toBeNull();
  });

  it('nenhum dado de perfil viaja na URL dos links da tela', async () => {
    await montar();
    await sessao(ANA_NOMEADA);
    await waitFor(() => expect(screen.getByRole('link', { name: /ver ingresso/i })).toBeTruthy());
    for (const a of Array.from(document.querySelectorAll('a[href]'))) {
      const href = a.getAttribute('href') ?? '';
      expect(href).not.toContain('uid-ana');
      expect(href).not.toContain('ana@exemplo.dev');
    }
  });
});

describe('S1222-T2 · o e-mail não verificado tem estado próprio, não lista vazia', () => {
  it('mostra o estado honesto e NÃO o vazio de "nenhum ingresso"', async () => {
    getMeusIngressos.mockResolvedValue({
      estado: 'email_nao_verificado',
      proximos: [],
      passados: [],
      listaCompleta: true,
      linksDisponiveis: true,
    });
    getMinhasCompras.mockResolvedValue({ estado: 'email_nao_verificado', compras: [] });
    await montar();
    await sessao(ANA_NOMEADA);
    await waitFor(() => expect(screen.getByText(/confirme seu e-mail/i)).toBeTruthy());
    expect(screen.queryByText(/ainda não tem ingressos/i)).toBeNull();
    expect(screen.getByText('ana@exemplo.dev')).toBeTruthy();
  });

  it('o reenvio da confirmação sai pela própria tela', async () => {
    getMeusIngressos.mockResolvedValue({
      estado: 'email_nao_verificado',
      proximos: [],
      passados: [],
      listaCompleta: true,
      linksDisponiveis: true,
    });
    getMinhasCompras.mockResolvedValue({ estado: 'email_nao_verificado', compras: [] });
    enviarVerificacaoEmail.mockResolvedValue(undefined);
    await montar();
    await sessao(ANA_NOMEADA);
    await waitFor(() => expect(screen.getByRole('button', { name: /reenviar/i })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /reenviar/i }));
    });
    expect(enviarVerificacaoEmail).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/abra o e-mail/i));
  });
});

describe('S1222-T2 · a leitura que falha não vira lista vazia', () => {
  it('mostra o estado de falha e tenta de novo quando pedido', async () => {
    getMeusIngressos.mockRejectedValueOnce(new Error('rede'));
    getMinhasCompras.mockRejectedValueOnce(new Error('rede'));
    await montar();
    await sessao(ANA_NOMEADA);
    await waitFor(() => expect(screen.getByText(/não conseguimos carregar sua conta/i)).toBeTruthy());
    expect(screen.queryByText(/ainda não tem ingressos/i)).toBeNull();

    getMeusIngressos.mockResolvedValue(ingressos());
    getMinhasCompras.mockResolvedValue(compras());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /tentar de novo/i }));
    });
    await waitFor(() => expect(screen.getByText('Próximos')).toBeTruthy());
  });

  it('⚔ REV-B4 · a aba de clubes que falha NÃO leva compras e ingressos junto', async () => {
    // A `getMeusClubesEConvites` é a function mais nova da área — a única que
    // pode não existir ainda quando a landing sobe. Dentro do `Promise.all`
    // cru, a rejeição dela apagava a tela de COMPRAS, que só existe porque em
    // 04/08 um PIX real não apareceu em superfície nenhuma. Falsificação:
    // tirar o `catch` de `lerClubesDegradando` mata este caso.
    getMeusIngressos.mockResolvedValue(ingressos());
    getMinhasCompras.mockResolvedValue(compras());
    getMeusClubesEConvites.mockRejectedValue(new Error('functions/not-found'));

    await montar();
    await sessao(ANA_NOMEADA);

    await waitFor(() => expect(screen.getByText('Próximos')).toBeTruthy());
    expect(screen.queryByText(/não conseguimos carregar sua conta/i)).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /clubes e convites/i }));
    });
    // E a falha é DECLARADA, não maquiada de "você não tem nada".
    await waitFor(() =>
      expect(document.querySelector('[data-slot="clubes-lista-parcial"]')).toBeTruthy()
    );
    expect(document.querySelector('[data-slot="convites-lista-parcial"]')).toBeTruthy();
  });
});

describe('S1222-T2 · o histórico de compras', () => {
  it('mostra o código da compra formatado, e ausência é AUSÊNCIA (RN-475)', async () => {
    getMeusIngressos.mockResolvedValue(ingressos());
    getMinhasCompras.mockResolvedValue(compras());
    await montar();
    await sessao(ANA_NOMEADA);
    await waitFor(() => expect(screen.getByRole('tab', { name: /minhas compras/i })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /minhas compras/i }));
    });
    await waitFor(() => expect(screen.getByText(/K7M2P/)).toBeTruthy());
    // A compra antiga (sem código) não pode ter ganhado o id no lugar.
    expect(screen.queryByText(/ped-antigo/)).toBeNull();
  });
});

describe('S1222-T2 · o interruptor das duas jornadas', () => {
  it('`AREA_CLIENTE_NO_AR` está ligado e o destino é a área, não a home', async () => {
    const { AREA_CLIENTE_NO_AR, ROTA_AREA_CLIENTE, destinoPosEntrada } = await import(
      '@/lib/areaDoCliente'
    );
    expect(AREA_CLIENTE_NO_AR).toBe(true);
    expect(destinoPosEntrada().href).toBe(ROTA_AREA_CLIENTE);
    expect(destinoPosEntrada().href).not.toBe('/');
  });
});
