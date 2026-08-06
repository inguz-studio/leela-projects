// =============================================================================
// planoLimpeza — o PLANO de enxugamento do leela-hub, como função pura.
//
// Revisado depois da review antagonista `leela-rev-limpeza-20260806.md`, que
// BLOQUEOU a primeira versão. O que mudou está marcado com [B1]…[B4]/[A*].
//
// POR QUE UMA FUNÇÃO PURA: lógica de exclusão sem teste é como se chama um
// incidente. Separando o *plano* do *efeito*, o plano vira dado — ordenável,
// imprimível, comparável e testável contra dado sintético. O runner lê
// produção, chama esta função e ou imprime (dry-run) ou executa.
//
// ── A ORDEM, E POR QUE ELA É ESTA ──────────────────────────────────────────
//
// [B1] O DOCUMENTO DO EVENTO MORRE PRIMEIRO. Os quatro agregados do evento
// (`financeiro`, `demografia`, `aprovisionamento`, `comunicacoesResumo`) são
// reescritos por gatilho a cada delete de inscrito ou de comunicação, e os
// quatro abrem com a MESMA guarda, verificada linha a linha:
//
//     agregarFinanceiro.ts:220   if (!eventoSnap.exists) return null;
//     agregarEstoque.ts:110      if (!eventoSnap.exists) return null;
//     agregarDemografia.ts:120   if (!eventoSnap.exists) return null;
//     agregarComunicacoes.ts:61  if (!eventoSnap.exists) return null;
//
// Matar o documento do evento ANTES de tudo desarma os quatro de uma vez. A
// versão anterior apagava os agregados no MESMO grupo dos 710 inscritos, com
// desempate alfabético: os agregados saíam nas operações 959–968 e os inscritos
// nas 1401–1862, então cada delete de inscrito os RESSUSCITAVA, e o evento só
// morria 165 operações depois — deixando agregado vivo sob pai morto, com
// `aprovisionamento` rebobinado de estado terminal para `estimativa` e
// `historico` append-only zerado. Determinístico, não corrida.
//
// A review pediu "agregados depois de ORDEM.EVENTO". Fui além de propósito:
// com o evento em primeiro lugar, o gate mata o recompute de TODAS as folhas,
// não só o dos agregados — o que também elimina ~7.800 escritas e ~1M leituras
// de amplificação (A6) e encurta a janela de exposição a uma queda parcial.
// O preço seria o subtree ficar invisível sob pai apagado; está pago pelo
// `showMissing` do runner, que enxerga documento-fantasma (e que já revelou 31
// documentos que o inventário anterior não via).
//
// [B1] `versionarRegulamento.ts:109` e `onInscritoWriteAutomacao` já saem no
// delete; a ordem não depende disso, mas está registrado para o próximo leitor.
//
// ── HONESTIDADE SOBRE O QUE A ORDEM PROTEGE ────────────────────────────────
// A versão anterior afirmava que as automações morriam antes dos inscritos
// "porque o gatilho PODE ENVIAR E-MAIL". A review provou que não pode: o
// `onInscritoWriteAutomacao` sai na primeira linha em qualquer delete
// (`automacoesTriggers.ts:275` — no delete `depois` é `null`). A ordem dos
// disparos é DEFESA EM PROFUNDIDADE, não a coisa que impede o e-mail. Nenhum
// teste aqui afirma o contrário.
// =============================================================================

/** Documento lido de produção, já achatado para JS puro. */
export interface DocInventario {
  /** Caminho completo sem o prefixo de database. Ex.: `eventos/x/inscritos/y`. */
  readonly caminho: string;
  readonly campos: Readonly<Record<string, unknown>>;
  /** Documento-fantasma: não existe, mas carrega subcoleção. */
  readonly fantasma?: boolean;
}

/**
 * O alvo. [B2] As listas de condenados são LITERAIS e CONGELADAS — não são
 * derivadas de "tudo que existe menos o que fica".
 *
 * O motivo é retomada: derivando, a entidade some do inventário assim que é
 * apagada, deixa de ser condenada, e a segunda passada do mesmo comando
 * enxerga um banco pela metade e declara "0 órfãos". A review provou isso
 * executando, com um pedido pago de R$ 510,30 pendurado para sempre.
 */
export interface AlvoLimpeza {
  readonly tenantsMantidos: readonly string[];
  readonly eventosMantidos: readonly string[];
  /** [B2] Literal. Congelado no runner e revisado por humano. */
  readonly eventosCondenados: readonly string[];
  /** [B2] Literal. Congelado no runner e revisado por humano. */
  readonly tenantsCondenados: readonly string[];
  readonly uidsProtegidos: readonly string[];
  readonly nomeNovo: string;
  readonly nomeAntigo: string;
  /**
   * Links externos a remover, casados por trecho da URL. Decisão do dono, e
   * por isso DECLARADA aqui e não inferida: link de semente apontando para
   * conta que não existe é pior que campo ausente, mas qual link morre não é
   * o script que decide.
   */
  readonly linksARemover?: readonly string[];
  /**
   * [R7] Identidades cujo subtree FANTASMA inteiro é varrido, apontem elas
   * para entidade condenada ou não.
   *
   * Declarada, e não inferida, porque a pergunta que decide não está no
   * documento: é se o LASTRO daquela identidade sobrevive à limpeza. Um
   * dashboard sob pai inexistente que espelha um clube VIVO é lacuna a
   * preencher; o mesmo documento espelhando um clube que vai morrer é lixo
   * que um cron realimenta todo dia às 03:05. O script não sabe a diferença;
   * quem mediu, sabe. Ver o runbook para a medição de cada id daqui.
   */
  readonly identidadesFantasmaVarridas?: readonly string[];
}

