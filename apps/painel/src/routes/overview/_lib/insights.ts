// =============================================================================
// Insights da Leela na VISÃO GERAL — derivação PURA (VG-INSIGHTS · leva 23).
//
// A COBRANÇA QUE ESTE ARQUIVO PAGA, na íntegra: *"nao foi o que pedi. Já falei
// para enriquecermos a visao geral, e os insights da leela devem estar lá."* É
// a segunda vez que o dono pede o mesmo bloco. A primeira nasceu no
// Engajamento (lane ENG-INSIGHTS, ontem) porque era o template que estava na
// mão; a tela que ele pediu era esta.
//
// A REGRA DE FONTE É A MESMA DA OUTRA TELA, e vale repetir porque é ela que
// separa insight de invenção: cada número aqui sai de algo que a Visão geral
// JÁ carrega — o retorno de `getOverview` (KPIs + alerts) e a listagem de
// eventos do organizador. Zero query nova, zero fan-out, zero leitura extra.
//
// AS TRÊS DERIVAÇÕES DO TEMPLATE DO DONO (`engajamento-referencia.dc.html`
// l.1484), e por que só uma delas está aqui — a evidência de cada uma está no
// handoff da ENG-INSIGHTS, medida contra o banco e o core:
//
//   1. "R$ 1.240 aguardando pagamento · 9 Pix pendentes há +48h" — a fonte
//      existe e a casa é ESTA. Entra, na versão por CONTAGEM. Duas correções
//      de verdade viajam junto: (a) **as 48h do template são invenção** — as
//      constantes da casa são `PENDENTE_ALERTA_HORAS = 24` e
//      `HORAS_INADIMPLENCIA = 72`, e o número que chega é o de 24h; (b) **não
//      existe agregado de R$ pendente** em lugar nenhum, nem servidor nem
//      cliente (`aggregateProfessionalDashboard.ts` conta pendentes e nunca
//      soma valor). Somar em R$ exigiria fan-out por evento ou rollup novo de
//      Function — está nomeado como fila no handoff, não fingido aqui.
//   2. "3 inscrições incompletas" (carrinho abandonado) — o ledger é real
//      (`functions/src/checkout/carrinhoCheckout.ts`) e o painel não pode ler
//      um byte: as Rules o deixam DE PROPÓSITO sem `match`
//      (`firestore.rules:3101-3110`) e o registro não guarda etapa nem
//      identidade. Fica de fora.
//   3. "Seus clubs sustentam a recompra · 2,3x, 142 compradores" — não existe
//      identidade que ligue membro a comprador (`atletaId` mente por
//      construção, e a chave de CRM é HMAC com pepper só do servidor). Fica de
//      fora.
//
// RN-573 · A RECONCILIAÇÃO COM O `AlertsPanel`, e ela é o coração desta lane.
// Esta tela já tinha um bloco de avisos. Publicar as pendências nos dois
// lugares seria o mesmo fato duas vezes na mesma dobra — a violação literal da
// regra. A partição foi feita pelo que o próprio dado é, não por gosto:
//
//   · o `AlertsPanel` fica com os alertas DE EVENTO — `ocupacao-{slug}` e
//     `publicacao-{slug}`. Cada um tem dono, âncora temporal ("há 2h") e
//     destino (`/eventos/{slug}`). A pergunta dele é "o que aconteceu num
//     evento seu, e onde ir".
//   · os Insights ficam com as leituras DE CONJUNTO — o portfólio inteiro,
//     sem evento dono. A pergunta deles é "o que o conjunto está pedindo".
//
// E `pendentes-24h` sempre foi de conjunto: é o ÚNICO alerta do contrato
// agregado cross-evento, e o único que nasce **sem `href`**
// (`packages/core/src/overview/alerts.ts` — os outros dois carregam o do
// evento). Ele era, no painel de alertas, o item que não levava a lugar
// nenhum. Aqui ele ganha o caminho que lhe faltava. Nada foi apagado: o fato
// mudou de casa e subiu na tela, e a decisão está escrita no handoff como
// vetável do dono.
// =============================================================================

import type { OverviewAlert, OverviewKPIs, StatusEvento } from '@leela/core';
import type { InsightDaLeela } from '../../../components/insights';
import { formatInt } from './format';

/**
 * O alerta de conjunto que mudou de casa. Constante para os DOIS lados lerem
 * o mesmo nome: o painel exclui, o insight consome. Se um dia a partição se
 * perder, ela se perde nos dois ao mesmo tempo — nunca só num, que é como
 * nasceria a duplicata silenciosa.
 */
export const ALERTA_DE_CONJUNTO = 'pendentes-24h';

/** Prefixo do alerta de prazo de publicação (`publicacao-{slug}`). */
const PREFIXO_ALERTA_PUBLICACAO = 'publicacao-';

/**
 * Os alertas que o `AlertsPanel` continua publicando — os de EVENTO.
 *
 * A exclusão é do fato, não da severidade: um alerta de conjunto não deixa de
 * ser de conjunto por mudar de tom.
 * @pure
 */
export function alertasDeEvento(
  alerts: readonly OverviewAlert[] | null
): OverviewAlert[] | null {
  if (alerts === null) return null;
  return alerts.filter((a) => a.id !== ALERTA_DE_CONJUNTO);
}

