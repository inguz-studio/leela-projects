// =============================================================================
// apps/landing/lib/leitorPerfil.ts
//
// Leitor PÚBLICO server-side do PERFIL (Admin SDK) — S1700-T1, mesma
// disciplina do leitor de evento (lib/leitor.ts):
//   - o Admin SDK BYPASSA as Security Rules → o gate de visibilidade
//     (RN-161) mora AQUI, via `projetarPerfilPublico` (@leela/core):
//     `privada`/inexistente ⇒ `null` ⇒ 404 público honesto;
//   - a projeção é ALLOWLIST (core): `ownerUid`/`tenantId` NUNCA atravessam
//     esta fronteira — o que a página recebe já é o shape público sem PII;
//   - resiliência de build: try/catch ⇒ null/[] (o `next build` sem emulator
//     renderiza 404/EmptyState e a ISR revalida com dado real em runtime).
//
// Listas derivadas (E17 §modelo): NUNCA escritas à mão — a aba Eventos deriva
// de `eventos` (tenantId + status público, reusa o leitor da home) e a aba
// Clubs de `clubes` (tenantId + visibilidade RN-140/165). Clube `privada`
// não vaza; evento `rascunho` não aparece.
// =============================================================================

import {
  HANDLE_RE,
  isUrlCapaValida,
  projetarPerfilPublico,
  COLECAO_PERFIS,
  type PerfilPublico,
} from '@leela/core';
import { getDb } from './firebaseAdmin';
import { listarEventosPublicadosDoTenant } from './leitor';
import { ehPreview, PREVIEW_ORG_HANDLE, PATROCINADORES_MOCK_NOMES } from './mockImagem';
import type { EventoResumo } from './tipos';

/** Resumo público de clube na aba Clubs do perfil (RN-165). */
export interface ClubeResumoPublico {
  slug: string;
  nome: string;
  categoria: string;
  modalidade: string;
  qtdMembrosAtivos: number;
  imagemUrl?: string;
}

/**
 * Patrocinador PÚBLICO exibido na faixa de patrocinadores da página do
 * organizador (LEELA-R12 · adendo do Vitor). Só o mínimo público — `nome` +
 * `logoUrl` 1:1 (RN-123/RN-171). NUNCA campos comerciais (valorAnual,
 * contrapartida, contratoUrl). `logoUrl` opcional ⇒ a UI cai no monograma.
 */
export interface PatrocinadorPublico {
  nome: string;
  logoUrl?: string;
}

/** Perfil público completo — projeção + listas derivadas (S1700). */
export interface PerfilPublicoCompleto {
  perfil: PerfilPublico;
  eventos: EventoResumo[];
  clubes: ClubeResumoPublico[];
  patrocinadores: PatrocinadorPublico[];
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * Clubes PÚBLICOS do tenant (visibilidade publica/indexavel — RN-140/165).
 * `[]` honesto em falha. ⚠️ Deploy real exige índice composto
 * `clubes(tenantId, visibilidade)` — emulator cria automático.
 */
async function listarClubesPublicosDoTenant(
  tenantId: string,
): Promise<ClubeResumoPublico[]> {
  try {
    const db = getDb();
    const snap = await db
      .collection('clubes')
      .where('tenantId', '==', tenantId)
      .where('visibilidade', 'in', ['publica', 'indexavel'])
      .get();

    return snap.docs
      .map((doc) => {
        const data = doc.data();
        const nome = texto(data['nome']);
        if (nome.length === 0) return null;
        // Capa do clube (RN-166 · S1702-T1): mesma guarda http(s) do evento
        const imagemUrlRaw = data['imagemUrl'];
        const qtd = data['qtdMembrosAtivos'];
        return {
          slug: doc.id,
          nome,
          categoria: texto(data['categoria']),
          modalidade: texto(data['modalidade']),
          qtdMembrosAtivos: typeof qtd === 'number' && Number.isFinite(qtd) ? qtd : 0,
          ...(isUrlCapaValida(imagemUrlRaw) ? { imagemUrl: imagemUrlRaw } : {}),
        } satisfies ClubeResumoPublico;
      })
      .filter((c): c is ClubeResumoPublico => c !== null)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  } catch (err) {
    console.error('[leitorPerfil] listarClubesPublicosDoTenant falhou', err);
    return [];
  }
}

/**
 * Patrocinadores PÚBLICOS ativos do tenant (faixa de logos da página do
 * organizador — R12 adendo). Fonte: `parcerias` (subcoleção dos clubes,
 * `tipo=patrocinador`, `status=ativa`), via collectionGroup filtrado por
 * `tenantId` (propagado ADR-009). Projeta SÓ `{nome, logoUrl?}` — allowlist
 * explícita, nada comercial cruza. Dedup por nome (case-insensitive). `[]`
 * honesto em falha ⇒ a faixa some sem estado vazio. `logoUrl` passa pela mesma
 * guarda http(s) (RN-153) — logo inválida cai no monograma na UI.
 * ⚠️ Deploy real exige índice collectionGroup `parcerias(tenantId, tipo,
 * status)` — emulator cria automático; registrado como pendência operacional.
 */
async function listarPatrocinadoresPublicosDoTenant(
  tenantId: string,
): Promise<PatrocinadorPublico[]> {
  try {
    const db = getDb();
    const snap = await db
      .collectionGroup('parcerias')
      .where('tenantId', '==', tenantId)
      .where('tipo', '==', 'patrocinador')
      .where('status', '==', 'ativa')
      .get();

    const vistos = new Set<string>();
    const patrocinadores: PatrocinadorPublico[] = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      const nome = texto(data['nome']).trim();
      if (nome.length === 0) continue;
      const chave = nome.toLowerCase();
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      const logoUrlRaw = data['logoUrl'];
      patrocinadores.push({
        nome,
        ...(isUrlCapaValida(logoUrlRaw) ? { logoUrl: logoUrlRaw } : {}),
      });
    }
    const ordenados = patrocinadores.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    // Adendo 13 (R12-FIX2): no PREVIEW a faixa não some por falta de parceria
    // seedada — cai em patrocinadores de EXEMPLO (logo 1:1 mock por nome). Em
    // produção sem emulator, `[]` = faixa oculta (honesto).
    if (ordenados.length === 0 && ehPreview()) return patrocinadoresMock();
    return ordenados;
  } catch (err) {
    console.error('[leitorPerfil] listarPatrocinadoresPublicosDoTenant falhou', err);
    return ehPreview() ? patrocinadoresMock() : [];
  }
}

