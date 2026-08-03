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
  cupomVigente,
  descontoAfiliadoAtivo,
  isCodigoCupomValido,
  normalizarCodigoCupom,
  parseCupom,
  exigenciasSaudePadrao,
  materialTermoSaude,
  TERMO_SAUDE_CUSTOM_DOC_ID,
  termoSaudeCustomAtivo,
  validarTermoSaudeCustom,
  versaoTermoSaude,
  gradeDoDocItemKit,
  isExigenciasSaude,
  isModoTaxa,
  isUrlCapaValida,
  modoTaxaDoEvento,
  REGULAMENTO_MAX,
  parseKit,
  parseLote,
  parsePaginaVendas,
  politicaVendasPadrao,
  precoVigente,
  projetarPerfilPublico,
  validarPoliticaVendas,
  versaoPoliticaVendas,
  COLECAO_PERFIS,
  PAGINA_VENDAS_DOC_ID,
  POLITICA_VENDAS_DOC_ID,
  TERMO_SAUDE_VERSAO_VIGENTE,
  type Lote,
  type StatusEvento,
} from '@leela/core';
import { esporteDoEvento } from './esporte';
import { ehPreview, ORGANIZADOR_MOCK } from './mockImagem';
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
  ItemTamanhadoPublico,
  KitPublico,
  ModalidadePublica,
  OrganizadorPublico,
  PoliticaVendasPublica,
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
 *
 * R9-C (RN-227/RN-230): a visão de compra (descricao/itens/imagemUrl) vem do
 * doc real — `parseKit` já é a fronteira de segurança (imagemUrl só http(s)
 * válida; itens normalizados). Sem dado → null/[] e o checkout cai no
 * fallback mock rico (nunca fabricamos aqui).
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
        descricao: kit.descricao ?? null,
        itens: kit.itens,
        imagemUrl: kit.imagemUrl ?? null,
        // S212-T3 (RN-425): já saem normalizadas do `parseKit` — sem URL de
        // esquema perigoso, sem repetir a principal, cortadas em duas.
        fotosSecundarias: kit.fotosSecundarias ?? [],
      };
    })
    .sort((a, b) => b.preco - a.preco);
}

/**
 * Itens TAMANHADOS do evento com grade (RN-231 · TAMANHOS-GRADE) — projeção
 * pública mínima para o checkout coletar corte→tamanho por inscrito. Postel:
 * a grade EFETIVA sai de `gradeDoDocItemKit` (grade por corte quando há; o
 * legado `tamanhosDisponiveis[]` vira corte unissex; entrada inválida é
 * descartada). Item sem grade aproveitável fica FORA (checkout não tem o que
 * perguntar). Isolamento: só itens do MESMO tenant do evento (ADR-009).
 */
async function lerItensTamanhados(
  db: Firestore,
  eventoId: string,
  tenantId: string,
): Promise<ItemTamanhadoPublico[]> {
  const snap = await db.collection('itensKit').where('eventoId', '==', eventoId).get();
  const itens: ItemTamanhadoPublico[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (tenantId.length > 0 && data['tenantId'] !== tenantId) continue;
    const grade = gradeDoDocItemKit(data);
    if (grade.length === 0) continue;
    itens.push({
      id: doc.id,
      nome: typeof data['nome'] === 'string' && data['nome'].length > 0 ? data['nome'] : doc.id,
      kits: Array.isArray(data['kits'])
        ? (data['kits'] as unknown[]).filter((k): k is string => typeof k === 'string')
        : [],
      grade,
    });
  }
  return itens.sort((a, b) => a.nome.localeCompare(b.nome));
}

/**
 * Política de vendas PÚBLICA do evento (CKMOD §5.3a — fecha o A-1): projeta
 * SÓ os parâmetros que o modal dos termos renderiza + a versão vigente do
 * aceite. Sem doc, doc inválido ou leitura falha ⇒ DEFAULTS LEGAIS (CDC
 * Art. 49) com versão 1 — a política sempre vige; o comprador nunca vê modal
 * vazio. NUNCA projeta tenantId/carimbos (projeção fechada, sem PII).
 */
