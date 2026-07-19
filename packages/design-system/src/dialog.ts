// =============================================================================
// @leela/design-system/dialog — entrada RADIX-FREE do Dialog (ADR-017).
//
// Primitivo de modal para a superfície pública: React puro + lucide + tokens,
// sem `@radix-ui/react-dialog` (que o dist externaliza e o bundle público da
// landing não resolve — o 500 da lane LPVK). É CLIENT component por natureza
// (useState/useEffect no consumo): importe-o dentro de um módulo 'use client'
// (o DS não publica diretivas — mesmo padrão do boundary `_ds/ds.ts`).
//
// Pureza (zero radix no grafo) provada em `src/test/server-safety.test.ts`.
// =============================================================================

export { Dialog } from './components/Dialog';
export type { DialogProps } from './components/Dialog';
