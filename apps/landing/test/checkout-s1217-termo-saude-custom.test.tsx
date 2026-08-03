// =============================================================================
// S1217-T3 · RN-441 · D-ACH-14 — o terceiro aceite, e o payload que para de
// afirmar `true` literal.
//
// DEFEITO VIVO, achado no inventário e fora do escopo pedido: o servidor lança
// `failed-precondition` quando o evento tem termo de saúde próprio ativo e o
// input não traz `aceites.saudeCustom === true`
// (`createInscricaoCharge.ts:1409`). A tela nunca teve esse checkbox e o
// `CheckoutFlow` mandava `{ termos: true, saude: true }` fixo. Todo evento com
// termo custom ativo estava com a compra QUEBRADA, sempre, por construção.
//
// O leitor público já projetava texto e versão do termo desde a CK2 — faltava a
// coleta. Estes casos REPROVAM a versão anterior nas duas frentes: não existia
// terceiro checkbox, e o payload afirmava aceite que ninguém tinha dado.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const TERMO_CUSTOM_TEXTO =
  'Declaro conhecer o percurso de trilha e suas condições de terreno.\n\nAssumo o risco de participação em ambiente natural, conforme orientação da organização.';

function eventoCom(termoSaudeCustom: { texto: string; versao: number } | null): EventoPublico {
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
      versao: 1,
      reembolso: { janelaArrependimentoDias: 7, corteHoras: 48, slaAnaliseDias: 3 },
      transferencia: { habilitada: false, janelaHoras: 72, taxa: 0 },
      trocaIngresso: { habilitada: false, janelaHoras: 48, permiteReembolsoDowngrade: false },
    },
    termoSaudeVersao: 1,
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

async function irParaDados(evento: EventoPublico): Promise<void> {
  await act(async () => {
    render(<CheckoutFlow evento={evento} atribuicao={{}} />);
  });
  fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
  });
}

async function continuar(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
  });
}

const comTermo = (): EventoPublico =>
  eventoCom({ texto: TERMO_CUSTOM_TEXTO, versao: 4 });

describe('S1217-T3 · RN-441 — o terceiro aceite existe quando o evento o exige', () => {
  it('evento COM termo próprio: três aceites, e o terceiro tem modal e versão', async () => {
    await irParaDados(comTermo());
    expect(screen.getAllByRole('checkbox', { name: /aceito|declaro/i }).length).toBe(3);

    fireEvent.click(screen.getByRole('button', { name: /ler o termo de saúde do evento/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/versão 4 — definida pelo organizador/i)).toBeTruthy();
    expect(screen.getByText(/conhecer o percurso de trilha/i)).toBeTruthy();
    expect(screen.getByText(/ambiente natural/i)).toBeTruthy();
  });

  it('evento SEM termo próprio: dois aceites, e nada do terceiro na tela', async () => {
    await irParaDados(eventoCom(null));
    expect(screen.getAllByRole('checkbox', { name: /aceito|declaro/i }).length).toBe(2);
    expect(screen.queryByRole('button', { name: /ler o termo de saúde do evento/i })).toBeNull();
  });

  it('projeção SEM o campo (undefined) é ausência de termo, não exigência muda', async () => {
    // Leitura Postel. `undefined !== null` é `true` em JavaScript: tratar os
    // dois de forma diferente faria o gate exigir um aceite que a tela não
    // renderiza — a compra travaria em silêncio, num evento que não tem termo
    // próprio nenhum. Foi assim que este caso nasceu: a primeira versão do
    // gate derrubou 53 casos da suíte de uma vez.
    const semCampo = eventoCom(null) as unknown as Record<string, unknown>;
    delete semCampo['termoSaudeCustom'];
    await irParaDados(semCampo as unknown as EventoPublico);
    expect(screen.getAllByRole('checkbox', { name: /aceito|declaro/i }).length).toBe(2);

    preencherCampos();
    marcarBase();
    await continuar();
    await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());
  });
});

describe('S1217-T3 · RN-441 — o terceiro aceite gateia o avanço junto com os outros', () => {
  it('os dois base não bastam num evento com termo próprio', async () => {
    await irParaDados(comTermo());
    preencherCampos();
    marcarBase();
    await continuar();

    expect(screen.getAllByLabelText(/^cpf/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('alert').textContent ?? '').toMatch(/confirme os três aceites/i);
    expect(createInscricaoCharge).not.toHaveBeenCalled();
  });

  it('com os três, a compra CONCLUI — e hoje ela falhava sempre', async () => {
    await irParaDados(comTermo());
    preencherCampos();
    marcarBase();
    fireEvent.click(
      screen.getByRole('checkbox', { name: /termo de saúde específico deste evento/i }),
    );
    await continuar();
    await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    });
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));

    const payload = createInscricaoCharge.mock.calls[0]![0] as {
      aceites: { termos: boolean; saude: boolean; saudeCustom?: boolean };
    };
    expect(payload.aceites.saudeCustom).toBe(true);
  });
});

describe('S1217-T3 · RN-441 — o payload reflete o que a pessoa marcou', () => {
  it('evento com termo próprio: os três booleanos sobem como confirmação real', async () => {
    await irParaDados(comTermo());
    preencherCampos();
    marcarBase();
    fireEvent.click(
      screen.getByRole('checkbox', { name: /termo de saúde específico deste evento/i }),
    );
    await continuar();
    await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    });
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));

    const payload = createInscricaoCharge.mock.calls[0]![0] as {
      aceites: { termos: boolean; saude: boolean; saudeCustom?: boolean };
    };
    expect(payload.aceites).toEqual({ termos: true, saude: true, saudeCustom: true });
  });

  it('evento SEM termo próprio: `saudeCustom` não é inventado no payload', async () => {
    await irParaDados(eventoCom(null));
    preencherCampos();
    marcarBase();
    await continuar();
    await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    });
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));

    const payload = createInscricaoCharge.mock.calls[0]![0] as {
      aceites: Record<string, unknown>;
    };
    expect(payload.aceites).toEqual({ termos: true, saude: true });
    expect('saudeCustom' in payload.aceites).toBe(false);
  });

  it('anti-forja: o cliente continua sem canal para versão, instante ou hash', async () => {
    await irParaDados(eventoCom(null));
    preencherCampos();
    marcarBase();
    await continuar();
    await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    });
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));

    const bruto = JSON.stringify(createInscricaoCharge.mock.calls[0]![0]);
    expect(bruto).not.toMatch(/materialHash|aceitoEm|versaoTermos|"versao"/i);
  });
});
