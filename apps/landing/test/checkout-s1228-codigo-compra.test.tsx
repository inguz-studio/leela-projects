// =============================================================================
// PROVA da S1228-T2 (RN-474 · RN-475 · trace leela-pixreal-diag-20260804).
//
// O que muda na tela do comprador: o identificador da compra deixa de ser o id
// do documento e passa a ser o código curto. Não é uma troca cosmética — o id
// é `ped-{uid}-{chave}` POR CONSTRUÇÃO, então imprimi-lo publica o uid da conta
// de quem comprou numa tela que a pessoa fotografa e num print que ela
// encaminha. Setenta e três caracteres era o sintoma; o uid viajando era o dano.
//
// As três perguntas que este arquivo responde, e que a review antagonista vai
// refazer:
//
//   1. o código aparece nos DOIS ramos da confirmação (pago e não-final)?
//   2. quando ele NÃO existe, o que aparece no lugar? (resposta obrigatória:
//      nada — nunca o id)
//   3. existe algum caminho pelo qual o id volte à tela sem ninguém ver?
//
// A (3) é a que envelhece melhor, e por isso ela é DUAS provas: a de
// comportamento (nenhum dos quatro estados imprime o id) e a de FONTE, que
// falha se alguém reintroduzir `{charge.pedidoId}` em qualquer arquivo do
// checkout — inclusive num arquivo que ainda não existe.
// =============================================================================

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { CreateInscricaoChargeResult } from '@leela/api-client';
import { StepConfirmacao } from '../app/(public)/[eventSlug]/inscricao/checkout/StepConfirmacao';
import { ToastProvider } from '../app/_ds/ds';

afterEach(cleanup);

// O id REAL da compra de 04/08 tem esta forma: prefixo, uid da conta no meio,
// chave de idempotência no fim. É ele que não pode sobrar em lugar nenhum.
const PEDIDO_ID = 'ped-anon-ana-4f21c9-chk-a1b2c3d4';
const UID_NO_MEIO = 'anon-ana-4f21c9';
const EMAIL = 'ana@example.com';

/**
 * Os cinco símbolos LIMPOS, como o doc do pedido os grava. O prefixo não está
 * aqui de propósito: se ele vazasse para o dado, o veto CODPED-1 do dono
 * deixaria de ser a troca de uma constante.
 */
const CODIGO = 'A2B3C';
/** O mesmo código como o comprador o lê. Literal DE PROPÓSITO: é o aceite. */
const CODIGO_EXIBIDO = 'PED-A2B3C';

const VALORES = {
  valorBase: 5000,
  desconto: 0,
  valorFinal: 5000,
  taxaServico: 0,
  jurosParcelamento: 0,
  totalCobrado: 5000,
  parcelas: 1,
  valorParcela: 5000,
};

function charge(): CreateInscricaoChargeResult {
  return {
    pedidoId: PEDIDO_ID,
    pagamentoId: 'pag-s1228',
    inscritoIds: [`${PEDIDO_ID}-i1`],
    chargeId: 'ch-s1228',
    qrCode: 'PIX-PAYLOAD-S1228',
    pixExpiraEmMillis: Date.now() + 1_800_000,
    statusPedido: 'pendente',
    valores: VALORES,
  } as unknown as CreateInscricaoChargeResult;
}

function renderConfirmacao(props: Record<string, unknown> = {}): void {
  render(
    <ToastProvider>
      <StepConfirmacao
        charge={charge()}
        confirmacao={null}
        eventoNome="Experiência S1228"
        slug="experiencia-s1228"
        responsavelEmail={EMAIL}
        linhas={[{ titulo: 'Ana', modalidade: '5k', kitLabel: 'Sem kit' }]}
        forma="pix"
        taxaRepassada={false}
        {...props}
      />
    </ToastProvider>,
  );
}

