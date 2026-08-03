// =============================================================================
// PROVA da S1215-T3 (RN-431/432 · D-KC-9/D-KC-10) — a faixa do cupom depois da
// Hero e a verificação server-side que a alimenta.
//
// Este arquivo cobre os vetores da review antagonista que se provam sem
// emulator (o Firestore entra como duplo, e é o duplo que CONTA as leituras):
//
//   ⚔ 7  — sem oráculo: inexistente, expirado, esgotado, escopo não satisfeito
//          e de outro evento devolvem resposta IDÊNTICA.
//   ⚔ 8  — nada além do nome sai do afiliado.
//   ⚔ 9  — cupom de escopo club_parceiro respeita a parceria (RN-364 intacta).
//   ⚔ 11 — o número continua sendo do servidor: a faixa não exibe valor.
//   ⚔ 12 — custo de raspagem: com o cache curto ligado, uma sequência de
//          tentativas no MESMO código não vira sequência de leituras.
//
// Os vetores 6 (Rules intocadas) e 10 (página estática) são medidos fora do
// vitest — diff das Rules e saída do `next build` — e estão no handoff.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

// ── Duplo do Firestore: conta CADA `.get()` por path ────────────────────────
const docs = new Map<string, Record<string, unknown>>();
const leituras: string[] = [];

function snapshotDe(path: string) {
  const data = docs.get(path);
  return {
    exists: data !== undefined,
    id: path.split('/').pop() ?? '',
    data: () => data,
    get: (campo: string) => data?.[campo],
  };
}

function docRef(path: string) {
  return {
    path,
    get: async () => {
      leituras.push(path);
      return snapshotDe(path);
    },
    collection: (nome: string) => colecaoRef(`${path}/${nome}`),
  };
}

function colecaoRef(path: string) {
  return { doc: (id: string) => docRef(`${path}/${id}`) };
}

const dbFake = {
  collection: (nome: string) => colecaoRef(nome),
  doc: (path: string) => docRef(path),
};

vi.mock('@/lib/firebaseAdmin', () => ({
  getDb: () => dbFake,
}));

// Querystring controlável para a faixa (client component).
let queryAtual = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => queryAtual,
}));

// A ação de servidor é substituída pelo módulo de leitura direto: o que
// interessa provar aqui é o CONTRATO da resposta, não o transporte do Next.
vi.mock('../app/(public)/[eventSlug]/sections/verificarCupomLink', () => ({
  verificarCupomLinkAction: (slug: string, codigo: string) =>
    verificarCupomDoLink(slug, codigo),
}));

import {
  limparCacheCupomLink,
  verificarCupomDoLink,
  type CupomDoLinkPublico,
} from '@/lib/leitor';
import { CupomLinkBanner } from '../app/(public)/[eventSlug]/sections/CupomLinkBanner';

const SLUG = 'meia-floripa-2026';
const TENANT = 'castelo-producoes';
const DIA = 24 * 60 * 60 * 1000;

function ts(offsetDias: number) {
  const millis = Date.now() + offsetDias * DIA;
  return { toMillis: () => millis, toDate: () => new Date(millis) };
}

function semearEvento(status = 'publicado'): void {
  docs.set(`eventos/${SLUG}`, { status, tenantId: TENANT, nome: 'Meia de Floripa' });
}

function semearCupom(codigo: string, over: Record<string, unknown> = {}): void {
  docs.set(`eventos/${SLUG}/cupons/${codigo}`, {
    tenantId: TENANT,
    codigo,
    tipo: 'percentual',
    valor: 10,
    tetoUso: null,
    usos: 0,
    inicioEm: ts(-30),
    fimEm: ts(30),
    ...over,
  });
}

function semearAfiliado(ref: string, over: Record<string, unknown> = {}): void {
  docs.set(`eventos/${SLUG}/afiliados/${ref}`, {
    tenantId: TENANT,
    nome: 'Dioney Corredor',
    tipo: 'pessoa_fisica',
    status: 'ativo',
    minimoInscricoes: null,
    conversoes: 3,
    refCodigo: ref,
    documento: '12345678909',
    email: 'dioney@exemplo.test',
    telefone: '48999990000',
    uid: 'uid-dioney',
    comissao: { tipo: 'percentual', percentual: 12 },
    ...over,
  });
}

beforeEach(() => {
  docs.clear();
  leituras.length = 0;
  limparCacheCupomLink();
  queryAtual = new URLSearchParams();
});

afterEach(cleanup);

// ---------------------------------------------------------------------------

