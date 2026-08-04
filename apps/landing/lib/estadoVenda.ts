// =============================================================================
// apps/landing/lib/estadoVenda.ts
//
// Derivações PURAS da superfície pública (S1201-T3), compostas 100% sobre os
// primitivos de `@leela/core` — nada de aritmética de preço ou regra de virada
// reimplementada aqui (reuso-first).
//
// VITRINE-FIX: a régua de "está vendendo?" SAIU daqui e foi para o core
// (`eventos/vitrine.ts`). Ela vivia neste arquivo decidindo só pelos lotes,
// enquanto o servidor (`resolverItem`) também aceita o preço-base legado do
// percurso quando a modalidade não tem lote nenhum — e é assim que nasce todo
// evento criado pelo painel, porque `criarEvento` exige `percursos` e não cria
// lote. O resultado era evento publicado servindo "Inscrições encerradas" com
// o servidor pronto para cobrar. Uma régua só, no core, lida pela vitrine E
// pelo painel do organizador. `deriveEstadoVenda` segue re-exportada daqui
// para não quebrar quem já a importava.
//
// O que continua sendo daqui: o "relógio do servidor" (`agoraDoServidor`) — o
// instante de observação passado a `precoVigente`/`loteAtivo`. Default =
// relógio real. Um override opcional `LEELA_CLOCK` (ISO) permite observar o
// seed no estado para o qual foi escrito (Lote 2 vigente na janela fev–abr/
// 2026) sem FABRICAR preço — o preço continua derivado do dado real no
// instante escolhido.
// =============================================================================

import {
  deriveEstadoVenda,
  type EstadoVenda,
  type ModalidadeVitrine,
  type StatusEvento,
} from '@leela/core';

export { deriveEstadoVenda };

/**
 * Lotes (e preço-base legado) agrupados por modalidade — entrada da régua.
 * Alias do tipo do core, mantido pelo nome que a landing já usava.
 */
export type ModalidadeLotes = ModalidadeVitrine;

/**
 * Instante de observação do servidor. Override honesto por `LEELA_CLOCK` (ISO);
 * data inválida cai no relógio real com aviso. Ver nota no header.
 */
export function agoraDoServidor(): Date {
  const override = process.env['LEELA_CLOCK'];
  if (override !== undefined && override.trim().length > 0) {
    const d = new Date(override);
    if (!Number.isNaN(d.getTime())) return d;
    console.warn(`[estadoVenda] LEELA_CLOCK inválido ("${override}") — usando relógio real`);
  }
  return new Date();
}

/**
 * Um evento com este `status` é legível publicamente? (gate S1200/S1201).
 * Só `publicado`/`ao_vivo` são públicos; `rascunho`/`encerrado` → não (a rota
 * resolve 404). Puro e testável sem Firebase.
 */
export function statusEhPublico(status: StatusEvento): boolean {
  return status === 'publicado' || status === 'ao_vivo';
}

/** A inscrição está disponível? (só quando a venda está aberta). */
export function inscricaoDisponivel(estado: EstadoVenda): boolean {
  return estado === 'aberto';
}

/** Mensagem pública do estado de venda (CTA desabilitado / rótulo). */
export function rotuloEstadoVenda(estado: EstadoVenda): string {
  switch (estado) {
    case 'aberto':
      return 'Inscrições abertas';
    case 'esgotado':
      return 'Esgotado';
    case 'encerrado':
      return 'Inscrições encerradas';
  }
}
