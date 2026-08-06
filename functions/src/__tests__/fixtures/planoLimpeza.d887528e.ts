// =============================================================================
// planoLimpeza — o PLANO de enxugamento do leela-hub, como função pura.
//
// POR QUE UMA FUNÇÃO PURA, E NÃO UM SCRIPT QUE APAGA ENQUANTO LÊ: lógica de
// exclusão sem teste é como se chama um incidente. Separando o *plano* do
// *efeito*, o plano vira dado — ordenável, imprimível, comparável e testável
// contra dado sintético sem tocar em produção. O runner (`functions/scripts/
// limpeza-prod-leela-hub.ts`) lê produção, chama esta função e ou imprime
// (dry-run) ou executa. As duas metades exercitam EXATAMENTE o mesmo plano;
// não existe caminho que só apareça no `--apply`.
//
// ORDEM É CORREÇÃO, NÃO ESTILO. Três motivos medidos nesta lane:
//   1. `onInscritoWriteAutomacao` dispara em delete (todo trigger é `onWrite`,
//      e `onWrite` acorda no delete) e PODE ENVIAR E-MAIL. Por isso as
//      automações do evento morrem ANTES dos inscritos — ordem 10 contra 30.
//   2. Se o documento do evento morrer primeiro, `agregarFinanceiro` e
//      `agregarEstoque` fazem `return null` (o evento não existe mais) e os
//      agregados do tenant congelam com valor fantasma, para sempre. Folhas
//      primeiro, pai depois.
//   3. `pedidoCodigos/{codigo}` vive FORA do subtree do pedido. Apagar o
//      pedido sem apagar o código produz o estado que o próprio módulo de
//      reserva declara proibido ("pedido sem código e código sem pedido"), e
//      queima o código para sempre. Os dois saem no mesmo plano.
//
// O QUE ESTE PLANO NÃO FAZ: não apaga conta de autenticação. Contas são
// decisão do dono e vivem noutro sistema (Identity Toolkit); o plano apenas
// REPORTA quais ficariam sem lastro. Ver `contasSemLastro`.
// =============================================================================

/** Documento lido de produção, já achatado para JS puro. */
export interface DocInventario {
  /** Caminho completo sem o prefixo de database. Ex.: `eventos/x/inscritos/y`. */
  readonly caminho: string;
  readonly campos: Readonly<Record<string, unknown>>;
}

/** O alvo, escrito como o brief o escreveu: o que FICA. */
export interface AlvoLimpeza {
  readonly tenantsMantidos: readonly string[];
  readonly eventosMantidos: readonly string[];
  /** Identidades que não morrem em hipótese alguma. */
  readonly uidsProtegidos: readonly string[];
  /** Nome de exibição novo da produtora que sobrevive. */
  readonly nomeNovo: string;
  /** Nome de exibição antigo, para trocar nas superfícies de texto. */
  readonly nomeAntigo: string;
}

export type Operacao =
  | {
      readonly tipo: 'apagar';
      readonly caminho: string;
      readonly motivo: string;
      readonly ordem: number;
    }
  | {
      readonly tipo: 'editar';
      readonly caminho: string;
      /** Caminhos de campo (notação de ponto) para o valor novo. */
      readonly mudancas: Readonly<Record<string, unknown>>;
      readonly motivo: string;
      readonly ordem: number;
    };

export interface Plano {
  readonly operacoes: readonly Operacao[];
  /** Referências a entidade morta que sobreviveriam ao plano. Deve ficar vazio. */
  readonly orfaosPrevistos: readonly {
    readonly caminho: string;
    readonly campo: string;
    readonly valor: string;
  }[];
  /** Contas cujo último lastro no banco desaparece. Não são apagadas aqui. */
  readonly contasSemLastro: readonly string[];
  readonly resumoPorColecao: Readonly<Record<string, { apagar: number; editar: number }>>;
}

