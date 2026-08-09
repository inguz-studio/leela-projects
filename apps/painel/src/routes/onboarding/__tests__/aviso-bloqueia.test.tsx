// =============================================================================
// O AVISO BLOQUEIA DE VERDADE (VITRINE-VEU-1 · corte de 09/08).
//
// Este arquivo é a sonda da review REV-VITRINE (DEF-R1) virada teste. O que ela
// mediu, no painel montado, com o aviso aberto:
//
//   [PROBE] dialog portalizado no body?    false
//   [PROBE] focaveis FORA do dialog: 8
//   [PROBE] amostra fora: A:Visão Geral | A:Eventos | A:Clubs | A:CRM |
//                         A:Marcas | A:Configurações | BUTTON: |
//                         BUTTON:Como receber o código
//   [PROBE] body.style.overflow = ""
//   [PROBE] URL depois do clique de AT: /marcas
//   [PROBE] dialog AINDA na tela? true
//
// O véu parava o hit-test do mouse e mais nada. Um `element.click()` sintético
// — o clique que VoiceOver, NVDA e TalkBack emitem, que não passa por hit-test
// — navegou o painel para `/marcas` com o aviso "bloqueante" na frente, em
// silêncio absoluto (os ouvintes da captura saem do documento enquanto o aviso
// está aberto).
//
// A MEDIÇÃO É DE ALCANCE, NÃO DE PIXEL. A pergunta não é "o véu cobre?" — é
// "quantos controles do fundo ainda existem para a tecnologia assistiva?". Cada
// caso conta os focáveis fora do aviso que NÃO estão sob `inert`, porque `inert`
// é o que tira a subárvore da árvore de acessibilidade. Zero é o contrato.
//
// ⚠️ O QUE ESTE ARQUIVO NÃO PODE MEDIR, e não finge medir: o jsdom não
// implementa o comportamento do `inert` — ele guarda o atributo e não bloqueia
// clique nem foco. Então não existe aqui um caso "o clique sintético não
// navega": ele passaria pelo motivo errado hoje e pelo motivo certo amanhã, sem
// distinguir os dois. O que se mede é a propriedade que o navegador consome —
// os oito controles estão dentro de uma subárvore inerte —, e a falsificação
// mora no primeiro caso: a mesma sonda, com o aviso FECHADO, acha os controles.
//
// O painel é montado INTEIRO (`App`) de propósito: seis dos oito controles são
// da sidebar, que o `RootShell` desenha ACIMA do gate. Um teste que montasse só
// o gate mediria dois controles e passaria verde com o menu de pé.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, cleanup, within } from '@testing-library/react';
import { CONTATO_ONBOARDING_PADRAO } from '@leela/core';
import { usuario } from '@/test/usuario';
import { ATRIBUTO_INERTE } from '../_lib/fundoInerte';

vi.mock('../../../lib/firebase', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isModoEmulador: () => false,
  initFirebase: () => undefined,
}));

/**
 * O crachá que o token devolve. Começa VAZIO (conta em vitrine) e o resgate
 * bem-sucedido o troca por um com tenant — é assim que a vitrine cai pela
 * SESSÃO, que é o caminho feliz do produto e o que a review pegou quebrado.
 */
let crachaAtual: Record<string, unknown> = {};

vi.mock('@leela/api-client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const espelho: Record<string, unknown> = {};
  for (const [nome, valor] of Object.entries(original)) {
    espelho[nome] = typeof valor === 'function' ? () => undefined : valor;
  }
  return {
    ...espelho,
    onSessionChange: (cb: (u: { uid: string } | null) => void) => {
      cb({ uid: 'u-vitrine' });
      return () => {};
    },
    getClaims: async () => crachaAtual,
    getLeelaDb: () => ({}),
    getLeelaFunctions: () => ({}),
    getContatoOnboarding: async () => CONTATO_ONBOARDING_PADRAO,
    resgatarConviteOrganizador: async () => {
      crachaAtual = { role: 'organizer', tenantId: 't-1' };
      return { ok: true };
    },
  };
});

const { App } = await import('../../../App');

/** O mesmo seletor de focáveis que a sonda da review usou. */
const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

async function abrirVitrine(url = '/'): Promise<void> {
  window.history.pushState({}, '', url);
  render(<App />);
  await act(async () => {
    await Promise.resolve();
  });
}

function itemDeMenu(nome: RegExp): HTMLElement {
  const nav = screen.getByRole('navigation', { name: /Navegação principal/i });
  return within(nav).getByRole('link', { name: nome });
}

/** Sobe o aviso pelo gesto do dono: clicar numa aba de menu. */
async function subirOAviso(): Promise<void> {
  await usuario().click(itemDeMenu(/Eventos/i));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
}

