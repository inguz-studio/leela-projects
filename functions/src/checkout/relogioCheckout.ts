// =============================================================================
// functions/src/checkout/relogioCheckout.ts
//
// Relógio do checkout server-side (vigência de lote/cupom — dinheiro).
//
// PRODUÇÃO: SEMPRE o relógio real. Dinheiro NUNCA depende de tempo fabricado.
//
// EMULATOR (demo/gate visual): quando roda no Functions Emulator
// (`FUNCTIONS_EMULATOR === 'true'`) um override `LEELA_CLOCK` (ISO) é honrado —
// espelho EXATO do mecanismo que o leitor público já usa
// (apps/landing/lib/estadoVenda.ts · `agoraDoServidor`), para que a demo contra
// o seed de datas FIXAS (lotes fev–abr/2026) observe a venda ABERTA e o preço
// derive dos lotes reais no instante escolhido — sem fabricar preço.
//
// Fora do emulator o override é IGNORADO (fail-safe): a variável pode existir no
// ambiente sem risco de alterar a precificação de uma cobrança real.
//
// ⚠️ FABLE-REVIEW (fiação de dinheiro): este relógio decide QUAL lote está
// vigente e, portanto, o preço. O gate `FUNCTIONS_EMULATOR` é a única barreira
// contra tempo fabricado em produção — confirmar que o emulator NUNCA seta essa
// env em deploy real.
// =============================================================================

/**
 * Instante de observação da venda no servidor. Real em produção; honra
 * `LEELA_CLOCK` (ISO) SÓ sob o Functions Emulator. Data inválida cai no relógio
 * real. @pure-ish (lê env, sem I/O)
 */
export function agoraCheckout(): Date {
  if (process.env['FUNCTIONS_EMULATOR'] === 'true') {
    const override = process.env['LEELA_CLOCK'];
    if (override !== undefined && override.trim().length > 0) {
      const d = new Date(override);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}
