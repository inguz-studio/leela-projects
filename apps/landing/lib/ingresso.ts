// =============================================================================
// apps/landing/lib/ingresso.ts
//
// Leitor SERVER-SIDE do ingresso por link (S1214-T2 · RN-418/419).
//
// A página NÃO lê `inscritos` e NÃO verifica o token: ela faz um POST para a
// Function `ingressoPorLink`, que tem a chave, e consome a projeção pronta. O
// motivo é a CHAVE, não o banco (D-ING-3): com `QR_TOKEN_KEYS` dentro do
// runtime do Next, uma falha em qualquer dependência desta aplicação — que
// processa slug de URL, imagem de terceiro e é redeployada a cada mexida de
// marketing — passaria a permitir forjar QR de check-in offline, para qualquer
// evento, de qualquer tenant, sem tocar no banco.
//
// TRÊS DESFECHOS, e a página renderiza um para cada:
//   - `{ situacao: 'ok' }`        — a projeção;
//   - `{ situacao: 'nao_encontrado' }` — a negativa ÚNICA do servidor (token
//     inválido, assinatura inválida, inscrito ou evento inexistente: uma
//     resposta só, sem oráculo — RN-419);
//   - `{ situacao: 'indisponivel' }` — não deu para perguntar (cold start,
//     rede, 5xx). NUNCA colapsar isto em "não encontrado": dizer que o
//     ingresso não existe quando o que caiu foi a rede é mentir para quem
//     comprou (RN-421 — "degrada com honestidade").
//
// O token NÃO viaja na query string: vai no corpo do POST, porque query string
// entra no log de request de qualquer proxy no caminho.
// =============================================================================

import type { EstadoIngressoPagina } from '@leela/core';

/** Projeção devolvida pela Function — espelho do contrato de `ingressoPorLink`. */
export interface IngressoProjetado {
  estado: EstadoIngressoPagina;
  titular: string;
  evento: { nome: string; dataISO: string | null; local: string };
  modalidade: string;
  kit: string | null;
  tamanho: string | null;
  codigo: string;
  qrDataUri?: string;
  credenciadoEm?: string;
}

export type ResultadoIngresso =
  | { situacao: 'ok'; ingresso: IngressoProjetado }
  | { situacao: 'nao_encontrado' }
  | { situacao: 'indisponivel' };

/**
 * Rótulo, tom e aviso de cada estado (RN-421) — a COPY, numa fonte só.
 *
 * Morava dentro do `IngressoView` até a S1214-T5, quando o arquivo PDF virou a
 * TERCEIRA superfície a renderizar o mesmo ingresso (página, folha A4 e agora
 * arquivo). Copy repetida em três lugares diverge no primeiro ajuste de texto,
 * e a spec do PDF nomeia exatamente esse risco. Vive aqui, e não no
 * componente, porque o gerador de PDF não é React e não pode importar `.tsx`
 * de dentro de um Route Handler sem arrastar o DS junto.
 */
export const ESTADO_INGRESSO_UI: Record<
  EstadoIngressoPagina,
  { rotulo: string; variante: 'vitoria' | 'alerta' | 'vulcao' | 'neutro'; aviso: string }
> = {
  valido: {
    rotulo: 'Ingresso válido',
    variante: 'vitoria',
    aviso: 'Apresente este QR no credenciamento. Se a imagem não abrir, o código abaixo identifica a inscrição.',
  },
  credenciado: {
    rotulo: 'Credenciado',
    variante: 'vitoria',
    aviso: 'A presença já foi registrada. O ingresso continua aqui para você conferir.',
  },
  emitindo: {
    rotulo: 'Emitindo',
    variante: 'alerta',
    aviso: 'Estamos emitindo seu ingresso. Assim que ele ficar pronto, o QR aparece nesta mesma página.',
  },
  pendente: {
    rotulo: 'Pagamento pendente',
    variante: 'alerta',
    aviso: 'O pagamento ainda não foi confirmado. O ingresso é emitido assim que a confirmação chegar.',
  },
  cancelado: {
    rotulo: 'Inscrição cancelada',
    variante: 'vulcao',
    aviso: 'Esta inscrição foi cancelada e não dá acesso ao evento. O código continua aqui para atendimento.',
  },
  estornado: {
    rotulo: 'Inscrição estornada',
    variante: 'vulcao',
    aviso: 'O valor desta inscrição foi devolvido, então ela não dá acesso ao evento. O código continua aqui para atendimento.',
  },
  encerrado: {
    rotulo: 'Evento encerrado',
    variante: 'neutro',
    aviso: 'Este evento já aconteceu. A página fica como histórico da sua participação.',
  },
};