/** Todo focável do documento que está FORA do aviso. */
function foraDoAviso(): HTMLElement[] {
  const dialogo = screen.queryByRole('dialog');
  return [...document.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(
    (no) => dialogo === null || !dialogo.contains(no),
  );
}

/**
 * Os focáveis do fundo que a tecnologia assistiva AINDA alcança: fora do aviso
 * e fora de qualquer subárvore inerte.
 */
function alcancaveisNoFundo(): HTMLElement[] {
  return foraDoAviso().filter((no) => no.closest(`[${ATRIBUTO_INERTE}]`) === null);
}

/** Nomes legíveis, para o erro dizer QUEM sobrou em vez de só um número. */
function nomes(nos: readonly HTMLElement[]): string[] {
  return nos.map((no) => `${no.tagName}:${(no.textContent ?? '').trim().slice(0, 28)}`);
}

/**
 * Os OITO da sonda, nominais e na ordem do documento.
 *
 * A lista da review, medida no navegador, e a desta suíte, medida no jsdom,
 * batem elemento a elemento — inclusive o `BUTTON:` sem texto, que é o botão de
 * recolher a sidebar. Seis são da sidebar, que vive ACIMA deste gate; um é da
 * moldura; um é o CTA da própria vitrine.
 *
 * A lista é nominal de propósito. Um número (`>= 6`) passaria verde no dia em
 * que a sidebar perdesse metade dos itens por outro motivo, e é justamente aí
 * que a medição precisa falar.
 */
const OITO_CONTROLES_DO_FUNDO: readonly string[] = [
  'A:Visão Geral',
  'A:Eventos',
  'A:Clubs',
  'A:CRM',
  'A:Marcas',
  'A:Configurações',
  'BUTTON:',
  'BUTTON:Como receber o código Leela',
];

beforeEach(() => {
  vi.clearAllMocks();
  crachaAtual = {};
});

afterEach(() => {
  cleanup();
  crachaAtual = {};
  window.history.pushState({}, '', '/');
});

describe('vitrine · o fundo sai do alcance enquanto o aviso está na frente (DEF-R1)', () => {
  it('FALSIFICAÇÃO: com o aviso fechado, a mesma sonda acha os controles do fundo', async () => {
    // Sem este caso, os outros mediriam o nada. É a mesma função, no mesmo
    // painel, com o aviso fora da tela: se ela devolvesse vazio aqui, o zero
    // dos casos seguintes não significaria coisa nenhuma.
    await abrirVitrine();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(nomes(alcancaveisNoFundo())).toEqual(OITO_CONTROLES_DO_FUNDO);
  });

  it('com o aviso aberto, nenhum controle do fundo continua alcançável', async () => {
    await abrirVitrine();
    await subirOAviso();
    const sobraram = alcancaveisNoFundo();
    expect(nomes(sobraram)).toEqual([]);
  });

  it('os controles do fundo continuam existindo — estão inertes, não apagados', async () => {
    // O conserto não some com o painel: ele o tira do alcance. A diferença
    // importa para a saída (fechar devolve tudo) e para o desenho, que continua
    // visível por baixo do véu, que é o que o dono pediu em 06/08.
    await abrirVitrine();
    await subirOAviso();
    expect(nomes(foraDoAviso())).toEqual(OITO_CONTROLES_DO_FUNDO);
  });

  it('o link que a AT clicou na review está dentro da subárvore inerte', async () => {
    // O clique sintético da sonda achou "Marcas" e navegou para `/marcas` com o
    // aviso na frente. É este nó, nomeado.
    await abrirVitrine();
    const marcas = itemDeMenu(/Marcas/i);
    await subirOAviso();
    expect(marcas.closest(`[${ATRIBUTO_INERTE}]`)).not.toBeNull();
  });

  it('a região viva da vitrine também fica inerte (a sobra do vetor 7)', async () => {
    // A review falsificou o medo do vetor 7 (o `EmptyState` não reanuncia ao
    // navegar — mesmo nó, mesmo conteúdo). O que ela deixou de pé foi menor e
    // era a mesma raiz do DEF-R1: existe UMA região viva no painel da conta em
    // vitrine, ela está fora do dialog, e não estava nem `aria-hidden` nem
    // inerte. Agora está.
    await abrirVitrine();
    await subirOAviso();
    const regioes = [...document.querySelectorAll<HTMLElement>('[role="status"]')];
    expect(regioes.length).toBeGreaterThan(0);
    for (const regiao of regioes) {
      expect(regiao.closest(`[${ATRIBUTO_INERTE}]`)).not.toBeNull();
    }
  });

  it('fechar devolve o painel ao mundo — o `inert` não fica preso', async () => {
    await abrirVitrine();
    await subirOAviso();
    await usuario().click(screen.getByRole('button', { name: /Continuar olhando/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector(`[${ATRIBUTO_INERTE}]`)).toBeNull();
    expect(nomes(alcancaveisNoFundo())).toEqual(OITO_CONTROLES_DO_FUNDO);
  });
});

// =============================================================================
// O FUNDO VOLTA AO MUNDO — as duas saídas que a review pegou quebradas
// (REV-CORTE · 09/08). As duas são invisíveis para quem só olha o efeito do
// `inert`, porque o jsdom não o implementa; as duas são medíveis pelo ATRIBUTO,
// que é a propriedade que o navegador consome.
// =============================================================================

describe('vitrine · o `inert` cai em TODA saída, não só no botão (REV-CORTE)', () => {
  it('o resgate que DÁ CERTO devolve o painel ao mundo', async () => {
    // O caminho feliz do produto inteiro: a pessoa digita o código Leela, ele
    // vale, a vitrine cai pela SESSÃO e o painel de verdade aparece. O aviso
    // some sem passar por `fechar`, e era exatamente aí que o `inert` ficava
    // preso no contêiner do app: aviso fora da tela, painel na tela, e nenhum
    // dos seis links do menu alcançável até um F5. Medido pela review.
    await abrirVitrine();
    await usuario().click(
      screen.getByRole('button', { name: /Como receber o código Leela/i }),
    );
    expect(document.querySelector(`[${ATRIBUTO_INERTE}]`)).not.toBeNull();

    await usuario().type(screen.getByLabelText(/Já tem o código Leela/i), 'ABCDEFGH');
    await usuario().click(screen.getByRole('button', { name: /Liberar acesso/i }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 0));
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector(`[${ATRIBUTO_INERTE}]`)).toBeNull();
  });

  it('o retorno de foco NÃO acontece dentro da subárvore inerte', async () => {
    // O `useDialogBehavior` devolve o foco ao abridor no desmonte, e o React
    // processa a remoção da subárvore ANTES da limpeza do efeito do pai. Com o
    // `inert` saindo só na limpeza, o `focus()` caía num nó inerte — no-op no
    // navegador, foco largado no `<body>`, teclado recomeçando do topo da
    // página (WCAG 2.4.3). É a promessa que a adoção do `Modal` veio cumprir.
    //
    // O jsdom foca assim mesmo (não implementa `inert`), então o caso não pode
    // olhar o `activeElement`: ele registra ONDE o `focus()` foi chamado.
    const chamadas: { alvo: string; sobInerte: boolean }[] = [];
    const focoOriginal = HTMLElement.prototype.focus;
    Object.defineProperty(HTMLElement.prototype, 'focus', {
      configurable: true,
      writable: true,
      value: function espiao(this: HTMLElement, ...args: unknown[]): void {
        chamadas.push({
          alvo: `${this.tagName}:${(this.textContent ?? '').trim().slice(0, 20)}`,
          sobInerte: this.closest(`[${ATRIBUTO_INERTE}]`) !== null,
        });
        (focoOriginal as (...a: unknown[]) => void).apply(this, args);
      },
    });

    try {
      await abrirVitrine();
      const clubs = itemDeMenu(/Clubs/i);
      await usuario().click(clubs);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      chamadas.length = 0;
      await usuario().keyboard('{Escape}');

      // O abridor recebe o foco de volta — e o recebe alcançável.
      expect(chamadas.map((c) => c.alvo)).toContain('A:Clubs');
      expect(chamadas.filter((c) => c.sobInerte)).toEqual([]);
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'focus', {
        configurable: true,
        writable: true,
        value: focoOriginal,
      });
    }
  });
});

describe('vitrine · o aviso é a peça do DS, com o que ela traz (VITRINE-VEU-1)', () => {
  it('o aviso é portalizado para o `body`, fora do `<main>` do painel', async () => {
    // O dialog morava dentro do `<main class="overflow-hidden">` — dentro da
    // mesma subárvore que ele dizia estar neutralizando.
    await abrirVitrine();
    await subirOAviso();
    const dialogo = screen.getByRole('dialog');
    expect(dialogo.parentElement).toBe(document.body);
    expect(dialogo.closest('main')).toBeNull();
  });

  it('a rolagem do documento trava enquanto o aviso está na tela', async () => {
    await abrirVitrine();
    expect(document.body.style.overflow).toBe('');
    await subirOAviso();
    expect(document.body.style.overflow).toBe('hidden');
    await usuario().keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });

  it('o foco entra no aviso e o Esc devolve o painel', async () => {
    await abrirVitrine();
    await subirOAviso();
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    await usuario().keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
