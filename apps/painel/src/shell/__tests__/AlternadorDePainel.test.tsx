// =============================================================================
// AlternadorDePainel — a travessia entre os dois painéis (FRONTEIRA-AUTH · sobre
// a PAPEL-DUPLO).
//
// Os casos são as três regras do componente, e cada uma existe porque a
// alternativa já quebrou algum produto:
//
//   1. só aparece para quem alcança OS DOIS — botão que leva a 403 promete o
//      que o produto nega;
//   2. rotula o DESTINO, não o estado — rótulo de estado em controle clicável
//      é a ambiguidade clássica do toggle;
//   3. não decide permissão — ele navega, e some/aparece sem abrir porta.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import {
  AlternadorDePainel,
  estaNoPainelMaster,
  nomeDoPainelAtual,
  travessia,
} from '../AlternadorDePainel';

/** Espia a URL depois do clique — é o efeito inteiro do componente. */
function Espia(): JSX.Element {
  const location = useLocation();
  return <div data-testid="url">{location.pathname}</div>;
}

function montar(rota: string, podeAlternar: boolean) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <AlternadorDePainel podeAlternar={podeAlternar} />
      <Routes>
        <Route path="*" element={<Espia />} />
      </Routes>
    </MemoryRouter>,
  );
}

const botao = () => screen.getByRole('button');

describe('AlternadorDePainel · quem vê', () => {
  it('conta que alcança os DOIS painéis vê o alternador', () => {
    montar('/', true);
    expect(botao()).toBeInTheDocument();
  });

  it('conta de um painel só NÃO vê nada — botão que leva a 403 é pior que botão nenhum', () => {
    montar('/', false);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('não vira um terceiro lugar que decide permissão: ele só navega', async () => {
    // O componente não consulta claim nenhuma — recebe um booleano e desenha.
    // Quem nega é Rules + guards das Functions, e o PlatformGuard responde 403
    // a quem chegar sem crachá. Este teste trava o contrato: montado com
    // `podeAlternar` mentindo `true`, o clique navega e nada mais acontece.
    const usuario = userEvent.setup();
    montar('/', true);
    await usuario.click(botao());
    expect(screen.getByTestId('url')).toHaveTextContent('/plataforma');
  });
});

describe('AlternadorDePainel · o rótulo é o DESTINO', () => {
  it('no painel do organizador, oferece ir para o master', () => {
    montar('/', true);
    expect(botao()).toHaveTextContent('Ir para o Painel Master');
  });

  it('no painel master, oferece voltar para o do organizador', () => {
    montar('/plataforma', true);
    expect(botao()).toHaveTextContent('Ir para o Painel do Organizador');
  });

  it('sub-rota do master ainda conta como master (prefixo, não igualdade)', () => {
    montar('/plataforma/tenants/castelo-producoes', true);
    expect(botao()).toHaveTextContent('Ir para o Painel do Organizador');
  });

  it('rota que só COMEÇA parecida não é o master', () => {
    // `/plataformas` não é `/plataforma` — o prefixo tem de respeitar a barra.
    expect(estaNoPainelMaster('/plataformas')).toBe(false);
    expect(estaNoPainelMaster('/plataforma')).toBe(true);
    expect(estaNoPainelMaster('/plataforma/taxa')).toBe(true);
  });
});

describe('AlternadorDePainel · a travessia leva para o outro lado', () => {
  it('do organizador para o master, e de volta', async () => {
    const usuario = userEvent.setup();
    const { unmount } = montar('/', true);
    await usuario.click(botao());
    expect(screen.getByTestId('url')).toHaveTextContent('/plataforma');
    unmount();

    montar('/plataforma', true);
    await usuario.click(botao());
    expect(screen.getByTestId('url')).toHaveTextContent('/');
  });

  it('`travessia` é pura e sempre aponta para o lado OPOSTO', () => {
    expect(travessia('/').destino).toBe('/plataforma');
    expect(travessia('/eventos/x/inscritos').destino).toBe('/plataforma');
    expect(travessia('/plataforma').destino).toBe('/');
    expect(travessia('/plataforma/repasses').destino).toBe('/');
  });
});

describe('nomeDoPainelAtual · o rótulo de contexto do shell', () => {
  it('nomeia onde a conta ESTÁ, para o alternador dizer para onde ela VAI', () => {
    expect(nomeDoPainelAtual('/')).toBe('Painel do Organizador');
    expect(nomeDoPainelAtual('/crm/clientes')).toBe('Painel do Organizador');
    expect(nomeDoPainelAtual('/plataforma')).toBe('Painel Master');
    expect(nomeDoPainelAtual('/plataforma/macro')).toBe('Painel Master');
  });
});
