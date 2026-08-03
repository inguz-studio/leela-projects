// =============================================================================
// PROVA da galeria no DETALHE do kit (S212-T3 · RN-425/426).
//
// A regra que a RN-426 desenha tem dois lados, e os dois estão aqui:
//   - a galeria mora SÓ no detalhe: a fita de miniaturas nasce a partir da
//     segunda foto, e kit de uma foto continua sendo a tela que sempre foi;
//   - clicar numa miniatura troca a foto EM DESTAQUE, e o lightbox que já
//     existe amplia a que está em foco — não outra.
//
// O `Thumb` do DS é o primitivo das miniaturas: nenhum componente novo de DS
// entra por esta feature (a governança do DS reprova cópia por tela).
// =============================================================================

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { KitDetalhe } from '../app/(public)/[eventSlug]/inscricao/checkout/KitDetalhe';
import { galeriaDoKit } from '../lib/kitImagem';
import type { KitPublico } from '../lib/tipos';

afterEach(cleanup);

const P = 'https://cdn.leela.test/kits/ouro.jpg';
const S2 = 'https://cdn.leela.test/kits/ouro-2.jpg';
const S3 = 'https://cdn.leela.test/kits/ouro-3.jpg';

function mkKit(over: Partial<KitPublico> = {}): KitPublico {
  return {
    id: 'kit_ouro',
    nome: 'Kit Ouro',
    preco: 120,
    modalidades: ['21k'],
    capacidade: 100,
    descricao: 'Kit completo',
    itens: ['Camiseta', 'Medalha'],
    imagemUrl: P,
    fotosSecundarias: [],
    ...over,
  };
}

describe('galeriaDoKit — a principal resolvida + as adicionais reais', () => {
  const kit = { nome: 'Kit Ouro', modalidades: ['21k'] };

  it('kit de uma foto devolve UMA entrada', () => {
    expect(galeriaDoKit({ ...kit, imagemUrl: P }, false)).toHaveLength(1);
  });

  it('as adicionais entram depois da principal, na ordem do organizador', () => {
    const fotos = galeriaDoKit({ ...kit, imagemUrl: P, fotosSecundarias: [S3, S2] }, false);
    expect(fotos.map((f) => f.src)).toEqual([P, S3, S2]);
  });

  it('adicional é sempre real e ampliável — ela só existe se o organizador subiu', () => {
    const fotos = galeriaDoKit({ ...kit, imagemUrl: P, fotosSecundarias: [S2] }, false);
    expect(fotos[1]).toEqual({ src: S2, origem: 'real', ampliavel: true });
  });

  it('sem imagem real em PRODUÇÃO a posição 0 é o placeholder, e ele não é ampliável', () => {
    const fotos = galeriaDoKit({ ...kit, fotosSecundarias: [S2] }, false);
    expect(fotos[0]!.origem).toBe('placeholder');
    expect(fotos[0]!.ampliavel).toBe(false);
  });

  it('nunca repete a principal na fita', () => {
    const fotos = galeriaDoKit({ ...kit, imagemUrl: P, fotosSecundarias: [P, S2] }, false);
    expect(fotos.map((f) => f.src)).toEqual([P, S2]);
  });
});

describe('KitDetalhe — a fita de miniaturas (RN-426)', () => {
  it('kit de UMA foto não ganha fita — a tela é a mesma de antes desta RN', () => {
    render(<KitDetalhe kit={mkKit()} />);
    expect(screen.queryByRole('list', { name: /fotos do kit ouro/i })).toBeNull();
    expect(screen.getAllByAltText('Kit Ouro').length).toBeGreaterThan(0);
  });

  it('kit com três fotos desenha três miniaturas', () => {
    render(<KitDetalhe kit={mkKit({ fotosSecundarias: [S2, S3] })} />);
    const fita = screen.getByRole('list', { name: /fotos do kit ouro/i });
    expect(fita.querySelectorAll('li')).toHaveLength(3);
  });

  it('a foto em destaque nasce sendo a principal, e o alt diz qual é', () => {
    render(<KitDetalhe kit={mkKit({ fotosSecundarias: [S2] })} />);
    const destaque = screen.getByAltText('Kit Ouro — foto 1 de 2');
    expect(destaque.getAttribute('src')).toBe(P);
  });

  it('clicar na miniatura TROCA a foto em destaque', () => {
    render(<KitDetalhe kit={mkKit({ fotosSecundarias: [S2, S3] })} />);
    fireEvent.click(screen.getByRole('button', { name: /ver foto 3 de 3 do kit ouro/i }));
    const destaque = screen.getByAltText('Kit Ouro — foto 3 de 3');
    expect(destaque.getAttribute('src')).toBe(S3);
  });

  it('a miniatura em foco se anuncia com aria-current, e só ela', () => {
    render(<KitDetalhe kit={mkKit({ fotosSecundarias: [S2, S3] })} />);
    fireEvent.click(screen.getByRole('button', { name: /ver foto 2 de 3 do kit ouro/i }));
    const marcados = screen
      .getAllByRole('button', { name: /ver foto \d de 3 do kit ouro/i })
      .filter((b) => b.getAttribute('aria-current') === 'true');
    expect(marcados).toHaveLength(1);
    expect(marcados[0]!.getAttribute('aria-label')).toMatch(/ver foto 2 de 3/i);
  });

  it('o lightbox amplia a foto EM FOCO, não a principal', () => {
    render(<KitDetalhe kit={mkKit({ fotosSecundarias: [S2, S3] })} />);
    fireEvent.click(screen.getByRole('button', { name: /ver foto 2 de 3 do kit ouro/i }));
    fireEvent.click(screen.getByRole('button', { name: /ampliar imagem do kit ouro/i }));
    const dialog = screen.getByRole('dialog');
    const ampliada = dialog.querySelector('img');
    expect(ampliada?.getAttribute('src')).toBe(S2);
  });

  it('a descrição e os itens seguem intocados pela galeria', () => {
    render(<KitDetalhe kit={mkKit({ fotosSecundarias: [S2] })} />);
    expect(screen.getByText('Kit completo')).toBeTruthy();
    expect(screen.getByText('Camiseta')).toBeTruthy();
    expect(screen.getByText('O que está incluso')).toBeTruthy();
  });
});
