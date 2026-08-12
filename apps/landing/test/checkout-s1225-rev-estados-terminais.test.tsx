// =============================================================================
// REVIEW ANTAGONISTA da S1225 (REV-S1225 · trace leela-pixreal-diag-20260804).
//
// Contexto fresco: estes testes não confiam no que a lane BUILD afirmou. Eles
// atacam o critério que a própria S1225 escreveu e que a implementação cumpre
// só pela metade:
//
//   "Cartão recusado → recusa honesta com caminho de tentar de novo; NUNCA
//    'Estamos confirmando' sobre uma recusa JÁ CONHECIDA." (02-spec, RN-470)
//
// O `status` do pedido tem QUATRO valores (`packages/core/src/pedidos/pedido.ts`)
// e três deles são TERMINAIS: `pago`, `falhou`, `cancelado` — a matriz
// `TRANSICOES_STATUS_PEDIDO` não deixa nenhum deles voltar a `pendente`. A T3
// trata "não é `pago`" como "está em confirmação", e por isso um pedido MORTO
// (recusado pelo gateway, ou cancelado por PIX expirado/estorno) faz a tela
// dizer "Estamos confirmando o seu pedido" e mandar o comprador esperar um
// e-mail com um ingresso que nunca vai existir.
//
// É a mesma classe de defeito que a lane veio matar: copy que afirma o que a
// plataforma sabe ser falso.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CreateInscricaoChargeResult } from '@leela/api-client';
import type { EventoPublico } from '@/lib/tipos';

const loginAnonimo = vi.fn();
const cotarInscricaoCheckout = vi.fn();
const createInscricaoCharge = vi.fn();
const confirmarPagamentoSandbox = vi.fn();
const expirarPixPendente = vi.fn();
const getCheckoutPrefill = vi.fn();
const getPedido = vi.fn();
const getLeelaDb = vi.fn();
const ensureLeela = vi.fn();

