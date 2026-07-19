// =============================================================================
// Contrato de UI da CAPA DE EVENTO (CEV · RN-228, ratificada DEC-0719).
// Fonte única das duas telas que instanciam o ImageUploadField da capa
// (EventoForm "Novo evento" + ConfigGeraisForm): proporção 1.9:1 expressa nas
// DIMENSÕES canônicas 1600×838 (o crop COVER usa a razão; maxLadoPx trava a
// largura de saída em 1600) + hint honesto com formato/teto da RN-228
// (jpeg/png/gif ≤2MB — validados no seam `uploadCapaEvento`, espelho das
// storage.rules). @pure
// =============================================================================

/** Proporção-alvo da capa (RN-228): 1.9:1 nas dimensões canônicas 1600×838. */
export const CAPA_EVENTO_ASPECTO = { w: 1600, h: 838 } as const;

/** Maior lado da imagem enviada (RN-228: largura canônica 1600px). */
export const CAPA_EVENTO_MAX_LADO_PX = 1600;

/** Hint exibido sob o seletor — formato/teto/proporção da RN-228. */
export const CAPA_EVENTO_HINT = 'JPG, PNG ou GIF até 2MB. Ajustada para 1.9:1 (1600×838).';
