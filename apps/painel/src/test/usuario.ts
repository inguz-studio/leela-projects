// =============================================================================
// `usuario()` — a instância de user-event que sabe do relógio (LEELA-DEBT-T3).
//
// POR QUE ISTO EXISTE (a causa de flake mais cara da suíte do painel).
//
// O `@testing-library/user-event` v14 é assíncrono por dentro: entre cada
// tecla, cada ponteiro e cada mudança de foco ele solta o event loop com um
// `setTimeout`. Num teste de relógio real isso custa microssegundos. Num teste
// que congelou o relógio (`vi.useFakeTimers`), esse `setTimeout` NUNCA dispara
// sozinho — quem dispara é o relógio, e o relógio está parado.
//
// O `shouldAdvanceTime: true` mascara o impasse em vez de resolvê-lo: ele faz o
// relógio falso andar sozinho a cada 20ms de tempo REAL. O teste não trava,
// mas cada tecla passa a custar um tique de 20ms de parede. Digitar "Corrida do
// Campeche" (19 caracteres, com os eventos de ponteiro e foco em volta) vira
// segundos de espera pura, e o `EventoForm` faz isso quinze vezes.
//
// Medido nesta máquina (8 núcleos), o arquivo `EventoForm.test.tsx` sozinho:
// 17,44s de tempo de teste com os tiques de 20ms; 4,87s quando o tique cai para
// 1ms. A conta não é o jsdom nem o React — é espera pelo relógio. Com a suíte
// inteira em paralelo, esses mesmos segundos disputam CPU e o teste que já
// gastava 2,9s isolado cruza o teto de 5s: o "verde isolado, vermelho sob
// carga" que a lane veio matar.
//
// A correção de CAUSA é dizer ao user-event QUAL relógio ele deve empurrar.
// Com `advanceTimers` ligado, ele adianta o relógio falso ele mesmo, na hora, e
// a espera desaparece — não encolhe, some. Não é um teto maior nem um tique
// menor: é o impasse deixando de existir.
//
// Fora de relógio falso a função é inerte: `vi.isFakeTimers()` é falso e o
// callback não toca em nada, então usar `usuario()` é sempre seguro (e é o que
// todo teste novo deve usar, com ou sem relógio congelado).
// =============================================================================

import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

type OpcoesUsuario = Parameters<typeof userEvent.setup>[0];

/** Instância de user-event acoplada ao relógio ativo do teste. */
export function usuario(opcoes: OpcoesUsuario = {}): ReturnType<typeof userEvent.setup> {
  return userEvent.setup({
    advanceTimers: (ms: number) => {
      // `vi.advanceTimersByTime` LANÇA se o relógio não estiver falsificado —
      // por isso a pergunta, e não um try/catch que engoliria erro de verdade.
      if (vi.isFakeTimers()) vi.advanceTimersByTime(ms);
    },
    ...opcoes,
  });
}
