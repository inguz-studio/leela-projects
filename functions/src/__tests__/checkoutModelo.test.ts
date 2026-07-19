/**
 * checkoutModelo.test.ts — LEELA-CKMOD (lote CHECKOUT-MODELO)
 *
 * Unit (sem I/O) da extensão de modelo do checkout (spec CHECKOUT-UX §5,
 * ratificada 2026-07-18):
 *   - endereço do pedido (NOVO no core): validação/parse/normalização de CEP;
 *   - aceites versionados no pagar (RN-149 pattern): input + parse;
 *   - politicaVendas.versao: vigência, material, precisa-novo-aceite;
 *   - validarDadosMinimosInscrito destravado (telefone/nascimento);
 *   - parseDadosPessoais Postel (bloco [reg] PARCIAL do checkout novo);
 *   - parsePedido com endereco/aceites/responsavel.telefone.
 */

import { describe, expect, it } from 'vitest';
import {
  cepValido,
  normalizarCep,
  validarEnderecoPedido,
  parseEnderecoPedido,
  validarAceitesCheckoutInput,
  parseAceitesPedido,
  TERMO_SAUDE_VERSAO_VIGENTE,
  versaoPoliticaVendas,
  materialPoliticaVendas,
  precisaNovoAceiteTermos,
  politicaVendasPadrao,
  CAMPOS_FUNCTION_POLITICA_VENDAS,
  CAMPOS_FUNCTION_PEDIDO,
  validarDadosMinimosInscrito,
  NASCIMENTO_MIN_ISO,
  parseDadosPessoais,
  parseInscrito,
  parsePedido,
} from '@leela/core';

const fakeTs = { seconds: 1_770_000_000, nanoseconds: 0 };

// ---------------------------------------------------------------------------
// Endereço do pedido
// ---------------------------------------------------------------------------

function enderecoOk(): Record<string, unknown> {
  return {
    cep: '88015-600',
    logradouro: 'Rua Bocaiúva',
    bairro: 'Centro',
    cidade: 'Florianópolis',
    uf: 'SC',
    numero: '2468',
    complemento: 'ap 301',
  };
}

describe('endereço do pedido (CKMOD §5.1/§5.2)', () => {
  it('cepValido aceita com e sem máscara; normalizarCep canoniza 8 dígitos', () => {
    expect(cepValido('88015-600')).toBe(true);
    expect(cepValido('88015600')).toBe(true);
    expect(normalizarCep('88015-600')).toBe('88015600');
  });

  it('cepValido rejeita tamanho errado e lixo não-numérico', () => {
    expect(cepValido('8801560')).toBe(false); // 7 dígitos
    expect(cepValido('880156000')).toBe(false); // 9 dígitos
    expect(cepValido('88015-60a')).toBe(false); // letra
    expect(cepValido(88015600)).toBe(false); // número, não string
    expect(cepValido(undefined)).toBe(false);
  });

  it('endereço completo passa; complemento é opcional', () => {
    expect(validarEnderecoPedido(enderecoOk())).toEqual([]);
    const sem = enderecoOk();
    delete sem['complemento'];
    expect(validarEnderecoPedido(sem)).toEqual([]);
  });

  it('bairro pode ser vazio (CEP rural/novo — spec §5.2)', () => {
    const e = enderecoOk();
    e['bairro'] = '';
    expect(validarEnderecoPedido(e)).toEqual([]);
  });

  it('UF fora da lista, cidade/numero/logradouro vazios e CEP torto acusam', () => {
    const e = enderecoOk();
    e['uf'] = 'XX';
    e['cidade'] = '';
    e['numero'] = '';
    e['logradouro'] = '  ';
    e['cep'] = '123';
    const erros = validarEnderecoPedido(e);
    expect(erros.some((m) => m.includes('uf'))).toBe(true);
    expect(erros.some((m) => m.includes('cidade'))).toBe(true);
    expect(erros.some((m) => m.includes('numero'))).toBe(true);
    expect(erros.some((m) => m.includes('logradouro'))).toBe(true);
    expect(erros.some((m) => m.includes('cep'))).toBe(true);
  });

  it('mensagens de erro NUNCA ecoam o valor digitado (PII — LGPD)', () => {
    const e = enderecoOk();
    e['logradouro'] = 'Rua Casa do Vitor Segredo 123'.repeat(20);
    e['cep'] = '99999999999';
    const erros = validarEnderecoPedido(e);
    expect(erros.join(' ')).not.toContain('Vitor');
    expect(erros.join(' ')).not.toContain('99999999999');
  });

  it('parseEnderecoPedido normaliza CEP para 8 dígitos e faz trim', () => {
    const parsed = parseEnderecoPedido('Pedido ped-1', enderecoOk());
    expect(parsed.cep).toBe('88015600');
    expect(parsed.logradouro).toBe('Rua Bocaiúva');
    expect(parsed.complemento).toBe('ap 301');
  });

  it('parseEnderecoPedido lança fail-fast em shape inválido', () => {
    expect(() => parseEnderecoPedido('Pedido ped-1', { cep: '123' })).toThrow(/endereco/);
    expect(() => parseEnderecoPedido('Pedido ped-1', null)).toThrow(/endereco/);
  });
});

