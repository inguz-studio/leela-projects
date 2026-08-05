/**
 * clubesEConvites.integration.test.ts — S1222-T4 · RN-451 (sobre RN-316 e E18)
 *
 * `getMeusClubesEConvites` contra o Firestore Emulator DA LANE (host/porta de
 * `FIRESTORE_EMULATOR_HOST`, exportado pelo `emulators:exec` — rodar em porta
 * alheia é o que faz duas lanes se atropelarem).
 *
 * O que este arquivo tem de provar, na letra do aceite da fila:
 *
 *   1. a caixa lista convites da PRÓPRIA conta, das DUAS máquinas
 *      (`/convite/afiliado` · RN-316 e `/convite` · E18);
 *   2. nenhum caminho novo de credencial: NADA que o servidor devolva permite
 *      montar o link de aceite. Falsificação: mandar o token, o hash ou o
 *      `refCodigo`/`parceriaId` na resposta mata este caso;
 *   3. o gate é o MESMO das outras callables da área — anônimo e e-mail não
 *      verificado têm estado próprio, e sem sessão é `unauthenticated`;
 *   4. `clubes/{id}/membros` continua NEGADA ao token `athlete` pelo SDK: a
 *      leitura da área não abriu Rule nenhuma;
 *   5. corte de lista é DECLARADO (`clubesCompletos`/`convitesCompletos`), e
 *      não silencioso — a lição da F1/D4 desta rodada;
 *   6. o convite de MEMBRO COMUM de clube (E05-S104, sem `origem`) e o convite
 *      de DESAFIO (`desafios/{id}/convites/{uid}`, mesmo nome de coleção no
 *      collectionGroup) NÃO vazam para a caixa.
 */

import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { collection, getDocs, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  getMeusClubesEConvitesCore,
  TETO_CLUBES_DA_CONTA,
  TETO_CONVITES_DA_CONTA,
} from '../cliente/meusClubes';
import type { CallerAreaCliente } from '../cliente/gateAreaCliente';

const PROJECT_ID = 'demo-leela-b4clubes';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const EMULATOR_HOST_PORT = process.env['FIRESTORE_EMULATOR_HOST'] ?? 'localhost:8080';
const [EMULATOR_HOST, EMULATOR_PORT] = ((): [string, number] => {
  const i = EMULATOR_HOST_PORT.lastIndexOf(':');
  return [EMULATOR_HOST_PORT.slice(0, i), Number.parseInt(EMULATOR_HOST_PORT.slice(i + 1), 10)];
})();

const TENANT_ID = 'castelo-producoes';
const EVENTO = 'meia-floripa-2027';
const DESAFIO = 'desafio-90-dias';

const ANA_UID = 'conta-ana-b4';
const ANA_EMAIL = 'ana@example.com';
const BRUNO_UID = 'conta-bruno-b4';
const BRUNO_EMAIL = 'bruno@example.com';
/** Conta sem clube e sem convite — o "ok + vazio" que não pode mentir. */
const CLARA_UID = 'conta-clara-b4';
const CLARA_EMAIL = 'clara@example.com';

const CLUBE_ANA = 'clube-corrida-noturna';
const CLUBE_PRIVADO = 'clube-fechado-dos-amigos';
const CLUBE_BRUNO = 'clube-do-bruno';
const CLUBE_ASSESSORIA = 'assessoria-alfa';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

const DIA_MS = 24 * 60 * 60 * 1000;
const AGORA = Date.parse('2026-08-05T12:00:00.000Z');
const AGORA_DATE = new Date(AGORA);
const ts = (ms: number): Timestamp => Timestamp.fromMillis(ms);

function caller(over: Partial<CallerAreaCliente> = {}): CallerAreaCliente {
  return {
    uid: ANA_UID,
    ehAnonimo: false,
    email: ANA_EMAIL,
    emailVerificado: true,
    ...over,
  };
}

function dbComo(uid: string, claims: Record<string, unknown> = {}): Firestore {
  return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: EMULATOR_HOST,
      port: EMULATOR_PORT,
    },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
  await semear();
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

