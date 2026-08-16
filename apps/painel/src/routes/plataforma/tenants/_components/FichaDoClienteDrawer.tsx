// =============================================================================
// FichaDoClienteDrawer — a visão geral NO INDIVÍDUO (ADMIN-VISAO onda 3 ·
// S1612-T6). Presentational: a ficha entra por prop, nenhuma leitura acontece
// aqui.
//
// POR QUE UM DRAWER, E NÃO COLUNAS NA TABELA. O dono autorizou o CONTEÚDO desta
// ficha, não a extração da base. Cada abertura é uma consulta de PII
// identificada que o servidor registra em `auditoriaAcessos`; uma coluna de CPF
// na lista emitiria uma consulta auditada por linha só por alguém ter aberto a
// tela, e transformaria a aba na agenda de contato de todos os participantes de
// todos os produtores — que é o que a RN-540 recusa quando proíbe saída em
// massa. O gesto explícito é o desenho, não uma etapa a mais.
//
// AUSÊNCIA É DECLARADA, NUNCA DISFARÇADA. O callable devolve `null` em todo
// campo que a fonte não guarda, e aqui `null` vira uma frase que começa por
// "Não coletado" com a fonte nomeada quando ela explica alguma coisa. Nunca
// string vazia, nunca traço solto, nunca zero: uma célula em branco parece
// falha de carregamento e um zero num campo de dinheiro afirma que a pessoa não
// gastou nada. As duas leituras são erradas por motivos diferentes.
//
// O RECORTE SE ANUNCIA. Quando `pedidosTruncados` vem true, a ficha DIZ que o
// histórico mostrado não é o completo — e diz também que os campos de contato
// saíram dessa mesma janela, porque saíram. Apresentar recorte como total é o
// defeito que a onda 4 já nomeou no contador.
//
// SEM MÁSCARA E SEM TOGGLE, ao contrário do slide-in do inscrito. Lá a máscara
// existe para reduzir exposição de ombro numa tela que o organizador deixa
// aberta ao lado da pista; aqui o painel só chega a este ponto depois de um
// gesto que ficou registrado, e esconder o dado que a consulta já custou
// obrigaria a um segundo clique sem reduzir nada.
// =============================================================================

import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  DefinitionItem,
  Divider,
  Drawer,
  SCROLL_Y_ONLY,
  SectionHeader,
  Skeleton,
} from '@leela/design-system';
import type { FichaDoClienteView, FichaPedidoDoClienteView } from '@leela/api-client';
import { formatBRL } from '../../../eventos/repasses/_lib/format';
import { formatNascimento } from '../../../eventos/_lib/format';
import { formatarCpf, formatarTelefone } from '../../../eventos/_lib/pii';
import { formatInt } from '../../_lib/format';

// ---------------------------------------------------------------------------
// Vocabulário
// ---------------------------------------------------------------------------

/** Rótulos de gênero — as mesmas palavras do slide-in do inscrito. */
const GENERO_LABEL: Record<string, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  outro: 'Outro',
  nao_informado: 'Não informado',
};

/**
 * O que cada ausência DIZ. A frase começa sempre por "Não coletado" e nomeia a
 * fonte quando a fonte explica a falta: saber que o e-mail vem do responsável
 * do pedido é o que diz ao operador onde procurar, e "—" não diz nada.
 */
const AUSENTE = {
  cpf: 'Não coletado. O CPF vem dos dados pessoais da inscrição, e nenhuma inscrição desta pessoa guarda o campo.',
  nascimento: 'Não coletado.',
  genero: 'Não coletado.',
  email:
    'Não coletado. O e-mail vem do responsável do pedido, e nenhum pedido desta pessoa guarda o campo.',
  telefone:
    'Não coletado. Nem o responsável do pedido nem a inscrição guardam telefone para esta pessoa.',
  cidade: 'Não coletado.',
  endereco:
    'Não coletado. O endereço vem do checkout, que passou a exigi-lo depois das compras desta pessoa.',
  restricoes: 'Não coletado. Nenhuma inscrição desta pessoa registrou restrição médica.',
  emergencia: 'Não coletado. Nenhuma inscrição desta pessoa registrou contato de emergência.',
  pedido: 'Não coletado. O pedido desta inscrição não está mais no banco.',
} as const;

