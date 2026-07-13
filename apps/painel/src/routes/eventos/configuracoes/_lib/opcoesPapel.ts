// =============================================================================
// Alçada de gestão de papéis na UI (S304-T3 · E04-L5). ESPELHA os guards da
// Function `setClaimsEquipe` (`podeGerirPapelEquipe`, anti-escalada) para não
// oferecer na tela o que o servidor negaria — mas o servidor é a AUTORIDADE
// (defesa em profundidade). Puro/testável.
//
// Regras (do épico E04 · S304-T1):
//   - organizador concede/troca qualquer papel (inclusive organizador);
//   - administrador gere administrador/operador/financeiro — NUNCA concede nem
//     destitui organizador;
//   - operador/financeiro não gerem equipe (nem chegam a esta tela);
//   - ninguém gere o PRÓPRIO papel.
//   - convite NUNCA cria organizador (o dono não é convidado — Rule).
// =============================================================================

import { PAPEIS_EVENTO, type PapelEvento } from '@leela/core';
import type { PapelConvite } from '@leela/api-client';

/** Papéis que o gestor pode ATRIBUIR numa troca de papel de membro ativo. @pure */
export function papeisAtribuiveis(gestor: PapelEvento | null): PapelEvento[] {
  if (gestor === 'organizador') return [...PAPEIS_EVENTO];
  if (gestor === 'administrador') {
    return PAPEIS_EVENTO.filter((p) => p !== 'organizador');
  }
  return [];
}

/** Papéis que o gestor pode CONVIDAR (create) — organizador nunca (Rule). @pure */
export function papeisConvidaveis(gestor: PapelEvento | null): PapelConvite[] {
  return papeisAtribuiveis(gestor).filter(
    (p): p is PapelConvite => p !== 'organizador'
  );
}

/**
 * O gestor pode trocar o papel / remover ESTE membro? Nega quando: é o próprio
 * gestor (ninguém gere o próprio papel), ou o membro é organizador e o gestor
 * não é organizador (admin não destitui o dono), ou o gestor não gere equipe. @pure
 */
export function podeGerirMembro(params: {
  gestor: PapelEvento | null;
  gestorUid: string | null;
  membroPapel: PapelEvento;
  membroUid: string | null;
}): boolean {
  const { gestor, gestorUid, membroPapel, membroUid } = params;
  if (papeisAtribuiveis(gestor).length === 0) return false;
  if (gestorUid !== null && membroUid !== null && gestorUid === membroUid) return false;
  if (membroPapel === 'organizador' && gestor !== 'organizador') return false;
  return true;
}
