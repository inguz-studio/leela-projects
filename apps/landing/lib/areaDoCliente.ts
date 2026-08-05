// =============================================================================
// apps/landing/lib/areaDoCliente.ts — onde a pessoa aterrissa depois de entrar.
//
// PONTO ÚNICO DE DECISÃO. Duas jornadas terminam no mesmo lugar e não podem
// discordar: o primeiro acesso (`/definir-senha`, S1223-T1) e o CTA "ver meus
// pedidos" do feedback pós-compra (S1225-T4). A fila ADMINSEP escreve a ordem
// como inegociável — apontar a continuação para uma rota que ainda não existe
// troca uma tela genérica por um 404, que é pior que o estado de hoje.
//
// Por isso o destino é uma FUNÇÃO e não uma constante espalhada: enquanto a
// área do cliente (S1222-T2) não está no ar, ela devolve a home; quando a
// S1222-T2 aterrissar, muda AQUI e em nenhum outro lugar.
// =============================================================================

/** A casa autenticada do comprador (S1222-T2). */
export const ROTA_AREA_CLIENTE = '/minha-conta';

/**
 * A área do cliente já está construída? Enquanto for `false`, nenhuma jornada
 * aponta para `ROTA_AREA_CLIENTE` — é a trava que impede o 404.
 *
 * VIRADA em S1222-T2: a rota `/minha-conta` existe, com guarda de sessão
 * nomeada, os dois recortes de ingresso e o histórico de compras. As duas
 * jornadas que dependiam desta constante — o fim do `/definir-senha` e o CTA
 * do checkout (S1225-T4) — passam a apontar para lá de uma vez só, que é
 * exatamente o motivo de ela ser UMA constante e não três decisões espalhadas.
 */
export const AREA_CLIENTE_NO_AR = true;

export interface DestinoPosEntrada {
  href: string;
  rotulo: string;
}

/**
 * Para onde mandar quem acabou de entrar ou de definir a senha. Trocar a trava
 * acima troca em todas as jornadas de uma vez.
 */
export function destinoPosEntrada(): DestinoPosEntrada {
  if (AREA_CLIENTE_NO_AR) return { href: ROTA_AREA_CLIENTE, rotulo: 'Ver meus ingressos' };
  return { href: '/', rotulo: 'Ir para a página inicial' };
}
