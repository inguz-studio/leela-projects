// =============================================================================
// Dados da tela de convites do super-admin (S1608-T2 · RN-413).
//
// Leitura e escrita são DIRETAS do client SDK: as Rules já exigem
// `platform_admin` em `convitesOrganizador` e fecham o shape (nasce `ativo`;
// só `ativo → revogado` passa; carimbo de uso é exclusivo da Function). Não há
// regra de negócio reinventada aqui — código, alfabeto e estados vêm do core.
// =============================================================================

import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  gerarConviteOrganizador,
  getLeelaDb,
  listarConvitesOrganizador,
  revogarConviteOrganizador,
} from '@leela/api-client';
import type { ConviteOrganizador } from '@leela/core';
import type { AsyncState } from '../../_data/tenants';

/** Lista de convites (mais recentes primeiro). `reloadKey` revalida pós-ação. */
export function useConvitesOrganizador(reloadKey = 0): AsyncState<ConviteOrganizador[]> {
  const query = useQuery({
    queryKey: ['plataforma', 'convitesOrganizador', reloadKey],
    queryFn: () => listarConvitesOrganizador(getLeelaDb()),
  });
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}

export interface ConviteActionsState {
  running: boolean;
  error: Error | null;
}

/**
 * Ações de convite. Cada uma devolve o resultado (código gerado / booleano) e
 * guarda o erro para a UI mostrar o Toast.
 *
 * `erroRef` espelha o erro de forma SÍNCRONA pelo mesmo motivo já registrado
 * em `planos/_data`: o estado só existe no render seguinte, e o handler que
 * monta o Toast nasceu no render anterior — sem o ref, a primeira falha saía
 * com descrição vazia.
 */
export function useConviteActions() {
  const [state, setState] = useState<ConviteActionsState>({ running: false, error: null });
  const erroRef = useRef<Error | null>(null);

  const registrarFalha = useCallback((err: unknown): void => {
    const erro = err instanceof Error ? err : new Error(String(err));
    erroRef.current = erro;
    setState({ running: false, error: erro });
  }, []);

  const gerar = useCallback(
    async (input: { criadoPor: string; nota?: string; expiraEm?: Date }): Promise<string | null> => {
      setState({ running: true, error: null });
      erroRef.current = null;
      try {
        const codigo = await gerarConviteOrganizador(getLeelaDb(), input);
        setState({ running: false, error: null });
        return codigo;
      } catch (err) {
        registrarFalha(err);
        return null;
      }
    },
    [registrarFalha],
  );

  const revogar = useCallback(
    async (codigo: string, revogadoPor: string): Promise<boolean> => {
      setState({ running: true, error: null });
      erroRef.current = null;
      try {
        await revogarConviteOrganizador(getLeelaDb(), codigo, revogadoPor);
        setState({ running: false, error: null });
        return true;
      } catch (err) {
        registrarFalha(err);
        return false;
      }
    },
    [registrarFalha],
  );

  const ultimoErro = useCallback((): Error | null => erroRef.current, []);

  return { ...state, gerar, revogar, ultimoErro };
}