// ---------------------------------------------------------------------------
// Aceites versionados (RN-149 pattern)
// ---------------------------------------------------------------------------

describe('aceites do pagar (CKMOD §5.3)', () => {
  it('input válido = {termos: true, saude: true} literal', () => {
    expect(validarAceitesCheckoutInput({ termos: true, saude: true })).toEqual([]);
  });

  it('aceite parcial/forjado nunca passa (false, string "true", ausente)', () => {
    expect(validarAceitesCheckoutInput({ termos: true, saude: false }).length).toBe(1);
    expect(validarAceitesCheckoutInput({ termos: 'true', saude: true }).length).toBe(1);
    expect(validarAceitesCheckoutInput({}).length).toBe(2);
    expect(validarAceitesCheckoutInput(null).length).toBe(1);
    expect(validarAceitesCheckoutInput([true, true]).length).toBe(1);
  });

  it('parseAceitesPedido exige os DOIS aceites com versao ≥ 1 e carimbo', () => {
    const ok = parseAceitesPedido('Pedido ped-1', {
      termos: { versao: 3, aceiteEm: fakeTs },
      saude: { versao: TERMO_SAUDE_VERSAO_VIGENTE, aceiteEm: fakeTs },
    });
    expect(ok.termos.versao).toBe(3);
    expect(ok.saude.versao).toBe(1);
    expect(() =>
      parseAceitesPedido('Pedido ped-1', { termos: { versao: 1, aceiteEm: fakeTs } })
    ).toThrow(/saude/);
    expect(() =>
      parseAceitesPedido('Pedido ped-1', {
        termos: { versao: 0, aceiteEm: fakeTs },
        saude: { versao: 1, aceiteEm: fakeTs },
      })
    ).toThrow(/versao/);
    expect(() =>
      parseAceitesPedido('Pedido ped-1', {
        termos: { versao: 1 },
        saude: { versao: 1, aceiteEm: fakeTs },
      })
    ).toThrow(/aceiteEm/);
  });
});

// ---------------------------------------------------------------------------
// politicaVendas.versao (paralelo RN-149)
// ---------------------------------------------------------------------------

describe('versão da politicaVendas (CKMOD)', () => {
  it('vigente sem doc/legado = 1 (a política SEMPRE vige — defaults CDC)', () => {
    expect(versaoPoliticaVendas(undefined)).toBe(1);
    expect(versaoPoliticaVendas(0)).toBe(1);
    expect(versaoPoliticaVendas(2.5)).toBe(1);
    expect(versaoPoliticaVendas(4)).toBe(4);
  });

  it('materialPoliticaVendas é determinística e ignora tenantId/carimbos', () => {
    const padrao = politicaVendasPadrao();
    const a = materialPoliticaVendas(padrao);
    const b = materialPoliticaVendas({ ...padrao });
    expect(a).toBe(b);
    const mudada = {
      ...padrao,
      reembolso: { ...padrao.reembolso, corteHoras: 24 },
    };
    expect(materialPoliticaVendas(mudada)).not.toBe(a);
  });

  it('precisaNovoAceiteTermos: nunca aceitou ⇒ precisa; versão antiga ⇒ precisa; vigente ⇒ não', () => {
    expect(precisaNovoAceiteTermos(undefined, undefined)).toBe(true);
    expect(precisaNovoAceiteTermos(1, undefined)).toBe(false);
    expect(precisaNovoAceiteTermos(1, 2)).toBe(true);
    expect(precisaNovoAceiteTermos(2, 2)).toBe(false);
    expect(precisaNovoAceiteTermos(3, 2)).toBe(false);
  });

  it('CAMPOS_FUNCTION cobrem versão da política e endereco/aceites do pedido', () => {
    expect(CAMPOS_FUNCTION_POLITICA_VENDAS).toContain('versao');
    expect(CAMPOS_FUNCTION_POLITICA_VENDAS).toContain('politicaTextoHash');
    expect(CAMPOS_FUNCTION_PEDIDO).toContain('endereco');
    expect(CAMPOS_FUNCTION_PEDIDO).toContain('aceites');
  });
});

