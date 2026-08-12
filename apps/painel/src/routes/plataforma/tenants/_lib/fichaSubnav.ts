// =============================================================================
// Puros da SubNav da FICHA DO TENANT (ADMIN-VISAO onda 2 · S1612-T1).
//
// A spec recusou sete rotas soltas por uma razão de trabalho (03-spec.md ·
// Parte 1): o dono não abre o painel para consultar "os clubs do Castelo", ele
// abre para ENTENDER uma produtora, e a pergunta seguinte muda conforme o que a
// primeira responde. Sete cliques entre eventos e faturamento é sete
// oportunidades de perder o fio. Então é UMA rota com abas.
//
// A aba TERMOS já existe e está no ar (`tenants/:tenantId/termos`). Ela entra
// na barra sem mudar de comportamento: vira filha do mesmo layout e a tela
// dela não é tocada.
//
// O que mora aqui é só a regra que a tela não pode inventar na hora de
// renderizar: quais abas existem, em que ordem, e qual delas está ativa para um
// dado pathname. Puro e testável sem router.
// =============================================================================

/** Identidade estável de cada aba (id do SubNavTab e chave dos testes). */
export type AbaDaFicha =
  | 'resumo'
  | 'eventos'
  | 'clubs'
  | 'clientes'
  | 'vendas'
  | 'financeiro'
  | 'termos';

export interface DefinicaoDeAba {
  id: AbaDaFicha;
  label: string;
  /**
   * Segmento depois de `/plataforma/tenants/:tenantId`. Vazio = a própria
   * ficha (Resumo), que é a rota índice e continua sendo a que já está no ar.
   */
  segmento: string;
}

/**
 * As sete abas, na ordem da spec: primeiro quem é a produtora (Resumo), depois
 * o que ela produz (Eventos, Clubs), para quem (Clientes), quanto vendeu
 * (Vendas), o que isso virou de dinheiro (Financeiro) e sob que contrato
 * (Termos).
 */
export const ABAS_DA_FICHA: readonly DefinicaoDeAba[] = [
  { id: 'resumo', label: 'Resumo', segmento: '' },
  { id: 'eventos', label: 'Eventos', segmento: 'eventos' },
  { id: 'clubs', label: 'Clubs', segmento: 'clubs' },
  { id: 'clientes', label: 'Clientes', segmento: 'clientes' },
  { id: 'vendas', label: 'Vendas', segmento: 'vendas' },
  { id: 'financeiro', label: 'Financeiro', segmento: 'financeiro' },
  { id: 'termos', label: 'Termos', segmento: 'termos' },
];

/** Caminho absoluto da ficha de um tenant, sem barra no fim. */
export function caminhoDaFicha(tenantId: string): string {
  return `/plataforma/tenants/${tenantId}`;
}

/**
 * Caminho absoluto de uma aba. O Resumo é a rota índice, então o segmento
 * vazio devolve a própria ficha (e não um caminho terminado em barra, que o
 * router trataria como outra URL).
 * @pure
 */
export function caminhoDaAba(tenantId: string, aba: DefinicaoDeAba): string {
  const base = caminhoDaFicha(tenantId);
  return aba.segmento === '' ? base : `${base}/${aba.segmento}`;
}

/**
 * Qual aba um pathname está mostrando.
 *
 * A regra é o PRIMEIRO segmento depois da base — não `startsWith` sobre a
 * string inteira, que casaria `/plataforma/tenants/abc-2` com o tenant `abc`
 * e acenderia a aba errada numa ficha vizinha. Segmento desconhecido cai em
 * `resumo`, que é a rota índice: a barra nunca fica sem aba acesa.
 * @pure
 */
export function abaAtivaDoPath(pathname: string, tenantId: string): AbaDaFicha {
  const base = caminhoDaFicha(tenantId);
  if (pathname === base || pathname === `${base}/`) return 'resumo';
  if (!pathname.startsWith(`${base}/`)) return 'resumo';

  const resto = pathname.slice(base.length + 1);
  const primeiro = resto.split('/')[0] ?? '';
  const achada = ABAS_DA_FICHA.find((a) => a.segmento !== '' && a.segmento === primeiro);
  return achada ? achada.id : 'resumo';
}

/**
 * O Resumo já traz o próprio cabeçalho de contexto (a tela que está no ar
 * desde a S1601-T4, com nome, slug, badges e as ações de ciclo de vida). As
 * outras abas não trazem — e sem isso o operador lê uma tabela sem saber de
 * quem ela é.
 *
 * Então a faixa de identidade do layout aparece em TODAS as abas MENOS no
 * Resumo. É o que evita o nome duplicado na tela sem reescrever o Resumo, que
 * a tarefa proíbe explicitamente.
 * @pure
 */
export function precisaDeFaixaDeIdentidade(aba: AbaDaFicha): boolean {
  return aba !== 'resumo';
}