async function semear(): Promise<void> {
  const agora = FieldValue.serverTimestamp();
  const b = db.batch();

  b.set(db.doc(`eventos/${EVENTO}`), {
    id: EVENTO,
    tenantId: TENANT_ID,
    organizadorId: 'prof-marina',
    nome: 'Meia de Floripa 2027',
    slug: EVENTO,
    data: ts(AGORA + 60 * DIA_MS),
    local: 'Florianópolis, SC',
    modalidades: ['21k'],
    status: 'publicado',
    usaChip: true,
    criadoEm: agora,
    atualizadoEm: agora,
  });

  // ── Clubes ──────────────────────────────────────────────────────────────
  for (const [id, nome, visibilidade] of [
    [CLUBE_ANA, 'Corrida Noturna', 'publica'],
    // Clube PRIVADO: o cliente não lê o doc pelo SDK, então o nome só chega à
    // tela se o callable resolvê-lo com Admin SDK.
    [CLUBE_PRIVADO, 'Amigos do Sábado', 'privada'],
    [CLUBE_BRUNO, 'Clube do Bruno', 'publica'],
    [CLUBE_ASSESSORIA, 'Assessoria Alfa', 'publica'],
  ] as const) {
    b.set(db.doc(`clubes/${id}`), {
      id,
      tenantId: TENANT_ID,
      nome,
      slug: id,
      visibilidade,
      modeloEntrada: 'gratuito',
      ownerId: 'prof-marina',
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  // ── Membros (o docId NÃO é o uid — o vínculo é o campo `atletaId`) ───────
  b.set(db.doc(`clubes/${CLUBE_ANA}/membros/m-ana-1`), {
    id: 'm-ana-1',
    tenantId: TENANT_ID,
    atletaId: ANA_UID,
    atletaNome: 'Ana',
    papel: 'membro',
    entrouVia: 'codigo',
    entrouEm: ts(AGORA - 100 * DIA_MS),
    status: 'ativo',
  });
  b.set(db.doc(`clubes/${CLUBE_PRIVADO}/membros/m-ana-2`), {
    id: 'm-ana-2',
    tenantId: TENANT_ID,
    atletaId: ANA_UID,
    atletaNome: 'Ana',
    papel: 'owner',
    entrouVia: 'link',
    entrouEm: ts(AGORA - 3 * DIA_MS),
    status: 'novo',
  });
  // Vínculo de OUTRA pessoa, no mesmo clube — o isolamento sob ataque.
  b.set(db.doc(`clubes/${CLUBE_ANA}/membros/m-bruno-1`), {
    id: 'm-bruno-1',
    tenantId: TENANT_ID,
    atletaId: BRUNO_UID,
    atletaNome: 'Bruno',
    papel: 'membro',
    entrouVia: 'convite',
    entrouEm: ts(AGORA - 10 * DIA_MS),
    status: 'ativo',
  });

  // ── Convite de INFLUENCIADOR (RN-316) ───────────────────────────────────
  b.set(db.doc(`eventos/${EVENTO}/afiliados/ANAINFLU`), {
    id: 'ANAINFLU',
    tenantId: TENANT_ID,
    eventoId: EVENTO,
    tipo: 'pessoa_fisica',
    status: 'convite_pendente',
    nome: 'Ana Influencer',
    refCodigo: 'ANAINFLU',
    janelaAtribuicaoDias: 7,
    minimoInscricoes: null,
    cupomCodigo: null,
    responsavelEmail: ANA_EMAIL,
    tokenAceiteHash: 'a'.repeat(64),
    expiraEm: ts(AGORA + 5 * DIA_MS),
    conversoes: 0,
    valorAtribuido: 0,
    criadoEm: ts(AGORA - 1 * DIA_MS),
    atualizadoEm: agora,
  });
  // EXPIRADO — some da caixa? não: a caixa diz que venceu (RN-451).
  b.set(db.doc(`eventos/${EVENTO}/afiliados/ANAVELHO`), {
    id: 'ANAVELHO',
    tenantId: TENANT_ID,
    eventoId: EVENTO,
    tipo: 'pessoa_fisica',
    status: 'convite_pendente',
    nome: 'Ana Influencer',
    refCodigo: 'ANAVELHO',
    janelaAtribuicaoDias: 7,
    minimoInscricoes: null,
    cupomCodigo: null,
    responsavelEmail: ANA_EMAIL,
    tokenAceiteHash: 'b'.repeat(64),
    expiraEm: ts(AGORA - 2 * DIA_MS),
    conversoes: 0,
    valorAtribuido: 0,
    criadoEm: ts(AGORA - 30 * DIA_MS),
    atualizadoEm: agora,
  });
  // Convite de OUTRA pessoa — não pode aparecer na caixa da Ana.
  b.set(db.doc(`eventos/${EVENTO}/afiliados/BRUNOINF`), {
    id: 'BRUNOINF',
    tenantId: TENANT_ID,
    eventoId: EVENTO,
    tipo: 'pessoa_fisica',
    status: 'convite_pendente',
    nome: 'Bruno Influencer',
    refCodigo: 'BRUNOINF',
    janelaAtribuicaoDias: 7,
    minimoInscricoes: null,
    cupomCodigo: null,
    responsavelEmail: BRUNO_EMAIL,
    tokenAceiteHash: 'c'.repeat(64),
    expiraEm: ts(AGORA + 5 * DIA_MS),
    conversoes: 0,
    valorAtribuido: 0,
    criadoEm: ts(AGORA - 1 * DIA_MS),
    atualizadoEm: agora,
  });
  // Afiliado do tipo CLUBE carimbado com o e-mail da Ana: não é convite de
  // pessoa e não pode virar cartão na caixa dela.
  b.set(db.doc(`eventos/${EVENTO}/afiliados/CLUBEAFI`), {
    id: 'CLUBEAFI',
    tenantId: TENANT_ID,
    eventoId: EVENTO,
    tipo: 'clube',
    status: 'ativo',
    nome: 'Corrida Noturna',
    refCodigo: 'CLUBEAFI',
    janelaAtribuicaoDias: 7,
    minimoInscricoes: null,
    cupomCodigo: null,
    clubeRef: CLUBE_ANA,
    responsavelEmail: ANA_EMAIL,
    conversoes: 3,
    valorAtribuido: 300,
    criadoEm: ts(AGORA - 40 * DIA_MS),
    atualizadoEm: agora,
  });

  // ── Convite de PROMOTOR / assessoria parceira (E18) ──────────────────────
  b.set(db.doc(`clubes/${CLUBE_ASSESSORIA}/convites/${ANA_EMAIL}`), {
    email: ANA_EMAIL,
    tenantId: TENANT_ID,
    status: 'pendente',
    origem: 'assessoria_parceira',
    parceriaRef: `tenants/${TENANT_ID}/parceirosAssessoria/parc-ana`,
    convidadoPor: 'prof-marina',
    tokenAceiteHash: 'd'.repeat(64),
    expiraEm: ts(AGORA + 5 * DIA_MS),
    criadoEm: ts(AGORA - 2 * DIA_MS),
    enviadoEm: ts(AGORA - 2 * DIA_MS),
  });
  // Convite de MEMBRO COMUM de clube (E05-S104): MESMA coleção, SEM `origem`.
  // Não entra na caixa — não existe máquina de aceite para ele hoje.
  b.set(db.doc(`clubes/${CLUBE_ANA}/convites/${ANA_EMAIL}`), {
    email: ANA_EMAIL,
    tenantId: TENANT_ID,
    status: 'pendente',
    convidadoPor: 'prof-marina',
    criadoEm: ts(AGORA - 4 * DIA_MS),
    enviadoEm: ts(AGORA - 4 * DIA_MS),
  });
  // Convite de assessoria de OUTRA pessoa.
  b.set(db.doc(`clubes/${CLUBE_BRUNO}/convites/${BRUNO_EMAIL}`), {
    email: BRUNO_EMAIL,
    tenantId: TENANT_ID,
    status: 'pendente',
    origem: 'assessoria_parceira',
    parceriaRef: `tenants/${TENANT_ID}/parceirosAssessoria/parc-bruno`,
    convidadoPor: 'prof-marina',
    tokenAceiteHash: 'e'.repeat(64),
    expiraEm: ts(AGORA + 5 * DIA_MS),
    criadoEm: ts(AGORA - 2 * DIA_MS),
    enviadoEm: ts(AGORA - 2 * DIA_MS),
  });

  // ── A OUTRA subcoleção chamada `convites` (jornada) ──────────────────────
  // docId = uid, sem campo `email`. O collectionGroup alcança as duas.
  b.set(db.doc(`desafios/${DESAFIO}/convites/${ANA_UID}`), {
    convidadoPor: 'prof-marina',
    status: 'pendente',
    criadoEm: ts(AGORA - 1 * DIA_MS),
  });

  await b.commit();
}

describe('S1222-T4 · Meus Clubes', () => {
  it('lista SÓ os clubes da própria conta, inclusive o clube privado com nome', async () => {
    const r = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);

    expect(r.estado).toBe('ok');
    expect(r.clubesCompletos).toBe(true);
    // O vínculo do Bruno no MESMO clube não atravessa.
    expect(r.clubes).toHaveLength(2);
    const nomes = r.clubes.map((c) => c.nome);
    expect(nomes).toContain('Corrida Noturna');
    // O clube PRIVADO chega COM nome: o SDK do navegador não conseguiria lê-lo.
    expect(nomes).toContain('Amigos do Sábado');
  });

  it('o vínculo é o campo atletaId, não o docId do membro', async () => {
    // Os docs da Ana são `m-ana-1`/`m-ana-2` — nada no id os liga ao uid dela.
    const r = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);
    expect(r.clubes).toHaveLength(2);

    // E o do Bruno é lido pelo uid DELE, no mesmo clube.
    const rb = await getMeusClubesEConvitesCore(
      db,
      caller({ uid: BRUNO_UID, email: BRUNO_EMAIL }),
      AGORA_DATE
    );
    expect(rb.clubes.map((c) => c.nome)).toEqual(['Corrida Noturna']);
  });

  it('devolve papel, status e desde quando — o mais recente na frente', async () => {
    const r = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);
    expect(r.clubes[0]?.nome).toBe('Amigos do Sábado');
    expect(r.clubes[0]?.papel).toBe('owner');
    expect(r.clubes[0]?.status).toBe('novo');
    expect(r.clubes[0]?.entrouEmIso).toBe(new Date(AGORA - 3 * DIA_MS).toISOString());
    expect(r.clubes[1]?.papel).toBe('membro');
  });

  it('conta sem clube nenhum devolve ok com lista vazia — e isso é verdade', async () => {
    const r = await getMeusClubesEConvitesCore(
      db,
      caller({ uid: CLARA_UID, email: CLARA_EMAIL }),
      AGORA_DATE
    );
    expect(r.estado).toBe('ok');
    expect(r.clubes).toEqual([]);
    expect(r.convites).toEqual([]);
    expect(r.clubesCompletos).toBe(true);
    expect(r.convitesCompletos).toBe(true);
  });
});