export type Operacao =
  | { readonly tipo: 'apagar'; readonly caminho: string; readonly motivo: string; readonly ordem: number }
  | {
      readonly tipo: 'editar';
      readonly caminho: string;
      readonly mudancas: Readonly<Record<string, unknown>>;
      readonly motivo: string;
      readonly ordem: number;
    };

export interface Plano {
  readonly operacoes: readonly Operacao[];
  readonly orfaosPrevistos: readonly { readonly caminho: string; readonly campo: string; readonly valor: string }[];
  readonly contasSemLastro: readonly string[];
  /** [B3] Documentos que o gate de proteção recusou condenar. */
  readonly intocaveis: readonly string[];
  /** [B3] Condenados que REFERENCIAM uid protegido — travam o `--apply`. */
  readonly conflitosDeProtecao: readonly { readonly caminho: string; readonly uid: string; readonly campo: string }[];
  /** Documentos-fantasma encontrados (pai inexistente com subcoleção). */
  readonly fantasmas: readonly string[];
  /** [B4] Recomputes que o plano NÃO faz e o runbook precisa fazer. */
  readonly recomputesObrigatorios: readonly string[];
  readonly resumoPorColecao: Readonly<Record<string, { apagar: number; editar: number }>>;
}

// ── Ordens. Números esparsos para caber inserção sem renumerar tudo. ─────────
export const ORDEM = {
  /** [B1] O documento do evento. PRIMEIRO — desarma os 4 gates de recompute. */
  EVENTO: 10,
  /** Automações/campanhas/comunicações. Defesa em profundidade. */
  DISPAROS: 20,
  /** Folhas do evento: inscritos, lotes, kits, cupons, códigos. */
  FOLHAS_EVENTO: 30,
  /** [B1] Agregados do evento — depois do pai, para nada os ressuscitar. */
  AGREGADOS: 40,
  /** Raízes que apontam para o evento: pedidos, pagamentos, carrinhos. */
  RAIZES_DO_EVENTO: 50,
  FOLHAS_CLUBE: 60,
  CLUBE: 70,
  FOLHAS_TENANT: 80,
  TENANT: 90,
  /** Cirurgia nos sobreviventes: CRM, poda de chave, nome. */
  SOBREVIVENTES: 100,
  /**
   * Varredura de lixo sob documento-fantasma. POR ÚLTIMO, e de propósito:
   * `onClubeWriteDashboard` recria `profissionais/{uid}/dashboard/current` a
   * cada delete de clube (ordem 60–70) com `set` incondicional, sem checar se
   * o pai existe. Varrer antes disso seria varrer para o lixo voltar.
   */
  FANTASMAS: 110,
} as const;

/** [B1] Subcoleções de evento que são AGREGADO reescrito por gatilho. */
const SUBCOL_AGREGADO = new Set(['financeiro', 'demografia', 'aprovisionamento', 'comunicacoesResumo']);
/** Subcoleções cuja escrita move maquinário de disparo. */
const SUBCOL_DISPARO = new Set(['automacoes', 'campanhas', 'comunicacoes']);
/** [A1] Campos de SNAPSHOT: registro histórico. Renomear é adulterar. */
const RX_SNAPSHOT = /(^|\.)[a-zA-Z]*[Ss]napshot(\.|$)/;
/** [A1] Campos de identidade bancária: só o dono decide, nunca substring. */
const RX_BANCARIO = /(^|\.)(titular|pixMascarado|pixChave|documento|cnpj|cpf)$/;

const CAMPOS_EVENTO = ['eventoId', 'eventoVinculadoId'] as const;

const segmentos = (caminho: string): string[] => caminho.split('/');
export const colecaoRaiz = (caminho: string): string => segmentos(caminho)[0] ?? '';
export const idNoNivel = (caminho: string, nivel: number): string | undefined => segmentos(caminho)[nivel * 2 + 1];

/**
 * O documento onde vivem os números macro da plataforma. [B4/F7]
 * Declarado aqui, e não adivinhado por forma, porque recomputar total de
 * dinheiro é ato nomeado: quem ler o plano tem de ver QUAL documento recebe
 * número calculado por este script.
 */
export const CAMINHO_ROLLUPS = 'platform/rollups';

/** Mesmo arredondamento de `roundMoney` do core. Replicado para o plano não
 *  ganhar dependência: uma função pura de exclusão não importa a plataforma. */
const arredondarDinheiro = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

/**
 * [N1] Os caminhos de DOCUMENTO que são ancestrais deste. Um caminho de
 * documento tem número PAR de segmentos; os ancestrais são os prefixos pares
 * mais curtos. `a/b/c/d/e/f` → `a/b/c/d`, `a/b`.
 *
 * É por aqui que a condenação vira transitiva em QUALQUER raiz. Antes ela só
 * descia sob `eventos/` e `tenants/`, porque `eventoDoDoc`/`tenantDoDoc`
 * resolviam o dono pelo caminho; sob `clubes/` o dono só saía de campo, e o
 * modelo para de carregar `tenantId` no nível 1 — o que deixava 45 documentos
 * de nível 2 vivos sob pai apagado, sem que nenhuma defesa os enxergasse.
 */
export function ancestraisDe(caminho: string): string[] {
  const partes = segmentos(caminho);
  const saida: string[] = [];
  for (let n = partes.length - 2; n >= 2; n -= 2) saida.push(partes.slice(0, n).join('/'));
  return saida;
}

