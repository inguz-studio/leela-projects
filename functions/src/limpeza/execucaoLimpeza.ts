// =============================================================================
// execucaoLimpeza — o LAÇO que executa o plano, separado do I/O.
//
// POR QUE ESTE ARQUIVO EXISTE. A review fria (`leela-rev2-fria-20260806.md`)
// derrubou o `--apply` em três pontos que moram todos aqui, e não no plano:
//
//   R1  a digital não era reproduzível (JSON.stringify na ordem de inserção,
//       e a ordem de inserção vem do mapa `fields` da API REST, que é
//       ALEATÓRIA a cada resposta — 12 leituras do mesmo documento, mesmo
//       `updateTime`, deram 12 ordens diferentes);
//   R2  o `--retomar` era inalcançável, porque o `--apply` replanejava do
//       banco meio apagado e o portão de digital matava o processo antes de
//       ele chegar ao checkpoint;
//   R3  a chave de checkpoint era `tipo:caminho`, e o plano tem dois pares de
//       operações que compartilham essa chave — uma queda entre elas fazia a
//       retomada pular as duas e anunciar sucesso.
//
// Nada disso era testável enquanto vivia dentro de `main()` num arquivo de
// `scripts/`: o vitest só coleta `src/**/*.test.ts`. Aqui o laço vira função
// pura de efeitos INJETADOS, e o teste corta a execução em todos os limites de
// grupo e nos dois pontos de colisão sem tocar em rede nenhuma.
// =============================================================================

import * as crypto from 'crypto';
import type { Operacao, Plano } from './planoLimpeza';

// ── [R1] Digital reproduzível ────────────────────────────────────────────────

/**
 * Devolve uma cópia com as chaves de todo objeto ordenadas, recursivamente.
 * Arrays preservam a ordem (nelas a ordem É o dado).
 *
 * Sem isto, `JSON.stringify` serializa na ordem de inserção — e a ordem de
 * inserção do plano vem do `Object.entries()` sobre o `fields` que a API REST
 * devolve, que muda a cada resposta. Era isso que fazia a digital dançar entre
 * dry-runs contra produção inalterada.
 */
export function canonicalizar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(canonicalizar);
  if (valor === null || typeof valor !== 'object') return valor;
  const entradas = Object.entries(valor as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const saida: Record<string, unknown> = {};
  for (const [k, v] of entradas) saida[k] = canonicalizar(v);
  return saida;
}

/** Forma canônica em texto — o que entra no sha256. Exportada para o teste. */
export function textoCanonico(valor: unknown): string {
  return JSON.stringify(canonicalizar(valor));
}

/**
 * Impressão digital do plano: sha256 da forma CANÔNICA das operações.
 *
 * Só as operações entram. `orfaosPrevistos`, `conflitosDeProtecao` e afins são
 * relatório: mudam de ordem entre leituras sem que o que será ESCRITO mude, e
 * fazê-los pesar na digital reintroduziria o R1 por outra porta.
 */
export function digitalDoPlano(plano: Pick<Plano, 'operacoes'>): string {
  return crypto.createHash('sha256').update(textoCanonico(plano.operacoes)).digest('hex');
}

// ── [R3] Chave de checkpoint única por operação ──────────────────────────────

/**
 * A chave que o checkpoint registra. O ÍNDICE entra porque `tipo:caminho` não
 * é único: o plano real tem `editar:perfis/castelo` duas vezes (nome e links)
 * e `editar:platform/rollups` duas vezes (poda e nome). Sem o índice, uma
 * queda entre as duas fazia `feitas.has(chave)` casar as duas na retomada — a
 * segunda nunca rodava e o script anunciava que tinha aplicado tudo.
 *
 * O índice é posição no plano CONGELADO, que é o mesmo arquivo nas duas
 * rodadas. Por isso ele é estável: a retomada não replaneja.
 */
export function chaveDaOp(op: Operacao, indice: number): string {
  return `${indice}:${op.tipo}:${op.caminho}`;
}

// ── [R2] O laço, com os efeitos injetados ────────────────────────────────────

export interface EfeitosDeExecucao {
  readonly apagar: (caminho: string) => Promise<void>;
  readonly editar: (caminho: string, mudancas: Readonly<Record<string, unknown>>) => Promise<void>;
  /** Registra a operação como feita. Tem de ser DURÁVEL antes de devolver. */
  readonly registrarFeita: (chave: string) => void;
  /** Espera os gatilhos do grupo anterior aterrissarem. */
  readonly drenar: (deOrdem: number, paraOrdem: number) => Promise<void>;
  readonly aoProgresso?: (aplicadas: number, op: Operacao, indice: number) => void;
}

