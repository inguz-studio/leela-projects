// =============================================================================
// S1217-T4 · RN-439 · D-ACH-13 — a tela envia a versão que EXIBIU, e repõe o
// aceite quando o servidor recusa por divergência.
//
// Por que a regra nasceu: a S1217-T1 (RN-438) tirou os aceites da tela de pagar
// e os pôs no fim da etapa de inscrição. A distância entre o GESTO da pessoa e
// o CARIMBO do servidor saiu de segundos para minutos — e nesse intervalo cabe
// o organizador publicar uma política nova. O `materialHash` da F-1 prova o que
// o SERVIDOR leu; nunca provou o que a PESSOA leu.
//
// O que se prova aqui é o lado do CLIENTE. O lado do servidor (a conferência
// dentro da transação, a recusa antes de qualquer escrita, o silêncio sobre o
// material novo e a garantia de que a versão exibida NÃO é gravada) vive em
// `functions/src/__tests__/aceitesVersaoExibida.integration.test.ts` e roda
// contra o Emulator.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MOTIVO_ACEITE_VERSAO_DIVERGENTE } from '@leela/core';
import type { EventoPublico } from '@/lib/tipos';

const loginAnonimo = vi.fn();
const cotarInscricaoCheckout = vi.fn();
const createInscricaoCharge = vi.fn();
const getCheckoutPrefill = vi.fn();
const ensureLeela = vi.fn();

