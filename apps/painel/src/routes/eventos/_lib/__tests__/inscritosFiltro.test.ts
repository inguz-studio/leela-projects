import { describe, it, expect } from 'vitest';
import {
  codigoCasaBusca,
  codigoPedidoCasaBusca,
  contadorInscritos,
  contarPendentesAntigos,
  contarPorStatus,
  filtrarInscritos,
  inadimplentes,
  normalizarBusca,
  paginar,
} from '../inscritosFiltro';
import { mkInscrito, ts } from '../../_test/fixtures';

const base = [
  mkInscrito({ id: '1', atletaNome: 'Marina Silva', kit: 'kit_ouro', modalidade: '21k', status: 'confirmado' }),
  mkInscrito({ id: '2', atletaNome: 'João Pereira', kit: 'sem_kit', modalidade: '10k', status: 'pendente' }),
  mkInscrito({ id: '3', atletaNome: 'Marina Costa', kit: 'kit_prata', modalidade: '5k', status: 'cancelado' }),
];

describe('normalizarBusca', () => {
  it('remove acento e caixa', () => {
    expect(normalizarBusca('  JOÃO  ')).toBe('joao');
  });
});

describe('filtrarInscritos', () => {
  it('busca por nome casa acento/caixa e ignora resto', () => {
    const r = filtrarInscritos(base, { busca: 'marina' });
    expect(r.map((i) => i.id)).toEqual(['1', '3']);
  });

  it('filtra por status, kit e modalidade combinados', () => {
    expect(filtrarInscritos(base, { status: 'pendente' }).map((i) => i.id)).toEqual(['2']);
    expect(filtrarInscritos(base, { kit: 'kit_ouro' }).map((i) => i.id)).toEqual(['1']);
    expect(filtrarInscritos(base, { modalidade: '5k' }).map((i) => i.id)).toEqual(['3']);
  });

  it('filtro sem correspondência retorna vazio', () => {
    expect(filtrarInscritos(base, { busca: 'zzz' })).toEqual([]);
  });
});

describe('contadorInscritos', () => {
  it('formata mostrando X de Y', () => {
    expect(contadorInscritos(18, 453)).toBe('Mostrando 18 de 453');
  });
});

describe('paginar', () => {
  it('recorta a página 1-based', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(paginar(arr, 1, 2)).toEqual([1, 2]);
    expect(paginar(arr, 3, 2)).toEqual([5]);
  });
});

describe('contarPorStatus', () => {
  it('conta por status e total', () => {
    const c = contarPorStatus(base);
    expect(c.total).toBe(3);
    expect(c.confirmado).toBe(1);
    expect(c.pendente).toBe(1);
    expect(c.cancelado).toBe(1);
  });

  it('lista vazia zera tudo', () => {
    const c = contarPorStatus([]);
    expect(c).toMatchObject({ total: 0, confirmado: 0, pendente: 0, cancelado: 0 });
  });
});

describe('inadimplentes', () => {
  it('retorna só os pendentes (quem deve)', () => {
    expect(inadimplentes(base).map((i) => i.id)).toEqual(['2']);
  });
});

