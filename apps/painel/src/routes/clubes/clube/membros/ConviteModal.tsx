// =============================================================================
// ConviteModal — modal de convite de membros (S104-T1). 3 tabs internas:
// Link público · Por código · Por email. Construído sobre o Modal do DS, que
// já entrega as 4 vias de fechamento (X, Esc, clique no overlay, botão
// cancelar no rodapé — C10). A tab Email valida via validarConvite (RN-106).
//
// ⚠ CONTRATO p/ backend: o envio de convites por email (`onEnviar`) depende de
// uma Function de convite que ainda não existe em @leela/api-client. A tela
// valida e chama o callback; a entrega real é do backend. Ver SUMMARY §Bloqueios.
// =============================================================================

import { useMemo, useState } from 'react';
import { Button, Modal, Tabs, Textarea, useToast } from '@leela/design-system';
import type { TabItem } from '@leela/design-system';
import type { Clube } from '@leela/core';
import { parseEmails, validarConvite } from '@leela/core';
import { linkClubePublico } from '@/lib/linkPublico';

export interface ConviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clube: Clube;
  /** Envia os convites por email (mutation do backend) — injetado pelo container. */
  onEnviar?: (emails: string[]) => void;
}

type AbaConvite = 'link' | 'codigo' | 'email';

function CampoCopiavel({ label, valor, onCopiar }: { label: string; valor: string; onCopiar: () => void }): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-[var(--spacing-3)] rounded-[var(--radius-md)] bg-[var(--surface-base)] p-[var(--spacing-3)]">
        <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{valor}</span>
        <Button variant="ghost" onClick={onCopiar}>
          Copiar
        </Button>
      </div>
    </div>
  );
}

export function ConviteModal({ open, onOpenChange, clube, onEnviar }: ConviteModalProps): JSX.Element {
  const { toast } = useToast();
  const [aba, setAba] = useState<AbaConvite>('link');
  const [rawEmails, setRawEmails] = useState('');

  const link = `${linkClubePublico(clube.slug)}/convite/${clube.codigoConvite}`;
  const emails = useMemo(() => parseEmails(rawEmails), [rawEmails]);
  const resultado = useMemo(() => validarConvite(emails), [emails]);

  async function copiar(valor: string, label: string): Promise<void> {
    try {
      await navigator.clipboard?.writeText(valor);
      toast({ variant: 'success', title: `${label} copiado` });
    } catch {
      toast({ variant: 'danger', title: `Não foi possível copiar o ${label.toLowerCase()}` });
    }
  }

  function enviar(): void {
    if (!resultado.valido) return;
    // O container (MembrosPage) chama o callable real e dá o feedback com a
    // contagem efetiva (após dedupe no servidor) — o modal só valida e fecha.
    onEnviar?.(emails);
    setRawEmails('');
    onOpenChange(false);
  }

  const tabs: TabItem[] = [
    {
      id: 'link',
      label: 'Link público',
      content: (
        <CampoCopiavel label="Link de convite" valor={link} onCopiar={() => void copiar(link, 'Link')} />
      ),
    },
    {
      id: 'codigo',
      label: 'Por código',
      content: (
        <div className="flex flex-col items-center gap-[var(--spacing-4)] py-[var(--spacing-4)]">
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">Código de convite</span>
          <span className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] tracking-[var(--table-header-spacing)] text-[var(--text-primary)]">
            {clube.codigoConvite}
          </span>
          <Button variant="ghost" onClick={() => void copiar(clube.codigoConvite, 'Código')}>
            Copiar código
          </Button>
        </div>
      ),
    },
    {
      id: 'email',
      label: 'Por email',
      content: (
        <div className="flex flex-col gap-[var(--spacing-3)]">
          <Textarea
            id="convite-emails"
            label="Emails dos convidados"
            rows={4}
            value={rawEmails}
            onChange={(e) => setRawEmails(e.target.value)}
            placeholder="pedro@gmail.com, ana@gmail.com, carlos@outlook.com"
          />
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]" aria-live="polite">
            {emails.length > 0
              ? `${emails.length} email(s) · máximo 50 por envio`
              : 'Separe os emails por vírgula, ponto e vírgula ou linha nova (máx. 50)'}
          </p>
          {resultado.erros.length > 0 && emails.length > 0 ? (
            <p role="alert" className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg)]">
              {resultado.erros.join(' ')}
            </p>
          ) : null}
        </div>
      ),
    },
  ];

  const footer =
    aba === 'email' ? (
      <>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button variant="primary" disabled={!resultado.valido} onClick={enviar}>
          Enviar convites
        </Button>
      </>
    ) : (
      <>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={() =>
            aba === 'link' ? void copiar(link, 'Link') : void copiar(clube.codigoConvite, 'Código')
          }
        >
          {aba === 'link' ? 'Copiar link' : 'Copiar código'}
        </Button>
      </>
    );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Convidar membros"
      description={`Adicione novos atletas ao ${clube.nome}`}
      footer={footer}
    >
      <Tabs
        tabs={tabs}
        value={aba}
        onValueChange={(id) => setAba(id as AbaConvite)}
        aria-label="Formas de convidar"
      />
    </Modal>
  );
}

ConviteModal.displayName = 'ConviteModal';