// ── Ordens. Números esparsos para caber inserção sem renumerar tudo. ─────────
export const ORDEM = {
  /** Automações do evento condenado — antes de qualquer inscrito (fan-out de e-mail). */
  AUTOMACOES: 10,
  /** Campanhas e comunicações agendadas — mesma família de risco. */
  DISPAROS: 20,
  /** Folhas do evento: inscritos, lotes, kits, cupons, códigos, agregados. */
  FOLHAS_EVENTO: 30,
  /** O documento do evento. */
  EVENTO: 40,
  /** Raízes que apontam para o evento: pedidos, pagamentos, carrinhos e afins. */
  RAIZES_DO_EVENTO: 50,
  /** Folhas de clube e o clube. */
  FOLHAS_CLUBE: 60,
  CLUBE: 70,
  /** Folhas do tenant condenado e o tenant. */
  FOLHAS_TENANT: 80,
  TENANT: 90,
  /** Cirurgia nos sobreviventes: CRM, agregados, nome. */
  SOBREVIVENTES: 100,
} as const;

/** Subcoleções de evento cuja escrita pode disparar envio. Morrem primeiro. */
const SUBCOL_DISPARO = new Set(['automacoes', 'campanhas', 'comunicacoes', 'comunicacoesResumo']);

/** Campos que apontam para um evento, em qualquer coleção. */
const CAMPOS_EVENTO = ['eventoId', 'eventoVinculadoId'] as const;

const segmentos = (caminho: string): string[] => caminho.split('/');
export const colecaoRaiz = (caminho: string): string => segmentos(caminho)[0] ?? '';
export const idNoNivel = (caminho: string, nivel: number): string | undefined =>
  segmentos(caminho)[nivel * 2 + 1];

const texto = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const numero = (v: unknown): number => (typeof v === 'number' ? v : 0);
const mapa = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/**
 * Percorre um valor achatado atrás de strings que casem um conjunto de ids,
 * devolvendo o caminho de campo de cada acerto. Casa VALOR, não nome de campo:
 * é o que pega ponteiro escondido em mapa dinâmico (o `inscricoes.{chave}` do
 * CRM) e em elemento de lista (`transicoes[].por`).
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
    if (Array.isArray(valor)) {
      valor.forEach((v, i) => anda(`${chave}[${i}]`, v));
      return;
    }
    if (valor !== null && typeof valor === 'object') {
      for (const [k, v] of Object.entries(valor)) anda(chave === '' ? k : `${chave}.${k}`, v);
    }
  };
  anda('', campos);
  return achados;
}

/**
 * O evento a que um documento pertence: pelo CAMINHO quando ele está dentro do
 * subtree do evento, senão pelo campo. A ordem importa — um documento em
 * `eventos/A/...` que carregue `eventoId: B` (dado torto) pertence a A.
 */
export function eventoDoDoc(doc: DocInventario): string | undefined {
  if (colecaoRaiz(doc.caminho) === 'eventos') return idNoNivel(doc.caminho, 0);
  for (const c of CAMPOS_EVENTO) {
    const v = texto(doc.campos[c]);
    if (v !== undefined && v !== '') return v;
  }
  return undefined;
}

/** O tenant a que um documento pertence: pelo caminho ou pelo campo. */
export function tenantDoDoc(doc: DocInventario): string | undefined {
  if (colecaoRaiz(doc.caminho) === 'tenants') return idNoNivel(doc.caminho, 0);
  return texto(doc.campos['tenantId']);
}