/** CEP normalizado (8 dígitos) na máscara de leitura. @pure */
function formatarCep(cep: string): string {
  const d = cep.replace(/\D/g, '');
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : cep;
}

/** Data e hora do carimbo do ledger, que chega em ms. @pure */
function formatarMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'Sem data no registro';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

// ---------------------------------------------------------------------------
// Peças
// ---------------------------------------------------------------------------

/** Uma seção da ficha: título e os campos dela. */
function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="flex flex-col gap-[var(--spacing-3)]" aria-label={titulo}>
      <SectionHeader title={titulo} titleAs="h3" />
      <dl className="flex flex-col gap-[var(--spacing-4)]">{children}</dl>
    </section>
  );
}

/** Uma inscrição do histórico, do jeito que o ledger do CRM a carimbou. */
function LinhaDePedido({ pedido }: { pedido: FichaPedidoDoClienteView }): JSX.Element {
  const confirmada = pedido.statusNoCrm === 'confirmado';
  return (
    <li className="flex flex-col gap-[var(--spacing-2)] border-b border-b-[var(--border-subtle)] py-[var(--spacing-3)] last:border-b-0">
      <div className="flex items-start justify-between gap-[var(--spacing-3)]">
        <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {pedido.eventoNome.trim() === '' ? 'Evento sem nome' : pedido.eventoNome}
        </span>
        <Badge variant={confirmada ? 'vitoria' : 'neutro'}>
          {confirmada ? 'Confirmada' : 'Estornada'}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-x-[var(--spacing-4)] gap-y-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
        <span className="[font-variant-numeric:tabular-nums]">
          Valor da inscrição {formatBRL(pedido.valorPago)}
        </span>
        <span>Atualizada em {formatarMs(pedido.atualizadoEmMs)}</span>
        <span className={pedido.statusDoPedido === null ? 'text-[var(--text-tertiary)]' : ''}>
          {pedido.statusDoPedido === null
            ? AUSENTE.pedido
            : `Pedido ${pedido.statusDoPedido}`}
        </span>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Drawer
// ---------------------------------------------------------------------------

export interface FichaDoClienteDrawerProps {
  aberto: boolean;
  /** Nome vindo da LINHA — o cabeçalho não espera a resposta do servidor. */
  nome: string;
  ficha: FichaDoClienteView | null;
  loading: boolean;
  /** Mensagem de operador; null = sem erro. */
  erro: string | null;
  onFechar: () => void;
}

export function FichaDoClienteDrawer({
  aberto,
  nome,
  ficha,
  loading,
  erro,
  onFechar,
}: FichaDoClienteDrawerProps): JSX.Element {
  return (
    <Drawer
      open={aberto}
      onOpenChange={(estaAberto) => {
        if (!estaAberto) onFechar();
      }}
      title={`Ficha de ${nome}`}
      side="right"
      className={`w-[var(--modal-width-md)] gap-[var(--spacing-5)] p-[var(--spacing-6)] ${SCROLL_Y_ONLY}`}
    >
      <div className="flex items-start justify-between gap-[var(--spacing-4)]">
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <span className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {nome.trim() === '' ? 'Cliente sem nome' : nome}
          </span>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Esta consulta ficou registrada: quem abriu, quando e sobre qual cliente.
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={onFechar}>
          Fechar
        </Button>
      </div>

      {erro !== null ? (
        <Card role="alert" className="border-l-4 border-l-[var(--border-danger)]">
          <CardHeader>
            <CardTitle>Não foi possível abrir a ficha</CardTitle>
            <CardDescription>{erro}</CardDescription>
          </CardHeader>
        </Card>
      ) : loading || ficha === null ? (
        <div
          role="status"
          aria-label="Carregando a ficha do cliente"
          className="flex flex-col gap-[var(--spacing-3)]"
        >
          <Skeleton variant="rect" className="h-40" />
        </div>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-5)]">
          <Secao titulo="Identidade">
            <DefinitionItem
              label="CPF"
              value={ficha.cpf === null ? null : formatarCpf(ficha.cpf)}
              emptyLabel={AUSENTE.cpf}
              size="sm"
            />
            <DefinitionItem
              label="Nascimento"
              value={ficha.nascimento === null ? null : formatNascimento(ficha.nascimento)}
              emptyLabel={AUSENTE.nascimento}
              size="sm"
            />
            <DefinitionItem
              label="Gênero"
              value={ficha.genero === null ? null : (GENERO_LABEL[ficha.genero] ?? ficha.genero)}
              emptyLabel={AUSENTE.genero}
              size="sm"
            />
          </Secao>

          <Divider />

          <Secao titulo="Contato">
            <DefinitionItem label="E-mail" value={ficha.email} emptyLabel={AUSENTE.email} size="sm" />
            <DefinitionItem
              label="Telefone"
              value={ficha.telefone === null ? null : formatarTelefone(ficha.telefone)}
              emptyLabel={AUSENTE.telefone}
              size="sm"
            />
          </Secao>

          <Divider />

          <Secao titulo="Onde">
            <DefinitionItem
              label="Cidade e UF"
              value={
                ficha.cidade === null && ficha.uf === null
                  ? null
                  : [ficha.cidade, ficha.uf].filter((p) => p !== null).join(' · ')
              }
              emptyLabel={AUSENTE.cidade}
              size="sm"
            />
            <DefinitionItem
              label="Endereço"
              value={
                ficha.endereco === null
                  ? null
                  : [
                      `${ficha.endereco.logradouro}, ${ficha.endereco.numero}`,
                      ficha.endereco.complemento,
                      ficha.endereco.bairro,
                      `${ficha.endereco.cidade}/${ficha.endereco.uf}`,
                      `CEP ${formatarCep(ficha.endereco.cep)}`,
                    ]
                      .filter((p) => typeof p === 'string' && p.trim() !== '')
                      .join(' · ')
              }
              emptyLabel={AUSENTE.endereco}
              size="sm"
            />
          </Secao>

          <Divider />

          <Secao titulo="Saúde">
            <DefinitionItem
              label="Restrições médicas"
              value={ficha.restricoesMedicas}
              emptyLabel={AUSENTE.restricoes}
              size="sm"
            />
            <DefinitionItem
              label="Contato de emergência"
              value={
                ficha.contatoEmergencia === null
                  ? null
                  : [
                      ficha.contatoEmergencia.nome,
                      // O telefone de emergência lê como o outro telefone da
                      // ficha: quem for ligar não deve traduzir dígitos crus.
                      ficha.contatoEmergencia.telefone.trim() === ''
                        ? ''
                        : formatarTelefone(ficha.contatoEmergencia.telefone),
                    ]
                      .filter((p) => p.trim() !== '')
                      .join(' · ')
              }
              emptyLabel={AUSENTE.emergencia}
              size="sm"
            />
          </Secao>

          <Divider />

          <Secao titulo="Comportamento de compra">
            <DefinitionItem label="Eventos" value={formatInt(ficha.qtdEventos)} size="sm" />
            <DefinitionItem
              label="Inscrições confirmadas"
              value={formatInt(ficha.qtdInscricoes)}
              size="sm"
            />
            <DefinitionItem label="Valor gasto" value={formatBRL(ficha.valorGasto)} size="sm" />
            <DefinitionItem label="LTV" value={formatBRL(ficha.ltv)} size="sm" />
          </Secao>

          <Divider />

          <section
            className="flex flex-col gap-[var(--spacing-3)]"
            aria-label="Histórico de inscrições"
          >
            <SectionHeader
              title="Histórico de inscrições"
              titleAs="h3"
              description="O histórico traz inscrições confirmadas e estornadas. Estornada continua aqui e fica fora do valor gasto e do LTV, porque o dinheiro voltou."
            />

            {ficha.pedidosTruncados ? (
              <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                Este histórico não é o completo. Esta pessoa tem mais inscrições no registro do que
                a ficha lê, e os campos de contato acima saíram dessa mesma janela.
              </p>
            ) : null}

            {ficha.pedidos.length === 0 ? (
              <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                Nenhuma inscrição no registro desta pessoa.
              </p>
            ) : (
              <ul className="flex flex-col">
                {ficha.pedidos.map((p) => (
                  <LinhaDePedido key={`${p.eventoId}|${p.pedidoId}|${p.atualizadoEmMs}`} pedido={p} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}

FichaDoClienteDrawer.displayName = 'FichaDoClienteDrawer';