describe('S1222-T4 · a caixa de convites, das DUAS máquinas', () => {
  it('lista o convite de influenciador (RN-316) e o de promotor (E18)', async () => {
    const r = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);
    const tipos = r.convites.map((c) => c.tipo);
    expect(tipos).toContain('influenciador');
    expect(tipos).toContain('promotor');

    const promotor = r.convites.find((c) => c.tipo === 'promotor');
    expect(promotor?.origemNome).toBe('Assessoria Alfa');
    expect(promotor?.estado).toBe('pendente');

    const influ = r.convites.find(
      (c) => c.tipo === 'influenciador' && c.estado === 'pendente'
    );
    expect(influ?.origemNome).toBe('Meia de Floripa 2027');
  });

  it('convite de OUTRA conta nunca entra na caixa', async () => {
    const r = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);
    expect(r.convites.map((c) => c.origemNome)).not.toContain('Clube do Bruno');
    // E o inverso vale: a caixa do Bruno tem o dele e não tem o da Ana.
    const rb = await getMeusClubesEConvitesCore(
      db,
      caller({ uid: BRUNO_UID, email: BRUNO_EMAIL }),
      AGORA_DATE
    );
    expect(rb.convites.map((c) => c.origemNome)).toContain('Clube do Bruno');
    expect(rb.convites.map((c) => c.origemNome)).not.toContain('Assessoria Alfa');
  });

  it('convite vencido aparece como expirado — sumir com ele seria a lista que mente', async () => {
    const r = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);
    const expirados = r.convites.filter((c) => c.estado === 'expirado');
    expect(expirados).toHaveLength(1);
    expect(expirados[0]?.tipo).toBe('influenciador');
  });

  it('pendente vem antes de expirado', async () => {
    const r = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);
    const iPendente = r.convites.findIndex((c) => c.estado === 'pendente');
    const iExpirado = r.convites.findIndex((c) => c.estado === 'expirado');
    expect(iPendente).toBeGreaterThanOrEqual(0);
    expect(iExpirado).toBeGreaterThan(iPendente);
  });

  it('afiliado do tipo CLUBE não vira convite de pessoa na caixa', async () => {
    const r = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);
    // `CLUBEAFI` está carimbado com o e-mail da Ana e é tipo 'clube'.
    const doClube = r.convites.filter((c) => c.origemNome === 'Corrida Noturna');
    expect(doClube).toEqual([]);
  });

  it('convite de MEMBRO COMUM de clube (sem origem) NÃO entra na caixa', async () => {
    const r = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);
    // O doc existe em `clubes/{CLUBE_ANA}/convites/{ana}` e é pendente.
    const doClubeAna = r.convites.filter(
      (c) => c.tipo === 'promotor' && c.origemNome === 'Corrida Noturna'
    );
    expect(doClubeAna).toEqual([]);
  });

  it('convite de DESAFIO não vaza pelo collectionGroup de mesmo nome', async () => {
    // `desafios/{id}/convites/{uid}` é outra entidade com o MESMO nome de
    // subcoleção. Nenhuma linha da caixa pode vir de fora de `clubes`.
    const r = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);
    expect(r.convites.every((c) => c.origemNome !== '' || c.tipo === 'influenciador')).toBe(
      true
    );
    // Prova direta: são exatamente 3 convites (2 influenciador + 1 promotor).
    expect(r.convites).toHaveLength(3);
  });
});

