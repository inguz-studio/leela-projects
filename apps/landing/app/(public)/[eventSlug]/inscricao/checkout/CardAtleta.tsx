'use client';

import { UserPlus } from 'lucide-react';
import { Button } from '@/app/_ds/ds';

// =============================================================================
// CardAtleta / BotaoAdicionarAtleta — a unidade visual do pedido (S1209-T4 · D-2).
//
// A decisão D-2 do Vitor supersede a tela 2 do wireframe 112-4622: o pedido é
// uma PILHA DE CARDS, um por atleta, com um botão explícito de adicionar mais.
// O checkout já tinha cards no step 0 e outro molde no step 1 — duas moldura
// diferentes para a mesma coisa. Aqui vira uma peça só, usada nos dois steps,
// para que "um card por atleta" signifique o mesmo card o tempo todo.
//
// Onde cada ação vive (e por quê):
//   - ADICIONAR só no step 0. É lá que se escolhe modalidade e kit; um atleta
//     criado no step 1 nasceria sem modalidade e travaria o total no resumo —
//     um botão que produz beco sem saída não é conveniência, é armadilha.
//   - REMOVER nos dois steps: tirar alguém do pedido é sempre seguro.
//   - O 1º atleta, quando é o próprio comprador ("eu também vou correr"), não
//     tem remover: quem remove o comprador do pedido é o checkbox, não o card.
// =============================================================================

export function CardAtleta({
  titulo,
  podeRemover,
  onRemover,
  children,
  id,
}: {
  /** Rótulo humano do card ("Você", "Atleta 2") — também nomeia o remover. */
  titulo: string;
  podeRemover: boolean;
  onRemover: () => void;
  children: React.ReactNode;
  /**
   * Âncora do card (D-0729-3). O "Alterar" do resumo precisa levar a pessoa
   * ao card DAQUELE atleta; sem um alvo estável a única opção seria rolar ao
   * topo do formulário, que é perto demais de recomeçar.
   */
  id?: string;
}): React.JSX.Element {
  return (
    <div
      id={id}
      className="scroll-mt-[var(--spacing-6)] rounded-ds-lg border border-border-subtle bg-surface-raised p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-text-primary">
          {titulo}
        </h3>
        {podeRemover ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemover}
            aria-label={`Remover ${titulo.toLowerCase()} do pedido`}
          >
            Remover
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** Botão "+ Adicionar atleta" (D-2) — mesma peça onde quer que apareça. */
export function BotaoAdicionarAtleta({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <div>
      <Button variant="secondary" size="sm" onClick={onClick} disabled={disabled}>
        <UserPlus size={16} strokeWidth={2} aria-hidden className="mr-1.5" />+ Adicionar atleta
      </Button>
    </div>
  );
}