vi.mock('@leela/api-client', () => ({
  loginAnonimo: (...a: unknown[]) => loginAnonimo(...a),
  cotarInscricaoCheckout: (...a: unknown[]) => cotarInscricaoCheckout(...a),
  createInscricaoCharge: (...a: unknown[]) => createInscricaoCharge(...a),
  confirmarPagamentoSandbox: vi.fn(),
  expirarPixPendente: vi.fn(),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
}));
vi.mock('@/lib/leelaClient', () => ({ ensureLeela: (...a: unknown[]) => ensureLeela(...a) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';

function eventoCom(
  politicaVersao: number,
  termoSaudeVersao: number,
  termoSaudeCustom: { texto: string; versao: number } | null = null,
): EventoPublico {
  return {
    slug: 'experiencia-teste',
    nome: 'Experiência Teste',
    dataISO: '2026-04-26T07:00:00-03:00',
    dataLabel: '26 de abril de 2026',
    diaSemanaLabel: 'dom.',
    horaLabel: '07:00',
    local: 'Parque',
    modalidadeEsporte: 'Corrida de rua',
    usaChip: false,
    qtdInscritos: 0,
    organizador: null,
    modalidades: [{ nome: '5k', precoVigente: 5000 }],
    kits: [],
    itensTamanhados: [],
    precoMinimo: 5000,
    janelasRetirada: [],
    secoes: [],
    seo: { titulo: 'Experiência Teste', descricao: 'desc' },
    estadoVenda: 'aberto',
    exigenciasSaude: { atestado: false, parq: false },
    politicaVendas: {
      versao: politicaVersao,
      reembolso: { janelaArrependimentoDias: 7, corteHoras: 48, slaAnaliseDias: 3 },
      transferencia: { habilitada: false, janelaHoras: 72, taxa: 0 },
      trocaIngresso: { habilitada: false, janelaHoras: 48, permiteReembolsoDowngrade: false },
    },
    termoSaudeVersao,
    termoSaudeCustom,
    taxaRepassada: false,
  } as unknown as EventoPublico;
}

const COTACAO = {
  itens: [{ modalidade: '5k', preco: 5000, loteNome: null, kitNome: null, kitPreco: 0 }],
  valorBase: 5000,
  desconto: 0,
  valorFinal: 5000,
  cupomAplicado: null,
  taxaServico: 0,
  totalAVista: 5000,
  opcoesParcelamento: [{ parcelas: 1, valorParcela: 5000, valorTotal: 5000 }],
  parcelamento: { parcelas: 1, valorParcela: 5000, valorTotal: 5000 },
  totalCobrado: 5000,
  forma: 'pix',
  totaisPorMeio: { pix: 5000, cartao_credito: 5000 },
};

const CHARGE = {
  pedidoId: 'ped_1',
  pagamentoId: 'pag_1',
  inscritoIds: ['ins_1'],
  chargeId: 'chg_1',
  qrCode: 'PIX-PAYLOAD',
  statusPedido: 'pendente',
  valores: {
    valorBase: 5000,
    desconto: 0,
    valorFinal: 5000,
    taxaServico: 0,
    totalCobrado: 5000,
    parcelas: 1,
    valorParcela: 5000,
  },
};

/** Recusa do servidor no formato do callable (motivo TIPADO em `details`). */
function erroVersaoDivergente(): Error & { code: string; details: { motivo: string } } {
  const err = new Error(
    'Os termos deste evento foram atualizados enquanto você preenchia a inscrição — ' +
      'leia a versão nova e confirme o aceite para concluir a compra.',
  ) as Error & { code: string; details: { motivo: string } };
  err.code = 'functions/failed-precondition';
  err.details = { motivo: MOTIVO_ACEITE_VERSAO_DIVERGENTE };
  return err;
}

/** Outra recusa `failed-precondition` — a que NÃO pode desmarcar aceite. */
function erroPixAnterior(): Error & { code: string; details: { motivo: string } } {
  const err = new Error('Existe um código PIX ativo para este carrinho.') as Error & {
    code: string;
    details: { motivo: string };
  };
  err.code = 'functions/failed-precondition';
  err.details = { motivo: 'pix_pendente_ativo' };
  return err;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  ensureLeela.mockReturnValue(undefined);
  cotarInscricaoCheckout.mockResolvedValue(COTACAO);
  createInscricaoCharge.mockResolvedValue(CHARGE);
});

afterEach(cleanup);

function preencherCampos(): void {
  fireEvent.change(screen.getAllByLabelText(/nome completo/i)[0]!, {
    target: { value: 'Ana Participante' },
  });
  fireEvent.change(screen.getAllByLabelText(/^e-mail/i)[0]!, {
    target: { value: 'ana@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '11988887777' } });
  fireEvent.change(screen.getAllByLabelText(/^cpf/i)[0]!, { target: { value: '529.982.247-25' } });
  fireEvent.change(screen.getAllByLabelText(/data de nascimento/i)[0]!, {
    target: { value: '20/05/1990' },
  });
  fireEvent.change(screen.getByLabelText(/^cep/i), { target: { value: '01310100' } });
  fireEvent.change(screen.getByLabelText(/logradouro/i), { target: { value: 'Av. Paulista' } });
  fireEvent.change(screen.getByLabelText(/^número/i), { target: { value: '1000' } });
  fireEvent.change(screen.getByLabelText(/cidade/i), { target: { value: 'São Paulo' } });
  fireEvent.change(screen.getByLabelText(/^uf/i), { target: { value: 'SP' } });
}

function marcarBase(): void {
  fireEvent.click(
    screen.getByRole('checkbox', { name: /termos da compra e a política de cancelamento/i }),
  );
  fireEvent.click(screen.getByRole('checkbox', { name: /boas condições de saúde/i }));
}

async function ateOPagar(
  evento: EventoPublico,
  recarregar?: () => void,
): Promise<void> {
  await act(async () => {
    render(
      <CheckoutFlow
        evento={evento}
        atribuicao={{}}
        {...(recarregar !== undefined ? { recarregarMaterial: recarregar } : {})}
      />,
    );
  });
  fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
  });
  preencherCampos();
  marcarBase();
  if (evento.termoSaudeCustom !== null && evento.termoSaudeCustom !== undefined) {
    fireEvent.click(
      screen.getByRole('checkbox', { name: /termo de saúde específico deste evento/i }),
    );
  }
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
  });
  await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());
}

async function escolherPix(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
  });
  // C3-0803: a cobrança PIX nasce no CLIQUE do botão, não na escolha do meio.
  // O botão só destrava com o total na tela (item 64 · CKUX-REV).
  await waitFor(() => {
    expect(
      (screen.getByRole('button', { name: /gerar código pix/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /gerar código pix/i }));
  });
}

type Payload = {
  aceites: {
    termos: boolean;
    saude: boolean;
    saudeCustom?: boolean;
    versoesExibidas?: { termos: number; saude: number; saudeCustom?: number };
  };
};

