// =============================================================================
// packages/api-client/src/public/getPublicPerfil.ts
//
// Leitor CLIENT-side do perfil público / link-in-bio — espelha o shape do
// reader server-side da landing (`apps/landing/lib/leitorPerfil.ts`):
//   { perfil, eventos, clubes }, sem PII.
//
// FRONTEIRA (importante): a landing lê com Admin SDK (bypassa Rules) e serve o
// público anônimo; ESTE wrapper usa o client SDK, então as Rules de
// `perfis/{handle}` valem — `allow read: if isTenantMember(...)`. Ou seja: ele
// entrega o PREVIEW do próprio organizador (membro do tenant), não a leitura
// pública anônima. O gate de visibilidade RN-161 continua sendo do core
// (`projetarPerfilPublico`): perfil `privada`/lixo ⇒ `null`.
//
// As listas derivadas espelham 1:1 o reader da landing:
//   - clubes: `clubes` do tenant com visibilidade publica/indexavel (RN-140/165);
//   - eventos: `eventos` do tenant publicados (`publicado`/`ao_vivo`) — projeção
//     LEAN (sem o pipeline de preço/lote, que é server-side na landing; aqui não
//     se INVENTA preço). `[]` honesto em qualquer falha (resiliência do preview).
//
// ⚠️ Deploy real: as queries por tenant exigem os mesmos índices compostos do
// reader da landing (`clubes(tenantId, visibilidade)`, `eventos(tenantId,
// status)`) — o emulator cria automático.
// =============================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import {
  COLECAO_PERFIS,
  HANDLE_RE,
  isUrlCapaValida,
  projetarPerfilPublico,
  type PerfilPublico,
} from '@leela/core';

/** Resumo público de clube na aba Clubs (espelha o reader da landing, RN-165). */
export interface ClubeResumoPublico {
  slug: string;
  nome: string;
  categoria: string;
  modalidade: string;
  qtdMembrosAtivos: number;
  imagemUrl?: string;
}

/**
 * Resumo público de evento na aba Eventos — projeção LEAN. Sem `precoMinimo`/
 * `estadoVenda` (derivados de lote, server-side na landing): o preview não
 * fabrica preço. `dataISO` é o instante bruto; a formatação fica com o consumidor.
 */
export interface EventoResumoPublico {
  slug: string;
  nome: string;
  dataISO: string;
  local: string;
  modalidades: string[];
  imagemUrl?: string;
}

/** Perfil público completo — projeção + listas derivadas (espelho S1700). */
export interface PerfilPublicoCompleto {
  perfil: PerfilPublico;
  eventos: EventoResumoPublico[];
  clubes: ClubeResumoPublico[];
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Clubes públicos do tenant (visibilidade publica/indexavel — RN-140/165). */
async function listarClubesPublicosDoTenant(
  db: Firestore,
  tenantId: string
): Promise<ClubeResumoPublico[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'clubes'),
        where('tenantId', '==', tenantId),
        where('visibilidade', 'in', ['publica', 'indexavel'])
      )
    );
    return snap.docs
      .map((d) => {
        const data = d.data();
        const nome = texto(data['nome']);
        if (nome.length === 0) return null;
        const imagemUrlRaw = data['imagemUrl'];
        const qtd = data['qtdMembrosAtivos'];
        return {
          slug: d.id,
          nome,
          categoria: texto(data['categoria']),
          modalidade: texto(data['modalidade']),
          qtdMembrosAtivos: typeof qtd === 'number' && Number.isFinite(qtd) ? qtd : 0,
          ...(isUrlCapaValida(imagemUrlRaw) ? { imagemUrl: imagemUrlRaw as string } : {}),
        } satisfies ClubeResumoPublico;
      })
      .filter((c): c is ClubeResumoPublico => c !== null)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  } catch {
    return [];
  }
}

/** Eventos publicados do tenant (aba Eventos — projeção lean, sem preço). */
async function listarEventosPublicadosDoTenant(
  db: Firestore,
  tenantId: string
): Promise<EventoResumoPublico[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'eventos'),
        where('tenantId', '==', tenantId),
        where('status', 'in', ['publicado', 'ao_vivo'])
      )
    );
    return snap.docs
      .map((d) => {
        const data = d.data();
        const dataRaw = data['data'];
        if (!(dataRaw instanceof Timestamp)) return null;
        const nome = texto(data['nome']);
        if (nome.length === 0) return null;
        const modalidades = Array.isArray(data['modalidades'])
          ? (data['modalidades'] as unknown[]).filter((m): m is string => typeof m === 'string')
          : [];
        const imagemUrlRaw = data['imagemUrl'];
        return {
          slug: texto(data['slug']) || d.id,
          nome,
          dataISO: dataRaw.toDate().toISOString(),
          local: texto(data['local']),
          modalidades,
          ...(isUrlCapaValida(imagemUrlRaw) ? { imagemUrl: imagemUrlRaw as string } : {}),
        } satisfies EventoResumoPublico;
      })
      .filter((e): e is EventoResumoPublico => e !== null)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  } catch {
    return [];
  }
}

/**
 * Perfil público por handle — projeção sem PII + abas derivadas, ou `null`
 * (⇒ 404/estado vazio) quando o handle é inválido/inexistente, o perfil é
 * `privada`, ou o cliente não pode ler (Rules — só membro do tenant).
 */
export async function getPublicPerfil(
  db: Firestore,
  rawHandle: string
): Promise<PerfilPublicoCompleto | null> {
  try {
    const handle = rawHandle.trim().toLowerCase();
    if (!HANDLE_RE.test(handle)) return null;

    const snap = await getDoc(doc(db, COLECAO_PERFIS, handle));
    if (!snap.exists()) return null;

    const data = (snap.data() ?? {}) as Record<string, unknown>;
    // GATE RN-161 (core, allowlist): privada/lixo ⇒ null. Campo novo NÃO vaza.
    const perfil = projetarPerfilPublico(handle, data);
    if (perfil === null) return null;

    const tenantId = texto(data['tenantId']);
    const [eventos, clubes] = await Promise.all([
      tenantId.length > 0 ? listarEventosPublicadosDoTenant(db, tenantId) : Promise.resolve([]),
      tenantId.length > 0 ? listarClubesPublicosDoTenant(db, tenantId) : Promise.resolve([]),
    ]);

    return { perfil, eventos, clubes };
  } catch {
    return null;
  }
}
