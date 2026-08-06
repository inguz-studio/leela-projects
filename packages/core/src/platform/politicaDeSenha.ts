// =============================================================================
// packages/core/src/platform/politicaDeSenha.ts
//
// A política de senha da casa — UMA autoridade, consumida por tela, por
// Function e por qualquer porta futura.
//
// POR QUE AQUI E NÃO NA TELA: o repo já pagou esse preço. Havia TRÊS pisos
// vivos ao mesmo tempo — `SENHA_CONTA_MIN` (6) no core, `SENHA_MIN_AFILIADO`
// (8) na Function de afiliado, `SENHA_MIN_ASSESSORIA` (8) copiado no
// api-client "como espelho de premissa". O comentário do próprio
// `contaParticipante.ts` já dizia o que fazer no dia em que a casa quisesse
// subir o piso: sobe num lugar só. Este é o lugar.
//
// -----------------------------------------------------------------------------
// O QUE O DONO PEDIU, E O QUE A LITERATURA DIZ
// -----------------------------------------------------------------------------
// Pedido, verbatim: "colocarmos uma regra de segurança na senha para ela ter um
// caractere especial … com a regra de ter numeros e um caractere especial", e
// "indicar que a senha está fraca ou forte". Está construído abaixo, inteiro.
//
// Registro honesto, para o dono decidir com o dado na mão: regra de COMPOSIÇÃO
// é a parte fraca da política moderna. O NIST SP 800-63B (rev. 3, §5.1.1.2)
// recomenda EXPLICITAMENTE não impor regras de composição e priorizar
// comprimento + bloqueio de senhas vazadas, porque composição empurra a pessoa
// para `Senha1!` — oito caracteres que atendem a todos os requisitos e são a
// primeira coisa que um ataque de dicionário tenta. Por isso duas escolhas
// deliberadas aqui:
//
//   1. O piso subiu de 6 para 8 (SENHA_MIN). Oito é o mínimo do próprio NIST e
//      é o número que as duas portas de convite já usavam — unificar para baixo
//      seria afrouxar produção. Nenhuma senha existente é revalidada; o piso só
//      vale para senha NOVA.
//   2. A força NÃO fica verde só porque a regra passou. `Senha1!` atende os
//      três requisitos e sai FRACA, porque o medidor mede comprimento e
//      variedade além da regra. Um medidor que premia o mínimo ensina o mínimo.
//
// PROPOSTA AO DONO (decisão dele, não minha): subir SENHA_MIN para 12. O NIST
// recomenda 15 para senha escolhida por pessoa; 12 é o meio-termo que ainda
// cabe numa senha digitada no celular. Mudar é editar a constante abaixo — os
// dois apps e as três Functions passam a exigir junto, no mesmo commit.
//
// -----------------------------------------------------------------------------
// FRONTEIRA: ISTO É REGRA, NÃO GARANTIA
// -----------------------------------------------------------------------------
// Onde a senha nasce numa Function nossa (`provisionAfiliado`,
// `provisionAssessoria`, `confirmarCodigoDeAcesso`), esta função é a
// autoridade e o navegador não tem como passar por cima. Onde o navegador fala
// DIRETO com o Identity Platform (`createUserWithEmailAndPassword`,
// `confirmPasswordReset`, `updatePassword`), nenhuma linha deste arquivo roda
// no servidor: a única trança server-side possível é a política de senha
// nativa do Identity Platform, que é configuração de projeto e não de repo.
// Enquanto ela não estiver ligada, para essas três portas isto é orientação de
// interface. Está dito no relatório da lane, com a lista das portas.
// =============================================================================

// ---------------------------------------------------------------------------
// Os números
// ---------------------------------------------------------------------------

/**
 * Piso de comprimento da senha. 8 = mínimo do NIST SP 800-63B e o piso que as
 * portas de convite (afiliado, assessoria) já praticavam. Ver a proposta de
 * subir para 12 no cabeçalho.
 */
export const SENHA_MIN = 8;

/** Teto do Identity Platform. Existe para o campo não virar vetor de payload. */
export const SENHA_MAX = 4096;

/** A partir daqui o comprimento deixa de ser o gargalo (heurística do medidor). */
const SENHA_CONFORTAVEL = 12;

/**
 * Caracteres que contam como "especial".
 *
 * O conjunto é COPIADO, caractere por caractere, da lista que o Identity
 * Platform publica como "non-alphanumeric" na política de senha nativa dele
 * (docs.cloud.google.com/identity-platform/docs/password-policy, consultada em
 * 2026-08-06). Isso não é detalhe: se a casa ligar a política no servidor, uma
 * tela com conjunto próprio aceitaria senha que o servidor recusa, e a pessoa
 * ficaria presa num formulário que se contradiz sem dizer por quê.
 *
 * ⚠ REPARE NO QUE NÃO ESTÁ AQUI: `-`, `+` e `=`. O hífen é o primeiro
 * caractere que uma pessoa brasileira usa (`senha-forte-123`) e a primeira
 * versão desta lista o incluía por reflexo — com a política nativa ligada,
 * essa senha passaria na tela e morreria no servidor. Não acrescente nenhum
 * caractere aqui sem que ele esteja na lista deles.
 */
const ESPECIAIS = new Set('^$*.[]{}()?"!@#%&/\\,><\':;|_~`'.split(''));

// ---------------------------------------------------------------------------
// O contrato
// ---------------------------------------------------------------------------

