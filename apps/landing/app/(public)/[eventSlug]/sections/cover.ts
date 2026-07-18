// Fonte da capa do evento na superfície pública (LEELA-R7).
//
// O leitor (lib/leitor.ts) só entrega `evento.imagemUrl` quando é URL http(s)
// VÁLIDA (RN-153 · isUrlCapaValida, em @leela/core — guarda de segurança fora
// deste território). Sem capa do organizador, a página cai numa CAPA MOCK
// local, digna e coerente com a identidade brasa — servida como asset estático
// da própria landing (sem serviço externo, resolve determinística no preview).
//
// Por que app-level (e não seed do imagemUrl): o campo `imagemUrl` do doc é
// COMPARTILHADO com o painel (que renderiza `/seed-images/*.jpg` do próprio
// public), e a guarda RN-153 rejeita caminho relativo — seedar URL absoluta de
// localhost seria frágil a porta e regrediria as miniaturas do painel. O
// default local entrega a "capa mock digna" do brief sem tocar em nenhum desses
// contratos. Decisão registrada no R7-DOBRAS-HERO-REPORT.md.

/** Capa mock local (asset em apps/landing/public/covers/). */
export const CAPA_MOCK = '/covers/leela-evento-brasa.svg';

/**
 * Resolve a fonte da capa: a capa http(s) do organizador quando existe; senão,
 * a capa mock local. Usada tanto pela capa NÍTIDA do hero quanto pela camada de
 * PLANO DE FUNDO borrada (mesma imagem — pedido do brief).
 */
export function resolverCapa(imagemUrl: string | undefined): string {
  return imagemUrl !== undefined && imagemUrl.length > 0 ? imagemUrl : CAPA_MOCK;
}
