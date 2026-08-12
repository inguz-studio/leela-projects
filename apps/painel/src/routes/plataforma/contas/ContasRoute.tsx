// =============================================================================
// ContasRoute — `/plataforma/contas` (ADMIN-VISAO onda 5 · S1615-T2 · RN-540 ·
// RN-547 · vetáveis V-4 e V-5).
//
// "Quando alguém se cadastra na Leela e some do meu radar, eu quero ver essa
// pessoa no painel master e agir sobre ela dali, para liberar acesso sem abrir
// o Console do Firebase, que é ferramenta de engenharia."
//
// UMA ROTA, DOIS MODOS, e o padrão é o mais fechado:
//   Fila (padrão) — só quem espera liberação. Traz a AÇÃO.
//   Diretório     — todas as contas, com o papel de cada uma. É LEITURA.
//
// A casca é a `ListaGlobal` da onda 4, com o contador honesto que ela já
// carrega: enquanto houver cursor, a tela diz quantos está MOSTRANDO; só quando
// a paginação acaba é que o número carregado vira o total do recorte. Não se
// constrói segunda casca de lista neste painel.
//
// ⛔ NÃO EXISTE EXPORT, CSV NEM DOWNLOAD (RN-540) — nem botão, nem menu, nem
// palavra. A tela serve o trabalho de olhar e agir sobre UMA conta; extração de
// base é outra conversa, e é do dono. Há teste travando isso.
//
// V-4 · O CPF NÃO É COLUNA — E ESTÁ NOS DOIS MODOS. O dono decidiu que o
// diretório identifica por CPF, e o mecanismo é a leitura por callable auditado
// com a Rule de `pessoas` seguindo fechada. A consequência de desenho: a
// revelação é POR LINHA, sob gesto explícito. Uma coluna PREENCHIDA faria o
// painel emitir uma consulta auditada por linha da página só por alguém ter
// aberto a tela — e transformaria a lista em planilha de CPF, que é o que a
// RN-540 recusa quando proíbe saída em massa.
//
// A regra que barra a planilha é sobre a coluna vir pronta, NÃO sobre o modo — e
// por isso a identificação existe também na FILA. O job story do V-4 é o da
// Fila: *"quando eu vou liberar o acesso de alguém, eu quero ter certeza de quem
// é a pessoa, para não liberar a conta errada"*, com o caso de uso escrito na
// spec — *"duas pessoas se cadastram com nomes parecidos e você precisa saber se
// são a mesma"*. Isso é o instante anterior ao clique de liberar. Entregar o CPF
// a quem só olha e negá-lo a quem age seria o contrário do que a decisão serve.
//
// O aviso de que a consulta fica registrada aparece ANTES do clique, nos dois
// modos, enquanto o operador ainda pode desistir.
//
// A metade ESTRANGEIRA da frase do dono não tem fonte no modelo de dados, e por
// isso ela aparece como `EmBreveV3` com a causa nomeada — nos dois modos, e
// sobretudo na Fila, porque quem age é quem não pode descobrir tarde que uma
// pessoa sem CPF não é identificável hoje.
//
// A rota é montada em `PlataformaRoutes.tsx` pelo maestro — este arquivo só
// exporta a tela.
// =============================================================================

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Chip,
  ConfirmModal,
  useToast,
  type TableColumn,
} from '@leela/design-system';
import { IdCard } from 'lucide-react';
import type { ContaDoDiretorio, ContaProfissionalView } from '@leela/api-client';
import { ListaGlobal } from '../_components/ListaGlobal';
import { EmBreveV3 } from '../../overview/_components/EmBreveV3';
import { formatDataHora } from '../_lib/format';
import { mensagemDaRecusa } from '../_lib/errors';
import {
  useDiretorioDeContas,
  useFilaDeContas,
  useIdentificacoes,
  useLiberacaoDeAcesso,
  type IdentificacoesState,
} from './_data/contas';
import {
  AVISO_CONSULTA_REGISTRADA,
  CAUSA_DOCUMENTO_ESTRANGEIRO,
  MODOS_DE_CONTAS,
  MODO_PADRAO,
  SUBSTANTIVO_CONTAS,
  formatarTelefone,
  ouTraco,
  podeLiberar,
  rotuloDoPapel,
  type EstadoDaIdentificacao,
  type ModoDeContas,
} from './_lib/contas';

