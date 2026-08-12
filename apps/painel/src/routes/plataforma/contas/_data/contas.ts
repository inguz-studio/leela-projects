// =============================================================================
// Data hooks do DIRETÓRIO DE CONTAS (ADMIN-VISAO onda 5 · S1615-T2). Consomem
// os readers da S1615-T1 (`listarProfissionaisPaginado` /
// `listarAtletasPaginado`) e o callable auditado da S1615-T3. Nenhuma query
// nova aqui.
//
// POR QUE useState E NÃO O GATEWAY react-query: o gateway modela lista COMPLETA
// por chave, e esta leitura é por CURSOR com "carregar mais" (append). É a mesma
// razão — e o mesmo contrato `{itens, loading, loadingMore, error, temMais,
// carregarMais, refetch}` — de `_data/listasGlobais.ts`, que por sua vez repete
// o hook do CRM. Um terceiro padrão de paginação no mesmo app para o mesmo
// trabalho seria dívida nova.
//
// O MODO DIRETÓRIO SÃO DUAS LEITURAS, E ELE NÃO FINGE QUE SÃO UMA. `profissionais`
// e `atletas` são coleções separadas (não existe Rule de collectionGroup, e a
// negativa de CG se disfarça de falta de índice — armadilha nomeada na spec).
// Cada uma tem o próprio cursor; a página anexa os dois blocos na ordem em que
// vieram e NÃO reordena. Ordenar a página carregada por nome sugeriria uma ordem
// alfabética global que a query nunca produziu — a mesma mentira que o contador
// truncado seria, com outra roupa. A coluna Papel diz de onde cada linha veio.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  consultarDocumentoDaConta,
  getLeelaDb,
  getLeelaFunctions,
  liberarAcessoOrganizador,
  listarAtletasPaginado,
  listarProfissionaisPaginado,
  type ContaDoDiretorio,
  type ContaProfissionalView,
  type DiretorioContasCursor,
} from '@leela/api-client';
import type { ListaGlobalState } from '../../_data/listasGlobais';
import { estadoDaResposta, type EstadoDaIdentificacao } from '../_lib/contas';
import { mensagemDaRecusa } from '../../_lib/errors';

// ---------------------------------------------------------------------------
// Modo Fila — só quem aguarda liberação (RN-547)
// ---------------------------------------------------------------------------

/**
 * A fila do painel master: contas em `statusOnboarding: 'aguardando_convite'`.
 * O recorte vai no `where` do SERVIDOR — peneirar a página no cliente faria o
 * contador mentir na primeira paginação.
 */
