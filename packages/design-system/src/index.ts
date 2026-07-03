// =============================================================================
// @leela/design-system — stub de export mínimo tipado
// Componentes visuais e tokens completos são implementados em LEELA-E01.
// =============================================================================

/**
 * Variantes de tema disponíveis no Design System Leela.
 * `brasa` é o tema padrão da marca (LEELA-E01).
 */
export type ThemeVariant = 'brasa' | 'light' | 'dark';

/**
 * Mapa de tokens de design (tier 3 — valores resolvidos).
 * Valores são CSS custom property values (strings).
 * Estrutura completa definida em LEELA-S001-1-T1.
 */
export type DesignTokens = Readonly<Record<string, string>>;

/**
 * Configuração de tema passada ao ThemeProvider.
 * ThemeProvider implementado em LEELA-S001-1-T2.
 */
export interface ThemeConfig {
  variant: ThemeVariant;
  tokens?: DesignTokens;
}
