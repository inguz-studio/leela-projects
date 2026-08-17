/**
 * FilterChips — a faceta de UM filtro de listagem. Sempre em LISTA.
 *
 * POR QUE EXISTE. Inventário de 2026-08-12, §4.1: doze telas montaram à mão o
 * mesmo `<div role="group" aria-label="Filtrar por X">` + `Chip.map()`, e sete
 * delas compartilham até a classe de espaçamento. O `Chip` é canônico e está
 * certo; o que se repetiu doze vezes é a MONTAGEM — e é a montagem que decide
 * se a faceta é exclusiva ou empilhável, se mostra contagem e como o leitor de
 * tela ouve o grupo.
 *
 * ⛔ O LIMIAR MORREU EM 2026-08-17, POR DECISÃO DO DONO (leva 20). Até aqui
 * esta peça CONTAVA as opções: abaixo de quatro desenhava fileira de `Chip`,
 * de quatro em diante virava `FilterMenu`/`Combobox`. O dono, na íntegra:
 * *"novamente, voco colocol pills no lugar de filtros, em Membros, em duas
 * fileiras, quanto poderiamos apenas ter filtros. (...) quero que voce aplique
 * o componente dos filtros em lista. e eles devem ficar alinhados ao lado do
 * pesquisador, assim como em DEsafios. Para padronizar."* Filtro de listagem é
 * lista, e ponto — a contagem de opções não decide mais nada.
 *
 * A RÉGUA QUE PERDEU, ESCRITA PARA NÃO VOLTAR POR ESQUECIMENTO. O limiar
 * existia para poupar clique: fileira mostra tudo de uma vez, menu cobra abrir.
 * Três ADRs (018, 019, 020) recusaram converter telas em nome dessa economia, e
 * a régua deles era "onda que sobe passo não fecha". A régua do dono é outra e
 * vence: clareza do padrão. O que a medição de 17/08 mostrou é que o clique
 * economizado saía caro em outro lugar — a fileira não mostra o NOME da faceta.
 * Em Membros o organizador via `Todos · Ativos · Novos · Inativos · Todos ·
 * Owner · Admins · Membros`: dois "Todos" colados, sem nada dizendo onde acaba
 * Status e começa Papel. O nome só existia no `aria-label`, ou seja, só para
 * quem usa leitor de tela. A lista resolve isso por construção: o gatilho é
 * `Status: Todos`, com o nome da faceta VISÍVEL e o valor aplicado junto.
 *
 * QUAL LISTA, E POR QUE DUAS. `FilterMenu` é multi-seleção por construção
 * (itens `menuitemcheckbox`) e usá-lo para escolha exclusiva anunciaria
 * "marcado" onde a semântica é "selecionado". Então: `multiple` é `FilterMenu`,
 * exclusiva é `Combobox`. Os dois são canônicos, os dois mostram o que está
 * aplicado, e nenhum é `Select` — que o cânone proíbe para filtro com essas
 * palavras.
 *
 * O "TODOS" NÃO É MAIS UM CHIP, E CONTINUA EXISTINDO. Em faceta exclusiva ele
 * é a primeira linha do `Combobox` (limpar filtro exclusivo precisa de saída
 * visível — clicar de novo no valor ativo é afordância escondida). Em faceta
 * empilhável ele é o resumo do gatilho quando nada está marcado.
 *
 * ZERO MOTOR PRÓPRIO. Nada aqui desenha popover ou lista: a peça compõe
 * `FilterMenu` e `Combobox` do barril.
 *
 * A FACETA TEM LARGURA DE CONTEÚDO, e isso é contrato, não estilo. Ela vive
 * ombro a ombro com a busca e com as outras facetas numa fileira só; qualquer
 * largura elástica aqui empurra a vizinha para a linha de baixo. Ver a nota do
 * `w-auto` na faceta exclusiva — foi exatamente assim que a barra de Membros
 * nasceu com três fileiras no desktop.
 *
 * AA: nenhum par novo — `FilterMenu` e `Combobox` já rodam na matriz de
 * contraste nos três temas, e o grupo não pinta nada.
 */

import { FilterMenu } from '../FilterMenu';
import { Combobox } from '../Combobox';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FilterChipsOption {
  id: string;
  label: string;
  /** Quantos itens a opção recorta. Aparece no chip e na linha do menu. */
  count?: number;
}

export interface FilterChipsProps {
  /**
   * O nome da faceta ("Status", "Canal"). Nomeia o grupo para o leitor de tela
   * e o gatilho do menu — é o mesmo texto nos dois desenhos, de propósito.
   */
  label: string;
  options: FilterChipsOption[];
  /** ids aplicados. Vazio = sem filtro. Em faceta exclusiva, no máximo um. */
  selected: string[];
  onChange: (next: string[]) => void;
  /** Faceta empilhável (marca vários) ou exclusiva (um recorte por vez). */
  multiple?: boolean;
  /** Texto do estado sem seleção. Default: "Todos". */
  allLabel?: string;
  /** Contagem do estado sem seleção — o total do recorte. */
  allCount?: number;
  /**
   * Faceta desligada em bloco. Nasceu do ADR-020: o diretório global de eventos
   * desabilita o recorte por status enquanto o recorte por tenant está ativo
   * (os dois são mutuamente exclusivos na leitura de dado). Era a capacidade
   * que faltava à peça e que o ADR nomeou como condição de reabertura.
   */
  disabled?: boolean;
  className?: string;
}