/** Os três requisitos que o dono pediu, um booleano cada. */
export interface RequisitosSenha {
  /** Pelo menos `SENHA_MIN` caracteres (e no máximo `SENHA_MAX`). */
  comprimento: boolean;
  /** Pelo menos um dígito. */
  numero: boolean;
  /** Pelo menos um caractere especial. */
  especial: boolean;
}

/**
 * Níveis do medidor. O dono falou em "fraca ou forte"; são TRÊS porque dois
 * transformam o medidor num segundo semáforo do botão: ele viraria verde no
 * caractere que atende a regra e nunca mais se mexeria, e a pessoa não teria
 * nenhum motivo para passar do mínimo. Com "média" no meio, atender a regra
 * ainda deixa terreno visível à frente — que é o único trabalho que um medidor
 * faz de verdade. `vazia` não é um nível: é a ausência de senha, e existe para
 * a interface não anunciar "fraca" a um campo em branco.
 */
export type ForcaSenha = 'vazia' | 'fraca' | 'media' | 'forte';

export interface AvaliacaoSenha {
  requisitos: RequisitosSenha;
  /** Os três requisitos atendidos — é ISTO que libera o envio. */
  atende: boolean;
  forca: ForcaSenha;
  /** Rótulo pronto para a tela (o medidor nunca é só cor). */
  rotulo: string;
  /** O que falta, em português, na ordem em que o dono lê. Vazio se atende. */
  pendencias: readonly string[];
}

const ROTULO: Record<ForcaSenha, string> = {
  vazia: '',
  fraca: 'Fraca',
  media: 'Média',
  forte: 'Forte',
};

// ---------------------------------------------------------------------------
// A avaliação
// ---------------------------------------------------------------------------

function temNumero(senha: string): boolean {
  for (const c of senha) if (c >= '0' && c <= '9') return true;
  return false;
}

function temEspecial(senha: string): boolean {
  for (const c of senha) if (ESPECIAIS.has(c)) return true;
  return false;
}

function temMinuscula(senha: string): boolean {
  return senha !== senha.toUpperCase();
}

function temMaiuscula(senha: string): boolean {
  return senha !== senha.toLowerCase();
}

/**
 * Força, medida em cima do que a senha É — não do tamanho da string.
 *
 * A regra do dono é PISO, não teto: sem os três requisitos a senha nunca passa
 * de fraca, porque chamar de "média" algo que o formulário vai recusar é
 * mentir para quem digita. Acima do piso, o que move o medidor é comprimento e
 * variedade de classes, que é onde mora a entropia de verdade.
 *
 * `Senha1!` (8 caracteres, os três requisitos, quatro classes) sai FRACA de
 * propósito: é curta e é o exemplo canônico de senha que passa em regra de
 * composição e cai em dicionário. `guarda-chuva no 7o andar!` sai FORTE sem
 * ter maiúscula nenhuma.
 */
function medirForca(senha: string, requisitos: RequisitosSenha): ForcaSenha {
  if (senha.length === 0) return 'vazia';
  const atende = requisitos.comprimento && requisitos.numero && requisitos.especial;
  if (!atende) return 'fraca';

  // Repetição pura (`aaaa1111!!!!`) tem comprimento e requisitos e não tem
  // segredo nenhum. Contar caracteres DISTINTOS é o teste barato que a pega.
  const distintos = new Set(senha).size;
  if (distintos < 6) return 'fraca';

  const classes =
    (temNumero(senha) ? 1 : 0) +
    (temEspecial(senha) ? 1 : 0) +
    (temMinuscula(senha) ? 1 : 0) +
    (temMaiuscula(senha) ? 1 : 0);

  if (senha.length >= SENHA_CONFORTAVEL && classes >= 3) return 'forte';
  if (senha.length >= SENHA_CONFORTAVEL + 4) return 'forte'; // frase longa vence classe
  if (senha.length >= SENHA_MIN + 2) return 'media';
  return 'fraca';
}

/**
 * Avalia uma senha contra a política da casa. PURA e total: aceita `unknown`
 * porque também é chamada com corpo de requisição não confiável nas Functions.
 * @pure
 */
export function avaliarSenha(senha: unknown): AvaliacaoSenha {
  const alvo = typeof senha === 'string' ? senha : '';
  const requisitos: RequisitosSenha = {
    comprimento: alvo.length >= SENHA_MIN && alvo.length <= SENHA_MAX,
    numero: temNumero(alvo),
    especial: temEspecial(alvo),
  };
  const atende = requisitos.comprimento && requisitos.numero && requisitos.especial;
  const forca = medirForca(alvo, requisitos);

  const pendencias: string[] = [];
  if (!requisitos.comprimento) {
    pendencias.push(
      alvo.length > SENHA_MAX
        ? `no máximo ${SENHA_MAX} caracteres`
        : `pelo menos ${SENHA_MIN} caracteres`,
    );
  }
  if (!requisitos.numero) pendencias.push('um número');
  if (!requisitos.especial) pendencias.push('um caractere especial');

  return { requisitos, atende, forca, rotulo: ROTULO[forca], pendencias };
}

/**
 * A senha pode ser aceita? É esta função que habilita botão de envio e que as
 * Functions chamam antes de `createUser`/`updateUser`.
 * @pure
 */
export function senhaValida(senha: unknown): boolean {
  return avaliarSenha(senha).atende;
}

/**
 * A exigência inteira em uma frase — para dica de campo e para a mensagem de
 * erro da Function dizerem a MESMA coisa. Uma frase só, num lugar só: é assim
 * que a tela e o servidor param de se contradizer.
 * @pure
 */
export function exigenciaDeSenha(): string {
  return `Use pelo menos ${SENHA_MIN} caracteres, com um número e um caractere especial.`;
}
