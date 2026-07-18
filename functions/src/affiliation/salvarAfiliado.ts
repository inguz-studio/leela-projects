// =============================================================================
// functions/src/affiliation/salvarAfiliado.ts
//
// Cloud Function callable: cria/atualiza um afiliado/influenciador do evento
// (LEELA-R9E · S-R9-11-T1/T5/T6 · RN-313..317).
//
// Contrato:
//   salvarAfiliado(input: SalvarAfiliadoInput)
//     -> { afiliadoId, refCodigo, status, jaExistia, tokenAceite? }
//
// ESCRITA EXCLUSIVA DE FUNCTION (postura pós-19c8afe): as Rules negam TODA
// escrita de cliente em `eventos/{id}/afiliados` — refCodigo/∑/trust anchors
// nascem e mudam SÓ aqui. Motivos:
//   - unicidade do refCodigo por CHAVE (docId) com colisão tratada na tx;
//   - amarração cupom↔afiliado (`cupom.afiliadoRef`) na MESMA transação —
//     nenhum segundo caminho de desconto fora do kernel de cupons (ADR-012);
//   - convite PF (RN-316) reusa a disciplina E18: token 32 bytes, doc guarda
//     SÓ o SHA-256, expiração 14d, gate fail-closed sem EmailProvider.
//
// CUPOM VINCULADO (RN-315/316): o cupom já existe no kernel do evento
// (`eventos/{id}/cupons`); aqui só se AMARRA (`afiliadoRef`) — o checkout
// passa a exigir o gate de mínimo (descontoAfiliadoAtivo) para aplicá-lo.
// Cupom escopado de club parceiro (E18) NUNCA é amarrável (um desconto, um
// dono). Re-amarração troca a amarração antiga na mesma tx.
//
// PII/LGPD: documento do PF validado com DV e persistido SÓ MASCARADO
// (nunca em claro — não há repasse nesta fase que exija o documento);
// logs sem e-mail/documento.
// =============================================================================

import * as admin from 'firebase-admin';
import { createHash, randomBytes } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  COLECAO_AFILIADOS,
  JANELA_ATRIBUICAO_AFILIADO_DEFAULT_DIAS,
  gerarRefCodigo,
  normalizarCodigoCupom,
  normalizarRefCodigo,
  validarDocumento,
  validarEmail,
  validarSalvarAfiliadoInput,
  type AuthClaims,
  type SalvarAfiliadoInput,
  type StatusAfiliado,
} from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
  type EventoCaller,
} from '../eventos/criarEvento';
import { mascararDocumento } from '../assessorias/cadastrarAssessoria';
import { selectEmailProvider } from '../email/selectEmailProvider';
import { renderConviteAfiliadoEmail } from '../email/templates';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface SalvarAfiliadoResult {
  afiliadoId: string;
  refCodigo: string;
  status: StatusAfiliado;
  /** true = refCodigo já existia e o doc foi ATUALIZADO (não criado). */
  jaExistia: boolean;
  /**
   * Token de aceite do convite PF — SÓ no ramo convite E SÓ quando o
   * EmailProvider não está configurado (emulator/flag — padrão E18): com
   * provider real o token é ENTREGUE POR E-MAIL e nunca volta ao organizador
   * (pre-hijack, fix O3-L3B #1).
   */
  tokenAceite?: string;
  /** true = convite enviado por e-mail (EmailProvider real). */
  conviteEnviado?: boolean;
}

/** Validade do convite de afiliado PF (espelha E18 — 14 dias). */
export const CONVITE_AFILIADO_VALIDADE_DIAS = 14;

const DIA_MS = 24 * 60 * 60 * 1000;

