// =============================================================================
// Data hooks do módulo Marcas (E10 · S811 seed · RN-171). Leitura owner-scoped
// DIRETA (getLeelaDb + CRUD de `packages/api-client/src/brands.ts`) com refetch
// manual. Escopo LOCAL ao módulo (mesmo racional de crm/_data): sem tocar o
// registry compartilhado de react-query.
//
// O registro de marcas do profissional é uma lista pessoal e curta (patrocinadores
// que ele já cadastrou): `listarMarcas` faz UM getDocs ordenado por nome, sem
// paginação — a busca por nome roda no cliente sobre essa lista já em mãos (não
// há reader server-side de busca neste recorte, e nem é preciso).
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  excluirMarca,
  getLeelaDb,
  listarMarcas,
  marcaIdDoNome,
  salvarMarca,
  uploadLogoMarca,
} from '@leela/api-client';
import type { Marca, MarcaInput } from '@leela/core';

export interface ListaMarcasState {
  itens: Marca[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Lista as marcas do profissional (ordenadas por nome). */
export function useMarcas(uid: string | null): ListaMarcasState {
  const [itens, setItens] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!uid) {
      // Sem uid a tela mostra o estado 'sessão' (skeleton/anônimo); MANTER
      // loading=true evita um flash de EmptyState antes do 1º fetch quando o
      // uid chega.
      return;
    }
    let ativo = true;
    setLoading(true);
    setError(null);
    listarMarcas(getLeelaDb(), uid)
      .then((lista) => {
        if (ativo) setItens(lista);
      })
      .catch((err: unknown) => {
        if (ativo) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [uid, nonce]);

  return { itens, loading, error, refetch };
}

/**
 * Cria/atualiza uma marca. Em edição, `marcaId` fixa o docId (renomear NÃO
 * cria doc órfão); em criação, o id deriva do nome (`salvarMarca` faz o upsert).
 */
export async function salvarMarcaDoProfissional(
  uid: string,
  input: MarcaInput,
  marcaId?: string,
): Promise<string> {
  return salvarMarca(getLeelaDb(), uid, input, marcaId);
}

/** Exclui a marca do registro reutilizável (owner-only). */
export async function excluirMarcaDoProfissional(
  uid: string,
  marcaId: string,
): Promise<void> {
  return excluirMarca(getLeelaDb(), uid, marcaId);
}

/**
 * Upload da logo 1:1 (valida tipo/tamanho/proporção no seam do api-client).
 * O objeto é keyed pelo id da marca (`marcas/{uid}/{marcaId}`) — em criação o
 * id deriva do nome (mesma chave do upsert), então re-upload sobrescreve sem
 * órfãos. Devolve a downloadURL.
 */
export async function uploadLogoDaMarca(
  marcaId: string | null,
  nome: string,
  file: File,
): Promise<string> {
  const id = marcaId ?? marcaIdDoNome(nome);
  if (id.length === 0) {
    throw new Error('Informe o nome da marca antes de enviar a logo.');
  }
  return uploadLogoMarca(id, file);
}