describe('S1222-T4 · nenhum caminho novo de credencial', () => {
  it('a resposta NÃO carrega token, hash, refCodigo nem parceriaId', async () => {
    const r = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);
    const serializado = JSON.stringify(r);

    // O aceite continua sendo o link do e-mail: se qualquer uma destas
    // aparecer, a área virou uma segunda superfície de credencial.
    expect(serializado).not.toContain('a'.repeat(64));
    expect(serializado).not.toContain('d'.repeat(64));
    expect(serializado).not.toContain('tokenAceiteHash');
    expect(serializado).not.toContain('ANAINFLU');
    expect(serializado).not.toContain('parc-ana');
    expect(serializado).not.toContain('parceirosAssessoria');
    expect(serializado.toLowerCase()).not.toContain('token');
  });

  it('a chave de render é opaca e estável entre leituras', async () => {
    const a = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);
    const b = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);
    expect(a.convites.map((c) => c.chave)).toEqual(b.convites.map((c) => c.chave));
    // Nenhuma chave revela caminho de documento.
    for (const c of [...a.clubes, ...a.convites]) {
      expect(c.chave).toMatch(/^[0-9a-f]{16}$/);
    }
  });

  it('a resposta não carrega o e-mail de ninguém', async () => {
    const r = await getMeusClubesEConvitesCore(db, caller(), AGORA_DATE);
    const serializado = JSON.stringify(r);
    expect(serializado).not.toContain(ANA_EMAIL);
    expect(serializado).not.toContain(BRUNO_EMAIL);
  });
});

