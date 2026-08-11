// =============================================================================
// PROVA do passo de arquitetura nº 2 do checkout (Onda 1 · roadmap de
// componentes · `04-ondas-roadmap.md`).
//
// A medição de carga contou 16 passos até pagar, três deles postos ali pela
// arquitetura e não pelo job. Um: os `RadioGroup` de modalidade e de kit não
// tinham ramo de auto-seleção, então um evento com UMA modalidade e UM kit
// cobrava dois cliques que não decidem nada.
//
// Estes casos REPROVAM a versão anterior: sem o efeito de auto-seleção,
// `modalidade` e `kitId` nascem vazios e a etapa nem chega a mostrar a lista
// de kits (ela só aparece depois que a modalidade é escolhida).
//
// A lista de casos também trava as duas fronteiras que a auto-seleção NÃO
// pode cruzar, e que são o que separa "poupar um passo" de "escolher pela
// pessoa":
//   - opção única INDISPONÍVEL (sem lote vigente) não é selecionada — o
//     RadioCard dela entra desabilitado e o servidor recusaria o valor;
//   - lista com mais de um item nunca é decidida sozinha, nem quando só uma
//     das opções está disponível: duas modalidades esgotadas ao lado da que
//     sobrou são paisagem que a pessoa precisa ver.
// =============================================================================

import * as React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StepModalidadeKit } from '../app/(public)/[eventSlug]/inscricao/checkout/StepModalidadeKit';
import {
  inscritoVazio,
  type InscritoForm,
} from '../app/(public)/[eventSlug]/inscricao/checkout/tipos';
import type { KitPublico } from '../lib/tipos';

afterEach(cleanup);

const noop = (): void => {};

function kit(id: string, nome: string, modalidades: string[]): KitPublico {
  return {
    id,
    nome,
    preco: 0,
    modalidades,
    capacidade: 100,
    descricao: null,
    itens: [],
    imagemUrl: null,
    fotosSecundarias: [],
  };
}

/**
 * Wrapper stateful — o Step é controlado e o estado vive no Flow. Guarda o
 * número de patches para provar que o efeito ESTABILIZA: auto-seleção que
 * re-dispara a cada render é laço, não conveniência.
 */
function Harness({
  modalidades,
  kits,
  patches,
}: {
  modalidades: { nome: string; precoVigente: number | null }[];
  kits: KitPublico[];
  patches: Partial<InscritoForm>[];
}): React.JSX.Element {
  const [inscritos, setInscritos] = React.useState<InscritoForm[]>([inscritoVazio()]);
  return (
    <StepModalidadeKit
      modalidades={modalidades}
      kits={kits}
      itensTamanhados={[]}
      inscritos={inscritos}
      euCorro
      onInscrito={(index, patch) => {
        patches.push(patch);
        setInscritos((prev) => prev.map((ins, i) => (i === index ? { ...ins, ...patch } : ins)));
      }}
      onAddInscrito={noop}
      onRemoveInscrito={noop}
      errosModalidade={[]}
      errosKit={[]}
      errosTamanhos={[]}
      taxaRepassada={false}
    />
  );
}

describe('StepModalidadeKit — opção única não cobra clique (Onda 1 · passo nº 2)', () => {
  it('modalidade única e kit único ficam escolhidos sem nenhum gesto', () => {
    const patches: Partial<InscritoForm>[] = [];
    render(
      <Harness
        modalidades={[{ nome: '10k', precoVigente: 12000 }]}
        kits={[kit('kit_unico', 'Kit Padrão', ['10k'])]}
        patches={patches}
      />,
    );

    // A prova é de ESTADO, não de pixel: os dois rádios chegam marcados.
    const modalidade = screen.getByRole('radio', { name: /10k/ }) as HTMLInputElement;
    expect(modalidade.checked).toBe(true);
    const kitEscolhido = screen.getByRole('radio', { name: /Kit Padrão/ }) as HTMLInputElement;
    expect(kitEscolhido.checked).toBe(true);

    // O controle CONTINUA na tela e continua alterável — a onda tira o clique
    // obrigatório, não a informação nem o controle.
    expect(modalidade.disabled).toBe(false);
    expect(kitEscolhido.disabled).toBe(false);

    // Dois patches e para: um para a modalidade, um para o kit. Se o efeito
    // não estabilizasse, este número cresceria a cada render.
    expect(patches).toHaveLength(2);
    expect(patches[0]).toMatchObject({ modalidade: '10k' });
    expect(patches[1]).toMatchObject({ kitId: 'kit_unico' });
  });

  it('modalidade única SEM lote vigente não é escolhida sozinha', () => {
    const patches: Partial<InscritoForm>[] = [];
    render(
      <Harness
        modalidades={[{ nome: '21k', precoVigente: null }]}
        kits={[kit('kit_unico', 'Kit Padrão', ['21k'])]}
        patches={patches}
      />,
    );

    expect((screen.getByRole('radio', { name: /21k/ }) as HTMLInputElement).checked).toBe(false);
    expect(patches).toHaveLength(0);
    // Sem modalidade escolhida a lista de kits nem existe (RN-210).
    expect(screen.getByText('Escolha a modalidade para ver os kits disponíveis.')).toBeTruthy();
  });

  it('duas modalidades não viram uma escolha automática, mesmo com só uma disponível', () => {
    const patches: Partial<InscritoForm>[] = [];
    render(
      <Harness
        modalidades={[
          { nome: '5k', precoVigente: null },
          { nome: '10k', precoVigente: 12000 },
        ]}
        kits={[kit('kit_unico', 'Kit Padrão', ['5k', '10k'])]}
        patches={patches}
      />,
    );

    expect((screen.getByRole('radio', { name: /10k/ }) as HTMLInputElement).checked).toBe(false);
    expect(patches).toHaveLength(0);
  });

  it('kit é auto-selecionado só quando a modalidade escolhida oferta um único kit', () => {
    const patches: Partial<InscritoForm>[] = [];
    render(
      <Harness
        modalidades={[{ nome: '10k', precoVigente: 12000 }]}
        kits={[kit('kit_a', 'Kit Prata', ['10k']), kit('kit_b', 'Kit Ouro', ['10k'])]}
        patches={patches}
      />,
    );

    // A modalidade única entra sozinha; os dois kits seguem em aberto.
    expect((screen.getByRole('radio', { name: /10k/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: /Kit Prata/ }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('radio', { name: /Kit Ouro/ }) as HTMLInputElement).checked).toBe(false);
    expect(patches).toHaveLength(1);
  });

  it('kit de OUTRA modalidade não conta para a auto-seleção', () => {
    const patches: Partial<InscritoForm>[] = [];
    render(
      <Harness
        modalidades={[{ nome: '10k', precoVigente: 12000 }]}
        // Dois kits no evento, mas só um ofertado para a modalidade única.
        kits={[kit('kit_a', 'Kit Prata', ['10k']), kit('kit_b', 'Kit Ouro', ['21k'])]}
        patches={patches}
      />,
    );

    expect((screen.getByRole('radio', { name: /Kit Prata/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByRole('radio', { name: /Kit Ouro/ })).toBeNull();
    expect(patches).toHaveLength(2);
  });
});
