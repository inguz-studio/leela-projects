// =============================================================================
// PROVA do S1209-T3 (trace leela-build-2d6ee98d · RN-154 · RN-173 · RN-174).
//
// Duas coisas sob prova, e a segunda é a cara:
//
//   1) GÊNERO POR INSCRITO — campo por atleta com o enum GENEROS_INSCRITO do
//      core (importado, nunca redeclarado), incluindo a opção de não declarar.
//      Quem NÃO escolhe nada não manda nada; quem escolhe "prefiro não
//      informar" está respondendo, e essa resposta sobe como 'nao_informado'.
//
//   2) PREFILL SEM ORÁCULO — a superfície onde a RN-174 fecha o vazamento F1.
//      O contrato do leitor não pode ser afrouxado pela tela:
//        - a chamada NÃO leva parâmetro nenhum (não existe canal para pedir
//          dados de um CPF); digitar CPF nunca dispara consulta;
//        - `prefill: null` — que o servidor devolve igual para "sem ficha",
//          "ficha de terceiro" e "sessão anônima" — renderiza EXATAMENTE o
//          mesmo formulário vazio, sem mensagem que denuncie o estado;
//        - falha da chamada também é invisível;
//        - prefill que chega NUNCA sobrescreve o que a pessoa já digitou.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GENEROS_INSCRITO } from '@leela/core';
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
  // CKPIX-FLOW · RN-560 — a assinatura do pedido nasceu nesta rodada. Esta
  // suíte não a exercita, então o stub é um no-op que devolve o cancelador:
  // sem ele o efeito quebra a árvore por uma função que o mock não conhece.
  observarPedido: () => () => undefined,
  // CKPIX-FLOW · a assinatura do pedido pede o handle de banco em toda
  // cobrança, e não só no PIX como a leitura da S1225-T3 pedia.
  getLeelaDb: () => ({ __db: true }),
  getPedido: () => Promise.resolve(null),
  createInscricaoCharge: (...a: unknown[]) => createInscricaoCharge(...a),
  confirmarPagamentoSandbox: (...a: unknown[]) => confirmarPagamentoSandbox(...a),
  getCheckoutPrefill: (...a: unknown[]) => getCheckoutPrefill(...a),
}));

vi.mock('@/lib/leelaClient', () => ({
  ensureLeela: (...a: unknown[]) => ensureLeela(...a),
}));

import { CheckoutFlow } from '../app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow';
import { StepDados } from '../app/(public)/[eventSlug]/inscricao/checkout/StepDados';
import { inscritoVazio } from '../app/(public)/[eventSlug]/inscricao/checkout/tipos';

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

const noop = (): void => {};

beforeEach(() => {
  vi.clearAllMocks();
  loginAnonimo.mockResolvedValue({ uid: 'anon' });
  ensureLeela.mockReturnValue(undefined);
  getCheckoutPrefill.mockResolvedValue({ prefill: null });
});

afterEach(cleanup);

// ---------------------------------------------------------------------------
// 1) Campo de gênero
// ---------------------------------------------------------------------------

