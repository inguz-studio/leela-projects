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
  /** photoURL do usuário logado (S020-T5 — foto por URL); null = sem foto. */
  fotoUrl: string | null;
}

/** Observa a sessão Firebase e expõe nome + foto para o rodapé da sidebar. */
export function useShellSession(): ShellSession {
  const [nome, setNome] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSessionChange((user) => {
      setNome(user?.displayName ?? null);
      // photoURL vazio ('') = sem foto → cai no avatar por iniciais.
      const foto = user?.photoURL ?? null;
      setFotoUrl(foto && foto.length > 0 ? foto : null);
    });
    return () => {
      unsub();
    };
  }, []);

  return { nome, fotoUrl };
}
