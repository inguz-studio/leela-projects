/**
 * pessoaCore.test.ts — LEELA-CK2-T1 (RN-173 · registro global de pessoa)
 *
 * Unidade pura: derivação do docId (HMAC com pepper — determinismo, máscara,
 * fail-closed sem pepper), plano de upsert do checkout (claim de conta,
 * colapso de CPF repetido, endereço só no responsável) e o merge/parse do
 * core (`mesclarDadosConhecidosPessoa`/`parsePessoa`).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  mesclarDadosConhecidosPessoa,
  parsePessoa,
  PESSOA_ID_PREFIXO_CPF,
} from '@leela/core';
import {
  pessoaDocIdDoCpf,
  planejarPessoasDoCheckout,
} from '../checkout/pessoaRegistry';
import type { CreateInscricaoChargeInput } from '../checkout/createInscricaoCharge';

const PEPPER_TESTE = 'pepper-de-teste-ck2';

beforeEach(() => {
  process.env['CRM_ID_PEPPER'] = PEPPER_TESTE;
});
afterEach(() => {
  process.env['CRM_ID_PEPPER'] = PEPPER_TESTE;
});

function inputBase(extra: Partial<CreateInscricaoChargeInput> = {}): CreateInscricaoChargeInput {
  return {
    eventoId: 'evt-1',
    inscritos: [
      {
        nome: 'Ana Atleta',
        email: 'ana@exemplo.com.br',
        cpf: '529.982.247-25',
        modalidade: '10k',
        nascimento: '1990-05-17',
      },
      {
        nome: 'Bruno Convidado',
        email: 'bruno@exemplo.com.br',
        cpf: '168.995.350-09',
        modalidade: '10k',
      },
    ],
    responsavelIndex: 0,
    responsavel: {
      nome: 'Ana Atleta',
      email: 'ana@exemplo.com.br',
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
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: 'ck2-plano-0001',
    ...extra,
  };
}

describe('pessoaDocIdDoCpf (RN-173)', () => {
  it('determinístico e indiferente à máscara — mesma pessoa, mesma chave', () => {
    const a = pessoaDocIdDoCpf('529.982.247-25');
    const b = pessoaDocIdDoCpf('52998224725');
    expect(a).toBe(b);
    expect(a.startsWith(PESSOA_ID_PREFIXO_CPF)).toBe(true);
    expect(a).toMatch(/^cpf_[0-9a-f]{32}$/);
    // CPF nunca aparece no id (path sem PII)
    expect(a.includes('52998224725')).toBe(false);
  });

  it('CPFs distintos → chaves distintas; pepper distinto → chave distinta', () => {
    const a = pessoaDocIdDoCpf('52998224725');
    expect(pessoaDocIdDoCpf('16899535009')).not.toBe(a);
    process.env['CRM_ID_PEPPER'] = 'outro-pepper';
    expect(pessoaDocIdDoCpf('52998224725')).not.toBe(a);
  });

  it('fail-closed: sem pepper LANÇA (herda contrato do CRM A3)', () => {
    delete process.env['CRM_ID_PEPPER'];
    expect(() => pessoaDocIdDoCpf('52998224725')).toThrow(/CRM_ID_PEPPER/);
  });
});

describe('planejarPessoasDoCheckout (CK2-T1)', () => {
  it('uma entrada por CPF distinto + pessoaRef por inscrito + dados por papel', () => {
    const { planos, pessoaIdPorInscrito } = planejarPessoasDoCheckout(
      inputBase(),
      { uid: 'anon-1', ehAnonimo: true }
    );
    expect(planos).toHaveLength(2);
    expect(pessoaIdPorInscrito).toHaveLength(2);
    const planoAna = planos.find((p) => p.cpf === '52998224725');
    const planoBruno = planos.find((p) => p.cpf === '16899535009');
    expect(planoAna).toBeDefined();
    expect(planoBruno).toBeDefined();
    // Responsável: telefone canônico + endereço canônico entram nos dados
    expect(planoAna?.dados.telefone).toBe('48999990001');
    expect(planoAna?.dados.endereco?.cep).toBe('88015600');
    expect(planoAna?.dados.nascimento).toBe('1990-05-17');
    // Convidado: NUNCA telefone/endereço do responsável (PII do pagador)
    expect(planoBruno?.dados.telefone).toBeUndefined();
    expect(planoBruno?.dados.endereco).toBeUndefined();
    // Anônimo NUNCA reivindica conta
    expect(planoAna?.claimContaUid).toBeUndefined();
    expect(pessoaIdPorInscrito[0]).toBe(planoAna?.pessoaId);
    expect(pessoaIdPorInscrito[1]).toBe(planoBruno?.pessoaId);
  });

  it('caller autenticado NÃO-anônimo reivindica conta SÓ na própria inscrição de responsável', () => {
    const { planos } = planejarPessoasDoCheckout(inputBase(), {
      uid: 'conta-ana',
      ehAnonimo: false,
    });
    const planoAna = planos.find((p) => p.cpf === '52998224725');
    const planoBruno = planos.find((p) => p.cpf === '16899535009');
    expect(planoAna?.claimContaUid).toBe('conta-ana');
    expect(planoBruno?.claimContaUid).toBeUndefined();
  });

  it('ehAnonimo ausente (chamador legado) = fail-safe: sem claim', () => {
    const { planos } = planejarPessoasDoCheckout(inputBase(), { uid: 'x' });
    expect(planos.every((p) => p.claimContaUid === undefined)).toBe(true);
  });

  it('compra para terceiros (sem responsavelIndex): nenhum claim, endereço em ninguém', () => {
    const input = inputBase();
    delete input.responsavelIndex;
    const { planos } = planejarPessoasDoCheckout(input, {
      uid: 'conta-ana',
      ehAnonimo: false,
    });
    expect(planos.every((p) => p.claimContaUid === undefined)).toBe(true);
    expect(planos.every((p) => p.dados.endereco === undefined)).toBe(true);
  });

  it('mesmo CPF repetido no pedido colapsa numa entrada (não duplica plano)', () => {
    const input = inputBase();
    input.inscritos = [
      input.inscritos[0] as never,
      { ...(input.inscritos[0] as object), nome: 'Ana Corrigida' } as never,
    ];
    const { planos, pessoaIdPorInscrito } = planejarPessoasDoCheckout(input, {
      uid: 'anon-1',
      ehAnonimo: true,
    });
    expect(planos).toHaveLength(1);
    expect(pessoaIdPorInscrito[0]).toBe(pessoaIdPorInscrito[1]);
    expect(planos[0]?.dados.nome).toBe('Ana Corrigida'); // última ocorrência vence
  });
});

describe('mesclarDadosConhecidosPessoa (core)', () => {
  it('campo novo não-vazio vence; vazio/ausente preserva o vigente', () => {
    const atual = {
      nome: 'Ana',
      genero: 'feminino' as const,
      nascimento: '1990-05-17',
      telefone: '48999990001',
    };
    const m = mesclarDadosConhecidosPessoa(atual, {
      nome: '',
      telefone: '48988887777',
    });
    expect(m.nome).toBe('Ana');
    expect(m.telefone).toBe('48988887777');
    expect(m.nascimento).toBe('1990-05-17');
    expect(m.genero).toBe('feminino');
  });

  it('genero nao_informado NÃO apaga declaração anterior (respeita quem não declara)', () => {
    const m = mesclarDadosConhecidosPessoa(
      { nome: 'A', genero: 'feminino', nascimento: '', telefone: '' },
      { genero: 'nao_informado' }
    );
    expect(m.genero).toBe('feminino');
  });

  it('sem vigente: nasce com defaults Postel', () => {
    const m = mesclarDadosConhecidosPessoa(undefined, { nome: 'Bruno' });
    expect(m).toEqual({
      nome: 'Bruno',
      genero: 'nao_informado',
      nascimento: '',
      telefone: '',
    });
  });
});

describe('parsePessoa (core — fail-fast)', () => {
  const docOk = () => ({
    cpf: '52998224725',
    contaUid: null,
    dadosConhecidos: {
      nome: 'Ana',
      genero: 'feminino',
      nascimento: '1990-05-17',
      telefone: '48999990001',
    },
    criadoEm: { seconds: 1, nanoseconds: 0 },
    atualizadoEm: { seconds: 1, nanoseconds: 0 },
  });

  it('doc válido parseia; contaUid null e string aceitos', () => {
    const p = parsePessoa('cpf_x', docOk());
    expect(p.cpf).toBe('52998224725');
    expect(p.contaUid).toBeNull();
    expect(p.dadosConhecidos?.genero).toBe('feminino');
    const comConta = parsePessoa('cpf_x', { ...docOk(), contaUid: 'uid-1' });
    expect(comConta.contaUid).toBe('uid-1');
  });

  it('cpf inválido / contaUid vazio / genero fora do enum lançam', () => {
    expect(() => parsePessoa('x', { ...docOk(), cpf: '123' })).toThrow(/cpf/);
    expect(() => parsePessoa('x', { ...docOk(), contaUid: '' })).toThrow(/contaUid/);
    expect(() =>
      parsePessoa('x', {
        ...docOk(),
        dadosConhecidos: { nome: 'A', genero: 'alien', nascimento: '', telefone: '' },
      })
    ).toThrow(/genero/);
  });
});
