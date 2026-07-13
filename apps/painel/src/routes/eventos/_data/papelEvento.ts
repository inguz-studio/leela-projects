// =============================================================================
// Papel do usuário logado NO evento (LEELA-S304-T2/T3 · E04-L5) — base do gate
// de UI das Configurações/Equipe. Lê o custom claim `eventos[eventoId]` do
// token vigente (via `getClaims`) e aplica o atalho de titularidade (dono =
// organizador). A autoridade real continua nas Rules; isto só decide o que a
// UI mostra/habilita.
//
// Nota de janela de token (ADR-008): após TROCAR o próprio papel, o app do
// afetado precisa de `getIdTokenResult(true)` para o claim refletir — a âncora
// no doc de equipe já corta o acesso do token velho nas Rules, mas este gate
// de UI lê o claim. Para o gestor (organizador/administrador) que gere os
// OUTROS, o próprio token não muda, então o gate é estável.
// =============================================================================

import { useEffect, useState } from 'react';
import { getClaims } from '@leela/api-client';
import type { Evento, PapelEvento } from '@leela/core';
import { papelDoUsuarioNoEvento } from '../configuracoes/_lib/gateEvento';
import { useEventosSession } from './session';

export interface PapelEventoState {
  papel: PapelEvento | null;
  loading: boolean;
}

/**
 * Resolve o papel do usuário logado no evento. `loading` cobre tanto a sessão
 * quanto a leitura dos claims — o gate só decide depois de resolver ambos
 * (nunca esconde/mostra com base em estado a meio caminho).
 */
export function usePapelEvento(evento: Evento): PapelEventoState {
  const session = useEventosSession();
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);
  const [claimsLoading, setClaimsLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    if (session.status === 'loading') return;
    if (session.status !== 'authenticated' || !session.uid) {
      setClaims(null);
      setClaimsLoading(false);
      return;
    }
    setClaimsLoading(true);
    void getClaims().then((c) => {
      if (!ativo) return;
      setClaims(c);
      setClaimsLoading(false);
    });
    return () => {
      ativo = false;
    };
  }, [session.status, session.uid]);

  const papel = papelDoUsuarioNoEvento(
    evento,
    session.uid,
    claims as { eventos?: Record<string, unknown> } | null
  );

  return { papel, loading: session.status === 'loading' || claimsLoading };
}
