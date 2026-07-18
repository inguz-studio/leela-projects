// =============================================================================
// apps/landing/lib/leitor.ts
//
// Leitor PÚBLICO server-side (Admin SDK) — aceite S1200-T2.
//
// Gate de publicação: `getEventoPublicado`/`listarEventosPublicados` só
// devolvem eventos com `status ∈ {publicado, ao_vivo}` (statusEhPublico);
// qualquer outro (rascunho/encerrado) → `null`/omitido, e a rota resolve 404.
// O Admin SDK BYPASSA as Security Rules, então o gate mora AQUI, no código —
// é a fronteira de autorização de leitura pública (Rules ficam deny-by-default
// para o cliente anônimo, intocadas neste lote).
//
// Reuso-first: preço vem de `precoVigente` (core/lote.ts, RN-301/ADR-012),
// config de seções de `parsePaginaVendas` (core/paginaVendas.ts). Nada de
// preço/seção reimplementado.
//
// Resiliência de build: toda leitura é try/catch → null/[] em falha de
// conexão (ex.: `next build` sem emulator). O build renderiza EmptyState/404
// e a ISR revalida com dado real em runtime. Nunca fabrica dado.
// =============================================================================

import {
  isUrlCapaValida,
  parseKit,
  parseLote,
  parsePaginaVendas,
  precoVigente,
  projetarPerfilPublico,
  COLECAO_PERFIS,
  PAGINA_VENDAS_DOC_ID,
  type Lote,
  type StatusEvento,
} from '@leela/core';
import { esporteDoEvento } from './esporte';
import type { Firestore } from 'firebase-admin/firestore';
import { getDb } from './firebaseAdmin';
import {
  agoraDoServidor,
  deriveEstadoVenda,
  statusEhPublico,
  type ModalidadeLotes,
} from './estadoVenda';
import type {
  EventoPublico,
  EventoResumo,
  JanelaRetiradaPublica,
  KitPublico,
  ModalidadePublica,
  OrganizadorPublico,
  SecaoPublica,
} from './tipos';

// ---------------------------------------------------------------------------
// Formatação de data (fuso da prova — America/Sao_Paulo)
// ---------------------------------------------------------------------------

const FUSO = 'America/Sao_Paulo';
const fmtDataLonga = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: FUSO });
const fmtDiaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: FUSO });
const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO });
const fmtDia2 = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', timeZone: FUSO });
const fmtMesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: FUSO });
const fmtDiaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: FUSO });

function labelDiaISO(dia: string): string {
  // dia = 'YYYY-MM-DD'; ancora ao meio-dia BRT p/ não escorregar de dia.
  const d = new Date(`${dia}T12:00:00-03:00`);
  return Number.isNaN(d.getTime()) ? dia : fmtDiaMes.format(d);
}

// ---------------------------------------------------------------------------
// Leitura tipada defensiva do doc de evento
// ---------------------------------------------------------------------------

interface TimestampLike {
  toDate: () => Date;
  toMillis: () => number;
}

