// =============================================================================
// apps/landing/test/setup.ts — o aquecimento do barril do DS (S1260).
//
// POR QUE ISTO EXISTE. O barril do design-system é caro de avaliar em jsdom
// (recharts e os primitivos do Radix custam segundos de verdade, mesmo vindo do
// dist bundlado e carregados pelo Node). Esse custo não some; o que se decide é
// ONDE ele é cobrado.
//
// Antes, ele era cobrado dentro do PRIMEIRO caso de cada arquivo — o caso que
// por acaso renderizasse primeiro pagava o import inteiro contra o próprio teto
// de tempo (5s no default do vitest). O caso estourava por IMPORT, nunca por
// comportamento, e o `act()` que ficava pendente contaminava os casos seguintes
// do mesmo arquivo. Era assim que `definir-senha-s1223` reprovava 13 de 13
// sozinho, e era daí que vinha a instabilidade entre execuções: o mesmo import
// oscila com a contenção de CPU dos workers, e o teto ficava ora acima, ora
// abaixo do custo.
//
// Aquecendo aqui, o custo passa a ser cobrado no HOOK de setup, que tem teto
// próprio e generoso (`hookTimeout`), e todo caso de teste começa com o módulo
// já resolvido. O teto do caso volta a medir o que deveria medir: o
// comportamento da tela.
//
// ⚠️ Só o DS é aquecido, de propósito. `@leela/api-client` e `@leela/core` ficam
// de FORA porque os arquivos de teste os substituem por `vi.mock`, e pré-carregar
// um módulo que o teste pretende trocar deixaria a instância real no cache.
// Nenhum teste mocka o design-system — por isso ele pode ser aquecido sem risco.
// =============================================================================
import '@/app/_ds/ds';
