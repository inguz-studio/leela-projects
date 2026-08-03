// =============================================================================
// PROVA da DEC-0729 no passo PAGAR (trace leela-build-2d6ee98d · lane
// CHECKOUT-UX). Cada teste aqui existe porque o dono encontrou o defeito
// comprando de verdade em produção:
//
//   achado 3  — os aceites apareciam antes do pagamento. Resumo e pagamento
//               eram DUAS telas internas dentro da mesma macro-etapa; hoje são
//               uma só, e o aceite fica colado no botão de pagar.
//   achado 17 — "quando clico em cartao de crédito já é para aparecer
//               imediatamente a opção de inputar o cartao, nao clicar
//               novamente" (D-0729-6).
//   achado 12 — resumo do pedido visível na hora de pagar, com edição de
//               kit/tamanho sem recomeçar a jornada (D-0729-3).
//   achado 5  — seletor de parcelas invisível contra o fundo.
//   achado 10 — a troca de etapa deixava a página na rolagem anterior.
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
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
}));

vi.mock('@/lib/leelaClient', () => ({
  ensureLeela: (...a: unknown[]) => ensureLeela(...a),
}));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';

const evento = {
  slug: 'corrida-teste',
  nome: 'Corrida Teste',
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
  seo: { titulo: 'Corrida Teste', descricao: 'desc' },
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
  itens: [{ modalidade: '5k', preco: 5000, loteNome: 'Lote 1', kitNome: null, kitPreco: 0 }],
  valorBase: 5000,
  desconto: 0,
  valorFinal: 5000,
  cupomAplicado: null,
  taxaServico: 0,
  totalAVista: 5000,
  opcoesParcelamento: [
    { parcelas: 1, valorParcela: 5000, valorTotal: 5000 },
    { parcelas: 3, valorParcela: 1667, valorTotal: 5000 },
  ],
  parcelamento: { parcelas: 1, valorParcela: 5000, valorTotal: 5000 },
  totalCobrado: 5000,
  forma: 'pix',
  totaisPorMeio: { pix: 5000, cartao_credito: 5000 },
};

beforeEach(() => {
  vi.clearAllMocks();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  cotarInscricaoCheckout.mockResolvedValue(COTACAO);
});

afterEach(cleanup);

function preencherDados(): void {
  fireEvent.change(screen.getAllByLabelText(/nome completo/i)[0]!, {
    target: { value: 'Ana Corredora' },
  });
  fireEvent.change(screen.getAllByLabelText(/^e-mail/i)[0]!, {
    target: { value: 'ana@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '11988887777' } });
  fireEvent.change(screen.getAllByLabelText(/^cpf/i)[0]!, {
    target: { value: '529.982.247-25' },
  });
  fireEvent.change(screen.getAllByLabelText(/data de nascimento/i)[0]!, {
    target: { value: '20/05/1990' },
  });
  fireEvent.change(screen.getByLabelText(/^cep/i), { target: { value: '01310100' } });
  fireEvent.change(screen.getByLabelText(/logradouro/i), { target: { value: 'Av. Paulista' } });
  fireEvent.change(screen.getByLabelText(/^número/i), { target: { value: '1000' } });
  fireEvent.change(screen.getByLabelText(/cidade/i), { target: { value: 'São Paulo' } });
  fireEvent.change(screen.getByLabelText(/^uf/i), { target: { value: 'SP' } });
  // S1217-T1 · RN-438: os aceites passaram a fechar a etapa de
  // INSCRIÇÃO e gateiam o "Continuar". Preencher os campos deixou de
  // ser suficiente para avançar — este helper leva o fluxo até o PAGAR,
  // então ele marca os dois. As asserções dos casos seguem intactas.
  fireEvent.click(
    screen.getByRole('checkbox', { name: /termos da compra e a política de cancelamento/i }),
  );
  fireEvent.click(screen.getByRole('checkbox', { name: /boas condições de saúde/i }));
}

/** Leva o fluxo até o passo PAGAR (o único que existe depois dos dados). */
async function irAtePagar(): Promise<void> {
  await act(async () => {
    render(<CheckoutFlow evento={evento} atribuicao={{}} />);
  });
  fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
  });
  preencherDados();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
  });
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /gerar código pix/i })).toBeTruthy();
  });
  // T-CKUX-1: a cotação passou a ser coalescida com debounce curto, então ela
  // aterrissa DEPOIS do primeiro paint do PAGAR. Esperar por ela aqui é o que
  // deixa as asserções de contagem determinísticas.
  await waitFor(() => {
    expect(cotarInscricaoCheckout).toHaveBeenCalled();
  });
  await waitFor(() => {
    expect(screen.getByText(/subtotal/i)).toBeTruthy();
  });
}

