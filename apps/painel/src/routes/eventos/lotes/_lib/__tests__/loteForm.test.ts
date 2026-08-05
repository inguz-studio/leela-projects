import { describe, it, expect } from 'vitest';
import type { Lote } from '@leela/core';
import { ts } from '../../../_test/fixtures';
import {
  arredondarCentavos,
  capacidadePrevista,
  dateParaInputLocal,
  erroDoCampo,
  estadoLoteBadge,
  inputLocalParaDate,
  loteDesativavel,
  loteImutavel,
  parsePrecoReais,
  payloadDesativarPelaJanela,
  proximaOrdem,
  timestampParaInputLocal,
  validarFormLote,
  viaDesativacao,
  type LoteFormValues,
} from '../loteForm';

/** Constrói um Lote de teste. Datas via datetime-local → parse LOCAL (mesmo
 *  caminho do form) para que a comparação por toMillis seja tz-consistente. */
function mkLote(over: Partial<Lote> & { modalidade: string; ordem: number }): Lote {
  const inicioEm = over.inicioEm ?? ts(inputLocalParaDate('2025-12-01T00:00')!);
  const fimEm = over.fimEm ?? ts(inputLocalParaDate('2026-02-01T00:00')!);
  return {
    id: `${over.modalidade}-lote-${over.ordem}`,
    tenantId: 'castelo',
    nome: `Lote ${over.ordem}`,
    quantidadeLimite: 300,
    preco: 60,
    vendidos: 0,
    criadoEm: ts(new Date('2025-11-01T00:00:00Z')),
    atualizadoEm: ts(new Date('2025-11-01T00:00:00Z')),
    ...over,
    inicioEm,
    fimEm,
  };
}

describe('parsePrecoReais + arredondarCentavos (money-config cent-exato)', () => {
  it('aceita vírgula e ponto e arredonda ao centavo', () => {
    expect(parsePrecoReais('99,90')).toBe(99.9);
    expect(parsePrecoReais('99.90')).toBe(99.9);
    expect(parsePrecoReais('120')).toBe(120);
  });

  it('arredonda sub-centavo (condição de moneyCentExato na Rule)', () => {
    expect(arredondarCentavos(99.999)).toBe(100);
    expect(arredondarCentavos(99.994)).toBe(99.99);
    expect(parsePrecoReais('99,999')).toBe(100);
  });

  it('rejeita negativo e não-numérico', () => {
    expect(parsePrecoReais('-5')).toBeNull();
    expect(parsePrecoReais('abc')).toBeNull();
    expect(parsePrecoReais('')).toBeNull();
  });

  it('separador de milhar sobrevive: "1.234,56" é o preço inteiro do lote', () => {
    // FIX-PARSE-DINHEIRO: o `replace(',', '.')` fazia "1.234.56", o parseFloat
    // parava no segundo ponto e o lote era gravado a R$ 1,23.
    expect(parsePrecoReais('1.234,56')).toBe(1234.56);
    expect(Math.round(parsePrecoReais('1.234,56')! * 100)).toBe(123456);
    expect(parsePrecoReais('R$ 1.234,56')).toBe(1234.56);
    expect(parsePrecoReais('1.234.567,89')).toBe(1234567.89);
  });

  it('ponto sem vírgula é o milhar que o organizador quis dizer', () => {
    // Decisão do dono: "1.500" num campo de preço de lote é mil e quinhentos.
    expect(parsePrecoReais('1.500')).toBe(1500);
    expect(parsePrecoReais('1.234')).toBe(1234);
    // O ponto decimal do teclado numérico segue lido como decimal.
    expect(parsePrecoReais('1234.56')).toBe(1234.56);
    expect(parsePrecoReais('1e3')).toBeNull();
  });
});

