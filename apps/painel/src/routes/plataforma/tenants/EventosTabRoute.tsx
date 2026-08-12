// =============================================================================
// EventosTabRoute — a aba `/plataforma/tenants/:tenantId/eventos`
// (ADMIN-VISAO onda 3 · S1612-T3).
//
// REUSO INTEIRO. A casca é a `ListaGlobal` da onda 4 (contador honesto,
// paginação por cursor, estados) e a leitura é o `useEventosGlobais({tenantId})`
// que já existe — quando o recorte é um tenant, o hook cai em
// `listarEventosDoTenantPaginado`. Zero reader novo, zero casca nova.
//
// AQUI DINHEIRO ENTRA, e a onda 4 escreveu por que lá não entrou: "uma coluna
// de receita ali entregaria número de dinheiro sem a régua da RN-182 declarada
// na tela". Nesta aba a régua está do lado — é a ficha, e as abas Vendas e
// Financeiro declaram de onde cada cifra sai. A coluna vem de
// `Evento.receitaConfirmada`, campo gravado por Function
// (`agregarFinanceiro.ts`), e o rótulo diz CONFIRMADA: pedido pendente não
// entra nesse número.
//
// ⚠️ O QUE ESTA TELA NÃO CONSEGUE DISTINGUIR, e fica escrito: `receitaConfirmada`
// é `number` obrigatório no tipo, e `parseEvento` transforma campo ausente em 0
// (`evento.ts:421`). Um evento antigo, de antes do agregado, chega aqui como
// zero e é indistinguível de um evento sem venda confirmada. A tela não tem
// como separar os dois — o que dá para fazer, e é o que se faz, é declarar na
// própria tela o que o número significa, para que "R$ 0,00" leia como "nada
// confirmado" e não como "sem informação".
//
// SEM FILTRO DE STATUS: a leitura por tenant não aceita `status` (a onda 1
// decidiu reusar `listarEventosDoTenantPaginado` em vez de acrescentar
// parâmetro ao reader global), e peneirar no cliente sobre uma página faria o
// contador mentir — o defeito que o gate da onda 4 proíbe.
//
// DINHEIRO COM CENTAVOS, como nas outras abas da ficha.
// =============================================================================

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, type TableColumn } from '@leela/design-system';
import type { Evento } from '@leela/core';
import { ListaGlobal } from '../_components/ListaGlobal';
import { useEventosGlobais } from '../_data/listasGlobais';
import { formatInt } from '../_lib/format';
import { formatBRL, formatDataHora } from '../../eventos/repasses/_lib/format';
import { statusEventoBadge } from '../../eventos/_lib/status';

const SUBSTANTIVO = { singular: 'evento', plural: 'eventos' };

export function EventosTabRoute(): JSX.Element {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  // Sem clique de linha: a S1612 é LEITURA (a spec põe ação sobre evento ou
  // clube a partir da ficha explicitamente fora de escopo), e a tela do evento
  // é a do organizador, tenant-scoped por claim — o admin não entra por lá.
  const estado = useEventosGlobais({ tenantId });

  const colunas = useMemo<TableColumn<Evento>[]>(
    () => [
      {
        key: 'nome',
        header: 'Evento',
        render: (e) => (
          <div className="flex flex-col">
            <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
              {e.nome.trim() === '' ? 'Sem nome' : e.nome}
            </span>
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              {e.local.trim() === '' ? e.slug : e.local}
            </span>
          </div>
        ),
      },
      { key: 'data', header: 'Data', render: (e) => formatDataHora(e.data) },
      {
        key: 'status',
        header: 'Status',
        render: (e) => {
          const s = statusEventoBadge(e.status);
          return <Badge variant={s.variant}>{s.label}</Badge>;
        },
      },
      {
        key: 'modalidades',
        header: 'Modalidades',
        render: (e) =>
          e.modalidades.length === 0 ? (
            <span className="text-[var(--text-tertiary)]">—</span>
          ) : (
            e.modalidades.join(', ')
          ),
      },
      {
        // Régua R19: o agregado conta TODAS as inscrições da subcoleção,
        // cancelada inclusive (`functions/src/eventos/agregarFinanceiro.ts:31-33`).
        // Por isso "Inscrições", jamais "Inscritos pagantes".
        key: 'qtdInscritos',
        header: 'Inscrições',
        align: 'right',
        render: (e) => formatInt(e.qtdInscritos),
      },
      {
        key: 'receitaConfirmada',
        header: 'Receita confirmada',
        align: 'right',
        render: (e) => (
          <span className="[font-variant-numeric:tabular-nums]">
            {formatBRL(e.receitaConfirmada)}
          </span>
        ),
      },
    ],
    []
  );

  const recorte = (
    <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
      Todos os eventos deste produtor. Receita confirmada conta só o que o gateway confirmou —
      pedido pendente não entra, e R$ 0,00 significa nada confirmado.
    </p>
  );

  return (
    <ListaGlobal
      titulo="Eventos"
      subtitulo="O que este produtor está produzindo na plataforma."
      recorte={recorte}
      estado={estado}
      colunas={colunas}
      keyExtractor={(e) => e.id}
      caption="Eventos deste tenant, com inscrições e receita confirmada"
      substantivo={SUBSTANTIVO}
      vazio={{
        titulo: 'Nenhum evento neste tenant',
        descricao: 'Os eventos aparecem aqui conforme este produtor os cria.',
      }}
      erro={{
        titulo: 'Não foi possível carregar os eventos',
        descricao: 'A leitura da lista falhou. Tente de novo em alguns instantes.',
      }}
    />
  );
}

EventosTabRoute.displayName = 'EventosTabRoute';