describe('S1215-T3 · ⚔ 7 — a verificação não vira oráculo (RN-432)', () => {
  it('cupom que se aplica devolve código e promotor', async () => {
    semearEvento();
    semearCupom('FLORIPA10', { afiliadoRef: 'DIONEY10' });
    semearAfiliado('DIONEY10');
    await expect(verificarCupomDoLink(SLUG, 'floripa10')).resolves.toEqual({
      codigo: 'FLORIPA10',
      promotor: 'Dioney Corredor',
    });
  });

  it('inexistente, expirado, esgotado, de outro evento e escopo não satisfeito respondem IGUAL', async () => {
    semearEvento();
    // expirado
    semearCupom('EXPIRADO', { inicioEm: ts(-60), fimEm: ts(-1) });
    // esgotado (teto atingido)
    semearCupom('ESGOTADO', { tetoUso: 5, usos: 5 });
    // de outro tenant — o mesmo efeito de "de outro evento"
    semearCupom('DEOUTRO', { tenantId: 'outro-tenant' });
    // escopo club_parceiro com a parceria DESATIVADA
    semearCupom('DOCLUBE', {
      escopo: 'club_parceiro',
      clubeRef: 'clube-x',
      parceriaRef: `tenants/${TENANT}/parceirosAssessoria/parceria-x`,
    });
    docs.set(`tenants/${TENANT}/parceirosAssessoria/parceria-x`, { status: 'inativa' });
    // cupom de afiliado com o GATE da RN-315 fechado
    semearCupom('ABAIXODOMIN', { afiliadoRef: 'NOVATO10' });
    semearAfiliado('NOVATO10', { minimoInscricoes: 20, conversoes: 3 });
    // documento envenenado (parse falha)
    semearCupom('PODRE', { valor: -1 });

    const respostas = await Promise.all(
      ['NAOEXISTE', 'EXPIRADO', 'ESGOTADO', 'DEOUTRO', 'DOCLUBE', 'ABAIXODOMIN', 'PODRE'].map((c) =>
        verificarCupomDoLink(SLUG, c),
      ),
    );
    // Byte a byte a MESMA resposta: nenhuma delas conta por que não colou.
    for (const r of respostas) expect(r).toBeNull();
    expect(new Set(respostas.map((r) => JSON.stringify(r))).size).toBe(1);
  });

  it('evento não publicado não tem faixa — o mesmo gate do resto do leitor', async () => {
    semearEvento('rascunho');
    semearCupom('FLORIPA10');
    await expect(verificarCupomDoLink(SLUG, 'FLORIPA10')).resolves.toBeNull();
  });

  it('código fora de forma nem chega a ler o Firestore', async () => {
    semearEvento();
    for (const bruto of ['', '  ', 'AB', 'COM ESPACO', 'X'.repeat(30)]) {
      await expect(verificarCupomDoLink(SLUG, bruto)).resolves.toBeNull();
    }
    expect(leituras).toHaveLength(0);
  });
});

describe('S1215-T3 · ⚔ 8/11 — o que a resposta carrega, e o que ela não carrega', () => {
  it('do afiliado sai o NOME e mais nada', async () => {
    semearEvento();
    semearCupom('FLORIPA10', { afiliadoRef: 'DIONEY10' });
    semearAfiliado('DIONEY10');
    const r = (await verificarCupomDoLink(SLUG, 'FLORIPA10')) as CupomDoLinkPublico;

    expect(Object.keys(r).sort()).toEqual(['codigo', 'promotor']);
    const serializado = JSON.stringify(r);
    for (const proibido of [
      '12345678909', // documento
      'dioney@exemplo.test', // e-mail
      '48999990000', // telefone
      'uid-dioney', // uid
      'percentual', // percentual de comissão
      '12', // valor da comissão
      'ativo', // estado do gate
    ]) {
      expect(serializado).not.toContain(proibido);
    }
  });

  it('nenhum valor de desconto sai — nem para o cupom que se aplica', async () => {
    semearEvento();
    semearCupom('FLORIPA10', { tipo: 'fixo', valor: 25 });
    const r = (await verificarCupomDoLink(SLUG, 'FLORIPA10')) as CupomDoLinkPublico;
    expect(r).toEqual({ codigo: 'FLORIPA10', promotor: null });
    expect(JSON.stringify(r)).not.toContain('25');
  });

  it('afiliado sem nome cadastrado degrada para a faixa sem "de Fulano"', async () => {
    semearEvento();
    semearCupom('FLORIPA10', { afiliadoRef: 'SEMNOME' });
    semearAfiliado('SEMNOME', { nome: '   ' });
    await expect(verificarCupomDoLink(SLUG, 'FLORIPA10')).resolves.toEqual({
      codigo: 'FLORIPA10',
      promotor: null,
    });
  });
});

