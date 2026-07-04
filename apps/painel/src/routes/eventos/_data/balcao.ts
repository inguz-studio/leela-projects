// =============================================================================
// Camada de dados do balcão de entrega (S204-T1). Reúne o pool de inscritos
// para busca (nome/dorsal) e os callers das Functions de chip/presença.
// Escrita SEMPRE via Function (S204-T2) — o cliente nunca grava carimbos.
// =============================================================================

import { useCallback } from 'react';
import {
  getLeelaFunctions,
  registrarEntrega,
  vincularChip,
  type RegistrarEntregaResult,
  type VincularChipResult,
} from '@leela/api-client';

export interface BalcaoMutations {
  vincular: (
    inscritoId: string,
    chip: string,
    sobrescrever?: boolean,
  ) => Promise<VincularChipResult>;
  registrar: (inscritoId: string) => Promise<RegistrarEntregaResult>;
}

/** Callers tipados das Functions do balcão, ligados ao evento em foco. */
export function useBalcaoMutations(eventoId: string): BalcaoMutations {
  const vincular = useCallback(
    (inscritoId: string, chip: string, sobrescrever?: boolean) =>
      vincularChip(getLeelaFunctions(), {
        eventoId,
        inscritoId,
        chip,
        ...(sobrescrever ? { sobrescrever: true } : {}),
      }),
    [eventoId],
  );

  const registrar = useCallback(
    (inscritoId: string) =>
      registrarEntrega(getLeelaFunctions(), { eventoId, inscritoId }),
    [eventoId],
  );

  return { vincular, registrar };
}
