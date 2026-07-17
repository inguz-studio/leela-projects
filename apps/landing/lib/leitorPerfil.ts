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

/** Perfil público completo — projeção + listas derivadas (S1700). */
export interface PerfilPublicoCompleto {
  perfil: PerfilPublico;
  eventos: EventoResumo[];
  clubes: ClubeResumoPublico[];
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
    if (!snap.exists) return null;

    const data = snap.data() ?? {};
    // GATE RN-161: privada/lixo ⇒ null (404 honesto). A projeção é a
    // fronteira de PII — allowlist no core.
    const perfil = projetarPerfilPublico(handle, data);
    if (perfil === null) return null;

    const tenantId = texto(data['tenantId']);
    const [eventos, clubes] = await Promise.all([
      tenantId.length > 0
        ? listarEventosPublicadosDoTenant(tenantId)
        : Promise.resolve([]),
      tenantId.length > 0
        ? listarClubesPublicosDoTenant(tenantId)
        : Promise.resolve([]),
    ]);

    return { perfil, eventos, clubes };
  } catch (err) {
    console.error('[leitorPerfil] getPublicPerfil falhou', err);
    return null;
  }
}
