// =============================================================================
// PROVA da X1 (D-0802-1 §3) — a página do evento deixa de afirmar corrida.
//
// "Experiência" é o termo guarda-chuva; corrida/prova/atleta são instâncias,
// nunca a categoria. Estes componentes são servidos em TODO evento, então o que
// eles afirmam vale para um retiro de respiração igual vale para uma meia
// maratona — ou não pode ser afirmado.
//
// As asserções são NEGATIVAS de propósito (mesmo padrão da C1-LEGAL): elas
// reprovam a VOLTA do vocabulário, que é o defeito que reaparece sozinho na
// próxima edição de copy.
// =============================================================================

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GaleriaSection } from '../app/(public)/[eventSlug]/sections/GaleriaSection';
import { ModalidadesSection } from '../app/(public)/[eventSlug]/sections/ModalidadesSection';
import { RegulamentoModal } from '../app/(public)/[eventSlug]/sections/RegulamentoModal';
import { RegulamentoSection } from '../app/(public)/[eventSlug]/sections/RegulamentoSection';
import type { EventoPublico } from '@/lib/tipos';

const evento = {
  slug: 'retiro-respiracao-2026',
  nome: 'Retiro de Respiração',
  regulamento: 'Texto do regulamento.',
  regulamentoVersao: 2,
} as unknown as EventoPublico;

afterEach(cleanup);

describe('X1 · o regulamento é da EXPERIÊNCIA, não da prova (D-0802-1)', () => {
  it('o modal aberto tem título de experiência, e não "da prova"', async () => {
    render(<RegulamentoModal regulamento="Texto." versao={2} />);
    fireEvent.click(screen.getByRole('button', { name: /ler regulamento completo/i }));
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo.textContent).toMatch(/Regulamento da experiência/i);
    expect(dialogo.textContent).not.toMatch(/da prova/i);
  });

  it('a seção não chama o evento de prova, nem promete categorias e premiação', () => {
    const { container } = render(<RegulamentoSection evento={evento} />);
    const texto = container.textContent ?? '';
    expect(texto).toMatch(/regulamento oficial desta experiência/i);
    expect(texto).not.toMatch(/prova/i);
    expect(texto).not.toMatch(/categorias/i);
    expect(texto).not.toMatch(/premiação/i);
  });

  it('o título do modal não volta a ser "da prova"', () => {
    const { container } = render(<RegulamentoModal regulamento="Texto." />);
    // O Dialog só monta o título quando aberto; o gatilho e o markup do
    // componente não podem carregar a palavra em lugar nenhum.
    expect(container.innerHTML).not.toMatch(/da prova/i);
  });
});

describe('X1 · a galeria de exemplo não anuncia corredores (a11y antes do vocabulário)', () => {
  it('as três imagens são decorativas — o leitor de tela não descreve corrida', () => {
    const { container } = render(<GaleriaSection />);
    const imgs = [...container.querySelectorAll('img')];
    expect(imgs).toHaveLength(3);
    for (const img of imgs) {
      // `alt=""` é o contrato de imagem decorativa. Ausência de `alt` NÃO
      // serve: o leitor lê o nome do arquivo.
      expect(img.getAttribute('alt')).toBe('');
    }
  });

  it('nenhum texto da galeria afirma corredor, largada ou prova', () => {
    const { container } = render(<GaleriaSection />);
    const texto = `${container.textContent ?? ''} ${
      [...container.querySelectorAll('img')].map((i) => i.getAttribute('alt') ?? '').join(' ')
    }`;
    for (const proibido of [/corredor/i, /corrida/i, /largada/i, /prova/i, /atleta/i]) {
      expect(texto).not.toMatch(proibido);
    }
  });

  it('os rótulos continuam existindo, em momentos que valem para qualquer experiência', () => {
    const { container } = render(<GaleriaSection />);
    const rotulos = [...container.querySelectorAll('figcaption')].map((f) => f.textContent);
    expect(rotulos).toEqual(['Antes', 'Durante', 'Depois']);
    // A honestidade da seção não pode sumir junto com os rótulos antigos.
    expect(screen.getByText(/imagens de exemplo/i)).toBeTruthy();
  });
});

// =============================================================================
// S1218-T3 · B8 — a seção de modalidades para de dar a ordem "escolha seu
// percurso" e passa a DESCREVER o que está ali.
//
// A X1 varreu a página do evento e deixou este título vivo: o veredito foi
// MEDIDO no bundle servido em produção (2 ocorrências de "Escolha seu
// percurso"), e é por isso que a D3 virou edição e não verificação.
//
// A asserção negativa é a que importa: ela reprova a VOLTA do vocabulário na
// próxima edição de copy.
// =============================================================================
describe('S1218-T3 · a seção de modalidades não nomeia o produto pela corrida', () => {
  const eventoComModalidades = {
    ...evento,
    modalidadeEsporte: 'Respiração consciente',
    modalidades: [
      { nome: 'Imersão 3h', precoVigente: 12000 },
      { nome: 'Imersão 6h', precoVigente: 19000 },
    ],
  } as unknown as EventoPublico;

  it('o título é "Modalidades disponíveis", e "percurso" não sobrevive nele', () => {
    render(<ModalidadesSection evento={eventoComModalidades} />);
    expect(screen.getByText('Modalidades disponíveis')).toBeTruthy();
    expect(screen.queryByText(/escolha seu percurso/i)).toBeNull();
  });

  it('o apoio conta quantas MODALIDADES existem, não quantas distâncias', () => {
    render(<ModalidadesSection evento={eventoComModalidades} />);
    expect(screen.getByText(/2 modalidades/i)).toBeTruthy();
    expect(screen.queryByText(/dist[âa]ncias/i)).toBeNull();
  });
});
