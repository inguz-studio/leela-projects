// =============================================================================
// `/plataforma/contas` (ADMIN-VISAO onda 5 · S1615-T2). Os casos são os do GATE
// da onda, e são quatro:
//
//   1. o modo Fila é o padrão, e mostra só quem espera;
//   2. NÃO existe export, CSV nem download em lugar nenhum da tela (RN-540) —
//      nem palavra, nem botão, nem link de download;
//   3. o CPF NÃO é coluna: ele é revelado POR LINHA, sob gesto explícito, e
//      nenhuma consulta sai só por a tela ter sido montada (V-4);
//   4. a metade do documento estrangeiro, que não tem fonte, aparece com a
//      causa NOMEADA — não some em silêncio.
//
// Hooks de dado mockados — as leituras têm teste próprio em `functions/src/
// __tests__/adminVisaoOnda5Diretorio.test.ts` e o callable auditado em
// `adminVisaoOnda5Documento.test.ts`.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as DesignSystem from '@leela/design-system';
import { ContasRoute } from '../ContasRoute';
import type { ListaGlobalState } from '../../_data/listasGlobais';
import type { ContaDoDiretorio, ContaProfissionalView } from '@leela/api-client';
import type { EstadoDaIdentificacao } from '../_lib/contas';

const mocks = vi.hoisted(() => ({
  useFilaDeContas: vi.fn(),
  useDiretorioDeContas: vi.fn(),
  useIdentificacoes: vi.fn(),
  useLiberacaoDeAcesso: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../_data/contas', () => ({
  useFilaDeContas: mocks.useFilaDeContas,
  useDiretorioDeContas: mocks.useDiretorioDeContas,
  useIdentificacoes: mocks.useIdentificacoes,
  useLiberacaoDeAcesso: mocks.useLiberacaoDeAcesso,
}));

vi.mock('@leela/design-system', async () => {
  const real = await vi.importActual<typeof DesignSystem>('@leela/design-system');
  return { ...real, useToast: () => ({ toast: mocks.toast }) };
});

const ts = (iso: string) =>
  ({ toDate: () => new Date(iso) }) as unknown as ContaProfissionalView['criadoEm'];

function mkProfissional(
  over: Partial<ContaProfissionalView> = {}
): ContaProfissionalView {
  return {
    id: 'uid-marina',
    papel: 'organizador',
    nome: 'Marina Duarte',
    email: 'marina@castelo.com.br',
    organizacao: 'Castelo Produções',
    telefone: '48999998888',
    statusOnboarding: 'aguardando_convite',
    criadoEm: ts('2026-08-01T12:00:00Z'),
    ...over,
  };
}

function mkAtleta(over: Partial<ContaDoDiretorio> = {}): ContaDoDiretorio {
  return {
    id: 'uid-atleta',
    papel: 'atleta',
    nome: 'Joana Corredora',
    email: 'joana@exemplo.com',
    criadoEm: ts('2026-07-01T12:00:00Z'),
    ...over,
  } as ContaDoDiretorio;
}

function estado<T>(over: Partial<ListaGlobalState<T>> = {}): ListaGlobalState<T> {
  return {
    itens: [],
    loading: false,
    loadingMore: false,
    error: null,
    temMais: false,
    carregarMais: vi.fn(),
    refetch: vi.fn(),
    ...over,
  };
}

const identificar = vi.fn();

function comIdentificacoes(porConta: Record<string, EstadoDaIdentificacao> = {}): void {
  mocks.useIdentificacoes.mockReturnValue({ porConta, identificar });
}

const liberar = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useFilaDeContas.mockReturnValue(estado<ContaProfissionalView>());
  mocks.useDiretorioDeContas.mockReturnValue(estado<ContaDoDiretorio>());
  comIdentificacoes();
  liberar.mockResolvedValue('castelo-producoes');
  mocks.useLiberacaoDeAcesso.mockReturnValue({
    running: false,
    liberar,
    ultimoErro: () => null,
  });
});

// ---------------------------------------------------------------------------
// 1 · Fila é o padrão
// ---------------------------------------------------------------------------