/** Profundidade do documento: 0 para `col/doc`, 1 para `col/doc/sub/doc`… */
const profundidade = (caminho: string): number => Math.floor(segmentos(caminho).length / 2) - 1;

const texto = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const numero = (v: unknown): number => (typeof v === 'number' ? v : 0);
const mapa = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Cópia profunda. O dado do Firestore já chega como JSON puro. */
function clonar<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

/**
 * Percorre um valor achatado atrás de strings que casem um conjunto de ids.
 * Casa VALOR, não nome de campo: é o que pega ponteiro escondido em mapa
 * dinâmico e em elemento de lista.
 */
export function referenciasA(
  campos: Readonly<Record<string, unknown>>,
  alvos: ReadonlySet<string>
): { campo: string; valor: string }[] {
  const achados: { campo: string; valor: string }[] = [];
  const anda = (chave: string, valor: unknown): void => {
    if (typeof valor === 'string') {
      if (alvos.has(valor)) achados.push({ campo: chave, valor });
      return;
    }
    if (Array.isArray(valor)) return valor.forEach((v, i) => anda(`${chave}[${i}]`, v));
    if (valor !== null && typeof valor === 'object') {
      for (const [k, v] of Object.entries(valor)) anda(chave === '' ? k : `${chave}.${k}`, v);
    }
  };
  anda('', campos);
  return achados;
}

/** O evento a que um documento pertence: pelo caminho, senão pelo campo. */
export function eventoDoDoc(doc: DocInventario): string | undefined {
  if (colecaoRaiz(doc.caminho) === 'eventos') return idNoNivel(doc.caminho, 0);
  for (const c of CAMPOS_EVENTO) {
    const v = texto(doc.campos[c]);
    if (v !== undefined && v !== '') return v;
  }
  return undefined;
}

/** O tenant a que um documento pertence: pelo caminho, senão pelo campo. */
export function tenantDoDoc(doc: DocInventario): string | undefined {
  if (colecaoRaiz(doc.caminho) === 'tenants') return idNoNivel(doc.caminho, 0);
  return texto(doc.campos['tenantId']);
}

/** [B1] A ordem de exclusão de um documento condenado. */
function ordemDe(doc: DocInventario): number {
  const raiz = colecaoRaiz(doc.caminho);
  const partes = segmentos(doc.caminho);
  if (raiz === 'eventos') {
    if (partes.length === 2) return ORDEM.EVENTO;
    const sub = partes[2] ?? '';
    if (SUBCOL_AGREGADO.has(sub)) return ORDEM.AGREGADOS;
    if (SUBCOL_DISPARO.has(sub)) return ORDEM.DISPAROS;
    return ORDEM.FOLHAS_EVENTO;
  }
  if (raiz === 'clubes') return partes.length === 2 ? ORDEM.CLUBE : ORDEM.FOLHAS_CLUBE;
  if (raiz === 'tenants') return partes.length === 2 ? ORDEM.TENANT : ORDEM.FOLHAS_TENANT;
  return ORDEM.RAIZES_DO_EVENTO;
}

/**
 * Reconstrói os agregados de um cliente de CRM a partir das inscrições que
 * SOBREVIVEM. O ledger do CRM é fechado sobre o próprio documento: apagar o
 * inscrito não mexe nele.
 */
export function recomputarCrm(
  campos: Readonly<Record<string, unknown>>,
  eventosMantidos: ReadonlySet<string>
): { mudancas: Record<string, unknown>; vazio: boolean } {
  const inscricoes = mapa(campos['inscricoes']);
  const eventos = mapa(campos['eventos']);

  const inscricoesVivas: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(inscricoes)) {
    const ev = texto(mapa(valor)['eventoId']);
    if (ev !== undefined && eventosMantidos.has(ev)) inscricoesVivas[chave] = clonar(valor);
  }
  const eventosVivos: Record<string, unknown> = {};
  for (const [ev, valor] of Object.entries(eventos)) if (eventosMantidos.has(ev)) eventosVivos[ev] = clonar(valor);

  const lista = Object.values(inscricoesVivas).map(mapa);
  const valorGasto = lista.reduce((s, i) => s + numero(i['valorPago']), 0);

  return {
    mudancas: {
      inscricoes: inscricoesVivas,
      eventos: eventosVivos,
      qtdInscricoes: lista.length,
      qtdEventos: Object.keys(eventosVivos).length,
      valorGasto,
      ltv: valorGasto,
    },
    vazio: lista.length === 0 && Object.keys(eventosVivos).length === 0,
  };
}

/** Troca ocorrências do nome antigo pelo novo dentro de um texto livre. */
export function trocarNome(valor: string, antigo: string, novo: string): string {
  if (antigo === '') return valor;
  return valor.split(antigo).join(novo);
}

/**
 * Aplica mudanças em notação de ponto sobre uma CÓPIA dos campos. Usado só
 * para simular o estado pós-plano; não escreve em lugar nenhum.
 */
export function aplicarMudancas(
  campos: Readonly<Record<string, unknown>>,
  mudancas: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  const copia = clonar(campos) as Record<string, unknown>;
  for (const [chave, valor] of Object.entries(mudancas)) {
    const partes = chave.split('.');
    let alvo: Record<string, unknown> = copia;
    for (let i = 0; i < partes.length - 1; i += 1) {
      const p = partes[i] as string;
      const atual = alvo[p];
      if (atual === null || typeof atual !== 'object' || Array.isArray(atual)) alvo[p] = {};
      alvo = alvo[p] as Record<string, unknown>;
    }
    // Cópia PROFUNDA do valor: sem isto a simulação enxerta no documento o
    // mesmo objeto que a operação carrega e escreve DENTRO dela.
    alvo[partes[partes.length - 1] as string] = clonar(valor);
  }
  return copia;
}