function ehTimestamp(v: unknown): v is TimestampLike {
  return (
    v !== null &&
    typeof v === 'object' &&
    typeof (v as Partial<TimestampLike>).toDate === 'function' &&
    typeof (v as Partial<TimestampLike>).toMillis === 'function'
  );
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function inteiro(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Lê os lotes de um evento e agrupa por modalidade (parse fail-fast do core). */
async function lerLotesPorModalidade(db: Firestore, eventoId: string): Promise<Map<string, Lote[]>> {
  const snap = await db.collection('eventos').doc(eventoId).collection('lotes').get();
  const porModalidade = new Map<string, Lote[]>();
  for (const doc of snap.docs) {
    const lote = parseLote(doc.id, doc.data());
    const arr = porModalidade.get(lote.modalidade) ?? [];
    arr.push(lote);
    porModalidade.set(lote.modalidade, arr);
  }
  return porModalidade;
}

/**
 * Kits do evento (`eventos/{id}/kits`) — projeção pública para o checkout
 * filtrar por modalidade (RN-210). Parse fail-fast do core; ordena do mais
 * caro ao desconto ("Sem kit" por último), igual ao painel (listarKits).
 */
async function lerKits(db: Firestore, eventoId: string): Promise<KitPublico[]> {
  const snap = await db.collection('eventos').doc(eventoId).collection('kits').get();
  return snap.docs
    .map((doc) => {
      const kit = parseKit(doc.id, doc.data());
      return {
        id: kit.id,
        nome: kit.nome,
        preco: kit.preco,
        modalidades: kit.modalidades,
        capacidade: kit.capacidade,
      };
    })
    .sort((a, b) => b.preco - a.preco);
}

function precoMinimo(modalidades: readonly ModalidadePublica[]): number | null {
  const precos = modalidades
    .map((m) => m.precoVigente)
    .filter((p): p is number => p !== null);
  return precos.length > 0 ? Math.min(...precos) : null;
}

// ---------------------------------------------------------------------------
// Config de seções (paginaVendas) — S1200-T2 / S1201-T1
// ---------------------------------------------------------------------------

/**
 * Config de seções publicada de um evento: seções ATIVAS na ordem + SEO.
 * `null` quando não há doc `config` (evento sem página montada).
 */
export async function getPaginaVendas(
  eventoId: string,
): Promise<{ secoes: SecaoPublica[]; seo: { titulo: string; descricao: string } } | null> {
  try {
    const db = getDb();
    const ref = db.collection('eventos').doc(eventoId).collection('paginaVendas').doc(PAGINA_VENDAS_DOC_ID);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const pagina = parsePaginaVendas(snap.id, snap.data() ?? {});
    // Só seções ATIVAS, na ordem do array (config-driven — S1201-T1). Uma
    // seção `ativa:false` (ex.: depoimentos no seed) simplesmente some.
    const secoes: SecaoPublica[] = pagina.secoes
      .filter((s) => s.ativa)
      .map((s) => ({ id: s.id, canal: s.canal }));
    return { secoes, seo: { titulo: pagina.seo.titulo, descricao: pagina.seo.descricao } };
  } catch (err) {
    console.error(`[leitor] getPaginaVendas(${eventoId}) falhou`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Evento publicado (página /{slug})
// ---------------------------------------------------------------------------

/**
 * Organizador PÚBLICO de um tenant — para o bloco "Organizado por" (LEELA-R12).
 * Resolve o perfil público do tenant (mesma coleção/gate do leitor de perfil)
 * e devolve SÓ o shape público (handle/nome/avatar via `projetarPerfilPublico`,
 * a allowlist do core). `null` honesto quando não há perfil público, o tenant
 * é vazio, ou a leitura falha (build sem emulator). O `tenantId` é lido no
 * servidor só para achar o handle — não atravessa para a árvore de render.
 * ⚠️ Deploy real exige índice `perfis(tenantId, visibilidade)` — emulator cria.
 */
async function resolverOrganizadorPublico(
  db: Firestore,
  tenantId: string,
): Promise<OrganizadorPublico | null> {
  if (tenantId.length === 0) return null;
  try {
    const snap = await db
      .collection(COLECAO_PERFIS)
      .where('tenantId', '==', tenantId)
      .where('visibilidade', 'in', ['publica', 'indexavel'])
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (doc === undefined) return null;
    // Gate de PII: a projeção do core é a fronteira (allowlist) — nada de
    // ownerUid/tenantId cruza. `handle` é o docId.
    const perfil = projetarPerfilPublico(doc.id, doc.data());
    if (perfil === null) return null;
    return {
      handle: perfil.handle,
      nome: perfil.nome,
      ...(perfil.avatarUrl !== undefined ? { avatarUrl: perfil.avatarUrl } : {}),
    };
  } catch (err) {
    console.error('[leitor] resolverOrganizadorPublico falhou', err);
    return null;
  }
}

/**
 * Evento publicado por slug — projeção pública completa, ou `null` (→ 404)
 * quando não existe ou não passa no gate de publicação.
 */
export async function getEventoPublicado(slug: string): Promise<EventoPublico | null> {
  try {
    const db = getDb();
    const snap = await db.collection('eventos').doc(slug).get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};

    // GATE de publicação (S1200/S1201): rascunho/encerrado nunca vazam.
    const status = data['status'] as StatusEvento;
    if (!statusEhPublico(status)) return null;

    const dataRaw = data['data'];
    if (!ehTimestamp(dataRaw)) return null;
    const dataEvento = dataRaw.toDate();
    const agora = agoraDoServidor();

    const modalidadesNomes = Array.isArray(data['modalidades'])
      ? (data['modalidades'] as unknown[]).filter((m): m is string => typeof m === 'string')
      : [];

    const [lotesPorModalidade, kits, organizador] = await Promise.all([
      lerLotesPorModalidade(db, slug),
      lerKits(db, slug),
      resolverOrganizadorPublico(db, texto(data['tenantId'])),
    ]);

    const modalidades: ModalidadePublica[] = modalidadesNomes.map((nome) => ({
      nome,
      precoVigente: precoVigente({
        lotesDaModalidade: lotesPorModalidade.get(nome) ?? [],
        agora,
      }),
    }));

    const modalidadeLotes: ModalidadeLotes[] = modalidadesNomes.map((nome) => ({
      modalidade: nome,
      lotes: lotesPorModalidade.get(nome) ?? [],
    }));
    const estadoVenda = deriveEstadoVenda(modalidadeLotes, dataEvento, agora);

    const janelasRetirada: JanelaRetiradaPublica[] = Array.isArray(data['janelasEntrega'])
      ? (data['janelasEntrega'] as Record<string, unknown>[]).map((j) => ({
          diaLabel: labelDiaISO(texto(j['dia'])),
          horaInicio: texto(j['horaInicio']),
          horaFim: texto(j['horaFim']),
          local: texto(j['local']),
        }))
      : [];

    const pagina = await getPaginaVendas(slug);
    const secoes: SecaoPublica[] = pagina?.secoes ?? [];
    const seo = pagina?.seo ?? {
      titulo: texto(data['nome']),
      descricao: `${modalidadesNomes.join(', ')} em ${texto(data['local'])}.`,
    };

    // Capa (RN-153): SÓ URL http(s) válida chega à página pública — a capa
    // vira `src` de <img> (HeroCover); esquema fora de http(s) (javascript:,
    // data:) cai no MESMO gradiente de fallback (defesa em profundidade com
    // Rules/criarEvento — este leitor usa Admin SDK e bypassa as Rules).
    const imagemUrlRaw = texto(data['imagemUrl']);
    const imagemUrl = isUrlCapaValida(imagemUrlRaw) ? imagemUrlRaw : '';

    const nome = texto(data['nome']);
    // MODALIDADE ESPORTIVA (R12): campo do doc quando o organizador preenche;
    // senão, derivada de nome + distâncias. Nunca vazia.
    const modalidadeEsporte =
      texto(data['modalidadeEsporte']).trim() || esporteDoEvento(nome, modalidadesNomes);

    const evento: EventoPublico = {
      slug,
      nome,
      dataISO: dataEvento.toISOString(),
      dataLabel: fmtDataLonga.format(dataEvento),
      diaSemanaLabel: fmtDiaSemana.format(dataEvento),
      horaLabel: fmtHora.format(dataEvento),
      local: texto(data['local']),
      modalidadeEsporte,
      usaChip: data['usaChip'] === true,
      qtdInscritos: inteiro(data['qtdInscritos']),
      organizador,
      modalidades,
      kits,
      precoMinimo: precoMinimo(modalidades),
      janelasRetirada,
      secoes,
      seo,
      estadoVenda,
      ...(imagemUrl.length > 0 ? { imagemUrl } : {}),
    };
    return evento;
  } catch (err) {
    console.error(`[leitor] getEventoPublicado(${slug}) falhou`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Marketplace (home /)
// ---------------------------------------------------------------------------

/**
 * Monta o `EventoResumo` público de UM doc de evento (já filtrado por status
 * público na query). `null` para doc envenenado (sem `data` timestamp) —
 * listagem tolera doc ruim sem derrubar a página (padrão F-T1).
 */
async function montarResumoEvento(
  db: Firestore,
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  agora: Date,
): Promise<EventoResumo | null> {
  const data = doc.data();
  const dataRaw = data['data'];
  if (!ehTimestamp(dataRaw)) return null;
  const dataEvento = dataRaw.toDate();

  const modalidadesNomes = Array.isArray(data['modalidades'])
    ? (data['modalidades'] as unknown[]).filter((m): m is string => typeof m === 'string')
    : [];

  const lotesPorModalidade = await lerLotesPorModalidade(db, doc.id);
  const modalidades: ModalidadePublica[] = modalidadesNomes.map((nome) => ({
    nome,
    precoVigente: precoVigente({ lotesDaModalidade: lotesPorModalidade.get(nome) ?? [], agora }),
  }));
  const modalidadeLotes: ModalidadeLotes[] = modalidadesNomes.map((nome) => ({
    modalidade: nome,
    lotes: lotesPorModalidade.get(nome) ?? [],
  }));

  // Mesma guarda de capa http(s) da página do evento (RN-153)
  const imagemUrlRaw = texto(data['imagemUrl']);
  const imagemUrl = isUrlCapaValida(imagemUrlRaw) ? imagemUrlRaw : '';
  return {
    slug: texto(data['slug']) || doc.id,
    nome: texto(data['nome']),
    dataISO: dataEvento.toISOString(),
    futuro: dataEvento.getTime() >= agora.getTime(),
    dataLabel: fmtDataLonga.format(dataEvento),
    diaLabel: fmtDia2.format(dataEvento),
    mesLabel: fmtMesCurto.format(dataEvento).replace('.', ''),
    local: texto(data['local']),
    modalidades: modalidadesNomes,
    precoMinimo: precoMinimo(modalidades),
    estadoVenda: deriveEstadoVenda(modalidadeLotes, dataEvento, agora),
    ...(imagemUrl.length > 0 ? { imagemUrl } : {}),
  };
}

/**
 * Todos os eventos publicados (home marketplace). Só `publicado`/`ao_vivo`;
 * `[]` honesto quando não há evento OU quando a leitura falha (build sem
 * emulator). Cada resumo carrega o "a partir de" derivado de `precoVigente`.
 */
export async function listarEventosPublicados(): Promise<EventoResumo[]> {
  try {
    const db = getDb();
    const agora = agoraDoServidor();
    const snap = await db
      .collection('eventos')
      .where('status', 'in', ['publicado', 'ao_vivo'])
      .get();

    const resumos: EventoResumo[] = [];
    for (const doc of snap.docs) {
      const resumo = await montarResumoEvento(db, doc, agora);
      if (resumo !== null) resumos.push(resumo);
    }
    // Mais próximos primeiro seria ideal; ordenamos por nome estável por ora.
    resumos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return resumos;
  } catch (err) {
    console.error('[leitor] listarEventosPublicados falhou', err);
    return [];
  }
}

/**
 * Eventos publicados de UM tenant (aba Eventos do perfil público — S1700).
 * Mesmo gate de publicação da home (`publicado`/`ao_vivo`); `[]` honesto.
 * ⚠️ Deploy real exige índice composto `eventos(tenantId, status)` — o
 * emulator cria automático; registrado como pendência operacional.
 */
export async function listarEventosPublicadosDoTenant(
  tenantId: string,
): Promise<EventoResumo[]> {
  try {
    const db = getDb();
    const agora = agoraDoServidor();
    const snap = await db
      .collection('eventos')
      .where('tenantId', '==', tenantId)
      .where('status', 'in', ['publicado', 'ao_vivo'])
      .get();

    const resumos: EventoResumo[] = [];
    for (const doc of snap.docs) {
      const resumo = await montarResumoEvento(db, doc, agora);
      if (resumo !== null) resumos.push(resumo);
    }
    resumos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return resumos;
  } catch (err) {
    console.error(`[leitor] listarEventosPublicadosDoTenant falhou`, err);
    return [];
  }
}

// Re-export do formatador puro (compat: a home importa daqui).
export { formatarPreco } from './formato';
