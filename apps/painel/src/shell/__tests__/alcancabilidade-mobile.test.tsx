// =============================================================================
// Alcançabilidade no mobile (NAV-MOBILE · leva 20).
//
// A barra de quatro tirou um item do caminho de uma largura inteira, e o risco
// dessa troca tem nome: destino que some do menu e não ganha outra porta vira
// rota INALCANÇÁVEL abaixo de `lg` — a lição S113 (área que abandona quem entra
// é defeito) na versão mais cara, porque quem entra pela URL fica preso e quem
// não sabe a URL nunca chega.
//
// Este arquivo é a prova, e ele fecha o círculo em vez de checar peça por peça:
// monta o CATÁLOGO de destinos das duas superfícies a partir das MESMAS tabelas
// que o shell consome, monta o conjunto do que a moldura mobile alcança, e
// exige que o primeiro esteja contido no segundo. Destino novo em `HREF_POR_ID`
// ou em `PLATFORM_NAV` entra no catálogo sozinho: quem acrescentar uma área sem
// dar casa a ela no mobile reprova aqui, sem precisar lembrar deste teste.
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  HREF_POR_ID,
  ITEM_FORA_DA_BARRA_MOBILE,
  ITENS_DA_BARRA_MOBILE,
  shellBottomNavItems,
  shellRailItems,
} from '../sidebar';
import { PLATFORM_NAV } from '../../routes/plataforma/_lib/nav';
import { ParceriasNoMobile } from '../../routes/overview/_components/ParceriasNoMobile';

const navegar = vi.fn();

/** Todo destino do menu do produtor + a conta (leva 15: só pelo popover). */
const CATALOGO_PRODUTOR = [
  ...Object.values(HREF_POR_ID).filter((h): h is string => typeof h === 'string'),
  '/conta',
];

/** Todo destino da nav do super-admin (item sem href é informativo, não rota). */
const CATALOGO_PLATAFORMA = PLATFORM_NAV.map((i) => i.href).filter(
  (h): h is string => typeof h === 'string',
);

describe('a barra de quatro — quais entram, e a conta que não fecha', () => {
  it('leva EXATAMENTE quatro destinos', () => {
    const itens = shellBottomNavItems('/', navegar);
    expect(itens).not.toBeNull();
    expect(itens).toHaveLength(4);
  });

  it('os quatro são os da spec, na ordem, e cada um é link de verdade', () => {
    const itens = shellBottomNavItems('/', navegar) ?? [];
    expect(itens.map((i) => i.id)).toEqual([...ITENS_DA_BARRA_MOBILE]);
    expect(itens.map((i) => i.href)).toEqual(['/', '/eventos', '/clubes', '/crm']);
    expect(itens.every((i) => typeof i.onClick === 'function')).toBe(true);
  });

  it('o quinto item do rail NÃO está na barra — é ele que tem casa fora', () => {
    const itens = shellBottomNavItems('/', navegar) ?? [];
    expect(itens.map((i) => i.id)).not.toContain(ITEM_FORA_DA_BARRA_MOBILE);
    // E ele continua no rail: a barra não o apagou do produto, só do mobile.
    expect(shellRailItems('/', navegar).map((i) => i.id)).toContain(
      ITEM_FORA_DA_BARRA_MOBILE,
    );
  });

  it('o item ativo acompanha o pathname, e URL legada não acende ninguém', () => {
    const ativo = (p: string): string | null =>
      (shellBottomNavItems(p, navegar) ?? []).find((i) => i.active)?.id ?? null;
    expect(ativo('/')).toBe('visao-geral');
    expect(ativo('/eventos/abc')).toBe('eventos');
    expect(ativo('/clubes')).toBe('clubs');
    expect(ativo('/crm/clientes')).toBe('crm');
    // `/parcerias` é destino do rail, não da barra: nenhum dos quatro acende, e
    // esse é o estado honesto — acender um vizinho seria mentir sobre onde a
    // pessoa está.
    expect(ativo('/parcerias')).toBeNull();
    // `/marcas` e `/financeiro` só redirecionam (RN-234).
    expect(ativo('/marcas')).toBeNull();
    expect(ativo('/conta')).toBeNull();
  });

  it('o badge de eventos carrega o que o leitor de tela precisa ouvir', () => {
    const com = (n: number | null) =>
      (shellBottomNavItems('/', navegar, n) ?? []).find((i) => i.id === 'eventos');
    expect(com(3)?.badge).toBe(3);
    expect(com(3)?.badgeLabel).toBe('3 eventos ativos');
    expect(com(1)?.badgeLabel).toBe('1 evento ativo');
    // Zero decorativo é proibido — sem contagem não há pílula.
    expect(com(0)?.badge).toBeUndefined();
    expect(com(null)?.badge).toBeUndefined();
  });
});

describe('a assimetria entre as duas superfícies (NAV-MOBILE-3)', () => {
  it('a plataforma NÃO recebe barra — doze destinos não cabem em quatro slots', () => {
    expect(shellBottomNavItems('/plataforma/tenants', navegar)).toBeNull();
    expect(shellBottomNavItems('/plataforma', navegar)).toBeNull();
  });

  it('e por isso ela mantém o drawer, com a nav inteira dentro', () => {
    // `null` na barra é o que faz o AppShell manter hambúrguer e drawer (o par
    // está pinado em AppShell.test.tsx). O que se prova aqui é que a nav servida
    // ao drawer continua completa.
    const rail = shellRailItems('/plataforma/tenants', navegar);
    expect(rail.map((i) => i.id)).toEqual(PLATFORM_NAV.map((i) => i.id));
  });
});

describe('a casa do quinto item', () => {
  it('o bloco da Visão geral leva a /parcerias', async () => {
    const onNavigate = vi.fn();
    render(<ParceriasNoMobile onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole('button', { name: /Abrir Parcerias/ }));
    expect(onNavigate).toHaveBeenCalledWith('/parcerias');
  });

  it('e ele só existe abaixo de lg — acima disso o rail já o carrega (RN-573)', () => {
    render(<ParceriasNoMobile onNavigate={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Parcerias' })).toHaveClass('lg:hidden');
  });
});

// ---------------------------------------------------------------------------
// O fechamento: catálogo ⊆ alcançável. É esta asserção que impede uma área nova
// de nascer sem porta no mobile.
// ---------------------------------------------------------------------------

describe('nenhuma rota fica inalcançável abaixo de lg', () => {
  it('produtor: os quatro da barra + o bloco de Parcerias + a conta no perfil', () => {
    const pelaBarra = (shellBottomNavItems('/', navegar) ?? [])
      .map((i) => i.href)
      .filter((h): h is string => typeof h === 'string');
    // `/parcerias` pelo bloco da Visão geral (provado no bloco acima);
    // `/conta` pelo popover do perfil no topo direito (provado em
    // RootShell.test.tsx, que renderiza a moldura inteira).
    const alcancavel = new Set([...pelaBarra, '/parcerias', '/conta']);

    const orfas = CATALOGO_PRODUTOR.filter((h) => !alcancavel.has(h));
    expect(orfas).toEqual([]);
  });

  it('plataforma: o drawer continua servindo os doze destinos', () => {
    const pelaNav = new Set(
      shellRailItems('/plataforma/tenants', navegar)
        .map((i) => i.href)
        .filter((h): h is string => typeof h === 'string'),
    );
    const orfas = CATALOGO_PLATAFORMA.filter((h) => !pelaNav.has(h));
    expect(orfas).toEqual([]);
  });
});
