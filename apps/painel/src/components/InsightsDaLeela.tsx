// =============================================================================
// InsightsDaLeela — o bloco que o dono mandou no template e que o painel nunca
// teve (ENG-INSIGHTS · leva 20), agora a peça ÚNICA de duas telas
// (VG-INSIGHTS · leva 23).
//
// A PERDA DE SPEC, escrita aqui porque comentário é onde ela não se perde de
// novo: o bloco existe no template do dono desde 09/08
// (`handoff-v2/design/engajamento-referencia.dc.html`, `aria-label="Insights da
// Leela"` na l.439, derivações na l.1484) e tinha ZERO ocorrência em
// `apps/painel/src`. O inventário da lane ENGAJAMENTO-DASH não o registrou nem
// como bloco entregue nem como impedimento — ele simplesmente sumiu entre o
// template e o código, e só voltou porque o dono deu falta dele na leva 20.
//
// E VOLTOU NA CASA ERRADA. A leva 23 trouxe a segunda cobrança do mesmo item:
// *"nao foi o que pedi. Já falei para enriquecermos a visao geral, e os
// insights da leela devem estar lá."* O bloco nasceu no Engajamento porque era
// o template que estava na mão; a tela que o dono pediu era a Visão geral.
//
// POR QUE ELE MORA EM `src/components` (RN-568 · composição recorrente). Esta
// é a MESMA razão escrita no `SecaoHead` ao lado: um bloco que muda de arquivo
// conforme a tela não é bloco, é cópia esperando divergir. A Visão geral é a
// segunda montagem desta anatomia; a regra manda promover antes da terceira.
// Não sobe ao design system pela razão que o `CartaoV3` já escreve no topo
// dele: a moldura de seção do painel é composição de tela, e arrastá-la para o
// DS levaria junto a opinião de dashboard que o DS não tem — nem precisa ter.
// O que É do DS aqui já vem do DS: cada insight é um `Alert` canônico.
//
// O `Alert` foi escolhido depois de medir as três anatomias que o cânone
// oferece, e a escolha não foi por eliminação:
//
//   · `CardDominio` REPROVA. Ele é cartão de ENTIDADE em lista, e assume que o
//     título é um NOME: `CardTitle` vem com `truncate`. O título de um insight
//     é uma frase ("10 de 138 membros estão parados") — cortá-la no meio com
//     reticências é perder justamente a informação.
//   · `SectionHeader` é cabeçalho de bloco, não item de lista.
//   · `Alert` CASA. Um insight é exatamente o que ele modela: uma mensagem com
//     TOM, título, corpo e ação. `live="none"` é o default certo aqui, e a
//     razão está escrita no próprio componente — aviso que já estava na tela
//     quando ela carregou não é live region.
//
// A pílula de tom do template virou o TOM do `Alert`. É a mesma informação com
// menos peças: no mockup a cor vivia num `Badge` sobre uma faixa neutra; aqui
// ela é o tom do próprio aviso. Fica registrado como divergência de pele no
// handoff, para o dono derrubar se quiser a faixa neutra de volta.
//
// POR QUE ISTO NÃO VIOLA A RN-573: um insight é, por construção, um número que
// aparece de novo em outro lugar. A regra-mãe permite isso com duas palavras —
// papel DISTINTO e DECLARADO. O papel distinto é real: o bloco responde "como
// isto está", o insight responde "o que nisso pede ação agora". E a declaração
// é o `destino`: todo insight leva à casa do próprio fato, o que o torna
// resumo COM CAMINHO em vez de cópia. Insight sem caminho não entra neste
// bloco — a garantia é do tipo (`insights.ts`) e é cobrada em teste.
//
// O QUE NÃO ESTÁ AQUI é decisão de cada DERIVAÇÃO, não deste arquivo: a peça
// não sabe contar nada. Cada tela deriva do dado que ela mesma carrega, e o
// que ficou de fora está nomeado no handoff da lane com a evidência.
// =============================================================================

import { Alert, cn } from '@leela/design-system';
import { Sparkles } from 'lucide-react';
import { CartaoV3, EyebrowV3 } from './CartaoV3';
import type { InsightDaLeela, TomDoInsight } from './insights';

/**
 * Tom do insight → tom do `Alert`. Conjunto fechado, zero cor solta.
 *
 * `oportunidade` NÃO usa `vitoria`: verde de sucesso diz "isto deu certo", e
 * uma oportunidade é o contrário — é algo que ainda não foi feito. `info` diz
 * "olhe para isto", que é o pedido real.
 */
const TOM_DO_ALERTA: Record<TomDoInsight, 'alerta' | 'info'> = {
  atencao: 'alerta',
  oportunidade: 'info',
};

const CLASSES_DO_CAMINHO = [
  'inline-flex items-center gap-[var(--spacing-2)]',
  'text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)]',
  'underline underline-offset-2',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
].join(' ');

