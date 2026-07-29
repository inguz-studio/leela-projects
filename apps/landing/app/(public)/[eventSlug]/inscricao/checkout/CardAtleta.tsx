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

/**
 * Moldura dos blocos de formulário do checkout (achado 7 · B9).
 *
 * Verbatim do dono: "o mesmo componente de formulário em inscrição deve ser
 * aplicado para endereço e Nome Completo". Os campos do atleta já viviam dentro
 * desta superfície (`--surface-raised`, #161616); o bloco do responsável e o do
 * endereço ficavam soltos sobre a página (`--surface-base`, #0C0C0C). Como o
 * `Input` do DS é `flat` (fundo `--surface-sunken`, #0A0A0A, borda
 * `--input-border-flat: transparent` no tema Brasa), a MESMA peça lia como
 * campo dentro do card e como nada fora dele — ~1,03:1 contra a página. Não
 * eram componentes diferentes: era a mesma peça em duas superfícies, e só uma
 * delas funcionava.
 *
 * Uma moldura, três lugares (atleta, responsável, endereço) — o `CardAtleta`
 * a consome também, para que "o mesmo componente" seja verdade por construção
 * e não por disciplina.
 */
export function MolduraFormulario({
  children,
  id,
  className,
}: {
  children: React.ReactNode;
  /** Âncora opcional do bloco (usada pelo "Alterar" do resumo — D-0729-3). */
  id?: string | undefined;
  className?: string | undefined;
}): React.JSX.Element {
  return (
    <div
      id={id}
      className={[
        'scroll-mt-[var(--spacing-6)] rounded-ds-lg border border-border-subtle',
        'bg-surface-raised p-4 sm:p-5',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

export function CardAtleta({
  titulo,
  podeRemover,
  onRemover,
  children,
  id,
}: {
  /** Rótulo humano do card ("Você", "Participante 2") — também nomeia o remover. */
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
    <MolduraFormulario id={id}>
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
    </MolduraFormulario>
  );
}

/** Botão "+ Adicionar participante" (D-2) — mesma peça onde quer que apareça. */
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
        <UserPlus size={16} strokeWidth={2} aria-hidden className="mr-1.5" />+ Adicionar participante
      </Button>
    </div>
  );
}
