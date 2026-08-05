// =============================================================================
// packages/core/src/aleatorio.ts
//
// Fonte de sorteio dos códigos que a pessoa DITA (RN-396 · RN-474) — parte
// PURA, sem estado de domínio.
//
// POR QUE ISTO EXISTE: os dois geradores de código legível sorteavam com
// `Math.random`. O PRNG do V8 (xorshift128+) não é criptográfico e seu estado
// interno é RECUPERÁVEL a partir de poucas saídas consecutivas — quem faz uma
// compra e vê o próprio código consegue reconstruir o gerador e prever os
// próximos. O código não é credencial (a autorização continua sendo por campo,
// RN-469), mas ele é o que o operador BUSCA quando alguém dita um número pelo
// telefone: prever o código de outra pessoa é conseguir ser atendido como ela.
// Trocar a fonte é barato e não muda formato nenhum.
//
// POR QUE WEB CRYPTO E NÃO `node:crypto`: `@leela/core` é dependência de
// `apps/landing` (Next), `apps/painel` (Vite) e `apps/mobile` (Expo/RN) — um
// `import ... from 'node:crypto'` no topo deste pacote entra no bundle de
// CLIENTE e quebra (ou vira warning de externalização) nos três. A doutrina do
// core já diz isso em outras palavras: a metade `node:crypto` de `qrToken` e de
// `linkIngresso` mora em `functions/`, nunca aqui. `globalThis.crypto.
// getRandomValues` é a MESMA fonte do sistema operacional, e existe no Node 20+,
// no navegador e no Workers — sem import nenhum.
//
// O acesso ao Web Crypto é PREGUIÇOSO (dentro da função, nunca no topo do
// módulo): importar `@leela/core` num runtime sem `globalThis.crypto` continua
// funcionando; só quem SORTEIA precisa da fonte.
// =============================================================================

/**
 * Quantos uint32 são puxados por chamada ao Web Crypto.
 *
 * Um sorteio por símbolo com uma chamada de sistema cada custaria ~1,7µs por
 * símbolo; os testes de propriedade dos geradores fazem centenas de milhares
 * deles. O pool amortiza a chamada sem mudar a distribuição — os bytes são os
 * mesmos, só vêm em bloco.
 */
const TAMANHO_POOL = 256;

const pool = new Uint32Array(TAMANHO_POOL);
/** Começa "vazio" (índice no fim) para a primeira leitura preencher. */
let proximo = TAMANHO_POOL;

/**
 * Contrato ESTRUTURAL do Web Crypto — só o que este módulo usa.
 *
 * Declarado à mão de propósito: o tipo `Crypto` vem de `lib.dom`, e
 * `functions/tsconfig.json` compila com `lib: ["ES2022"]`. Nomear `Crypto`
 * aqui quebraria o type-check de quem consome o core no servidor.
 */
interface FonteEntropia {
  getRandomValues(alvo: Uint32Array): Uint32Array;
}

/**
 * A fonte do sistema, resolvida na hora do uso.
 *
 * Ausência é ERRO, nunca rebaixamento silencioso para `Math.random`: cair de
 * volta no PRNG previsível é exatamente o defeito que este módulo existe para
 * fechar, e um fallback mudo o esconderia justamente no runtime em que ele
 * importa.
 */
function fonteDoSistema(): FonteEntropia {
  const c = (globalThis as { crypto?: FonteEntropia }).crypto;
  if (typeof c?.getRandomValues !== 'function') {
    throw new Error(
      'aleatorio: Web Crypto ausente (globalThis.crypto.getRandomValues). ' +
        'Este runtime não pode sortear código de compra/ingresso — injete uma ' +
        'fonte explícita em vez de rebaixar para Math.random.'
    );
  }
  return c;
}

/** Próximo uint32 do pool, recarregando quando ele acaba. */
function uint32(): number {
  if (proximo >= TAMANHO_POOL) {
    fonteDoSistema().getRandomValues(pool);
    proximo = 0;
  }
  return pool[proximo++] as number;
}

/**
 * Fonte em [0, 1) para sortear entre `faces` símbolos, com distribuição
 * EXATAMENTE uniforme e sem viés de módulo.
 *
 * Como: um uint32 é descartado quando cai acima do maior múltiplo de `faces`
 * que cabe em 2³² (rejection sampling — com 31 faces, isso descarta 4 valores
 * em 4.294.967.296, uma repetição a cada bilhão de sorteios). O que volta é o
 * CENTRO do balde sorteado, `(k + 0,5) / faces`, e não `k / faces`: o chamador
 * faz `Math.floor(r * faces)` para achar o índice, e o centro devolve `k` sem
 * depender do arredondamento de ponto flutuante na borda do balde.
 *
 * O parâmetro `faces` é sempre DERIVADO do alfabeto do chamador
 * (`ALFABETO.length`), nunca escrito à mão — trocar o alfabeto não pode
 * silenciosamente desalinhar a fonte.
 * @pure (no sentido do domínio: sem estado de negócio; a entropia é do sistema)
 */
export function sorteioUniforme(faces: number): () => number {
  if (!Number.isInteger(faces) || faces < 1 || faces > 2 ** 32) {
    throw new Error(`aleatorio: faces inválido (${String(faces)})`);
  }
  const teto = Math.floor(2 ** 32 / faces) * faces;
  return (): number => {
    let x = uint32();
    while (x >= teto) x = uint32();
    return ((x % faces) + 0.5) / faces;
  };
}