describe('S1217-T4 · RN-439 — a tela declara a versão que exibiu', () => {
  it('o payload carrega `versoesExibidas` com as versões que os modais mostraram', async () => {
    await ateOPagar(eventoCom(5, 2));
    await escolherPix();
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));

    const payload = createInscricaoCharge.mock.calls[0]![0] as Payload;
    expect(payload.aceites.versoesExibidas).toEqual({ termos: 5, saude: 2 });
  });

  it('evento com termo próprio: a versão dele também vai na conferência', async () => {
    await ateOPagar(eventoCom(1, 1, { texto: 'Termo do organizador.', versao: 4 }));
    await escolherPix();
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));

    const payload = createInscricaoCharge.mock.calls[0]![0] as Payload;
    expect(payload.aceites.versoesExibidas).toEqual({ termos: 1, saude: 1, saudeCustom: 4 });
  });

  it('evento SEM termo próprio: `saudeCustom` não é inventado na conferência', async () => {
    await ateOPagar(eventoCom(3, 1));
    await escolherPix();
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));

    const payload = createInscricaoCharge.mock.calls[0]![0] as Payload;
    expect(payload.aceites.versoesExibidas).not.toHaveProperty('saudeCustom');
  });

  it('GUARDA — a versão declarada é o MESMO número que o modal renderizou', async () => {
    // Se a tela declarasse uma versão diferente da que mostrou, a conferência
    // do servidor viraria teatro: ele aprovaria material que ninguém leu.
    const evento = eventoCom(9, 6);
    await act(async () => {
      render(<CheckoutFlow evento={evento} atribuicao={{}} />);
    });
    fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
    });

    // O que a PESSOA leu, nos dois modais da etapa de inscrição.
    fireEvent.click(screen.getByRole('button', { name: /ler os termos da compra/i }));
    expect(screen.getByText(/versão 9 — vigente/i)).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(
      screen.getByRole('button', { name: /ler o termo de responsabilidade de saúde/i }),
    );
    expect(screen.getByText(/versão 6 — vigente/i)).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // O que a TELA declara ao servidor: os mesmos dois números.
    preencherCampos();
    marcarBase();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
    });
    await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());
    await escolherPix();
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));

    const payload = createInscricaoCharge.mock.calls[0]![0] as Payload;
    expect(payload.aceites.versoesExibidas).toEqual({ termos: 9, saude: 6 });
  });
});

describe('S1217-T4 · RN-439 — a recusa por divergência repõe o aceite', () => {
  it('desmarca os aceites, devolve à inscrição, explica em uma frase e busca o material novo', async () => {
    const recarregar = vi.fn();
    createInscricaoCharge.mockRejectedValueOnce(erroVersaoDivergente());
    await ateOPagar(eventoCom(1, 1), recarregar);
    await escolherPix();
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));

    // Voltou para a etapa de inscrição (os campos de dados estão na tela).
    await waitFor(() => expect(screen.getAllByLabelText(/^cpf/i).length).toBeGreaterThan(0));
    // Os dois aceites voltaram a vazio — a prova não pode ser reafirmada sem
    // o gesto novo sobre o material novo.
    for (const cb of screen.getAllByRole('checkbox', { name: /aceito|declaro/i })) {
      expect((cb as HTMLInputElement).checked).toBe(false);
    }
    // Uma frase, o fato e a ação.
    expect(screen.getByRole('alert').textContent ?? '').toMatch(
      /termos deste evento foram atualizados/i,
    );
    // E a tela foi buscar o texto novo — sem isso, reconfirmar mandaria a
    // MESMA versão velha e levaria a MESMA recusa, em laço.
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('a frase não conta o que mudou nem quando foi publicado', async () => {
    createInscricaoCharge.mockRejectedValueOnce(erroVersaoDivergente());
    await ateOPagar(eventoCom(1, 1), vi.fn());
    await escolherPix();
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent ?? '').toMatch(/foram atualizados/i),
    );
    const texto = screen.getByRole('alert').textContent ?? '';
    expect(texto).not.toMatch(/vers[ãa]o \d/i);
    expect(texto).not.toMatch(/\d{2}\/\d{2}/);
  });

  it('GUARDA — outra recusa `failed-precondition` NÃO desmarca aceite nenhum', async () => {
    // `failed-precondition` é o código de meia dúzia de recusas do checkout.
    // Tratar todas como "termo desatualizado" apagaria o aceite de quem levou
    // um "não" por outro motivo — por isso o gate é o motivo TIPADO.
    const recarregar = vi.fn();
    createInscricaoCharge.mockRejectedValueOnce(erroPixAnterior());
    await ateOPagar(eventoCom(1, 1), recarregar);
    await escolherPix();
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));

    expect(recarregar).not.toHaveBeenCalled();
    // Continua na etapa de pagamento, com o erro normal da cobrança.
    await waitFor(() =>
      expect(screen.getByText(/código PIX ativo para este carrinho/i)).toBeTruthy(),
    );
  });
});
