// =============================================================================
// OverlayConvite — o aviso de boas-vindas da conta em vitrine
// (ONBOARD-VITRINE · RN-510, sucedendo a RN-416).
//
// Ordem do dono, verbatim (06/08): "ao tentar clicar em qualquer botão, ou aba
// de menu, sobe o aviso, de boas vindas à leela, e orientando para falar com
// nosso time, para receber o código Leela, para conhecer a plataforma."
//
// O DESENHO DE PRODUTO, que não mudou. A RN-416 pedia um overlay BLOQUEANTE E
// NÃO-DESCARTÁVEL (sem X, sem Esc, sem clique-fora) porque, naquele desenho, a
// rota de destino nem montava: fechar deixaria a pessoa olhando uma home vazia.
// Com a vitrine existe algo por baixo para olhar, e o dono descreveu o aviso
// como resposta a um GESTO ("ao tentar clicar"), não como parede permanente.
// Então: ele BLOQUEIA enquanto está na tela e é DESCARTÁVEL. Quem rearma a
// captura depois do fechamento é o `useAvisoNaPrimeiraInteracao` — o próximo
// gesto sobe o aviso de novo. Fechar não é dispensar para sempre.
//
// O código é de quem vai ser PROFISSIONAL (ordem do dono na mesma fala), então
// a copy não empurra ninguém para o campo: ela dá boas-vindas, aponta o time e
// deixa o campo ali para quem já tem o código. A linha do participante existe
// para que ninguém fique procurando ingresso no painel errado.
//
// -----------------------------------------------------------------------------
// VITRINE-VEU-1 (corte de 09/08) — O VÉU ESCRITO À MÃO SAI; ENTRA O `Modal` DO DS
// -----------------------------------------------------------------------------
// O que havia aqui era um `role="dialog"` + `aria-modal` construído nesta
// própria tela: véu com `onKeyDown`, armadilha de Tab caseira e nada mais. A
// review REV-VITRINE mediu o que isso valia (DEF-R1): o véu bloqueava o
// hit-test do MOUSE e mais nada. Oito controles do fundo seguiam alcançáveis,
// sem `inert`, sem `aria-hidden`, sem trava de rolagem, com o dialog dentro do
// `<main class="overflow-hidden">` em vez de portalizado — e um clique de
// tecnologia assistiva navegou o painel para `/marcas` com o aviso na frente,
// em silêncio absoluto.
//
// O `Modal` do DS já é essa peça, e 26 telas do painel a usam: portal para o
// `document.body`, `useDialogBehavior` (Esc, armadilha de Tab CÍCLICA no
// documento — não um `onKeyDown` que só morde com o foco já dentro —, trava de
// rolagem do `body` e retorno de foco ao abridor) e `aria-hidden` no véu.
// Escrever à mão uma versão pior do que já existe é o oposto da regra de
// reaproveitar antes de escrever.
//
// O QUE O `Modal` NÃO TRAZ, e a lane teve de trazer: `inert` no fundo. O aceite
// do corte é literal — os oito controles param de ser alcançáveis "incluindo
// por clique de tecnologia assistiva" —, e `aria-modal` é sinal, não trava.
// Quem entrega a trava é `_lib/fundoInerte.ts`, aplicado pelo gate. O motivo de
// ele não morar dentro do `Modal` está escrito lá.
//
// O QUE A ADOÇÃO TROUXE DE BRINDE, e é aceito de propósito: o cabeçalho e o X
// do `Modal` (o registro do maestro chama isso de "o ajuste visual da moldura",
// parte do conserto) e o fechar por clique no véu. As três saídas — X, Esc,
// clique fora — fazem a mesma coisa que "Continuar olhando" já fazia: fecham e
// rearmam. Nenhuma delas dispensa o aviso para sempre.
//
// ⛔ `onOpenChange` MEMOIZADO, e não é estilo. `useDialogBehavior` tem `onClose`
// na lista de dependências do efeito. Uma seta inline aqui nasce nova a cada
// render, e o `codigo` deste componente re-renderiza a CADA TECLA: o efeito
// desmontaria e remontaria a cada caractere, devolvendo o foco ao abridor (um
// link do menu, no FUNDO) e depois jogando-o no X. Digitar o código ficaria
// impossível. Com `useCallback` o efeito roda uma vez.
//
// ⛔ O FOCO DE ENTRADA CONTINUA NO CONTEÚDO, NÃO NO X — e isto é conserto, não
// preferência. O `Modal` do DS foca o botão de fechar ao abrir (paridade com o
// autofocus do Radix, contrato dele). Aqui esse foco tem um efeito colateral
// que nenhuma outra tela do painel tem: o aviso sobe COMO RESPOSTA A UMA TECLA,
// e a tecla ainda não terminou. Medido na suíte da vitrine, com o `Modal` cru:
//
//   [DBG] keydown  activeElement = A "Clubs"      ← a pessoa aperta Enter no menu
//   [DBG] click    target        = BUTTON "Fechar ✕"  ← o aviso já roubou o foco
//   [DBG] aviso na tela?         false            ← e a mesma tecla o dispensou
//
// Os dois casos de teclado da ordem do dono ("Enter no item de menu" e "barra
// de espaço num botão") caíam assim: o aviso subia e a cauda do mesmo gesto o
// fechava. O desenho original focava o PAINEL (`tabIndex={-1}`), que não é
// acionável por Enter nem por espaço — era essa a propriedade, e ela volta aqui
// pelo `conteudoRef`. Não afrouxa nada do `Modal`: a armadilha de Tab ignora
// `tabindex="-1"`, e o retorno de foco já guardou o abridor antes deste efeito.
//
// -----------------------------------------------------------------------------
// VITRINE-CONTRASTE-1 (corte de 09/08) — A BORDA DO CARTÃO, MEDIDA
// -----------------------------------------------------------------------------
// No tema brasa o cartão dá 1,13:1 contra o próprio véu e a borda `--border-
// subtle` não resgata (1,31:1), num piso de 3:1 que a WCAG 1.4.11 pede para o
// limite de um componente. Quem tem baixa visão vê o texto flutuando, sem
// enxergar onde o cartão começa.
//
// O `Modal` do DS não desenha borda nenhuma — ele se separa do fundo por
// `--elevation-3`, e sombra não é limite medível. Então a borda entra pelo
// `className`, que é por onde o `Modal` aceita skin do consumidor. Números do
// token RESOLVIDO no CSS buildado, nos dois temas, em
// `__tests__/contraste-aviso.test.ts`.
//
// O véu continua medido no CSS que o BUILD produz (`__tests__/veu-buildado.
// test.ts`), agora na peça nova: o gate lê a classe do véu do `Modal.tsx` do DS
// e exige que este arquivo use o `Modal`. O DEF-C — `bg-[var(--surface-base)]/95`,
// que o Tailwind descarta e deixa um overlay transparente no ar — continua
// falsificado lá, com a classe original compilada e zero fundo produzido.
// =============================================================================

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Modal } from '@leela/design-system';
import {
  TAMANHO_CODIGO_ORGANIZADOR,
  hrefContatoOnboarding,
  normalizarCodigoOrganizador,
  validarCodigoOrganizador,
  type ContatoOnboarding,
} from '@leela/core';
import { ATRIBUTO_ISENTO } from './_lib/primeiraInteracao';

