// =============================================================================
// EventosGlobaisRoute — `/plataforma/eventos` (ADMIN-VISAO onda 4 · S1614-T2).
//
// "Todos os eventos do sistema": a varredura que o dono pediu para não ter de
// abrir tenant por tenant. Coleção RAIZ, sem `collectionGroup` (não existe Rule
// de CG no arquivo — a armadilha nomeada em 03-spec.md · S1614) e sem Rule
// nova: o `platform_admin` já cruza `eventos` (`firestore.rules:744`).
//
// A COLUNA TENANT vem do doc (`Evento.tenantId`) e o NOME vem do join com a
// lista de tenants que o painel já carrega (`useTenants`) — sem reader novo.
// Tenant que não estiver na lista aparece pelo id, que é o fallback honesto:
// esconder o id atrás de "desconhecido" tiraria justamente o dado que serve
// para investigar.
//
// DINHEIRO FICA DE FORA, e é escolha. `Evento.receitaConfirmada` existe e tem
// escritor, mas cifra do painel master é território da onda 2 (ficha do tenant,
// RN-537 mode-aware, rota com review antagonista). Uma coluna de receita aqui
// entregaria número de dinheiro sem a régua da RN-182 declarada na tela. A
// varredura global responde "o que está acontecendo"; "quanto isso rendeu" é a
// ficha do tenant.
//
// UM RECORTE POR VEZ: tenant OU status. A razão está em _lib/listasGlobais.ts —
// a onda 1 decidiu que o recorte por tenant reusa o reader do tenant, e não
// existe reader que aceite os dois. Filtrar status no cliente sobre uma página
// faria o contador mentir, que é o que o gate desta onda proíbe.
// =============================================================================

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Combobox, FilterChips, type TableColumn } from '@leela/design-system';
import type { Evento } from '@leela/core';
import { ListaGlobal } from '../_components/ListaGlobal';
import { useEventosGlobais } from '../_data/listasGlobais';
import { useTenants } from '../_data/tenants';
import {
  FILTROS_STATUS_EVENTO,
  TENANT_TODOS,
  nomeDoTenant,
  opcoesDeTenant,
  statusDoFiltro,
  type FiltroStatusEvento,
} from '../_lib/listasGlobais';
import { formatDataHora, formatInt } from '../_lib/format';
import { statusEventoBadge } from '../../eventos/_lib/status';

const SUBSTANTIVO = { singular: 'evento', plural: 'eventos' };

export function EventosGlobaisRoute(): JSX.Element {
  const navigate = useNavigate();
  const [status, setStatus] = useState<FiltroStatusEvento>('todos');
  const [tenantId, setTenantId] = useState<string>(TENANT_TODOS);

  const { data: tenants } = useTenants();
  const estado = useEventosGlobais({ status: statusDoFiltro(status), tenantId });

  const porTenant = tenantId !== TENANT_TODOS;

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
      {
        key: 'tenantId',
        header: 'Tenant',
        render: (e) => nomeDoTenant(tenants, e.tenantId),
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
        // O agregado conta TODAS as inscrições da subcoleção, cancelada
        // inclusive (functions/src/eventos/agregarFinanceiro.ts:31-33) — por
        // isso o rótulo é "Inscrições", e não "Inscritos pagantes".
        key: 'qtdInscritos',
        header: 'Inscrições',
        align: 'right',
        render: (e) => formatInt(e.qtdInscritos),
      },
    ],
    [tenants]
  );

  const recorte = (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
        <Combobox
          id="plataforma-eventos-tenant"
          aria-label="Filtrar por tenant"
          options={opcoesDeTenant(tenants)}
          value={tenantId}
          onValueChange={(v) => setTenantId(typeof v === 'string' ? v : TENANT_TODOS)}
          placeholder="Todos os tenants"
          searchPlaceholder="Buscar tenant…"
          emptyText="Nenhum tenant com esse nome."
          className="w-full sm:w-64"
        />

        {/*
          Status. Era a fileira de `Chip` à mão do ADR-020, que a mantinha por
          dois motivos: o limiar de quatro valores e a falta de `disabled` na
          peça. O ADR está SUPERADO pela decisão do dono de 17/08 (leva 20) —
          filtro de listagem é lista — e o `disabled` foi pago no mesmo commit,
          que era a condição de reabertura escrita no próprio ADR.

          O "Todos" sai do `options`: a `FilterChips` desenha o dela sozinha, e
          mandar os dois produziria duas linhas de "Todos" na lista.
        */}
        <FilterChips
          label="Status"
          options={FILTROS_STATUS_EVENTO.filter((o) => o.id !== 'todos').map((o) => ({
            id: o.id,
            label: o.label,
          }))}
          selected={status === 'todos' ? [] : [status]}
          onChange={(next) => setStatus((next[0] as FiltroStatusEvento | undefined) ?? 'todos')}
          disabled={porTenant}
        />
      </div>

      {porTenant ? (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          O status filtra a lista do sistema inteiro. Volte para todos os tenants para usá-lo.
        </p>
      ) : null}
    </div>
  );

  return (
    <ListaGlobal
      titulo="Eventos"
      subtitulo="Todos os eventos da plataforma, de todos os tenants."
      recorte={recorte}
      estado={estado}
      colunas={colunas}
      keyExtractor={(e) => e.id}
      caption="Eventos de todos os tenants da plataforma"
      substantivo={SUBSTANTIVO}
      onRowClick={(e) => {
        if (e.tenantId.trim() !== '') navigate(`/plataforma/tenants/${e.tenantId}`);
      }}
      vazio={{
        titulo: porTenant || status !== 'todos' ? 'Nenhum evento nesse recorte' : 'Nenhum evento na plataforma',
        descricao:
          porTenant || status !== 'todos'
            ? 'Ajuste o tenant ou o status para ver outros eventos.'
            : 'Os eventos aparecem aqui conforme os organizadores os criam.',
      }}
      erro={{
        titulo: 'Não foi possível carregar os eventos',
        descricao: 'A leitura da lista falhou. Tente de novo em alguns instantes.',
      }}
    />
  );
}

EventosGlobaisRoute.displayName = 'EventosGlobaisRoute';
