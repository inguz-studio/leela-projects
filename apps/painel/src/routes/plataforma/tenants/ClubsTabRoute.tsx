// =============================================================================
// ClubsTabRoute — a aba `/plataforma/tenants/:tenantId/clubs`
// (ADMIN-VISAO onda 3 · S1612-T4).
//
// Mesma casca da aba Eventos e mesma leitura da onda 4:
// `useClubesGlobais({tenantId})` cai em `listarClubesDoTenantPaginado`. Nenhum
// reader novo.
//
// O GATE DESTA ONDA: NENHUMA LINHA SUGERE RECEITA DE CLUBE. `modeloEntrada` só
// admite `gratuito` e `pago_em_breve` (RN-104 — "pago" é promessa de produto,
// não cobrança viva), e não existe mensalidade de clube no modelo. Por isso a
// coluna diz "Pago (em breve)" e não há coluna de dinheiro nenhuma. O teste
// prova a ausência de qualquer `R$` na tela.
//
// SEM FILTRO DE STATUS, e não é esquecimento: `Clube` não tem campo de status
// (`packages/core/src/clubs/clube.ts`). O recorte que existe é o tenant, e a
// ficha já É o tenant.
//
// Os dois rótulos (visibilidade e modelo de entrada) repetem os da lista global
// palavra por palavra. Lá eles são funções locais de `ClubsGlobaisRoute.tsx`,
// não exportadas, e aquele arquivo está fora do território desta lane — então
// aqui eles são redeclarados sobre a MESMA fonte de vocabulário
// (`clubes/_lib/configClube`), que é o que impede as duas telas de divergirem
// de verdade.
// =============================================================================

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, type TableColumn } from '@leela/design-system';
import { formatarLocalizacaoClube, type Clube } from '@leela/core';
import { ListaGlobal } from '../_components/ListaGlobal';
import { useClubesGlobais } from '../_data/listasGlobais';
import { formatInt } from '../_lib/format';
import { MODELOS_ENTRADA, VISIBILIDADES } from '../../clubes/_lib/configClube';

const SUBSTANTIVO = { singular: 'clube', plural: 'clubs' };

/** Rótulo da visibilidade — vocabulário do organizador, reusado. */
function rotuloVisibilidade(clube: Clube): string {
  return VISIBILIDADES.find((v) => v.id === clube.visibilidade)?.label ?? clube.visibilidade;
}

/**
 * Rótulo do modelo de entrada. `pago_em_breve` ganha o "(em breve)" explícito:
 * no form do organizador a opção aparece desabilitada, o que já diz que não
 * está no ar; numa tabela de leitura não há esse sinal, e "Pago" sozinho leria
 * como clube que cobra.
 */
function rotuloModeloEntrada(clube: Clube): string {
  const base = MODELOS_ENTRADA.find((m) => m.id === clube.modeloEntrada);
  if (!base) return clube.modeloEntrada;
  return base.disabled ? `${base.label} (em breve)` : base.label;
}

export function ClubsTabRoute(): JSX.Element {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const estado = useClubesGlobais({ tenantId });

  const colunas = useMemo<TableColumn<Clube>[]>(
    () => [
      {
        key: 'nome',
        header: 'Clube',
        render: (c) => (
          <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {c.nome.trim() === '' ? 'Sem nome' : c.nome}
          </span>
        ),
      },
      { key: 'categoria', header: 'Tipo', render: (c) => c.categoria },
      { key: 'modalidade', header: 'Modalidade', render: (c) => c.modalidade },
      {
        key: 'localizacao',
        header: 'Onde',
        render: (c) => formatarLocalizacaoClube(c.localizacao),
      },
      {
        key: 'visibilidade',
        header: 'Visibilidade',
        render: (c) => <Badge variant="neutro">{rotuloVisibilidade(c)}</Badge>,
      },
      { key: 'modeloEntrada', header: 'Entrada', render: (c) => rotuloModeloEntrada(c) },
      {
        key: 'qtdMembrosAtivos',
        header: 'Membros ativos',
        align: 'right',
        render: (c) => formatInt(c.qtdMembrosAtivos),
      },
      {
        key: 'qtdDesafiosAtivos',
        header: 'Desafios ativos',
        align: 'right',
        render: (c) => formatInt(c.qtdDesafiosAtivos),
      },
    ],
    []
  );

  const recorte = (
    <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
      Todos os clubs deste produtor. Clube não cobra mensalidade no modelo — a entrada paga é
      promessa de produto, ainda não cobrança.
    </p>
  );

  return (
    <ListaGlobal
      titulo="Clubs"
      subtitulo="A comunidade que este produtor mantém na plataforma."
      recorte={recorte}
      estado={estado}
      colunas={colunas}
      keyExtractor={(c) => c.id}
      caption="Clubs deste tenant, com membros e desafios ativos"
      substantivo={SUBSTANTIVO}
      vazio={{
        titulo: 'Nenhum clube neste tenant',
        descricao: 'Os clubs aparecem aqui conforme este produtor os cria.',
      }}
      erro={{
        titulo: 'Não foi possível carregar os clubs',
        descricao: 'A leitura da lista falhou. Tente de novo em alguns instantes.',
      }}
    />
  );
}

ClubsTabRoute.displayName = 'ClubsTabRoute';
