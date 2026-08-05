// =============================================================================
// packages/core/src/auth/codigoDeAcesso.ts
//
// O código de seis dígitos do primeiro acesso e da criação de conta — parte
// PURA (RN-476 · SPEC-CONTAS-LANDING).
//
// POR QUE O CONTRATO MORA NO CORE: as duas telas da landing
// (`/primeiro-acesso` e `/criar-conta`) precisam da MESMA régua que o servidor
// aplica — quantos dígitos, o que é forma válida, quanto tempo o código vive,
// quantas tentativas restam. A lição do DEF-A da ONBOARD-REV é literal: régua
// de tela mais frouxa que a do servidor produz conta órfã, e nenhuma régua
// nova nasce na tela.
//
// O QUE **NÃO** MORA AQUI, e por quê: o digest, o pepper e a transação de
// consumo vivem em `functions/src/auth/codigoDeAcesso.ts`. O core é dependência
// de `apps/landing` (Next), `apps/painel` (Vite) e `apps/mobile` (Expo), e um
// `import ... from 'node:crypto'` no topo deste pacote entra no bundle de
// CLIENTE. É a mesma partição que `qrToken` e `linkIngresso` já praticam, e a
// razão de segurança é mais forte aqui: o pepper do HMAC não pode existir em
// nenhum artefato que chegue ao navegador.
//
// A ENTROPIA É A DO SISTEMA (RN-476). O sorteio reusa `sorteioUniforme` do
// `aleatorio.ts`, que é a MESMA fonte dos outros cinco geradores da casa
// (código da compra, do ingresso, de convite de clube, de afiliado e de
// organizador). `Math.random` foi varrido do repositório em 05/08 —
// `61776052`, `8d779dce`, `20a9c904` — e nascer previsível aqui reintroduziria
// na mesma semana, num mecanismo de CREDENCIAL, o defeito que a casa acabou de
// fechar.
// =============================================================================

import { sorteioUniforme } from '../aleatorio';

// ---------------------------------------------------------------------------
// Forma do código
// ---------------------------------------------------------------------------

/**
 * Seis dígitos decimais (RN-476), por decisão do dono na fala de 05/08.
 *
 * Registrado como DECISÃO e não como cópia verificada: a pesquisa da rodada
 * não achou fonte dizendo que a Cheers usa seis dígitos (a recuperação
 * documentada dela é LINK), e quem documenta seis é a Sympla. Quem um dia
 * quiser mudar para oito precisa de argumento próprio — não há autoridade
 * externa a invocar.
 */
export const TAMANHO_CODIGO_ACESSO = 6;

/** Alfabeto decimal. `000123` é código válido — ver `gerarCodigoDeAcesso`. */
export const ALFABETO_CODIGO_ACESSO = '0123456789';

/**
 * Forma aceita, ancorada nas duas pontas.
 *
 * Sem as âncoras, `'abc123456xyz'` casaria e a comparação seguiria adiante com
 * lixo — e é a comparação que decide credencial.
 */
export const CODIGO_ACESSO_RE = /^[0-9]{6}$/;

/**
 * Prazo do código: DEZ minutos (RN-476).
 *
 * É credencial de sessão, e a referência de mercado achada são os quinze
 * minutos da Sympla. Por contraste deliberado, a RN-420 registra que o link do
 * ingresso NÃO tem prazo, porque ele é comprovante de compra aberto meses
 * depois. Confundir os dois em qualquer direção produz erro.
 */
export const CODIGO_ACESSO_TTL_MS = 10 * 60_000;

/**
 * Teto de tentativas POR CÓDIGO (RN-476). Ao esgotar, o código morre inteiro —
 * não só aquela requisição.
 *
 * A conta que obriga o teto: seis dígitos são 10⁶ combinações, e um código
 * vivo por dez minutos sem teto é força bruta resolvida numa tarde. Com o
 * teto, o atacante ganha cinco tentativas por código emitido, e emitir passa
 * pelo limitador por alvo.
 */
export const CODIGO_ACESSO_MAX_TENTATIVAS = 5;

// ---------------------------------------------------------------------------
// Limitador por ALVO (RN-476) — o servidor aplica; a tela só explica
// ---------------------------------------------------------------------------

/** Três pedidos em quinze minutos por endereço (a janela do dedo nervoso). */
export const CODIGO_ACESSO_LIMITE_CURTO = 3;
export const CODIGO_ACESSO_JANELA_CURTA_MS = 15 * 60_000;

/** Dez pedidos em vinte e quatro horas por endereço (o ataque paciente). */
export const CODIGO_ACESSO_LIMITE_LONGO = 10;
export const CODIGO_ACESSO_JANELA_LONGA_MS = 24 * 60 * 60_000;

// ---------------------------------------------------------------------------
// Normalização do endereço
// ---------------------------------------------------------------------------

/** Teto bruto do endereço, no mesmo valor que `solicitarRedefinicaoSenha` usa. */
export const EMAIL_CODIGO_MAX = 254;