export interface OverlayConviteProps {
  contato: ContatoOnboarding;
  enviando: boolean;
  erro: string | null;
  onResgatar: (codigo: string) => void;
  onSair: () => void;
  /** Fecha o aviso e devolve a vitrine. Rearma a captura da próxima interação. */
  onFechar: () => void;
}

/** O título do aviso, na boca do dono. */
export const TITULO_AVISO = 'Boas-vindas à Leela';

/** A descrição — as três peças da ordem de 06/08 em duas frases. */
export const DESCRICAO_AVISO =
  'Você já entrou e pode circular pelo painel à vontade. Para trabalhar com os seus dados aqui, fale com o nosso time e receba o código Leela.';

/**
 * A borda do cartão (VITRINE-CONTRASTE-1). Exportada porque o teste de
 * contraste a LÊ daqui em vez de repetir a string: trocar o token por um mais
 * fraco derruba a medição, em vez de passar calado.
 */
export const CLASSE_BORDA_AVISO = 'border border-[var(--border-strong)]';

export function OverlayConvite({
  contato,
  enviando,
  erro,
  onResgatar,
  onSair,
  onFechar,
}: OverlayConviteProps): JSX.Element {
  const [codigo, setCodigo] = useState('');
  const conteudoRef = useRef<HTMLDivElement>(null);

  const normalizado = normalizarCodigoOrganizador(codigo);
  const podeEnviar = validarCodigoOrganizador(normalizado) && !enviando;

  // Roda DEPOIS do efeito do `Modal` (efeito de filho vem antes do de pai) e
  // tira o foco do X. Ver o bloco ⛔ do cabeçalho: sem isto, a mesma tecla que
  // sobe o aviso o dispensa.
  useEffect(() => {
    conteudoRef.current?.focus();
  }, []);

  // Ver o bloco ⛔ do cabeçalho: identidade estável ou o foco pula a cada tecla.
  const aoMudarAbertura = useCallback(
    (aberto: boolean): void => {
      if (!aberto) onFechar();
    },
    [onFechar],
  );

  function enviar(event: FormEvent): void {
    event.preventDefault();
    if (!podeEnviar) return;
    onResgatar(normalizado);
  }

  return (
    // `open` é constante: quem decide se o aviso existe é o gate, que monta e
    // desmonta este componente. O `Modal` continua sendo a peça que abre.
    <Modal
      open
      onOpenChange={aoMudarAbertura}
      title={TITULO_AVISO}
      description={DESCRICAO_AVISO}
      size="sm"
      className={CLASSE_BORDA_AVISO}
    >
      {/* Isenta o conteúdo do aviso da captura de interação — cinto e
          suspensório: os ouvintes já saem do documento enquanto ele está
          aberto (decisão 2 de `primeiraInteracao.ts`). */}
      <div
        ref={conteudoRef}
        tabIndex={-1}
        className="flex flex-col gap-[var(--spacing-5)] outline-none"
        {...{ [ATRIBUTO_ISENTO]: '' }}
      >
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Veio participar de uma experiência? Seus ingressos ficam na área do cliente, no site
          da Leela.
        </p>

        <form className="flex flex-col gap-[var(--spacing-4)]" onSubmit={enviar} noValidate>
          {erro ? (
            <p
              role="alert"
              className="rounded-[var(--radius-sm)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-base)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
            >
              {erro}
            </p>
          ) : null}

          <Input
            id="overlay-codigo-convite"
            label="Já tem o código Leela?"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={TAMANHO_CODIGO_ORGANIZADOR + 4}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />

          <Button type="submit" variant="primary" disabled={!podeEnviar} className="w-full">
            {enviando ? 'Liberando acesso…' : 'Liberar acesso'}
          </Button>
        </form>

        <div className="flex flex-col gap-[var(--spacing-3)] border-t border-t-[var(--border-subtle)] pt-[var(--spacing-4)]">
          <a
            href={hrefContatoOnboarding(contato)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--action-brand-tint-fg)] hover:underline"
          >
            Falar com o time Leela
          </a>
          <Button type="button" variant="secondary" onClick={onFechar} className="w-full">
            Continuar olhando
          </Button>
          <div className="flex items-center justify-center gap-[var(--spacing-4)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            <Link to="/conta" className="hover:underline">
              Minha conta
            </Link>
            <button type="button" onClick={onSair} className="hover:underline">
              Sair
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

OverlayConvite.displayName = 'OverlayConvite';
