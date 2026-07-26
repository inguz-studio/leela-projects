// =============================================================================
// RotasLegadas — RN-234: rota antiga NUNCA quebra.
//
// A rodada IA-MENU mudou o endereço de duas telas e o nível de uma terceira. O
// Vitor usa o preview local com URL na mão e há links salvos apontando para
// `/financeiro`. Um redirect ausente não dá erro no build — dá 404 na cara de
// quem clicou. Por isso cada linha da tabela abaixo é um TESTE de rota, não uma
// boa intenção (`__tests__/RotasLegadas.test.tsx`).
//
// Padrão escolhido (delegado à lane em 00-decisao §8): redirecionamento na
// ENTRADA da rota, com `replace` para não empilhar histórico — sem camada nova,
// sem configuração de servidor, sem estado. `replace` também é o que garante
// que o "voltar" do navegador não devolva a pessoa à URL morta.
//
// A tabela é a de `01-mapa-de-para.md`, copiada, e é a MESMA que o teste
// orientado a tabela percorre — App.tsx e teste não podem divergir porque
// consomem esta fonte única.
//
// FORA daqui, de propósito: `/crm/:clienteKey` → `/crm/clientes/:clienteKey`.
// Esse redirect vive dentro do `CrmRoutes`, onde a subárvore `/crm/*` é
// declarada, porque depende da PRECEDÊNCIA sobre as subdivisões nomeadas
// (`clientes`, `comunicacao`, `visao-geral`) — separá-lo do lugar que declara
// essa ordem é como o laço de redirecionamento nasce.
// =============================================================================

import { Navigate, Route } from 'react-router-dom';

/** Uma linha do mapa DE→PARA (fonte única de App.tsx e do teste). */
export interface RedirectLegado {
  /** Padrão de rota (sintaxe react-router). */
  de: string;
  /** Destino absoluto. */
  para: string;
}

/**
 * Redirects de PREFIXO do módulo `financeiro`, que deixou de existir.
 * A ordem aqui é documental: quem decide a precedência é o ranking do
 * react-router (segmento estático vence splat), e o teste prova.
 */
export const REDIRECTS_LEGADOS: readonly RedirectLegado[] = [
  // Repasses viraram subdivisão de Eventos (RN-366).
  { de: '/financeiro/repasses', para: '/eventos/repasses' },
  // A análise de vendas virou CRM › Visão geral (RN-823). Qualquer outro
  // caminho do módulo morto cai no mesmo lugar: o 404 do módulo deixou de
  // existir junto com o módulo.
  { de: '/financeiro/*', para: '/crm' },
];

/**
 * As rotas de redirecionamento, para espalhar dentro de um `<Routes>`:
 * `<Routes>…{rotasLegadas()}</Routes>`.
 *
 * É uma FUNÇÃO que devolve um array de `<Route>`, e não um componente: o
 * `<Routes>` do react-router só aceita `<Route>` ou `React.Fragment` como
 * filhos e lança em runtime diante de qualquer outro componente — inclusive um
 * que devolva Routes por dentro. Array funciona porque o
 * `createRoutesFromChildren` achata os filhos.
 */
export function rotasLegadas(): JSX.Element[] {
  return REDIRECTS_LEGADOS.map(({ de, para }) => (
    <Route key={de} path={de} element={<Navigate to={para} replace />} />
  ));
}
