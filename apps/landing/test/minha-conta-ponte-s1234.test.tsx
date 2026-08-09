/**
 * minha-conta-ponte-s1234.test.tsx — LEELA-S1234-T2 · RN-512/513/514
 *
 * A ponte da área do cliente para o painel profissional, nos dois estados.
 *
 * O que este arquivo falsifica, e por que cada caso existe:
 *   - quem JÁ é profissional vê saída, não cadastro, e o segundo login está
 *     dito ANTES do clique (PCLIENTE-3 · RN-513);
 *   - quem ainda não é vê convite com aceite, e o botão morto tem razão
 *     escrita ao lado — nunca em silêncio;
 *   - o DUPLO CLIQUE não chega ao servidor duas vezes (a idempotência de lá é
 *     a segunda defesa, não a única);
 *   - a promoção acontece SEM a tela mandar versão ou data do termo: quem
 *     carimba é o servidor (RN-446/RN-466);
 *   - cada recusa vira frase própria, e nenhuma chega como erro cru;
 *   - a máscara anti-enumeração continua INTACTA: a área não exercita mais o
 *     `/cadastrar` do painel, e sessão anônima não alcança este cartão.
 *
 * PONTE-RET-D1 (direção do dono de 07/08) acrescenta o que o rótulo passou a
 * dever: o botão diz "Painel Profissional" — o lugar, com o texto exato do dono
 * —, o cartão NOMEIA as duas intenções que ele pediu, e a porta continua UMA só
 * enquanto a landing não tiver medição. Um segundo botão disparando a mesma
 * promoção é um teste que não mede nada, e este arquivo falha se ele aparecer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.setConfig({ testTimeout: 20_000 });

const getClaims = vi.fn();
const promoverParaProfissional = vi.fn();
const motivoDaRecusaDaPromocao = vi.fn();

vi.mock('@leela/api-client', () => ({
  getClaims: () => getClaims(),
  promoverParaProfissional: () => promoverParaProfissional(),
  motivoDaRecusaDaPromocao: (e: unknown) => motivoDaRecusaDaPromocao(e),
}));
vi.mock('@/lib/leelaClient', () => ({ ensureLeela: () => undefined }));

async function montar(claims: Record<string, unknown>): Promise<void> {
  getClaims.mockResolvedValue(claims);
  const { PortasDaConta } = await import('@/app/(public)/minha-conta/PortasDaConta');
  await act(async () => {
    render(<PortasDaConta />);
  });
  await waitFor(() => expect(getClaims).toHaveBeenCalled());
}

/** O rótulo da variante 1, verbatim do dono. Ver `ROTULO_DA_TRAVESSIA`. */
const ROTULO_CTA = /^painel profissional$/i;

const botaoConhecer = (): HTMLElement => screen.getByRole('button', { name: ROTULO_CTA });

const marcarTermo = (): void => {
  fireEvent.click(screen.getByLabelText(/li e aceito o termo do profissional/i));
};

beforeEach(() => {
  getClaims.mockReset();
  promoverParaProfissional.mockReset();
  motivoDaRecusaDaPromocao.mockReset();
  motivoDaRecusaDaPromocao.mockReturnValue('indisponivel');
});

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Fluxo A · quem já é profissional atravessa
// ---------------------------------------------------------------------------

