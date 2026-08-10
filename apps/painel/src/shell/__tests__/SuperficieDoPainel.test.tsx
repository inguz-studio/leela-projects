// =============================================================================
// A fiação do vidro no <html> (REDESIGN-DS · lane TELA).
//
// O contrato desta lane nomeia dois modos de falha e eles viram teste:
//
//   · FLASH NA TRANSIÇÃO — o atributo tem que trocar no MESMO commit em que a
//     rota nova entra. O teste navega de verdade (link do router) e cobra o
//     valor logo depois, sem `waitFor`: se a escrita fosse um `useEffect`
//     pós-paint com atraso, a asserção síncrona pegaria o valor velho.
//   · VAZAMENTO DE ESTADO — desmontar o painel não pode deixar o atributo
//     grudado no documento, senão o próximo caso (ou a próxima montagem)
//     herda o vidro de quem já saiu.
//
// A prova é o DOM renderizado, não a intenção: lemos `document.documentElement`,
// que é exatamente onde o design system procura `[data-glass="on"]`.
// =============================================================================

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { SuperficieDoPainel } from '../SuperficieDoPainel';
import { ATRIBUTO_VIDRO } from '../superficie';

const vidroNoDocumento = (): string | null =>
  document.documentElement.getAttribute(ATRIBUTO_VIDRO);

/** Casca mínima: o efeito + dois destinos navegáveis por link de verdade. */
function montar(rotaInicial: string) {
  return render(
    <MemoryRouter initialEntries={[rotaInicial]}>
      <SuperficieDoPainel />
      <Link to="/plataforma/tenants">ir para a plataforma</Link>
      <Link to="/">voltar ao organizador</Link>
      <Routes>
        <Route path="/plataforma/*" element={<p>administração</p>} />
        <Route path="*" element={<p>organizador</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  document.documentElement.removeAttribute(ATRIBUTO_VIDRO);
});

describe('SuperficieDoPainel · o vidro segue a área', () => {
  it('monta o painel do organizador já com o vidro ligado', () => {
    montar('/');
    expect(vidroNoDocumento()).toBe('on');
  });

  it('monta a administração da plataforma já com o vidro desligado', () => {
    montar('/plataforma/tenants');
    expect(vidroNoDocumento()).toBe('off');
  });

  it('desliga o vidro ao atravessar para a plataforma, no mesmo passo da rota', async () => {
    const usuario = userEvent.setup();
    montar('/');
    expect(vidroNoDocumento()).toBe('on');

    await usuario.click(screen.getByRole('link', { name: 'ir para a plataforma' }));

    // Sem waitFor de propósito: a tela nova já está no DOM, então o atributo
    // também tem que estar — é isso que impede o quadro de flash.
    expect(screen.getByText('administração')).toBeInTheDocument();
    expect(vidroNoDocumento()).toBe('off');
  });

  it('religa o vidro na volta para o painel do organizador', async () => {
    const usuario = userEvent.setup();
    montar('/plataforma/tenants');
    expect(vidroNoDocumento()).toBe('off');

    await usuario.click(screen.getByRole('link', { name: 'voltar ao organizador' }));

    expect(screen.getByText('organizador')).toBeInTheDocument();
    expect(vidroNoDocumento()).toBe('on');
  });

  it('não deixa estado pendurado no documento ao desmontar', () => {
    const { unmount } = montar('/');
    expect(vidroNoDocumento()).toBe('on');

    unmount();

    expect(vidroNoDocumento()).toBeNull();
  });
});
