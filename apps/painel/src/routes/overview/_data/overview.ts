// =============================================================================
// Hooks de dados da Visão Geral (E02-L2/L3).
//
// Contrato único de KPIs+alertas: `getOverview()` (1 round-trip — S600-T3 e
// S602-T2 consomem o MESMO retorno; nenhuma segunda chamada para alertas).
// Eventos ativos (S601-T1) e o countdown (S602-T1) vêm da listagem do
// organizador; as inscrições recentes (S601-T2) são a fusão cross-evento das
// primeiras páginas de cada evento (ver SUMMARY §handoff sobre a query CG).
// =============================================================================

import { useEffect, useState } from 'react';
import {
  getLeelaDb,
  getOverview,
  listarEventosDoOrganizador,
  listarInscritos,
  type OverviewResult,
} from '@leela/api-client';
import type { Evento } from '@leela/core';
import type { InscricaoRecenteInput } from '../_lib/recentRegistrations';
import type { OverviewSession } from './session';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/** Tipo de erro do callable getOverview — a UI mostra a mensagem adequada. */
export type OverviewErrorKind = 'unauthenticated' | 'permission-denied' | 'unknown';

export interface OverviewState extends AsyncState<OverviewResult> {
  errorKind: OverviewErrorKind | null;
}

function classificarErro(error: unknown): OverviewErrorKind {
  const code = (error as { code?: string })?.code ?? '';
  if (code.includes('unauthenticated')) return 'unauthenticated';
  if (code.includes('permission-denied')) return 'permission-denied';
  return 'unknown';
}

/**
 * KPIs + alertas consolidados via `getOverview` (contrato único).
 * Só dispara com sessão autenticada; trata unauthenticated/permission-denied.
 */
export function useOverview(session: OverviewSession): OverviewState {
  const [state, setState] = useState<OverviewState>({
    data: null,
    loading: true,
    error: null,
    errorKind: null,
  });

  useEffect(() => {
    if (session.status === 'loading') return;
    if (session.status === 'anonymous') {
      setState({
        data: null,
        loading: false,
        error: new Error('Sessão não autenticada.'),
        errorKind: 'unauthenticated',
      });
      return;
    }
    let ativo = true;
    setState({ data: null, loading: true, error: null, errorKind: null });
    getOverview()
      .then((data) => {
        if (ativo) setState({ data, loading: false, error: null, errorKind: null });
      })
      .catch((error: Error) => {
        if (ativo) {
          setState({ data: null, loading: false, error, errorKind: classificarErro(error) });
        }
      });
    return () => {
      ativo = false;
    };
  }, [session.status, session.uid]);

  return state;
}

/** Lista de eventos do produtor logado (fonte de S601-T1 e do countdown S602-T1). */
export function useEventosProdutor(session: OverviewSession): AsyncState<Evento[]> {
  const [state, setState] = useState<AsyncState<Evento[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (session.status === 'loading') return;
    if (session.status === 'anonymous' || !session.uid || !session.tenantId) {
      setState({ data: null, loading: false, error: new Error('Sessão não autenticada.') });
      return;
    }
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    listarEventosDoOrganizador(getLeelaDb(), {
      tenantId: session.tenantId,
      organizadorId: session.uid,
    })
      .then((eventos) => ativo && setState({ data: eventos, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [session.status, session.uid, session.tenantId]);

  return state;
}

/**
 * Inscrições recentes cross-evento (S601-T2). Onda 1: funde a primeira página
 * de cada evento ativo (não encerrado) e deixa a ordenação por data desc para
 * a derivação pura. Uma query collection-group única (índice já declarado por
 * E02-L1: inscritos tenantId+criadoEm DESC) substitui isto quando existir o
 * helper de api-client + a Rule de CG — ver SUMMARY §handoff.
 */
export function useInscricoesRecentes(
  eventos: Evento[] | null,
  porEvento = 10
): AsyncState<InscricaoRecenteInput[]> {
  const [state, setState] = useState<AsyncState<InscricaoRecenteInput[]>>({
    data: null,
    loading: true,
    error: null,
  });

  // Chave estável dos eventos ativos (evita refetch por refs novas)
  const chave = (eventos ?? [])
    .filter((e) => e.status !== 'encerrado')
    .map((e) => e.id)
    .join(',');

  useEffect(() => {
    if (eventos === null) return;
    const ativos = eventos.filter((e) => e.status !== 'encerrado');
    if (ativos.length === 0) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    const db = getLeelaDb();
    Promise.all(
      ativos.map((evento) =>
        listarInscritos(db, evento.id, { pageSize: porEvento }).then((res) =>
          res.itens.map(
            (i): InscricaoRecenteInput => ({
              id: `${evento.id}:${i.id}`,
              atletaNome: i.atletaNome,
              modalidade: i.modalidade,
              status: i.status,
              criadoEm: i.criadoEm,
              eventoNome: evento.nome,
            })
          )
        )
      )
    )
      .then((porEventoInscricoes) => {
        if (ativo) {
          setState({ data: porEventoInscricoes.flat(), loading: false, error: null });
        }
      })
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
    // Deps intencionais: `chave` (ids dos eventos ativos) estabiliza o refetch;
    // `eventos` como ref muda a cada render e causaria loop.
  }, [chave, porEvento]);

  return state;
}