export function useFilaDeContas(nonce = 0): ListaGlobalState<ContaProfissionalView> {
  const [itens, setItens] = useState<ContaProfissionalView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<DiretorioContasCursor | null>(null);
  const [temMais, setTemMais] = useState(false);
  const [proprio, setProprio] = useState(0);

  const refetch = useCallback(() => setProprio((n) => n + 1), []);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setError(null);
    setItens([]);
    setCursor(null);
    setTemMais(false);
    listarProfissionaisPaginado(getLeelaDb(), {
      statusOnboarding: 'aguardando_convite',
    })
      .then((r) => {
        if (!ativo) return;
        setItens(r.itens);
        setCursor(r.proxCursor);
        setTemMais(r.proxCursor !== null);
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
  }, [nonce, proprio]);

  const carregarMais = useCallback(() => {
    if (cursor === null || loadingMore) return;
    setLoadingMore(true);
    listarProfissionaisPaginado(getLeelaDb(), {
      statusOnboarding: 'aguardando_convite',
      cursor,
    })
      .then((r) => {
        setItens((atual) => [...atual, ...r.itens]);
        setCursor(r.proxCursor);
        setTemMais(r.proxCursor !== null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setLoadingMore(false));
  }, [cursor, loadingMore]);

  return { itens, loading, loadingMore, error, temMais, carregarMais, refetch };
}

// ---------------------------------------------------------------------------
// Modo Diretório — duas coleções, dois cursores, uma lista
// ---------------------------------------------------------------------------

interface CursoresDoDiretorio {
  profissionais: DiretorioContasCursor | null;
  atletas: DiretorioContasCursor | null;
}

/**
 * Todas as contas das duas origens, com o papel de cada uma. LEITURA: esta
 * lista não tem ação em massa, e não deve ganhar uma.
 *
 * `temMais` é verdadeiro enquanto QUALQUER um dos dois cursores estiver vivo —
 * assim o contador só vira "total do recorte" quando as duas coleções acabaram.
 * Dizer "fim da lista" com um cursor ainda aberto seria apresentar meia leitura
 * como o sistema inteiro.
 */
export function useDiretorioDeContas(nonce = 0): ListaGlobalState<ContaDoDiretorio> {
  const [itens, setItens] = useState<ContaDoDiretorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cursores, setCursores] = useState<CursoresDoDiretorio>({
    profissionais: null,
    atletas: null,
  });
  const [temMais, setTemMais] = useState(false);
  const [proprio, setProprio] = useState(0);

  const refetch = useCallback(() => setProprio((n) => n + 1), []);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setError(null);
    setItens([]);
    setCursores({ profissionais: null, atletas: null });
    setTemMais(false);
    Promise.all([
      listarProfissionaisPaginado(getLeelaDb(), {}),
      listarAtletasPaginado(getLeelaDb(), {}),
    ])
      .then(([prof, atl]) => {
        if (!ativo) return;
        setItens([...prof.itens, ...atl.itens]);
        setCursores({ profissionais: prof.proxCursor, atletas: atl.proxCursor });
        setTemMais(prof.proxCursor !== null || atl.proxCursor !== null);
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
  }, [nonce, proprio]);

  const carregarMais = useCallback(() => {
    if (loadingMore) return;
    const { profissionais, atletas } = cursores;
    if (profissionais === null && atletas === null) return;
    setLoadingMore(true);
    Promise.all([
      profissionais !== null
        ? listarProfissionaisPaginado(getLeelaDb(), { cursor: profissionais })
        : Promise.resolve({ itens: [], proxCursor: null }),
      atletas !== null
        ? listarAtletasPaginado(getLeelaDb(), { cursor: atletas })
        : Promise.resolve({ itens: [], proxCursor: null }),
    ])
      .then(([prof, atl]) => {
        setItens((atual) => [...atual, ...prof.itens, ...atl.itens]);
        setCursores({ profissionais: prof.proxCursor, atletas: atl.proxCursor });
        setTemMais(prof.proxCursor !== null || atl.proxCursor !== null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setLoadingMore(false));
  }, [cursores, loadingMore]);

  return { itens, loading, loadingMore, error, temMais, carregarMais, refetch };
}

// ---------------------------------------------------------------------------
// Identificação sob demanda (V-4) — uma conta por gesto
// ---------------------------------------------------------------------------

export interface IdentificacoesState {
  /** Estado por uid. Ausente = nunca foi consultado nesta sessão de tela. */
  porConta: Record<string, EstadoDaIdentificacao>;
  identificar: (contaUid: string) => void;
}

/**
 * A revelação por linha. Cada chamada é uma consulta auditada no servidor —
 * por isso ela nasce de um clique e NUNCA da montagem da lista. Não existe
 * versão que identifique a página inteira, e não deve nascer uma.
 */
export function useIdentificacoes(): IdentificacoesState {
  const [porConta, setPorConta] = useState<Record<string, EstadoDaIdentificacao>>({});

  const identificar = useCallback((contaUid: string) => {
    setPorConta((atual) =>
      atual[contaUid]?.situacao === 'consultando'
        ? atual
        : { ...atual, [contaUid]: { situacao: 'consultando' } }
    );
    consultarDocumentoDaConta(getLeelaFunctions(), { contaUid })
      .then((r) => {
        setPorConta((atual) => ({ ...atual, [contaUid]: estadoDaResposta(r) }));
      })
      .catch((err: unknown) => {
        setPorConta((atual) => ({
          ...atual,
          [contaUid]: { situacao: 'erro', mensagem: mensagemDaRecusa(err) },
        }));
      });
  }, []);

  return { porConta, identificar };
}

// ---------------------------------------------------------------------------
// Liberação direta (RN-548)
// ---------------------------------------------------------------------------

export interface LiberacaoState {
  running: boolean;
  /** Executa a liberação; devolve o tenantId ou null quando falhou. */
  liberar: (contaUid: string) => Promise<string | null>;
  ultimoErro: () => unknown;
}

/**
 * A porta administrativa. A tela não decide nada sobre elegibilidade: manda o
 * uid e lê a resposta. A régua e o rastro são do servidor (RN-548/RN-551).
 */
export function useLiberacaoDeAcesso(): LiberacaoState {
  const [running, setRunning] = useState(false);
  const [erro, setErro] = useState<unknown>(null);

  const liberar = useCallback(async (contaUid: string): Promise<string | null> => {
    setRunning(true);
    setErro(null);
    try {
      const r = await liberarAcessoOrganizador(getLeelaFunctions(), { contaUid });
      return r.tenantId;
    } catch (err: unknown) {
      setErro(err);
      return null;
    } finally {
      setRunning(false);
    }
  }, []);

  return { running, liberar, ultimoErro: () => erro };
}
