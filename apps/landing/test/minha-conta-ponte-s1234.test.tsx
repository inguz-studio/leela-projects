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
 * PONTE-CTA-1 (11/08) trocou a porta única pelos DOIS CTAs por intenção que o
 * dono pediu. O que mudou não foi o julgamento: foi o fato. A lane de 08/08
 * entregou um botão só porque a landing não mede nada, e a review antagonista
 * mostrou que a callable já loga por conta própria — um campo `intencao` nela
 * mede clique e conversão sem uma linha de telemetria. Então o título nomeia o
 * LUGAR (a palavra do dono) e os dois botões nomeiam os dois TRABALHOS, cada um
 * carimbando a própria intenção.
 *
 * PONTE-NOME-1 (11/08) acrescenta o único campo do cartão: o nome da produtora,
 * pré-preenchido com o nome da pessoa e editável. O slug do tenant é cunhado uma
 * vez e não se renomeia, então este campo é a última hora em que a escolha
 * existe. Ele é OPCIONAL — quem não tocar nele cai no comportamento de antes.
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
  // O argumento IMPORTA agora: é por ele que a intenção e o nome viajam.
  promoverParaProfissional: (arg: unknown) => promoverParaProfissional(arg),
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

/** Os dois rótulos, verbatim do dono. Ver `CTAS`. */
const ROTULO_CLUBE = /^criar club$/i;
const ROTULO_EVENTOS = /^organizar eventos$/i;

/** O botão que a maioria dos casos usa — qualquer um dos dois serve. */
const botaoConhecer = (): HTMLElement => screen.getByRole('button', { name: ROTULO_EVENTOS });

const campoDoNome = (): HTMLInputElement =>
  document.querySelector('[data-slot="ponte-nome-profissional"]') as HTMLInputElement;

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
    expect(screen.queryByRole('button', { name: ROTULO_EVENTOS })).toBeNull();
    expect(screen.queryByRole('button', { name: ROTULO_CLUBE })).toBeNull();
    expect(promoverParaProfissional).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PONTE-CTA-1 · os dois CTAs por intenção, e o carimbo que os torna legíveis
// ---------------------------------------------------------------------------

