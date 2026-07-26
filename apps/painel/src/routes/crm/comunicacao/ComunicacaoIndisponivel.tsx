// =============================================================================
// ComunicacaoIndisponivel — a subdivisão `/crm/comunicacao` enquanto o E19 ·
// S1901-T4a/b/c não entrega o disparo por segmento (travado na chave do Brevo).
//
// A RN-233 proíbe item de menu sem rota; a subdivisão precisa existir. O que
// ela NÃO pode ser é uma tela vazia parecendo funcional — lista sem itens,
// filtro que não filtra, botão que não dispara. Aqui o estado é declarado:
// diz o que ainda não existe, diz o que JÁ existe hoje e leva até lá.
//
// A comunicação por evento (E06) e por clube (E05) seguem funcionando nas
// próprias telas — o hub central soma, não substitui. Por isso a ação primária
// aponta para os eventos, que é onde a pessoa consegue disparar HOJE.
//
// Reuso: `SystemStateScreen` do DS na variante `maintenance` — zero componente
// novo, zero copy embutida no DS (a copy vem por prop, contrato do S500-T1).
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { SystemStateScreen } from '@leela/design-system';

export function ComunicacaoIndisponivel(): JSX.Element {
  const navigate = useNavigate();

  return (
    <SystemStateScreen
      variant="maintenance"
      layout="shell"
      title="Campanhas para a base ainda não estão disponíveis"
      message="O disparo por segmento da sua base de clientes está em construção. Enquanto isso, a comunicação por evento continua funcionando normalmente na aba Comunicação de cada evento."
      actions={[
        { label: 'Ver clientes', onPress: () => navigate('/crm/clientes'), variant: 'secondary' },
        { label: 'Ir para Eventos', onPress: () => navigate('/eventos'), variant: 'primary' },
      ]}
    />
  );
}

ComunicacaoIndisponivel.displayName = 'ComunicacaoIndisponivel';