export function idsCondenadosDe(eventos: ReadonlySet<string>, tenants: ReadonlySet<string>): ReadonlySet<string> {
  return new Set<string>([...eventos, ...tenants]);
}

/**
 * [B4] Poda chaves de mapa cujo NOME é o identificador de uma entidade
 * condenada, em QUALQUER profundidade.
 *
 * A versão anterior parava no primeiro ramo reescrito, então uma chave morta
 * mais funda escapava. Agora a poda desce sempre; o ramo reescrito é o mais
 * ALTO que continha chave condenada, e o conteúdo abaixo dele já vai podado.
 */
export function podarChavesCondenadas(
  campos: Readonly<Record<string, unknown>>,
  condenados: ReadonlySet<string>
): Record<string, unknown> {
  const mudancas: Record<string, unknown> = {};

  /** Devolve a cópia podada, ou null quando nada mudou naquele ramo. */
  const podar = (valor: unknown): unknown | null => {
    if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return null;
    const obj = valor as Record<string, unknown>;
    let mudou = false;
    const saida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (condenados.has(k)) {
        mudou = true;
        continue;
      }
      const filho = podar(v);
      if (filho !== null) {
        mudou = true;
        saida[k] = filho;
      } else {
        saida[k] = clonar(v);
      }
    }
    return mudou ? saida : null;
  };

  for (const [k, v] of Object.entries(campos)) {
    const podado = podar(v);
    if (podado !== null) mudancas[k] = podado;
  }
  return mudancas;
}

/**
 * [F7] Fecha os números macro no PRÓPRIO patch, em vez de deixar recado.
 *
 * A review rebaixou o B4 sem fechá-lo: a poda tirava as chaves dos tenants
 * mortos e os totais de raiz continuavam do mundo antigo (R$ 364.627 de GMV,
 * 4 tenants ativos) até alguém lembrar de chamar `recomputePlatformRollups` —
 * callable manual de `platform_admin`, sem cron. Promessa em vez de garantia.
 *
 * O script já tem o mapa podado nas mãos, então o cálculo é o mesmo que o
 * callable faz (`platform/rollups.ts`): somar `gmv` e `receitaLeela` dos
 * sobreviventes e contar `status === 'ativo'`. `eventosAtivos` por tenant vem
 * da contagem real de eventos publicados que sobrevivem — o callable NÃO
 * conserta esse número, porque ele copia o campo denormalizado do documento do
 * tenant, que ninguém mantém.
 *
 * O que este recompute NÃO faz, e por quê: `gmv` de cada tenant continua sendo
 * o `gmvAcumulado` histórico. Ele é acumulador de venda que aconteceu, não
 * derivada do que sobrou. Reescrevê-lo seria apagar registro de dinheiro por
 * conta própria — a mesma linha que o ajuste A1 traçou para os snapshots
 * bancários. Fica como decisão declarada do dono, no runbook.
 */
export function recomputarRollups(
  campos: Readonly<Record<string, unknown>>,
  jaPodado: Readonly<Record<string, unknown>>,
  eventosAtivosPorTenant: ReadonlyMap<string, number>
): Record<string, unknown> {
  const base = jaPodado['tenants'] !== undefined ? jaPodado['tenants'] : campos['tenants'];
  const tenants = mapa(clonar(base));
  if (Object.keys(tenants).length === 0) return {};

  let gmvTotal = 0;
  let receitaLeelaTotal = 0;
  let tenantsAtivos = 0;

  for (const [id, bruto] of Object.entries(tenants)) {
    const linha = mapa(bruto);
    const ativos = eventosAtivosPorTenant.get(id) ?? 0;
    linha['eventosAtivos'] = ativos;
    const status = texto(linha['status']) ?? 'pending';
    // Mesma derivação de `deriveTenantHealth` no core. Replicada, não
    // importada, para o plano seguir sem dependência da plataforma.
    linha['health'] = status === 'suspenso' ? 'critico' : status === 'pending' ? 'atencao' : ativos > 0 ? 'saudavel' : 'atencao';
    if (status === 'ativo') tenantsAtivos += 1;
    gmvTotal += numero(linha['gmv']);
    receitaLeelaTotal += numero(linha['receitaLeela']);
    tenants[id] = linha;
  }

  return {
    tenants,
    gmvTotal: arredondarDinheiro(gmvTotal),
    receitaLeelaTotal: arredondarDinheiro(receitaLeelaTotal),
    tenantsAtivos,
  };
}

/**
 * [A1] Este campo pode ser renomeado por substring? Snapshot financeiro e
 * identidade bancária ficam de fora: um é registro histórico do que era
 * verdade na hora, o outro é o nome do titular de uma conta real, e "Leela
 * LTDA" seria razão social inventada por concatenação.
 */
export function renomeavel(campo: string): boolean {
  return !RX_SNAPSHOT.test(campo) && !RX_BANCARIO.test(campo);
}