describe('contarPendentesAntigos', () => {
  const agora = new Date('2026-03-01T12:00:00Z');
  it('conta pendentes com criadoEm anterior ao limite de 72h', () => {
    const antigo = mkInscrito({
      id: 'a',
      status: 'pendente',
      criadoEm: ts(new Date('2026-02-20T00:00:00Z')), // >72h antes
    });
    const recente = mkInscrito({
      id: 'b',
      status: 'pendente',
      criadoEm: ts(new Date('2026-03-01T06:00:00Z')), // <72h antes
    });
    // confirmado antigo não conta (não é inadimplente)
    const confirmadoAntigo = mkInscrito({
      id: 'c',
      status: 'confirmado',
      criadoEm: ts(new Date('2026-01-01T00:00:00Z')),
    });
    expect(contarPendentesAntigos([antigo, recente, confirmadoAntigo], agora)).toBe(1);
  });

  it('exatamente 72h NÃO conta como "mais de 72h" (fronteira estrita)', () => {
    // limite = agora - 72h = 2026-02-26T12:00:00Z. criadoEm igual ao limite
    // é exatamente 72h, não "mais de 72h" → não conta.
    const naFronteira = mkInscrito({
      id: 'f',
      status: 'pendente',
      criadoEm: ts(new Date('2026-02-26T12:00:00Z')),
    });
    expect(contarPendentesAntigos([naFronteira], agora)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Código do ingresso na busca (S211-T1 · RN-397)
// ---------------------------------------------------------------------------

const comCodigo = [
  mkInscrito({ id: '1', atletaNome: 'Marina Silva', codigoIngresso: 'AB2CD3' }),
  mkInscrito({ id: '2', atletaNome: 'João Pereira', codigoIngresso: 'XY7ZK9' }),
  // Ingresso ainda não emitido — sem código.
  mkInscrito({ id: '3', atletaNome: 'Ana Costa' }),
];

describe('busca por código do ingresso (RN-397)', () => {
  it('acha a linha pelo código exato', () => {
    expect(filtrarInscritos(comCodigo, { busca: 'XY7ZK9' }).map((i) => i.id)).toEqual(['2']);
  });

  it('acha por prefixo — o operador digita enquanto a pessoa fala', () => {
    expect(filtrarInscritos(comCodigo, { busca: 'AB2' }).map((i) => i.id)).toEqual(['1']);
  });

  it('ignora caixa, espaço e hífen do que foi digitado', () => {
    expect(filtrarInscritos(comCodigo, { busca: ' ab2-cd3 ' }).map((i) => i.id)).toEqual(['1']);
    expect(filtrarInscritos(comCodigo, { busca: 'xy7 zk9' }).map((i) => i.id)).toEqual(['2']);
  });

  it('NÃO adivinha caractere ambíguo — acharia a inscrição de outra pessoa', () => {
    // 'AB0CD3' (zero) não pode casar 'AB2CD3' nem 'ABOCD3'.
    expect(filtrarInscritos(comCodigo, { busca: 'AB0CD3' })).toEqual([]);
  });

  it('nome continua funcionando lado a lado com o código, na MESMA caixa', () => {
    expect(filtrarInscritos(comCodigo, { busca: 'marina' }).map((i) => i.id)).toEqual(['1']);
    expect(filtrarInscritos(comCodigo, { busca: 'joao' }).map((i) => i.id)).toEqual(['2']);
  });

  it('inscrito SEM código nunca é achado por busca de código', () => {
    expect(filtrarInscritos(comCodigo, { busca: 'AB2CD3' }).map((i) => i.id)).toEqual(['1']);
    expect(filtrarInscritos(comCodigo, { busca: 'ANA' }).map((i) => i.id)).toEqual(['3']);
  });

  it('busca de código respeita os demais filtros (composição intacta)', () => {
    const r = filtrarInscritos(comCodigo, { busca: 'AB2CD3', status: 'pendente' });
    expect(r).toEqual([]);
  });

  it('contador "mostrando X de Y" continua derivado do mesmo resultado', () => {
    const r = filtrarInscritos(comCodigo, { busca: 'AB2' });
    expect(contadorInscritos(r.length, comCodigo.length)).toBe('Mostrando 1 de 3');
  });
});

describe('codigoCasaBusca', () => {
  it('sem código, sem match; busca vazia não casa tudo', () => {
    expect(codigoCasaBusca(undefined, 'AB2')).toBe(false);
    expect(codigoCasaBusca('AB2CD3', '')).toBe(false);
    expect(codigoCasaBusca('AB2CD3', '   ')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Código da COMPRA na busca (S1228-T3 · RN-474/RN-475)
//
// O que estes casos prendem: quem liga para o atendimento dita `PED-A2B3C`, e o
// operador digita isso na MESMA caixa em que já digita nome e código de
// ingresso. Sem query nova, sem índice novo — o espelho `Inscrito.codigoPedido`
// é o que faz a busca custar zero (RN-397 é o molde).
// ---------------------------------------------------------------------------

const comCompra = [
  mkInscrito({ id: '1', atletaNome: 'Marina Silva', codigoIngresso: 'AB2CD3', codigoPedido: 'A2B3C' }),
  mkInscrito({ id: '2', atletaNome: 'João Pereira', codigoIngresso: 'XY7ZK9', codigoPedido: 'K7MPQ' }),
  // Compra anterior à S1228 — o backfill (5b) ainda não rodou nela.
  mkInscrito({ id: '3', atletaNome: 'Ana Costa' }),
  // Código que COMEÇA com a raiz do prefixo: `P`, `E` e `D` estão no alfabeto,
  // então `PEDXY` é um código legítimo e não pode ser decepado.
  mkInscrito({ id: '4', atletaNome: 'Bruno Lima', codigoPedido: 'PEDXY' }),
];

describe('busca por código da compra (RN-475)', () => {
  it('acha a linha pelo código exato, sem o prefixo', () => {
    expect(filtrarInscritos(comCompra, { busca: 'A2B3C' }).map((i) => i.id)).toEqual(['1']);
  });

  it('acha COM o prefixo, do jeito que a pessoa lê no e-mail', () => {
    expect(filtrarInscritos(comCompra, { busca: 'PED-K7MPQ' }).map((i) => i.id)).toEqual(['2']);
  });

  it('caixa não importa — `ped-a2b3c` acha `A2B3C`', () => {
    expect(filtrarInscritos(comCompra, { busca: 'ped-a2b3c' }).map((i) => i.id)).toEqual(['1']);
    expect(filtrarInscritos(comCompra, { busca: 'k7mpq' }).map((i) => i.id)).toEqual(['2']);
  });

  it('ignora espaço e hífen colados pelo operador', () => {
    expect(filtrarInscritos(comCompra, { busca: ' PED - A2 B3 C ' }).map((i) => i.id)).toEqual(['1']);
  });

  it('acha por prefixo — o operador digita enquanto a pessoa fala', () => {
    expect(filtrarInscritos(comCompra, { busca: 'K7M' }).map((i) => i.id)).toEqual(['2']);
  });

  it('NÃO adivinha caractere ambíguo — acharia a COMPRA de outra pessoa', () => {
    // 'A0B3C' (zero) não vira 'AOB3C' nem 'A2B3C'.
    expect(filtrarInscritos(comCompra, { busca: 'A0B3C' })).toEqual([]);
  });

  it('código que começa com a raiz do prefixo não é decepado', () => {
    expect(filtrarInscritos(comCompra, { busca: 'PEDXY' }).map((i) => i.id)).toEqual(['4']);
    // E com o prefixo de apresentação por cima, o mesmo código continua achável.
    expect(filtrarInscritos(comCompra, { busca: 'PED-PEDXY' }).map((i) => i.id)).toEqual(['4']);
  });

  it('inscrito SEM código de compra nunca é achado por código', () => {
    expect(filtrarInscritos(comCompra, { busca: 'A2B3C' }).map((i) => i.id)).toEqual(['1']);
    // A linha sem código continua achável pelo NOME, como sempre foi.
    expect(filtrarInscritos(comCompra, { busca: 'ana' }).map((i) => i.id)).toEqual(['3']);
  });

  it('nome e código do ingresso continuam funcionando na MESMA caixa', () => {
    expect(filtrarInscritos(comCompra, { busca: 'marina' }).map((i) => i.id)).toEqual(['1']);
    expect(filtrarInscritos(comCompra, { busca: 'XY7ZK9' }).map((i) => i.id)).toEqual(['2']);
  });

  it('busca por compra respeita os demais filtros (composição intacta)', () => {
    expect(filtrarInscritos(comCompra, { busca: 'A2B3C', status: 'pendente' })).toEqual([]);
  });
});

describe('codigoPedidoCasaBusca', () => {
  it('sem código, sem match; busca vazia não casa tudo', () => {
    expect(codigoPedidoCasaBusca(undefined, 'A2B')).toBe(false);
    expect(codigoPedidoCasaBusca('A2B3C', '')).toBe(false);
    expect(codigoPedidoCasaBusca('A2B3C', '   ')).toBe(false);
    // Só o prefixo digitado não pode casar a compra de todo mundo.
    expect(codigoPedidoCasaBusca('A2B3C', 'PED-')).toBe(false);
  });
});
