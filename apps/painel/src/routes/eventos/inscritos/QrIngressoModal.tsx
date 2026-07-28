// =============================================================================
// QrIngressoModal — o QR de UM inscrito, aberto por ação na linha (RN-397).
//
// A regra é "QR sob demanda", e o motivo é literal na spec: quatrocentas
// imagens numa lista é peso sem uso. Então a tabela nunca renderiza QR — ele
// nasce aqui, quando o organizador pede, e some quando ele fecha.
//
// O QR é gerado no CLIENTE a partir do `qrToken` que já veio no doc do
// inscrito (leitura permitida ao organizador pelas Rules). Nenhuma chamada
// nova ao servidor, nenhuma imagem trafegando, nenhum endereço público
// carregando a credencial de presença.
//
// Mesma biblioteca (`qrcode`) que o servidor usa para o QR do e-mail e da
// página do evento — uma implementação de QR no produto inteiro, não três.
//
// Estados cobertos, porque o balcão vive deles:
//   - ingresso NÃO emitido (sem token) → a ação nem aparece na linha;
//   - falha ao desenhar → mensagem honesta + o código, que é o que resolve
//     o atendimento de qualquer jeito (o código não é credencial, mas
//     identifica a pessoa na lista).
// =============================================================================

import * as React from 'react';
import QRCode from 'qrcode';
import { Modal } from '@leela/design-system';
import type { Inscrito } from '@leela/core';

export interface QrIngressoModalProps {
  /** Inscrito cujo QR está aberto; null = fechado. */
  inscrito: Inscrito | null;
  onClose: () => void;
}

export function QrIngressoModal({
  inscrito,
  onClose,
}: QrIngressoModalProps): JSX.Element | null {
  const [dataUri, setDataUri] = React.useState<string | null>(null);
  const [falhou, setFalhou] = React.useState(false);
  const token = inscrito?.qrToken ?? null;

  React.useEffect(() => {
    if (token === null) {
      setDataUri(null);
      setFalhou(false);
      return;
    }
    let vivo = true;
    setDataUri(null);
    setFalhou(false);
    QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 2, width: 320 })
      .then((uri) => {
        if (vivo) setDataUri(uri);
      })
      .catch(() => {
        if (vivo) setFalhou(true);
      });
    // Cancelamento: trocar de inscrito no meio do desenho não pode pintar o
    // QR do anterior na tela do seguinte — no balcão isso credencia a pessoa
    // errada.
    return () => {
      vivo = false;
    };
  }, [token]);

  if (inscrito === null) return null;

  const codigo = inscrito.codigoIngresso ?? null;

  return (
    <Modal
      open
      onOpenChange={(aberto) => {
        if (!aberto) onClose();
      }}
      title={`Ingresso de ${inscrito.atletaNome}`}
      size="sm"
    >
      <div className="flex flex-col items-center gap-[var(--spacing-4)]">
        {dataUri !== null ? (
          <img
            src={dataUri}
            alt={`QR do ingresso de ${inscrito.atletaNome}`}
            width={320}
            height={320}
            className="h-[var(--spacing-64)] w-[var(--spacing-64)] max-w-full rounded-[var(--radius-md)] bg-[var(--surface-default)]"
          />
        ) : falhou ? (
          <p
            role="alert"
            className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]"
          >
            Não foi possível desenhar o QR agora. Use o código abaixo para
            localizar a inscrição.
          </p>
        ) : (
          <p
            role="status"
            className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]"
          >
            Gerando o QR…
          </p>
        )}

        {codigo !== null && (
          <p className="flex flex-col items-center gap-[var(--spacing-1)]">
            <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
              Código do ingresso
            </span>
            {/* Mesmo tratamento do código de convite do clube (ConviteModal):
                código ditável em voz alta se lê melhor grande e espaçado. */}
            <span className="font-mono text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] tracking-[var(--table-header-spacing)] text-[var(--text-primary)]">
              {codigo}
            </span>
          </p>
        )}

        <p className="text-center text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          O QR é a prova de presença no credenciamento. O código serve para
          achar a pessoa na lista, e não vale como entrada.
        </p>
      </div>
    </Modal>
  );
}

QrIngressoModal.displayName = 'QrIngressoModal';