/** Quanto esperamos pela Function antes de degradar (cold start cabe aqui). */
export const TIMEOUT_INGRESSO_MS = 12_000;

/**
 * Base das Functions HTTP. Ordem de resolução, da mais explícita para a mais
 * derivada — a mesma disciplina de `firebaseAdmin.ts`:
 *   1. `LEELA_FUNCTIONS_BASE` (escape hatch de operação: domínio próprio,
 *      proxy, região diferente);
 *   2. Emulator Suite ligado ⇒ `http://{host}:{porta}/{projectId}/us-central1`;
 *   3. produção ⇒ `https://us-central1-{projectId}.cloudfunctions.net`.
 *
 * `us-central1` é a região das Functions do projeto (registrada na
 * DEPLOY-PREVIEW; o `api-client` também fixa ela em `getFunctions`).
 */
export function baseFunctions(): string {
  const explicita = process.env['LEELA_FUNCTIONS_BASE'];
  if (explicita !== undefined && explicita.trim().length > 0) {
    return explicita.trim().replace(/\/+$/, '');
  }
  const projectId =
    process.env['GOOGLE_CLOUD_PROJECT'] ??
    process.env['GCLOUD_PROJECT'] ??
    process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] ??
    'demo-leela';

  const usaEmulator =
    process.env['LEELA_USE_EMULATOR'] === 'true' ||
    process.env['NEXT_PUBLIC_USE_EMULATOR'] === 'true';
  if (usaEmulator) {
    const host = process.env['NEXT_PUBLIC_EMULATOR_HOST'] ?? '127.0.0.1';
    const porta = process.env['NEXT_PUBLIC_EMULATOR_FUNCTIONS_PORT'] ?? '5001';
    return `http://${host}:${porta}/${projectId}/us-central1`;
  }
  return `https://us-central1-${projectId}.cloudfunctions.net`;
}

/**
 * Busca o ingresso pelo token do link.
 *
 * `fetchImpl` é injetável só para teste — em runtime é o `fetch` do Node.
 */
export async function buscarIngressoPorLink(
  token: string,
  fetchImpl: typeof fetch = fetch
): Promise<ResultadoIngresso> {
  // Guarda barata antes da rede: nada de token vazio ou absurdo virar request.
  // Não é validação de segurança (quem valida é a Function) e não distingue
  // nada para quem olha de fora — a página renderiza a mesma tela.
  if (typeof token !== 'string' || token.length === 0 || token.length > 512) {
    return { situacao: 'nao_encontrado' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_INGRESSO_MS);
  try {
    const resposta = await fetchImpl(`${baseFunctions()}/ingressoPorLink`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (resposta.status === 404) return { situacao: 'nao_encontrado' };
    if (!resposta.ok) return { situacao: 'indisponivel' };

    const corpo = (await resposta.json()) as Record<string, unknown>;
    if (corpo['ok'] !== true) return { situacao: 'nao_encontrado' };
    return { situacao: 'ok', ingresso: corpo as unknown as IngressoProjetado };
  } catch {
    // Timeout, DNS, TLS, JSON torto — tudo é "não consegui perguntar".
    return { situacao: 'indisponivel' };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Formatação (fuso da prova — mesma convenção do leitor público)
// ---------------------------------------------------------------------------

const FUSO = 'America/Sao_Paulo';
const fmtData = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: FUSO,
});
const fmtHora = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: FUSO,
});

/** "13 de setembro de 2026, 06h00" — vazio quando não há data. @pure */
export function formatarDataEvento(iso: string | null): string {
  if (iso === null) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${fmtData.format(d)}, ${fmtHora.format(d).replace(':', 'h')}`;
}

/** "13/09/2026 às 06h12" — carimbo do credenciamento. @pure */
export function formatarCarimbo(iso: string | undefined): string {
  if (iso === undefined) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO }).format(d)} às ${fmtHora
    .format(d)
    .replace(':', 'h')}`;
}
