// =============================================================================
// ClubsGlobaisRoute — `/plataforma/clubs` (ADMIN-VISAO onda 4 · S1614-T3).
//
// A irmã da lista de eventos: mesma casca, mesma leitura por cursor, mesmas
// regras de contador. O que muda são as colunas e uma ausência declarada.
//
// SEM FILTRO DE STATUS, e não é esquecimento: `Clube` não tem campo de status
// (packages/core/src/clubs/clube.ts). O recorte que existe é o tenant, e é o
// único que a tela oferece — filtro que não filtra nada é pior que filtro
// nenhum.
//
// NENHUMA LINHA SUGERE RECEITA DE CLUBE. `modeloEntrada` só admite `gratuito` e
// `pago_em_breve` (RN-104: pago é promessa de produto, não cobrança viva), e
// não existe mensalidade de clube no modelo. Por isso a coluna diz "Pago (em
// breve)" e não há coluna de dinheiro nenhuma — o gate da spec para a superfície
// de clubs.
// =============================================================================

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Combobox, type TableColumn } from '@leela/design-system';
import { formatarLocalizacaoClube, type Clube } from '@leela/core';
import { ListaGlobal } from '../_components/ListaGlobal';
import { useClubesGlobais } from '../_data/listasGlobais';
import { useTenants } from '../_data/tenants';
import { TENANT_TODOS, nomeDoTenant, opcoesDeTenant } from '../_lib/listasGlobais';
import { formatInt } from '../_lib/format';
import { MODELOS_ENTRADA, VISIBILIDADES } from '../../clubes/_lib/configClube';

const SUBSTANTIVO = { singular: 'clube', plural: 'clubs' };

/** Rótulo da visibilidade — vocabulário do organizador, reusado. */
function rotuloVisibilidade(clube: Clube): string {
  return VISIBILIDADES.find((v) => v.id === clube.visibilidade)?.label ?? clube.visibilidade;
}

/**
 * Rótulo do modelo de entrada. `pago_em_breve` ganha o "(em breve)" explícito:
 * o rótulo do organizador é "Pago" porque lá a opção aparece desabilitada, o
 * que já diz que não está no ar. Numa tabela de leitura não há esse sinal, e
 * "Pago" sozinho leria como clube que cobra.
 */
function rotuloModeloEntrada(clube: Clube): string {
  const base = MODELOS_ENTRADA.find((m) => m.id === clube.modeloEntrada);
  if (!base) return clube.modeloEntrada;
  return base.disabled ? `${base.label} (em breve)` : base.label;
}

export function ClubsGlobaisRoute(): JSX.Element {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState<string>(TENANT_TODOS);

  const { data: tenants } = useTenants();
  const estado = useClubesGlobais({ tenantId });

  const porTenant = tenantId !== TENANT_TODOS;

  const colunas = useMemo<TableColumn<Clube>[]>(
    () => [
      {
        key: 'nome',
        header: 'Clube',
        render: (c) => (
          <div className="flex flex-col">
            <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
              {c.nome.trim() === '' ? 'Sem nome' : c.nome}
            </span>
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              {c.categoria}
            </span>
          </div>
        ),
      },
      {
        key: 'tenantId',
        header: 'Tenant',
        render: (c) => nomeDoTenant(tenants, c.tenantId),
      },
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
      {
        key: 'modeloEntrada',
        header: 'Entrada',
        render: (c) => rotuloModeloEntrada(c),
      },
      {
        key: 'qtdMembrosAtivos',
        header: 'Membros',
        align: 'right',
        render: (c) => formatInt(c.qtdMembrosAtivos),
      },
      {
        key: 'qtdDesafiosAtivos',
        header: 'Desafios',
        align: 'right',
        render: (c) => formatInt(c.qtdDesafiosAtivos),
      },
    ],
    [tenants]
  );

  const recorte = (
    <Combobox
      id="plataforma-clubs-tenant"
      aria-label="Filtrar por tenant"
      options={opcoesDeTenant(tenants)}
      value={tenantId}
      onValueChange={(v) => setTenantId(typeof v === 'string' ? v : TENANT_TODOS)}
      placeholder="Todos os tenants"
      searchPlaceholder="Buscar tenant…"
      emptyText="Nenhum tenant com esse nome."
      className="w-full sm:w-64"
    />
  );

  return (
    <ListaGlobal
      titulo="Clubs"
      subtitulo="Todos os clubs da plataforma, de todos os tenants."
      recorte={recorte}
      estado={estado}
      colunas={colunas}
      keyExtractor={(c) => c.id}
      caption="Clubs de todos os tenants da plataforma"
      substantivo={SUBSTANTIVO}
      onRowClick={(c) => {
        if (c.tenantId.trim() !== '') navigate(`/plataforma/tenants/${c.tenantId}`);
      }}
      vazio={{
        titulo: porTenant ? 'Nenhum clube nesse tenant' : 'Nenhum clube na plataforma',
        descricao: porTenant
          ? 'Escolha outro tenant para ver os clubs dele.'
          : 'Os clubs aparecem aqui conforme os organizadores os criam.',
      }}
      erro={{
        titulo: 'Não foi possível carregar os clubs',
        descricao: 'A leitura da lista falhou. Tente de novo em alguns instantes.',
      }}
    />
  );
}

ClubsGlobaisRoute.displayName = 'ClubsGlobaisRoute';