async function lerPoliticaVendasPublica(
  db: Firestore,
  eventoId: string,
): Promise<PoliticaVendasPublica> {
  const padrao: PoliticaVendasPublica = { versao: 1, ...politicaVendasPadrao() };
  try {
    const snap = await db
      .collection('eventos')
      .doc(eventoId)
      .collection('politicaVendas')
      .doc(POLITICA_VENDAS_DOC_ID)
      .get();
    if (!snap.exists) return padrao;
    const data = snap.data() ?? {};
    if (validarPoliticaVendas(data).length > 0) {
      // Doc corrompido não parametriza o modal — defaults honestos (o
      // kernel de dinheiro segue fail-fast; aqui é superfície de leitura).
      console.error(`[leitor] politicaVendas de ${eventoId} inválida — defaults`);
      return padrao;
    }
    const d = data as {
      reembolso: PoliticaVendasPublica['reembolso'];
      transferencia: PoliticaVendasPublica['transferencia'];
      trocaIngresso: PoliticaVendasPublica['trocaIngresso'];
      versao?: number;
    };
    return {
      versao: versaoPoliticaVendas(d.versao),
      reembolso: {
        janelaArrependimentoDias: d.reembolso.janelaArrependimentoDias,
        corteHoras: d.reembolso.corteHoras,
        slaAnaliseDias: d.reembolso.slaAnaliseDias,
      },
      transferencia: {
        habilitada: d.transferencia.habilitada,
        janelaHoras: d.transferencia.janelaHoras,
        taxa: d.transferencia.taxa,
      },
      trocaIngresso: {
        habilitada: d.trocaIngresso.habilitada,
        janelaHoras: d.trocaIngresso.janelaHoras,
        permiteReembolsoDowngrade: d.trocaIngresso.permiteReembolsoDowngrade,
      },
    };
  } catch (err) {
    console.error(`[leitor] lerPoliticaVendasPublica(${eventoId}) falhou`, err);
    return padrao;
  }
}

/**
 * Termo de saúde CUSTOM público do evento (CK2 · RN-156): texto + versão
 * vigente para o modal do 3º aceite (`saudeCustom`). `null` honesto quando
 * não há doc, o texto está vazio (termo desativado), o doc é inválido ou a
 * leitura falha — o checkout mostra só o termo BASE (que é sempre
 * obrigatório e vive como template do produto). NUNCA projeta tenantId.
 */
