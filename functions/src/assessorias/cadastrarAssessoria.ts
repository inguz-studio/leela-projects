// =============================================================================
// functions/src/assessorias/cadastrarAssessoria.ts
//
// Cloud Function callable: cadastra uma assessoria como CLUB PARCEIRO do
// tenant organizador (LEELA-E18 · S1800-T2 + S1801-T1 · RN-361/362).
//
// Contrato:
//   cadastrarAssessoriaParceira({ nome, documento, responsavelEmail })
//     -> { parceriaId, clubeId, status: 'ativa',
//          vinculoImediato: true,  jaExistia }            // conta já existe
//      | { parceriaId, clubeId, status: 'convite_pendente',
//          vinculoImediato: false, jaExistia, tokenAceite } // convite gerado
//
// FLUXO (RN-362):
//   - documento (CNPJ/CPF) validado com dígito verificador no SERVIDOR
//     (validarDocumento do core — a mesma pura que o form usa como UX);
//   - docId da parceria = documento normalizado → DEDUPE POR CHAVE (RN-361):
//     dois cadastros do mesmo documento colidem no MESMO doc; a transação
//     serializa e o perdedor enxerga o vencedor (replay honesto, nunca
//     duplica clube nem parceria);
//   - responsável COM conta Leela (Auth por e-mail) → clube parceiro +
//     parceria `ativa` na hora, SEM convite;
//   - responsável SEM conta → clube parceiro (ownership provisória do
//     organizador até o aceite — ver PREMISSA abaixo) + parceria
//     `convite_pendente` + convite `clubes/{clubeId}/convites/{emailKey}`
//     REUSANDO a máquina E05-S104 (docId = e-mail lowercase, RN-106) com
//     `origem='assessoria_parceira'` + `parceriaRef` + token de aceite.
//
// PREMISSA REGISTRADA (reconciliação do épico E18): o CLUBE nasce no
// CADASTRO (nos dois ramos), não no aceite — o convite E05 (S1801-T1,
// "reusando enviarConvites") é subcoleção de clube e exige o doc pai. O
// aceite (provisionAssessoriaAccount · RN-363) cria a CONTA e ATIVA
// clube (ownerId) + parceria, atômico e idempotente — a essência de RN-363
// (reabrir o convite não duplica conta nem clube) é preservada.
//
// TOKEN DE ACEITE (Schneier — o link do convite é a credencial):
//   - 32 bytes aleatórios (hex) gerados aqui; o doc do convite guarda SÓ o
//     SHA-256 (vazamento de doc não vira aceite); o aceite compara em tempo
//     constante. `expiraEm` = 14 dias (reenvio re-emite token + janela).
//   - O token retorna ao ORGANIZADOR (é ele quem entrega o link enquanto o
//     EmailProvider é mock — ação externa pendente). Risco conhecido e
//     registrado: até o disparo físico existir, o organizador vê o link.
//
// PII/LGPD: documento e e-mail ficam nos docs (leitura tenant writer-only —
// Rules próprias); logs estruturados carregam só tenantId + documento
// MASCARADO (últimos 4 dígitos), nunca e-mail.
//
// ESCRITA: exclusivamente por esta Function (Rules write:false na
// subcoleção parceirosAssessoria — postura pós-19c8afe).
// =============================================================================

import * as admin from 'firebase-admin';
import { createHash, randomBytes } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  COLECAO_PARCEIROS_ASSESSORIA,
  CLUBE_NOME_MAX,
  gerarCodigoConvite,
  validarDocumento,
  validarEmail,
  type AuthClaims,
  type DocumentoAssessoria,
  type StatusParceriaAssessoria,
} from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
  type EventoCaller,
} from '../eventos/criarEvento';
import { slugify, slugCandidato, MAX_TENTATIVAS_SLUG } from '../eventos/slug';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface CadastrarAssessoriaInput {
  /** Nome da assessoria (vira o nome do clube — 1..60) */
  nome: string;
  /** CNPJ ou CPF, com ou sem máscara (validação + dedupe RN-361) */
  documento: string;
  /** E-mail do responsável (chave do convite — RN-106/362) */
  responsavelEmail: string;
}

