// =============================================================================
// ParceriaDestrutivaModal — ações destrutivas de parceria (S107-T4 / §2.15).
// Reusa o ConfirmModal do DS com preview de consequências (perde em Vulcão /
// mantém em Vitória — RN-124). Duas variantes: desativar patrocinador e remover
// evento promovido. A mutação real é injetada por `onConfirm` (container).
// =============================================================================

import { ConfirmModal } from '@leela/design-system';

export type VarianteDestrutiva = 'desativar-patrocinador' | 'remover-evento';

export interface ParceriaDestrutivaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variante: VarianteDestrutiva;
  /** Nome/identificador exibido no preview (patrocinador ou evento). */
  nome: string;
  onConfirm: () => void;
}

interface Copy {
  title: string;
  description: string;
  loses: string[];
  keeps: string[];
  confirmLabel: string;
}

const COPY: Record<VarianteDestrutiva, Copy> = {
  'desativar-patrocinador': {
    title: 'Desativar patrocinador',
    description: 'O patrocinador deixa de aparecer nas páginas do clube.',
    loses: [
      'A exibição do patrocinador nas páginas do clube',
      'Os benefícios ativos da parceria',
      'O acompanhamento de contrapartidas',
    ],
    keeps: ['O histórico do patrocínio', 'A possibilidade de reativar depois'],
    confirmLabel: 'Desativar patrocinador',
  },
  'remover-evento': {
    title: 'Remover evento promovido',
    description: 'O clube deixa de promover este evento afiliado.',
    loses: [
      'O link master e o cupom de afiliação ativos',
      'Novas conversões atribuídas ao clube',
      'A exibição do evento nas páginas do clube',
    ],
    keeps: [
      'As conversões e comissões já registradas (trilha)',
      'Os termos do programa do organizador',
    ],
    confirmLabel: 'Remover evento',
  },
};

export function ParceriaDestrutivaModal({
  open,
  onOpenChange,
  variante,
  nome,
  onConfirm,
}: ParceriaDestrutivaModalProps): JSX.Element {
  const copy = COPY[variante];
  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      description={copy.description}
      target={<strong>{nome}</strong>}
      loses={copy.loses}
      keeps={copy.keeps}
      confirmLabel={copy.confirmLabel}
      onConfirm={onConfirm}
    />
  );
}

ParceriaDestrutivaModal.displayName = 'ParceriaDestrutivaModal';
