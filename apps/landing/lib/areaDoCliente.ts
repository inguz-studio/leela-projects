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

/**
 * O CTA do feedback pós-compra (S1225-T4 · D-0804-2), na frase do dono: "um
 * CTA para ele visualizar os próprios pedidos dentro do sistema".
 *
 * `null` quando a área não está no ar — e é por isso que ele é uma função e
 * não um `<Link>` solto na tela do checkout: CTA apontando para rota
 * inexistente troca tela genérica por 404, que é pior que o estado de hoje. A
 * mesma trava que segurou este botão até a S1222-T2 subir.
 *
 * O RÓTULO diz "ingressos", não "pedidos", e a diferença é deliberada: é para
 * a lista de ingressos que o botão aterrissa, e a de compras está na aba ao
 * lado. Prometer "pedidos" e entregar ingressos seria uma promessa torta na
 * primeira tela que a pessoa vê depois de pagar.
 */
export function ctaMeusPedidos(): DestinoPosEntrada | null {
  if (!AREA_CLIENTE_NO_AR) return null;
  return { href: ROTA_AREA_CLIENTE, rotulo: 'Ver meus ingressos' };
}

// ---------------------------------------------------------------------------
// O aviso que ATRAVESSA a navegação (RN-560 (ramo 2))
//
// O dono decidiu que o PIX vencido "redireciona AVISANDO que o pix foi
// cancelado após o prazo vencer, e leva também para a área do cliente". O aviso
// e o destino são um gesto só: quem chega na área sem saber por que saiu do
// checkout leva o susto que a decisão veio evitar.
//
// POR QUE NÃO QUERY STRING. `/minha-conta` tem uma invariante escrita e testada
// — "NADA DE PERFIL NA URL" (`AreaDoCliente.tsx`) — sustentada por
// `Referrer-Policy: no-referrer`, `no-store` e `noindex`. Um `?aviso=` não
// carrega identidade, mas carrega o FATO de que aquela pessoa teve um PIX
// vencido, e esse fato num link colado em conversa é da mesma família do que a
// invariante proíbe. `sessionStorage` é da aba, morre com ela, não viaja em
// header nenhum e não sobrevive a um link compartilhado.
//
// LEITURA DESTRUTIVA de propósito: o aviso é de UMA chegada. Deixá-lo no
// armazenamento faria a área repetir "seu PIX venceu" em toda visita da sessão,
// muito depois de a pessoa já ter comprado de novo.
// ---------------------------------------------------------------------------

/** Avisos que o checkout pode entregar à área do cliente. */
export type AvisoDaArea = 'pix-vencido';

const CHAVE_AVISO = 'leela.aviso-area';

/** Guarda o aviso para a PRÓXIMA renderização da área. Falha em silêncio. */
export function guardarAvisoDaArea(aviso: AvisoDaArea): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(CHAVE_AVISO, aviso);
  } catch {
    // Armazenamento bloqueado (aba anônima com restrição, quota): o
    // redirecionamento continua valendo. Perder o aviso é ruim; perder o
    // destino por causa do aviso seria pior.
  }
}

/** Lê e APAGA o aviso pendente. `null` quando não há nada a dizer. */
export function consumirAvisoDaArea(): AvisoDaArea | null {
  if (typeof window === 'undefined') return null;
  try {
    const bruto = window.sessionStorage.getItem(CHAVE_AVISO);
    if (bruto !== null) window.sessionStorage.removeItem(CHAVE_AVISO);
    return bruto === 'pix-vencido' ? 'pix-vencido' : null;
  } catch {
    return null;
  }
}
