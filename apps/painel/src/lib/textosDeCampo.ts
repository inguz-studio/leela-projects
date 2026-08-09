// =============================================================================
// apps/painel/src/lib/textosDeCampo.ts
//
// As frases de tela do PARSE-1, num lugar só.
//
// ── por que este módulo existe
//
// O corte de 09/08 fechou o item PARSE-1 com uma condição escrita: "cada uma é
// uma string", e o item reabre quando o dono reescrever qualquer uma delas.
// Frase espalhada em JSX é frase que custa uma varredura para trocar — e a
// régua do ponto e da vírgula aparece em CINCO campos, então trocá-la no JSX
// custaria cinco edições e uma chance de divergir.
//
// Nenhuma frase daqui foi inventada na tarefa. A origem de cada uma está
// anotada na constante, e é o texto proposto no painel do dono (item PARSE-1,
// "As cinco, em ordem de peso"), que por sua vez veio de
// `.nirvana/handoffs/leela-parse-REV.md` §"Para o dono".
// =============================================================================

/**
 * A régua do ponto e da vírgula, embaixo dos CINCO campos de dinheiro
 * alcançáveis (preço do lote, preço do kit, valor do cupom, repasse do
 * influenciador e condição de desconto da parceria).
 *
 * É a frase de maior peso do item: a decisão de ler "1.234" como milhar é do
 * dono, de 05/08, está no ar, e até aqui morava SÓ no cabeçalho de
 * `packages/core/src/finance/parseValorPtBr.ts`. Quem usa teclado numérico e
 * escreve três casas grava mil vezes mais — o custo é declarado na decisão, e
 * esta frase é a mitigação que ela previu.
 *
 * Texto proposto, verbatim.
 */
export const REGUA_PONTO_E_VIRGULA =
  'O ponto separa o milhar (1.234 = mil duzentos e trinta e quatro). Para centavos, use vírgula (1,23).';

/**
 * Como se escreve mil no campo de vaga, ANTES do erro — a recusa do parser só
 * fala depois que a pessoa já errou.
 *
 * Texto proposto, verbatim.
 */
export const EXEMPLO_DE_MIL_NA_VAGA = 'Ex.: 1.000';

/**
 * O que acontece com a capacidade do kit em branco.
 *
 * ⚠️ Única das frases SEM texto literal no registro: o painel escreve o
 * diagnóstico ("Capacidade do kit em branco vale zero e a tela não avisa. Hoje
 * '0' significa tanto 'sem kit disponível' quanto 'não configurei'") e manda
 * avisar, sem propor a frase. Esta foi composta só com as palavras do próprio
 * item, e está declarada no handoff da lane para veto barato.
 */
export const CAPACIDADE_DE_KIT_EM_BRANCO = 'Em branco vale 0 (nenhum kit disponível).';

/**
 * O que acontece com o intervalo da automação em branco.
 *
 * O item oferecia recusar em vez de avisar; o corte escolheu AVISAR, então a
 * dica declara o padrão em vez de o formulário fechar o botão.
 *
 * Texto proposto, verbatim.
 */
export const INTERVALO_PADRAO_DA_AUTOMACAO = 'Sem preencher, a campanha sai 24 horas antes.';
