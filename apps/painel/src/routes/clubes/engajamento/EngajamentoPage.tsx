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
import { ClubesAreaNav } from '../_components/ClubesAreaNav';
// Derivação CANÔNICA da ocupação (VG v3 ratificada, D-1008-R3) — CONSUMIDA,
// nunca re-implementada: a banda Eventos do estudo mostra o MESMO bloco na
// versão analytics (E02), e duas cópias da razão inscritos/vagas driftariam.
import { derivarOcupacao } from '../../overview/_lib/ocupacao';
import {
  TODOS_OS_CLUBS,
  clubesNoRecorte,
  useClubesDoTenant,
  useDadosDoEngajamento,
  useEventosDoOrganizador,
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

  // Banda Eventos (estudo · D-1008-R15): eventos são do ORGANIZADOR, não de um
  // club — o filtro de club não recorta esta leitura, e o erro dela fica
  // contido no card (a análise da comunidade não pode cair junto).
  const eventosState = useEventosDoOrganizador();
  const ocupacao = useMemo(
    () =>
      eventosState.data
        ? derivarOcupacao(
            eventosState.data.map((evento) => ({
              nome: evento.nome,
              slug: evento.slug,
              qtdInscritos: evento.qtdInscritos,
              // `?? null` cobre literais legados sem o campo (padrão da VG).
              capacidade: evento.capacidade ?? null,
              data: evento.data,
            }))
          )
        : null,
    [eventosState.data]
  );

  const loading = clubesState.loading || dados.loading;
  const error = clubesState.error ?? dados.error;
  const semClubes = clubes !== null && clubes.length === 0;

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
      ocupacao={ocupacao}
      eventosLoading={eventosState.loading}
      eventosError={eventosState.error !== null}
      onRetryEventos={eventosState.refetch}
      loading={loading}
      error={error}
      semClubes={semClubes}
      onCriarClube={() => navigate('/clubes/novo')}
      areaNav={<ClubesAreaNav ativa="engajamento" />}
    />
  );
}

EngajamentoPage.displayName = 'EngajamentoPage';