/**
 * O endereço na forma em que ele entra no material do HMAC e na chave do
 * limitador.
 *
 * Normalizar é obrigatório e não é cosmético: o digest é
 * `HMAC(pepper, "<e-mail>:<código>")`, então `Ana@Leela.com` e `ana@leela.com`
 * produziriam digests diferentes para o MESMO código. Sem uma normalização só,
 * a mesma pessoa teria dois baldes de limitador e dois códigos vivos, e o
 * "um código vivo por endereço" da RN-476 viraria "um por grafia".
 * @pure
 */
export function normalizarEmailCodigo(email: unknown): string {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Forma plausível de endereço — a mesma régua leve do resto da casa (o
 * servidor é quem decide de verdade, e o provedor de e-mail depois dele).
 * @pure
 */
export function emailDeCodigoValido(email: unknown): boolean {
  const alvo = normalizarEmailCodigo(email);
  return (
    alvo.length > 0 &&
    alvo.length <= EMAIL_CODIGO_MAX &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alvo)
  );
}

/**
 * Forma do código digitado. Espaços e traços que a pessoa cole do e-mail são
 * removidos ANTES da conferência — quem digita `123 456` digitou o código.
 * @pure
 */
export function normalizarCodigoDeAcesso(codigo: unknown): string {
  if (typeof codigo !== 'string') return '';
  return codigo.replace(/[\s.-]/g, '');
}

/** @pure */
export function codigoDeAcessoValido(codigo: unknown): boolean {
  return CODIGO_ACESSO_RE.test(normalizarCodigoDeAcesso(codigo));
}

// ---------------------------------------------------------------------------
// Sorteio
// ---------------------------------------------------------------------------

const SORTEIO_PADRAO = sorteioUniforme(ALFABETO_CODIGO_ACESSO.length);

/**
 * Sorteia o código (RN-476).
 *
 * Zeros à esquerda são PRESERVADOS porque o código é montado como STRING,
 * símbolo a símbolo, e nunca passa por número: `000123` sai `000123`. Um
 * gerador que sorteasse `Math.floor(r * 1e6)` e formatasse depois perderia o
 * zero na primeira conversão descuidada, e perder o zero reduz o espaço de
 * busca em silêncio — de um milhão para novecentos mil, sem ninguém notar.
 *
 * @param random fonte em [0, 1); default = entropia do SISTEMA (Web Crypto,
 *   via `sorteioUniforme`). A injeção existe para o teste pregar o sorteio e
 *   provar zeros à esquerda; ela NUNCA tem `Math.random` como default — esse
 *   defeito já foi corrigido quatro vezes nesta casa.
 */
export function gerarCodigoDeAcesso(
  random: () => number = SORTEIO_PADRAO
): string {
  let codigo = '';
  for (let i = 0; i < TAMANHO_CODIGO_ACESSO; i++) {
    // Clamp defensivo, herdado dos outros geradores: um RNG que devolva 1 (ou
    // -0.1) indexaria fora do alfabeto e emendaria "undefined" no código.
    // `NaN` atravessa Math.min/Math.max intacto (toda comparação com NaN é
    // falsa), então ele é barrado ANTES.
    const bruto = random();
    const r = Number.isFinite(bruto)
      ? Math.min(Math.max(bruto, 0), 1 - Number.EPSILON)
      : 0;
    codigo +=
      ALFABETO_CODIGO_ACESSO[Math.floor(r * ALFABETO_CODIGO_ACESSO.length)];
  }
  return codigo;
}

// ---------------------------------------------------------------------------
// O desfecho que a tela lê
// ---------------------------------------------------------------------------

/**
 * A NEGATIVA ÚNICA (RN-476/RN-419).
 *
 * Código errado, vencido, já usado, de endereço que nunca pediu nada e teto
 * esgotado devolvem esta mesma frase. A tela não recebe motivo, porque motivo
 * distinguível é oráculo — foi assim que a RN-419 tratou quatro causas, e aqui
 * são cinco.
 */
export const MENSAGEM_CODIGO_NEGADO = 'Código incorreto ou vencido.';

/** O código morreu (teto esgotado, vencido, já usado ou nunca existiu). */
export const MENSAGEM_CODIGO_MORTO = 'Este código não vale mais. Peça um novo.';

/**
 * Quantas tentativas ainda restam, para a tela dizer que a próxima é a última.
 *
 * POR QUE CONTAR NÃO AFROUXA NADA (decisão da spec, §Parte 7): quem está
 * adivinhando já sabe quantas gastou — o contador é dele, não nosso. E o campo
 * NÃO é oráculo de conta: pedir um código sempre grava um código, exista ou
 * não a conta, então o número não distingue endereço com conta de endereço
 * sem. O que ele distingue é código VIVO de código morto, e essas quatro
 * causas de morte devolvem todas `0` — indistinguíveis entre si.
 * @pure
 */
export function tentativasRestantes(tentativasGastas: number): number {
  if (!Number.isFinite(tentativasGastas)) return 0;
  const restam = CODIGO_ACESSO_MAX_TENTATIVAS - Math.max(tentativasGastas, 0);
  return restam > 0 ? restam : 0;
}
