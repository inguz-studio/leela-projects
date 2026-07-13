// =============================================================================
// Forbidden (403 · Painel) — LEELA-E07-web · S501-T1.
//
// Tela COMPARTILHADA de acesso negado (reusada pelo 403 de evento — RequirePapel
// — e, quando E16-L2 fechar, pelo 403 de plataforma). Puramente apresentacional:
// não decide autorização (isso é da guarda + `podeAcessar` do core). Copy
// HANDOFF-07. "Voltar" (history back) + "Falar com o organizador" (mailto —
// decisão #7: `mailto:{SUPORTE_LEELA}`, placeholder até o Vitor nomear o domínio;
// a ação nunca fica morta).
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { SystemStateScreen } from '@leela/design-system';

// Placeholder da mesma família de {DOMINIO_LEELA} (decisão #7). Endereço
// definitivo entra quando o domínio for nomeado; deep-link do tenant é V1.1.
const SUPORTE_LEELA = 'suporte@leela.com.br';

export function Forbidden(): JSX.Element {
  const navigate = useNavigate();

  return (
    <SystemStateScreen
      variant="forbidden"
      layout="shell"
      title="Esse espaço ainda não é seu"
      message="Você não tem permissão para ver esta área."
      actions={[
        { label: 'Voltar', onPress: () => navigate(-1), variant: 'secondary' },
        {
          label: 'Falar com o organizador',
          onPress: () => undefined,
          variant: 'ghost',
          href: `mailto:${SUPORTE_LEELA}`,
        },
      ]}
    />
  );
}

Forbidden.displayName = 'Forbidden';
