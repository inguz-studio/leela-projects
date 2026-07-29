// =============================================================================
// functions/src/http/ingressoPorLink.ts
//
// Endpoint HTTP que verifica o token do link e devolve a PROJEÇÃO MÍNIMA do
// ingresso, com o QR já renderizado (LEELA-S1214-T1 · RN-418/419/421/422).
//
// POR QUE ESTE SALTO DE REDE EXISTE (D-ING-3 · RN-419). A landing já tem Admin
// SDK e já poderia ler qualquer `qrToken` do Firestore — o argumento não é a
// leitura do banco, é a CHAVE. Com `QR_TOKEN_KEYS` dentro do runtime do Next,
// uma falha em qualquer dependência de uma aplicação grande — que processa slug
// de URL, imagem de terceiro, e é redeployada a cada mexida de marketing —
// passaria a permitir FORJAR QR de check-in offline, para qualquer evento, de
// qualquer tenant, para sempre, sem tocar no banco. Ler o banco é barulhento e
// deixa rastro; cunhar token é silencioso. Essa assimetria paga o salto.
//
// POR QUE `onRequest` COM POST, E NÃO GET NEM CALLABLE:
//   - o token é a credencial do link; em GET ele viraria query string e entraria
//     no log de request do Cloud Run, que é exatamente o vazamento que a RN-419
//     evita ao tirá-lo do QR. No corpo do POST ele não é logado por ninguém;
//   - quem chama é o SERVIDOR da landing (SSR), nunca o navegador — então não
//     há CORS a resolver e não vale carregar o protocolo callable só para isso
//     (simplicidade operacional: um POST, um JSON, um curl que qualquer pessoa
//     repete).
//
// SEM ORÁCULO (RN-419 · ⚔ vetor 2). Token malformado, assinatura inválida, kid
// fora do ring, inscrito de outro evento, inscrito inexistente e evento
// inexistente devolvem A MESMA resposta, byte a byte: 404 com `{"ok":false}`.
// Uma constante só, num `return` só — não há caminho no código que produza duas
// negativas diferentes.
//
// A PÁGINA NÃO ESCREVE NADA (RN-418 · D-ING-10). Este handler é somente leitura:
// não credencia (quem registra presença é o balcão — RN-399/221/222), não emite
// (quem cura ausência é a varredura da RN-382) e não muda estado nenhum.
//
// PRIVACIDADE (RN-422). A projeção carrega nome do titular, evento com data e
// local, modalidade, kit e tamanho quando houver, código e estado. NÃO carrega
// CPF, telefone, e-mail, nascimento, endereço, contato de emergência, resposta
// de formulário, valor pago nem dado de outro inscrito do mesmo pedido — e
// também não devolve o `qrToken` em texto: o QR sai renderizado como imagem
// (higiene, e está escrito como higiene, não como fronteira de segurança).
//
// RATE LIMITING declarado, já que o endpoint é público por desenho: a
// autorização É a assinatura HMAC-SHA256 de 256 bits, então força bruta de
// token não é um risco endereçável por quota. O que a quota protege é a CONTA —
// por isso `maxInstances` fixo. Não há PII no log deste módulo (só ids e causa).
// =============================================================================

import * as admin from 'firebase-admin';
import { runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  isCodigoIngressoValido,
  type EstadoIngressoPagina,
} from '@leela/core';
import { estadoMostraQr } from '../../../packages/core/src/tickets/linkIngresso';
import { obterQrKeyring, type QrKeyring } from '../eventos/qrToken';
import { lerAlvoDoLinkIngresso, verificarLinkIngresso } from '../eventos/linkIngresso';
import { gerarQrDataUrl } from '../eventos/publicarEvento';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------

/** Projeção mínima do ingresso — o QUE a página pode mostrar (RN-422). */
export interface IngressoProjetado {
  ok: true;
  estado: EstadoIngressoPagina;
  /** Nome do TITULAR do ingresso (único dado pessoal da projeção). */
  titular: string;
  evento: {
    nome: string;
    /** Data/hora da prova em ISO-8601 UTC; a página formata no fuso da prova. */
    dataISO: string | null;
    local: string;
  };
  modalidade: string;
  /** Kit contratado, já em rótulo legível; null quando não há kit. */
  kit: string | null;
  /** Tamanhos escolhidos, quando o kit tem item tamanhado; null quando não. */
  tamanho: string | null;
  /** Código identificador da RN-396; string vazia quando ainda não há. */
  codigo: string;
  /** PNG data URI do QR — presente SÓ nos estados que podem mostrar QR. */
  qrDataUri?: string;
  /** Carimbo do credenciamento em ISO-8601, quando já credenciado. */
  credenciadoEm?: string;
}

/** A ÚNICA negativa possível — sem oráculo (RN-419). */
export interface IngressoNaoEncontrado {
  ok: false;
}

