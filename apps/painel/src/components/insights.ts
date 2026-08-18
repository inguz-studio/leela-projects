// =============================================================================
// O contrato dos "Insights da Leela" — a camada de RESUMO COM CAMINHO (RN-573),
// num lugar só (VG-INSIGHTS · leva 23).
//
// POR QUE ESTE ARQUIVO EXISTE, e a razão é a mesma do `SecaoHead` ao lado: a
// anatomia nasceu na tela de Engajamento (lane ENG-INSIGHTS, 17/08) e a Visão
// geral é a SEGUNDA tela a montá-la. Duas telas com o mesmo tipo escrito duas
// vezes é como o número de uma delas começa a divergir do da outra — e a
// RN-568 (composição recorrente vira peça) manda promover antes da terceira,
// não depois. O tipo mora aqui, o bloco mora no `InsightsDaLeela.tsx` ao lado,
// e as DERIVAÇÕES continuam em cada rota: o que é comum é a FORMA do insight,
// nunca a conta — cada tela deriva do dado que ela mesma carrega.
//
// Puro de propósito (`.ts`, zero JSX): as derivações das rotas são `@pure` e
// não podem importar arquivo de tela para pegar um tipo.
// =============================================================================

/**
 * Tom do insight. `atencao` é o que está pesando contra agora; `oportunidade`
 * é o que está sobre a mesa e ninguém pegou. São os dois tons do template do
 * dono (`engajamento-referencia.dc.html` l.1484), e não existe um terceiro: um
 * insight que não pede ação nem abre porta é uma frase decorativa.
 */
export type TomDoInsight = 'atencao' | 'oportunidade';

/**
 * Para onde o caminho leva — e as duas formas existem porque as duas casas
 * existem de verdade.
 *
 * `ancora` é o caso do Engajamento: a casa do fato é um bloco MAIS ABAIXO na
 * mesma tela, e o destino é a âncora dele. `rota` é o caso da Visão geral:
 * fatos do portfólio inteiro (pendências de pagamento, eventos em rascunho)
 * não têm bloco próprio nesta tela — a casa deles é outra área do painel, e
 * apontar para um bloco daqui seria caminho falso.
 *
 * União fechada, e não um par de campos opcionais: com `ancora?` + `rota?` dá
 * para escrever um insight com os dois (ou com nenhum), e "insight sem caminho
 * não entra" deixaria de ser garantia do tipo para virar lembrete.
 */
export type DestinoDoInsight =
  | { tipo: 'ancora'; id: string }
  | { tipo: 'rota'; href: string };

/**
 * Uma leitura automática dos números que a tela já tem.
 *
 * O `destino` não é enfeite, é o que torna o bloco legal sob a RN-573. Um
 * insight é, por construção, um número que já aparece em outro lugar — e a
 * regra-mãe diz que aparição fora da casa do dado é "resumo COM CAMINHO, nunca
 * cópia". Então todo insight carrega o caminho para a casa do próprio fato, e
 * o papel distinto fica DECLARADO: o bloco responde "como isto está", o
 * insight responde "o que nisso pede ação agora".
 */
export interface InsightDaLeela {
  id: string;
  tom: TomDoInsight;
  /** Rótulo do tom EM TEXTO ("Atenção"/"Oportunidade") — cor sozinha reprova na 1.4.1. */
  tag: string;
  /** A frase do insight. É frase, não nome — por isso o bloco não a trunca. */
  titulo: string;
  detalhe: string;
  destino: DestinoDoInsight;
  /** Rótulo do link que leva à casa do fato. */
  caminho: string;
}
