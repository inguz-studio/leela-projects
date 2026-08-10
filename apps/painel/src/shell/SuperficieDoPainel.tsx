// =============================================================================
// SuperficieDoPainel — liga (e desliga) a camada de vidro conforme a área.
//
// Renderiza NADA. É o único ponto do painel que escreve `data-glass` no <html>,
// pelo mesmo padrão que o `ThemeProvider` do design system já usa para
// `data-theme`: um atributo na raiz do documento, aplicado em layout effect.
//
// POR QUE LAYOUT EFFECT, E NÃO EFFECT COMUM. O risco declarado no contrato
// desta lane é "flash na transição": a rota nova pintar por um quadro com o
// vidro da rota velha. `useLayoutEffect` roda DEPOIS do commit e ANTES do
// paint, no mesmo quadro em que o React entrega a árvore nova — atributo e
// conteúdo trocam juntos. Com `useEffect` (que roda depois do paint) o
// organizador chegaria em `/plataforma` e veria, por um quadro, os cards de
// vidro sobre o fundo preto. Na primeira montagem vale o mesmo: o `#root` do
// `index.html` está vazio, então o primeiro paint com conteúdo é o do React, e
// o atributo já está lá.
//
// POR QUE LIMPAR NA DESMONTAGEM. Vazamento de estado é o outro risco do
// contrato. Em produção este componente vive enquanto o app viver, então a
// limpeza é inerte; num teste (e num futuro hot-reload) ela impede que o
// atributo de um caso sobreviva ao próximo — o <html> do jsdom é compartilhado.
//
// NÃO É PREFERÊNCIA DO USUÁRIO. O tema continua sendo escolha da pessoa
// (persistida pelo ThemeProvider, chave `leela-theme-preference`, intocada
// aqui). O vidro NÃO é escolha: é a marca de qual painel está aberto, e por
// isso é derivado da rota a cada navegação, sem storage e sem knob.
// =============================================================================

import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ATRIBUTO_VIDRO, vidroDaRota } from './superficie';

export function SuperficieDoPainel(): null {
  const { pathname } = useLocation();
  const vidro = vidroDaRota(pathname);

  useLayoutEffect(() => {
    const raiz = document.documentElement;
    raiz.setAttribute(ATRIBUTO_VIDRO, vidro);
    return () => {
      raiz.removeAttribute(ATRIBUTO_VIDRO);
    };
  }, [vidro]);

  return null;
}

SuperficieDoPainel.displayName = 'SuperficieDoPainel';
