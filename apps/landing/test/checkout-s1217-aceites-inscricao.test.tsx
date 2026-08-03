// =============================================================================
// S1217-T1 · RN-438 · D-ACH-11 — os dois aceites mudam de etapa.
//
// O VETO DO DONO (02/08) é explícito e vale para os dois: termos de uso e
// declaração de saúde saem do PAGAR. Supersede a CKFORM §5.3 de 2026-07-18,
// que os pôs acima do botão de pagar, e a DEC-0729, que os manteve ali.
//
// O destino é o FIM da etapa de dados, não o step 0: a declaração de saúde é
// sobre as pessoas inscritas, e é no step 1 que elas ficam identificadas com
// nome, CPF e nascimento. O step 0 é exploração da oferta — pedir assinatura
// antes de a pessoa ter decidido o que compra inverte a ordem da decisão.
//
// Estes casos REPROVAM a versão anterior: com o bloco de volta ao PAGAR, o
// step 1 não tem checkbox nenhum e o "Continuar" avança sem aceite.
//
// O que NÃO muda, e é o coração da regra: o servidor continua recusando
// `createInscricaoCharge` sem os dois booleanos (flip F-4a), o carimbo continua
// nascendo na transação da compra com versão e hash lidos ali dentro, e o
// cliente continua sem canal para forjar versão ou antedatar aceite.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EventoPublico } from '@/lib/tipos';

const loginAnonimo = vi.fn();
const cotarInscricaoCheckout = vi.fn();
const createInscricaoCharge = vi.fn();
const confirmarPagamentoSandbox = vi.fn();
const getCheckoutPrefill = vi.fn();
const ensureLeela = vi.fn();

vi.mock('@leela/api-client', () => ({
  loginAnonimo: (...a: unknown[]) => loginAnonimo(...a),
  cotarInscricaoCheckout: (...a: unknown[]) => cotarInscricaoCheckout(...a),
  createInscricaoCharge: (...a: unknown[]) => createInscricaoCharge(...a),
  confirmarPagamentoSandbox: (...a: unknown[]) => confirmarPagamentoSandbox(...a),
  expirarPixPendente: vi.fn(),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
}));
vi.mock('@/lib/leelaClient', () => ({ ensureLeela: (...a: unknown[]) => ensureLeela(...a) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';

const evento = {
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
  taxaRepassada: false,
} as unknown as EventoPublico;

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

function preencherDados(): void {
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

function marcarAceites(): void {
  fireEvent.click(
    screen.getByRole('checkbox', { name: /termos da compra e a política de cancelamento/i }),
  );
  fireEvent.click(screen.getByRole('checkbox', { name: /boas condições de saúde/i }));
}

async function irParaDados(): Promise<void> {
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

describe('S1217-T1 · RN-438 — o bloco de aceites vive na etapa de inscrição', () => {
  it('a etapa de dados apresenta os DOIS aceites, com os modais de leitura', async () => {
    await irParaDados();
    expect(
      screen.getByRole('checkbox', { name: /termos da compra e a política de cancelamento/i }),
    ).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /boas condições de saúde/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /ler os termos da compra/i })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /ler o termo de responsabilidade de saúde/i }),
    ).toBeTruthy();
  });

  it('o step 0 NÃO os apresenta — assinar antes de decidir o que se compra inverte a ordem', async () => {
    await act(async () => {
      render(<CheckoutFlow evento={evento} atribuicao={{}} />);
    });
    expect(
      screen.queryByRole('checkbox', { name: /termos da compra e a política de cancelamento/i }),
    ).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /boas condições de saúde/i })).toBeNull();
  });
});

describe('S1217-T1 · RN-438 — o aceite gateia o "Continuar" da etapa de dados', () => {
  it('formulário completo e aceites em branco: não avança, e a tela diz por quê', async () => {
    await irParaDados();
    preencherDados();
    await continuar();

    // Continua na etapa de dados (o CPF é dela; o "Seu pedido" é do PAGAR).
    expect(screen.getAllByLabelText(/^cpf/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Seu pedido$/)).toBeNull();
    expect(screen.getByRole('alert').textContent ?? '').toMatch(/confirme os dois aceites/i);
    // E nenhuma cobrança nasceu no caminho.
    expect(createInscricaoCharge).not.toHaveBeenCalled();
  });

  it('um aceite só não basta — os dois são obrigatórios juntos', async () => {
    await irParaDados();
    preencherDados();
    fireEvent.click(
      screen.getByRole('checkbox', { name: /termos da compra e a política de cancelamento/i }),
    );
    await continuar();
    expect(screen.getAllByLabelText(/^cpf/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('alert').textContent ?? '').toMatch(/confirme os dois aceites/i);
  });

  it('com os dois marcados, o "Continuar" leva ao pagamento', async () => {
    await irParaDados();
    preencherDados();
    marcarAceites();
    await continuar();
    await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());
  });

  it('marcar o aceite apaga o aviso — a tela não fica acusando quem já corrigiu', async () => {
    await irParaDados();
    preencherDados();
    await continuar();
    expect(screen.queryByRole('alert')).toBeTruthy();
    marcarAceites();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('S1217-T1 · RN-438 — a etapa de pagamento não os exibe mais', () => {
  it('chegando ao PAGAR, não há checkbox de aceite na tela', async () => {
    await irParaDados();
    preencherDados();
    marcarAceites();
    await continuar();
    await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());

    expect(
      screen.queryByRole('checkbox', { name: /termos da compra e a política de cancelamento/i }),
    ).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /boas condições de saúde/i })).toBeNull();
  });
});

describe('S1217-T1 · RN-438 — voltar não destrava a prova', () => {
  it('com a cobrança criada, os aceites voltam travados na etapa de inscrição', async () => {
    await irParaDados();
    preencherDados();
    marcarAceites();
    await continuar();
    await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());
    // A cobrança PIX nasce da escolha do meio (auto-geração A-3).
    await waitFor(() => expect(createInscricaoCharge).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^voltar$/i }));
    });

    const termos = screen.getByRole('checkbox', {
      name: /termos da compra e a política de cancelamento/i,
    }) as HTMLInputElement;
    const saude = screen.getByRole('checkbox', {
      name: /boas condições de saúde/i,
    }) as HTMLInputElement;
    expect(termos.checked).toBe(true);
    expect(saude.checked).toBe(true);
    // `disabled` é o guarda real: o navegador não entrega clique nem foco de
    // teclado a um controle desabilitado. Um `fireEvent.click` sintético
    // atravessaria essa barreira no jsdom e provaria o contrário do que
    // acontece na tela — por isso a asserção é sobre o atributo, não sobre um
    // gesto que só existe no teste.
    expect(termos.disabled).toBe(true);
    expect(saude.disabled).toBe(true);
    expect(termos.getAttribute('readonly')).toBeNull();
  });
});