export interface CadastrarAssessoriaResult {
  /** docId da parceria (= documento normalizado — RN-361) */
  parceriaId: string;
  /** docId (slug) do clube parceiro */
  clubeId: string;
  status: StatusParceriaAssessoria;
  /** true = conta existia, vínculo ativo na hora (RN-362) */
  vinculoImediato: boolean;
  /** true = documento já cadastrado (replay/reenvio — nada duplicado) */
  jaExistia: boolean;
  /**
   * Token de aceite (SÓ no ramo convite) — compõe o link da landing.
   * O doc guarda apenas o hash; reenvio re-emite.
   */
  tokenAceite?: string;
}

/** Validade do convite de assessoria (premissa registrada — 14 dias). */
export const CONVITE_ASSESSORIA_VALIDADE_DIAS = 14;

/** Origem que amarra o convite E05 ao provisionamento E18 (RN-363). */
export const ORIGEM_CONVITE_ASSESSORIA = 'assessoria_parceira';

const DIA_MS = 24 * 60 * 60 * 1000;

/** SHA-256 hex de um token de aceite. @pure */
export function hashTokenAceite(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Máscara de documento p/ log estruturado (LGPD): só os 4 últimos dígitos. */
export function mascararDocumento(valor: string): string {
  return `***${valor.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function cadastrarAssessoriaCore(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  rawInput: unknown,
  caller: EventoCaller,
  agora: Date = new Date()
): Promise<CadastrarAssessoriaResult> {
  const tenantId = assertTenantWriter(caller.claims);

  // ── Validação pura do input (fronteira de segurança) ─────────────────────
  const input = rawInput as Partial<CadastrarAssessoriaInput> | null;
  const nome = typeof input?.nome === 'string' ? input.nome.trim() : '';
  if (nome.length === 0 || nome.length > CLUBE_NOME_MAX) {
    throw new https.HttpsError(
      'invalid-argument',
      `"nome" é obrigatório (1..${CLUBE_NOME_MAX} caracteres).`
    );
  }
  if (typeof input?.documento !== 'string') {
    throw new https.HttpsError('invalid-argument', '"documento" é obrigatório (RN-361).');
  }
  const resultadoDoc = validarDocumento(input.documento);
  if (!resultadoDoc.valido || resultadoDoc.documento === undefined) {
    throw new https.HttpsError(
      'invalid-argument',
      `Documento inválido (RN-361): ${resultadoDoc.erro ?? 'formato não reconhecido.'}`
    );
  }
  const documento: DocumentoAssessoria = resultadoDoc.documento;
  if (
    typeof input?.responsavelEmail !== 'string' ||
    !validarEmail(input.responsavelEmail)
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      '"responsavelEmail" inválido (formato de e-mail).'
    );
  }
  const emailKey = input.responsavelEmail.trim().toLowerCase();

  await assertTenantAtivo(db, tenantId);

  // ── Resolver conta do responsável (RN-362) — fora da tx ──────────────────
  let responsavelUid: string | null = null;
  try {
    responsavelUid = (await auth.getUserByEmail(emailKey)).uid;
  } catch {
    responsavelUid = null;
  }

  // GATE DE PRODUÇÃO do ramo convite (fix review antagonista O3-L3B #1 —
  // pre-hijack): enquanto o token de aceite RETORNA ao organizador (mock de
  // e-mail), quem emite o convite consegue aceitá-lo — inclusive criar conta
  // com senha própria para e-mail de TERCEIRO. Fail-closed (padrão
  // permitirProducao do AsaasProvider): o ramo convite SÓ roda no emulator
  // ou com a flag explícita de sandbox; em produção, sem EmailProvider
  // real, o cadastro sem conta é bloqueado com erro acionável. O vínculo
  // IMEDIATO (conta já existe) segue liberado — não cria credencial nova.
  const conviteLiberado =
    process.env['FUNCTIONS_EMULATOR'] === 'true' ||
    process.env['LEELA_CONVITE_EXPOR_TOKEN'] === 'true';
  if (responsavelUid === null && !conviteLiberado) {
    throw new https.HttpsError(
      'failed-precondition',
      'Convite de assessoria exige EmailProvider (entrega do link ao ' +
        'responsável) — ação externa pendente. O responsável pode criar a ' +
        'conta Leela primeiro e você refaz o cadastro com vínculo imediato.'
    );
  }

  const parceriaId = documento.valor;
  const parceriaRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection(COLECAO_PARCEIROS_ASSESSORIA)
    .doc(parceriaId);
  const parceriaPath = parceriaRef.path;

  // Token do ramo convite (gerado fora da tx; só o HASH persiste)
  const tokenAceite = randomBytes(32).toString('hex');
  const tokenHash = hashTokenAceite(tokenAceite);
  const expiraEm = Timestamp.fromDate(
    new Date(agora.getTime() + CONVITE_ASSESSORIA_VALIDADE_DIAS * DIA_MS)
  );

  const slugBase = slugify(nome) || `assessoria-${documento.valor.slice(-4)}`;
  const now = FieldValue.serverTimestamp();

  // ── Transação: dedupe por chave + clube + parceria (+ convite) ───────────
  const resultado = await db.runTransaction<CadastrarAssessoriaResult>(
    async (tx) => {
      const parceriaSnap = await tx.get(parceriaRef);

      // DEDUPE (RN-361): documento já cadastrado neste tenant.
      if (parceriaSnap.exists) {
        const statusAtual = parceriaSnap.get('status') as StatusParceriaAssessoria;
        const clubeExistente = (parceriaSnap.get('clubeRef') ?? '') as string;

        if (statusAtual === 'ativa') {
          // Replay integral — avisa sem duplicar (aceite S1800).
          return {
            parceriaId,
            clubeId: clubeExistente,
            status: 'ativa' as const,
            vinculoImediato: true,
            jaExistia: true,
          };
        }
        if (statusAtual === 'convite_pendente') {
          const emailAnterior = (parceriaSnap.get('responsavelEmail') ?? '') as string;
          if (emailAnterior !== emailKey) {
            throw new https.HttpsError(
              'failed-precondition',
              'Documento já cadastrado com OUTRO e-mail de responsável — ' +
                'encerre a parceria pendente antes de trocar o responsável.'
            );
          }
          const conviteRef = db
            .collection('clubes')
            .doc(clubeExistente)
            .collection('convites')
            .doc(emailKey);

          // Conta do responsável passou a existir DEPOIS do convite →
          // VINCULA (RN-362) em vez de reenviar: ativa a parceria, fecha a
          // ownership do clube e supera o convite. Também fecha o corner do
          // fix #1: reenvio nunca devolve token quando a conta já existe.
          if (responsavelUid !== null) {
            tx.update(parceriaRef, {
              status: 'ativa',
              responsavelUid,
              aceitoEm: now,
              atualizadoEm: now,
            });
            tx.update(db.collection('clubes').doc(clubeExistente), {
              ownerId: responsavelUid,
              atualizadoEm: now,
            });
            tx.set(
              conviteRef,
              { status: 'cancelado', canceladoEm: now },
              { merge: true }
            );
            return {
              parceriaId,
              clubeId: clubeExistente,
              status: 'ativa' as const,
              vinculoImediato: true,
              jaExistia: true,
            };
          }

          // REENVIO idempotente (RN-106): re-emite token + janela no MESMO
          // convite; nada duplica. Cobre também "convite expirado → reenvio".
          tx.set(
            conviteRef,
            {
              email: emailKey,
              tenantId,
              status: 'pendente',
              origem: ORIGEM_CONVITE_ASSESSORIA,
              parceriaRef: parceriaPath,
              convidadoPor: caller.uid,
              tokenAceiteHash: tokenHash,
              expiraEm,
              enviadoEm: now,
            },
            { merge: true }
          );
          tx.update(parceriaRef, { atualizadoEm: now });
          return {
            parceriaId,
            clubeId: clubeExistente,
            status: 'convite_pendente' as const,
            vinculoImediato: false,
            jaExistia: true,
            tokenAceite,
          };
        }
        // 'inativa' é TERMINAL (RN-144: retenção 90d) — recadastro do mesmo
        // documento não ressuscita a trilha encerrada (premissa registrada).
        throw new https.HttpsError(
          'failed-precondition',
          'Parceria com este documento foi ENCERRADA (retenção RN-144) — ' +
            'recadastro do mesmo documento não é suportado nesta versão.'
        );
      }

      // Slug do clube: candidatos base, base-2… (padrão criarEvento) — a
      // própria tx serializa criações concorrentes com o mesmo nome.
      let clubeId: string | null = null;
      let clubeRef: admin.firestore.DocumentReference | null = null;
      for (let n = 0; n < MAX_TENTATIVAS_SLUG; n++) {
        const candidato = slugCandidato(slugBase, n);
        const ref = db.collection('clubes').doc(candidato);
        const snap = await tx.get(ref);
        if (!snap.exists) {
          clubeId = candidato;
          clubeRef = ref;
          break;
        }
      }
      if (clubeId === null || clubeRef === null) {
        throw new https.HttpsError(
          'resource-exhausted',
          `Não foi possível derivar slug livre para '${slugBase}' ` +
            `(${MAX_TENTATIVAS_SLUG} tentativas).`
        );
      }

      const vinculoImediato = responsavelUid !== null;

      // Clube parceiro (E05 reuso — RN-360): a assessoria É um clube.
      // Ownership: responsável quando a conta existe; PROVISÓRIA do
      // organizador no ramo convite (transferida no aceite — premissa).
      // PII (fix review antagonista O3-L3B #2): o doc do clube carrega SÓ o
      // documento MASCARADO — o clube é legível por membro do tenant
      // (promoter incluso) e a visibilidade pode virar pública; o CPF/CNPJ
      // completo vive APENAS na parceria (Rules writer-only).
      tx.set(clubeRef, {
        id: clubeId,
        tenantId,
        nome,
        descricao: '',
        slug: clubeId,
        categoria: 'Assessoria esportiva',
        modalidade: 'Corrida de rua',
        localizacao: { cidade: '', estado: '', online: true },
        ownerId: responsavelUid ?? caller.uid,
        codigoConvite: gerarCodigoConvite(),
        visibilidade: 'privada',
        aprovacaoManual: false,
        modeloEntrada: 'gratuito',
        ehAssessoriaParceira: true,
        documentoMascarado: mascararDocumento(documento.valor),
        parceiroDeTenant: tenantId,
        qtdMembrosAtivos: 0,
        qtdDesafiosAtivos: 0,
        criadoEm: now,
        atualizadoEm: now,
      });

      // Parceria (RN-362): ativa quando a conta existe; pendente c/ convite.
      const parceriaDoc: Record<string, unknown> = {
        id: parceriaId,
        tenantId,
        nome,
        documento,
        clubeRef: clubeId,
        responsavelEmail: emailKey,
        status: vinculoImediato ? 'ativa' : 'convite_pendente',
        criadoEm: now,
        criadoPor: caller.uid,
        atualizadoEm: now,
      };
      if (vinculoImediato) {
        parceriaDoc['responsavelUid'] = responsavelUid;
      }
      tx.set(parceriaRef, parceriaDoc);

      if (!vinculoImediato) {
        // Convite — REUSO da máquina E05-S104 (docId = e-mail lowercase,
        // RN-106) + amarração ao provisionamento (origem/parceriaRef/token).
        tx.set(clubeRef.collection('convites').doc(emailKey), {
          email: emailKey,
          tenantId,
          status: 'pendente',
          origem: ORIGEM_CONVITE_ASSESSORIA,
          parceriaRef: parceriaPath,
          convidadoPor: caller.uid,
          tokenAceiteHash: tokenHash,
          expiraEm,
          criadoEm: now,
          enviadoEm: now,
        });
      }

      const base = {
        parceriaId,
        clubeId,
        vinculoImediato,
        jaExistia: false,
      };
      return vinculoImediato
        ? { ...base, status: 'ativa' as const }
        : { ...base, status: 'convite_pendente' as const, tokenAceite };
    }
  );

  // Sem PII no log (LGPD): documento mascarado, nunca e-mail.
  logger.info('assessoria_cadastrada', {
    tenantId,
    clubeId: resultado.clubeId,
    documento: mascararDocumento(parceriaId),
    status: resultado.status,
    vinculoImediato: resultado.vinculoImediato,
    jaExistia: resultado.jaExistia,
  });

  return resultado;
}

// ---------------------------------------------------------------------------
// Callable (wrapper fino — padrão criarEvento)
// ---------------------------------------------------------------------------

export const cadastrarAssessoriaParceira = https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
    }
    return cadastrarAssessoriaCore(
      admin.firestore(),
      admin.auth(),
      data,
      {
        uid: context.auth.uid,
        claims: context.auth.token as unknown as AuthClaims,
      }
    );
  }
);