// S1217-T1 · RN-438 supersede a parte "aceites" deste achado: eles saíram do
// PAGAR e passaram a fechar a etapa de inscrição. O que a DEC-0729 conquistou e
// continua de pé é a UNIFICAÇÃO de resumo e pagamento numa tela só — o clique
// intermediário que o dono teve de dar não voltou.
describe('DEC-0729 · achado 3 — PAGAR é UMA tela: resumo e meio de pagamento juntos', () => {
  it('depois dos dados não existe mais "Ir para pagamento" — resumo e meio na mesma tela', async () => {
    await irAtePagar();

    // O clique intermediário que o dono precisava dar deixou de existir.
    expect(screen.queryByRole('button', { name: /ir para pagamento/i })).toBeNull();

    // Resumo do pedido e escolha do meio coexistem.
    expect(screen.getByText(/seu pedido/i)).toBeTruthy();
    expect(screen.getByRole('radio', { name: /pix/i })).toBeTruthy();
    // E os aceites NÃO estão mais aqui (RN-438).
    expect(screen.queryAllByRole('checkbox').length).toBe(0);
  });

  it('a regra do dinheiro NÃO afrouxou: sem os 2 aceites não se chega ao pagamento', async () => {
    // Sem marcar os aceites, o "Continuar" da etapa de dados não avança — e a
    // cobrança, que só nasce depois, nunca é pedida.
    await act(async () => {
      render(<CheckoutFlow evento={evento} atribuicao={{}} />);
    });
    fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    });
    // Preenche os campos SEM tocar nos aceites.
    fireEvent.change(screen.getAllByLabelText(/nome completo/i)[0]!, {
      target: { value: 'Ana Corredora' },
    });
    fireEvent.change(screen.getAllByLabelText(/^e-mail/i)[0]!, {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '11988887777' } });
    fireEvent.change(screen.getAllByLabelText(/^cpf/i)[0]!, {
      target: { value: '529.982.247-25' },
    });
    fireEvent.change(screen.getAllByLabelText(/data de nascimento/i)[0]!, {
      target: { value: '20/05/1990' },
    });
    fireEvent.change(screen.getByLabelText(/^cep/i), { target: { value: '01310100' } });
    fireEvent.change(screen.getByLabelText(/logradouro/i), { target: { value: 'Av. Paulista' } });
    fireEvent.change(screen.getByLabelText(/^número/i), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/cidade/i), { target: { value: 'São Paulo' } });
    fireEvent.change(screen.getByLabelText(/^uf/i), { target: { value: 'SP' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    });

    expect(screen.queryByText(/seu pedido/i)).toBeNull();
    expect(createInscricaoCharge).not.toHaveBeenCalled();
  });
});

describe('DEC-0729 · achado 17 (D-0729-6) — cartão abre no 1º clique', () => {
  it('clicar em "Cartão de crédito" revela os campos do cartão sem nenhuma navegação', async () => {
    await irAtePagar();

    // Antes do clique não há campo de cartão em lugar nenhum da tela.
    expect(screen.queryByLabelText(/número do cartão/i)).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });

    // UM clique — e os campos estão lá, na mesma tela.
    expect(screen.getByLabelText(/nome no cartão/i)).toBeTruthy();
    expect(screen.getByLabelText(/número do cartão/i)).toBeTruthy();
    expect(screen.getByLabelText(/validade/i)).toBeTruthy();
    expect(screen.getByLabelText(/cvv/i)).toBeTruthy();
  });

  it('o painel revelado é o do DS: o radio do cartão anuncia aria-expanded', async () => {
    await irAtePagar();
    const cartao = screen.getByRole('radio', { name: /cartão de crédito/i });
    expect(cartao.getAttribute('aria-expanded')).toBe('false');
    await act(async () => {
      fireEvent.click(cartao);
    });
    expect(
      screen.getByRole('radio', { name: /cartão de crédito/i }).getAttribute('aria-expanded'),
    ).toBe('true');
  });
});

