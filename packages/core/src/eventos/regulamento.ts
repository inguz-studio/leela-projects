// =============================================================================
// packages/core/src/eventos/regulamento.ts
//
// Versionamento do regulamento — derivações puras (LEELA-S306-T1/T3 · E04 ·
// RN-149). Nova versão do regulamento ⇒ inscritos FUTUROS exigem novo
// aceite; inscritos antigos MANTÊM o registro da versão que aceitaram
// (`inscritos/{id}.regulamentoAceite.versao` — persistido no checkout
// E12-S1207, NUNCA reescrito por versão nova).
//
// A versão é MONOTÔNICA e de escrita EXCLUSIVA server-side
// (functions/eventos/versionarRegulamento.ts deriva o bump quando o TEXTO
// muda; Rules congelam `regulamentoVersao`/`regulamentoAtualizadoEm` para o
// cliente). Evento legado sem campo ⇒ versão 0 (sem regulamento publicado);
// o primeiro texto publica a versão 1.
// =============================================================================

/** Versão efetiva de um evento (legado sem campo ⇒ 0). @pure */
export function versaoRegulamento(regulamentoVersao: number | undefined): number {
  return typeof regulamentoVersao === 'number' &&
    Number.isInteger(regulamentoVersao) &&
    regulamentoVersao > 0
    ? regulamentoVersao
    : 0;
}

/**
 * O inscrito precisa aceitar de novo? (RN-149: aceite de versão ANTERIOR à
 * vigente não vale para a vigente.) `inscritoVersao` undefined = nunca
 * aceitou (legado/pré-S1207) ⇒ precisa quando há regulamento publicado. @pure
 */
export function precisaNovoAceite(
  inscritoVersao: number | undefined,
  eventoVersao: number | undefined
): boolean {
  const vigente = versaoRegulamento(eventoVersao);
  if (vigente === 0) return false; // sem regulamento publicado, nada a aceitar
  const aceita = versaoRegulamento(inscritoVersao);
  return aceita < vigente;
}

/**
 * O bump de versão se aplica? (mudança REAL de texto — RN-149.) Normaliza
 * ausência/vazio: publicar texto onde não havia = bump; apagar o texto NÃO
 * bumpa (remoção não é "nova versão" a aceitar); texto idêntico = no-op. @pure
 */
export function regulamentoMudou(
  antes: string | undefined,
  depois: string | undefined
): boolean {
  const a = typeof antes === 'string' && antes.length > 0 ? antes : undefined;
  const d = typeof depois === 'string' && depois.length > 0 ? depois : undefined;
  if (d === undefined) return false;
  return a !== d;
}
