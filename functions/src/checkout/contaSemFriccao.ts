// =============================================================================
// functions/src/checkout/contaSemFriccao.ts
//
// Conta SEM FRICÇÃO na primeira compra (LEELA-CK2-T3 · RN-155 · DEC-0719).
//
// Primeira compra CONFIRMADA de um e-mail sem conta → cria a conta Firebase
// Auth automaticamente (SEM senha — zero fricção no fluxo de compra) e envia
// e-mail com o link OFICIAL do Firebase para definir a senha e ver a compra
// (`generatePasswordResetLink` — oobCode single-use do próprio Auth; NUNCA
// token inventado aqui). Recompra do mesmo e-mail/CPF NÃO recria conta nem
// reenvia e-mail (idempotente — RN-173 linka via registry de pessoa).
//
// ONDE RODA: PÓS-CONFIRMAÇÃO, FORA da transação de dinheiro — chamado pelos
// três confirmadores (confirmarPagamentoSandbox, pagamentoWebhook,
// asaasWebhook) em modo BEST-EFFORT: NENHUMA falha aqui (Auth fora do ar,
// e-mail sem chave, doc torto) quebra a confirmação da compra. O resultado
// fica carimbado no pedido (`pedidos/{id}.contaSemFriccao`) — replay lê o
// carimbo e não repete efeito.
//
// FAIL-CLOSED DO E-MAIL (RN-137): sem `BREVO_API_KEY` o selectEmailProvider
// devolve null → o envio fica registrado como `pendente_chave` no carimbo
// (pendência observável; a compra NUNCA quebra; e2e do envio real = skip
// documentado até a chave existir). Conta JÁ existente ⇒ `nao_aplicavel`
// (avisar "sua conta foi criada" para conta antiga seria mentira/phishing).
//
// VÍNCULO PESSOA↔CONTA (RN-173 + RN-174): este fluxo é o ESCRITOR ÚNICO do
// claim — a criação do pedido NUNCA reivindica (RN-174, fecha o F1 do CK2).
// Aqui as condições (a) e (b) da RN-174 valem POR CONSTRUÇÃO: o pedido está
// PAGO (gate de status acima) e a conta é resolvida PELO e-mail da compra
// (getUidPorEmail/criarConta). O claim carimba `contaEmail` junto com
// `contaUid`; a condição (c) — e-mail CONFIRMADO (Firebase nativo
// emailVerified) — é exigida no LEITOR (getCheckoutPrefill): exigi-la no
// escritor travaria o claim para sempre (a conta nasce não-verificada).
// First-claim: vínculo divergente NUNCA é sobrescrito (anti-hijack).
//
// CONTA DE ADMINISTRAÇÃO NÃO É CONTA DE COMPRADOR (S032-T4 · RN-449d): a
// conta do painel de plataforma é OUTRA, e uma conta nunca acumula
// `platform_admin` com cliente. Quando o e-mail da compra resolve uma conta
// com esse papel, o vínculo é RECUSADO — a ficha da pessoa fica intocada, o
// carimbo do pedido sai com `contaUid: null` e o motivo
// `conta_admin_nao_vinculavel`, e nenhum e-mail de senha é disparado. A VENDA
// não muda: dinheiro fail-open, identidade fail-closed. Comprar continua
// permitido a qualquer pessoa, inclusive a quem administra — o que a regra
// proíbe é o VÍNCULO, e quem administra e quer comprar usa o outro e-mail.
//
// FRONTEIRA QUE ESTA GUARDA **NÃO** MOVE: a conta preexistente continua sendo
// reusada sem prova de posse do e-mail. Exigir posse é o default do item
// POSSE-EMAIL-1, que está no painel do dono aguardando ratificação, e não é
// decisão de código. A guarda daqui é só a de ADMINISTRAÇÃO.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { COLECAO_PESSOAS, validarEmail, type EmailProvider } from '@leela/core';
import { selectEmailProvider } from '../email/selectEmailProvider';
import { registrarIncidenteEmail } from '../email/incidenteEmail';
import { renderContaCriadaEmail } from '../email/templates';
import { actionCodeSettingsSenha, reescreverParaTelaDeSenha } from '../auth/linkDeAcao';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos (Auth injetável — testes cobrem sem/with Auth emulator)
// ---------------------------------------------------------------------------