describe('DEC-0729 · achado 5 — seletor de parcelas com contorno visível', () => {
  it('as parcelas usam a variante com borda (border-input), não a flat de borda transparente', async () => {
    await irAtePagar();
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
    });
    const parcelas = screen.getByRole('combobox');
    const classe = parcelas.getAttribute('class') ?? '';
    // `--input-border-flat` é `transparent` no tema Brasa: a variante flat
    // deixava o controle sem contorno nenhum sobre a página.
    expect(classe).toContain('border-input');
    expect(classe).not.toContain('--input-border-flat');
  });
});

describe('DEC-0729 · achado 12 (D-0729-3) — resumo editável sem recomeçar', () => {
  it('"Alterar" volta à escolha do kit com os dados já preenchidos intactos', async () => {
    await irAtePagar();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /alterar modalidade, kit ou tamanho/i }));
    });

    // Voltou ao passo da escolha (a modalidade segue marcada).
    expect((screen.getByRole('radio', { name: /5k/i }) as HTMLInputElement).checked).toBe(true);

    // E nada foi recomeçado: seguir em frente reencontra os dados digitados.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    });
    expect((screen.getAllByLabelText(/nome completo/i)[0] as HTMLInputElement).value).toBe(
      'Ana Corredora',
    );
    expect((screen.getByLabelText(/^número/i) as HTMLInputElement).value).toBe('1000');
  });
});

describe('DEC-0729 · T-CKUX-1 — coalescing da cotação (achado 2)', () => {
  it('chegar ao PAGAR pede UMA cotação, não duas ou três', async () => {
    await irAtePagar();
    expect(cotarInscricaoCheckout).toHaveBeenCalledTimes(1);
  });

  it('editar um campo que não move preço NÃO recota', async () => {
    await irAtePagar();
    const antes = cotarInscricaoCheckout.mock.calls.length;

    // Volta aos dados e digita: nome não muda preço nenhum. Antes do fix o
    // efeito dependia de `cotarCom`, cuja identidade muda a cada tecla.
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /voltar/i }).at(-1)!);
    });
    await act(async () => {
      fireEvent.change(screen.getAllByLabelText(/nome completo/i)[0]!, {
        target: { value: 'Ana Corredora da Silva' },
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /gerar código pix/i })).toBeTruthy();
    });
    expect(cotarInscricaoCheckout).toHaveBeenCalledTimes(antes);
  });

  it('trocar para cartão e voltar para PIX dentro da janela não gera duas cotações', async () => {
    await irAtePagar();
    const antes = cotarInscricaoCheckout.mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
      fireEvent.click(screen.getByRole('radio', { name: /pix/i }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    // A assinatura voltou a ser a MESMA já cotada — nenhuma chamada nova, e a
    // tela não pode ficar presa em "Calculando total".
    expect(cotarInscricaoCheckout).toHaveBeenCalledTimes(antes);
    expect(screen.queryByText(/calculando o total/i)).toBeNull();
  });

  it('aplicar cupom cota UMA vez (o efeito não repete a chamada do botão)', async () => {
    await irAtePagar();
    const antes = cotarInscricaoCheckout.mock.calls.length;
    fireEvent.change(screen.getAllByLabelText(/cupom/i)[0]!, { target: { value: 'HEROI10' } });
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /aplicar/i })[0]!);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    expect(cotarInscricaoCheckout).toHaveBeenCalledTimes(antes + 1);
  });
});
