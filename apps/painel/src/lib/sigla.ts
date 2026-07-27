// =============================================================================
// sigla — letra de recuo para a miniatura de uma entidade sem imagem.
//
// Existe para que as listagens que exibem miniatura (kits do evento, marcas)
// usem A MESMA letra pela MESMA regra. A antiga `LogoCell` de `/marcas` já
// fazia isso inline; ao nascer a segunda superfície, a regra virou função em
// vez de virar cópia.
//
// Uma letra, não duas: quem diferencia o item é o nome escrito ao lado da
// miniatura. A letra só precisa manter a caixa íntegra e legível — o job do
// fallback é ser DIGNO, não carregar identificação sozinho. Nome vazio ou só
// com espaços devolve travessão (o "—" honesto da casa), nunca string vazia,
// que deixaria a caixa parecendo imagem que não carregou.
// =============================================================================

/** Primeira letra do nome em maiúscula; travessão quando não há nome. @pure */
export function siglaDe(nome: string | null | undefined): string {
  const limpo = (nome ?? '').trim();
  if (limpo.length === 0) return '—';
  // `charAt` não é seguro para pares surrogate (emoji, por exemplo); o
  // iterador de string entrega o primeiro code point inteiro.
  const primeiro = Array.from(limpo)[0] ?? '—';
  return primeiro.toLocaleUpperCase('pt-BR');
}
