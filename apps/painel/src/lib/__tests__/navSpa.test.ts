// =============================================================================
// navSpa — o contrato do clique (LEELA-NAVFIX-T2).
//
// A regra tem dois lados e os dois têm de ser verdade ao mesmo tempo:
//   · clique simples → `preventDefault()` + `navigate` (SPA, sem recarregar o
//     documento — que era o "parece que entrei num site novo");
//   · clique com modificador ou botão ≠ 0 → passa batido para o `href`, senão
//     abrir em nova aba, nova janela e clique do meio morrem em silêncio.
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import {
  ehCliqueDoNavegador,
  onClickSpa,
  tabsComNavSpa,
  trilhaComNavSpa,
} from '../navSpa';
import { CLIQUES_DO_NAVEGADOR, chamarOnClick, cliqueDuble, comoMouseEvent } from '../../test/clique';

describe('onClickSpa', () => {
  it('clique simples: preventDefault + navigate para o destino', () => {
    const navegar = vi.fn();
    const evento = chamarOnClick(onClickSpa(navegar, '/eventos/x/inscritos'));
    expect(evento.defaultPrevented).toBe(true);
    expect(navegar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith('/eventos/x/inscritos');
  });

  it.each(CLIQUES_DO_NAVEGADOR)(
    '%s: nem preventDefault nem navigate — o href faz o trabalho',
    (_nome, over) => {
      const navegar = vi.fn();
      const evento = chamarOnClick(onClickSpa(navegar, '/eventos'), over);
      expect(evento.defaultPrevented).toBe(false);
      expect(navegar).not.toHaveBeenCalled();
    },
  );

  it('evento já tratado acima não é sequestrado', () => {
    const navegar = vi.fn();
    // `defaultPrevented` já true na entrada: quem chegou primeiro decide.
    chamarOnClick(onClickSpa(navegar, '/eventos'), { defaultPrevented: true });
    expect(navegar).not.toHaveBeenCalled();
  });

  it('clique secundário (botão direito) também passa batido', () => {
    const navegar = vi.fn();
    const evento = chamarOnClick(onClickSpa(navegar, '/eventos'), { button: 2 });
    expect(evento.defaultPrevented).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });
});

describe('ehCliqueDoNavegador', () => {
  it('clique simples de botão esquerdo é NOSSO', () => {
    expect(ehCliqueDoNavegador(comoMouseEvent(cliqueDuble()))).toBe(false);
  });

  it.each(CLIQUES_DO_NAVEGADOR)('%s é do navegador', (_nome, over) => {
    expect(ehCliqueDoNavegador(comoMouseEvent(cliqueDuble(over)))).toBe(true);
  });
});

describe('tabsComNavSpa', () => {
  it('preserva o href e tudo o mais da aba — só acrescenta o onClick', () => {
    const navegar = vi.fn();
    const [aba] = tabsComNavSpa(
      [{ id: 'inscritos', label: 'Inscritos', href: '/eventos/x/inscritos', count: 42, active: true }],
      navegar,
    );
    expect(aba).toMatchObject({
      id: 'inscritos',
      label: 'Inscritos',
      href: '/eventos/x/inscritos',
      count: 42,
      active: true,
    });
    chamarOnClick(aba?.onClick);
    expect(navegar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith('/eventos/x/inscritos');
  });

  it('aba sem href passa intocada — já navegava por onClick (padrão IA-MENU)', () => {
    const onClick = vi.fn();
    const original = { id: 'crm', label: 'CRM', onClick };
    const [aba] = tabsComNavSpa([original], vi.fn());
    expect(aba).toBe(original);
    expect(aba?.onClick).toBe(onClick);
  });

  it('cada aba navega para o PRÓPRIO destino (sem closure compartilhada)', () => {
    const navegar = vi.fn();
    const abas = tabsComNavSpa(
      [
        { id: 'a', label: 'A', href: '/a' },
        { id: 'b', label: 'B', href: '/b' },
      ],
      navegar,
    );
    chamarOnClick(abas[1]?.onClick);
    expect(navegar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith('/b');
  });
});

describe('trilhaComNavSpa', () => {
  it('fia os itens com href e deixa a página atual (sem href) intocada', () => {
    const navegar = vi.fn();
    const atual = { label: 'Meia Floripa' };
    const trilha = trilhaComNavSpa([{ label: 'Eventos', href: '/eventos' }, atual], navegar);

    expect(trilha[0]?.href).toBe('/eventos');
    const evento = chamarOnClick(trilha[0]?.onClick);
    expect(evento.defaultPrevented).toBe(true);
    expect(navegar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith('/eventos');

    expect(trilha[1]).toBe(atual);
    expect(trilha[1]?.onClick).toBeUndefined();
  });
});
