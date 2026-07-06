// =============================================================================
// Sessão mínima para o shell raiz (rodapé da sidebar — B4): só o nome de
// exibição do usuário logado. Não carrega claims nem tenant — isso continua
// nos hooks de sessão de cada domínio (overview/eventos/plataforma). Um
// SessionProvider global segue sendo preocupação transversal fora deste lote.
// =============================================================================

import { useEffect, useState } from 'react';
import { onSessionChange } from '@leela/api-client';

export interface ShellSession {
  /** displayName do usuário logado; null = anônimo/carregando. */
  nome: string | null;
}

/** Observa a sessão Firebase e expõe o nome de exibição para o rodapé. */
export function useShellSession(): ShellSession {
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSessionChange((user) => {
      setNome(user?.displayName ?? null);
    });
    return () => {
      unsub();
    };
  }, []);

  return { nome };
}