/** Célula da identificação — o gesto e o que ele revelou (V-4). */
function CelulaDeIdentificacao({
  estado,
  onIdentificar,
}: {
  estado: EstadoDaIdentificacao | undefined;
  onIdentificar: () => void;
}): JSX.Element {
  const situacao = estado?.situacao ?? 'oculto';

  if (situacao === 'consultando') {
    return (
      <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
        Consultando…
      </span>
    );
  }

  if (estado?.situacao === 'revelado') {
    return (
      <div className="flex flex-col">
        <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {estado.texto}
        </span>
        {estado.ambiguo ? (
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Esta conta tem mais de um registro de identidade.
          </span>
        ) : null}
      </div>
    );
  }

  if (estado?.situacao === 'ausente') {
    return (
      <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
        {estado.causa}
      </span>
    );
  }

  if (estado?.situacao === 'erro') {
    return (
      <span className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]">
        {estado.mensagem}
      </span>
    );
  }

  return (
    <Button variant="secondary" size="sm" onClick={onIdentificar}>
      Identificar
    </Button>
  );
}

/**
 * A coluna de identificação, DEFINIDA UMA VEZ e usada pelos dois modos.
 *
 * Ela existe nos dois porque o job story do V-4 é o da Fila — *"quando eu vou
 * liberar o acesso de alguém, eu quero ter certeza de quem é a pessoa, para não
 * liberar a conta errada"* — e o caso de uso escrito na spec é *"duas pessoas se
 * cadastram com nomes parecidos e você precisa saber se são a mesma"*, que é o
 * instante anterior ao clique de liberar. Entregar o CPF a quem só olha e negá-lo
 * a quem age seria o contrário do que a decisão serve.
 *
 * Uma definição só, e não duas colunas gêmeas: a segunda cópia de uma regra de
 * PII é a divergência de amanhã — quem apertasse o registro de um lado deixaria
 * o outro vazando pelo caminho antigo.
 *
 * O que a coluna NÃO é: uma coluna de CPF. O cabeçalho é o gesto, a célula nasce
 * com um botão, e o número só existe depois do clique. A regra que barra a
 * planilha de CPF é sobre a COLUNA vir preenchida, não sobre o modo — se a
 * célula já viesse com o número, a montagem da página dispararia uma consulta
 * auditada por linha, que é a saída em massa que a RN-540 proíbe com outro nome.
 */
function colunaDeIdentificacao<T extends { id: string }>(
  identificacoes: IdentificacoesState
): TableColumn<T> {
  return {
    key: 'identificacao',
    header: 'Identificação',
    render: (c) => (
      <CelulaDeIdentificacao
        estado={identificacoes.porConta[c.id]}
        onIdentificar={() => identificacoes.identificar(c.id)}
      />
    ),
  };
}