describe('ContasRoute · a Fila é o modo padrão', () => {
  it('abre na Fila, e a Fila é quem lê o recorte de quem espera', () => {
    mocks.useFilaDeContas.mockReturnValue(
      estado<ContaProfissionalView>({ itens: [mkProfissional()] })
    );
    render(<ContasRoute />);

    expect(screen.getByRole('button', { name: 'Fila' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      screen.getByText(/ainda espera liberação de acesso/)
    ).toBeInTheDocument();
  });

  it('a Fila mostra nome, e-mail, organização, telefone, cadastro, identificação e a ação', () => {
    mocks.useFilaDeContas.mockReturnValue(
      estado<ContaProfissionalView>({ itens: [mkProfissional()] })
    );
    render(<ContasRoute />);

    const cabecalhos = screen
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    // A identificação vem ANTES da ação: conferir quem é a pessoa acontece no
    // instante anterior ao clique de liberar (job story do V-4).
    expect(cabecalhos).toEqual([
      'Nome',
      'E-mail',
      'Organização',
      'Telefone',
      'Cadastro',
      'Identificação',
      'Ação',
    ]);
    expect(screen.getByText('Marina Duarte')).toBeInTheDocument();
    expect(screen.getByText('marina@castelo.com.br')).toBeInTheDocument();
    expect(screen.getByText('(48) 99999-8888')).toBeInTheDocument();
  });

  it('campo não coletado vira traço, não célula vazia', () => {
    mocks.useFilaDeContas.mockReturnValue(
      estado<ContaProfissionalView>({
        itens: [mkProfissional({ organizacao: '', telefone: '' })],
      })
    );
    render(<ContasRoute />);

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('vazia, a fila diz que ninguém espera — não finge erro', () => {
    render(<ContasRoute />);
    expect(screen.getByText('Ninguém esperando')).toBeInTheDocument();
  });

  it('o contador não apresenta o carregado como total enquanto houver página', () => {
    mocks.useFilaDeContas.mockReturnValue(
      estado<ContaProfissionalView>({
        itens: [mkProfissional({ id: 'a' }), mkProfissional({ id: 'b' })],
        temMais: true,
      })
    );
    render(<ContasRoute />);

    expect(
      screen.getByText('Mostrando 2 contas · há mais para carregar')
    ).toBeInTheDocument();
    expect(screen.queryByText(/de \d+ contas/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2 · Sem saída em massa (RN-540) — o gate da onda
// ---------------------------------------------------------------------------

describe('ContasRoute · sem export, CSV nem download (RN-540)', () => {
  const PROIBIDAS = /export|exportar|csv|baixar|download|planilha|xlsx|enviar por e-mail/i;

  it('a Fila não tem nenhuma dessas palavras nem botão de download', () => {
    mocks.useFilaDeContas.mockReturnValue(
      estado<ContaProfissionalView>({ itens: [mkProfissional()] })
    );
    const { container } = render(<ContasRoute />);

    expect(container.textContent ?? '').not.toMatch(PROIBIDAS);
    expect(container.querySelector('a[download]')).toBeNull();
    expect(
      screen.queryAllByRole('button').filter((b) => PROIBIDAS.test(b.textContent ?? ''))
    ).toHaveLength(0);
  });

  it('o Diretório também não tem — nem depois de revelar um documento', async () => {
    mocks.useDiretorioDeContas.mockReturnValue(
      estado<ContaDoDiretorio>({ itens: [mkAtleta()] })
    );
    comIdentificacoes({
      'uid-atleta': { situacao: 'revelado', texto: '111.444.777-35', ambiguo: false },
    });
    const { container } = render(<ContasRoute />);

    await userEvent.click(screen.getByRole('button', { name: 'Diretório' }));

    expect(container.textContent ?? '').not.toMatch(PROIBIDAS);
    expect(container.querySelector('a[download]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2b · A coluna de CPF não existe em modo nenhum (V-4)
//
// A regra que barra a planilha de CPF é sobre a COLUNA vir preenchida, não sobre
// o modo. Se a célula já nascesse com o número, a montagem da página dispararia
// uma consulta auditada por linha — saída em massa com outro nome.
// ---------------------------------------------------------------------------

describe('ContasRoute · nenhum modo tem coluna de CPF', () => {
  const CPF = '111.444.777-35';

  it('a Fila: cabeçalho é o gesto, e nenhum CPF aparece sem clique', () => {
    mocks.useFilaDeContas.mockReturnValue(
      estado<ContaProfissionalView>({
        itens: [mkProfissional({ id: 'a' }), mkProfissional({ id: 'b' })],
      })
    );
    const { container } = render(<ContasRoute />);

    expect(
      screen.queryByRole('columnheader', { name: /^CPF$/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Identificação' })).toBeInTheDocument();
    expect(container.textContent ?? '').not.toContain(CPF);
    expect(identificar).not.toHaveBeenCalled();
  });

  it('o Diretório: idem — a coluna é o botão, nunca o número', async () => {
    mocks.useDiretorioDeContas.mockReturnValue(
      estado<ContaDoDiretorio>({ itens: [mkAtleta({ id: 'x' }), mkAtleta({ id: 'y' })] })
    );
    const { container } = render(<ContasRoute />);

    await userEvent.click(screen.getByRole('button', { name: 'Diretório' }));

    expect(
      screen.queryByRole('columnheader', { name: /^CPF$/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Identificação' })).toBeInTheDocument();
    expect(container.textContent ?? '').not.toContain(CPF);
    expect(identificar).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2c · A identificação na FILA (V-4 — o job story é o de quem AGE)
//
// "Quando eu vou liberar o acesso de alguém, eu quero ter certeza de quem é a
// pessoa, para não liberar a conta errada." O caso de uso da spec é duas pessoas
// com nomes parecidos — que é esta tela, no instante anterior ao clique.
// ---------------------------------------------------------------------------

describe('ContasRoute · identificação na Fila', () => {
  beforeEach(() => {
    mocks.useFilaDeContas.mockReturnValue(
      estado<ContaProfissionalView>({
        itens: [
          mkProfissional({ id: 'uid-marina-1', nome: 'Marina Duarte' }),
          mkProfissional({ id: 'uid-marina-2', nome: 'Marina Duarte' }),
        ],
      })
    );
  });

  it('revelar uma linha chama o callable UMA vez e só para aquela conta', async () => {
    render(<ContasRoute />);

    const botoes = screen.getAllByRole('button', { name: 'Identificar' });
    expect(botoes).toHaveLength(2);

    await userEvent.click(botoes[1] as HTMLElement);

    expect(identificar).toHaveBeenCalledTimes(1);
    expect(identificar).toHaveBeenCalledWith('uid-marina-2');
  });

  it('revelado, a linha mostra o CPF — e a linha vizinha continua oculta', () => {
    comIdentificacoes({
      'uid-marina-1': { situacao: 'revelado', texto: '111.444.777-35', ambiguo: false },
    });
    render(<ContasRoute />);

    expect(screen.getByText('111.444.777-35')).toBeInTheDocument();
    // A homônima segue com o botão: a revelação é por linha, não por página.
    expect(screen.getAllByRole('button', { name: 'Identificar' })).toHaveLength(1);
  });

  it('sem documento, a Fila mostra a CAUSA — quem vai liberar precisa saber por que não dá para conferir', () => {
    comIdentificacoes({
      'uid-marina-1': {
        situacao: 'ausente',
        causa: 'Esta conta não tem registro de identidade na plataforma.',
      },
    });
    render(<ContasRoute />);

    expect(
      screen.getByText('Esta conta não tem registro de identidade na plataforma.')
    ).toBeInTheDocument();
  });

  it('o aviso de consulta registrada aparece na Fila, antes do clique', () => {
    render(<ContasRoute />);

    expect(
      screen.getByText(/Cada consulta de documento fica registrada/)
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3 · Diretório: papel por linha, identificação sob gesto (V-4)
// ---------------------------------------------------------------------------

describe('ContasRoute · o Diretório', () => {
  beforeEach(() => {
    mocks.useDiretorioDeContas.mockReturnValue(
      estado<ContaDoDiretorio>({
        itens: [mkProfissional() as ContaDoDiretorio, mkAtleta()],
      })
    );
  });

  async function abrirDiretorio(): Promise<void> {
    await userEvent.click(screen.getByRole('button', { name: 'Diretório' }));
  }

  it('mostra as contas das DUAS origens com o papel de cada uma', async () => {
    render(<ContasRoute />);
    await abrirDiretorio();

    expect(screen.getByRole('columnheader', { name: 'Papel' })).toBeInTheDocument();
    expect(screen.getByText('Organizador')).toBeInTheDocument();
    expect(screen.getByText('Atleta')).toBeInTheDocument();
  });

  it('NENHUMA consulta de documento sai só por a tela ter sido montada', async () => {
    render(<ContasRoute />);
    await abrirDiretorio();

    // O gesto é o que dispara — e o gate é este: uma coluna preenchida faria o
    // painel emitir uma consulta auditada por linha da página.
    expect(identificar).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: 'Identificar' })).toHaveLength(2);
  });

  it('o aviso de que a consulta fica registrada aparece ANTES do clique', async () => {
    render(<ContasRoute />);
    await abrirDiretorio();

    expect(
      screen.getByText(/Cada consulta de documento fica registrada/)
    ).toBeInTheDocument();
  });

  it('clicar em Identificar consulta UMA conta — a da linha, e só ela', async () => {
    render(<ContasRoute />);
    await abrirDiretorio();

    await userEvent.click(
      screen.getAllByRole('button', { name: 'Identificar' })[0] as HTMLElement
    );

    expect(identificar).toHaveBeenCalledTimes(1);
    expect(identificar).toHaveBeenCalledWith('uid-marina');
  });

  it('revelado, a célula mostra o CPF formatado no lugar do botão', async () => {
    comIdentificacoes({
      'uid-marina': { situacao: 'revelado', texto: '111.444.777-35', ambiguo: false },
    });
    render(<ContasRoute />);
    await abrirDiretorio();

    expect(screen.getByText('111.444.777-35')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Identificar' })).toHaveLength(1);
  });

  it('identificação ambígua é dita, não escondida', async () => {
    comIdentificacoes({
      'uid-marina': { situacao: 'revelado', texto: '111.444.777-35', ambiguo: true },
    });
    render(<ContasRoute />);
    await abrirDiretorio();

    expect(
      screen.getByText('Esta conta tem mais de um registro de identidade.')
    ).toBeInTheDocument();
  });

  it('sem documento, a célula mostra a CAUSA — nunca um traço mudo', async () => {
    comIdentificacoes({
      'uid-marina': {
        situacao: 'ausente',
        causa: 'Esta conta não tem registro de identidade na plataforma.',
      },
    });
    render(<ContasRoute />);
    await abrirDiretorio();

    expect(
      screen.getByText('Esta conta não tem registro de identidade na plataforma.')
    ).toBeInTheDocument();
  });

  it('o Diretório é LEITURA: nenhuma linha oferece liberar acesso', async () => {
    render(<ContasRoute />);
    await abrirDiretorio();

    expect(
      screen.queryByRole('button', { name: 'Liberar acesso' })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Ação' })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4 · A metade sem fonte aparece com a causa (V-4)
// ---------------------------------------------------------------------------

describe('ContasRoute · documento estrangeiro sem fonte', () => {
  it('o Diretório declara a lacuna com a causa nomeando o que falta', async () => {
    mocks.useDiretorioDeContas.mockReturnValue(
      estado<ContaDoDiretorio>({ itens: [mkAtleta()] })
    );
    render(<ContasRoute />);

    await userEvent.click(screen.getByRole('button', { name: 'Diretório' }));

    expect(screen.getByText('Documento estrangeiro')).toBeInTheDocument();
    expect(
      screen.getByText(/Não existe campo de documento estrangeiro no modelo de dados/)
    ).toBeInTheDocument();
  });

  it('a lacuna aparece TAMBÉM na Fila — quem age é quem não pode descobrir tarde', () => {
    mocks.useFilaDeContas.mockReturnValue(
      estado<ContaProfissionalView>({ itens: [mkProfissional()] })
    );
    render(<ContasRoute />);

    expect(screen.getByText('Documento estrangeiro')).toBeInTheDocument();
    expect(
      screen.getByText(/Não existe campo de documento estrangeiro no modelo de dados/)
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 5 · Liberação direta (RN-548)
// ---------------------------------------------------------------------------

describe('ContasRoute · liberação direta', () => {
  beforeEach(() => {
    mocks.useFilaDeContas.mockReturnValue(
      estado<ContaProfissionalView>({ itens: [mkProfissional()] })
    );
  });

  it('liberar passa por confirmação com as consequências na tela', async () => {
    render(<ContasRoute />);

    await userEvent.click(screen.getByRole('button', { name: 'Liberar acesso' }));

    const dialogo = screen.getByRole('dialog');
    expect(
      within(dialogo).getByText('Liberar o acesso desta conta?')
    ).toBeInTheDocument();
    expect(
      within(dialogo).getByText(/Marina Duarte · marina@castelo\.com\.br/)
    ).toBeInTheDocument();
    expect(liberar).not.toHaveBeenCalled();
  });

  it('confirmando, chama a Function com o uid da conta e avisa o operador', async () => {
    render(<ContasRoute />);

    await userEvent.click(screen.getByRole('button', { name: 'Liberar acesso' }));
    const dialogo = screen.getByRole('dialog');
    await userEvent.click(
      within(dialogo).getByRole('button', { name: 'Liberar acesso' })
    );

    expect(liberar).toHaveBeenCalledWith('uid-marina');
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success', title: 'Acesso liberado' })
    );
  });

  it('recusa do servidor vira aviso com a FRASE do servidor, não "erro interno"', async () => {
    liberar.mockResolvedValue(null);
    mocks.useLiberacaoDeAcesso.mockReturnValue({
      running: false,
      liberar,
      ultimoErro: () => ({
        code: 'functions/failed-precondition',
        message: 'A conta carrega o papel tenant_owner e por isso não pode virar dona.',
      }),
    });
    render(<ContasRoute />);

    await userEvent.click(screen.getByRole('button', { name: 'Liberar acesso' }));
    const dialogo = screen.getByRole('dialog');
    await userEvent.click(
      within(dialogo).getByRole('button', { name: 'Liberar acesso' })
    );

    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'danger',
        description:
          'A conta carrega o papel tenant_owner e por isso não pode virar dona.',
      })
    );
  });

  it('conta que já saiu da fila não oferece o botão', () => {
    mocks.useFilaDeContas.mockReturnValue(
      estado<ContaProfissionalView>({
        itens: [mkProfissional({ statusOnboarding: 'ativo' })],
      })
    );
    render(<ContasRoute />);

    expect(
      screen.queryByRole('button', { name: 'Liberar acesso' })
    ).not.toBeInTheDocument();
  });
});
