// =============================================================================
// useSair — encerrar a sessão, de um lugar só (Leva 16).
//
// Até 13/08 o logout do painel existia num ponto único e escondido: o botão
// "Sair da conta" dentro de `/conta`. O dono pediu a saída onde ela é
// procurada, na íntegra: *"ao clicar no nome do usuário, na barra demenu devo
// visualizar 'sair' como opção de logou e configurações. Ambos com pequenos
// icones."*
//
// Duas superfícies passam a oferecer a mesma ação, e por isso ela sai da tela e
// vira hook. Copiar as dez linhas para o popover teria criado a segunda cópia
// do fail-safe abaixo — que é a parte que ninguém lembra de repetir igual.
//
// O fail-safe, escrito uma vez: se `logout()` lançar, ainda assim navegamos
// para `/entrar`. Quem clicou em sair pediu para sair; segurar a pessoa dentro
// de uma sessão que ela encerrou é o pior desfecho possível, e o erro que
// causaria isso (rede caída no meio do signOut) é justamente o mais provável.
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '@leela/api-client';

export interface Saida {
  /** Encerra a sessão e leva ao login. Nunca rejeita. */
  sair: () => Promise<void>;
  /** `true` entre o clique e a navegação — para desabilitar o disparo duplo. */
  saindo: boolean;
}

export function useSair(): Saida {
  const navigate = useNavigate();
  const [saindo, setSaindo] = useState(false);

  async function sair(): Promise<void> {
    setSaindo(true);
    try {
      // `signOut` limpa a sessão persistida do Firebase no navegador.
      await logout();
    } catch {
      // Ignorado de propósito — ver o fail-safe no cabeçalho.
    } finally {
      navigate('/entrar', { replace: true });
    }
  }

  return { sair, saindo };
}