vi.mock('@leela/api-client', () => ({
  loginAnonimo: (...a: unknown[]) => loginAnonimo(...a),
  cotarInscricaoCheckout: (...a: unknown[]) => cotarInscricaoCheckout(...a),
  // CKPIX-FLOW · RN-560 — a assinatura do pedido nasceu nesta rodada. Esta
  // suíte não a exercita, então o stub é um no-op que devolve o cancelador:
  // sem ele o efeito quebra a árvore por uma função que o mock não conhece.
  observarPedido: () => () => undefined,
  createInscricaoCharge: (...a: unknown[]) => createInscricaoCharge(...a),
  confirmarPagamentoSandbox: (...a: unknown[]) => confirmarPagamentoSandbox(...a),
  expirarPixPendente: (...a: unknown[]) => expirarPixPendente(...a),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
  getPedido: (...a: unknown[]) => getPedido(...a),
  getLeelaDb: (...a: unknown[]) => getLeelaDb(...a),
}));
vi.mock('@/lib/leelaClient', () => ({ ensureLeela: (...a: unknown[]) => ensureLeela(...a) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';
import { StepConfirmacao } from '../app/(public)/[eventSlug]/inscricao/checkout/StepConfirmacao';
import { ToastProvider } from '../app/_ds/ds';

const PEDIDO_ID = 'ped-anon-ana-4f21c9-chk-a1b2c3d4';
const EMAIL = 'ana@example.com';

const evento = {
  slug: 'experiencia-rev-s1225',
  nome: 'Experiência REV-S1225',
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
  seo: { titulo: 'Experiência REV-S1225', descricao: 'desc' },
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
  jurosParcelamento: 0,
  opcoesParcelamento: [{ parcelas: 1, valorParcela: 5000, valorTotal: 5000 }],
  parcelamento: { parcelas: 1, valorParcela: 5000, valorTotal: 5000 },
  totalCobrado: 5000,
  forma: 'pix',
  totaisPorMeio: { pix: 5000, cartao_credito: 5000 },
};

const VALORES = {
  valorBase: 5000,
  desconto: 0,
  valorFinal: 5000,
  taxaServico: 0,
  jurosParcelamento: 0,
  totalCobrado: 5000,
  parcelas: 1,
  valorParcela: 5000,
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  loginAnonimo.mockResolvedValue({ uid: 'anon-ana-4f21c9' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
  expirarPixPendente.mockResolvedValue({ expirado: true, jaFinal: false });
  cotarInscricaoCheckout.mockResolvedValue(COTACAO);
  getLeelaDb.mockReturnValue({ __db: true });
  getPedido.mockResolvedValue({ id: PEDIDO_ID, status: 'pendente' });
  createInscricaoCharge.mockResolvedValue({
    pedidoId: PEDIDO_ID,
    pagamentoId: 'pag-rev',
    inscritoIds: [`${PEDIDO_ID}-i1`],
    qrCode: 'PIX-PAYLOAD-REV',
    chargeId: 'ch-rev',
    pixExpiraEmMillis: Date.now() + 1_800_000,
    statusPedido: 'pendente',
    valores: VALORES,
    gatewayReal: true,
  });
});

afterEach(cleanup);

function preencherDados(): void {
  fireEvent.change(screen.getAllByLabelText(/nome completo/i)[0]!, {
    target: { value: 'Ana Corredora' },
  });
  fireEvent.change(screen.getAllByLabelText(/^e-mail/i)[0]!, { target: { value: EMAIL } });
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
  fireEvent.click(
    screen.getByRole('checkbox', { name: /termos da compra e a política de cancelamento/i }),
  );
  fireEvent.click(screen.getByRole('checkbox', { name: /boas condições de saúde/i }));
}

async function passarDebounce(ms = 400): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

async function gerarPixReal(): Promise<void> {
  await act(async () => {
    render(<CheckoutFlow evento={evento} atribuicao={{}} />);
  });
  fireEvent.click(screen.getByRole('radio', { name: /^5k/i }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
  });
  preencherDados();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
  });
  await waitFor(() => expect(screen.getByText(/^Seu pedido$/)).toBeTruthy());
  await passarDebounce();
  await act(async () => {
    fireEvent.click(screen.getByRole('radio', { name: /^pix/i }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /gerar código pix/i }));
  });
  await waitFor(() => expect(screen.getByText('PIX-PAYLOAD-REV')).toBeTruthy());
}

const btnAtualizar = (): HTMLElement =>
  screen.getByRole('button', { name: /atualizar estado do pedido/i });

const ESPERA = { timeout: 5_000 } as const;

// ─────────────────────────────────────────────────────────────────────────
// O DEFEITO: estado TERMINAL vira "estamos confirmando"
// ─────────────────────────────────────────────────────────────────────────
describe('REV-S1225 · o gesto sobre um pedido MORTO não pode dizer "estamos confirmando"', () => {
  it('pedido `falhou`: a tela NÃO afirma confirmação em curso nem promete e-mail de ingresso', async () => {
    await gerarPixReal();
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(1), ESPERA);

    // O gateway recusou o PIX e o webhook materializou `falhou` — estado
    // TERMINAL (`TRANSICOES_STATUS_PEDIDO.falhou === []`). Não há confirmação
    // alguma em curso, e nenhum ingresso vai por e-mail nenhum.
    getPedido.mockResolvedValue({ id: PEDIDO_ID, status: 'falhou' });
    await act(async () => {
      fireEvent.click(btnAtualizar());
    });
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(2), ESPERA);

    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
    expect(screen.queryByText(/acesso do seu ingresso vai por lá/i)).toBeNull();
  });

  it('pedido `cancelado`: mesma regra — resposta conhecida não vira espera', async () => {
    await gerarPixReal();
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(1), ESPERA);

    // `cancelado` chega por PIX expirado no servidor (`expirarPixPendente`) e
    // por cancelamento do organizador — o comprador pode ter a tela aberta.
    getPedido.mockResolvedValue({ id: PEDIDO_ID, status: 'cancelado' });
    await act(async () => {
      fireEvent.click(btnAtualizar());
    });
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(2), ESPERA);

    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
  });

  it('pedido `pendente` segue mostrando a mensagem do dono — a correção não come o caso bom', async () => {
    await gerarPixReal();
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(1), ESPERA);
    getPedido.mockResolvedValue({ id: PEDIDO_ID, status: 'pendente' });
    await act(async () => {
      fireEvent.click(btnAtualizar());
    });
    await waitFor(
      () => expect(screen.getByText('Estamos confirmando o seu pedido')).toBeTruthy(),
      ESPERA,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// O mesmo defeito no CONTRATO do componente de confirmação
// ─────────────────────────────────────────────────────────────────────────
describe('REV-S1225 · StepConfirmacao não confunde "não pago" com "em confirmação"', () => {
  function charge(): CreateInscricaoChargeResult {
    return {
      pedidoId: PEDIDO_ID,
      pagamentoId: 'pag-rev',
      inscritoIds: [`${PEDIDO_ID}-i1`],
      chargeId: 'ch-rev',
      qrCode: 'PIX-PAYLOAD-REV',
      pixExpiraEmMillis: Date.now() + 1_800_000,
      statusPedido: 'pendente',
      valores: VALORES,
    } as unknown as CreateInscricaoChargeResult;
  }

  function renderConfirmacao(props: Record<string, unknown>): void {
    render(
      <ToastProvider>
        <StepConfirmacao
          charge={charge()}
          confirmacao={null}
          eventoNome="Experiência REV-S1225"
          slug={evento.slug}
          responsavelEmail={EMAIL}
          linhas={[{ titulo: 'Ana', modalidade: '5k', kitLabel: 'Sem kit' }]}
          forma="pix"
          taxaRepassada={false}
          {...props}
        />
      </ToastProvider>,
    );
  }

  it('`statusPedidoConsultado` terminal (`falhou`) não vira "Estamos confirmando"', () => {
    renderConfirmacao({ statusPedidoConsultado: 'falhou' });
    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
  });

  it('`statusPedidoConsultado` terminal (`cancelado`) não vira "Estamos confirmando"', () => {
    renderConfirmacao({ statusPedidoConsultado: 'cancelado' });
    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
  });

  it('cobrança EXPIRADA não é pedido em confirmação — a tela não manda esperar e-mail', () => {
    // D-6/RN-157: a tela de confirmação também é a "tela do pedido pendente" e
    // renderiza a cobrança expirada com o caminho de gerar outra. Dizer
    // "Estamos confirmando o seu pedido" por cima de uma cobrança morta é a
    // mesma mentira, com outro gatilho.
    renderConfirmacao({ pixExpirado: true });
    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
  });

  it('pendente de verdade continua com a mensagem do dono', () => {
    renderConfirmacao({ statusPedidoConsultado: 'pendente' });
    expect(screen.getByText('Estamos confirmando o seu pedido')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// O gesto que FALHA precisa responder ao clique
// ─────────────────────────────────────────────────────────────────────────
describe('REV-S1225 · consulta que falha responde ao comprador, sem afirmar nada', () => {
  it('gesto que falha diz que não conseguiu ler, mantém o QR e não afirma pagamento', async () => {
    await gerarPixReal();
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(1), ESPERA);

    // Falhas REAIS deste caminho, todas medidas nesta review: uid anônimo
    // rotacionado entre a compra e a volta (permission-denied), rede caída, e
    // `parsePedido` recusando um doc que as Rules DEIXAM ler (prova em
    // `functions/src/__tests__/pedidoProprioRulesAntagonista.integration.test.ts`).
    // Em todas, o comprador clicava e a tela não dizia nada.
    getPedido.mockRejectedValue(
      Object.assign(new Error('Missing or insufficient permissions.'), {
        code: 'permission-denied',
      }),
    );
    await act(async () => {
      fireEvent.click(btnAtualizar());
    });
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(2), ESPERA);

    await waitFor(
      () => expect(screen.getByText(/não conseguimos ler o estado do seu pedido/i)).toBeTruthy(),
      ESPERA,
    );
    // O que ele NÃO pode dizer: que está confirmando, ou que o pedido morreu.
    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
    expect(screen.queryByText(/não foi concluído/i)).toBeNull();
    // E nada caiu da tela: o QR e o botão seguem à mão.
    expect(screen.getByText('PIX-PAYLOAD-REV')).toBeTruthy();
    expect(btnAtualizar()).toBeTruthy();
  });

  it('o aviso de falha some quando a consulta seguinte funciona', async () => {
    await gerarPixReal();
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(1), ESPERA);
    getPedido.mockRejectedValue(new Error('offline'));
    await act(async () => {
      fireEvent.click(btnAtualizar());
    });
    await waitFor(
      () => expect(screen.getByText(/não conseguimos ler o estado do seu pedido/i)).toBeTruthy(),
      ESPERA,
    );

    getPedido.mockResolvedValue({ id: PEDIDO_ID, status: 'pendente' });
    await act(async () => {
      fireEvent.click(btnAtualizar());
    });
    await waitFor(
      () => expect(screen.getByText('Estamos confirmando o seu pedido')).toBeTruthy(),
      ESPERA,
    );
    expect(screen.queryByText(/não conseguimos ler o estado do seu pedido/i)).toBeNull();
  });

  it('falha no CARREGAMENTO segue silenciosa — ninguém pediu aquela leitura', async () => {
    getPedido.mockRejectedValue(new Error('offline'));
    await gerarPixReal();
    await waitFor(() => expect(getPedido).toHaveBeenCalledTimes(1), ESPERA);
    expect(screen.queryByText(/não conseguimos ler o estado do seu pedido/i)).toBeNull();
    expect(screen.queryByText(/estamos confirmando/i)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Vetor 12 do construtor: a ausência do CTA é varrida por LINK apenas
// ─────────────────────────────────────────────────────────────────────────
describe('REV-S1225 · a ausência do CTA vale para BOTÃO, não só para link', () => {
  it('nenhum controle (link OU botão) leva a "meus pedidos" / "meus ingressos"', async () => {
    await gerarPixReal();
    // `queryAllByRole('link')` não enxerga `<button onClick={router.push}>`.
    // A varredura de destino tem de cobrir os dois papéis, ou o CTA gated
    // entra pela porta dos fundos na primeira pressa.
    const controles = [...screen.queryAllByRole('link'), ...screen.queryAllByRole('button')];
    for (const c of controles) {
      const alvo = `${c.getAttribute('href') ?? ''} ${c.textContent ?? ''}`.toLowerCase();
      expect(alvo.includes('/pedidos')).toBe(false);
      expect(alvo.includes('/meus-')).toBe(false);
      expect(/meus pedidos|meus ingressos/.test(alvo)).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Vetor 8 do construtor: o furo declarado na varredura de copy, medido
// ─────────────────────────────────────────────────────────────────────────
describe('REV-S1225 · o strip de comentários da varredura não esconde copy', () => {
  // O construtor declarou: "ela remove comentários com regex (`/* */` e `//`)
  // antes de varrer. Um `//` dentro de string (URL) truncaria a linha e
  // esconderia copy do teste." A afirmação é testável — e está errada para o
  // caso do `//`, certa para o caso do bloco. Fica medido, não opinado.
  function semComentarios(fonte: string): string {
    return fonte.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  }

  it('URL com `//` no MEIO da linha não engole a copy — o furo declarado não existe', () => {
    const linha = '<p>Veja em https://leela.app: a confirmação chega sozinha.</p>';
    // O strip de `//` exige início de linha (`^\s*`), então a copy sobrevive
    // e a varredura continua enxergando a promessa banida.
    expect(/chega sozinh/i.test(semComentarios(linha))).toBe(true);
  });

  it('⚠ o furo REAL é o bloco: `/*` dentro de string apaga a copy até o próximo `*/`', () => {
    const fonte = 'const re = "/*";\n<p>a confirmação chega sozinha</p>\nconst fim = "*/";';
    // Aqui a varredura fica CEGA. Não há ocorrência assim no checkout hoje
    // (esta asserção é o canário), mas quem escrever uma precisa saber que
    // desligou o gate sem querer.
    expect(/chega sozinh/i.test(semComentarios(fonte))).toBe(false);
  });
});
