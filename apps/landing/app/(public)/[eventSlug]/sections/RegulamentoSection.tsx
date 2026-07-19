'use client';

// =============================================================================
// RegulamentoSection — regulamento da prova em MODAL (LP-VENDAS-KIT/T2).
//
// Pedido do Vitor: a página do evento expõe o regulamento da competição num
// componente visível na página inicial do evento; o clique abre um MODAL
// (Dialog do DS — governança §8) com o conteúdo REAL do campo `regulamento`
// (RN-153, ≤50k; `regulamentoVersao` da RN-149 como referência de exibição).
//
// HONESTIDADE (sem estado vazio fake): evento SEM regulamento ⇒ o componente
// não renderiza (retorna null). O leitor server-side só projeta `regulamento`
// quando é string não-vazia, então o gate aqui é redundante e barato.
//
// SEGURANÇA: o regulamento é TEXTO puro — renderizado com `whitespace-pre-wrap`
// (preserva quebras de linha do organizador), NUNCA `dangerouslySetInnerHTML`.
// Client Component (o Modal do DS controla `open` por estado); o texto vem
// server-rendered via prop serializável.
// =============================================================================

import { useState } from 'react';
import { FileText } from 'lucide-react';
import type { EventoPublico } from '@/lib/tipos';
import { Button, Modal } from '@/app/_ds/ds';
import { Dobra } from './Dobra';
import { TituloSecao } from './marca';

export function RegulamentoSection({ evento }: { evento: EventoPublico }): React.JSX.Element | null {
  const [aberto, setAberto] = useState(false);

  const regulamento = evento.regulamento;
  if (regulamento === undefined || regulamento.trim().length === 0) return null;

  return (
    <Dobra id="regulamento">
      <TituloSecao icone={FileText}>Regulamento</TituloSecao>
      <p className="mt-2 max-w-2xl text-sm text-text-secondary">
        Antes de se inscrever, leia o regulamento oficial da prova — regras de
        participação, categorias, premiação e política de cancelamento.
      </p>

      <div className="mt-6">
        <Button variant="secondary" onClick={() => setAberto(true)}>
          Ler regulamento completo
        </Button>
      </div>

      <Modal
        open={aberto}
        onOpenChange={setAberto}
        title="Regulamento da prova"
        size="lg"
        {...(evento.regulamentoVersao !== undefined
          ? { description: `Versão ${evento.regulamentoVersao} — vigente para as inscrições atuais.` }
          : {})}
      >
        {/* Texto puro, quebras preservadas; o Modal do DS já dá o scroll interno
            (max-h + overflow-y-auto) — ritmo vertical e tipografia (Exo 2) do DS. */}
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">
          {regulamento}
        </div>
      </Modal>
    </Dobra>
  );
}

RegulamentoSection.displayName = 'RegulamentoSection';
