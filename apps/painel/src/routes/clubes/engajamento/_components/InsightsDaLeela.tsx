// =============================================================================
// InsightsDaLeela — o bloco que o dono mandou no template e que o painel nunca
// teve (ENG-INSIGHTS · leva 20).
//
// A PERDA DE SPEC, escrita aqui porque comentário é onde ela não se perde de
// novo: o bloco existe no template do dono desde 09/08
// (`handoff-v2/design/engajamento-referencia.dc.html`, `aria-label="Insights da
// Leela"` na l.439, derivações na l.1484) e tinha ZERO ocorrência em
// `apps/painel/src`. O inventário da lane ENGAJAMENTO-DASH não o registrou nem
// como bloco entregue nem como impedimento — ele simplesmente sumiu entre o
// template e o código, e só voltou porque o dono deu falta dele na leva 20.
//
// COMPOSTO DOS CANÔNICOS, sem peça nova e sem superfície crua (RN-558). A
// moldura é o `CartaoV3` das seções v3, o cabeçalho é o `EyebrowV3` das outras
// seis seções desta tela, e cada insight é um `Alert` do design system.
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
// POR QUE ISTO NÃO VIOLA A RN-573, que a mesma onda está implantando: um
// insight é, por construção, um número que a tela desenha de novo mais abaixo.
// A regra-mãe permite isso com duas palavras — papel DISTINTO e DECLARADO. O
// papel distinto é real: o gráfico responde "como isto se distribui", o
// insight responde "o que nisso pede ação agora". E a declaração é o
// `caminho`: todo insight leva à casa do próprio fato, o que o torna resumo
// COM CAMINHO em vez de cópia. Insight sem caminho não entra neste bloco.
//
// O QUE NÃO ESTÁ AQUI, e por quê — as três derivações do template, uma a uma,
// estão no handoff da lane com a evidência de cada uma. Duas delas são de
// evento/checkout, não de club: o seletor do topo não as alcança, e bloco que
// o filtro da tela não alcança não pertence a esta tela — que é o critério
// pelo qual a banda Eventos saiu no mesmo commit. Nenhuma virou número
// inventado.
// =============================================================================

import { Alert, cn } from '@leela/design-system';
import { Sparkles } from 'lucide-react';
import { CartaoV3, EyebrowV3 } from '../../../../components/CartaoV3';
import type { InsightDaLeela, TomDoInsight } from '../_lib/engajamento';

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

export interface InsightsDaLeelaProps {
  insights: InsightDaLeela[] | null;
  loading: boolean;
}

export function InsightsDaLeela({ insights, loading }: InsightsDaLeelaProps): JSX.Element {
  return (
    <CartaoV3 aria="Insights da Leela" elev={2} padding="lg">
      <EyebrowV3 icon={<Sparkles />}>Insights da Leela</EyebrowV3>
      {/* O template diz "das últimas 4 semanas". NENHUMA derivação desta tela
          tem janela temporal — os números são retrato de agora — então a
          promessa de período sairia falsa. A frase diz o que é verdade: a
          leitura é do recorte que o seletor do topo está aplicando. */}
      <p className="-mt-[var(--spacing-2)] mb-[var(--spacing-4)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)] text-pretty">
        Leitura automática dos números deste recorte.
      </p>

      {loading || insights === null ? (
        <p
          role="status"
          aria-label="Lendo os números da comunidade"
          className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
        >
          Lendo os números da comunidade…
        </p>
      ) : insights.length === 0 ? (
        // Mesmo princípio do "Tudo em dia" dos alertas: ausência de insight é
        // uma informação boa, e ela se diz em uma linha — não com um card
        // vazio, que lê como bloco quebrado.
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Nada pedindo atenção neste recorte.
        </p>
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
                actions={
                  /* O caminho é âncora de página, não rota: a casa do fato
                     está nesta mesma tela, mais abaixo. É ele que declara o
                     papel distinto exigido pela RN-573 — sem caminho, o
                     insight seria cópia do número do gráfico. */
                  <a
                    href={`#${insight.ancora}`}
                    className={cn(
                      'inline-flex items-center gap-[var(--spacing-2)]',
                      'text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)]',
                      'underline underline-offset-2',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
                    )}
                  >
                    {insight.caminho}
                  </a>
                }
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

InsightsDaLeela.displayName = 'InsightsDaLeela';
