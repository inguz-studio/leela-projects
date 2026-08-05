// =============================================================================
// RespiroTopo — canário do TOPO das áreas (REV-PAINEL, review do Adendo 13).
//
// O Adendo 13 suprimiu a barra superior do shell e NÃO recompôs os 89px que
// sumiram acima do conteúdo. A justificativa era verificável: `/plataforma`
// nunca teve a barra e vive bem, porque toda tela de lá abre com um PageHeader
// de `min-h` 96px e conteúdo centrado — o próprio header é o respiro.
//
// O argumento só vale para quem abre com PageHeader. Duas áreas do produtor
// abrem com uma **SubNav** (48px de altura, ZERO padding vertical, aba com
// `pb-1` e conteúdo centrado): `/eventos` (+ `/eventos/repasses`) e todo o
// `/crm/*`. Sem a barra, a aba dessas duas passou a encostar a ~12px do topo
// do contêiner de rolagem, contra ~32px das telas com PageHeader — metade do
// respiro do controle declarado. Foi defeito de layout achado na review.
//
// Este arquivo trava a regra que faltava, e ela é uma só:
//
//   O PRIMEIRO elemento de uma área dentro da área de rolagem precisa trazer
//   respiro de topo PRÓPRIO — ou por padding explícito na moldura, ou por ser
//   um PageHeader (cujo `min-h` de 96px com conteúdo centrado já é o respiro).
//
// Área nova que nasça com uma SubNav, um Breadcrumb ou uma tabela rente ao
// topo quebra aqui, e não na tela do dono.
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { PageHeader } from '@leela/design-system';
import { RootShell } from '../RootShell';
import { EventosHubLayout } from '../../routes/eventos/EventosHubLayout';
import { CrmLayout } from '../../routes/crm/CrmRoutes';
import { OverviewShell } from '../../routes/overview/OverviewShell';

// Mesma sessão mockada do RootShell.test — sem Firebase real.
vi.mock('@leela/api-client', () => ({
  onSessionChange: (cb: (u: { uid: string; displayName: string | null } | null) => void) => {
    cb({ uid: 'uid-marina', displayName: 'Marina Castelo' });
    return () => {};
  },
  getClaims: () => Promise.resolve({ tenantId: 'castelo', role: 'tenant_admin' }),
  getLeelaDb: () => ({}),
  listarEventosDoOrganizador: () => Promise.resolve([]),
}));

/**
 * A área de rolagem do RootShell — o contêiner cujo primeiro filho é a primeira
 * coisa que a pessoa vê ao abrir a rota. Localizado pelo papel `main` do
 * AppShell, não por classe de layout, para o canário não morrer numa
 * reorganização interna do shell.
 */
function areaDeRolagem(): HTMLElement {
  const main = screen.getByRole('main');
  const scroller = main.querySelector<HTMLElement>('.overflow-y-auto');
  if (!scroller) throw new Error('área de rolagem do RootShell não encontrada');
  return scroller;
}

/** As duas formas ACEITAS de respiro no topo de uma área. */
function respiroDoTopo(el: Element): 'padding-proprio' | 'page-header' | null {
  const cls = el.className.toString();
  if (/(^|\s)(pt-|py-|p-)\[/.test(cls)) return 'padding-proprio';
  // PageHeader: `min-h` de --header-height (96px) com o conteúdo centrado.
  if (el.tagName === 'HEADER' && cls.includes('min-h-[var(--header-height)]')) return 'page-header';
  return null;
}

function montarArea(path: string, area: ReactElement): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <RootShell>
        <Routes>
          <Route path="*" element={area} />
        </Routes>
      </RootShell>
    </MemoryRouter>,
  );
}

// Uma entrada por MOLDURA de área que herda o RootShell. `/eventos/:slug` e
// `/clubes/:slug` ficam de fora só porque exigem o doc do evento/clube — o
// respiro deles é do EventoShell (`pt-5` no breadcrumb) e do ClubeShell
// (PageHeader), ambos já cobertos pelos testes das próprias telas.
const AREAS: ReadonlyArray<{ nome: string; path: string; render: () => ReactElement }> = [
  { nome: 'Visão Geral (`/`)', path: '/', render: () => <OverviewShell nome="Marina">conteúdo</OverviewShell> },
  { nome: 'Hub de Eventos (`/eventos`)', path: '/eventos', render: () => <EventosHubLayout /> },
  { nome: 'Repasses (`/eventos/repasses`)', path: '/eventos/repasses', render: () => <EventosHubLayout /> },
  { nome: 'CRM (`/crm`)', path: '/crm', render: () => <CrmLayout /> },
  { nome: 'CRM · Clientes (`/crm/clientes`)', path: '/crm/clientes', render: () => <CrmLayout /> },
  // Controle declarado pelo Adendo 13: `/plataforma` nunca teve a barra e abre
  // com PageHeader. Se um dia deixar de abrir assim, cai aqui junto.
  { nome: 'Plataforma (controle)', path: '/plataforma/tenants', render: () => <PageHeader title="Tenants" /> },
];

describe('Adendo 13 · respiro no topo das áreas (canário REV-PAINEL)', () => {
  it.each(AREAS)('$nome abre com respiro próprio no topo', ({ path, render: renderArea }) => {
    montarArea(path, renderArea());
    const primeiro = areaDeRolagem().firstElementChild;
    expect(primeiro).not.toBeNull();
    expect(respiroDoTopo(primeiro as Element)).not.toBeNull();
  });

  // O defeito concreto que a review pegou: a SubNav de 48px encostada no topo.
  // Sem o `pt` da moldura, estas duas voltam a nascer rentes.
  it.each([
    { nome: 'Eventos', path: '/eventos', render: () => <EventosHubLayout /> },
    { nome: 'CRM', path: '/crm', render: () => <CrmLayout /> },
  ])('a SubNav de $nome NÃO é o primeiro pixel da área de rolagem', ({ path, render: renderArea }) => {
    montarArea(path, renderArea());
    const scroller = areaDeRolagem();
    const primeiro = scroller.firstElementChild as Element;
    // A moldura da área vem antes da barra, e é ela que carrega o respiro.
    expect(primeiro.tagName).not.toBe('NAV');
    expect(respiroDoTopo(primeiro)).toBe('padding-proprio');
    expect(primeiro.querySelector('nav')).not.toBeNull();
  });
});