describe('⚔ PONTE-CTA-1 · o título nomeia o lugar, os dois botões nomeiam os trabalhos', () => {
  it('os dois rótulos são os do dono, sem paráfrase', async () => {
    await montar({ role: 'athlete' });
    const clube = document.querySelector('[data-slot="ponte-cta-clube"]');
    const eventos = document.querySelector('[data-slot="ponte-cta-eventos"]');
    expect((clube?.textContent ?? '').trim()).toBe('Criar Club');
    expect((eventos?.textContent ?? '').trim()).toBe('Organizar eventos');
    for (const b of [clube, eventos]) {
      // ⛔ O rótulo velho prometia a visita, não o trabalho. Não volta.
      expect((b?.textContent ?? '').toLowerCase()).not.toContain('conhecer');
      // ⛔ E não pode virar promessa de transformação da pessoa (RN-468).
      expect((b?.textContent ?? '').toLowerCase()).not.toContain('virar');
    }
  });

  it('o TÍTULO carrega a palavra do dono para o lugar', async () => {
    await montar({ role: 'athlete' });
    expect(screen.getByRole('heading', { name: /^painel profissional$/i })).toBeTruthy();
  });

  it('⚔ são exatamente DOIS botões, e cada um carimba uma intenção diferente', async () => {
    // Dois botões só se justificam porque a callable agora sabe qual foi
    // apertado. Um terceiro, ou dois com a mesma intenção, devolveriam o
    // cartão ao estado em que o teste não tem leitura.
    await montar({ role: 'athlete' });
    const cartao = document.querySelector('[data-slot="porta-conhecer-painel"]');
    const botoes = Array.from(cartao?.querySelectorAll('button') ?? []);
    expect(botoes).toHaveLength(2);
    const intencoes = botoes.map((b) => b.getAttribute('data-intencao'));
    expect(new Set(intencoes).size).toBe(2);
    expect(intencoes).toContain('clube');
    expect(intencoes).toContain('eventos');
  });

  it('⚔ cada botão manda a SUA intenção para o servidor', async () => {
    for (const [rotulo, intencao] of [
      [ROTULO_CLUBE, 'clube'],
      [ROTULO_EVENTOS, 'eventos'],
    ] as const) {
      promoverParaProfissional.mockReset();
      promoverParaProfissional.mockResolvedValue({
        statusOnboarding: 'aguardando_convite',
        jaExistia: false,
      });
      await montar({ role: 'athlete' });
      marcarTermo();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: rotulo }));
      });
      await waitFor(() => expect(promoverParaProfissional).toHaveBeenCalledTimes(1));
      expect(promoverParaProfissional.mock.calls[0]?.[0]).toMatchObject({ intencao });
      cleanup();
    }
  });

  it('⚔ enquanto um corre, o OUTRO não aceita clique — uma travessia, uma intenção', async () => {
    let liberar: (() => void) | null = null;
    promoverParaProfissional.mockImplementation(
      () =>
        new Promise((resolve) => {
          liberar = () => resolve({ statusOnboarding: 'aguardando_convite', jaExistia: false });
        })
    );
    await montar({ role: 'athlete' });
    marcarTermo();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: ROTULO_CLUBE }));
    });
    const outro = screen.getByRole('button', { name: ROTULO_EVENTOS });
    expect((outro as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      fireEvent.click(outro);
    });
    expect(promoverParaProfissional).toHaveBeenCalledTimes(1);
    await act(async () => {
      liberar?.();
    });
  });

  it('só o botão APERTADO vira "Abrindo…" — o outro guarda o próprio nome', async () => {
    let liberar: (() => void) | null = null;
    promoverParaProfissional.mockImplementation(
      () =>
        new Promise((resolve) => {
          liberar = () => resolve({ statusOnboarding: 'aguardando_convite', jaExistia: false });
        })
    );
    await montar({ role: 'athlete' });
    marcarTermo();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: ROTULO_CLUBE }));
    });
    expect(
      (document.querySelector('[data-slot="ponte-cta-clube"]')?.textContent ?? '').trim()
    ).toBe('Abrindo…');
    expect(
      (document.querySelector('[data-slot="ponte-cta-eventos"]')?.textContent ?? '').trim()
    ).toBe('Organizar eventos');
    await act(async () => {
      liberar?.();
    });
  });

  it('o cartão continua nomeando as duas áreas no texto', async () => {
    await montar({ role: 'athlete' });
    const texto = document.querySelector('[data-slot="porta-conhecer-painel"]')?.textContent ?? '';
    expect(texto).toMatch(/eventos/i);
    expect(texto).toMatch(/clubs?/i);
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
    // PONTE-ELEGIVEL-1 · a sexta recusa. Antes desta lane, o divulgador e a
    // ex-organizadora rebaixada atravessavam a porta e só ouviam "código
    // inválido" no resgate, dias depois.
    { motivo: 'conta_inelegivel', trecho: /fale com o time leela/i },
    { motivo: 'aceite_ausente', trecho: /aceite o termo/i },
    { motivo: 'aceite_datado_pelo_cliente', trecho: /recarregue a p[áa]gina/i },
    { motivo: 'indisponivel', trecho: /tente de novo/i },
    // ⛔ `nome_profissional_invalido` NÃO está nesta lista, e a ausência é o
    // conserto: ela é a única recusa que fala de um CAMPO, e por isso saiu do
    // `<p role="alert">` solto para o `errorMessage` do `Input` (PONTE-FIX ·
    // R3). Ela tem bloco próprio no fim deste arquivo.
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
// PONTE-NOME-1 · o nome da produtora, escolhido antes de virar permanente
// ---------------------------------------------------------------------------

describe('⚔ PONTE-NOME-1 · a porta pergunta o nome, e ele viaja', () => {
  it('o campo nasce PRÉ-PREENCHIDO com o nome da pessoa, e é editável', async () => {
    // O default não é invenção da tela: é exatamente o que o resgate usaria em
    // silêncio como semente do slug. O campo só devolve a caneta para a dona.
    await montar({ role: 'athlete', name: 'Ana Paula' });
    const campo = campoDoNome();
    expect(campo).not.toBeNull();
    expect(campo.value).toBe('Ana Paula');
    expect(campo.disabled).toBe(false);
    expect(campo.readOnly).toBe(false);
  });

  it('⚔ sem `name` no token, o campo nasce VAZIO — a tela não inventa nome pelo e-mail', async () => {
    // O degrau que o servidor desce quando não há nome (`email.split('@')[0]`)
    // não pode ser repetido aqui: repeti-lo seria dar cara de escolha a um
    // palpite que a pessoa nunca fez.
    await montar({ role: 'athlete', email: 'ana@exemplo.dev' });
    expect(campoDoNome().value).toBe('');
  });

  it('o campo tem label e a régua permanente escrita ao lado, não subentendida', async () => {
    await montar({ role: 'athlete', name: 'Ana Paula' });
    expect(screen.getByLabelText(/nome da sua produtora/i)).toBeTruthy();
    const cartao = document.querySelector('[data-slot="porta-conhecer-painel"]')?.textContent ?? '';
    expect(cartao).toMatch(/n[ãa]o muda/i);
  });

  it('⚔ o nome editado viaja na promoção, aparado', async () => {
    promoverParaProfissional.mockResolvedValue({
      statusOnboarding: 'aguardando_convite',
      jaExistia: false,
    });
    await montar({ role: 'athlete', name: 'Ana Paula' });
    fireEvent.change(campoDoNome(), { target: { value: '  Castelo Produções  ' } });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
    await waitFor(() => expect(promoverParaProfissional).toHaveBeenCalledTimes(1));
    expect(promoverParaProfissional.mock.calls[0]?.[0]).toMatchObject({
      nomeProfissional: 'Castelo Produções',
      intencao: 'eventos',
    });
  });

  it('⚔ o campo apagado manda string vazia — e isso é a escolha de não escolher', async () => {
    promoverParaProfissional.mockResolvedValue({
      statusOnboarding: 'aguardando_convite',
      jaExistia: false,
    });
    await montar({ role: 'athlete', name: 'Ana Paula' });
    fireEvent.change(campoDoNome(), { target: { value: '' } });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
    await waitFor(() => expect(promoverParaProfissional).toHaveBeenCalledTimes(1));
    expect(promoverParaProfissional.mock.calls[0]?.[0]).toMatchObject({ nomeProfissional: '' });
  });

  it('⚔ a recusa do nome some quando a pessoa corrige — a tela não fica presa no vermelho', async () => {
    promoverParaProfissional.mockRejectedValue(new Error('qualquer coisa'));
    motivoDaRecusaDaPromocao.mockReturnValue('nome_profissional_invalido');
    await montar({ role: 'athlete', name: 'Ana Paula' });
    fireEvent.change(campoDoNome(), { target: { value: '!!' } });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
    // A recusa mora NO CAMPO agora (PONTE-FIX · R3), então é o campo que se
    // limpa quando a pessoa corrige.
    await waitFor(() => expect(campoDoNome().getAttribute('aria-invalid')).toBe('true'));
    fireEvent.change(campoDoNome(), { target: { value: 'Castelo' } });
    expect(campoDoNome().getAttribute('aria-invalid')).toBeNull();
  });

  it('⚔ o campo é OPCIONAL: não bloqueia o botão nem substitui o aceite', async () => {
    // A porta existe para não ter formulário. Um campo que barrasse a travessia
    // teria devolvido ao beco exatamente quem ela tirou de lá.
    await montar({ role: 'athlete', email: 'ana@exemplo.dev' });
    expect(campoDoNome().value).toBe('');
    expect((botaoConhecer() as HTMLButtonElement).disabled).toBe(true);
    marcarTermo();
    expect((botaoConhecer() as HTMLButtonElement).disabled).toBe(false);
  });
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

// ---------------------------------------------------------------------------
// ⚔ PONTE-FIX · B2 — o campo não recusa quem nunca digitou
// ---------------------------------------------------------------------------
// A review antagonista mediu a cadeia inteira: o campo nascia com o `name` do
// token e o `conhecer` mandava esse valor SEM A PESSOA TOCAR EM NADA; o
// servidor recusa nome cujo `derivarSlugOrganizacao` é vazio; e `Анна`, `李` e
// `ゆき` derivam vazio porque o regex só preserva `[a-z0-9]` depois do NFD.
// Resultado: conta válida, nome próprio no campo, zero toque, clique — sétima
// recusa. O registro do maestro promete o oposto, em letras.
// ---------------------------------------------------------------------------

describe('⚔ PONTE-FIX · B2 · nome não latino no token não vira recusa', () => {
  /** Os três nomes da evidência da review. Gente real, contas válidas. */
  const NAO_LATINOS = ['Анна', '李', 'ゆき'];

  for (const nome of NAO_LATINOS) {
    it(`⚔ \`${nome}\` no token: o campo nasce VAZIO — não é palpite que a pessoa não fez`, async () => {
      await montar({ role: 'athlete', name: nome });
      expect(campoDoNome().value).toBe('');
    });

    it(`⚔ \`${nome}\` sem tocar em nada ATRAVESSA — o comportamento de antes da lane`, async () => {
      // Este é o caso que a lane quebrou e que o registro promete. Sem o
      // conserto, o payload levava o nome e o servidor devolvia a sétima
      // recusa para quem nunca digitou.
      promoverParaProfissional.mockResolvedValue({
        statusOnboarding: 'aguardando_convite',
        jaExistia: false,
        intencaoRegistrada: 'eventos',
        nomeAplicado: false,
      });
      await montar({ role: 'athlete', name: nome });
      // Antes do clique: o campo está limpo, sem erro. É o estado de quem
      // chegou e não mexeu em nada.
      expect(campoDoNome().getAttribute('aria-invalid')).toBeNull();
      marcarTermo();
      await act(async () => {
        fireEvent.click(botaoConhecer());
      });
      await waitFor(() => expect(promoverParaProfissional).toHaveBeenCalledTimes(1));
      // Campo vazio ⇒ string vazia no payload ⇒ o servidor lê como AUSENTE e
      // cai no caminho de antes. Nenhuma recusa aparece.
      expect(promoverParaProfissional.mock.calls[0]?.[0]).toMatchObject({
        nomeProfissional: '',
      });
      expect(document.querySelector('[data-slot="ponte-recusa"]')).toBeNull();
      await screen.findByRole('link', { name: /ir para o painel profissional/i });
    });
  }

  it('nome latino no token continua pré-preenchido — o conserto não apaga o default bom', async () => {
    // A régua é derivabilidade, e não "só ASCII": um caractere latino no meio
    // do não latino já basta, e o campo tem de mostrar o nome inteiro.
    for (const [nome, esperado] of [
      ['Ana Paula', 'Ana Paula'],
      ['José', 'José'],
      ['Анна2', 'Анна2'],
      ['李 Produções', '李 Produções'],
    ] as const) {
      await montar({ role: 'athlete', name: nome });
      expect(campoDoNome().value, nome).toBe(esperado);
      cleanup();
    }
  });

  it('⚔ quem DIGITA um nome que não vira endereço continua sendo recusado', async () => {
    // O conserto do B2 é sobre quem NÃO tocou. Quem apagou o campo e escreveu
    // `李` fez uma escolha, e descartá-la em silêncio é o defeito que o item
    // inteiro existe para matar — o endereço é cunhado uma vez.
    promoverParaProfissional.mockRejectedValue(new Error('qualquer coisa'));
    motivoDaRecusaDaPromocao.mockReturnValue('nome_profissional_invalido');
    await montar({ role: 'athlete', name: 'Ana Paula' });
    fireEvent.change(campoDoNome(), { target: { value: '李' } });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
    await waitFor(() => expect(campoDoNome().getAttribute('aria-invalid')).toBe('true'));
    expect(promoverParaProfissional.mock.calls[0]?.[0]).toMatchObject({ nomeProfissional: '李' });
  });

  it('⚔ a FRASE da recusa não mente mais sobre a régua', async () => {
    // `ゆき` tem duas letras. A frase antiga — "pelo menos duas letras ou
    // números" — mandava a pessoa contar letras que ela já tinha.
    promoverParaProfissional.mockRejectedValue(new Error('qualquer coisa'));
    motivoDaRecusaDaPromocao.mockReturnValue('nome_profissional_invalido');
    await montar({ role: 'athlete', name: 'Ana Paula' });
    fireEvent.change(campoDoNome(), { target: { value: 'ゆき' } });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
    const frase = await waitFor(() => {
      const el = document.getElementById('ponte-nome-profissional-error');
      expect(el).not.toBeNull();
      return el?.textContent ?? '';
    });
    expect(frase).not.toMatch(/duas letras ou n[úu]meros/i);
    expect(frase).toMatch(/a a z/i);
    expect(frase).toMatch(/n[úu]mero/i);
  });
});

// ---------------------------------------------------------------------------
// ⚔ PONTE-FIX · R3 — o erro do campo é do CAMPO
// ---------------------------------------------------------------------------

describe('⚔ PONTE-FIX · R3 · a recusa do nome é associada ao campo', () => {
  async function recusarONome(): Promise<void> {
    promoverParaProfissional.mockRejectedValue(new Error('qualquer coisa'));
    motivoDaRecusaDaPromocao.mockReturnValue('nome_profissional_invalido');
    await montar({ role: 'athlete', name: 'Ana Paula' });
    fireEvent.change(campoDoNome(), { target: { value: '!!' } });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
  }

  it('⚔ o campo ganha `aria-invalid` de verdade', async () => {
    await recusarONome();
    await waitFor(() => expect(campoDoNome().getAttribute('aria-invalid')).toBe('true'));
  });

  it('⚔ o `aria-describedby` do campo aponta para a frase da recusa', async () => {
    // Sem isto, quem usa leitor de tela ouve um alerta e não sabe QUAL campo
    // recusou — era o estado anterior, com a frase solta no fim do cartão.
    await recusarONome();
    await waitFor(() => expect(campoDoNome().getAttribute('aria-invalid')).toBe('true'));
    const descritores = (campoDoNome().getAttribute('aria-describedby') ?? '').split(/\s+/);
    expect(descritores).toContain('ponte-nome-profissional-error');
    const alvo = document.getElementById('ponte-nome-profissional-error');
    expect(alvo?.textContent ?? '').toMatch(/endere[çc]o da sua produtora/i);
    // A régua permanente continua descrita, e ela não se move quando o erro
    // aparece: os dois convivem no `aria-describedby`.
    expect(descritores).toContain('ponte-nome-profissional-hint');
  });

  it('⚔ a frase sai de UM lugar só — nada de leitor de tela anunciando em dobro', async () => {
    await recusarONome();
    await waitFor(() => expect(campoDoNome().getAttribute('aria-invalid')).toBe('true'));
    expect(document.querySelector('[data-slot="ponte-recusa"]')).toBeNull();
    const cartao = document.querySelector('[data-slot="porta-conhecer-painel"]');
    const ocorrencias = (cartao?.textContent ?? '').split('O endereço da sua produtora é escrito')
      .length - 1;
    expect(ocorrencias).toBe(1);
  });

  it('as recusas que falam da CONTA continuam no alerta do cartão — elas não têm campo', async () => {
    promoverParaProfissional.mockRejectedValue(new Error('qualquer coisa'));
    motivoDaRecusaDaPromocao.mockReturnValue('conta_inelegivel');
    await montar({ role: 'athlete', name: 'Ana Paula' });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
    await waitFor(() =>
      expect(document.querySelector('[data-slot="ponte-recusa"]')).not.toBeNull()
    );
    expect(campoDoNome().getAttribute('aria-invalid')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ⚔ PONTE-FIX · R1 — o retorno da callable deixou de ser descartado
// ---------------------------------------------------------------------------

describe('⚔ PONTE-FIX · R1 · o descarte silencioso no ramo idempotente', () => {
  /** O que o servidor devolve quando aceitou a travessia e NÃO gravou o nome. */
  const NAO_APLICOU = {
    statusOnboarding: 'aguardando_convite' as const,
    jaExistia: true,
    intencaoRegistrada: 'eventos' as const,
    nomeAplicado: false,
  };

  it('⚔ nome digitado + `nomeAplicado: false` → a tela DIZ que o nome não entrou', async () => {
    promoverParaProfissional.mockResolvedValue(NAO_APLICOU);
    await montar({ role: 'athlete', name: 'Ana Paula' });
    fireEvent.change(campoDoNome(), { target: { value: 'Castelo Produções' } });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
    const aviso = await waitFor(() => {
      const el = document.querySelector('[data-slot="ponte-nome-nao-aplicado"]');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    expect(aviso.textContent ?? '').toMatch(/j[áa] tinha um/i);
    // E a travessia continua sendo oferecida: o aviso não vira obstáculo.
    await screen.findByRole('link', { name: /ir para o painel profissional/i });
  });

  it('⚔ SEM nome digitado, `nomeAplicado: false` não vira aviso nenhum', async () => {
    // Quem não escolheu nada não perdeu nada. Avisar aqui seria inventar uma
    // perda e assustar a pessoa no exato momento em que ela atravessou.
    promoverParaProfissional.mockResolvedValue(NAO_APLICOU);
    await montar({ role: 'athlete', name: 'Ana Paula' });
    fireEvent.change(campoDoNome(), { target: { value: '' } });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
    await screen.findByRole('link', { name: /ir para o painel profissional/i });
    expect(document.querySelector('[data-slot="ponte-nome-nao-aplicado"]')).toBeNull();
  });

  it('nome digitado e APLICADO não vira aviso — o caminho feliz segue mudo', async () => {
    promoverParaProfissional.mockResolvedValue({
      statusOnboarding: 'aguardando_convite',
      jaExistia: false,
      intencaoRegistrada: 'eventos',
      nomeAplicado: true,
    });
    await montar({ role: 'athlete', name: 'Ana Paula' });
    fireEvent.change(campoDoNome(), { target: { value: 'Castelo Produções' } });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
    await screen.findByRole('link', { name: /ir para o painel profissional/i });
    expect(document.querySelector('[data-slot="ponte-nome-nao-aplicado"]')).toBeNull();
  });

  it('⚔ servidor SEM o eco (deploy anterior) não produz aviso — ausência não é fato', async () => {
    // `nomeAplicado: undefined` é "não sei", e não "não aplicou". Inferir
    // descarte a partir de silêncio inventaria uma perda que pode não existir.
    promoverParaProfissional.mockResolvedValue({
      statusOnboarding: 'aguardando_convite',
      jaExistia: true,
    });
    await montar({ role: 'athlete', name: 'Ana Paula' });
    fireEvent.change(campoDoNome(), { target: { value: 'Castelo Produções' } });
    marcarTermo();
    await act(async () => {
      fireEvent.click(botaoConhecer());
    });
    await screen.findByRole('link', { name: /ir para o painel profissional/i });
    expect(document.querySelector('[data-slot="ponte-nome-nao-aplicado"]')).toBeNull();
  });

  it('⚔ a tela LÊ o retorno: `PortasDaConta.tsx` não descarta mais a promessa', async () => {
    // A prova estrutural do R1. O defeito era literal — `await
    // promoverParaProfissional({…})` sem atribuição — e um refactor
    // desatento o traz de volta sem quebrar nenhum caso de comportamento.
    const fonte = readFileSync(
      resolve(__dirname, '../app/(public)/minha-conta/PortasDaConta.tsx'),
      'utf8'
    );
    const semComentarios = fonte
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');
    expect(semComentarios).not.toMatch(/^\s*await promoverParaProfissional\(/m);
    expect(semComentarios).toMatch(/=\s*await promoverParaProfissional\(/);
    expect(semComentarios).toContain('nomeAplicado');
  });
});
