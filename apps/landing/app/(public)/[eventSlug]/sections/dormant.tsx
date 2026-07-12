import type { EventoPublico } from '@/lib/tipos';

// =============================================================================
// Seções registradas porém SEM dado no modelo público atual.
//
// Regra do brief: "só renderiza se ativa E há dado real; sem dado → não
// renderiza (nada de placeholder fabricado)". O seed E12 não traz kits,
// patrocinadores, depoimentos nem FAQ como dado público — então estes
// componentes retornam `null`. Ficam REGISTRADOS para que o renderizador
// orientado por config seja completo: no dia em que o leitor projetar esses
// dados, basta preencher o corpo. Ex. concreto: no seed, a seção
// `patrocinadores` está ATIVA na config, mas sem dado → não aparece (prova a
// regra); `depoimentos` está inativa → nem chega ao renderizador.
// =============================================================================

export function KitsSection(_props: { evento: EventoPublico }): null {
  return null;
}

export function PatrocinadoresSection(_props: { evento: EventoPublico }): null {
  return null;
}

export function DepoimentosSection(_props: { evento: EventoPublico }): null {
  return null;
}

export function InfoSection(_props: { evento: EventoPublico }): null {
  return null;
}

export function PercursoSection(_props: { evento: EventoPublico }): null {
  return null;
}
