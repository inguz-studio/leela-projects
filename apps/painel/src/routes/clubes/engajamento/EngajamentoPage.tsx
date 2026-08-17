// =============================================================================
// EngajamentoPage — container da análise da comunidade.
//
// Liga o filtro de club (estado da tela) às leituras (`_data`) e às derivações
// puras (`_lib`), e entrega tudo pronto para a View. Nenhum cálculo aqui.
//
// O RECORTE É ESTADO DE TELA, não de domínio: nada de localStorage, nada de
// preferência persistida — a pessoa escolhe o club, lê, e a próxima visita
// começa de novo em "todos". O filtro por evento da Análise de vendas segue a
// mesma regra.
// =============================================================================

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EngajamentoView } from './EngajamentoView';
import {
  TODOS_OS_CLUBS,
  clubesNoRecorte,
  useClubesDoTenant,
  useDadosDoEngajamento,
} from './_data/engajamento';
import {
  ranquearDesafios,
  resumirComunidade,
  resumirEntrada,
  resumirModalidades,
  resumirPilares,
  resumirPonteComEventos,
  resumirSituacao,
} from './_lib/engajamento';

export function EngajamentoPage(): JSX.Element {
  const navigate = useNavigate();
  const [clubeSelecionado, setClubeSelecionado] = useState<string>(TODOS_OS_CLUBS);

  const clubesState = useClubesDoTenant();
  const clubes = clubesState.data;

  // Um club que sai da lista (removido, ou o tenant trocou) não pode deixar o
  // filtro apontando para o vazio — volta a "todos" em vez de mostrar zero.
  const selecaoValida =
    clubeSelecionado === TODOS_OS_CLUBS ||
    (clubes?.some((c) => c.id === clubeSelecionado) ?? false);
  const selecao = selecaoValida ? clubeSelecionado : TODOS_OS_CLUBS;

  const recorte = useMemo(() => clubesNoRecorte(clubes, selecao), [clubes, selecao]);
  const dados = useDadosDoEngajamento(recorte);

  // A banda Eventos SAIU (R2 · ENG-CARGA-1). O que morreu aqui foi a leitura
  // `useEventosDoOrganizador()` e a derivação `ocupacao` — a única leitura
  // desta tela que o seletor de club NÃO recortava. Nada migrou: os dois
  // blocos daquela banda (`OcupacaoEventos` e o "Formas de pagamento") já
  // estavam montados na Visão geral (`OverviewContent.tsx:191` e `:182`),
  // vindos do MESMO componente e da MESMA fonte. Era uma segunda montagem,
  // não um bloco próprio.
  //
  // O critério que sustenta o corte, e que vale para qualquer tela com filtro:
  // bloco que o filtro da tela não alcança não pertence àquela tela. Depois
  // deste commit, TUDO que o Engajamento mostra deriva de `dados.data`, que
  // nasce recortado por `recorte`.
  const loading = clubesState.loading || dados.loading;
  const error = clubesState.error ?? dados.error;
  const semClubes = clubes !== null && clubes.length === 0;

  // UXW-FIX · MEL-01: o "Tentar novamente" do bloco de erro. Recarrega as DUAS
  // pontas — a lista de clubs e as leituras do recorte — porque o erro exibido
  // é o primeiro que apareceu e não diz qual das duas falhou.
  const onRetry = (): void => {
    clubesState.refetch();
    dados.refetch();
  };

  const derivado = useMemo(() => {
    if (!dados.data) return null;
    return {
      resumo: resumirComunidade(recorte, dados.data.desafios),
      pilares: resumirPilares(dados.data.desafios),
      situacao: resumirSituacao(dados.data.membros),
      entrada: resumirEntrada(dados.data.membros),
      desafios: ranquearDesafios(dados.data.desafios),
      ponte: resumirPonteComEventos(dados.data.desafios),
      modalidades: resumirModalidades(recorte),
    };
  }, [dados.data, recorte]);

  return (
    <EngajamentoView
      clubes={(clubes ?? []).map((c) => ({ id: c.id, nome: c.nome }))}
      clubeSelecionado={selecao}
      onSelecionarClube={setClubeSelecionado}
      resumo={derivado?.resumo ?? null}
      pilares={derivado?.pilares ?? null}
      situacao={derivado?.situacao ?? null}
      entrada={derivado?.entrada ?? null}
      desafios={derivado?.desafios ?? null}
      ponte={derivado?.ponte ?? null}
      modalidades={derivado?.modalidades ?? null}
      loading={loading}
      error={error}
      onRetry={onRetry}
      semClubes={semClubes}
      onCriarClube={() => navigate('/clubes/novo')}
    />
  );
}

EngajamentoPage.displayName = 'EngajamentoPage';
