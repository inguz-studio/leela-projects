'use client';

// =============================================================================
// RegulamentoModal — leaf CLIENTE do botão + modal do regulamento (T2).
//
// Por que NÃO o Modal do DS: o Modal do DS é Radix Dialog, e o dist do DS
// EXTERNALIZA `@radix-ui/react-dialog`. A landing é deliberadamente Radix-free
// (os componentes do DS que ela consome são nativos/custom, não Radix — ver
// `marca.tsx`, que replica valores do DS para manter SSR puro). Importar o
// Modal do DS aqui puxa `@radix-ui/react-dialog` para o bundle público da
// landing, que NÃO o resolve (MODULE_NOT_FOUND) → 500 na rota do evento.
// Solução consistente com a arquitetura: modal LOCAL, acessível, com os MESMOS
// tokens do DS (surface/overlay/foco), sem nova dependência no bundle público.
// (Follow-up registrado: se o Vitor quiser o componente literal do DS, adicionar
// `@radix-ui/react-dialog` como dep da landing — decisão de stack do lead.)
//
// A11y (DoD Modal): role=dialog + aria-modal + aria-labelledby; 4 vias de
// fechamento (X, Esc, clique no overlay, botão Fechar); foco entra no fechar ao
// abrir e RETORNA ao gatilho ao fechar; scroll do body travado enquanto aberto.
// =============================================================================

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { FileText, X } from 'lucide-react';
import { Button } from '@/app/_ds/ds';

export function RegulamentoModal({
  regulamento,
  versao,
}: {
  regulamento: string;
  versao?: number;
}): React.JSX.Element {
  const [aberto, setAberto] = useState(false);
  const tituloId = useId();
  const gatilhoRef = useRef<HTMLButtonElement | null>(null);
  const fecharRef = useRef<HTMLButtonElement | null>(null);

  const fechar = useCallback(() => setAberto(false), []);

  // Esc fecha; foco entra no botão fechar ao abrir; scroll do body travado.
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') fechar();
    };
    document.addEventListener('keydown', onKey);
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    fecharRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowAntes;
      // Retorna o foco ao gatilho ao fechar (retorno de foco do DoD Modal).
      gatilhoRef.current?.focus();
    };
  }, [aberto, fechar]);

  return (
    <div className="mt-6">
      <Button ref={gatilhoRef} variant="secondary" onClick={() => setAberto(true)}>
        Ler regulamento completo
      </Button>

      {aberto ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={tituloId}
        >
          {/* Overlay — escurece + fecha ao clicar (via 1..4). Token com alpha. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-surface-base/80 backdrop-blur-sm"
            onClick={fechar}
          />

          {/* Painel — surface-raised, radius e elevação do DS; scroll interno. */}
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-ds-lg bg-surface-raised shadow-elev-3 sm:rounded-ds-lg">
            <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h3
                  id={tituloId}
                  className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-text-primary"
                >
                  <FileText size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
                  Regulamento da prova
                </h3>
                {versao !== undefined ? (
                  <p className="mt-1 text-sm text-text-secondary">
                    Versão {versao} — vigente para as inscrições atuais.
                  </p>
                ) : null}
              </div>
              <button
                ref={fecharRef}
                type="button"
                aria-label="Fechar"
                onClick={fechar}
                className="shrink-0 rounded-ds-sm p-1.5 text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <X size={20} aria-hidden />
              </button>
            </div>

            {/* Corpo com scroll interno (ritmo vertical + tipografia do DS).
                Texto PURO com quebras preservadas — nunca HTML cru. */}
            <div className="overflow-y-auto px-5 py-4 sm:px-6">
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">
                {regulamento}
              </div>
            </div>

            <div className="flex justify-end border-t border-border-subtle px-5 py-3 sm:px-6">
              <Button variant="secondary" onClick={fechar}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

RegulamentoModal.displayName = 'RegulamentoModal';