/** SHA-256 hex de um token de aceite. @pure */
export function hashTokenAfiliado(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function salvarAfiliadoCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller,
  agora: Date = new Date()
): Promise<SalvarAfiliadoResult> {
  const tenantId = assertTenantWriter(caller.claims);

  const erros = validarSalvarAfiliadoInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `SalvarAfiliadoInput inválido: ${erros.join(' ')}`
    );
  }
  const input = rawInput as SalvarAfiliadoInput;

  await assertTenantAtivo(db, tenantId);

  // ── Evento do PRÓPRIO tenant (RN-400) ────────────────────────────────────
  const eventoRef = db.collection('eventos').doc(input.eventoId);
  const eventoSnap = await eventoRef.get();
  if (!eventoSnap.exists || eventoSnap.get('tenantId') !== tenantId) {
    throw new https.HttpsError(
      'not-found',
      `Evento '${input.eventoId}' não existe neste tenant.`
    );
  }

  // ── Campos específicos por tipo ──────────────────────────────────────────
  let emailKey = '';
  let documentoMascarado: string | null = null;
  if (input.tipo === 'pessoa_fisica') {
    if (
      typeof input.responsavelEmail !== 'string' ||
      !validarEmail(input.responsavelEmail)
    ) {
      throw new https.HttpsError(
        'invalid-argument',
        'Influenciador PF exige "responsavelEmail" válido (RN-316).'
      );
    }
    emailKey = input.responsavelEmail.trim().toLowerCase();
    if (typeof input.documento === 'string' && input.documento.trim().length > 0) {
      const r = validarDocumento(input.documento);
      if (!r.valido || r.documento === undefined) {
        throw new https.HttpsError(
          'invalid-argument',
          `Documento inválido: ${r.erro ?? 'formato não reconhecido.'}`
        );
      }
      // PII: SÓ o mascarado persiste (não há repasse nesta fase — minimização).
      documentoMascarado = mascararDocumento(r.documento.valor);
    }
  }

  let clubeNome: string | null = null;
  if (input.tipo === 'clube' && typeof input.clubeRef === 'string') {
    const clubeSnap = await db.collection('clubes').doc(input.clubeRef).get();
    if (!clubeSnap.exists) {
      throw new https.HttpsError(
        'invalid-argument',
        `Clube '${input.clubeRef}' não existe.`
      );
    }
    clubeNome = (clubeSnap.get('nome') ?? null) as string | null;
  }

  // ── Conta PF já existente? (vínculo imediato — espelha RN-362) ───────────
  let responsavelUid: string | null = null;
  if (input.tipo === 'pessoa_fisica') {
    try {
      responsavelUid = (await admin.auth().getUserByEmail(emailKey)).uid;
    } catch {
      responsavelUid = null;
    }
  }
  // Lado clube (RN-319): o DONO do clube lê as próprias conversões — o trust
  // anchor responsavelUid é estampado AQUI (Function), nunca pelo cliente.
  if (input.tipo === 'clube' && typeof input.clubeRef === 'string') {
    const ownerId = (
      await db.collection('clubes').doc(input.clubeRef).get()
    ).get('ownerId') as string | undefined;
    responsavelUid = typeof ownerId === 'string' && ownerId.length > 0 ? ownerId : null;
  }

  // ── Gate do convite PF sem conta (padrão E18 · fix O3-L3B #1) ────────────
  // Com EmailProvider REAL: convite é enviado por e-mail (token nunca volta
  // ao organizador). Sem provider: só emulator/flag — produção fail-closed.
  const emailProvider = selectEmailProvider();
  const conviteSeraNecessario =
    input.tipo === 'pessoa_fisica' && responsavelUid === null;
  const conviteLiberadoSemProvider =
    process.env['FUNCTIONS_EMULATOR'] === 'true' ||
    process.env['LEELA_CONVITE_EXPOR_TOKEN'] === 'true';
  if (
    conviteSeraNecessario &&
    emailProvider === null &&
    !conviteLiberadoSemProvider
  ) {
    throw new https.HttpsError(
      'failed-precondition',
      'Convite de influenciador exige EmailProvider (entrega do link ao ' +
        'convidado) — ação externa pendente (BREVO_API_KEY). O influenciador ' +
        'pode criar a conta Leela primeiro e você refaz o cadastro.'
    );
  }

  // ── refCodigo: informado (normalizado) ou gerado ─────────────────────────
  const refInformado = typeof input.refCodigo === 'string';
  const refCodigo = refInformado
    ? normalizarRefCodigo(input.refCodigo as string)
    : gerarRefCodigo();
  const afiliadoRef = eventoRef.collection(COLECAO_AFILIADOS).doc(refCodigo);

  // Cupom a amarrar (normalizado) — null explícito = desamarrar.
  const cupomCodigo =
    typeof input.cupomCodigo === 'string'
      ? normalizarCodigoCupom(input.cupomCodigo)
      : input.cupomCodigo === null
        ? null
        : undefined;

  // Token do ramo convite (gerado fora da tx; só o HASH persiste).
  const tokenAceite = randomBytes(32).toString('hex');
  const tokenHash = hashTokenAfiliado(tokenAceite);
  const expiraEm = Timestamp.fromDate(
    new Date(agora.getTime() + CONVITE_AFILIADO_VALIDADE_DIAS * DIA_MS)
  );

  const now = FieldValue.serverTimestamp();

  // ── Transação: create-or-update + amarração de cupom ─────────────────────
  const resultado = await db.runTransaction<SalvarAfiliadoResult>(
    async (tx) => {
      const snap = await tx.get(afiliadoRef);
      const jaExistia = snap.exists;

      // Colisão de refCodigo GERADO é astronomicamente improvável (31^8);
      // refCodigo INFORMADO colidindo = update do MESMO afiliado (upsert é o
      // contrato: o modal edita pelo refCodigo). Trocar TIPO no update é
      // incoerência, não upsert.
      if (jaExistia && snap.get('tipo') !== input.tipo) {
        throw new https.HttpsError(
          'failed-precondition',
          `refCodigo '${refCodigo}' já usado por afiliado de outro tipo.`
        );
      }
      if (!jaExistia && refInformado === false && snap.exists) {
        // impossível (mesmo branch) — documentação de intenção
      }

      // Amarração de cupom (quando pedido): valida DENTRO da tx.
      let cupomRefNovo: admin.firestore.DocumentReference | null = null;
      if (typeof cupomCodigo === 'string') {
        cupomRefNovo = eventoRef.collection('cupons').doc(cupomCodigo);
        const cupomSnap = await tx.get(cupomRefNovo);
        if (!cupomSnap.exists) {
          throw new https.HttpsError(
            'invalid-argument',
            `Cupom '${cupomCodigo}' não existe no evento.`
          );
        }
        if (cupomSnap.get('tenantId') !== tenantId) {
          throw new https.HttpsError(
            'internal',
            `Cupom '${cupomCodigo}' com tenantId divergente — dado corrompido.`
          );
        }
        // Um desconto, um dono: cupom de club parceiro (E18) ou já amarrado
        // a OUTRO afiliado nunca é re-amarrado por aqui.
        const escopo = (cupomSnap.get('escopo') ?? 'geral') as string;
        if (escopo !== 'geral') {
          throw new https.HttpsError(
            'failed-precondition',
            `Cupom '${cupomCodigo}' é escopado (E18) — não pode ser de afiliado.`
          );
        }
        const afiliadoRefAtual = cupomSnap.get('afiliadoRef') as string | undefined;
        if (
          typeof afiliadoRefAtual === 'string' &&
          afiliadoRefAtual.length > 0 &&
          afiliadoRefAtual !== refCodigo
        ) {
          throw new https.HttpsError(
            'failed-precondition',
            `Cupom '${cupomCodigo}' já vinculado a outro afiliado.`
          );
        }
      }

      // Desamarração do cupom ANTERIOR (rewire/clear) — mesma tx.
      const cupomAnterior = jaExistia
        ? ((snap.get('cupomCodigo') ?? null) as string | null)
        : null;
      let cupomRefAnterior: admin.firestore.DocumentReference | null = null;
      if (
        cupomAnterior !== null &&
        cupomCodigo !== undefined &&
        cupomAnterior !== cupomCodigo
      ) {
        cupomRefAnterior = eventoRef.collection('cupons').doc(cupomAnterior);
        const anteriorSnap = await tx.get(cupomRefAnterior);
        if (!anteriorSnap.exists) cupomRefAnterior = null;
      }

      const statusFinal: StatusAfiliado = jaExistia
        ? (input.status ?? (snap.get('status') as StatusAfiliado))
        : conviteSeraNecessario
          ? 'convite_pendente'
          : (input.status ?? 'ativo');

      const nome = input.nome.trim();
      const canal =
        typeof input.canal === 'string' && input.canal.trim().length > 0
          ? input.canal.trim()
          : null;
      const janela =
        input.janelaAtribuicaoDias ??
        (jaExistia
          ? (snap.get('janelaAtribuicaoDias') as number)
          : JANELA_ATRIBUICAO_AFILIADO_DEFAULT_DIAS);
      const minimo =
        input.minimoInscricoes !== undefined
          ? input.minimoInscricoes
          : jaExistia
            ? ((snap.get('minimoInscricoes') ?? null) as number | null)
            : null;

      if (!jaExistia) {
        const doc: Record<string, unknown> = {
          id: refCodigo,
          tenantId,
          eventoId: input.eventoId,
          tipo: input.tipo,
          status: statusFinal,
          nome,
          refCodigo,
          janelaAtribuicaoDias: janela,
          minimoInscricoes: minimo,
          cupomCodigo: typeof cupomCodigo === 'string' ? cupomCodigo : null,
          conversoes: 0,
          valorAtribuido: 0,
          criadoEm: now,
          atualizadoEm: now,
        };
        if (canal !== null) doc['canal'] = canal;
        if (input.tipo === 'clube' && typeof input.clubeRef === 'string') {
          doc['clubeRef'] = input.clubeRef;
          if (clubeNome !== null && nome.length === 0) doc['nome'] = clubeNome;
        }
        if (input.tipo === 'pessoa_fisica') {
          doc['responsavelEmail'] = emailKey;
          if (documentoMascarado !== null) {
            doc['documentoMascarado'] = documentoMascarado;
          }
          if (responsavelUid !== null) {
            doc['responsavelUid'] = responsavelUid;
          } else {
            doc['tokenAceiteHash'] = tokenHash;
            doc['expiraEm'] = expiraEm;
          }
        }
        if (input.tipo === 'clube' && responsavelUid !== null) {
          doc['responsavelUid'] = responsavelUid;
        }
        tx.create(afiliadoRef, doc);
      } else {
        const patch: Record<string, unknown> = {
          nome,
          janelaAtribuicaoDias: janela,
          minimoInscricoes: minimo,
          status: statusFinal,
          atualizadoEm: now,
        };
        patch['canal'] = canal;
        if (cupomCodigo !== undefined) patch['cupomCodigo'] = cupomCodigo;
        // Reenvio de convite PF ainda pendente: re-emite token + janela
        // (idempotente — RN-106 espelhada; nada duplica).
        if (
          input.tipo === 'pessoa_fisica' &&
          snap.get('status') === 'convite_pendente' &&
          responsavelUid === null
        ) {
          patch['tokenAceiteHash'] = tokenHash;
          patch['expiraEm'] = expiraEm;
        }
        tx.update(afiliadoRef, patch);
      }

      // Amarração inversa no cupom (RN-315/316) — MESMA tx.
      if (cupomRefNovo !== null) {
        tx.update(cupomRefNovo, { afiliadoRef: refCodigo, atualizadoEm: now });
      }
      if (cupomRefAnterior !== null) {
        tx.update(cupomRefAnterior, {
          afiliadoRef: FieldValue.delete(),
          atualizadoEm: now,
        });
      }

      const base: SalvarAfiliadoResult = {
        afiliadoId: refCodigo,
        refCodigo,
        status: statusFinal,
        jaExistia,
      };
      if (statusFinal === 'convite_pendente' && emailProvider === null) {
        base.tokenAceite = tokenAceite;
      }
      return base;
    }
  );

  // ── Convite por e-mail REAL (S-R9-14-T2) — fora da tx, best-effort ───────
  // Falha de envio NÃO desfaz o cadastro: o organizador reenvia (re-salvar
  // re-emite token). Token NUNCA logado.
  if (resultado.status === 'convite_pendente' && emailProvider !== null) {
    const eventoNome = (eventoSnap.get('nome') ?? input.eventoId) as string;
    const baseUrl = process.env['NEXT_PUBLIC_LEELA_URL'] ?? 'http://localhost:3000';
    const linkAceite =
      `${baseUrl.replace(/\/+$/, '')}/convite/afiliado` +
      `?e=${encodeURIComponent(input.eventoId)}` +
      `&a=${encodeURIComponent(refCodigo)}` +
      `&t=${encodeURIComponent(tokenAceite)}`;
    try {
      const email = renderConviteAfiliadoEmail({
        nomeConvidado: input.nome,
        nomeEvento: eventoNome,
        linkAceite,
        expiraEmDias: CONVITE_AFILIADO_VALIDADE_DIAS,
      });
      await emailProvider.sendTransactional({
        to: { email: emailKey, nome: input.nome },
        assunto: email.assunto,
        html: email.html,
        texto: email.texto,
      });
      resultado.conviteEnviado = true;
    } catch (err) {
      logger.error('afiliado_convite_envio_falhou', {
        tenantId,
        eventoId: input.eventoId,
        afiliadoId: refCodigo,
        err: err instanceof Error ? err.name : 'erro',
      });
      resultado.conviteEnviado = false;
    }
  }

  logger.info('afiliado_salvo', {
    tenantId,
    eventoId: input.eventoId,
    afiliadoId: resultado.afiliadoId,
    tipo: input.tipo,
    status: resultado.status,
    jaExistia: resultado.jaExistia,
  });

  return resultado;
}

// ---------------------------------------------------------------------------
// Callable (wrapper fino — padrão criarEvento)
// ---------------------------------------------------------------------------

export const salvarAfiliado = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return salvarAfiliadoCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