/**
 * Corpo, status e content-type da negativa. Constante de módulo de propósito:
 * qualquer caminho de falha responde exatamente isto, e um `grep` prova que só
 * existe um lugar onde a negativa é escrita.
 */
export const CORPO_NEGATIVA = '{"ok":false}';
export const STATUS_NEGATIVA = 404;

// ---------------------------------------------------------------------------
// Rótulos (RN-202 — o enum de kit é da casa, o rótulo é da página)
// ---------------------------------------------------------------------------

const ROTULO_KIT: Record<string, string> = {
  kit_ouro: 'Kit Ouro',
  kit_prata: 'Kit Prata',
  kit_basico: 'Kit Básico',
};

// ---------------------------------------------------------------------------
// Matriz de estados (RN-421) — pura, para o teste bater nela direto
// ---------------------------------------------------------------------------

export interface EstadoBruto {
  /** `inscrito.status` (RN-204) */
  statusInscrito: string;
  /** `evento.status` (RN-201) */
  statusEvento: string;
  temQrToken: boolean;
  temCheckin: boolean;
}

/**
 * Decide o estado EXIBIDO a partir do estado gravado (RN-421).
 *
 * Ordem das guardas, e por quê:
 *   1. `cancelado`/`estornado` primeiro — é o que aconteceu com O INGRESSO
 *      daquela pessoa, e vale mesmo com o evento ainda de pé;
 *   2. evento `encerrado` — histórico, com aviso, sem QR;
 *   3. status ≠ `confirmado` ⇒ `pendente` (pagamento não confirmado);
 *   4. sem `qrToken` ⇒ `emitindo` (a face da RN-382; NUNCA um QR quebrado);
 *   5. `checkinEm` ⇒ `credenciado` (o QR CONTINUA visível — RN-421);
 *   6. senão, `valido`.
 * @pure
 */
export function estadoDaPagina(bruto: EstadoBruto): EstadoIngressoPagina {
  if (bruto.statusInscrito === 'cancelado') return 'cancelado';
  if (bruto.statusInscrito === 'estornado') return 'estornado';
  if (bruto.statusEvento === 'encerrado') return 'encerrado';
  if (bruto.statusInscrito !== 'confirmado') return 'pendente';
  if (!bruto.temQrToken) return 'emitindo';
  if (bruto.temCheckin) return 'credenciado';
  return 'valido';
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; onRequest é wrapper fino)
// ---------------------------------------------------------------------------

/**
 * Resolve o token em projeção. `null` = a negativa única (RN-419).
 *
 * Passos, na ordem: parse estrutural → leitura do inscrito ALVO → verificação
 * do binding contra o `qrToken` GRAVADO → leitura do evento → projeção.
 * A leitura vem antes da verificação porque o binding EXIGE o token do doc; o
 * payload é entrada não confiável até o `verificarLinkIngresso` dizer `ok`, e
 * por isso nada dele é devolvido antes disso.
 */