describe('S1215-T3 · ⚔ 9 — o escopo de club parceiro respeita a parceria (RN-364)', () => {
  it('parceria ATIVA: o cupom se aplica', async () => {
    semearEvento();
    semearCupom('CLUBE10', {
      escopo: 'club_parceiro',
      clubeRef: 'clube-x',
      parceriaRef: `tenants/${TENANT}/parceirosAssessoria/parceria-x`,
    });
    docs.set(`tenants/${TENANT}/parceirosAssessoria/parceria-x`, { status: 'ativa' });
    await expect(verificarCupomDoLink(SLUG, 'CLUBE10')).resolves.toEqual({
      codigo: 'CLUBE10',
      promotor: null,
    });
  });

  it('parceriaRef de OUTRO tenant não resolve — path forjado não vira parceria', async () => {
    semearEvento();
    semearCupom('CLUBE10', {
      escopo: 'club_parceiro',
      clubeRef: 'clube-x',
      parceriaRef: 'tenants/outro-tenant/parceirosAssessoria/parceria-x',
    });
    docs.set('tenants/outro-tenant/parceirosAssessoria/parceria-x', { status: 'ativa' });
    await expect(verificarCupomDoLink(SLUG, 'CLUBE10')).resolves.toBeNull();
  });

  it('path ANINHADO com profundidade errada não resolve', async () => {
    semearEvento();
    semearCupom('CLUBE10', {
      escopo: 'club_parceiro',
      clubeRef: 'clube-x',
      parceriaRef: `tenants/${TENANT}/parceirosAssessoria/parceria-x/sub/doc`,
    });
    docs.set(`tenants/${TENANT}/parceirosAssessoria/parceria-x/sub/doc`, { status: 'ativa' });
    await expect(verificarCupomDoLink(SLUG, 'CLUBE10')).resolves.toBeNull();
  });
});

describe('S1215-T3 · ⚔ 12 — custo de raspagem com o cache curto ligado', () => {
  it('o MESMO código inválido, 50 vezes, custa as leituras de UMA vez', async () => {
    semearEvento();
    for (let i = 0; i < 50; i++) {
      await verificarCupomDoLink(SLUG, 'NAOEXISTE');
    }
    // 2 leituras: o evento e o cupom. As outras 49 tentativas bateram em cache.
    expect(leituras).toHaveLength(2);
  });

  it('o cache guarda a resposta NEGATIVA, que é justamente a do sondador', async () => {
    semearEvento();
    await verificarCupomDoLink(SLUG, 'NAOEXISTE');
    const depoisDaPrimeira = leituras.length;
    await verificarCupomDoLink(SLUG, 'NAOEXISTE');
    expect(leituras).toHaveLength(depoisDaPrimeira);
  });

  it('códigos DIFERENTES continuam custando — o cache é por código, não um mudo geral', async () => {
    semearEvento();
    await verificarCupomDoLink(SLUG, 'CODIGOA');
    await verificarCupomDoLink(SLUG, 'CODIGOB');
    expect(leituras.length).toBeGreaterThan(2);
  });
});

describe('S1215-T3 · a faixa (RN-431 · D-KC-9)', () => {
  async function montarFaixa(query: string): Promise<void> {
    queryAtual = new URLSearchParams(query);
    render(<CupomLinkBanner slug={SLUG} />);
  }

  it('cupom que se aplica: a faixa aparece com o código e quem indicou', async () => {
    semearEvento();
    semearCupom('FLORIPA10', { afiliadoRef: 'DIONEY10' });
    semearAfiliado('DIONEY10');
    await montarFaixa('cupom=floripa10');

    const faixa = await screen.findByRole('status');
    expect(faixa.textContent).toMatch(/Você tem desconto neste evento/i);
    expect(faixa.textContent).toContain('FLORIPA10');
    expect(faixa.textContent).toContain('Dioney Corredor');
    // ⚔ 11: nenhum número de dinheiro na faixa.
    expect(faixa.textContent).not.toMatch(/R\$/);
    expect(faixa.textContent).not.toMatch(/%/);
  });

  it('sem nome resolvível, degrada para o código sozinho e continua útil', async () => {
    semearEvento();
    semearCupom('GERAL10');
    await montarFaixa('cupom=GERAL10');

    const faixa = await screen.findByRole('status');
    expect(faixa.textContent).toContain('GERAL10');
    expect(faixa.textContent).not.toMatch(/ de /);
  });

  it('`?c=` também acende a faixa (RN-429)', async () => {
    semearEvento();
    semearCupom('HEROI10');
    await montarFaixa('c=heroi10');
    expect((await screen.findByRole('status')).textContent).toContain('HEROI10');
  });

  it('cupom que NÃO se aplica: silêncio — nenhum erro na landing (RN-431)', async () => {
    semearEvento();
    await montarFaixa('cupom=NAOEXISTE');
    await waitFor(() => expect(leituras.length).toBeGreaterThan(0));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('sem cupom na URL, a faixa não existe e NADA é lido — visita normal custa zero', async () => {
    semearEvento();
    await montarFaixa('utm_source=instagram');
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(leituras).toHaveLength(0);
  });
});