/** Campos de texto que contenham o nome antigo E possam ser renomeados. */
function referenciasTextuais(
  campos: Readonly<Record<string, unknown>>,
  antigo: string
): { campo: string; valor: string }[] {
  const achados: { campo: string; valor: string }[] = [];
  if (antigo === '') return achados;
  const anda = (chave: string, valor: unknown): void => {
    if (typeof valor === 'string') {
      if (valor.includes(antigo) && renomeavel(chave)) achados.push({ campo: chave, valor });
      return;
    }
    if (Array.isArray(valor)) return valor.forEach((v, i) => anda(`${chave}[${i}]`, v));
    if (valor !== null && typeof valor === 'object') {
      for (const [k, v] of Object.entries(valor)) anda(chave === '' ? k : `${chave}.${k}`, v);
    }
  };
  anda('', campos);
  return achados;
}

/** Os uids conhecidos: a coleção `atletas` é chaveada por uid. */
function uidsTodos(inventario: readonly DocInventario[]): string[] {
  return inventario
    .filter((d) => colecaoRaiz(d.caminho) === 'atletas' && segmentos(d.caminho).length === 2)
    .map((d) => idNoNivel(d.caminho, 0) as string);
}

/**
 * [B3] O documento é INTOCÁVEL? Verdadeiro quando um uid protegido é o
 * identificador de algum segmento do caminho — `atletas/{uid}` e qualquer
 * subcoleção dele. Isto é uma trava dura: nunca entra no plano.
 */
export function intocavel(caminho: string, uidsProtegidos: ReadonlySet<string>): boolean {
  return segmentos(caminho).some((s, i) => i % 2 === 1 && uidsProtegidos.has(s));
}

/**
 * Monta o plano completo. Determinístico: mesma entrada, mesma saída, mesma
 * ordem — o que torna o dry-run uma promessa verificável do `--apply`.
 */