export interface InsightsDaLeelaProps {
  insights: InsightDaLeela[] | null;
  loading: boolean;
  /**
   * A frase abaixo do cabeçalho. Cada tela diz o que a leitura dela abrange —
   * o Engajamento fala do recorte do seletor de club, a Visão geral fala do
   * portfólio inteiro. Um texto fixo aqui mentiria numa das duas.
   */
  legenda: string;
  /** A linha do bloco sem nenhum insight disparado — mesmo motivo da legenda. */
  vazio: string;
  /**
   * Navegação SPA para os insights de destino `rota`. Sem ela o caminho vira
   * link de página inteira, que funciona e recarrega o app — por isso quem tem
   * roteador passa a função.
   */
  onNavigate?: ((href: string) => void) | undefined;
}

export function InsightsDaLeela({
  insights,
  loading,
  legenda,
  vazio,
  onNavigate,
}: InsightsDaLeelaProps): JSX.Element {
  return (
    <CartaoV3 aria="Insights da Leela" elev={2} padding="lg">
      <EyebrowV3 icon={<Sparkles />}>Insights da Leela</EyebrowV3>
      {/* O template diz "das últimas 4 semanas". NENHUMA derivação das duas
          telas tem janela temporal — os números são retrato de agora — então a
          promessa de período sairia falsa. A frase diz o que é verdade, e quem
          diz é a tela (`legenda`), porque o alcance da leitura muda de uma
          para a outra. */}
      <p className="-mt-[var(--spacing-2)] mb-[var(--spacing-4)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)] text-pretty">
        {legenda}
      </p>

      {loading || insights === null ? (
        <p
          role="status"
          aria-label="Lendo os números"
          className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
        >
          Lendo os números…
        </p>
      ) : insights.length === 0 ? (
        // Mesmo princípio do "Tudo em dia" dos alertas: ausência de insight é
        // uma informação boa, e ela se diz em uma linha — não com um card
        // vazio, que lê como bloco quebrado.
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">{vazio}</p>
      ) : (
        <ul
          role="list"
          className="list-none m-0 p-0 grid grid-cols-1 gap-[var(--spacing-4)] md:grid-cols-2 lg:grid-cols-3"
        >
          {insights.map((insight) => (
            <li key={insight.id} className="flex min-w-0">
              <Alert
                tone={TOM_DO_ALERTA[insight.tom]}
                /* O RÓTULO DO TOM CONTINUA EM TEXTO, e não é decoração. O
                   `Alert` distingue "Atenção" de "Oportunidade" por cor e por
                   ícone; a cor sozinha reprova na 1.4.1, e o ícone é
                   `aria-hidden` — quem lê por leitor de tela não receberia
                   sinal nenhum do tom. A palavra do template resolve os dois
                   casos de uma vez, e por isso ela vive DENTRO do heading. */
                title={
                  <span className="flex flex-col gap-[var(--spacing-1)]">
                    <span className="text-[length:var(--font-size-xs-plus)] font-[var(--font-weight-bold)] uppercase tracking-[var(--countdown-eyebrow-spacing)]">
                      {insight.tag}
                    </span>
                    <span className="text-pretty">{insight.titulo}</span>
                  </span>
                }
                className="flex-1"
                actions={<Caminho insight={insight} onNavigate={onNavigate} />}
              >
                {insight.detalhe}
              </Alert>
            </li>
          ))}
        </ul>
      )}
    </CartaoV3>
  );
}

/**
 * O caminho para a casa do fato. É ele que declara o papel distinto exigido
 * pela RN-573 — sem caminho, o insight seria cópia do número do bloco.
 *
 * Âncora sai como `<a href="#...">` porque é navegação DENTRO da página, e
 * botão não faz isso. Rota sai como botão quando a tela tem roteador, pela
 * mesma razão que o `LinkV3` dos alertas: `<a href>` num SPA recarrega o app
 * inteiro. Sem roteador o `<a>` continua de pé — degradação, nunca link morto.
 */
function Caminho({
  insight,
  onNavigate,
}: {
  insight: InsightDaLeela;
  onNavigate?: ((href: string) => void) | undefined;
}): JSX.Element {
  if (insight.destino.tipo === 'ancora') {
    return (
      <a href={`#${insight.destino.id}`} className={cn(CLASSES_DO_CAMINHO)}>
        {insight.caminho}
      </a>
    );
  }
  const href = insight.destino.href;
  if (!onNavigate) {
    return (
      <a href={href} className={cn(CLASSES_DO_CAMINHO)}>
        {insight.caminho}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onNavigate(href)}
      className={cn('border-none bg-transparent p-0 cursor-pointer', CLASSES_DO_CAMINHO)}
    >
      {insight.caminho}
    </button>
  );
}

InsightsDaLeela.displayName = 'InsightsDaLeela';