describe('S1222-T4 · o gate é o mesmo das outras callables da área', () => {
  it('sessão anônima devolve estado próprio, nunca lista vazia', async () => {
    const r = await getMeusClubesEConvitesCore(db, caller({ ehAnonimo: true }), AGORA_DATE);
    expect(r.estado).toBe('sessao_anonima');
    expect(r.clubes).toEqual([]);
    expect(r.convites).toEqual([]);
  });

  it('e-mail não verificado devolve estado próprio, distinguível de "não há nada"', async () => {
    const r = await getMeusClubesEConvitesCore(
      db,
      caller({ emailVerificado: false }),
      AGORA_DATE
    );
    expect(r.estado).toBe('email_nao_verificado');
    expect(r.clubes).toEqual([]);
    // A Ana TEM clube e TEM convite: o vazio aqui é a pergunta não feita, e o
    // estado diz isso. Colapsar os dois produziria a tela que mente.
    expect(r.convites).toEqual([]);
  });

  it('token sem provedor declarado é tratado como anônimo (fail-closed)', async () => {
    const r = await getMeusClubesEConvitesCore(
      db,
      // `callerDoToken` já resolve isto; aqui o contrato é reafirmado.
      caller({ ehAnonimo: true, email: null, emailVerificado: false }),
      AGORA_DATE
    );
    expect(r.estado).toBe('sessao_anonima');
  });
});

