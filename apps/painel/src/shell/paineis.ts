// =============================================================================
// Quais painéis a conta alcança — a pergunta que o alternador faz (PAPEL-DUPLO · T5).
//
// Uma conta pode alcançar DOIS painéis desde que a administração da plataforma
// virou capacidade em vez de papel: o dono é `tenant_owner` de uma produtora E
// carrega `platformAdmin`. Antes disso a pergunta não existia, porque `role`
// era valor único e ninguém tinha os dois lados.
//
// TRÊS COISAS QUE ESTE MÓDULO NÃO É, e que estão escritas porque cada uma já
// foi tentada em algum lugar deste repo:
//
//   1. NÃO é autorização. `paineisDaConta` responde "o que desenhar", e botão
//      não é crachá. Quem nega é o Firestore Rules e os guards das Functions.
//      Esconder o alternador de quem não pode alternar é cortesia; deixá-lo
//      visível não abriria porta nenhuma.
//   2. NÃO é uma segunda definição de quem administra a plataforma. A regra
//      inteira mora em `isPlatformAdmin`/`paineisDaConta` no core; aqui só se
//      lê o crachá e se entrega a resposta.
//   3. NÃO é chamada de rede. `getClaims()` sem argumento devolve as claims do
//      ID token JÁ EM MEMÓRIA. Só se força refresh (`true`) quando o crachá em
//      cache não concede o painel master — o caso do token anterior a uma
//      concessão, que de outro modo esconderia o alternador até o token rodar
//      sozinho.
// =============================================================================

import { useEffect, useState } from 'react';
import { getClaims, onSessionChange } from '@leela/api-client';
import { paineisDaConta, type AuthClaims, type PaineisDaConta } from '@leela/core';

/** Resposta enquanto o crachá não foi lido: não desenhar nada. */
const NENHUM: PaineisDaConta = {
  master: false,
  organizador: false,
  tenantId: null,
  podeAlternar: false,
};

async function resolver(): Promise<PaineisDaConta> {
  try {
    let claims = (await getClaims(false)) as AuthClaims | null;
    let paineis = paineisDaConta(claims);
    // O crachá em cache não concede a plataforma: pode ser verdade, ou pode ser
    // um token anterior à concessão. Uma tentativa forçada resolve os dois — e
    // é barata, porque acontece uma vez por sessão de quem não é admin.
    if (!paineis.master) {
      claims = (await getClaims(true)) as AuthClaims | null;
      paineis = paineisDaConta(claims);
    }
    return paineis;
  } catch {
    // Falha de rede não pode inventar um alternador nem apagar o painel: sem
    // crachá legível, não se desenha nada. Estado TERMINAL, nunca 'carregando'
    // eterno (a lição do skeleton eterno de Clubes, LEELA-CLUBES-FIX).
    return NENHUM;
  }
}

/**
 * Observa a sessão e responde quais painéis a conta alcança. Recalcula a cada
 * mudança de sessão (login, logout, troca de conta) — não a cada navegação.
 */
export function usePaineisDaConta(): PaineisDaConta {
  const [paineis, setPaineis] = useState<PaineisDaConta>(NENHUM);

  useEffect(() => {
    let ativo = true;
    const unsub = onSessionChange((user) => {
      if (!user) {
        if (ativo) setPaineis(NENHUM);
        return;
      }
      void resolver().then((next) => {
        if (ativo) setPaineis(next);
      });
    });
    return () => {
      ativo = false;
      unsub();
    };
  }, []);

  return paineis;
}
