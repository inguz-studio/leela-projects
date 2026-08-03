// =============================================================================
// PROVA do checkout corte→tamanho (lote TAMANHOS-GRADE · RN-231 · T3).
// RTL da superfície presentacional StepModalidadeKit com itens tamanhados:
//   - ordem RATIFICADA: corte PRIMEIRO, tamanho depois (só os do corte);
//   - item de grade única (unissex) pula direto para o tamanho;
//   - o valor emitido é o SUFIXO de SKU ('M' | 'feminina__M') por inscrito;
//   - trocar de corte REMOVE a escolha anterior (nunca vaza tamanho de outro
//     corte no payload);
//   - kit sem item de grade mantém a nota antiga ("confirmado na retirada").
// =============================================================================

import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StepModalidadeKit } from '../app/(public)/[eventSlug]/inscricao/checkout/StepModalidadeKit';
import {
  inscritoVazio,
  type InscritoForm,
} from '../app/(public)/[eventSlug]/inscricao/checkout/tipos';
import type { ItemTamanhadoPublico, KitPublico } from '../lib/tipos';

afterEach(cleanup);

const noop = (): void => {};

const KIT_PRATA: KitPublico = {
  id: 'kit_prata',
  nome: 'Kit Prata',
  preco: 30,
  modalidades: ['10k'],
  capacidade: 100,
  descricao: null,
  itens: [],
  imagemUrl: null,
  fotosSecundarias: [],
};

const CAMISETA_GRADE: ItemTamanhadoPublico = {
  id: 'camiseta-corte',
  nome: 'Camiseta técnica',
  kits: ['kit_prata'],
  grade: [
    { corte: 'feminina', tamanhos: ['P', 'M'] },
    { corte: 'masculina', tamanhos: ['M', 'G'] },
  ],
};

const REGATA_UNISSEX: ItemTamanhadoPublico = {
  id: 'regata-unissex',
  nome: 'Regata',
  kits: ['kit_prata'],
  grade: [{ corte: 'unissex', tamanhos: ['P', 'M', 'G'] }],
};

/** Wrapper stateful — o Step é controlado; aqui o estado vive como no Flow. */
function Harness({
  itens,
  onPayload,
}: {
  itens: ItemTamanhadoPublico[];
  onPayload?: (tamanhos: Record<string, string>) => void;
}): React.JSX.Element {
  const [inscritos, setInscritos] = React.useState<InscritoForm[]>([
    { ...inscritoVazio(), modalidade: '10k', kitId: 'kit_prata' },
  ]);
  return (
    <StepModalidadeKit
      modalidades={[{ nome: '10k', precoVigente: 12000 }]}
      kits={[KIT_PRATA]}
      itensTamanhados={itens}
      inscritos={inscritos}
      euCorro
      onInscrito={(index, patch) => {
        setInscritos((prev) => {
          const prox = prev.map((ins, i) => (i === index ? { ...ins, ...patch } : ins));
          onPayload?.(prox[index]!.tamanhos);
          return prox;
        });
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

describe('StepModalidadeKit — grade por corte (RN-231 · ordem corte→tamanho)', () => {
  it('mostra os cortes PRIMEIRO; tamanhos só aparecem após escolher o corte', () => {
    render(<Harness itens={[CAMISETA_GRADE]} />);
    expect(screen.getByText('Camiseta técnica — corte')).toBeTruthy();
    expect(screen.getByText('Feminina')).toBeTruthy();
    expect(screen.getByText('Masculina')).toBeTruthy();
    // nenhum grupo de tamanho antes do corte
    expect(screen.queryByText('Tamanho')).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: /Feminina/ }));
    expect(screen.getByText('Tamanho')).toBeTruthy();
    // só os tamanhos DO corte feminina (P, M) — G é da masculina
    expect(screen.getByRole('radio', { name: /^P$/ })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: /^G$/ })).toBeNull();
  });

  it('emite o SUFIXO corte__tamanho ao completar a escolha', () => {
    const onPayload = vi.fn();
    render(<Harness itens={[CAMISETA_GRADE]} onPayload={onPayload} />);
    fireEvent.click(screen.getByRole('radio', { name: /Feminina/ }));
    fireEvent.click(screen.getByRole('radio', { name: /^M$/ }));
    expect(onPayload).toHaveBeenLastCalledWith({ 'camiseta-corte': 'feminina__M' });
  });

  it('trocar de corte REMOVE a escolha anterior (payload sem tamanho de outro corte)', () => {
    const onPayload = vi.fn();
    render(<Harness itens={[CAMISETA_GRADE]} onPayload={onPayload} />);
    fireEvent.click(screen.getByRole('radio', { name: /Feminina/ }));
    fireEvent.click(screen.getByRole('radio', { name: /^M$/ }));
    expect(onPayload).toHaveBeenLastCalledWith({ 'camiseta-corte': 'feminina__M' });
    fireEvent.click(screen.getByRole('radio', { name: /Masculina/ }));
    expect(onPayload).toHaveBeenLastCalledWith({});
  });

  it('item de grade única (unissex) pula direto para o tamanho e emite sufixo bare', () => {
    const onPayload = vi.fn();
    render(<Harness itens={[REGATA_UNISSEX]} onPayload={onPayload} />);
    // sem etapa de corte
    expect(screen.queryByText(/— corte/)).toBeNull();
    expect(screen.getByText('Regata — tamanho')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /^M$/ }));
    expect(onPayload).toHaveBeenLastCalledWith({ 'regata-unissex': 'M' });
  });

  it('kit SEM item de grade mantém a nota "confirmado na retirada" (fluxo antigo)', () => {
    render(<Harness itens={[]} />);
    expect(screen.getByText(/confirmado na retirada/)).toBeTruthy();
    expect(screen.queryByText(/— corte/)).toBeNull();
  });
});