export async function ingressoPorLinkCore(
  db: Db,
  token: unknown,
  keyring: QrKeyring | null
): Promise<IngressoProjetado | null> {
  // Fail-closed: sem keyring não se verifica nada, e "aceitar sem verificar"
  // nunca é uma opção. Colapsa na negativa única — o visitante não descobre se
  // o sistema está mal configurado ou se o link é falso.
  if (keyring === null) {
    logger.error('ingresso_por_link_sem_keyring');
    return null;
  }

  const alvo = lerAlvoDoLinkIngresso(token);
  if (!alvo.ok) return null;

  const { inscritoId, eventoId, tenantId } = alvo.payload;
  const eventoRef = db.collection('eventos').doc(eventoId);
  const inscritoSnap = await eventoRef.collection('inscritos').doc(inscritoId).get();

  // Doc inexistente entra na verificação com `undefined` de propósito: o
  // caminho é o MESMO de um doc sem ingresso emitido, e a saída é a mesma
  // negativa. Um `return` antecipado aqui criaria uma diferença observável.
  const qrTokenGravado = inscritoSnap.exists
    ? (inscritoSnap.get('qrToken') as string | undefined)
    : undefined;

  const verificacao = verificarLinkIngresso(token, qrTokenGravado ?? null, keyring);
  if (!verificacao.ok) return null;

  // Isolamento multi-tenant (ADR-009): o tenant do payload é assinado, mas
  // ainda assim é reconciliado com o doc — assinatura prova origem, não prova
  // que o dado não mudou de dono desde então.
  if (inscritoSnap.get('tenantId') !== tenantId) return null;

  const eventoSnap = await eventoRef.get();
  if (!eventoSnap.exists) return null;

  const estado = estadoDaPagina({
    statusInscrito: (inscritoSnap.get('status') as string | undefined) ?? '',
    statusEvento: (eventoSnap.get('status') as string | undefined) ?? '',
    temQrToken: typeof qrTokenGravado === 'string' && qrTokenGravado.length > 0,
    temCheckin: inscritoSnap.get('checkinEm') != null,
  });

  const codigoBruto = inscritoSnap.get('codigoIngresso') as string | undefined;
  const codigo = isCodigoIngressoValido(codigoBruto) ? codigoBruto : '';

  // QR SÓ nos estados que podem mostrá-lo (RN-421). A guarda é aqui, no
  // servidor: a página não recebe a imagem que não pode mostrar, então nem um
  // bug de renderização a exibiria. Falsificar removendo esta condição é o
  // ⚔ vetor 6.
  let qrDataUri: string | undefined;
  if (estadoMostraQr(estado) && typeof qrTokenGravado === 'string') {
    try {
      qrDataUri = await gerarQrDataUrl(qrTokenGravado, 320);
    } catch (err) {
      // Falha de geração de imagem não derruba a página: o código em texto
      // continua lá, que é o que sustenta a manhã do evento (mesma doutrina do
      // e-mail da RN-398).
      logger.warn('ingresso_por_link_qr_falhou', {
        eventoId,
        inscritoId,
        err: err instanceof Error ? err.name : 'erro',
      });
    }
  }

  const checkinEm = inscritoSnap.get('checkinEm') as { toDate?: () => Date } | undefined;
  const dataEvento = eventoSnap.get('data') as { toDate?: () => Date } | undefined;

  return {
    ok: true,
    estado,
    titular: texto(inscritoSnap.get('atletaNome')),
    evento: {
      nome: texto(eventoSnap.get('nome')),
      dataISO: iso(dataEvento),
      local: texto(eventoSnap.get('local')),
    },
    modalidade: texto(inscritoSnap.get('modalidade')),
    kit: rotuloKit(inscritoSnap.get('kit')),
    tamanho: rotuloTamanhos(inscritoSnap.get('tamanhos')),
    codigo,
    ...(qrDataUri !== undefined ? { qrDataUri } : {}),
    ...(estado === 'credenciado' && iso(checkinEm) !== null
      ? { credenciadoEm: iso(checkinEm) as string }
      : {}),
  };
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function iso(ts: { toDate?: () => Date } | undefined | null): string | null {
  if (ts == null || typeof ts.toDate !== 'function') return null;
  try {
    return ts.toDate().toISOString();
  } catch {
    return null;
  }
}

function rotuloKit(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  return ROTULO_KIT[valor] ?? null;
}

/**
 * Tamanhos do kit em texto ("M", ou "camiseta M · boné U" quando há mais de um
 * item tamanhado). Só os VALORES quando o item é único — o id interno do item
 * não é informação do atleta.
 */
function rotuloTamanhos(valor: unknown): string | null {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) {
    return null;
  }
  const entradas = Object.entries(valor as Record<string, unknown>).filter(
    (par): par is [string, string] =>
      typeof par[1] === 'string' && par[1].length > 0 && par[1].length <= 24
  );
  if (entradas.length === 0) return null;
  if (entradas.length === 1) return (entradas[0] as [string, string])[1];
  return entradas.map(([item, tam]) => `${item} ${tam}`).join(' · ');
}

// ---------------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------------

/** Tamanho máximo do corpo aceito (o token cabe em 512 chars). */
export const CORPO_MAX_BYTES = 4096;

export const ingressoPorLink = runWith({
  secrets: ['QR_TOKEN_KEYS'],
  maxInstances: 10,
  memory: '256MB',
  timeoutSeconds: 30,
}).https.onRequest(async (req, res) => {
  // Cabeçalhos de privacidade também AQUI, não só na página: a resposta carrega
  // dado de ingresso e não pode ser guardada por CDN/proxy no caminho.
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).send(CORPO_NEGATIVA);
    return;
  }

  const corpo = req.body as unknown;
  const token =
    corpo !== null && typeof corpo === 'object'
      ? (corpo as Record<string, unknown>)['token']
      : undefined;
  if (typeof token !== 'string' || token.length > CORPO_MAX_BYTES) {
    res.status(STATUS_NEGATIVA).send(CORPO_NEGATIVA);
    return;
  }

  try {
    const projecao = await ingressoPorLinkCore(
      admin.firestore(),
      token,
      obterQrKeyring()
    );
    if (projecao === null) {
      res.status(STATUS_NEGATIVA).send(CORPO_NEGATIVA);
      return;
    }
    res.status(200).send(JSON.stringify(projecao));
  } catch (err) {
    // Falha de infraestrutura NÃO é a negativa: a página precisa distinguir
    // "não existe" de "não consegui perguntar" para degradar com honestidade
    // (RN-421) em vez de dizer que o ingresso não existe quando o banco caiu.
    logger.error('ingresso_por_link_falhou', {
      err: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
    res.status(503).send('{"ok":false,"erro":"indisponivel"}');
  }
});
