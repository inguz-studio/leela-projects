// =============================================================================
// RegulamentoSection — regulamento da experiência em MODAL (LP-VENDAS-KIT/T2).
//
// Pedido do Vitor: a página do evento expõe o regulamento da competição num
// componente visível na página inicial do evento; o clique abre um MODAL com o
// conteúdo REAL do campo `regulamento` (RN-153, ≤50k; `regulamentoVersao` da
// RN-149 como referência de exibição).
//
// SERVER COMPONENT puro (Dobra + título + descrição são server-safe, como o
// resto das seções). Só o gatilho + o modal são client (`RegulamentoModal`) —
// mesma disciplina de manter o SSR puro e isolar o cliente no leaf.
//
// HONESTIDADE (sem estado vazio fake): evento SEM regulamento ⇒ a seção não
// renderiza (retorna null). O leitor server-side só projeta `regulamento`
// quando é string não-vazia; o gate aqui é redundante e barato.
// =============================================================================

import { FileText } from 'lucide-react';
import type { EventoPublico } from '@/lib/tipos';
import { Dobra } from './Dobra';
import { TituloSecao } from './marca';
import { RegulamentoModal } from './RegulamentoModal';

export function RegulamentoSection({ evento }: { evento: EventoPublico }): React.JSX.Element | null {
  const regulamento = evento.regulamento;
  if (regulamento === undefined || regulamento.trim().length === 0) return null;

  return (
    <Dobra id="regulamento">
      <TituloSecao icone={FileText}>Regulamento</TituloSecao>
      {/* D-0802-1 §3: esta seção é servida em TODO evento — "prova", "categorias"
          e "premiação" descreviam uma corrida na página de um retiro. O que
          vale para qualquer experiência é o que ficou. */}
      <p className="mt-2 max-w-2xl text-sm text-text-secondary">
        Antes de se inscrever, leia o regulamento oficial desta experiência —
        regras de participação, o que está incluído e política de cancelamento.
      </p>

      <RegulamentoModal
        regulamento={regulamento}
        {...(evento.regulamentoVersao !== undefined ? { versao: evento.regulamentoVersao } : {})}
      />
    </Dobra>
  );
}

RegulamentoSection.displayName = 'RegulamentoSection';