/**
 * O id NÃO está na tela — em nenhuma das formas em que ele poderia aparecer.
 *
 * Três asserções e não uma: o id inteiro pega a volta literal; o uid sozinho
 * pega quem "encurtar" o id achando que o problema era o tamanho (não era);
 * e o `inscritoId`, que carrega o id do pedido dentro dele, pega a volta pela
 * porta lateral do bloco de ingressos.
 */
function expectSemIdInterno(): void {
  const texto = document.body.textContent ?? '';
  expect(texto).not.toContain(PEDIDO_ID);
  expect(texto).not.toContain(UID_NO_MEIO);
  expect(texto).not.toContain(`${PEDIDO_ID}-i1`);
}

// ─────────────────────────────────────────────────────────────────────────
// 1 · o código aparece — nos DOIS ramos
// ─────────────────────────────────────────────────────────────────────────
describe('S1228-T2 · o comprador lê o código da compra, não o id', () => {
  it('ramo PAGO: "Inscrição confirmada!" vem com o código, e sem o id', () => {
    renderConfirmacao({ statusPedidoConsultado: 'pago', codigoPedido: CODIGO });
    expect(screen.getByText('Inscrição confirmada!')).toBeTruthy();
    expect(screen.getByText(CODIGO_EXIBIDO)).toBeTruthy();
    expectSemIdInterno();
  });

  it('ramo NÃO-FINAL (em confirmação): mesma linha, mesmo código, mesmo silêncio sobre o id', () => {
    // Sem `statusPedidoConsultado` a tela fica no ramo de espera — que é
    // exatamente o do incidente de 04/08, quando o PIX foi pago e a tela não
    // sabia. É a tela que o comprador tem na frente na hora em que ele mais
    // precisa de um número para citar ao atendimento.
    renderConfirmacao({ codigoPedido: CODIGO });
    expect(screen.getByText('Estamos confirmando o seu pedido')).toBeTruthy();
    expect(screen.getByText(CODIGO_EXIBIDO)).toBeTruthy();
    expectSemIdInterno();
  });

  it('ramo NÃO-FINAL (encerrado): a compra morta também tem código a citar', () => {
    // `falhou` é terminal. Quem vai reclamar de uma compra que não vingou
    // precisa do código tanto quanto quem pagou — mais, até.
    renderConfirmacao({ statusPedidoConsultado: 'falhou', codigoPedido: CODIGO });
    expect(screen.getByText(CODIGO_EXIBIDO)).toBeTruthy();
    expectSemIdInterno();
  });

  it('o rótulo "Pedido" continua ao lado do código — a linha diz o que ela é', () => {
    renderConfirmacao({ statusPedidoConsultado: 'pago', codigoPedido: CODIGO });
    const valor = screen.getByText(CODIGO_EXIBIDO);
    expect(valor.parentElement?.textContent).toBe(`Pedido ${CODIGO_EXIBIDO}`);
  });

  it('o prefixo vem do CORE, não da tela: o código cru sozinho nunca aparece', () => {
    renderConfirmacao({ statusPedidoConsultado: 'pago', codigoPedido: CODIGO });
    // `A2B3C` existe na tela apenas DENTRO de `PED-A2B3C`. Se alguém trocar
    // `formatarCodigoPedido` por interpolação direta, este caso cai.
    expect(screen.queryByText(CODIGO)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2 · ausência é ausência
// ─────────────────────────────────────────────────────────────────────────
describe('S1228-T2 · sem código, a tela não inventa um identificador', () => {
  it('ramo PAGO sem código (compra anterior ao backfill): nem código, nem id', () => {
    renderConfirmacao({ statusPedidoConsultado: 'pago' });
    expect(screen.getByText('Inscrição confirmada!')).toBeTruthy();
    expect(screen.queryByText(/^PED-/)).toBeNull();
    expect(document.body.textContent).not.toContain('Pedido ');
    expectSemIdInterno();
  });

  it('ramo NÃO-FINAL sem código: idem — e a mensagem de espera continua inteira', () => {
    renderConfirmacao({});
    expect(screen.getByText('Estamos confirmando o seu pedido')).toBeTruthy();
    expect(screen.queryByText(/^PED-/)).toBeNull();
    expect(document.body.textContent).not.toContain('Pedido ');
    expectSemIdInterno();
  });

  it('código fora do formato é tratado como ausência — quem julga é o core', () => {
    // `A0B3C` tem um ZERO, e o alfabeto anti-ambíguo da casa não tem zero.
    // Dado corrompido não vira código, e o ramo de exceção não é janela para
    // o id voltar.
    renderConfirmacao({ statusPedidoConsultado: 'pago', codigoPedido: 'A0B3C' });
    expect(document.body.textContent).not.toContain('A0B3C');
    expect(document.body.textContent).not.toContain('PED-');
    expectSemIdInterno();
  });

  it('código de tamanho errado também é ausência', () => {
    renderConfirmacao({ statusPedidoConsultado: 'pago', codigoPedido: 'A2B3' });
    expect(document.body.textContent).not.toContain('PED-');
    expectSemIdInterno();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2b · a SEXTA superfície — o id que viajava com outro nome
// ─────────────────────────────────────────────────────────────────────────
describe('S1228-T2 · o cartão do ingresso não imprime mais o id do inscrito', () => {
  // ACHADO desta lane, fora do inventário de cinco lugares da spec: o `Ticket`
  // imprimia o `inscritoId`, que é `{pedidoId}-i{n}` — o id do pedido inteiro,
  // com o uid da conta dentro, em mono e com `title` para o texto completo. A
  // varredura da spec procurou por `pedidoId` e não o viu porque ali ele se
  // chama outra coisa. A razão da RN-475 vale igual: é a mesma tela que a
  // pessoa fotografa.
  it('o nome e a modalidade ficam; o id do inscrito sai da vista', () => {
    renderConfirmacao({ statusPedidoConsultado: 'pago', codigoPedido: CODIGO });
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('5k · Sem kit')).toBeTruthy();
    expect(document.body.textContent).not.toContain(`${PEDIDO_ID}-i1`);
    // Nem em atributo: o `title` era o outro caminho para o texto completo.
    expect(document.body.innerHTML).not.toContain(`${PEDIDO_ID}-i1`);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3 · o canário de FONTE — a volta silenciosa do id
// ─────────────────────────────────────────────────────────────────────────
//
// A fila pediu isto com todas as letras: "o teste é que NENHUMA superfície de
// comprador imprime `pedidoId` — executável, e é ele que segura a volta
// silenciosa do id numa tela futura". Os casos acima provam os quatro estados
// que existem HOJE; este varre o diretório e vale para a tela que alguém
// escrever amanhã.
//
// O padrão procurado é a forma de IMPRIMIR: uma chave cujo conteúdo INTEIRO é
// `pedidoId` (ou `algo.pedidoId`), em posição de filho de JSX. A busca não é
// por "a palavra aparece" porque o checkout tem quinze usos legítimos dela, e
// um canário que grite em todos eles é um canário que alguém desliga.
//
// O que separa imprimir de usar é o caractere ANTES da chave:
//   `>{charge.pedidoId}` ou `Pedido {charge.pedidoId}` → imprime  (pega)
//   `expirarPixPendente({ pedidoId })`                 → argumento (`(`)
//   `pedidoId={pedidoId}`                              → prop     (`=`)
//   `{ pedidoId, eventoId }`                           → objeto   (`,`/`{`)
//   `charge?.pedidoId`                                 → leitura  (sem chave)
// REV-5C · O CANÁRIO ORIGINAL DEIXAVA PASSAR SETE DE NOVE FORMAS DE VAZAR, e
// entre elas a EXATA que esta lane acabou de remover à mão do `Ticket.tsx`:
// `title={charge.pedidoId}`. Um canário que não pega o vazamento que o próprio
// commit encontrou não é gate, é decoração — e a Directive do commit prometia
// que ele seguraria "a volta silenciosa do id numa tela futura".
//
// O que passava por baixo, medido: atributo de texto (`title`, `alt`,
// `aria-label`), `dangerouslySetInnerHTML`, cadeia de membros mais funda
// (`{a.b.pedidoId}`), `String(...)`, `.slice(...)` (o "conserto" errado que
// acha que o problema era o tamanho) e arquivo em subdiretório ou `.ts`.
//
// Três detectores agora, porque são três posições diferentes onde o id chega a
// olho humano — e a varredura passou a ser recursiva e a incluir `.ts`.
describe('S1228-T2 · o id interno não volta ao checkout por arquivo nenhum', () => {
  const DIR_CHECKOUT = join(
    __dirname,
    '..',
    'app',
    '(public)',
    '[eventSlug]',
    'inscricao',
    'checkout',
  );

  /**
   * 1 · POSIÇÃO DE FILHO DE JSX — o id impresso como texto.
   *
   * O conteúdo da chave deixou de ser `pedidoId` ou `algo.pedidoId` e passou a
   * ser QUALQUER expressão de uma linha que mencione `pedidoId`: é isso que
   * pega `{String(x.pedidoId)}`, `{x.pedidoId.slice(0, 12)}` e a cadeia funda.
   * Nenhum uso legítimo do checkout imprime o id, então a largura não custa
   * ruído — custa só a impossibilidade de alguém alegar que "não era bem a
   * forma que o regex procurava".
   *
   * O que separa imprimir de usar continua sendo o caractere ANTES da chave:
   *   `>{charge.pedidoId}` / `Pedido {charge.pedidoId}` → imprime  (pega)
   *   `expirarPixPendente({ pedidoId })`                → argumento (`(`)
   *   `pedidoId={pedidoId}`                             → prop      (`=`)
   *   `{ pedidoId, eventoId }`                          → objeto    (`,`/`{`)
   *   `const { pedidoId } = charge`                     → desestrut. (`} =`)
   *
   * `[^{}\n]` e não `[^{}]`: sem o `\n` um literal de objeto multilinha que
   * começasse em `{` no início da linha viraria falso positivo, e canário que
   * grita à toa é canário que alguém desliga.
   */
  const IMPRIME_ID =
    /(?:^[ \t]*|[^=(,[:{\s][ \t]*)\{[^{}\n]*\bpedidoId\b[^{}\n]*\}(?!\s*(?:=[^=]|from\b))/m;

  /**
   * 2 · ATRIBUTO QUE VIRA TEXTO OU FICA NO DOM.
   *
   * Era por aqui que o `Ticket` vazava: `title={inscritoId}` põe o valor
   * inteiro no tooltip, e o id sobrevive num print e no "salvar página". O
   * detector 1 NÃO pega esta forma por construção — o caractere antes da chave
   * é `=`, que é justamente o que ele usa para ignorar prop legítima.
   */
  const ATRIBUTO_COM_ID =
    /\b(?:title|alt|aria-label|aria-labelledby|aria-description|aria-describedby|placeholder|value|content|data-[\w-]+)\s*=\s*\{[^{}\n]*\bpedidoId\b/;

  /** 3 · HTML cru: o escape some e o id entra no markup direto. */
  const HTML_CRU_COM_ID = /dangerouslySetInnerHTML[^;]*?\bpedidoId\b/s;

  const DETECTORES = [IMPRIME_ID, ATRIBUTO_COM_ID, HTML_CRU_COM_ID] as const;
  const acusa = (fonte: string): boolean => DETECTORES.some((re) => re.test(fonte));

  /** Varredura RECURSIVA — subdiretório era buraco declarado do canário. */
  function fontesDoCheckout(dir: string): string[] {
    const achados: string[] = [];
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name);
      if (entrada.isDirectory()) {
        achados.push(...fontesDoCheckout(caminho));
      } else if (entrada.name.endsWith('.tsx') || entrada.name.endsWith('.ts')) {
        achados.push(caminho);
      }
    }
    return achados;
  }

  it('o canário morde: ele reconhece as formas que vazam e ignora as que ficaram', () => {
    // Sem este caso, um refactor que quebre a expressão deixaria a suíte verde
    // para sempre — canário que não canta não vigia nada.

    // As que a lane removeu à mão, e que o canário TEM de pegar sozinho.
    expect(acusa('<p>Pedido {charge.pedidoId}</p>')).toBe(true);
    expect(acusa('<p>{pedidoId}</p>')).toBe(true);
    expect(acusa('  {charge?.pedidoId}\n')).toBe(true);
    // REV-5C · a forma EXATA do vazamento que o `Ticket` tinha. O canário
    // original respondia `false` aqui — o achado da lane teria passado por ele.
    expect(acusa('<p title={inscrito.pedidoId}>x</p>')).toBe(true);
    expect(acusa('<img alt={charge.pedidoId} />')).toBe(true);
    expect(acusa('<p aria-label={charge.pedidoId}>x</p>')).toBe(true);
    expect(acusa('<div dangerouslySetInnerHTML={{ __html: charge.pedidoId }} />')).toBe(true);
    // O "conserto" errado: encurtar o id achando que o problema era o tamanho.
    // Não era — era o uid no meio, e ele sobrevive a qualquer corte.
    expect(acusa('<p>{charge.pedidoId.slice(0, 12)}</p>')).toBe(true);
    expect(acusa('<p>{String(charge.pedidoId)}</p>')).toBe(true);
    expect(acusa('<p>{dados.charge.pedidoId}</p>')).toBe(true);
    expect(acusa('<p>{`Pedido ${charge.pedidoId}`}</p>')).toBe(true);

    // E os quinze usos legítimos continuam mudos.
    expect(acusa('await confirmarPagamentoSandbox({ pedidoId });')).toBe(false);
    expect(acusa('<Foo pedidoId={pedidoId} />')).toBe(false);
    expect(acusa('const { pedidoId } = charge;')).toBe(false);
    expect(acusa('expirarPixPendente({ pedidoId: charge.pedidoId })')).toBe(false);
    expect(acusa('const pedidoId = charge?.pedidoId;')).toBe(false);
    expect(acusa('if (pedidoNaTelaRef.current !== pedidoId) return;')).toBe(false);
  });

  it('nenhuma fonte do checkout leva o id a olho humano', () => {
    const arquivos = fontesDoCheckout(DIR_CHECKOUT);
    // Guarda da guarda: diretório vazio faria este teste passar sem olhar nada.
    expect(arquivos.length).toBeGreaterThan(5);

    const culpados = arquivos.filter((caminho) => {
      const fonte = readFileSync(caminho, 'utf8')
        // Comentários de linha ficam de fora: esta suíte tem de sobreviver a
        // um comentário que CITE o padrão para explicar por que ele saiu — e
        // o `StepConfirmacao` e o `Ticket` têm exatamente esses.
        .replace(/^\s*(\/\/|\*).*$/gm, '');
      return acusa(fonte);
    });
    expect(culpados).toEqual([]);
  });

  // O LIMITE QUE FICA DECLARADO, porque regex não o alcança: uma variável
  // intermediária (`const ref = charge.pedidoId;` … `<p>{ref}</p>`) some do
  // alcance de qualquer varredura textual — pegá-la exigiria seguir o fluxo do
  // valor, que é trabalho de lint com type-checker, não de teste.
  //
  // O outro limite é de ESCOPO: o canário varre `checkout/`, e o comprador já
  // tem superfície fora dele (`minha-conta/PainelCompras.tsx`, que hoje exibe
  // o código e está correta). Estendê-lo é item de fila técnica — mexer no
  // território de outra lane em voo é como um gate vira bloqueio de terceiro.
  it('o limite declarado: variável intermediária passa, e isso está escrito', () => {
    expect(acusa('const ref = charge.pedidoId;\n  <p>{ref}</p>')).toBe(false);
  });
});
