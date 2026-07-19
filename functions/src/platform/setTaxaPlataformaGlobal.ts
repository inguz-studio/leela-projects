// =============================================================================
// functions/src/platform/setTaxaPlataformaGlobal.ts
//
// GRAVA a tabela GLOBAL de taxa-flex da plataforma (LEELA-TAXAFLEX ·
// RN-178/404) em `platform/config.taxaPlataforma`.
//
// Por que callable (e não write de cliente): as Rules de `platform/{doc=**}`
// são `write: false` para TODO client SDK — inclusive platform_admin
// (postura pós-19c8afe: dado macro de dinheiro nunca é escrito de cliente).
// O caminho de escrita é ESTE callable (Admin SDK), com o papel checado no
// token — mesmo molde do `aplicarPlano`/`provisionTenant`.
//
// Semântica:
//   - tabela COMPLETA obrigatória (pix + cartao + boleto — a global é o
//     default de todos; `boleto` especificado mesmo inerte, P-TAXAFLEX-2);
//   - validação REUSA `validarTabelaTaxaPlataforma` (@leela/core — fonte
//     única, RN-183; nada revalidado à mão);
//   - `set(..., {merge: true})` — `platform/config` pode ganhar outros
//     campos macro (defaults RN-348/350 etc.); esta Function só é dona do
//     campo `taxaPlataforma` + rastro de auditoria;
//   - MUDAR a tabela NUNCA reprecifica pedido feito (RN-179): o checkout
//     congela a linha resolvida no doc de pagamento no ato da compra.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  CAMPO_TAXA_PLATAFORMA,
  PLATFORM_CONFIG_DOC_PATH,
  validarTabelaTaxaPlataforma,
  type AuthClaims,
  type TabelaTaxaPlataforma,
} from '@leela/core';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface SetTaxaPlataformaGlobalInput {
  /** Tabela COMPLETA por meio: `{pix|cartao|boleto} → {percentual, fixoCentavos}`. */
  taxaPlataforma: TabelaTaxaPlataforma;
}

export interface SetTaxaPlataformaGlobalResult {
  ok: true;
}

/** Caller (uid + claims do token — padrão PlatformCaller do aplicarPlano). */
export interface PlatformCaller {
  uid: string;
  claims: AuthClaims;
}

// ---------------------------------------------------------------------------
// Núcleo (testável no Emulator via Admin SDK — padrão callables v1)
// ---------------------------------------------------------------------------

export async function setTaxaPlataformaGlobalCore(
  db: Db,
  rawInput: unknown,
  caller: PlatformCaller
): Promise<SetTaxaPlataformaGlobalResult> {
  if (caller.claims.role !== 'platform_admin') {
    throw new https.HttpsError(
      'permission-denied',
      'Apenas platform_admin edita a tabela global de taxa (RN-178/404).'
    );
  }

  const input = rawInput as Partial<SetTaxaPlataformaGlobalInput> | null;
  const tabela = input?.taxaPlataforma;
  const erros = validarTabelaTaxaPlataforma(tabela);
  if (erros.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `Tabela de taxa inválida: ${erros.join(' ')}`
    );
  }

  // Persistência EXATA das 3 linhas validadas (nunca espalhar o raw do
  // cliente — chave estranha já falhou na validação, mas o shape gravado é
  // reconstruído campo a campo: doc de dinheiro não carrega lixo).
  const t = tabela as TabelaTaxaPlataforma;
  await db.doc(PLATFORM_CONFIG_DOC_PATH).set(
    {
      [CAMPO_TAXA_PLATAFORMA]: {
        pix: { percentual: t.pix.percentual, fixoCentavos: t.pix.fixoCentavos },
        cartao: {
          percentual: t.cartao.percentual,
          fixoCentavos: t.cartao.fixoCentavos,
        },
        boleto: {
          percentual: t.boleto.percentual,
          fixoCentavos: t.boleto.fixoCentavos,
        },
      },
      taxaPlataformaAtualizadoPor: caller.uid,
      taxaPlataformaAtualizadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Sem PII — só números da tabela (auditoria operacional)
  logger.info('taxa_plataforma_global_gravada', {
    pixPct: t.pix.percentual,
    pixFixo: t.pix.fixoCentavos,
    cartaoPct: t.cartao.percentual,
    cartaoFixo: t.cartao.fixoCentavos,
    boletoPct: t.boleto.percentual,
    boletoFixo: t.boleto.fixoCentavos,
    por: caller.uid,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

export const setTaxaPlataformaGlobal = https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
    }
    return setTaxaPlataformaGlobalCore(admin.firestore(), data, {
      uid: context.auth.uid,
      claims: context.auth.token as unknown as AuthClaims,
    });
  }
);
