// =============================================================================
// Badge de contagem do item "Eventos" da sidebar (lote FIDELIDADE T2 — mockup
// `.nav-badge` neutro com a contagem de eventos ativos).
//
// Dado REAL: mesma fonte da Visão Geral (`listarEventosDoOrganizador`),
// contando status !== 'encerrado'. Uma chamada por sessão (cache em módulo por
// tenant+uid — a sidebar remonta a cada navegação e não pode repetir a query).
// null = sem dado (anônimo, claims sem tenant ou erro) → SEM badge, nunca 0
// fabricado. Comunicação NÃO tem contagem barata no cliente — fica sem badge
// (registrado no commit).
// =============================================================================

import { useEffect, useState } from 'react';
import {
  getClaims,
  getLeelaDb,
  listarEventosDoOrganizador,
  onSessionChange,
} from '@leela/api-client';
import type { AuthClaims, Evento } from '@leela/core';

/** Eventos "ativos" para o badge = não encerrados (mesmo recorte da Visão Geral). @pure */
export function contarEventosAtivos(eventos: readonly Pick<Evento, 'status'>[]): number {
  return eventos.filter((e) => e.status !== 'encerrado').length;
}

// Cache em módulo: 1 query por sessão (chave tenant:uid).
let cacheChave: string | null = null;
let cacheContagem: number | null = null;

/** Zera o cache (só testes). */
export function _resetEventosBadgeCache(): void {
  cacheChave = null;
  cacheContagem = null;
}

/**
 * Contagem de eventos ativos do produtor logado para o nav-badge.
 * null enquanto carrega, sem sessão ou em erro (estado honesto — sem badge).
 */
export function useEventosAtivosBadge(): number | null {
  const [contagem, setContagem] = useState<number | null>(cacheContagem);

  useEffect(() => {
    let ativo = true;
    const unsub = onSessionChange((user) => {
      if (!user) {
        if (ativo) setContagem(null);
        return;
      }
      void getClaims()
        .then((claims) => {
          const tenantId = (claims as AuthClaims | null)?.tenantId ?? null;
          if (!tenantId) return null;
          const chave = `${tenantId}:${user.uid}`;
          if (cacheChave === chave) return cacheContagem;
          return listarEventosDoOrganizador(getLeelaDb(), {
            tenantId,
            organizadorId: user.uid,
          }).then((eventos) => {
            cacheChave = chave;
            cacheContagem = contarEventosAtivos(eventos);
            return cacheContagem;
          });
        })
        .then((n) => {
          if (ativo) setContagem(n);
        })
        .catch(() => {
          // Erro de rede/permissão: sem badge (nunca número inventado).
          if (ativo) setContagem(null);
        });
    });
    return () => {
      ativo = false;
      unsub();
    };
  }, []);

  return contagem;
}