export interface ResultadoDaExecucao {
  readonly aplicadas: number;
  readonly puladas: number;
  /** Chaves executadas NESTA rodada, na ordem. O teste soma as duas rodadas. */
  readonly chavesAplicadas: readonly string[];
}

/**
 * Executa as operações do plano CONGELADO, uma a uma, na ordem, registrando
 * checkpoint depois de cada uma.
 *
 * Duas escolhas que valem comentário:
 *
 * 1. O checkpoint é gravado DEPOIS da operação. Uma queda entre a escrita e o
 *    registro reexecuta a operação na retomada — e reexecutar é seguro: DELETE
 *    de documento ausente devolve 200, e o PATCH carrega corpo fixo, vindo do
 *    arquivo congelado, com máscara e valores idênticos.
 * 2. A drenagem só acontece se o grupo anterior REALMENTE escreveu alguma
 *    coisa. Numa retomada que pula os oito primeiros grupos, esperar por
 *    gatilhos que ninguém disparou seria queimar minuto da janela de 60
 *    minutos de retenção de versão — que é a única rede de volta que existe.
 */
export async function executarPlano(
  operacoes: readonly Operacao[],
  jaFeitas: ReadonlySet<string>,
  efeitos: EfeitosDeExecucao
): Promise<ResultadoDaExecucao> {
  let aplicadas = 0;
  let puladas = 0;
  const chavesAplicadas: string[] = [];

  let ordemAtual = operacoes[0]?.ordem ?? 0;
  let escreveuNoGrupo = false;

  for (let i = 0; i < operacoes.length; i += 1) {
    const op = operacoes[i] as Operacao;

    if (op.ordem !== ordemAtual) {
      if (escreveuNoGrupo) await efeitos.drenar(ordemAtual, op.ordem);
      ordemAtual = op.ordem;
      escreveuNoGrupo = false;
    }

    const chave = chaveDaOp(op, i);
    if (jaFeitas.has(chave)) {
      puladas += 1;
      continue;
    }

    if (op.tipo === 'apagar') await efeitos.apagar(op.caminho);
    else await efeitos.editar(op.caminho, op.mudancas);

    efeitos.registrarFeita(chave);
    escreveuNoGrupo = true;
    aplicadas += 1;
    chavesAplicadas.push(chave);
    efeitos.aoProgresso?.(aplicadas, op, i);
  }

  return { aplicadas, puladas, chavesAplicadas };
}

// ── [R4] O portão do backup, com régua temporal ──────────────────────────────

export interface ReguaDoBackup {
  /** Instante em que o export foi CONCLUÍDO (ISO-8601, vindo do GCS). */
  readonly tirado: string;
  /** Instante mínimo aceitável. Export anterior a ele é recusado. */
  readonly minimo: string;
  /** Agora. Injetado para o teste não depender do relógio. */
  readonly agora: number;
  /** Idade máxima tolerada, em minutos. */
  readonly idadeMaximaMin: number;
}

/**
 * Recusa o backup errado, em vez de imprimir "confira que este instante é
 * posterior" e confiar no operador.
 *
 * Não é hipótese: o export das 13:45 é ANTERIOR à transferência de
 * titularidade das 14:22, e passava no portão anterior. Restaurar por ele
 * desfaria a transferência e trancaria o dono fora do painel — o incidente da
 * manhã, repetido pela própria rede de segurança.
 */
export function validarReguaDoBackup(r: ReguaDoBackup): void {
  const tirado = Date.parse(r.tirado);
  const minimo = Date.parse(r.minimo);
  if (Number.isNaN(tirado)) throw new Error(`[limpeza] instante do export ilegível: "${r.tirado}"`);
  if (Number.isNaN(minimo)) throw new Error(`[limpeza] --backup-minimo precisa ser ISO-8601 — recebi "${r.minimo}"`);

  if (tirado < minimo) {
    throw new Error(
      `[limpeza] backup RECUSADO: export de ${r.tirado} é ANTERIOR ao mínimo exigido (${r.minimo}). ` +
        'Restaurar por ele desfaria mudanças posteriores. Tire um export novo.'
    );
  }

  const idadeMin = (r.agora - tirado) / 60_000;
  if (idadeMin > r.idadeMaximaMin) {
    throw new Error(
      `[limpeza] backup RECUSADO: export tem ${idadeMin.toFixed(1)} min de idade, acima do teto de ` +
        `${r.idadeMaximaMin} min. Quanto mais velho, mais escrita real ele perde na volta.`
    );
  }
  if (idadeMin < -5) {
    throw new Error(`[limpeza] instante do export está no FUTURO (${r.tirado}). Relógio ou URI errados.`);
  }
}
