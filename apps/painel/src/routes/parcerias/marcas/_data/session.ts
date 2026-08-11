// =============================================================================
// Sessão do profissional para o módulo Marcas (E10 · S811 seed — RN-171).
// A subcoleção `profissionais/{uid}/marcas` é OWNER-ONLY (Rules: uid == profId),
// então basta o `uid` — sem claim de tenant (o valor de patrocínio é dado de
// negociação do dono, nem colega do tenant lê). Espelha a disciplina do
// `crm/_data/session.ts`: resolve para um estado TERMINAL, nunca trava em
// 'loading'.
// =============================================================================

import { useEffect, useState } from 'react';
import { onSessionChange } from '@leela/api-client';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export interface MarcasSession {
  status: SessionStatus;
  uid: string | null;
}

/** Observa a sessão Firebase e extrai o `uid` do profissional dono das marcas. */
export function useMarcasSession(): MarcasSession {
  const [session, setSession] = useState<MarcasSession>({
    status: 'loading',
    uid: null,
  });

  useEffect(() => {
    let ativo = true;
    const unsub = onSessionChange((user) => {
      if (!ativo) return;
      setSession(
        user
          ? { status: 'authenticated', uid: user.uid }
          : { status: 'anonymous', uid: null },
      );
    });
    return () => {
      ativo = false;
      unsub();
    };
  }, []);

  return session;
}