/** Porta mínima do Firebase Auth que o fluxo usa (injetável nos testes). */
export interface ContaSemFriccaoAuth {
  /** uid da conta do e-mail, ou null quando não existe. */
  getUidPorEmail(email: string): Promise<string | null>;
  /** Cria a conta SEM senha; devolve o uid. */
  criarConta(params: { email: string; displayName?: string }): Promise<string>;
  /**
   * Papel da conta (claim `role`), ou null quando não há claim (RN-401 — a
   * claim é a fonte ÚNICA de papel; ler Firestore aqui daria uma segunda
   * verdade). É o insumo da recusa da RN-449d.
   */
  papelDaConta(uid: string): Promise<string | null>;
  /** Link oficial de definição de senha (generatePasswordResetLink). */
  gerarLinkDefinirSenha(email: string): Promise<string>;
}

/** O papel que a RN-449d proíbe de virar conta de comprador. */
export const PAPEL_ADMIN_PLATAFORMA = 'platform_admin';

/** Motivo carimbado no pedido quando o vínculo é recusado (RN-449d). */
export const MOTIVO_CONTA_ADMIN = 'conta_admin_nao_vinculavel';

export type EmailStatusContaSemFriccao =
  | 'enviado'
  | 'pendente_chave'
  | 'falha_envio'
  | 'nao_aplicavel';

export interface ContaSemFriccaoResultado {
  /** false = nada feito nesta chamada (replay, pedido inelegível). */
  processado: boolean;
  contaUid: string | null;
  contaCriada: boolean;
  emailStatus: EmailStatusContaSemFriccao | null;
  motivo?: string;
}

