// =============================================================================
// useContaUsuario — hook PRÓPRIO da tela de conta (LEELA-S020-T4). Não toca o
// shell/session.ts (que só expõe o nome para o rodapé): aqui precisamos do
// usuário Firebase inteiro (displayName + email) e do estado de carregamento
// para distinguir "carregando" de "anônimo". O tipo do usuário é inferido da
// assinatura de onSessionChange — sem importar firebase/auth direto (o
// api-client é o único seam sobre o SDK).
// =============================================================================

import { useEffect, useState } from 'react';
import { onSessionChange } from '@leela/api-client';

/** Usuário Firebase | null, extraído da assinatura de onSessionChange. */
export type ContaUsuario = Parameters<Parameters<typeof onSessionChange>[0]>[0];

export interface ContaSession {
  user: ContaUsuario;
  loading: boolean;
}

export function useContaUsuario(): ContaSession {
  const [user, setUser] = useState<ContaUsuario>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSessionChange((atual) => {
      setUser(atual);
      setLoading(false);
    });
    return () => {
      unsub();
    };
  }, []);

  return { user, loading };
}