export function ContasRoute(): JSX.Element {
  const { toast } = useToast();
  const [modo, setModo] = useState<ModoDeContas>(MODO_PADRAO);
  const [nonce, setNonce] = useState(0);
  const [alvoLiberacao, setAlvoLiberacao] = useState<ContaProfissionalView | null>(
    null
  );

  const fila = useFilaDeContas(nonce);
  const diretorio = useDiretorioDeContas(nonce);
  const identificacoes = useIdentificacoes();
  const liberacao = useLiberacaoDeAcesso();

  const naFila = modo === 'fila';

  async function confirmarLiberacao(): Promise<void> {
    if (alvoLiberacao === null) return;
    const conta = alvoLiberacao;
    const tenantId = await liberacao.liberar(conta.id);
    setAlvoLiberacao(null);
    if (tenantId !== null) {
      // A conta saiu da fila: o recorte é `statusOnboarding`, e o servidor
      // acabou de promovê-lo. Reler é o que tira a linha da tela.
      setNonce((n) => n + 1);
      toast({
        variant: 'success',
        title: 'Acesso liberado',
        description: `A conta agora é dona da produtora ${tenantId}.`,
      });
    } else {
      toast({
        variant: 'danger',
        title: 'Não foi possível liberar o acesso',
        description: mensagemDaRecusa(liberacao.ultimoErro()),
      });
    }
  }

  const colunasDaFila = useMemo<TableColumn<ContaProfissionalView>[]>(
    () => [
      {
        key: 'nome',
        header: 'Nome',
        render: (c) => (
          <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {ouTraco(c.nome)}
          </span>
        ),
      },
      { key: 'email', header: 'E-mail', render: (c) => ouTraco(c.email) },
      {
        key: 'organizacao',
        header: 'Organização',
        render: (c) => ouTraco(c.organizacao),
      },
      {
        key: 'telefone',
        header: 'Telefone',
        render: (c) => formatarTelefone(c.telefone),
      },
      {
        key: 'criadoEm',
        header: 'Cadastro',
        render: (c) => formatDataHora(c.criadoEm),
      },
      // A identificação vem ANTES da ação, e a ordem é o argumento: o job story
      // do V-4 é "quando eu vou liberar o acesso de alguém, eu quero ter certeza
      // de quem é a pessoa, para não liberar a conta errada". Conferir quem é
      // acontece imediatamente antes de agir, e a coluna fica onde o gesto está.
      colunaDeIdentificacao<ContaProfissionalView>(identificacoes),
      {
        key: 'acao',
        header: 'Ação',
        align: 'right',
        render: (c) =>
          podeLiberar(c) ? (
            <Button variant="primary" size="sm" onClick={() => setAlvoLiberacao(c)}>
              Liberar acesso
            </Button>
          ) : null,
      },
    ],
    [identificacoes]
  );

  const colunasDoDiretorio = useMemo<TableColumn<ContaDoDiretorio>[]>(
    () => [
      {
        key: 'nome',
        header: 'Nome',
        render: (c) => (
          <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {ouTraco(c.nome)}
          </span>
        ),
      },
      { key: 'email', header: 'E-mail', render: (c) => ouTraco(c.email) },
      {
        key: 'papel',
        header: 'Papel',
        render: (c) => <Badge variant="neutro">{rotuloDoPapel(c)}</Badge>,
      },
      {
        key: 'criadoEm',
        header: 'Cadastro',
        render: (c) => formatDataHora(c.criadoEm),
      },
      colunaDeIdentificacao<ContaDoDiretorio>(identificacoes),
    ],
    [identificacoes]
  );

  const recorte = (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <div
        role="group"
        aria-label="Modo de visualização"
        className="flex flex-wrap gap-[var(--spacing-2)]"
      >
        {MODOS_DE_CONTAS.map((opt) => (
          <Chip key={opt.id} active={opt.id === modo} onClick={() => setModo(opt.id)}>
            {opt.label}
          </Chip>
        ))}
      </div>

      {naFila ? (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          A fila mostra quem se cadastrou e ainda espera liberação de acesso.
        </p>
      ) : null}

      {/* O aviso segue a identificação, e a identificação está nos DOIS modos.
          Ele aparece antes do clique, enquanto o operador ainda pode desistir —
          avisar depois é confissão, não transparência. */}
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
        {AVISO_CONSULTA_REGISTRADA}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      {naFila ? (
        <ListaGlobal
          titulo="Contas"
          subtitulo="Quem se cadastrou na plataforma e ainda espera liberação."
          recorte={recorte}
          estado={fila}
          colunas={colunasDaFila}
          keyExtractor={(c) => c.id}
          caption="Contas que aguardam liberação de acesso"
          substantivo={SUBSTANTIVO_CONTAS}
          vazio={{
            titulo: 'Ninguém esperando',
            descricao: 'Quando alguém se cadastrar e ficar sem acesso, a conta aparece aqui.',
          }}
          erro={{
            titulo: 'Não foi possível carregar a fila',
            descricao: 'A leitura da lista falhou. Tente de novo em alguns instantes.',
          }}
        />
      ) : (
        <ListaGlobal
          titulo="Contas"
          subtitulo="Todas as contas da plataforma, de organizadores e de atletas."
          recorte={recorte}
          estado={diretorio}
          colunas={colunasDoDiretorio}
          keyExtractor={(c) => `${c.papel}:${c.id}`}
          caption="Todas as contas da plataforma"
          substantivo={SUBSTANTIVO_CONTAS}
          vazio={{
            titulo: 'Nenhuma conta na plataforma',
            descricao: 'As contas aparecem aqui conforme as pessoas se cadastram.',
          }}
          erro={{
            titulo: 'Não foi possível carregar o diretório',
            descricao: 'A leitura da lista falhou. Tente de novo em alguns instantes.',
          }}
        />
      )}

      {/* A lacuna acompanha a identificação, e a identificação está nos DOIS
          modos. Ela precisa estar sobretudo na FILA: quem vive aqui é quem age,
          e é ele que não pode descobrir tarde demais que uma pessoa sem CPF não
          é identificável hoje. */}
      <div className="px-[var(--spacing-6)]">
        <EmBreveV3
          titulo="Documento estrangeiro"
          causa={CAUSA_DOCUMENTO_ESTRANGEIRO}
          icon={<IdCard aria-hidden />}
        />
      </div>

      <ConfirmModal
        open={alvoLiberacao !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setAlvoLiberacao(null);
        }}
        title="Liberar o acesso desta conta?"
        description="A conta passa a ser dona de uma produtora, sem precisar de código."
        target={alvoLiberacao ? `${alvoLiberacao.nome} · ${alvoLiberacao.email}` : undefined}
        loses={[
          'A pessoa deixa a fila e não precisa mais de um código de convite',
          'A liberação fica registrada com seu nome, e não se desfaz por aqui',
        ]}
        keeps={[
          'O acesso é o mesmo que o código de convite entrega — nada de especial',
          'Ninguém mais é afetado: a liberação vale só para esta conta',
        ]}
        confirmLabel="Liberar acesso"
        loading={liberacao.running}
        onConfirm={() => void confirmarLiberacao()}
      />
    </div>
  );
}

ContasRoute.displayName = 'ContasRoute';
