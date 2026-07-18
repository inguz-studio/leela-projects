// =============================================================================
// apps/landing/lib/esporte.ts
//
// Derivação PURA da MODALIDADE ESPORTIVA do evento (LEELA-R12 · Frente 2).
//
// O doc de evento (@leela/core `Evento`) NÃO tem um campo dedicado de esporte:
// `modalidades: string[]` guarda as DISTÂNCIAS (percursos: 5k/10k/MTB 90km/…),
// não o esporte praticado. O painel (fora do território) já deriva um "tipo"
// via regex nas distâncias/nome só para escolher o thumb da Visão geral. Aqui
// derivamos o RÓTULO humano da modalidade para a landing, com a MESMA lógica:
//   - fonte primária: campo `modalidadeEsporte` do doc quando o organizador o
//     preenche (seedado nos eventos extra do preview — ver preview-seed-extra);
//   - fallback determinístico: heurística sobre nome + distâncias.
//
// Sem React e sem estado — testável e reusável server+client.
// =============================================================================

/** Rótulo humano da modalidade esportiva. Default honesto: "Corrida de rua". */
export function esporteDoEvento(nome: string, modalidades: readonly string[]): string {
  const alvo = `${nome} ${modalidades.join(' ')}`.toLowerCase();

  if (/\bmtb\b|mountain|\bbike\b|cicl|pedal|gravel|\bbtt\b/.test(alvo)) {
    return 'Mountain bike';
  }
  if (/trilha|trail|montanha|\btravessia\b/.test(alvo)) {
    return 'Trail run';
  }
  if (/yoga|bem-?estar|retiro|wellness|medita/.test(alvo)) {
    return 'Bem-estar';
  }
  if (/nata[çc][ãa]o|\bswim\b|aqu[áa]tic|travessia\s+aqu/.test(alvo)) {
    return 'Natação';
  }
  if (/triathlon|triatlo|ironman|duathlon/.test(alvo)) {
    return 'Triathlon';
  }
  if (/caminhada|walk/.test(alvo)) {
    return 'Caminhada';
  }
  // Default: prova de rua a pé (5k/10k/21k/maratona/São Silvestre…).
  return 'Corrida de rua';
}
