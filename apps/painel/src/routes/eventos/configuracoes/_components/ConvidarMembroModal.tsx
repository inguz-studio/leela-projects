// =============================================================================
// ConvidarMembroModal — convite de membro (S304-T3 · E04-L5). Modal (4 vias de
// fechamento herdadas do DS Modal) com nome + e-mail (opcional) + papel. O
// papel oferecido vem de `papeisPermitidos` (papeisConvidaveis(gestor) — nunca
// organizador, RN-320/Rule). Validação pura (validaConvidar) + Toast (§2.12).
// O convite nasce `convidado`; a ATIVAÇÃO (uid + claims) é da Function quando o
// membro entra — a UI não finge que já é ativo.
// =============================================================================

import * as React from 'react';
import { Button, Input, Modal, Select, useToast } from '@leela/design-system';
import type { ConvidarMembroEquipeInput, PapelConvite } from '@leela/api-client';
import { LABEL_PAPEL } from '../_lib/equipeLabels';
import {
  validaConvidar,
  type ConvidarValues,
  type ErrosConvidar,
} from '../_lib/convidarForm';

export interface ConvidarMembroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Papéis que o gestor pode convidar (papeisConvidaveis) — nunca vazio ao abrir. */
  papeisPermitidos: PapelConvite[];
  onConvidar: (input: ConvidarMembroEquipeInput) => Promise<void>;
}

const VAZIO: ConvidarValues = { nome: '', email: '', papel: '' };

export function ConvidarMembroModal({
  open,
  onOpenChange,
  papeisPermitidos,
  onConvidar,
}: ConvidarMembroModalProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = React.useState<ConvidarValues>(VAZIO);
  const [erros, setErros] = React.useState<ErrosConvidar>({});
  const [enviando, setEnviando] = React.useState(false);

  // Zera + default de papel a cada abertura (primeiro papel permitido).
  React.useEffect(() => {
    if (open) {
      setValues({ ...VAZIO, papel: papeisPermitidos[0] ?? '' });
      setErros({});
    }
  }, [open, papeisPermitidos]);

  function set<K extends keyof ConvidarValues>(campo: K, valor: ConvidarValues[K]) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  async function handleConvidar() {
    const { valido, erros: novos } = validaConvidar(values, papeisPermitidos);
    setErros(novos);
    if (!valido) return;
    setEnviando(true);
    try {
      await onConvidar({
        nome: values.nome.trim(),
        email: values.email.trim() || null,
        papel: values.papel as PapelConvite,
      });
      toast({ variant: 'success', title: 'Convite enviado' });
      onOpenChange(false);
    } catch {
      toast({
        variant: 'danger',
        title: 'Não foi possível convidar',
        description: 'Você pode não ter permissão para gerir a equipe.',
      });
    } finally {
      setEnviando(false);
    }
  }

  const opcoes = papeisPermitidos.map((p) => ({ value: p, label: LABEL_PAPEL[p] }));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Convidar membro"
      description="O membro entra como convite pendente e é ativado quando acessa o painel."
      footer={
        <>
          <Button variant="secondary" disabled={enviando} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={enviando} onClick={() => void handleConvidar()}>
            {enviando ? 'Enviando…' : 'Enviar convite'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-[var(--spacing-4)]">
        <Input
          id="convite-nome"
          label="Nome"
          value={values.nome}
          onChange={(e) => set('nome', e.target.value)}
          errorMessage={erros.nome ?? ''}
          placeholder="Nome do membro"
        />
        <Input
          id="convite-email"
          type="email"
          label="E-mail (opcional)"
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          errorMessage={erros.email ?? ''}
          placeholder="pessoa@exemplo.com"
        />
        <Select
          id="convite-papel"
          label="Papel"
          options={opcoes}
          value={values.papel}
          onChange={(e) => set('papel', e.target.value)}
        />
        {erros.papel ? (
          <span role="alert" className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]">
            {erros.papel}
          </span>
        ) : null}
      </div>
    </Modal>
  );
}

ConvidarMembroModal.displayName = 'ConvidarMembroModal';