/** Adapter default sobre admin.auth() (produção/emulator). */
export function contaSemFriccaoAuthAdmin(): ContaSemFriccaoAuth {
  return {
    async getUidPorEmail(email) {
      try {
        return (await admin.auth().getUserByEmail(email)).uid;
      } catch (err) {
        if ((err as { code?: string }).code === 'auth/user-not-found') return null;
        throw err;
      }
    },
    async criarConta(params) {
      try {
        return (
          await admin.auth().createUser({
            email: params.email,
            ...(params.displayName !== undefined
              ? { displayName: params.displayName }
              : {}),
            emailVerified: false,
          })
        ).uid;
      } catch (err) {
        // Corrida rara (dois confirmadores): conta nasceu no meio — re-lê.
        if ((err as { code?: string }).code === 'auth/email-already-exists') {
          const uid = await this.getUidPorEmail(params.email);
          if (uid !== null) return uid;
        }
        throw err;
      }
    },
    // Uma leitura por confirmação, no caminho pós-pagamento e best-effort —
    // nunca na transação de dinheiro. Falha de Auth aqui PROPAGA, igual à do
    // `getUidPorEmail`: sem saber o papel não se pode afirmar que a conta não
    // é de administração, e o desfecho seguro é não carimbar nada (o pedido
    // fica sem carimbo, que é a pendência observável de sempre).
    async papelDaConta(uid) {
      const claims = (await admin.auth().getUser(uid)).customClaims as
        | { role?: unknown }
        | undefined;
      return typeof claims?.role === 'string' ? claims.role : null;
    },
    // DEPLOY-EMAIL · o link do e-mail nº 2 ("conta criada, defina a senha") é a
    // PRIMEIRA tela do produto para quem acabou de pagar. Sem estes dois
    // argumentos ele caía no handler HOSPEDADO do Firebase — layout genérico,
    // domínio `leela-hub.firebaseapp.com`. `actionCodeSettingsSenha()` fixa o
    // `continueUrl`; `reescreverParaOPainel` troca a página que recebe o clique
    // por `/redefinir-senha` do painel, levando o `oobCode` (a credencial é o
    // código, não a URL que o entregou). Ponto único de decisão da jornada:
    // `functions/src/auth/linkDeAcao.ts`.
    // S1223-T2 · RN-453: a origem é `comprador`. Quem acabou de pagar não tem
    // tenant nem `profissionais/{uid}`, então a tela do painel o expulsaria
    // pela guarda de conta órfã logo depois de ele definir a senha. O destino
    // passa a ser `/definir-senha` da LANDING, que autentica e entrega a pessoa
    // na conta sem segundo login.
    async gerarLinkDefinirSenha(email) {
      return reescreverParaTelaDeSenha(
        await admin
          .auth()
          .generatePasswordResetLink(email, actionCodeSettingsSenha('comprador')),
        'comprador'
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Entrega do e-mail da conta (camada de baixo — sem guarda)
// ---------------------------------------------------------------------------

/**
 * MONTA e ENTREGA o e-mail "sua conta foi criada, defina a senha".
 *
 * Separado de `garantirContaSemFriccao` (F2 · lane BUILD-F2F5) porque o
 * REENVIO administrativo precisa da mesma mensagem sem passar pelo carimbo de
 * `ja_processado` — que existe para não repetir EFEITO (criar conta, vincular
 * pessoa), não para proibir uma segunda ENTREGA quando a primeira morreu no
 * provedor. O link é gerado de novo de propósito: `generatePasswordResetLink`
 * devolve um `oobCode` single-use e com validade, então reenviar o link ANTIGO
 * entregaria uma credencial provavelmente já expirada.
 *
 * @throws o erro do Auth ou do provedor — quem chama registra a falha.
 */
export async function entregarEmailContaCriada(
  args: { email: string; nome: string; nomeEvento: string },
  auth: ContaSemFriccaoAuth,
  emailProvider: EmailProvider
): Promise<void> {
  const link = await auth.gerarLinkDefinirSenha(args.email);
  const rendered = renderContaCriadaEmail({
    nomeComprador: args.nome,
    nomeEvento: args.nomeEvento,
    linkDefinirSenha: link,
  });
  await emailProvider.sendTransactional({
    to: { email: args.email, ...(args.nome.length > 0 ? { nome: args.nome } : {}) },
    assunto: rendered.assunto,
    html: rendered.html,
    texto: rendered.texto,
    tag: 'conta-sem-friccao',
  });
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

/**
 * Carimba o resultado no pedido (replay-proof): grava UMA vez e nunca
 * sobrescreve um carimbo que já exista. Corrida entre dois confirmadores é
 * teórica (a confirmação é exactly-once via ledger) e o pior caso é benigno
 * (mesmo uid, mesmo estado).
 *
 * Um só escritor para os DOIS desfechos — o vínculo feito e o vínculo recusado
 * (RN-449d) —, porque o que os separa é o conteúdo da marca, nunca a
 * disciplina de escrita.
 */
async function carimbarNoPedido(
  db: Db,
  pedidoRef: admin.firestore.DocumentReference,
  marca: Record<string, unknown>
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(pedidoRef);
    if (!snap.exists || snap.get('contaSemFriccao') !== undefined) return;
    tx.update(pedidoRef, {
      contaSemFriccao: { ...marca, processadoEm: FieldValue.serverTimestamp() },
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  });
}

export async function garantirContaSemFriccao(
  db: Db,
  pedidoId: string,
  auth: ContaSemFriccaoAuth,
  emailProvider: EmailProvider | null
): Promise<ContaSemFriccaoResultado> {
  const pedidoRef = db.collection('pedidos').doc(pedidoId);
  const pedidoSnap = await pedidoRef.get();
  const nada = (motivo: string): ContaSemFriccaoResultado => ({
    processado: false,
    contaUid: null,
    contaCriada: false,
    emailStatus: null,
    motivo,
  });
  if (!pedidoSnap.exists) return nada('pedido_inexistente');
  if (pedidoSnap.get('status') !== 'pago') return nada('pedido_nao_pago');
  const marker = pedidoSnap.get('contaSemFriccao') as
    | { contaUid?: string | null; contaCriada?: boolean; emailStatus?: string }
    | undefined;
  if (marker !== undefined) {
    return {
      processado: false,
      contaUid: typeof marker.contaUid === 'string' ? marker.contaUid : null,
      contaCriada: marker.contaCriada === true,
      emailStatus: (marker.emailStatus ?? null) as EmailStatusContaSemFriccao | null,
      motivo: 'ja_processado',
    };
  }

  const emailRaw = pedidoSnap.get('responsavel.email') as string | undefined;
  const nome = (pedidoSnap.get('responsavel.nome') as string | undefined) ?? '';
  if (typeof emailRaw !== 'string' || !validarEmail(emailRaw)) {
    return nada('email_invalido');
  }
  const email = emailRaw.trim().toLowerCase();

  // 1. Conta: reusa a existente; cria SEM senha quando não há (RN-155).
  let contaUid = await auth.getUidPorEmail(email);
  const contaCriada = contaUid === null;
  if (contaUid === null) {
    contaUid = await auth.criarConta({
      email,
      ...(nome.length > 0 ? { displayName: nome } : {}),
    });
  }

  // 1b. RN-449d — a conta de ADMINISTRAÇÃO nunca vira conta de comprador.
  //     A leitura do papel é do uid que ACABOU de ser resolvido, e não do que
  //     o e-mail devolveu antes de criar: o re-read de corrida do `criarConta`
  //     (`auth/email-already-exists`) devolve uma conta ALHEIA, e a guarda
  //     tem de valer para o uid que seria escrito, não para o que foi lido.
  if ((await auth.papelDaConta(contaUid)) === PAPEL_ADMIN_PLATAFORMA) {
    // OBSERVÁVEL: recusa silenciosa deixaria alguém que PAGOU sem acesso e
    // sem rastro. Mesmo formato de incidente da rodada (`alerta`), e sem PII
    // — o `pedidoId` acha o resto; o e-mail e o nome ficam fora (LGPD).
    logger.error('conta_sem_friccao_vinculo_recusado', {
      alerta: true,
      motivo: MOTIVO_CONTA_ADMIN,
      pedidoId,
    });
    // `contaCriada: false` é a VERDADE deste ramo, não um arredondamento:
    // conta com claim de administração já existia, e o único caminho em que
    // `criarConta` a devolveria é o re-read de corrida, que reusa em vez de
    // criar. O `false` também é o que impede o reenvio administrativo de
    // mandar "defina sua senha" para a conta de administração — ele gateia
    // por `contaCriada === true` (`reenviarEmailsPedido.ts`).
    await carimbarNoPedido(db, pedidoRef, {
      contaUid: null,
      contaCriada: false,
      emailStatus: 'nao_aplicavel',
      pessoaVinculada: false,
      motivo: MOTIVO_CONTA_ADMIN,
    });
    return {
      processado: true,
      contaUid: null,
      contaCriada: false,
      emailStatus: 'nao_aplicavel',
      motivo: MOTIVO_CONTA_ADMIN,
    };
  }

  // 2. Vínculo pessoa↔conta (RN-173 + RN-174, ESCRITOR ÚNICO do claim): a
  //    pessoa do CPF do responsável-INSCRITO. Pedido PAGO (gate acima) +
  //    conta resolvida pelo e-mail da compra = condições (a) e (b) da
  //    RN-174 por construção; `contaEmail` é carimbado junto (insumo do
  //    gate de leitura). Compra para terceiros (sem responsavelIndex) não
  //    tem CPF do pagador — sem vínculo (limitação documentada).
  const eventoId = pedidoSnap.get('eventoId') as string;
  const inscritoRefs = (pedidoSnap.get('inscritoRefs') as string[] | undefined) ?? [];
  let pessoaVinculada = false;
  for (const inscritoId of inscritoRefs) {
    const inscritoSnap = await db
      .doc(`eventos/${eventoId}/inscritos/${inscritoId}`)
      .get();
    if (inscritoSnap.get('ehResponsavel') !== true) continue;
    const pessoaRef = inscritoSnap.get('pessoaRef') as string | null | undefined;
    if (typeof pessoaRef !== 'string' || pessoaRef.length === 0) break;
    await db.runTransaction(async (tx) => {
      const ref = db.collection(COLECAO_PESSOAS).doc(pessoaRef);
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const atual = snap.get('contaUid') as string | null | undefined;
      if (typeof atual === 'string' && atual.length > 0) {
        // First-claim: vínculo divergente NUNCA sobrescrito (anti-hijack).
        // Auto-cura RN-174: claim legado da MESMA conta sem `contaEmail`
        // ganha o carimbo desta compra confirmada (mesma conta ⇒ mesmo
        // e-mail por construção — a conta foi resolvida por este e-mail).
        if (atual === contaUid && typeof snap.get('contaEmail') !== 'string') {
          tx.update(ref, {
            contaEmail: email,
            atualizadoEm: FieldValue.serverTimestamp(),
          });
        }
        return;
      }
      tx.update(ref, {
        contaUid,
        contaEmail: email,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      pessoaVinculada = true;
    });
    break;
  }

  // 3. E-mail com o link de senha — SÓ para conta recém-criada.
  let emailStatus: EmailStatusContaSemFriccao;
  if (!contaCriada) {
    emailStatus = 'nao_aplicavel';
  } else if (emailProvider === null) {
    // Fail-closed RN-137: sem chave, pendência registrada — compra intocada.
    emailStatus = 'pendente_chave';
  } else {
    try {
      const eventoSnap = await db.collection('eventos').doc(eventoId).get();
      const nomeEvento =
        (eventoSnap.get('nome') as string | undefined) ?? 'seu evento';
      await entregarEmailContaCriada(
        { email, nome, nomeEvento },
        auth,
        emailProvider
      );
      emailStatus = 'enviado';
    } catch (err) {
      // Envio é acessório — falha registrada, compra intocada. F5: registrada
      // como INCIDENTE (campo `alerta` que a política casa), no MESMO nome de
      // evento de sempre — o diagnóstico de 04/08 cita este nome.
      registrarIncidenteEmail('conta_sem_friccao_email_falhou', {
        tipo: 'conta_sem_friccao',
        pedidoId,
        erro: err,
      });
      emailStatus = 'falha_envio';
    }
  }

  // 4. Carimbo no pedido (replay-proof) — ver `carimbarNoPedido`.
  await carimbarNoPedido(db, pedidoRef, {
    contaUid,
    contaCriada,
    emailStatus,
    pessoaVinculada,
  });

  // Sem PII no log (LGPD) — nunca o e-mail/nome.
  logger.info('conta_sem_friccao', {
    pedidoId,
    contaCriada,
    emailStatus,
    pessoaVinculada,
  });
  return { processado: true, contaUid, contaCriada, emailStatus };
}

// ---------------------------------------------------------------------------
// Disparo pós-confirmação (best-effort — os 3 confirmadores chamam)
// ---------------------------------------------------------------------------

/**
 * Dispara o fluxo APÓS uma confirmação efetivada (`statusGateway confirmed`
 * sem `ignorado`/`duplicado`). Engole QUALQUER erro com log — a resposta do
 * webhook/callable nunca falha por causa de conta/e-mail (a compra é a
 * prioridade; o carimbo ausente deixa a pendência visível para reprocesso).
 */
export async function dispararContaSemFriccaoPosConfirmacao(
  db: Db,
  resultado: { statusGateway: string; ignorado: boolean; duplicado: boolean; pedidoId: string }
): Promise<void> {
  if (
    resultado.statusGateway !== 'confirmed' ||
    resultado.ignorado ||
    resultado.duplicado
  ) {
    return;
  }
  try {
    await garantirContaSemFriccao(
      db,
      resultado.pedidoId,
      contaSemFriccaoAuthAdmin(),
      selectEmailProvider()
    );
  } catch (err) {
    logger.error('conta_sem_friccao_falhou', {
      pedidoId: resultado.pedidoId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