describe('S1222-T4 · as Rules continuam fechadas (nenhuma foi tocada)', () => {
  it('token athlete NÃO lê clubes/{id}/membros pelo SDK', async () => {
    const cli = dbComo(ANA_UID, { role: 'athlete' });
    await assertFails(getDocs(collection(cli, `clubes/${CLUBE_ANA}/membros`)));
  });

  it('token athlete NÃO lê clubes/{id}/convites pelo SDK', async () => {
    const cli = dbComo(ANA_UID, { role: 'athlete' });
    await assertFails(getDocs(collection(cli, `clubes/${CLUBE_ASSESSORIA}/convites`)));
  });

  it('token athlete NÃO lê eventos/{id}/afiliados pelo SDK', async () => {
    const cli = dbComo(ANA_UID, { role: 'athlete' });
    await assertFails(getDocs(collection(cli, `eventos/${EVENTO}/afiliados`)));
  });
});

describe('S1222-T4 · corte de lista é DECLARADO (⚔ F1/D4 desta rodada)', () => {
  it('acima do teto de clubes, clubesCompletos vira false', async () => {
    const uid = 'conta-colecionadora-b4';
    const b = db.batch();
    for (let i = 0; i < TETO_CLUBES_DA_CONTA + 2; i++) {
      const clubeId = `clube-massa-${String(i).padStart(3, '0')}`;
      b.set(db.doc(`clubes/${clubeId}`), {
        id: clubeId,
        tenantId: TENANT_ID,
        nome: `Clube ${i}`,
        slug: clubeId,
        visibilidade: 'publica',
        modeloEntrada: 'gratuito',
        ownerId: 'prof-marina',
        criadoEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      b.set(db.doc(`clubes/${clubeId}/membros/m-massa`), {
        id: 'm-massa',
        tenantId: TENANT_ID,
        atletaId: uid,
        atletaNome: 'Colecionadora',
        papel: 'membro',
        entrouVia: 'codigo',
        entrouEm: ts(AGORA - i * DIA_MS),
        status: 'ativo',
      });
    }
    await b.commit();

    const r = await getMeusClubesEConvitesCore(
      db,
      caller({ uid, email: 'colecionadora@example.com' }),
      AGORA_DATE
    );
    expect(r.clubes).toHaveLength(TETO_CLUBES_DA_CONTA);
    // O corte NÃO é silencioso — foi este o defeito da F1 e do D4.
    expect(r.clubesCompletos).toBe(false);
    // E a caixa de convites não morre junto: são leituras independentes.
    expect(r.convitesCompletos).toBe(true);
  }, 60_000);

  it('o teto de convites existe e é declarado no contrato', () => {
    expect(TETO_CONVITES_DA_CONTA).toBeGreaterThan(0);
    expect(TETO_CLUBES_DA_CONTA).toBeGreaterThan(0);
  });
});
