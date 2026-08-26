// =============================================================================
// apps/landing/lib/fatosVitrine.ts
//
// Os NÚMEROS que a home mostra acima da dobra. Módulo próprio, puro, com teste —
// porque prova social é a única coisa da página que não pode estar "quase
// certa": um número torto na primeira dobra vale menos que nenhum número.
//
// A régua desta rodada (01-research, padrão 2 + antipadrões): prova social só
// entra se for ESPECÍFICA e VERIFICÁVEL. Nada aqui é depoimento, logo de
// parceiro ou "milhares de atletas" — são contagens derivadas, na hora, da
// mesma lista de eventos que a página já leu, e quem quiser conferir rola
// vinte pixels e conta os cards.
// =============================================================================

/**
 * A cidade que um `local` de evento nomeia.
 *
 * O campo `local` é texto livre digitado pelo organizador e, na prática, vem
 * em três formas (medidas no seed e nos fixtures de produção):
 *
 *   "Parque de Coqueiros, Florianópolis/SC"  → local + cidade/UF
 *   "Florianópolis/SC"                       → só cidade/UF
 *   "Campeche — Florianópolis/SC"            → bairro em travessão + cidade/UF
 *
 * A cidade é sempre o ÚLTIMO trecho depois de vírgula ou travessão, sem a UF.
 * Se nada disso casar, devolve o texto inteiro normalizado: contar um local
 * como uma cidade é errar por um; inventar um separador é errar por qualquer
 * número.
 */
export function cidadeDoLocal(local: string): string {
  const ultimoTrecho = local
    .split(/[,—–-]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .at(-1);

  const bruto = ultimoTrecho ?? local.trim();
  // Tira a UF ("Florianópolis/SC" → "Florianópolis"); um `/` sem UF depois
  // (nome com barra) não é tratado como sigla e o texto sobrevive inteiro.
  const semUf = bruto.replace(/\s*\/\s*[A-Za-z]{2}$/u, '');
  return (semUf.length > 0 ? semUf : bruto).trim();
}

/**
 * As cidades DISTINTAS da vitrine, comparadas sem diferença de caixa ou de
 * acento — "Florianópolis" e "FLORIANOPOLIS" digitados por dois organizadores
 * são uma cidade só, e contá-las como duas seria inflar a prova social por
 * defeito de digitação alheia. A forma devolvida é a PRIMEIRA grafia vista,
 * que é a que a pessoa reconhece.
 */
export function cidadesDaVitrine(eventos: readonly { local: string }[]): string[] {
  const vistas = new Map<string, string>();
  for (const e of eventos) {
    const cidade = cidadeDoLocal(e.local);
    if (cidade.length === 0) continue;
    const chave = cidade
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('pt-BR');
    if (!vistas.has(chave)) vistas.set(chave, cidade);
  }
  return [...vistas.values()];
}
