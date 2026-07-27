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

  // ---------------------------------------------------------------------------
  // A-7 (LEELA-DEBT-T5) — clicar na aba ATIVA não pode empilhar histórico.
  // Cada clique repetido na aba onde a pessoa já estava virava uma entrada
  // idêntica no histórico, e o Voltar do navegador passava a repetir a mesma
  // tela tantas vezes quantas ela tivesse clicado antes de sair dali.
  // ---------------------------------------------------------------------------
  it('destino IGUAL à rota atual: navega com replace (não empilha)', () => {
    const navegar = vi.fn();
    const evento = chamarOnClick(onClickSpa(navegar, '/crm/clientes', '/crm/clientes'));
    // Continua sendo clique nosso: o documento não recarrega.
    expect(evento.defaultPrevented).toBe(true);
    expect(navegar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith('/crm/clientes', { replace: true });
  });

  it('destino DIFERENTE da rota atual: empilha normalmente', () => {
    const navegar = vi.fn();
    chamarOnClick(onClickSpa(navegar, '/crm/clientes', '/crm'));
    expect(navegar).toHaveBeenCalledWith('/crm/clientes');
  });

  it('comparação é de pathname EXATO — prefixo não conta como "já estou aqui"', () => {
    const navegar = vi.fn();
    // Está no detalhe do cliente e clica na aba da lista: é navegação de
    // verdade, muda a URL, e merece uma entrada no histórico.
    chamarOnClick(onClickSpa(navegar, '/crm/clientes', '/crm/clientes/tipo_abc123'));
    expect(navegar).toHaveBeenCalledWith('/crm/clientes');
  });

  it('sem rota atual informada, o comportamento é o de antes (empilha)', () => {
    const navegar = vi.fn();
    chamarOnClick(onClickSpa(navegar, '/crm/clientes'));
    expect(navegar).toHaveBeenCalledWith('/crm/clientes');
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

  // LEELA-NAVFIX-REV — a fiação por spread engolia em silêncio um onClick que a
  // aba já trouxesse. A Directive da lane manda toda superfície nova nascer
  // por aqui: o descarte apareceria em produção, não no gate.
  it('aba com href E onClick próprio: o handler original NÃO é descartado', () => {
    const navegar = vi.fn();
    const proprio = vi.fn();
    const [aba] = tabsComNavSpa(
      [{ id: 'inscritos', label: 'Inscritos', href: '/eventos/x/inscritos', onClick: proprio }],
      navegar,
    );
    const evento = chamarOnClick(aba?.onClick);
    expect(proprio).toHaveBeenCalledTimes(1);
    expect(evento.defaultPrevented).toBe(true);
    expect(navegar).toHaveBeenCalledWith('/eventos/x/inscritos');
  });

  it('handler original que cancela o default manda — a SPA desiste', () => {
    const navegar = vi.fn();
    const [aba] = tabsComNavSpa(
      [
        {
          id: 'inscritos',
          label: 'Inscritos',
          href: '/eventos/x/inscritos',
          onClick: (event) => event.preventDefault(),
        },
      ],
      navegar,
    );
    chamarOnClick(aba?.onClick);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('A-7: a aba da rota atual navega com replace; as outras empilham', () => {
    const navegar = vi.fn();
    const abas = tabsComNavSpa(
      [
        { id: 'a', label: 'A', href: '/crm', active: true },
        { id: 'b', label: 'B', href: '/crm/clientes' },
      ],
      navegar,
      '/crm',
    );
    chamarOnClick(abas[0]?.onClick);
    expect(navegar).toHaveBeenLastCalledWith('/crm', { replace: true });
    chamarOnClick(abas[1]?.onClick);
    expect(navegar).toHaveBeenLastCalledWith('/crm/clientes');
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

  it('item com href E onClick próprio: o handler original NÃO é descartado', () => {
    const navegar = vi.fn();
    const proprio = vi.fn();
    const [item] = trilhaComNavSpa([{ label: 'Eventos', href: '/eventos', onClick: proprio }], navegar);
    chamarOnClick(item?.onClick);
    expect(proprio).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith('/eventos');
  });
});