async function lerTermoSaudeCustomPublico(
  db: Firestore,
  eventoId: string,
): Promise<{ texto: string; versao: number } | null> {
  try {
    const snap = await db
      .collection('eventos')
      .doc(eventoId)
      .collection('termoSaude')
      .doc(TERMO_SAUDE_CUSTOM_DOC_ID)
      .get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    if (validarTermoSaudeCustom(data).length > 0) {
      console.error(`[leitor] termoSaude de ${eventoId} inválido — ignorado`);
      return null;
    }
    const textoTermo = materialTermoSaude(data['texto'] as string);
    if (!termoSaudeCustomAtivo(textoTermo)) return null;
    return {
      texto: textoTermo,
      versao: versaoTermoSaude(data['versao'] as number | undefined),
    };
  } catch (err) {
    console.error(`[leitor] lerTermoSaudeCustomPublico(${eventoId}) falhou`, err);
    return null;
  }
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
  const real = await (async (): Promise<OrganizadorPublico | null> => {
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
  })();
  if (real !== null) return real;
  // Adendo 13 (R12-FIX2): no PREVIEW, o bloco "Organizado por" não some por falta
  // de perfil seedado — cai num organizador de EXEMPLO (avatar mock + link p/ a
  // página de exemplo). Em produção (sem emulator) segue null = bloco oculto.
  return ehPreview() ? { ...ORGANIZADOR_MOCK } : null;
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

    const [
      lotesPorModalidade,
      kits,
      organizador,
      politicaVendas,
      itensTamanhados,
      termoSaudeCustom,
    ] = await Promise.all([
      lerLotesPorModalidade(db, slug),
      lerKits(db, slug),
      resolverOrganizadorPublico(db, texto(data['tenantId'])),
      lerPoliticaVendasPublica(db, slug),
      lerItensTamanhados(db, slug, texto(data['tenantId'])),
      lerTermoSaudeCustomPublico(db, slug),
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

    // Regulamento (RN-153 · T2): só string não-vazia atravessa, capada em 50k
    // (REGULAMENTO_MAX) — vira TEXTO num modal (nunca `dangerouslySetInnerHTML`).
    // Ausente/vazio ⇒ o componente de regulamento não renderiza na página.
    const regulamentoRaw = data['regulamento'];
    const regulamento =
      typeof regulamentoRaw === 'string' && regulamentoRaw.trim().length > 0
        ? regulamentoRaw.slice(0, REGULAMENTO_MAX)
        : undefined;
    const regulamentoVersaoRaw = data['regulamentoVersao'];
    const regulamentoVersao =
      typeof regulamentoVersaoRaw === 'number' &&
      Number.isInteger(regulamentoVersaoRaw) &&
      regulamentoVersaoRaw > 0
        ? regulamentoVersaoRaw
        : undefined;

    // CKMOD — flags p/ o checkout novo (spec §5.3/§5.4 + RN-347/T5-CKFIX):
    // exigências de saúde (map exato ou default OFF — lixo nunca liga coleta
    // de dado sensível), versão do termo de saúde e o FLAG do modo de taxa
    // ('repassada' ⇒ badge "+ taxa"; o doc corrompido cai em 'incorporada'
    // via acessor canônico — nunca lança na página pública).
    const exigenciasRaw = data['exigenciasSaude'];
    const exigenciasSaude = isExigenciasSaude(exigenciasRaw)
      ? { atestado: exigenciasRaw.atestado, parq: exigenciasRaw.parq }
      : exigenciasSaudePadrao();
    const taxaModoRaw = data['taxaModo'];
    const taxaRepassada =
      modoTaxaDoEvento({
        ...(isModoTaxa(taxaModoRaw) ? { taxaModo: taxaModoRaw } : {}),
      }) === 'repassada';

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
      itensTamanhados,
      precoMinimo: precoMinimo(modalidades),
      janelasRetirada,
      secoes,
      seo,
      estadoVenda,
      exigenciasSaude,
      politicaVendas,
      termoSaudeVersao: TERMO_SAUDE_VERSAO_VIGENTE,
      termoSaudeCustom,
      taxaRepassada,
      ...(imagemUrl.length > 0 ? { imagemUrl } : {}),
      ...(regulamento !== undefined ? { regulamento } : {}),
      ...(regulamentoVersao !== undefined ? { regulamentoVersao } : {}),
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

// ---------------------------------------------------------------------------
// Verificação do cupom do link (S1215-T3 · RN-431/432 · D-KC-10)
// ---------------------------------------------------------------------------

/**
 * O que a faixa recebe. É TUDO o que sai daqui — e a lista curta é a regra,
 * não uma coincidência de implementação.
 *
 * NÃO sai: valor do desconto, tipo, teto, janela, usos, escopo, id/uid do
 * afiliado, percentual de comissão, mínimo de inscrições, contagem de
 * conversões, estado do gate, documento, e-mail, telefone. A faixa anuncia
 * que há desconto e quem indicou; quanto é continua sendo assunto da cotação.
 */
export interface CupomDoLinkPublico {
  /** Código normalizado, para a faixa repetir o que a pessoa recebeu. */
  codigo: string;
  /** Nome de exibição de quem indicou; `null` quando não há resolvível. */
  promotor: string | null;
}

/**
 * TTL do cache por código. Curto de propósito (RN-432/D-KC-12): o objetivo é
 * que força bruta bata em CACHE e não no Firestore, não guardar estado. Um
 * cupom que esgota ou é encerrado some da faixa em no máximo este intervalo, e
 * quem tentar usá-lo é recusado pelo servidor na hora — o número nunca vem
 * daqui.
 */
export const CUPOM_LINK_CACHE_MS = 60_000;

interface EntradaCacheCupom {
  valor: CupomDoLinkPublico | null;
  expiraEmMillis: number;
}

/**
 * Cache POR INSTÂNCIA do servidor da landing, com resposta NEGATIVA cacheada
 * junto — que é o caso que importa: quem raspa códigos gera sequência de
 * inválidos, e é justamente ela que não pode virar sequência de leituras.
 *
 * Por que um Map e não `unstable_cache`: o efeito precisa ser MEDÍVEL (o
 * contrato de review pede o número de leituras de Firestore para uma sequência
 * de códigos inválidos), e um cache do framework não é observável em teste.
 * A limitação fica escrita: com N instâncias quentes, o teto de leituras é N
 * por código por janela, não 1.
 */
const cacheCupomLink = new Map<string, EntradaCacheCupom>();

/**
 * Teto de entradas do cache (KITCUPOM-REV).
 *
 * O cache nasceu como MITIGAÇÃO de raspagem e era, ele próprio, o caminho de
 * exaustão: a chave é `{slug}|{código}` e ela vinha DIRETO do chamador. Como
 * `verificarCupomLinkAction` é uma ação de servidor — endereçável por qualquer
 * um, com os argumentos que quiser —, uma sequência de códigos distintos (ou de
 * slugs distintos, que nem passavam por guarda de forma) fazia o `Map` crescer
 * sem limite dentro do `ssrleelalanding`, que serve TAMBÉM a página de compra.
 * Medido antes do teto: 4.000 chaves distintas custaram ~12,8 MB de heap, e um
 * slug de 200 mil caracteres era aceito e guardado inteiro.
 *
 * 500 entradas cobrem com folga o tráfego real (uma campanha inteira usa um
 * punhado de códigos por evento) e o custo de errar para baixo é uma leitura a
 * mais, nunca um número errado — o valor da faixa não vem daqui.
 */
export const CUPOM_LINK_CACHE_MAX = 500;

/**
 * Forma aceitável do slug na chave do cache. Não é validação de evento (quem
 * decide isso é o Firestore, logo abaixo): é a MESMA disciplina que o código do
 * cupom já tinha — entrada fora de forma não custa leitura nem entrada de
 * cache. Slug real é kebab curto (`meia-floripa-2026`); 100 chars é folga.
 */
const SLUG_CACHE_MAX_LEN = 100;

function slugUsavel(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug.length <= SLUG_CACHE_MAX_LEN &&
    !slug.includes('/') &&
    slug.trim().length > 0
  );
}

/**
 * Guarda uma resposta respeitando o teto. Evicção pela entrada mais ANTIGA
 * (o `Map` do JS preserva a ordem de inserção), que é o comportamento certo
 * aqui: o sondador insere sempre chaves novas, então é ele quem é despejado
 * primeiro quando o teto encosta.
 */
function guardarNoCacheCupom(chave: string, entrada: EntradaCacheCupom): void {
  if (!cacheCupomLink.has(chave) && cacheCupomLink.size >= CUPOM_LINK_CACHE_MAX) {
    const maisAntiga = cacheCupomLink.keys().next().value;
    if (maisAntiga !== undefined) cacheCupomLink.delete(maisAntiga);
  }
  cacheCupomLink.set(chave, entrada);
}

/** Só para teste — limpa o cache entre casos. */
export function limparCacheCupomLink(): void {
  cacheCupomLink.clear();
}

/** Só para teste — quantas entradas o cache guarda agora. */
export function tamanhoCacheCupomLink(): number {
  return cacheCupomLink.size;
}

/**
 * O cupom do link se aplica a este evento? Devolve o rótulo da faixa, ou
 * `null` (S1215-T3 · RN-432 · doutrina S1200-T2: Admin SDK no servidor, gate
 * de autorização no CÓDIGO, Rules intocadas — a leitura de cupom continua
 * fechada ao cliente).
 *
 * RESPOSTA UNIFORME. Código inexistente, expirado, esgotado, de escopo não
 * satisfeito, de outro evento, de evento não publicado, de afiliado com o gate
 * da RN-315 fechado e erro de infraestrutura devolvem exatamente `null`, sem
 * distinção. Não existe canal aqui para descobrir POR QUE não colou — é o que
 * separa uma verificação de um oráculo de cupons.
 *
 * Nada é escrito, nenhuma coleção nova é lida além de cupom/afiliado/parceria,
 * e visita sem cupom na URL nem chega a chamar esta função.
 */
export async function verificarCupomDoLink(
  eventoSlug: string,
  codigoBruto: string,
): Promise<CupomDoLinkPublico | null> {
  const codigo = normalizarCodigoCupom(codigoBruto);
  // Código fora de forma NÃO custa uma leitura: a guarda é a mesma do core.
  // O SLUG passa pela mesma régua (KITCUPOM-REV): esta função é alcançada por
  // ação de servidor, então os dois argumentos são do chamador, e uma chave de
  // cache sem forma nem tamanho era memória do SSR entregue de graça.
  if (!isCodigoCupomValido(codigo) || !slugUsavel(eventoSlug)) return null;

  const chave = `${eventoSlug}|${codigo}`;
  const agoraMs = Date.now();
  const emCache = cacheCupomLink.get(chave);
  if (emCache !== undefined && emCache.expiraEmMillis > agoraMs) return emCache.valor;

  const valor = await resolverCupomDoLink(eventoSlug, codigo);
  guardarNoCacheCupom(chave, { valor, expiraEmMillis: agoraMs + CUPOM_LINK_CACHE_MS });
  return valor;
}

/** O trabalho de verdade — sem cache, sem exceção escapando. */
async function resolverCupomDoLink(
  eventoSlug: string,
  codigo: string,
): Promise<CupomDoLinkPublico | null> {
  try {
    const db = getDb();
    const agora = agoraDoServidor();

    // Evento: o MESMO gate de publicação do resto do leitor. Rascunho não tem
    // faixa, pelo mesmo motivo que não tem página.
    const eventoRef = db.collection('eventos').doc(eventoSlug);
    const eventoSnap = await eventoRef.get();
    if (!eventoSnap.exists) return null;
    const status = eventoSnap.get('status') as StatusEvento | undefined;
    if (status === undefined || !statusEhPublico(status)) return null;
    const tenantId = eventoSnap.get('tenantId') as string | undefined;
    if (typeof tenantId !== 'string' || tenantId.length === 0) return null;

    // Cupom — docId = código normalizado (unicidade por chave, E04).
    const cupomSnap = await eventoRef.collection('cupons').doc(codigo).get();
    if (!cupomSnap.exists) return null;
    const cupom = parseCupom(cupomSnap.id, cupomSnap.data() ?? {});
    if (cupom.tenantId !== tenantId) return null;

    // Vigência: janela E teto de usos, pelas funções do core (RN-432 não tem
    // regra própria de validade — seria uma segunda verdade sobre desconto).
    if (!cupomVigente(cupom, agora)) return null;

    // Escopo de club parceiro (RN-364): a exigência é RE-LIDA aqui. Parceria
    // desativada ⇒ a faixa não aparece, e o checkout recusa do mesmo jeito.
    // As guardas são as do kernel: path DENTRO do tenant e profundidade
    // EXATA de doc (um path aninhado forjado não pode virar parceria).
    if (cupom.escopo === 'club_parceiro') {
      const parceriaPath = cupom.parceriaRef ?? '';
      const prefixo = `tenants/${tenantId}/parceirosAssessoria/`;
      if (!parceriaPath.startsWith(prefixo) || parceriaPath.split('/').length !== 4) return null;
      const parceriaSnap = await db.doc(parceriaPath).get();
      if (!parceriaSnap.exists || parceriaSnap.get('status') !== 'ativa') return null;
    }

    // Cupom de AFILIADO: o gate da RN-315 vale igual. Antes do mínimo de
    // inscrições o link rastreia a conversão e o desconto NÃO aplica — então
    // a faixa não pode prometer desconto que o checkout vai recusar.
    const afiliadoRef = cupomSnap.get('afiliadoRef');
    if (typeof afiliadoRef !== 'string' || afiliadoRef.length === 0) {
      // Cupom geral do evento: vale, e não há promotor a nomear.
      return { codigo, promotor: null };
    }
    const afiliadoSnap = await eventoRef.collection('afiliados').doc(afiliadoRef).get();
    const dados = afiliadoSnap.data() ?? {};
    const gateAberto =
      afiliadoSnap.exists &&
      dados['tenantId'] === tenantId &&
      descontoAfiliadoAtivo({
        status: dados['status'] as never,
        minimoInscricoes:
          typeof dados['minimoInscricoes'] === 'number' ? dados['minimoInscricoes'] : null,
        conversoes: typeof dados['conversoes'] === 'number' ? dados['conversoes'] : 0,
      });
    if (!gateAberto) return null;

    // O NOME, e só o nome (RN-431 · premissa P3 do dono: pessoa física
    // aparece no banner). Nome vazio degrada para a faixa sem "de Fulano".
    const nome = dados['nome'];
    const promotor = typeof nome === 'string' && nome.trim().length > 0 ? nome.trim() : null;
    return { codigo, promotor };
  } catch (err) {
    // Falha de infraestrutura responde IGUAL a cupom inexistente: um erro
    // distinguível aqui seria um canal de sondagem, e a faixa é decoração —
    // nunca vale quebrar a página do evento por causa dela.
    console.error('[leitor] verificarCupomDoLink falhou', err);
    return null;
  }
}

// Re-export do formatador puro (compat: a home importa daqui).
export { formatarPreco } from './formato';