describe('S1234-T2 · quem JÁ é profissional', () => {
  it('vê saída para o painel PROFISSIONAL, e não um cadastro (RN-468)', async () => {
    await montar({ role: 'tenant_owner', tenantId: 'castelo' });
    const link = screen.getByRole('link', { name: /ir para o painel profissional/i });
    expect(link.getAttribute('href')).toMatch(/\/entrar$/);
    // O rebatismo da RN-468: o rótulo não pode voltar a dizer "organizador".
    expect(link.textContent?.toLowerCase()).not.toContain('organizador');
  });

  it('⚔ PCLIENTE-3 · o segundo login está dito ANTES do clique', async () => {
    await montar({ role: 'tenant_owner', tenantId: 'castelo' });
    const cartao = document.querySelector('[data-slot="porta-organizador"]');
    expect(cartao?.textContent ?? '').toMatch(/senha de novo/i);
    // E é frase de expectativa, não obstáculo: nenhum diálogo entre ela e o
    // painel (a forma errada que o inventário de telas nomeia).
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('não propõe promoção nenhuma a quem já atravessou', async () => {
    await montar({ role: 'tenant_owner', tenantId: 'castelo' });
    expect(screen.queryByRole('button', { name: ROTULO_CTA })).toBeNull();
    expect(promoverParaProfissional).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PONTE-RET-D1 · o rótulo do dono, e a porta única que ele não vira
// ---------------------------------------------------------------------------

describe('⚔ PONTE-RET-D1 · o rótulo nomeia o lugar, o cartão nomeia os trabalhos', () => {
  it('o CTA é exatamente "Painel Profissional" — texto do dono, sem paráfrase', async () => {
    await montar({ role: 'athlete' });
    const botao = document.querySelector('[data-slot="ponte-cta-painel-profissional"]');
    expect(botao).not.toBeNull();
    expect((botao?.textContent ?? '').trim()).toBe('Painel Profissional');
    // ⛔ O rótulo velho prometia a visita, não o lugar. Não volta.
    expect((botao?.textContent ?? '').toLowerCase()).not.toContain('conhecer');
    // ⛔ E não pode virar promessa de transformação da pessoa (RN-468).
    expect((botao?.textContent ?? '').toLowerCase()).not.toContain('virar');
  });

  it('o cartão nomeia as DUAS intenções que o dono pediu', async () => {
    await montar({ role: 'athlete' });
    const texto = document.querySelector('[data-slot="porta-conhecer-painel"]')?.textContent ?? '';
    expect(texto).toMatch(/eventos/i);
    expect(texto).toMatch(/clubs?/i);
  });

  it('⚔ a porta é UMA — dois botões sem medição seriam um teste que não mede', async () => {
    // A landing não tem uma linha de telemetria. Um segundo CTA disparando a
    // mesma promoção não diria qual intenção converteu, e cobraria da pessoa
    // uma decisão a mais no cartão que existe para desbloquear um beco.
    await montar({ role: 'athlete' });
    const cartao = document.querySelector('[data-slot="porta-conhecer-painel"]');
    const botoes = Array.from(cartao?.querySelectorAll('button') ?? []);
    expect(botoes).toHaveLength(1);
  });

  it('⚔ o cartão NÃO promete criação de clube na landing', async () => {
    // A tela de criação existe, mas mora no painel (`/clubes/novo`) e atrás do
    // tenant. Nada aqui pode sugerir que ela abre deste lado.
    await montar({ role: 'athlete' });
    for (const a of Array.from(document.querySelectorAll('a[href]'))) {
      expect(a.getAttribute('href') ?? '').not.toContain('/clubes');
    }
  });
});

// ---------------------------------------------------------------------------
// Fluxo B · quem só é cliente conhece o painel profissional
// ---------------------------------------------------------------------------

describe('S1234-T2 · quem AINDA NÃO é profissional', () => {
  it('o cartão convida sem prometer que ela vira profissional no clique', async () => {
    await montar({ role: 'athlete' });
    const cartao = document.querySelector('[data-slot="porta-conhecer-painel"]');
    const texto = cartao?.textContent ?? '';
    expect(texto).toMatch(/mesma conta/i);
    expect(texto).toMatch(/c[óo]digo/i);
    // ⛔ RN-450 · a copy NÃO pode voltar a dizer que a conta nasce separada:
    // o que nasce separado é o documento de perfil, não a conta.
    expect(texto.toLowerCase()).not.toContain('nasce separada');
  });

  it('o termo nasce DESMARCADO e o botão nasce desabilitado, com a razão escrita', async () => {
    await montar({ role: 'athlete' });
    const termo = screen.getByLabelText(/li e aceito o termo do profissional/i);
    expect((termo as HTMLInputElement).checked).toBe(false);
    expect((botaoConhecer() as HTMLButtonElement).disabled).toBe(true);
    expect(
      document.querySelector('[data-slot="ponte-razao-desabilitado"]')?.textContent ?? ''
    ).toMatch(/aceite o termo/i);
  });

  it('com o termo aceito, a promoção sai e a tela oferece a travessia', async () => {
    promoverParaProfissional.mockResolvedValue({
      statusOnboarding: 'aguardando_convite',
      jaExistia: false,
    });
    await montar({ role: 'athlete' });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
    await waitFor(() => expect(promoverParaProfissional).toHaveBeenCalledTimes(1));
    const link = await screen.findByRole('link', { name: /ir para o painel profissional/i });
    expect(link.getAttribute('href')).toMatch(/\/entrar$/);
    // RN-514: o destino é a vitrine, alcançada pelo `/entrar` do painel — e o
    // aviso do segundo login continua na tela depois do sucesso.
    expect(
      document.querySelector('[data-slot="porta-conhecer-painel"]')?.textContent ?? ''
    ).toMatch(/senha de novo/i);
  });

  it('⚔ a conta já promovida antes tem o MESMO desfecho, sem mensagem de erro', async () => {
    promoverParaProfissional.mockResolvedValue({
      statusOnboarding: 'aguardando_convite',
      jaExistia: true,
    });
    await montar({ role: 'athlete' });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
    await screen.findByRole('link', { name: /ir para o painel profissional/i });
    expect(document.querySelector('[data-slot="ponte-recusa"]')).toBeNull();
  });

  it('⚔ DUPLO CLIQUE · dois cliques no mesmo instante viram UMA chamada', async () => {
    // A trava é um ref, e não o estado: `setFase` é assíncrono e dois cliques
    // no mesmo tick leem a fase antiga. Sem o ref, o servidor recebia duas.
    let liberar: (() => void) | null = null;
    promoverParaProfissional.mockImplementation(
      () =>
        new Promise((resolve) => {
          liberar = () =>
            resolve({ statusOnboarding: 'aguardando_convite', jaExistia: false });
        })
    );
    await montar({ role: 'athlete' });
    marcarTermo();
    const botao = botaoConhecer();
    await act(async () => {
      fireEvent.click(botao);
      fireEvent.click(botao);
      fireEvent.click(botao);
    });
    expect(promoverParaProfissional).toHaveBeenCalledTimes(1);
    await act(async () => {
      liberar?.();
    });
  });

  it('o botão fica ocupado enquanto a promoção corre', async () => {
    let liberar: (() => void) | null = null;
    promoverParaProfissional.mockImplementation(
      () =>
        new Promise((resolve) => {
          liberar = () =>
            resolve({ statusOnboarding: 'aguardando_convite', jaExistia: false });
        })
    );
    await montar({ role: 'athlete' });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
    const ocupado = screen.getByRole('button', { name: /abrindo/i });
    expect((ocupado as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      liberar?.();
    });
  });
});

// ---------------------------------------------------------------------------
// As recusas — cada uma com frase própria, nenhuma crua
// ---------------------------------------------------------------------------

describe('S1234-T2 · as recusas viram frase, nunca erro cru', () => {
  const casos: { motivo: string; trecho: RegExp }[] = [
    { motivo: 'sem_sessao', trecho: /sess[ãa]o expirou/i },
    { motivo: 'sessao_anonima', trecho: /e-mail da sua conta/i },
    { motivo: 'conta_de_plataforma', trecho: /administra a plataforma/i },
    { motivo: 'aceite_ausente', trecho: /aceite o termo/i },
    { motivo: 'aceite_datado_pelo_cliente', trecho: /recarregue a p[áa]gina/i },
    { motivo: 'indisponivel', trecho: /tente de novo/i },
  ];

  for (const caso of casos) {
    it(`recusa \`${caso.motivo}\` vira a frase do produto`, async () => {
      promoverParaProfissional.mockRejectedValue(new Error('qualquer coisa'));
      motivoDaRecusaDaPromocao.mockReturnValue(caso.motivo);
      await montar({ role: 'athlete' });
      marcarTermo();
      await act(async () => {
        fireEvent.click(botaoConhecer());
      });
      const alerta = await waitFor(() => {
        const el = document.querySelector('[data-slot="ponte-recusa"]');
        expect(el).not.toBeNull();
        return el as HTMLElement;
      });
      expect(alerta.textContent ?? '').toMatch(caso.trecho);
      // Nem o objeto de erro, nem "internal", nem stack.
      expect(alerta.textContent ?? '').not.toMatch(/internal|error|\[object/i);
    });
  }
});

// ---------------------------------------------------------------------------
// ⚔ A máscara anti-enumeração continua intacta
// ---------------------------------------------------------------------------

describe('⚔ RN-512 · a máscara anti-enumeração do painel não é mais exercitada', () => {
  it('nenhuma porta da área alcança o `/cadastrar` do painel', async () => {
    await montar({ role: 'athlete' });
    for (const a of Array.from(document.querySelectorAll('a[href]'))) {
      expect(a.getAttribute('href') ?? '').not.toContain('/cadastrar');
    }
  });

  it('a ponte não conhece `criarContaComEmail` — não existe segundo cadastro na landing', () => {
    const fonte = readFileSync(
      resolve(__dirname, '../app/(public)/minha-conta/PortasDaConta.tsx'),
      'utf8'
    );
    const semComentarios = fonte
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');
    expect(semComentarios).not.toContain('criarContaComEmail');
    expect(semComentarios).not.toContain('/cadastrar');
  });

  it('a tela NÃO manda versão nem data do termo — quem carimba é o servidor', () => {
    // RN-446/RN-466: um payload com `aceitoEm` ou `versao` é uma tela tentando
    // datar consentimento, e o servidor recusa. A tela nem tem como tentar.
    const fonte = readFileSync(
      resolve(__dirname, '../app/(public)/minha-conta/PortasDaConta.tsx'),
      'utf8'
    );
    const semComentarios = fonte
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');
    expect(semComentarios).not.toContain('aceitoEm');
    expect(semComentarios).not.toMatch(/TERMO_LGPD_VERSAO|versao:/);
  });

  it('⚔ RN-449 · conta de administração da plataforma continua sem porta nenhuma', async () => {
    await montar({ role: 'platform_admin' });
    expect(document.querySelectorAll('a[href]')).toHaveLength(0);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
