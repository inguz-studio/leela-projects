// =============================================================================
// A primeira interação da conta em vitrine (ONBOARD-VITRINE · RN-510).
//
// A ordem do dono, verbatim (06/08): "Ela entra no sistema e ao tentar clicar
// em qualquer botão, ou aba de menu, sobe o aviso, de boas vindas à leela".
//
// TRÊS DECISÕES DE MECANISMO, cada uma com o motivo escrito porque cada uma tem
// uma alternativa óbvia que não funcionaria aqui:
//
//   1. O ouvinte é do DOCUMENTO, em fase de CAPTURA — não um wrapper em volta
//      das rotas. A sidebar (o "aba de menu" da ordem) é desenhada pelo
//      `RootShell`, que fica ACIMA deste gate: um `<div onClickCapture>` em
//      volta dos filhos nunca veria o clique no menu, que é justamente o gesto
//      que o dono descreveu. Captura no documento vê os dois lados da moldura.
//
//   2. Enquanto o aviso está ABERTO os ouvintes saem do documento. É o que faz
//      o clique em "Continuar olhando" fechar sem reabrir na mesma gesto, sem
//      precisar perguntar se o alvo estava dentro do aviso — a pergunta que
//      envelhece mal quando o aviso ganha um elemento novo.
//
//   3. Depois de fechado, ele REARMA: a próxima interação sobe o aviso de novo.
//      A alternativa (mostrar uma vez por sessão) deixaria a pessoa clicando em
//      botões inertes no silêncio — que é exatamente o beco que esta lane veio
//      desfazer. Rearmar não é insistir: fechar é um gesto explícito, e o
//      clique seguinte é uma intenção nova, que merece a mesma resposta.
//
// O teclado entra por `keydown` porque não dá para depender do clique
// sintetizado: `Enter` num `<a href>` e `Espaço` num `<button>` viram clique no
// navegador, mas widget com `role="button"` e handler de tecla própria, não —
// e é esse o caso que passaria calado.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';

/**
 * O que conta como "tentar usar o painel". Espelha o alvo real do gesto: algo
 * que a pessoa aperta, digita ou navega. Texto, ícone decorativo e a moldura
 * não entram — clicar no vazio não é tentar nada.
 */
export const SELETOR_INTERATIVO = [
  'a[href]',
  'button',
  'summary',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="switch"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Marca de isenção: um elemento com este atributo (ou dentro de um) não conta
 * como tentativa de uso. Existe para o próprio aviso e para o que for
 * navegação de saída — nada que a conta em vitrine já pode fazer deve trazer
 * o aviso de volta na cara dela.
 */
export const ATRIBUTO_ISENTO = 'data-vitrine-isento';

/** O alvo do evento é uma tentativa de usar o painel? @pure */
export function ehTentativaDeUso(alvo: EventTarget | null): boolean {
  if (alvo === null || !(alvo instanceof Element)) return false;
  if (alvo.closest(`[${ATRIBUTO_ISENTO}]`) !== null) return false;
  return alvo.closest(SELETOR_INTERATIVO) !== null;
}

/** Teclas que valem como "apertar" — o equivalente por teclado do clique. */
const TECLAS_DE_USO: ReadonlySet<string> = new Set(['Enter', ' ', 'Spacebar']);

/** A tecla é o equivalente por teclado de um clique? @pure */
export function ehTeclaDeUso(tecla: string): boolean {
  return TECLAS_DE_USO.has(tecla);
}

export interface AvisoDeVitrine {
  /** O aviso está na tela? */
  aberto: boolean;
  /** Fecha o aviso e rearma a captura para a próxima interação. */
  fechar: () => void;
  /** Sobe o aviso sem esperar interação (o CTA da própria vitrine). */
  abrir: () => void;
}

/**
 * Sobe o aviso de boas-vindas na primeira interação enquanto `ativo`.
 *
 * `ativo` é falso para toda conta que não está em vitrine — e aí nenhum ouvinte
 * é registrado, então o painel de quem trabalha não paga um único listener por
 * causa desta tela.
 */
export function useAvisoNaPrimeiraInteracao(ativo: boolean): AvisoDeVitrine {
  const [aberto, setAberto] = useState(false);

  // ⛔ `aberto` SÓ é verdade quando o aviso está mesmo na tela (REV-CORTE ·
  // 09/08). O gate não desenha o aviso fora da vitrine — ele devolve os filhos
  // antes disso —, mas o valor devolvido daqui é lido por quem age no DOM
  // (`useFundoInerte`), e ali um `true` mentiroso vira dano real: o resgate
  // bem-sucedido derruba a vitrine pela SESSÃO, sem passar por `fechar`, e o
  // fundo ficava inerte para sempre. Derivar aqui é o conserto na raiz; a
  // reposição abaixo impede que o estado ressuscite se a conta voltar à
  // vitrine (outro login sem tenant), o que subiria o aviso sem gesto nenhum e
  // quebraria a RN-510.
  useEffect(() => {
    if (!ativo && aberto) setAberto(false);
  }, [ativo, aberto]);

  useEffect(() => {
    // Aberto: sem ouvintes. Ver decisão 2 no cabeçalho.
    if (!ativo || aberto) return undefined;

    function aoClicar(evento: Event): void {
      if (!ehTentativaDeUso(evento.target)) return;
      setAberto(true);
    }

    function aoTeclar(evento: KeyboardEvent): void {
      if (!ehTeclaDeUso(evento.key)) return;
      if (!ehTentativaDeUso(evento.target)) return;
      setAberto(true);
    }

    document.addEventListener('click', aoClicar, true);
    document.addEventListener('keydown', aoTeclar, true);
    return () => {
      document.removeEventListener('click', aoClicar, true);
      document.removeEventListener('keydown', aoTeclar, true);
    };
  }, [ativo, aberto]);

  const fechar = useCallback(() => setAberto(false), []);
  const abrir = useCallback(() => setAberto(true), []);

  return { aberto: ativo && aberto, fechar, abrir };
}