/** Patrocinadores de EXEMPLO (preview) — sem logoUrl ⇒ a UI usa o logo 1:1 mock. */
function patrocinadoresMock(): PatrocinadorPublico[] {
  return PATROCINADORES_MOCK_NOMES.map((nome) => ({ nome }));
}

/**
 * Perfil de organizador de EXEMPLO (preview) — página do handle mock para onde o
 * bloco "Organizado por" aponta quando não há perfil seedado. Sem avatarUrl/
 * imagemUrl (⇒ a UI usa os mocks brasa); timeline vazia (EmptyState) + faixa de
 * patrocinadores mock. É clean de PII (dado inventado, sem tenant real).
 */
function perfilMockPreview(): PerfilPublicoCompleto {
  return {
    perfil: {
      handle: PREVIEW_ORG_HANDLE,
      nome: 'Organização Exemplo',
      bio: 'Organizador de exemplo (preview) — os eventos e patrocinadores reais aparecem aqui.',
      indexavel: false,
      linksExternos: [],
    },
    eventos: [],
    clubes: [],
    patrocinadores: patrocinadoresMock(),
  };
}

/**
 * Perfil público por handle — projeção sem PII + abas derivadas, ou `null`
 * (⇒ 404) quando o handle é inválido/inexistente ou o perfil é `privada`.
 */
export async function getPublicPerfil(
  rawHandle: string,
): Promise<PerfilPublicoCompleto | null> {
  try {
    // A rota já removeu o `@` do segmento — aqui SÓ minúsculas + formato
    // (sem re-strip de `@`: re-normalizar faria `/@@handle` servir o mesmo
    // conteúdo de `/@handle` — review antagonista O3-L2SEC #3; agora
    // `@@handle` reprova na RE e vira 404). Formato inválido nem consulta o
    // banco; reservados não existem como doc — 404 natural.
    const handle = rawHandle.trim().toLowerCase();
    if (!HANDLE_RE.test(handle)) return null;

    const db = getDb();
    const snap = await db.collection(COLECAO_PERFIS).doc(handle).get();
    if (!snap.exists) {
      // Adendo 13 (R12-FIX2): no PREVIEW, o handle de EXEMPLO (para onde o bloco
      // "Organizado por" aponta quando não há perfil seedado) resolve numa página
      // de organizador de exemplo — timeline vazia + faixa de patrocinadores mock.
      // Qualquer OUTRO handle inexistente segue 404 honesto. Prod: sempre 404.
      if (ehPreview() && handle === PREVIEW_ORG_HANDLE) return perfilMockPreview();
      return null;
    }

    const data = snap.data() ?? {};
    // GATE RN-161: privada/lixo ⇒ null (404 honesto). A projeção é a
    // fronteira de PII — allowlist no core.
    const perfil = projetarPerfilPublico(handle, data);
    if (perfil === null) return null;

    const tenantId = texto(data['tenantId']);
    const [eventos, clubes, patrocinadores] = await Promise.all([
      tenantId.length > 0
        ? listarEventosPublicadosDoTenant(tenantId)
        : Promise.resolve([]),
      tenantId.length > 0
        ? listarClubesPublicosDoTenant(tenantId)
        : Promise.resolve([]),
      tenantId.length > 0
        ? listarPatrocinadoresPublicosDoTenant(tenantId)
        : Promise.resolve([]),
    ]);

    return { perfil, eventos, clubes, patrocinadores };
  } catch (err) {
    console.error('[leitorPerfil] getPublicPerfil falhou', err);
    return null;
  }
}
