/**
 * crmCore.test.ts — E19 · S-R9-13-T1 (RN-172 · P-E19-1/4/5/6)
 *
 * Kernel puro do CRM (@leela/core): identidade de linking, agregado fechado
 * sobre o ledger, idempotência (comparador) e parsing defensivo.
 * Aceites falsificáveis:
 *   - CPF mascarado ≠ formato produz a MESMA chave (linking determinístico);
 *   - fallback cpf → email → atletaId na ordem do default E19 #3;
 *   - LTV/valorGasto contam SÓ confirmadas (estornada fica no histórico);
 *   - valorGasto inclui taxaRepassada; ltv NÃO (P-E19-5);
 *   - identidade (nome/nascimento/gênero) = inscrição mais recente que TEM o
 *     campo; aniversário deriva mm-dd;
 *   - computeCrmCliente é determinística (mesma entrada ⇒ mesmo objeto);
 *   - parseCrmCliente rejeita status fora do enum e dinheiro inválido.
 */
import { describe, expect, it } from 'vitest';
import {
  computeCrmCliente,
  crmClienteInalterado,
  derivarIdentidadeCliente,
  parseCrmCliente,
  type CrmClienteDoc,
  type CrmInscricaoEntry,
} from '@leela/core';

function entry(over: Partial<CrmInscricaoEntry> = {}): CrmInscricaoEntry {
  return {
    eventoId: 'meia-floripa-2026',
    eventoNome: 'Meia de Floripa 2026',
    status: 'confirmado',
    valorPago: 189.9,
    taxaRepassada: 0,
    nome: 'Bruna Rocha',
    nascimento: '1993-04-12',
    genero: 'feminino',
    atualizadoEmMs: 1_000,
    ...over,
  };
}

describe('derivarIdentidadeCliente (P-E19-1)', () => {
  it('CPF com e sem máscara produz a MESMA chave normalizada', () => {
    const a = derivarIdentidadeCliente({ cpf: '529.982.247-25', atletaId: 'x' });
    const b = derivarIdentidadeCliente({ cpf: '52998224725', atletaId: 'y' });
    expect(a).toEqual({ tipo: 'cpf', valor: '52998224725' });
    expect(b).toEqual(a);
  });

  it('CPF inválido cai para e-mail normalizado (lowercase/trim)', () => {
    const id = derivarIdentidadeCliente({
      cpf: '111.111.111-11', // sequência — inválido
      email: '  Bruna.Rocha@Email.com ',
      atletaId: 'atleta-1',
    });
    expect(id).toEqual({ tipo: 'email', valor: 'bruna.rocha@email.com' });
  });

  it('sem CPF e sem e-mail plausível usa atletaId (último recurso)', () => {
    expect(
      derivarIdentidadeCliente({ email: 'não-é-email', atletaId: 'atleta-7' })
    ).toEqual({ tipo: 'atleta', valor: 'atleta-7' });
  });

  it('atletaId vazio é erro (inscrito corrompido — fail-fast)', () => {
    expect(() => derivarIdentidadeCliente({ atletaId: '' })).toThrow();
  });
});

