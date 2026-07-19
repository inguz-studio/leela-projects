'use client';

// =============================================================================
// RegulamentoModal — leaf CLIENTE do botão + modal do regulamento (T2).
//
// ADR-017 (lote MODAL-ADR): o dialog local que esta seção carregava (overlay,
// painel, focus trap, Esc, retorno de foco — provado por 10/10 testes da lane
// SECFIX) foi PROMOVIDO ao DS como primitivo `Dialog` Radix-free, servido pelo
// subpath `@leela/design-system/dialog` (grafo sem `@radix-ui/react-dialog`,
// que o dist externaliza e o bundle público não resolve — o 500 da LPVK).
// Este arquivo vira consumidor fino: gatilho + conteúdo; comportamento e skin
// (bottom-sheet mobile → centrado sm+, 100% tokens) vêm do DS.
//
// A11y (DoD Modal) — agora garantida pelo primitivo e coberta TAMBÉM na suíte
// do DS: role=dialog + aria-modal + aria-labelledby/describedby; 4 vias de
// fechamento (X, Esc, overlay, botão Fechar); foco entra no X ao abrir e
// RETORNA ao gatilho ao fechar (returnFocusRef); scroll do body travado;
// focus trap cíclico de Tab (W2-F-05). Os testes da landing
// (test/regulamento-modal-focus-trap.test.tsx) seguem valendo, sem mudança
// de asserção — comportamento adquirido.
// =============================================================================

import { useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { Dialog } from '@leela/design-system/dialog';
import { Button } from '@/app/_ds/ds';

export function RegulamentoModal({
  regulamento,
  versao,
}: {
  regulamento: string;
  versao?: number;
}): React.JSX.Element {
  const [aberto, setAberto] = useState(false);
  const gatilhoRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="mt-6">
      <Button ref={gatilhoRef} variant="secondary" onClick={() => setAberto(true)}>
        Ler regulamento completo
      </Button>

      <Dialog
        open={aberto}
        onOpenChange={setAberto}
        title="Regulamento da prova"
        titleIcon={
          <FileText size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
        }
        // h3: o modal vive sob o h2 da seção — não quebra a hierarquia da rota
        // (aceite do AUDIT-SEO · GATE-DS-W2).
        titleAs="h3"
        description={
          versao !== undefined ? `Versão ${versao} — vigente para as inscrições atuais.` : undefined
        }
        returnFocusRef={gatilhoRef}
        footer={
          <Button variant="secondary" onClick={() => setAberto(false)}>
            Fechar
          </Button>
        }
      >
        {/* Texto PURO com quebras preservadas — nunca HTML cru. */}
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">
          {regulamento}
        </div>
      </Dialog>
    </div>
  );
}

RegulamentoModal.displayName = 'RegulamentoModal';