/** "Rascunho · 12" — a grafia que a faceta de inscritos já usava. */
function rotulo(texto: string, count: number | undefined): string {
  return count === undefined ? texto : `${texto} · ${count}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function FilterChips({
  label,
  options,
  selected,
  onChange,
  multiple = false,
  allLabel = 'Todos',
  allCount,
  disabled = false,
  className,
}: FilterChipsProps): JSX.Element {
  // ── Faceta empilhável ──────────────────────────────────────────────────────
  if (multiple) {
    return (
      <FilterMenu
        label={label}
        allLabel={allLabel}
        selected={selected}
        onChange={onChange}
        disabled={disabled}
        options={options.map((o) => ({
          id: o.id,
          label: o.label,
          ...(o.count !== undefined ? { count: o.count } : {}),
        }))}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  // ── Faceta exclusiva ───────────────────────────────────────────────────────
  //
  // O `Combobox` devolve string em modo single. A opção vazia é o "Todos": ela
  // precisa de um valor real porque `value=""` no `Command` não é selecionável,
  // então o id do "tudo" é explícito e nunca escapa desta peça.
  //
  // ⛔ `w-auto` NÃO É COSMÉTICO, É O CONSERTO DE 2026-08-17 (lane FILTROS-FIX).
  // O gatilho do `Combobox` nasce `w-full` porque a peça é, na origem, um CAMPO
  // DE FORMULÁRIO: dentro de um `FieldGroup` ela ocupa a coluna inteira, e ali
  // isso está certo. Numa barra de filtro está errado, e o modo como quebra não
  // é óbvio: o contêiner de facetas da `FilterBar` é `flex-wrap` e tem largura
  // por CONTEÚDO (shrink-to-fit), então `width:100%` resolve contra uma largura
  // indefinida e cada faceta reivindica a linha toda. Duas facetas exclusivas
  // viram duas FILEIRAS, uma embaixo da outra, ao lado da busca — foi o que o
  // gate visual mediu em Membros, Desafios e Comunicados (3 fileiras, barra de
  // 113px contra os 49px do hub de Eventos, que só usa `FilterMenu` e por isso
  // escapou). Nenhum teste de unidade pega isso: o JSX é idêntico nas quatro
  // telas e só a geometria em execução difere — a prova é o gate, não o DOM.
  //
  // O conserto mora AQUI, e não no `Combobox`: quem promete "faceta de filtro"
  // é esta peça, e faceta de filtro tem largura de conteúdo, como o gatilho do
  // `FilterMenu` ao lado dela. O `Combobox` continua `w-full` para quem o usa
  // como campo. `cn` é tailwind-merge, então a classe do consumidor ainda vence
  // a nossa se ele precisar de outra largura.
  //
  // ⛔ O NOME DA FACETA É TEXTO, e não `aria-label` — a outra metade do conserto
  // de 2026-08-17. O handoff da conversão prometeu, com todas as letras, que
  // *"o gatilho da lista mostra `Status: Todos`, em texto, para todo mundo"*, e
  // a faceta EMPILHÁVEL cumpriu (o `FilterMenu` compõe `${label}: ${resumo}`).
  // A exclusiva não: ela passava o nome em `aria-label` e desenhava só o valor,
  // então Membros voltou a mostrar `Todos` colado em `Todos` — a queixa que a
  // conversão inteira existia para matar, sobrevivendo dentro da conversão.
  // O `aria-label` sai junto de propósito: com o nome no texto, ele passaria a
  // ESCONDER o valor aplicado de quem usa leitor de tela ("Status" no lugar de
  // "Status: Ativos") e ainda quebraria a 2.5.3 do WCAG, que pede que o nome
  // acessível contenha o rótulo visível. Sem ele, o nome acessível é o próprio
  // texto — exatamente como no `FilterMenu` ao lado.
  const ID_TUDO = '__todos__';
  return (
    <Combobox
      triggerPrefix={label}
      placeholder={allLabel}
      disabled={disabled}
      value={selected[0] ?? ID_TUDO}
      onValueChange={(v) => {
        const escolhido = Array.isArray(v) ? v[0] : v;
        onChange(escolhido === undefined || escolhido === ID_TUDO ? [] : [escolhido]);
      }}
      options={[
        { value: ID_TUDO, label: rotulo(allLabel, allCount) },
        ...options.map((o) => ({ value: o.id, label: rotulo(o.label, o.count) })),
      ]}
      className={cn('w-auto', className)}
    />
  );
}

FilterChips.displayName = 'FilterChips';

export { FilterChips };