describe('datetime-local ↔ Date/Timestamp (PINADO em FUSO_EVENTO — review S300-T4 #2)', () => {
  it('interpreta a parede em America/Sao_Paulo, independente do fuso do runtime', () => {
    // 10:00 na parede de SP = 13:00Z (UTC-3, sem DST desde 2019).
    expect(inputLocalParaDate('2026-07-12T10:00')!.toISOString()).toBe(
      '2026-07-12T13:00:00.000Z',
    );
    // Inversa: 13:00Z exibe 10:00 no input, seja o navegador de onde for.
    expect(dateParaInputLocal(new Date('2026-07-12T13:00:00Z'))).toBe('2026-07-12T10:00');
  });

  it('rollover: 23:59 BRT cruza para o dia seguinte em UTC sem deslocar a parede', () => {
    const d = inputLocalParaDate('2026-04-26T23:59')!;
    expect(d.toISOString()).toBe('2026-04-27T02:59:00.000Z');
    expect(dateParaInputLocal(d)).toBe('2026-04-26T23:59');
  });

  it('formata e reparte o mesmo instante (round-trip sem perda de minuto)', () => {
    const s = '2026-02-01T14:30';
    const d = inputLocalParaDate(s)!;
    expect(dateParaInputLocal(d)).toBe(s);
    expect(inputLocalParaDate(dateParaInputLocal(d))!.getTime()).toBe(d.getTime());
  });

  it('rejeita shape/calendário inválido', () => {
    expect(inputLocalParaDate('')).toBeNull();
    expect(inputLocalParaDate('2026-02-30T10:00')).toBeNull();
    expect(inputLocalParaDate('2026-02-01T24:00')).toBeNull();
    expect(inputLocalParaDate('2026-02-01 10:00')).toBeNull();
  });

  it('timestampParaInputLocal devolve vazio quando ausente', () => {
    expect(timestampParaInputLocal(null)).toBe('');
    expect(timestampParaInputLocal(undefined)).toBe('');
  });
});

describe('loteImutavel + proximaOrdem', () => {
  it('lote com venda é imutável (RN-200/300)', () => {
    expect(loteImutavel({ vendidos: 1 })).toBe(true);
    expect(loteImutavel({ vendidos: 0 })).toBe(false);
  });

  it('proximaOrdem = max + 1 (mínimo 1)', () => {
    expect(proximaOrdem([{ ordem: 1 }, { ordem: 3 }])).toBe(4);
    expect(proximaOrdem([])).toBe(1);
  });
});

describe('estadoLoteBadge (derivação do kernel)', () => {
  const l1 = mkLote({
    modalidade: '5k',
    ordem: 1,
    inicioEm: ts(inputLocalParaDate('2025-12-01T00:00')!),
    fimEm: ts(inputLocalParaDate('2026-02-01T00:00')!),
    quantidadeLimite: 150,
    vendidos: 150, // esgotado
  });
  const l2 = mkLote({
    modalidade: '5k',
    ordem: 2,
    inicioEm: ts(inputLocalParaDate('2026-02-01T00:00')!),
    fimEm: ts(inputLocalParaDate('2026-04-01T00:00')!),
    quantidadeLimite: 300,
    vendidos: 120,
  });
  const grupo = [l1, l2];
  const agora = inputLocalParaDate('2026-03-01T00:00')!;

  it('marca o lote ativo (vitoria) e o esgotado (vulcao)', () => {
    expect(estadoLoteBadge(l2, grupo, agora)).toEqual({ label: 'Ativo', variant: 'vitoria' });
    expect(estadoLoteBadge(l1, grupo, agora)).toEqual({ label: 'Esgotado', variant: 'vulcao' });
  });
});