/** Recorte de evento que a derivação precisa — subconjunto do que a tela já tem. */
export interface EventoInsightInput {
  slug: string;
  status: StatusEvento;
}

/** Plural pt-BR de uma contagem, sem `Intl.PluralRules` para o teste não depender de ICU. */
function plural(n: number, singular: string, muitos: string): string {
  return n === 1 ? singular : muitos;
}

/**
 * Os insights que o dado de HOJE sustenta na Visão geral, derivação por
 * derivação. Cada um só nasce quando tem o que dizer — insight de zero é ruído
 * com cara de aviso.
 * @pure
 */
export function derivarInsightsDaVisaoGeral(
  alerts: readonly OverviewAlert[] | null,
  eventos: readonly EventoInsightInput[] | null,
  kpis: OverviewKPIs | null
): InsightDaLeela[] {
  const insights: InsightDaLeela[] = [];

  // -------------------------------------------------------------------------
  // 1 · Pendências de pagamento — a derivação 1 do template, na casa certa.
  // -------------------------------------------------------------------------
  const pendentes = (alerts ?? []).find((a) => a.id === ALERTA_DE_CONJUNTO);
  if (pendentes) {
    insights.push({
      id: 'pagamentos-pendentes',
      tom: 'atencao',
      tag: 'Atenção',
      // O TÍTULO É O DO PRÓPRIO ALERTA, e isso é decisão, não preguiça. A
      // contagem e o corte de 24h são derivados no servidor por `derivarAlertas`
      // (fonte única); reescrever a frase aqui exigiria a contagem crua, que o
      // contrato não devolve — e arrancá-la de volta do texto por regex seria
      // um segundo caminho de cálculo sobre a mesma frase. O insight acrescenta
      // o que o alerta não tinha: tom, corpo e CAMINHO.
      titulo: pendentes.titulo,
      detalhe: `Inscrição pendente é vaga presa: ela ocupa lugar na lista e não virou receita. A mais recente entrou ${pendentes.quando}. Cada pendência está na lista de inscritos do evento dela.`,
      // Fato de CONJUNTO: ele não tem evento dono, e por isso não tem bloco
      // nesta tela para onde apontar. A casa real é a lista de inscritos de
      // cada evento, e o hub é o caminho honesto até lá.
      destino: { tipo: 'rota', href: '/eventos' },
      caminho: 'Ver seus eventos',
    });
  }

  // -------------------------------------------------------------------------
  // 2 · Eventos parados em rascunho — rascunho não vende.
  // -------------------------------------------------------------------------
  const idsDeAlerta = new Set((alerts ?? []).map((a) => a.id));
  const rascunhosSemAlerta = (eventos ?? []).filter(
    (e) =>
      e.status === 'rascunho' &&
      // Rascunho com prova próxima JÁ tem alerta próprio, com o prazo em dias
      // e o destino do evento. Contá-lo de novo aqui seria o mesmo fato na
      // mesma dobra (RN-573) — e a subtração é o que mantém a conta honesta em
      // vez de a frase pedir desculpa.
      !idsDeAlerta.has(`${PREFIXO_ALERTA_PUBLICACAO}${e.slug}`)
  ).length;
  if (rascunhosSemAlerta > 0) {
    insights.push({
      id: 'eventos-em-rascunho',
      tom: 'oportunidade',
      tag: 'Oportunidade',
      titulo: `${formatInt(rascunhosSemAlerta)} ${plural(rascunhosSemAlerta, 'evento seu ainda está em rascunho', 'eventos seus ainda estão em rascunho')}`,
      detalhe:
        'Rascunho não aparece na página pública e não recebe inscrição. Rascunho com prova próxima ganha alerta próprio, com o prazo em dias, e não entra nesta conta.',
      destino: { tipo: 'rota', href: '/eventos' },
      caminho: 'Ver seus eventos',
    });
  }

  // -------------------------------------------------------------------------
  // 3 · Comunidade sem nada para fazer — a leitura do PAR, que nenhum bloco faz.
  // -------------------------------------------------------------------------
  //
  // O bloco "Clubs" desenha os dois números lado a lado e não diz nada sobre a
  // relação entre eles; o `EmptyState` dele cobre o caso de comunidade vazia
  // (os DOIS em zero). O buraco entre os dois é este: gente dentro e nada
  // acontecendo. É o par que pede ação, e é a pergunta que só o insight faz.
  if (kpis && kpis.membrosAtivosTotais > 0 && kpis.desafiosAtivosTotais === 0) {
    insights.push({
      id: 'comunidade-sem-desafio',
      tom: 'oportunidade',
      tag: 'Oportunidade',
      titulo: `${formatInt(kpis.membrosAtivosTotais)} ${plural(kpis.membrosAtivosTotais, 'membro ativo', 'membros ativos')} e nenhum desafio rodando`,
      detalhe:
        'O desafio é o que dá o que fazer entre um evento e outro. Sem nenhum ativo, a comunidade fica sem pauta e o club vira lista de nomes.',
      destino: { tipo: 'rota', href: '/clubes' },
      caminho: 'Ver seus clubs',
    });
  }

  return insights;
}