describe('S1209-T3 · RN-154 — gênero POR INSCRITO', () => {
  function renderDados(inscritos = [inscritoVazio(), inscritoVazio()]): void {
    render(
      <StepDados
        responsavelNome="Ana"
        responsavelEmail="ana@example.com"
        responsavelTelefone=""
        onResponsavel={noop}
        euCorro
        onEuCorro={noop}
        inscritos={inscritos}
        onInscrito={noop}
        endereco={{
          cep: '',
          logradouro: '',
          bairro: '',
          cidade: '',
          uf: '',
          numero: '',
          complemento: '',
        }}
        onEndereco={noop}
        errosResponsavel={{}}
        errosInscritos={[]}
        errosEndereco={{}}
      />,
    );
  }

  it('existe UM campo de gênero por atleta (não um por pedido)', () => {
    renderDados();
    expect(screen.getAllByLabelText(/gênero/i)).toHaveLength(2);
  });

  it('as opções são exatamente o enum GENEROS_INSCRITO do core, mais o vazio', () => {
    renderDados([inscritoVazio()]);
    const select = screen.getByLabelText(/gênero/i) as HTMLSelectElement;
    const valores = Array.from(select.options).map((o) => o.value);
    expect(valores).toEqual(['', ...GENEROS_INSCRITO]);
  });

  it('oferece a opção de NÃO declarar (valor nao_informado do enum)', () => {
    renderDados([inscritoVazio()]);
    const select = screen.getByLabelText(/gênero/i) as HTMLSelectElement;
    const naoInformado = Array.from(select.options).find((o) => o.value === 'nao_informado');
    expect(naoInformado).toBeTruthy();
    expect(naoInformado?.textContent).toMatch(/não informar/i);
  });

  it('a escolha do atleta emite o valor canônico do enum', () => {
    const onInscrito = vi.fn();
    render(
      <StepDados
        responsavelNome="Ana"
        responsavelEmail="ana@example.com"
        responsavelTelefone=""
        onResponsavel={noop}
        euCorro
        onEuCorro={noop}
        inscritos={[inscritoVazio()]}
        onInscrito={onInscrito}
        endereco={{
          cep: '',
          logradouro: '',
          bairro: '',
          cidade: '',
          uf: '',
          numero: '',
          complemento: '',
        }}
        onEndereco={noop}
        errosResponsavel={{}}
        errosInscritos={[]}
        errosEndereco={{}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/gênero/i), { target: { value: 'nao_informado' } });
    expect(onInscrito).toHaveBeenCalledWith(0, { genero: 'nao_informado' });
  });

  it('inscrito em branco nasce SEM gênero — a tela não declara por ninguém', () => {
    expect(inscritoVazio().genero).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 2) Prefill — RN-174 (prova de não-oráculo)
// ---------------------------------------------------------------------------

async function montarFluxo(): Promise<void> {
  await act(async () => {
    render(<CheckoutFlow evento={evento} atribuicao={{}} />);
  });
}

/** Avança do step 0 (modalidade) para o step 1 (dados). */
function irParaDados(): void {
  fireEvent.click(screen.getByRole('radio', { name: /5k/i }));
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
}

describe('S1209-T3 · RN-174 — prefill sem oráculo de CPF', () => {
  it('a consulta de prefill NÃO leva parâmetro (não há canal para pedir CPF de ninguém)', async () => {
    await montarFluxo();
    expect(getCheckoutPrefill).toHaveBeenCalledTimes(1);
    expect(getCheckoutPrefill).toHaveBeenCalledWith();
  });

  it('prefill null ("sem ficha" / "ficha de terceiro" / anônimo): formulário VAZIO e sem aviso', async () => {
    getCheckoutPrefill.mockResolvedValue({ prefill: null });
    await montarFluxo();
    irParaDados();

    expect((screen.getByLabelText(/^cpf/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/data de nascimento/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/gênero/i) as HTMLSelectElement).value).toBe('');
    // Nada na tela conta em que estado a ficha está — as três negativas são
    // indistinguíveis também aqui, não só na resposta do servidor.
    expect(screen.queryByText(/ficha|conhecid|cadastr|encontramos você/i)).toBeNull();
  });

  it('falha da consulta de prefill é INVISÍVEL — mesma tela de quem nunca comprou', async () => {
    getCheckoutPrefill.mockRejectedValue(new Error('unavailable'));
    await montarFluxo();
    irParaDados();

    expect((screen.getByLabelText(/^cpf/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/gênero/i) as HTMLSelectElement).value).toBe('');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('digitar CPF NÃO dispara nova consulta (é isso que fecharia o oráculo se disparasse)', async () => {
    await montarFluxo();
    irParaDados();
    expect(getCheckoutPrefill).toHaveBeenCalledTimes(1);

    const cpf = screen.getByLabelText(/^cpf/i);
    fireEvent.change(cpf, { target: { value: '529.982.247-25' } });
    fireEvent.blur(cpf);
    fireEvent.change(cpf, { target: { value: '111.444.777-35' } });
    fireEvent.blur(cpf);

    expect(getCheckoutPrefill).toHaveBeenCalledTimes(1);
  });

  it('pessoa CONHECIDA: nome, CPF, nascimento e gênero do PRÓPRIO comprador entram preenchidos', async () => {
    getCheckoutPrefill.mockResolvedValue({
      prefill: {
        nome: 'Ana Corredora',
        cpf: '52998224725',
        genero: 'feminino',
        nascimento: '1990-05-20',
        telefone: '11988887777',
        endereco: {
          cep: '01310100',
          logradouro: 'Av. Paulista',
          bairro: 'Bela Vista',
          cidade: 'São Paulo',
          uf: 'SP',
          numero: '1000',
        },
      },
    });
    await montarFluxo();
    irParaDados();

    expect((screen.getByLabelText(/^cpf/i) as HTMLInputElement).value).toBe('52998224725');
    expect((screen.getByLabelText(/data de nascimento/i) as HTMLInputElement).value).toBe(
      '20/05/1990',
    );
    expect((screen.getByLabelText(/gênero/i) as HTMLSelectElement).value).toBe('feminino');
    expect((screen.getByLabelText(/telefone/i) as HTMLInputElement).value).toBe('(11) 98888-7777');
    expect((screen.getByLabelText(/cep/i) as HTMLInputElement).value).toBe('01310-100');
  });

  it('prefill NÃO sobrescreve o que a pessoa já digitou', async () => {
    // A resposta chega DEPOIS de a pessoa começar a preencher.
    let resolver: (v: unknown) => void = () => {};
    getCheckoutPrefill.mockReturnValue(
      new Promise((res) => {
        resolver = res;
      }),
    );
    await montarFluxo();
    irParaDados();

    fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '21999998888' } });

    await act(async () => {
      resolver({
        prefill: {
          nome: 'Ana Corredora',
          cpf: '52998224725',
          genero: 'feminino',
          nascimento: '1990-05-20',
          telefone: '11988887777',
        },
      });
    });

    // O telefone digitado permanece; o CPF vazio recebe o conhecido.
    expect((screen.getByLabelText(/telefone/i) as HTMLInputElement).value).toBe('(21) 99999-8888');
    expect((screen.getByLabelText(/^cpf/i) as HTMLInputElement).value).toBe('52998224725');
  });
});
