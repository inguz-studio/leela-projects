import '@testing-library/jest-dom';

// Polyfills para jsdom — cmdk (Command) e @radix-ui (Popover) dependem de APIs
// de layout/ponteiro que o jsdom não implementa. Sem eles, montar Combobox/
// Popover em teste lança (ResizeObserver/scrollIntoView/pointer capture).
// (S-R9-05.)
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