describe('validarFormLote (shape do core + invariante cross-lote)', () => {
  const l1 = mkLote({
    modalidade: '5k',
    ordem: 1,
    inicioEm: ts(inputLocalParaDate('2025-12-01T00:00')!),
    fimEm: ts(inputLocalParaDate('2026-02-01T00:00')!),
  });

  const base: LoteFormValues = {
    nome: 'Lote 2',
    ordem: '2',
    inicioEm: '2026-02-01T00:00',
    fimEm: '2026-04-01T00:00',
    quantidadeLimite: '300',
    preco: '75,00',
  };

  it('aceita um lote seguinte sem sobreposição', () => {
    const r = validarFormLote({ values: base, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(r.ok).toBe(true);
    if (r.ok && 'preco' in r.input) {
      expect(r.input.preco).toBe(75);
      expect(r.input.ordem).toBe(2);
      expect(r.input.modalidade).toBe('5k');
    } else {
      expect.fail('esperava payload completo (lote sem venda)');
    }
  });

  it('rejeita janela sobreposta na modalidade (RN-300)', () => {
    const values = { ...base, inicioEm: '2026-01-15T00:00', fimEm: '2026-03-01T00:00' };
    const r = validarFormLote({ values, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/sobrepost/i);
  });

  it('rejeita ordem duplicada na modalidade (ADR-012)', () => {
    const values = { ...base, ordem: '1' };
    const r = validarFormLote({ values, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/ordem 1 duplicada/i);
  });

  it('rejeita fim ≤ início', () => {
    const values = { ...base, inicioEm: '2026-04-01T00:00', fimEm: '2026-02-01T00:00' };
    const r = validarFormLote({ values, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/depois do início/i);
  });

  it('rejeita preço inválido', () => {
    const values = { ...base, preco: 'abc' };
    const r = validarFormLote({ values, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/pre.o inv/i);
  });

  it('ao editar, exclui o próprio lote dos irmãos (não colide consigo)', () => {
    const values = { ...base, ordem: '1', inicioEm: '2025-12-01T00:00', fimEm: '2026-02-01T00:00' };
    const r = validarFormLote({ values, modalidade: '5k', loteId: l1.id, lotesDoEvento: [l1] });
    expect(r.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Frente A — o erro acende no campo pendente, e só nele
// ---------------------------------------------------------------------------

describe('erro POR CAMPO (frente A — o defeito que acusava "preço" pela vaga vazia)', () => {
  const l1 = mkLote({ modalidade: '5k', ordem: 1 });
  const base: LoteFormValues = {
    nome: 'Lote 2',
    ordem: '2',
    inicioEm: '2026-02-01T00:00',
    fimEm: '2026-04-01T00:00',
    quantidadeLimite: '300',
    preco: '75,00',
  };

  it('reproduz o caso do dono: preço 120,00 preenchido e vaga vazia acusa a VAGA, não o preço', () => {
    const r = validarFormLote({
      values: { ...base, preco: '120,00', quantidadeLimite: '' },
      modalidade: '5k',
      loteId: null,
      lotesDoEvento: [l1],
    });
    expect(r.ok).toBe(false);
    expect(erroDoCampo(r, 'quantidadeLimite')).toMatch(/vaga/i);
    // O ponto do conserto: o preço, que está válido, não acende.
    expect(erroDoCampo(r, 'preco')).toBeNull();
  });

  it('dois campos pendentes ao mesmo tempo: cada um recebe o SEU aviso', () => {
    const r = validarFormLote({
      values: { ...base, quantidadeLimite: '', preco: 'abc' },
      modalidade: '5k',
      loteId: null,
      lotesDoEvento: [l1],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erros).toHaveLength(2);
    expect(erroDoCampo(r, 'quantidadeLimite')).toMatch(/vaga/i);
    expect(erroDoCampo(r, 'preco')).toMatch(/pre.o inv/i);
    // Ordem VISUAL do formulário: a vaga vem antes do preço, então é ela que
    // recebe o foco.
    expect(r.erros[0]?.campo).toBe('quantidadeLimite');
  });

  it('quatro campos pendentes saem na ordem visual (nome → ordem → vaga → janela)', () => {
    const r = validarFormLote({
      values: { nome: '  ', ordem: '0', quantidadeLimite: '', inicioEm: '', fimEm: '', preco: '' },
      modalidade: '5k',
      loteId: null,
      lotesDoEvento: [l1],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erros.map((e) => e.campo)).toEqual([
      'nome',
      'ordem',
      'quantidadeLimite',
      'inicioEm',
      'fimEm',
      'preco',
    ]);
  });

  it('início e fim ausentes acendem cada um o seu campo (não um aviso só para os dois)', () => {
    const r = validarFormLote({
      values: { ...base, inicioEm: '', fimEm: '' },
      modalidade: '5k',
      loteId: null,
      lotesDoEvento: [l1],
    });
    expect(erroDoCampo(r, 'inicioEm')).toMatch(/in.cio/i);
    expect(erroDoCampo(r, 'fimEm')).toMatch(/fim/i);
    expect(erroDoCampo(r, 'nome')).toBeNull();
  });

  it('formulário inteiro válido não devolve erro nenhum', () => {
    const r = validarFormLote({ values: base, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(r.ok).toBe(true);
    expect(erroDoCampo(r, 'preco')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Frente B — a mensagem de sobreposição diz QUAL janela está no caminho
// ---------------------------------------------------------------------------

describe('conflito de janela com endereço (frente B)', () => {
  const l1 = mkLote({
    modalidade: '5k',
    ordem: 1,
    nome: 'Lote Promocional',
    inicioEm: ts(inputLocalParaDate('2025-12-01T08:00')!),
    fimEm: ts(inputLocalParaDate('2026-02-01T23:30')!),
  });
  const base: LoteFormValues = {
    nome: 'Lote 2',
    ordem: '2',
    inicioEm: '2026-01-15T00:00',
    fimEm: '2026-03-01T00:00',
    quantidadeLimite: '300',
    preco: '75,00',
  };

  it('nomeia o lote conflitante e escreve a vigência dele com data E hora', () => {
    const r = validarFormLote({ values: base, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(r.ok).toBe(false);
    const msg = erroDoCampo(r, 'inicioEm') ?? '';
    expect(msg).toMatch(/sobrepost/i);
    expect(msg).toContain('Lote Promocional');
    expect(msg).toContain('L1');
    // Janela EXATA nas duas pontas, com hora, no fuso do produto.
    expect(msg).toContain('01 de dez. de 2025 · 08:00');
    expect(msg).toContain('01 de fev. de 2026 · 23:30');
    expect(msg).toMatch(/Bras[íi]lia/);
  });

  it('o aviso vai para o campo de janela, não para o de preço', () => {
    const r = validarFormLote({ values: base, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(erroDoCampo(r, 'preco')).toBeNull();
    expect(erroDoCampo(r, 'inicioEm')).not.toBeNull();
  });

  it('conflito que não é da janela (ordem duplicada) mantém a mensagem do kernel no formulário', () => {
    const values = { ...base, ordem: '1', inicioEm: '2026-02-02T00:00', fimEm: '2026-03-01T00:00' };
    const r = validarFormLote({ values, modalidade: '5k', loteId: null, lotesDoEvento: [l1] });
    expect(r.ok).toBe(false);
    expect(erroDoCampo(r, 'formulario')).toMatch(/ordem 1 duplicada/i);
  });
});

// ---------------------------------------------------------------------------
// Frente D — a aritmética de vagas que o dono descreveu
// ---------------------------------------------------------------------------

describe('capacidadePrevista (frente D — disponível segue o total DIGITADO)', () => {
  it('o caso verbatim: 50 configurados, 19 vendidos, total editado para 20 → 1 disponível', () => {
    const lote = mkLote({ modalidade: '5k', ordem: 1, quantidadeLimite: 50, vendidos: 19 });
    expect(capacidadePrevista(lote, '20')).toEqual({
      configurado: 20,
      vendido: 19,
      disponivel: 1,
    });
  });

  it('nunca devolve disponível negativo — mostra zero em vez de dívida de vaga', () => {
    const lote = mkLote({ modalidade: '5k', ordem: 1, quantidadeLimite: 50, vendidos: 19 });
    expect(capacidadePrevista(lote, '10').disponivel).toBe(0);
  });

  it('total ilegível enquanto se digita cai no total gravado (o painel não pisca em branco)', () => {
    const lote = mkLote({ modalidade: '5k', ordem: 1, quantidadeLimite: 50, vendidos: 19 });
    expect(capacidadePrevista(lote, '').configurado).toBe(50);
    expect(capacidadePrevista(lote, 'abc').disponivel).toBe(31);
  });

  it('lote novo (nada vendido): disponível = total digitado', () => {
    expect(capacidadePrevista(null, '80')).toEqual({
      configurado: 80,
      vendido: 0,
      disponivel: 80,
    });
  });
});

// ---------------------------------------------------------------------------
// Frente E — desativar interrompe a venda sem desfazer venda nenhuma
// ---------------------------------------------------------------------------

describe('desativar lote (frente E)', () => {
  const AGORA = inputLocalParaDate('2026-03-01T10:00')!;
  const vigenteComVenda = mkLote({
    modalidade: '5k',
    ordem: 2,
    quantidadeLimite: 300,
    vendidos: 120,
    inicioEm: ts(inputLocalParaDate('2026-02-01T00:00')!),
    fimEm: ts(inputLocalParaDate('2026-04-01T00:00')!),
  });
  const vigenteSemVenda = mkLote({
    modalidade: '10k',
    ordem: 1,
    quantidadeLimite: 300,
    vendidos: 0,
    inicioEm: ts(inputLocalParaDate('2026-02-01T00:00')!),
    fimEm: ts(inputLocalParaDate('2026-04-01T00:00')!),
  });

  it('lote vigente é desativável — inclusive com data e hora dentro da janela', () => {
    expect(loteDesativavel(vigenteComVenda, AGORA)).toBe(true);
    expect(loteDesativavel(vigenteSemVenda, AGORA)).toBe(true);
  });

  it('lote já encerrado (esgotado ou fora da janela) não é desativável — não há venda a parar', () => {
    const esgotado = mkLote({ modalidade: '5k', ordem: 1, quantidadeLimite: 150, vendidos: 150 });
    const encerrado = mkLote({
      modalidade: '5k',
      ordem: 1,
      inicioEm: ts(inputLocalParaDate('2025-12-01T00:00')!),
      fimEm: ts(inputLocalParaDate('2026-02-01T00:00')!),
    });
    expect(loteDesativavel(esgotado, AGORA)).toBe(false);
    expect(loteDesativavel(encerrado, AGORA)).toBe(false);
  });

  it('lote agendado (janela ainda não abriu) não é desativável: fechar a janela quebraria fim > início', () => {
    const agendado = mkLote({
      modalidade: '5k',
      ordem: 3,
      inicioEm: ts(inputLocalParaDate('2026-04-01T00:00')!),
      fimEm: ts(inputLocalParaDate('2026-04-26T23:59')!),
    });
    expect(loteDesativavel(agendado, AGORA)).toBe(false);
  });

  it('a via depende da venda: com venda vai pela capacidade (RN-304), sem venda pela janela', () => {
    expect(viaDesativacao(vigenteComVenda)).toBe('capacidade');
    expect(viaDesativacao(vigenteSemVenda)).toBe('janela');
  });

  it('desativar pela janela só encurta o fim — preço, vaga, ordem e início ficam de pé', () => {
    const payload = payloadDesativarPelaJanela(vigenteSemVenda, AGORA);
    expect(payload.fimEm.getTime()).toBe(AGORA.getTime());
    expect(payload.inicioEm.getTime()).toBe(vigenteSemVenda.inicioEm.toMillis());
    expect(payload.quantidadeLimite).toBe(vigenteSemVenda.quantidadeLimite);
    expect(payload.preco).toBe(vigenteSemVenda.preco);
    expect(payload.ordem).toBe(vigenteSemVenda.ordem);
    // `vendidos` nunca viaja no payload: é ∑ exclusivo da Function de virada.
    expect(payload).not.toHaveProperty('vendidos');
    // E a janela continua válida para o shape do kernel e da Rule.
    expect(payload.fimEm.getTime()).toBeGreaterThan(payload.inicioEm.getTime());
  });

  it('a janela encurtada encerra o lote no mesmo instante (derivação do kernel)', () => {
    const payload = payloadDesativarPelaJanela(vigenteSemVenda, AGORA);
    const depois = { ...vigenteSemVenda, fimEm: ts(payload.fimEm) };
    expect(loteDesativavel(depois, AGORA)).toBe(false);
  });
});

describe('lote VENDIDO — payload SÓ-NOME (RN-200/300 · review S300-T4 #1)', () => {
  const vendido = mkLote({ modalidade: '5k', ordem: 1, vendidos: 42 });
  const values: LoteFormValues = {
    nome: 'Lote 1 renomeado',
    ordem: String(vendido.ordem),
    inicioEm: timestampParaInputLocal(vendido.inicioEm),
    fimEm: timestampParaInputLocal(vendido.fimEm),
    quantidadeLimite: String(vendido.quantidadeLimite),
    preco: '60,00',
  };

  it('payload de edição de lote vendido contém SÓ `nome` — nada de preco/janela/vaga/ordem', () => {
    const r = validarFormLote({
      values,
      modalidade: '5k',
      loteId: vendido.id,
      lotesDoEvento: [vendido],
      congelado: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input).toEqual({ nome: 'Lote 1 renomeado' });
      expect(Object.keys(r.input)).toEqual(['nome']);
    }
  });

  it('rename não é refém dos campos congelados: janela/preço ilegíveis não bloqueiam', () => {
    // Campos comerciais corrompidos/ilegíveis no form (disabled na UI) — o
    // caminho congelado nem os olha; só o nome importa.
    const r = validarFormLote({
      values: { ...values, preco: 'abc', inicioEm: '', fimEm: '', ordem: '0' },
      modalidade: '5k',
      loteId: vendido.id,
      lotesDoEvento: [vendido],
      congelado: true,
    });
    expect(r.ok).toBe(true);
  });

  it('nome vazio segue rejeitado mesmo congelado', () => {
    const r = validarFormLote({
      values: { ...values, nome: '   ' },
      modalidade: '5k',
      loteId: vendido.id,
      lotesDoEvento: [vendido],
      congelado: true,
    });
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FIX-PARSE-MILHAR — a vaga lida pelo parser único de contagem
//
// `Number.parseInt("1.000", 10)` é 1, e 1 é um inteiro perfeitamente válido:
// a guarda `Number.isInteger` aprovava, o lote nascia com UMA vaga e o
// organizador só descobria quando o evento "esgotava" no primeiro inscrito.
// ---------------------------------------------------------------------------

describe('vaga e ordem com separador de milhar (FIX-PARSE-MILHAR)', () => {
  const base: LoteFormValues = {
    nome: 'Lote 1',
    ordem: '1',
    inicioEm: '2026-02-01T00:00',
    fimEm: '2026-04-01T00:00',
    quantidadeLimite: '300',
    preco: '75,00',
  };

  it('"1.000" abre mil lugares, não um', () => {
    const r = validarFormLote({
      values: { ...base, quantidadeLimite: '1.000' },
      modalidade: '5k',
      loteId: null,
      lotesDoEvento: [],
    });
    expect(r.ok).toBe(true);
    if (r.ok && 'quantidadeLimite' in r.input) {
      expect(r.input.quantidadeLimite).toBe(1000);
    } else {
      expect.fail('esperava payload completo com a vaga lida');
    }
    // Fica no registro o que o caminho antigo devolvia para o mesmo texto.
    expect(Number.parseInt('1.000', 10)).toBe(1);
  });

  it('casa decimal na vaga é recusa de campo, nunca arredondamento calado', () => {
    for (const q of ['1,000', '2,5', '1.5']) {
      const r = validarFormLote({
        values: { ...base, quantidadeLimite: q },
        modalidade: '5k',
        loteId: null,
        lotesDoEvento: [],
      });
      expect(r.ok).toBe(false);
      expect(erroDoCampo(r, 'quantidadeLimite')).toMatch(/vaga/i);
    }
  });

  it('a ordem lê a mesma pontuação da vaga', () => {
    const r = validarFormLote({
      values: { ...base, ordem: '1.000' },
      modalidade: '5k',
      loteId: null,
      lotesDoEvento: [],
    });
    expect(r.ok).toBe(true);
    if (r.ok && 'ordem' in r.input) {
      expect(r.input.ordem).toBe(1000);
    } else {
      expect.fail('esperava payload completo com a ordem lida');
    }
  });

  it('a guarda de faixa continua de pé (vaga ≥ 1)', () => {
    for (const q of ['0', '-5', '', 'abc']) {
      const r = validarFormLote({
        values: { ...base, quantidadeLimite: q },
        modalidade: '5k',
        loteId: null,
        lotesDoEvento: [],
      });
      expect(r.ok).toBe(false);
      expect(erroDoCampo(r, 'quantidadeLimite')).toMatch(/vaga/i);
    }
  });
});

describe('capacidadePrevista lê a MESMA pontuação do submit (FIX-PARSE-MILHAR)', () => {
  it('a prévia de "1.000" mostra mil — o mesmo número que será gravado', () => {
    expect(capacidadePrevista(null, '1.000').configurado).toBe(1000);
    expect(capacidadePrevista(null, '1.000').disponivel).toBe(1000);
  });

  it('total com casa decimal cai no gravado, como qualquer texto ilegível', () => {
    const lote = mkLote({ modalidade: '5k', ordem: 1, quantidadeLimite: 50, vendidos: 19 });
    expect(capacidadePrevista(lote, '2,5').configurado).toBe(50);
  });
});