export function planejarLimpeza(inventario: readonly DocInventario[], alvo: AlvoLimpeza): Plano {
  const eventosMantidos = new Set(alvo.eventosMantidos);
  const tenantsMantidos = new Set(alvo.tenantsMantidos);
  const eventosCondenados = new Set(alvo.eventosCondenados);
  const tenantsCondenados = new Set(alvo.tenantsCondenados);
  const uidsProtegidos = new Set(alvo.uidsProtegidos);

  // [B2] A lista literal tem de ser coerente. Sobreposição é erro de operador,
  // e erro de operador aqui apaga o que devia ficar.
  for (const e of eventosCondenados) {
    if (eventosMantidos.has(e)) throw new Error(`alvo incoerente: evento "${e}" está mantido E condenado`);
  }
  for (const t of tenantsCondenados) {
    if (tenantsMantidos.has(t)) throw new Error(`alvo incoerente: tenant "${t}" está mantido E condenado`);
  }

  const operacoes: Operacao[] = [];
  const condenados = new Set<string>();
  const intocaveis: string[] = [];
  const conflitosDeProtecao: { caminho: string; uid: string; campo: string }[] = [];
  const fantasmas = inventario.filter((d) => d.fantasma === true).map((d) => d.caminho);

  /** Condena, a menos que o gate de proteção recuse. [B3] */
  const condenar = (doc: DocInventario, motivo: string): void => {
    if (intocavel(doc.caminho, uidsProtegidos)) {
      intocaveis.push(doc.caminho);
      return;
    }
    // Referência em CAMPO.
    for (const r of referenciasA(doc.campos, uidsProtegidos)) {
      conflitosDeProtecao.push({ caminho: doc.caminho, uid: r.valor, campo: r.campo });
    }
    // Referência dentro de CHAVE COMPOSTA (`ped-{uid}-chk-…`, `{uid}__{evento}`).
    // O identificador está no nome do documento, não num campo: `intocavel`
    // não casa (não é o segmento inteiro) e a varredura por valor também não
    // (o valor é outro). Sem isto o operador não enxerga que está apagando
    // documento de uma identidade que marcou como protegida.
    for (const seg of segmentos(doc.caminho).filter((_, i) => i % 2 === 1)) {
      for (const uid of uidsProtegidos) {
        if (seg !== uid && seg.includes(uid)) {
          conflitosDeProtecao.push({ caminho: doc.caminho, uid, campo: '(chave composta)' });
        }
      }
    }
    condenados.add(doc.caminho);
    operacoes.push({ tipo: 'apagar', caminho: doc.caminho, motivo, ordem: ordemDe(doc) });
  };

  /** Caminhos de documento-fantasma: pai que não existe mas tem subcoleção. */
  const caminhosFantasma = new Set(inventario.filter((d) => d.fantasma === true).map((d) => d.caminho));
  const souFilhoDeFantasma = (caminho: string): string | undefined => {
    for (const f of caminhosFantasma) if (caminho.startsWith(`${f}/`)) return f;
    return undefined;
  };

  // ── Passo 1: tudo que pertence a evento ou tenant condenado morre. ────────
  for (const doc of inventario) {
    const ev = eventoDoDoc(doc);
    const tn = tenantDoDoc(doc);
    const porEvento = ev !== undefined && eventosCondenados.has(ev);
    const porTenant = tn !== undefined && tenantsCondenados.has(tn);
    if (!porEvento && !porTenant) continue;
    // O CRM do tenant que SOBREVIVE nunca morre por evento: ele é cirurgia.
    if (colecaoRaiz(doc.caminho) === 'tenants' && !porTenant) continue;
    condenar(doc, porTenant ? `tenant condenado: ${tn ?? '?'}` : `evento condenado: ${ev ?? '?'}`);
  }

  // ── Passo 2: o código do pedido mora fora do pedido. Sai junto. ───────────
  // [B2] Casa contra a lista literal de eventos condenados, e não contra "o
  // pedido está no conjunto de condenados desta rodada" — assim uma retomada
  // depois de queda ainda apaga o código do pedido que já morreu.
  const pedidoPorId = new Map(
    inventario.filter((d) => colecaoRaiz(d.caminho) === 'pedidos').map((d) => [idNoNivel(d.caminho, 0) as string, d])
  );
  for (const doc of inventario) {
    if (colecaoRaiz(doc.caminho) !== 'pedidoCodigos') continue;
    if (condenados.has(doc.caminho)) continue;
    const pedidoId = texto(doc.campos['pedidoId']);
    if (pedidoId === undefined || pedidoId === '') continue;
    const pedido = pedidoPorId.get(pedidoId);
    const eventoDoPedido = pedido === undefined ? undefined : texto(pedido.campos['eventoId']);
    // Pedido ausente do inventário = já apagado numa rodada anterior; o código
    // órfão continua tendo de sair. Pedido presente: decide o evento dele.
    const morre =
      pedido === undefined
        ? !inventario.some((d) => d.caminho === `pedidos/${pedidoId}`)
        : eventoDoPedido !== undefined && eventosCondenados.has(eventoDoPedido);
    if (!morre) continue;
    condenar(doc, `reserva do código de um pedido condenado (${pedidoId})`);
  }

  // ── Passo 3: cirurgia no CRM do tenant sobrevivente. ──────────────────────
  for (const doc of inventario) {
    if (condenados.has(doc.caminho)) continue;
    if (segmentos(doc.caminho)[2] !== 'crmClientes') continue;
    const { mudancas, vazio } = recomputarCrm(doc.campos, eventosMantidos);
    if (vazio) {
      condenar(doc, 'cliente de CRM sem nenhuma inscrição sobrevivente');
      continue;
    }
    const antes = Object.keys(mapa(doc.campos['inscricoes'])).length;
    if (antes === (mudancas['qtdInscricoes'] as number)) continue;
    operacoes.push({
      tipo: 'editar',
      caminho: doc.caminho,
      mudancas,
      motivo: `ledger do CRM: ${antes - (mudancas['qtdInscricoes'] as number)} inscrição(ões) de evento condenado removida(s)`,
      ordem: ORDEM.SOBREVIVENTES,
    });
  }

  const idsCondenados = idsCondenadosDe(eventosCondenados, tenantsCondenados);

  // ── Passo 3c: lixo sob documento-fantasma. ───────────────────────────────
  // Um documento cujo PAI não existe já é inalcançável pelo produto: nenhuma
  // tela chega nele, e ele nem aparece numa listagem comum (só com
  // `showMissing`). Quando ele AINDA POR CIMA aponta para entidade condenada,
  // é lixo que a limpeza tem de levar — senão a lane termina deixando órfão
  // que ela mesma não consegue ver.
  //
  // A exceção é o fantasma de identidade PROTEGIDA: ali o pai ausente é uma
  // lacuna a preencher (o dono virou organizador e ainda não tem documento em
  // `profissionais`), e não lixo a varrer. Isso é decisão do dono.
  const identidadesVarridas = new Set(alvo.identidadesFantasmaVarridas ?? []);
  for (const doc of inventario) {
    if (condenados.has(doc.caminho)) continue;
    const pai = souFilhoDeFantasma(doc.caminho);
    if (pai === undefined) continue;
    // AS DUAS CHECAGENS DE PROTEÇÃO VÊM ANTES DO CONTEÚDO, e de propósito. Se
    // eu olhasse primeiro se o documento aponta para condenado, o fantasma de
    // identidade protegida que por acaso não aponta para nada sairia daqui em
    // silêncio — preservado pelo CONTEÚDO dele, e não pela regra. A garantia
    // tem de ser estrutural: fantasma sob identidade protegida é lacuna a
    // preencher, e isso vale independente do que esteja escrito dentro dele.
    // [B3-forma] A terceira checagem (o caminho PRÓPRIO do documento) estava
    // depois do teste de conteúdo, e por isso um documento salvo pela regra
    // aparecia como salvo pelo acaso: fora da lista `intocaveis`. Mesma
    // decisão, agora visível.
    if (intocavel(pai, uidsProtegidos) || intocavel(doc.caminho, uidsProtegidos)) {
      intocaveis.push(doc.caminho);
      continue;
    }
    // [R7] Identidade declarada como varrida: some inteira, aponte para o que
    // apontar. Ver o comentário de `identidadesFantasmaVarridas`.
    const idDoFantasma = idNoNivel(pai, 0);
    const varreTudo = idDoFantasma !== undefined && identidadesVarridas.has(idDoFantasma);
    if (!varreTudo && referenciasA(doc.campos, idsCondenados).length === 0) continue;
    condenados.add(doc.caminho);
    operacoes.push({
      tipo: 'apagar',
      caminho: doc.caminho,
      motivo: varreTudo
        ? `lixo sob documento-fantasma (${pai}) de identidade sem lastro sobrevivente`
        : `lixo sob documento-fantasma (${pai}) apontando para entidade condenada`,
      ordem: ORDEM.FANTASMAS,
    });
  }

  // ── Passo 3d: [N1] condenação TRANSITIVA por prefixo de caminho. ──────────
  // Se o ancestral morre, o descendente morre — em qualquer raiz e qualquer
  // profundidade. Sob `eventos/` e `tenants/` isso já valia de graça, porque o
  // dono saía do caminho; sob `clubes/` o dono só saía de CAMPO, e o modelo
  // para de carregar `tenantId` no nível 1. O resultado medido em produção
  // eram 45 documentos de nível 2 (33 `acoes`, 12 `conversoes`) vivos sob pai
  // apagado, enquanto o runner imprimia "nenhuma referência pendurada NOVA
  // prevista" — as duas defesas passavam reto, porque `orfaosPrevistos` casa
  // VALOR de string (e eles não citam id nenhum) e a varredura de fantasmas
  // exige `fantasma === true` no inventário (e o pai só morre DURANTE a
  // corrida). Laço até estabilizar: neto de condenado também é condenado.
  for (let mudou = true; mudou; ) {
    mudou = false;
    for (const doc of inventario) {
      if (condenados.has(doc.caminho)) continue;
      const ancestralMorto = ancestraisDe(doc.caminho).find((a) => condenados.has(a));
      if (ancestralMorto === undefined) continue;
      const antes = condenados.size;
      condenar(doc, `descendente de documento condenado (${ancestralMorto})`);
      // `condenar` recusa em silêncio o que for intocável — e aí este
      // documento vira SOBREVIVENTE sob pai apagado. O Passo 5 o denuncia
      // como órfão estrutural; nunca fica calado.
      if (condenados.size !== antes) mudou = true;
    }
  }

  // [F7] Quantos eventos "ativos" cada tenant tem DEPOIS do plano. É a mesma
  // definição que o produto usa: evento `publicado` que sobrevive. Medido em
  // produção antes de escrever esta linha — hoje `castelo-producoes` tem 5
  // publicados, e depois da limpeza fica com 2.
  const eventosAtivosPorTenant = new Map<string, number>();
  for (const doc of inventario) {
    if (colecaoRaiz(doc.caminho) !== 'eventos' || segmentos(doc.caminho).length !== 2) continue;
    if (condenados.has(doc.caminho)) continue;
    if (texto(doc.campos['status']) !== 'publicado') continue;
    const tn = texto(doc.campos['tenantId']);
    if (tn === undefined) continue;
    eventosAtivosPorTenant.set(tn, (eventosAtivosPorTenant.get(tn) ?? 0) + 1);
  }

  // ── Passo 3b: chave de mapa que É o id de um condenado. [B4] ─────────────
  for (const doc of inventario) {
    if (condenados.has(doc.caminho)) continue;
    if (segmentos(doc.caminho)[2] === 'crmClientes') continue; // já tratado acima
    const mudancas = podarChavesCondenadas(doc.campos, idsCondenados);
    const ehRollup = doc.caminho === CAMINHO_ROLLUPS;
    if (ehRollup) Object.assign(mudancas, recomputarRollups(doc.campos, mudancas, eventosAtivosPorTenant));
    if (Object.keys(mudancas).length === 0) continue;
    operacoes.push({
      tipo: 'editar',
      caminho: doc.caminho,
      mudancas,
      motivo: ehRollup
        ? 'rollups da plataforma: chaves de tenant condenado removidas e os totais recomputados dos sobreviventes'
        : 'mapa com chave de entidade condenada — chave removida',
      ordem: ORDEM.SOBREVIVENTES,
    });
  }

  // ── Passo 4: o nome da produtora, nas superfícies renomeáveis. [A1] ───────
  for (const doc of inventario) {
    if (condenados.has(doc.caminho)) continue;
    const mudancas: Record<string, unknown> = {};
    for (const { campo, valor } of referenciasTextuais(doc.campos, alvo.nomeAntigo)) {
      mudancas[campo] = trocarNome(valor, alvo.nomeAntigo, alvo.nomeNovo);
    }
    if (Object.keys(mudancas).length === 0) continue;
    operacoes.push({
      tipo: 'editar',
      caminho: doc.caminho,
      mudancas,
      motivo: `nome de exibição: "${alvo.nomeAntigo}" vira "${alvo.nomeNovo}"`,
      ordem: ORDEM.SOBREVIVENTES,
    });
  }

  // ── Passo 4b: links de semente que o dono mandou remover. ────────────────
  // Não é faxina automática: só sai o que está declarado em `linksARemover`.
  // Um perfil público apontando para conta que não existe gasta a confiança
  // de quem clica, mas inventar o link novo é do dono, não do script.
  const linksARemover = alvo.linksARemover ?? [];
  if (linksARemover.length > 0) {
    for (const doc of inventario) {
      if (condenados.has(doc.caminho)) continue;
      const links = doc.campos['linksExternos'];
      if (!Array.isArray(links)) continue;
      const sobrevivem = links.filter((l) => {
        const url = texto(mapa(l)['url']) ?? '';
        return !linksARemover.some((trecho) => url.includes(trecho));
      });
      if (sobrevivem.length === links.length) continue;
      operacoes.push({
        tipo: 'editar',
        caminho: doc.caminho,
        mudancas: { linksExternos: clonar(sobrevivem) },
        motivo: `link de semente removido por decisão do dono (${links.length - sobrevivem.length} de ${links.length})`,
        ordem: ORDEM.SOBREVIVENTES,
      });
    }
  }

  // ── Passo 5: órfãos previstos, medidos no estado DEPOIS do plano. ────────
  const edicoesPorCaminho = new Map<string, Record<string, unknown>>();
  for (const op of operacoes) {
    if (op.tipo !== 'editar') continue;
    edicoesPorCaminho.set(op.caminho, { ...(edicoesPorCaminho.get(op.caminho) ?? {}), ...op.mudancas });
  }
  const orfaosPrevistos: { caminho: string; campo: string; valor: string }[] = [];
  for (const doc of inventario) {
    if (condenados.has(doc.caminho)) continue;
    const depois = aplicarMudancas(doc.campos, edicoesPorCaminho.get(doc.caminho) ?? {});
    for (const r of referenciasA(depois, idsCondenados)) {
      orfaosPrevistos.push({ caminho: doc.caminho, campo: r.campo, valor: r.valor });
    }
    // [N1] Órfão ESTRUTURAL: o documento sobrevive, mas o caminho dele tem um
    // prefixo que vai ser apagado. Ele não cita id condenado nenhum, então a
    // varredura por VALOR acima passa reto — foi exatamente assim que 45
    // documentos ficaram invisíveis para as duas defesas. Com a condenação
    // transitiva do Passo 3d isto normalmente sai vazio; quando não sai, o
    // motivo é uma trava de proteção, e aí a lane tem de DIZER, não calar.
    const ancestralMorto = ancestraisDe(doc.caminho).find((a) => condenados.has(a));
    if (ancestralMorto !== undefined) {
      orfaosPrevistos.push({ caminho: doc.caminho, campo: '(caminho sob prefixo apagado)', valor: ancestralMorto });
    }
  }

  // ── Passo 6: contas que perdem o último lastro. Relatadas, não apagadas. ──
  const todosUids = uidsTodos(inventario);
  const lastroVivo = new Set<string>();
  for (const doc of inventario) {
    if (condenados.has(doc.caminho)) continue;
    if (colecaoRaiz(doc.caminho) === 'atletas') continue; // o espelho não é lastro
    for (const r of referenciasA(doc.campos, new Set(todosUids))) lastroVivo.add(r.valor);
  }
  const contasSemLastro = todosUids.filter((u) => !uidsProtegidos.has(u) && !lastroVivo.has(u)).sort();

  // Ordem do grupo primeiro. Dentro do grupo, o MAIS FUNDO sai primeiro: com a
  // condenação transitiva, pai e filho podem cair no mesmo grupo (`clubes/{c}/
  // desafios/{d}` e `.../acoes/{a}` são ambos FOLHAS_CLUBE), e o desempate
  // alfabético punha o pai antes — abrindo uma janela, dentro da corrida, em
  // que o filho existe sob pai já apagado. Filho antes de pai fecha a janela.
  // O `localeCompare` fica como último desempate, para o plano continuar
  // determinístico independentemente da ordem em que o inventário chegou.
  operacoes.sort(
    (a, b) => a.ordem - b.ordem || profundidade(b.caminho) - profundidade(a.caminho) || a.caminho.localeCompare(b.caminho)
  );

  const resumoPorColecao: Record<string, { apagar: number; editar: number }> = {};
  for (const op of operacoes) {
    const forma = segmentos(op.caminho)
      .map((s, i) => (i % 2 === 1 ? '{id}' : s))
      .join('/');
    resumoPorColecao[forma] ??= { apagar: 0, editar: 0 };
    if (op.tipo === 'apagar') resumoPorColecao[forma].apagar += 1;
    else resumoPorColecao[forma].editar += 1;
  }

  // ── [B4] O que o plano NÃO conserta, e o runbook precisa. ────────────────
  const recomputesObrigatorios = [
    'platform/rollups — os quatro números (gmvTotal, receitaLeelaTotal, tenantsAtivos e o ' +
      'eventosAtivos de cada tenant) JÁ VÃO no PATCH desta corrida [F7]. `recomputePlatformRollups` ' +
      '(callable de platform_admin; NÃO há cron) fica como CONFERÊNCIA depois, não como correção. ' +
      'Atenção: o callable copia `tenants/{id}.eventosAtivos` do documento do tenant, que ninguém ' +
      'mantém — rodá-lo sem corrigir esse campo desfaz o eventosAtivos que este plano acerta.',
    'tenants/{tenant}/saldo/current — recomputar EXPLICITAMENTE. Antes ele se curava por acidente, ' +
      'porque as 3 edições de repasses eram as últimas operações e disparavam onRepasseWrite. ' +
      'Com o snapshot fora do renomeador [A1] essas escritas somem, e a cura some junto.',
    'profissionais/{uid}/dashboard/current — onEventoWriteDashboard e onClubeWriteDashboard fazem ' +
      '`set` INCONDICIONAL, sem checar se o doc pai existe. Cada delete de evento/clube CRIA um ' +
      'dashboard sob pai inexistente. Varrer documento-fantasma DEPOIS da drenagem — e a drenagem ' +
      'antes do grupo FANTASMAS é a única que precisa ser generosa (medida: 17,3 s do write até a ' +
      'última escrita do gatilho, em 06/08 14:22).',
  ];

  // Relatórios em ordem ESTÁVEL. A ordem de leitura do inventário é
  // concorrente e não repetível; sem isto o arquivo congelado sai diferente a
  // cada dry-run em partes que ninguém mudou, e a revisão perde o diff.
  const chaveDoConflito = (c: { caminho: string; uid: string; campo: string }): string =>
    `${c.caminho} ${c.campo} ${c.uid}`;
  const chaveDoOrfao = (o: { caminho: string; campo: string; valor: string }): string =>
    `${o.caminho} ${o.campo} ${o.valor}`;

  return {
    operacoes,
    orfaosPrevistos: [...orfaosPrevistos].sort((a, b) => chaveDoOrfao(a).localeCompare(chaveDoOrfao(b))),
    contasSemLastro,
    intocaveis: [...new Set(intocaveis)].sort(),
    conflitosDeProtecao: [...conflitosDeProtecao].sort((a, b) => chaveDoConflito(a).localeCompare(chaveDoConflito(b))),
    fantasmas: [...fantasmas].sort(),
    recomputesObrigatorios,
    resumoPorColecao,
  };
}