// ---------------------------------------------------------------------------
// validarDadosMinimosInscrito destravado (telefone/nascimento)
// ---------------------------------------------------------------------------

const inscritoBase = {
  nome: 'Maria Atleta',
  email: 'maria@exemplo.com.br',
  cpf: '529.982.247-25',
};

describe('validarDadosMinimosInscrito (CKMOD — campos destravados)', () => {
  it('sem telefone/nascimento segue válido (compat UI antiga — Postel)', () => {
    expect(validarDadosMinimosInscrito(inscritoBase)).toEqual([]);
  });

  it('telefone presente é validado (fonte única telefoneValido)', () => {
    expect(
      validarDadosMinimosInscrito({ ...inscritoBase, telefone: '(48) 99999-0001' })
    ).toEqual([]);
    const erros = validarDadosMinimosInscrito({ ...inscritoBase, telefone: '123' });
    expect(erros.some((m) => m.includes('telefone'))).toBe(true);
  });

  it('nascimento presente exige data civil válida, ≥ 1900 e no passado', () => {
    expect(
      validarDadosMinimosInscrito({ ...inscritoBase, nascimento: '1990-05-17' }, '2026-07-19')
    ).toEqual([]);
    expect(
      validarDadosMinimosInscrito({ ...inscritoBase, nascimento: '1990-02-30' }).length
    ).toBe(1); // dia inexistente
    expect(
      validarDadosMinimosInscrito({ ...inscritoBase, nascimento: '1899-12-31' }).length
    ).toBe(1); // antes do piso
    expect(
      validarDadosMinimosInscrito({ ...inscritoBase, nascimento: '2026-07-19' }, '2026-07-19')
        .length
    ).toBe(1); // hoje não é passado
    expect(
      validarDadosMinimosInscrito({ ...inscritoBase, nascimento: '2027-01-01' }, '2026-07-19')
        .length
    ).toBe(1); // futuro
  });

  it('sem hojeISO não aplica o gate de passado (chamada pura)', () => {
    expect(
      validarDadosMinimosInscrito({ ...inscritoBase, nascimento: '2027-01-01' })
    ).toEqual([]);
  });

  it('mensagens não ecoam PII (nascimento/telefone)', () => {
    const erros = validarDadosMinimosInscrito(
      { ...inscritoBase, telefone: '123', nascimento: '2027-01-01' },
      '2026-07-19'
    );
    expect(erros.join(' ')).not.toContain('123');
    expect(erros.join(' ')).not.toContain('2027-01-01');
    expect(NASCIMENTO_MIN_ISO).toBe('1900-01-01');
  });
});

// ---------------------------------------------------------------------------
// parseDadosPessoais Postel (bloco [reg] PARCIAL do checkout novo)
// ---------------------------------------------------------------------------