describe('computeCrmCliente (P-E19-4/5/6)', () => {
  it('agrega LTV/valorGasto/contagens de confirmadas cross-evento', () => {
    const agregado = computeCrmCliente({
      'ev1_i1': entry({ valorPago: 189.9, taxaRepassada: 10.1 }),
      'ev2_i2': entry({
        eventoId: 'trail-serra-2026',
        eventoNome: 'Trail da Serra 2026',
        valorPago: 120,
        atualizadoEmMs: 2_000,
      }),
    });
    expect(agregado.qtdEventos).toBe(2);
    expect(agregado.qtdInscricoes).toBe(2);
    expect(agregado.ltv).toBe(309.9); // 189.90 + 120 — SEM taxa (P-E19-5)
    expect(agregado.valorGasto).toBe(320); // + taxaRepassada 10.10
    expect(agregado.eventos['ev1_i1'.split('_')[0] as string]).toBeUndefined();
    expect(agregado.eventos['meia-floripa-2026']?.valorPago).toBe(189.9);
    expect(agregado.eventos['trail-serra-2026']?.qtdInscricoes).toBe(1);
  });

  it('estornada fica no histórico mas FORA de ltv/valorGasto/qtdEventos', () => {
    const agregado = computeCrmCliente({
      'ev1_i1': entry({ status: 'estornado', valorPago: 189.9 }),
    });
    expect(agregado.ltv).toBe(0);
    expect(agregado.valorGasto).toBe(0);
    expect(agregado.qtdEventos).toBe(0);
    expect(agregado.qtdInscricoes).toBe(0);
    expect(agregado.eventos['meia-floripa-2026']?.qtdEstornadas).toBe(1);
  });

  it('identidade vem da inscrição mais recente que TEM o campo', () => {
    const agregado = computeCrmCliente({
      'ev1_i1': entry({
        nome: 'Bruna R.',
        nascimento: '1993-04-12',
        genero: 'feminino',
        atualizadoEmMs: 1_000,
      }),
      // Mais recente, sem [reg]: nome vence; nascimento/gênero caem na antiga
      'ev2_i2': entry({
        eventoId: 'ev2',
        nome: 'Bruna Rocha',
        nascimento: null,
        genero: null,
        atualizadoEmMs: 5_000,
      }),
    });
    expect(agregado.nome).toBe('Bruna Rocha');
    expect(agregado.nascimento).toBe('1993-04-12');
    expect(agregado.genero).toBe('feminino');
    expect(agregado.aniversario).toBe('04-12');
  });

  it('sem nenhum [reg]: nascimento/gênero/aniversário nulos (honesto)', () => {
    const agregado = computeCrmCliente({
      'ev1_i1': entry({ nascimento: null, genero: null }),
    });
    expect(agregado.nascimento).toBeNull();
    expect(agregado.genero).toBeNull();
    expect(agregado.aniversario).toBeNull();
  });

  it('é determinística e o comparador prova o no-op', () => {
    const ledger = {
      'ev1_i1': entry(),
      'ev2_i2': entry({ eventoId: 'ev2', atualizadoEmMs: 2_000 }),
    };
    const a = computeCrmCliente(ledger);
    const b = computeCrmCliente({ ...ledger });
    const docA: CrmClienteDoc = {
      tenantId: 't1', chaveTipo: 'cpf', inscricoes: ledger, ...a,
    };
    const docB: CrmClienteDoc = {
      tenantId: 't1', chaveTipo: 'cpf', inscricoes: { ...ledger }, ...b,
    };
    expect(crmClienteInalterado(docA, docB)).toBe(true);
    // Mudança de 1 centavo derruba o no-op
    docB.inscricoes = {
      ...ledger,
      'ev1_i1': entry({ valorPago: 189.91 }),
    };
    expect(crmClienteInalterado(docA, docB)).toBe(false);
  });

  it('ledger vazio lança (doc deve ser removido, nunca zerado)', () => {
    expect(() => computeCrmCliente({})).toThrow();
  });
});

describe('parseCrmCliente (fail-fast)', () => {
  const docValido = (): Record<string, unknown> => {
    const inscricoes = { 'ev1_i1': entry() };
    const agregado = computeCrmCliente(inscricoes);
    return { tenantId: 't1', chaveTipo: 'cpf', inscricoes, ...agregado };
  };

  it('roundtrip do doc válido', () => {
    const doc = parseCrmCliente('cpf_abc', docValido());
    expect(doc.ltv).toBe(189.9);
    expect(doc.chaveTipo).toBe('cpf');
    expect(doc.inscricoes['ev1_i1']?.status).toBe('confirmado');
  });

  it('status fora do enum CRM lança (pendente não constrói perfil)', () => {
    const raw = docValido();
    (raw['inscricoes'] as Record<string, Record<string, unknown>>)[
      'ev1_i1'
    ] = { ...entry(), status: 'pendente' };
    expect(() => parseCrmCliente('k', raw)).toThrow(/enum CRM/);
  });

  it('dinheiro inválido (negativo/NaN) lança', () => {
    const raw = docValido();
    raw['ltv'] = -1;
    expect(() => parseCrmCliente('k', raw)).toThrow(/ltv/);
    const raw2 = docValido();
    raw2['valorGasto'] = Number.NaN;
    expect(() => parseCrmCliente('k', raw2)).toThrow(/valorGasto/);
  });

  it('chaveTipo fora do enum lança', () => {
    const raw = docValido();
    raw['chaveTipo'] = 'telefone';
    expect(() => parseCrmCliente('k', raw)).toThrow(/chaveTipo/);
  });
});