/** A ordem de exclusão de um documento condenado. */
function ordemDe(doc: DocInventario): number {
  const raiz = colecaoRaiz(doc.caminho);
  const partes = segmentos(doc.caminho);
  if (raiz === 'eventos') {
    if (partes.length === 2) return ORDEM.EVENTO;
    const sub = partes[2] ?? '';
    if (sub === 'automacoes') return ORDEM.AUTOMACOES;
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
 * inscrito não mexe nele, e o recompute do trigger lê o mapa gravado aqui.
 * Sem esta cirurgia, o LTV do tenant continuaria contando dinheiro de evento
 * que não existe mais.
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
    if (ev !== undefined && eventosMantidos.has(ev)) inscricoesVivas[chave] = valor;
  }
  const eventosVivos: Record<string, unknown> = {};
  for (const [ev, valor] of Object.entries(eventos)) {
    if (eventosMantidos.has(ev)) eventosVivos[ev] = valor;
  }

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
 * Monta o plano completo. Determinístico: mesma entrada, mesma saída, mesma
 * ordem — o que torna o dry-run uma promessa verificável do `--apply`.
 */
export function planejarLimpeza(inventario: readonly DocInventario[], alvo: AlvoLimpeza): Plano {
  const eventosMantidos = new Set(alvo.eventosMantidos);
  const tenantsMantidos = new Set(alvo.tenantsMantidos);
  const porCaminho = new Map(inventario.map((d) => [d.caminho, d]));

  const eventosExistentes = new Set(
    inventario.filter((d) => segmentos(d.caminho).length === 2 && colecaoRaiz(d.caminho) === 'eventos').map((d) => idNoNivel(d.caminho, 0) as string)
  );
  const tenantsExistentes = new Set(
    inventario.filter((d) => segmentos(d.caminho).length === 2 && colecaoRaiz(d.caminho) === 'tenants').map((d) => idNoNivel(d.caminho, 0) as string)
  );
  const eventosCondenados = new Set([...eventosExistentes].filter((e) => !eventosMantidos.has(e)));
  const tenantsCondenados = new Set([...tenantsExistentes].filter((t) => !tenantsMantidos.has(t)));

  const operacoes: Operacao[] = [];
  const condenados = new Set<string>();

  // ── Passo 1: tudo que pertence a evento ou tenant condenado morre. ────────
  for (const doc of inventario) {
    const ev = eventoDoDoc(doc);
    const tn = tenantDoDoc(doc);
    const porEvento = ev !== undefined && eventosCondenados.has(ev);
    const porTenant = tn !== undefined && tenantsCondenados.has(tn);
    if (!porEvento && !porTenant) continue;
    // O CRM do tenant que SOBREVIVE nunca morre por evento: ele é cirurgia.
    if (colecaoRaiz(doc.caminho) === 'tenants' && !porTenant) continue;
    condenados.add(doc.caminho);
    operacoes.push({
      tipo: 'apagar',
      caminho: doc.caminho,
      motivo: porTenant ? `tenant condenado: ${tn ?? '?'}` : `evento condenado: ${ev ?? '?'}`,
      ordem: ordemDe(doc),
    });
  }

  // ── Passo 2: o código do pedido mora fora do pedido. Sai junto. ───────────
  for (const doc of inventario) {
    if (colecaoRaiz(doc.caminho) !== 'pedidoCodigos') continue;
    const pedidoId = texto(doc.campos['pedidoId']);
    if (pedidoId === undefined) continue;
    if (!condenados.has(`pedidos/${pedidoId}`)) continue;
    condenados.add(doc.caminho);
    operacoes.push({
      tipo: 'apagar',
      caminho: doc.caminho,
      motivo: `reserva do código de um pedido condenado (${pedidoId})`,
      ordem: ORDEM.RAIZES_DO_EVENTO,
    });
  }

  // ── Passo 3: cirurgia no CRM do tenant sobrevivente. ──────────────────────
  for (const doc of inventario) {
    if (condenados.has(doc.caminho)) continue;
    if (segmentos(doc.caminho)[2] !== 'crmClientes') continue;
    const { mudancas, vazio } = recomputarCrm(doc.campos, eventosMantidos);
    if (vazio) {
      condenados.add(doc.caminho);
      operacoes.push({
        tipo: 'apagar',
        caminho: doc.caminho,
        motivo: 'cliente de CRM sem nenhuma inscrição sobrevivente',
        ordem: ORDEM.SOBREVIVENTES,
      });
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

  // ── Passo 3b: chave de mapa que É o id de um condenado. ──────────────────
  // `platform/rollups` guarda `tenants: { <tenantId>: {...} }`. O tenant morre
  // e a chave fica, com o nome e o GMV dele, num documento que sobrevive. Como
  // a chave é o próprio identificador, nenhuma varredura por NOME de campo
  // acharia isto — só varrer as chaves acha.
  for (const doc of inventario) {
    if (condenados.has(doc.caminho)) continue;
    if (segmentos(doc.caminho)[2] === 'crmClientes') continue; // já tratado na cirurgia do CRM
    const mudancas = podarChavesCondenadas(doc.campos, idsCondenadosDe(eventosCondenados, tenantsCondenados));
    if (Object.keys(mudancas).length === 0) continue;
    operacoes.push({
      tipo: 'editar',
      caminho: doc.caminho,
      mudancas,
      motivo: 'mapa com chave de entidade condenada — chave removida',
      ordem: ORDEM.SOBREVIVENTES,
    });
  }

  // ── Passo 4: o nome da produtora, em toda superfície de exibição. ─────────
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

  // ── Passo 5: órfãos previstos, medidos no estado DEPOIS do plano. ────────
  // Aplicar as edições numa cópia e só então varrer é o que torna esta lista
  // honesta: se eu varresse o dado de hoje, toda cirurgia já planejada
  // apareceria como órfão e a lista viraria ruído que ninguém lê. O que sobra
  // aqui é o que o plano REALMENTE deixaria pendurado.
  const idsCondenados = idsCondenadosDe(eventosCondenados, tenantsCondenados);
  const edicoesPorCaminho = new Map<string, Record<string, unknown>>();
  for (const op of operacoes) {
    if (op.tipo !== 'editar') continue;
    const acc = edicoesPorCaminho.get(op.caminho) ?? {};
    edicoesPorCaminho.set(op.caminho, { ...acc, ...op.mudancas });
  }
  const orfaosPrevistos: { caminho: string; campo: string; valor: string }[] = [];
  for (const doc of inventario) {
    if (condenados.has(doc.caminho)) continue;
    const depois = aplicarMudancas(doc.campos, edicoesPorCaminho.get(doc.caminho) ?? {});
    for (const r of referenciasA(depois, idsCondenados)) {
      orfaosPrevistos.push({ caminho: doc.caminho, campo: r.campo, valor: r.valor });
    }
  }

  // ── Passo 6: contas que perdem o último lastro. Relatadas, não apagadas. ──
  const uidsProtegidos = new Set(alvo.uidsProtegidos);
  const lastroVivo = new Set<string>();
  for (const doc of inventario) {
    if (condenados.has(doc.caminho)) continue;
    if (colecaoRaiz(doc.caminho) === 'atletas') continue; // o próprio espelho não é lastro
    for (const r of referenciasA(doc.campos, new Set(uidsTodos(inventario)))) lastroVivo.add(r.valor);
  }
  const contasSemLastro = uidsTodos(inventario)
    .filter((u) => !uidsProtegidos.has(u) && !lastroVivo.has(u))
    .sort();

  operacoes.sort((a, b) => a.ordem - b.ordem || a.caminho.localeCompare(b.caminho));

  const resumoPorColecao: Record<string, { apagar: number; editar: number }> = {};
  for (const op of operacoes) {
    const forma = segmentos(op.caminho)
      .map((s, i) => (i % 2 === 1 ? '{id}' : s))
      .join('/');
    resumoPorColecao[forma] ??= { apagar: 0, editar: 0 };
    if (op.tipo === 'apagar') resumoPorColecao[forma].apagar += 1;
    else resumoPorColecao[forma].editar += 1;
  }

  void porCaminho;
  return { operacoes, orfaosPrevistos, contasSemLastro, resumoPorColecao };
}

/**
 * Aplica mudanças em notação de ponto sobre uma cópia dos campos. Usado só
 * para simular o estado pós-plano; não escreve em lugar nenhum.
 */
export function aplicarMudancas(
  campos: Readonly<Record<string, unknown>>,
  mudancas: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  const copia = JSON.parse(JSON.stringify(campos)) as Record<string, unknown>;
  for (const [chave, valor] of Object.entries(mudancas)) {
    const partes = chave.split('.');
    let alvo: Record<string, unknown> = copia;
    for (let i = 0; i < partes.length - 1; i += 1) {
      const p = partes[i] as string;
      const atual = alvo[p];
      if (atual === null || typeof atual !== 'object' || Array.isArray(atual)) alvo[p] = {};
      alvo = alvo[p] as Record<string, unknown>;
    }
    // Cópia PROFUNDA do valor. Sem isto, a simulação enxerta no documento o
    // mesmo objeto que a operação carrega e, ao aplicar a mudança seguinte,
    // escreve DENTRO da operação já planejada — o plano passa a mentir sobre
    // si mesmo, e o `--apply` mandaria um corpo que ninguém revisou.
    alvo[partes[partes.length - 1] as string] = clonar(valor);
  }
  return copia;
}

/** Cópia profunda por serialização. O dado do Firestore já é JSON puro aqui. */
function clonar<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

/** O conjunto de identificadores condenados, evento e tenant juntos. */
export function idsCondenadosDe(
  eventos: ReadonlySet<string>,
  tenants: ReadonlySet<string>
): ReadonlySet<string> {
  return new Set<string>([...eventos, ...tenants]);
}

/**
 * Poda chaves de mapa cujo NOME é o identificador de uma entidade condenada.
 *
 * Existe porque há denormalização chaveada por id (`platform/rollups.tenants`):
 * o ponteiro não está num campo chamado `tenantId`, está na PRÓPRIA CHAVE. Uma
 * varredura por nome de campo passa reto; uma varredura por valor também, já
 * que o valor é um objeto. Só olhar as chaves acha.
 *
 * A mudança sai no mapa INTEIRO já podado (e não numa remoção pontual) porque
 * é assim que um PATCH com máscara no mapa se comporta: o que for enviado é o
 * que fica.
 */
export function podarChavesCondenadas(
  campos: Readonly<Record<string, unknown>>,
  condenados: ReadonlySet<string>
): Record<string, unknown> {
  const mudancas: Record<string, unknown> = {};
  const anda = (chave: string, valor: unknown): void => {
    if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return;
    const obj = valor as Record<string, unknown>;
    const condenadas = Object.keys(obj).filter((k) => condenados.has(k));
    if (condenadas.length > 0) {
      const podado: Record<string, unknown> = {};
      // Cópia profunda: a operação não pode compartilhar objeto com o documento
      // de entrada, senão uma edição posterior no mesmo documento a altera.
      for (const [k, v] of Object.entries(obj)) if (!condenados.has(k)) podado[k] = clonar(v);
      mudancas[chave] = podado;
      return; // não desce: este ramo já foi reescrito por inteiro
    }
    for (const [k, v] of Object.entries(obj)) anda(chave === '' ? k : `${chave}.${k}`, v);
  };
  for (const [k, v] of Object.entries(campos)) anda(k, v);
  return mudancas;
}

/** Os uids conhecidos: a coleção `atletas` é chaveada por uid. */
function uidsTodos(inventario: readonly DocInventario[]): string[] {
  return inventario
    .filter((d) => colecaoRaiz(d.caminho) === 'atletas' && segmentos(d.caminho).length === 2)
    .map((d) => idNoNivel(d.caminho, 0) as string);
}

/** Campos de texto que contenham o nome antigo. */
function referenciasTextuais(
  campos: Readonly<Record<string, unknown>>,
  antigo: string
): { campo: string; valor: string }[] {
  const achados: { campo: string; valor: string }[] = [];
  if (antigo === '') return achados;
  const anda = (chave: string, valor: unknown): void => {
    if (typeof valor === 'string') {
      if (valor.includes(antigo)) achados.push({ campo: chave, valor });
      return;
    }
    if (Array.isArray(valor)) {
      valor.forEach((v, i) => anda(`${chave}[${i}]`, v));
      return;
    }
    if (valor !== null && typeof valor === 'object') {
      for (const [k, v] of Object.entries(valor)) anda(chave === '' ? k : `${chave}.${k}`, v);
    }
  };
  anda('', campos);
  return achados;
}
