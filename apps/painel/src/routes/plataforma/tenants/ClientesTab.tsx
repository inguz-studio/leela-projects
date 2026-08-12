// =============================================================================
// ClientesTab — a aba `/plataforma/tenants/:tenantId/clientes` (ADMIN-VISAO
// onda 3 · S1612-T6). Presentational: estado async e callbacks entram por prop,
// nenhuma leitura acontece aqui.
//
// A LISTA É COMPORTAMENTO, E SÓ. Nome, eventos, inscrições confirmadas, valor
// gasto e LTV — exatamente o que `listarClientesDoTenant` devolve, e nada mais.
// ⛔ Nenhum CPF, nenhum e-mail, nenhum telefone, nenhum endereço na tabela. A
// ficha do indivíduo abre sob demanda, no drawer, com UMA consulta auditada por
// pessoa; uma coluna de contato emitiria uma consulta por linha só por alguém
// ter aberto a tela e transformaria a aba na agenda de participantes de todos os
// produtores, que é o que a RN-540 recusa quando proíbe saída em massa. O dono
// autorizou o CONTEÚDO da ficha, não a extração da base.
//
// REUSA A CASCA `ListaGlobal`, como a aba Clubs. Vendas não a reusou porque não
// tinha recorte nenhum para pôr no slot da toolbar; aqui o slot carrega a régua
// dos dois números de dinheiro e o aviso de que a consulta fica registrada — e o
// aviso precisa estar na tela ANTES do clique, enquanto o operador ainda pode
// desistir. A casca ainda traz de graça o contador honesto e a paginação.
//
// A RÉGUA R19 DOS DOIS NÚMEROS. `valorGasto` e `ltv` são coisas DIFERENTES e o
// rótulo tem de separá-las: valor gasto é Σ (valorFinal + taxaRepassada) das
// inscrições confirmadas, o que saiu do bolso da pessoa com o Serviço somado
// quando o evento repassa a taxa ao comprador; LTV é Σ valorFinal confirmadas, a
// receita do produtor atribuível a ela (P-E19-5). E `qtdInscricoes` conta SÓ
// confirmadas — o ledger do CRM admite `confirmado` e `estornado` (P-E19-6) e a
// soma ignora as estornadas —, o que é diferente do `qtdInscritos` do evento na
// aba vizinha, que conta cancelada inclusive.
//
// A TAXA DA LEELA CHAMA-SE "SERVIÇO" (decisão SERV-3 do dono) aqui como em
// qualquer superfície onde ela apareça.
//
// DINHEIRO COM CENTAVOS: o formatador é o de `eventos/repasses/_lib/format`,
// cent-exato. O `formatBRL` de `plataforma/_lib/format` arredonda para inteiro,
// o que serve a KPI de GMV e mentiria num LTV de R$ 85,50.
//
// ACESSO POR TECLADO. O `onRowClick` da Table é conveniência de MOUSE por
// desenho do DS — a linha preserva `role=row` e não vira botão. Por isso a
// coluna "Ficha" traz um Button de verdade: é ele que abre a ficha por teclado,
// e é ele que torna o gesto explícito visível na tela.
// =============================================================================

import { useMemo } from 'react';
import { Button, type TableColumn } from '@leela/design-system';
import type { ClienteTenantView } from '@leela/api-client';
import { ListaGlobal } from '../_components/ListaGlobal';
import { FichaDoClienteDrawer } from './_components/FichaDoClienteDrawer';
import { formatBRL } from '../../eventos/repasses/_lib/format';
import { formatInt } from '../_lib/format';
import type { ListaGlobalState } from '../_data/listasGlobais';
import type { FichaDoClienteState } from './_data/clientesTenant';

const SUBSTANTIVO = { singular: 'cliente', plural: 'clientes' };

export interface ClientesTabProps {
  estado: ListaGlobalState<ClienteTenantView>;
  ficha: FichaDoClienteState;
}

export function ClientesTab({ estado, ficha }: ClientesTabProps): JSX.Element {
  const { abrir } = ficha;

  const colunas = useMemo<TableColumn<ClienteTenantView>[]>(
    () => [
      {
        key: 'nome',
        header: 'Cliente',
        render: (c) => (
          <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {c.nome.trim() === '' ? 'Cliente sem nome' : c.nome}
          </span>
        ),
      },
      {
        key: 'qtdEventos',
        header: 'Eventos',
        align: 'right',
        render: (c) => (
          <span className="[font-variant-numeric:tabular-nums]">{formatInt(c.qtdEventos)}</span>
        ),
      },
      {
        // R19: este número conta CONFIRMADAS, e o rótulo pode dizer isso com
        // verdade. Não é o `qtdInscritos` do evento, que conta cancelada junto.
        key: 'qtdInscricoes',
        header: 'Inscrições confirmadas',
        align: 'right',
        render: (c) => (
          <span className="[font-variant-numeric:tabular-nums]">{formatInt(c.qtdInscricoes)}</span>
        ),
      },
      {
        key: 'valorGasto',
        header: 'Valor gasto',
        align: 'right',
        render: (c) => (
          <span className="[font-variant-numeric:tabular-nums]">{formatBRL(c.valorGasto)}</span>
        ),
      },
      {
        key: 'ltv',
        header: 'LTV',
        align: 'right',
        render: (c) => (
          <span className="[font-variant-numeric:tabular-nums]">{formatBRL(c.ltv)}</span>
        ),
      },
      {
        key: 'ficha',
        header: 'Ficha',
        align: 'right',
        render: (c) => (
          <Button variant="secondary" size="sm" onClick={() => abrir(c)}>
            Abrir ficha
          </Button>
        ),
      },
    ],
    [abrir]
  );

  const recorte = (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
        Valor gasto é o que saiu do bolso da pessoa, com o Serviço somado quando o evento repassa a
        taxa ao comprador. LTV é a receita do produtor atribuível a ela. Os dois somam só inscrições
        confirmadas; a estornada continua no histórico da ficha e fica fora dos dois números.
      </p>
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
        Documento, contato e endereço não ficam na tabela. Abra a ficha de uma pessoa para vê-los, e
        cada abertura fica registrada: quem abriu, quando e sobre qual cliente.
      </p>
    </div>
  );

  return (
    <>
      <ListaGlobal
        titulo="Clientes"
        subtitulo="Quem compra deste produtor, e o que cada pessoa já comprou."
        recorte={recorte}
        estado={estado}
        colunas={colunas}
        keyExtractor={(c) => c.clienteKey}
        caption="Clientes deste tenant, por comportamento de compra, sem documento e sem contato"
        substantivo={SUBSTANTIVO}
        onRowClick={abrir}
        vazio={{
          titulo: 'Nenhum cliente neste tenant',
          descricao:
            'As pessoas aparecem aqui conforme confirmam inscrição nos eventos deste produtor.',
        }}
        erro={{
          titulo: 'Não foi possível carregar os clientes',
          descricao: 'A leitura da lista falhou. Tente de novo em alguns instantes.',
        }}
      />

      <FichaDoClienteDrawer
        aberto={ficha.clienteKey !== null}
        nome={ficha.nome}
        ficha={ficha.ficha}
        loading={ficha.loading}
        erro={ficha.erro}
        onFechar={ficha.fechar}
      />
    </>
  );
}

ClientesTab.displayName = 'ClientesTab';
