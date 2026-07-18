import '@testing-library/jest-dom';

// Polyfills para jsdom — cmdk (Command) e @radix-ui (Popover) que o Combobox e o
// Calendar do DS usam dependem de APIs de layout/ponteiro que o jsdom não
// implementa. Sem eles, montar/abrir Combobox/Calendar em teste lança
// (ResizeObserver/scrollIntoView/pointer capture). Réplica do setup do DS
// (packages/design-system/src/test/setup.ts) — pendência 2 do R9-A. (S-R9-01.)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

if (typeof Element !== 'undefined') {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView(): void {};
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function hasPointerCapture(): boolean {
      return false;
    };
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function setPointerCapture(): void {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function releasePointerCapture(): void {};
  }
}