describe('parseDadosPessoais Postel (CKMOD — bloco parcial)', () => {
  it('bloco COMPLETO (legado/seed) parseia como antes', () => {
    const dp = parseDadosPessoais('Inscrito i1', {
      cpf: '52998224725',
      telefone: '(48) 99999-0001',
      nascimento: '1990-05-17',
      genero: 'feminino',
      cidade: 'Florianópolis',
      uf: 'SC',
    });
    expect(dp.telefone).toBe('(48) 99999-0001');
    expect(dp.uf).toBe('SC');
  });

  it('bloco PARCIAL do checkout novo (cpf+nascimento) normaliza os ausentes', () => {
    const dp = parseDadosPessoais('Inscrito i1', {
      cpf: '52998224725',
      nascimento: '1990-05-17',
    });
    expect(dp.cpf).toBe('52998224725');
    expect(dp.nascimento).toBe('1990-05-17');
    expect(dp.telefone).toBe(''); // não coletado
    expect(dp.genero).toBe('nao_informado');
    expect(dp.cidade).toBe('');
    expect(dp.uf).toBe('');
  });

  it('campo PRESENTE mas inválido segue fail-fast (PII errada > ausente)', () => {
    expect(() =>
      parseDadosPessoais('Inscrito i1', { cpf: '52998224725', telefone: '12' })
    ).toThrow(/telefone/);
    expect(() =>
      parseDadosPessoais('Inscrito i1', { cpf: '52998224725', nascimento: '17/05/1990' })
    ).toThrow(/nascimento/);
    expect(() =>
      parseDadosPessoais('Inscrito i1', { cpf: '52998224725', uf: 'ZZ' })
    ).toThrow(/UF/);
  });

  it('cpf segue OBRIGATÓRIO no bloco', () => {
    expect(() => parseDadosPessoais('Inscrito i1', { nascimento: '1990-05-17' })).toThrow(
      /cpf/
    );
  });

  it('parseInscrito com bloco parcial não derruba a listagem do painel', () => {
    const inscrito = parseInscrito('insc-1', {
      tenantId: 'tenant-1',
      atletaId: 'atl-1',
      atletaNome: 'Maria Atleta',
      kit: 'sem_kit',
      chipNumero: null,
      status: 'pendente',
      modalidade: '5k',
      pedidoRef: 'ped-1',
      ehResponsavel: true,
      tamanhos: {},
      dadosPessoais: { cpf: '52998224725', nascimento: '1990-05-17' },
      criadoEm: fakeTs,
      atualizadoEm: fakeTs,
    });
    expect(inscrito.dadosPessoais?.nascimento).toBe('1990-05-17');
    expect(inscrito.dadosPessoais?.telefone).toBe('');
  });
});

// ---------------------------------------------------------------------------
// parsePedido com endereco/aceites/telefone do responsável
// ---------------------------------------------------------------------------

function pedidoDoc(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tenantId: 'tenant-1',
    eventoId: 'evento-1',
    responsavel: { atletaId: 'atl-1', nome: 'Maria Atleta', email: 'maria@exemplo.com.br' },
    inscritoRefs: ['insc-1'],
    itens: [{ inscritoRef: 'insc-1', valorBase: 100, desconto: 0, valorFinal: 100 }],
    pagamentoRef: 'pag-1',
    valorTotal: 100,
    status: 'pendente',
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
    ...extra,
  };
}

describe('parsePedido (CKMOD — endereco/aceites/telefone)', () => {
  it('pedido pré-CKMOD (sem os campos) segue válido — schema evolution', () => {
    const p = parsePedido('ped-1', pedidoDoc());
    expect(p.endereco).toBeUndefined();
    expect(p.aceites).toBeUndefined();
    expect(p.responsavel.telefone).toBeUndefined();
  });

  it('pedido CKMOD completo parseia endereco (CEP canônico) + aceites + telefone', () => {
    const p = parsePedido(
      'ped-1',
      pedidoDoc({
        responsavel: {
          atletaId: 'atl-1',
          nome: 'Maria Atleta',
          email: 'maria@exemplo.com.br',
          telefone: '(48) 99999-0001',
        },
        endereco: {
          cep: '88015-600',
          logradouro: 'Rua Bocaiúva',
          bairro: 'Centro',
          cidade: 'Florianópolis',
          uf: 'SC',
          numero: '2468',
        },
        aceites: {
          termos: { versao: 1, aceiteEm: fakeTs },
          saude: { versao: 1, aceiteEm: fakeTs },
        },
      })
    );
    expect(p.endereco?.cep).toBe('88015600');
    expect(p.aceites?.termos.versao).toBe(1);
    expect(p.responsavel.telefone).toBe('(48) 99999-0001');
  });

  it('endereco/aceites/telefone PRESENTES e corrompidos lançam (fail-fast)', () => {
    expect(() => parsePedido('ped-1', pedidoDoc({ endereco: { cep: '1' } }))).toThrow(
      /endereco/
    );
    expect(() =>
      parsePedido('ped-1', pedidoDoc({ aceites: { termos: { versao: 1, aceiteEm: fakeTs } } }))
    ).toThrow(/saude/);
    expect(() =>
      parsePedido(
        'ped-1',
        pedidoDoc({
          responsavel: {
            atletaId: 'atl-1',
            nome: 'Maria Atleta',
            email: 'maria@exemplo.com.br',
            telefone: '12',
          },
        })
      )
    ).toThrow(/telefone/);
  });
});
