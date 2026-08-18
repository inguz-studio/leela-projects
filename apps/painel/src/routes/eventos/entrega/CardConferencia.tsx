// =============================================================================
// CardConferencia — o card que quem credencia lê com a pessoa na frente
// (CRED-BUSCA · 17/08).
//
// A tela antiga mostrava nome + modalidade + selo do kit e mais nada, e o
// operador não tinha como conferir se a pessoa na fila é a dona daquela
// inscrição. Este card responde duas perguntas em um olhar: é essa pessoa, e é
// isso que ela comprou.
//
// PRESENTATIONAL. Recebe a conferência já derivada (`conferenciaDoInscrito`) e
// o estado da leitura da compra — o fetch vive no `CardConferenciaConnected`
// (ADR-010, mesmo desenho do `InscritoSlideIn`).
//
// CÂNONE. `Card` + `FormGrid as="dl"` + `DefinitionItem` — o par rótulo/valor em
// pé é exatamente a linha do cânone para "ficha, resumo" (§Par rótulo + valor),
// e `emptyLabel` é o que deixa a ausência dizer a CAUSA em vez de um traço.
// Nenhum primitivo novo; zero cor fora de token.
//
// DENSIDADE DE BALCÃO. Duas colunas a partir de `sm` e `size="sm"` nos valores:
// tem uma fila esperando, e o card divide a coluna de ação com o Stepper e o
// botão de fechar. Não é a ficha do inscrito — essa já existe, tem quatro abas
// e mora em outra tela.
// =============================================================================

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DefinitionItem,
  FormGrid,
} from '@leela/design-system';
import type { KitInscrito } from '@leela/core';
import { kitInscritoBadge } from '../_lib/kitLabels';
import { ausenciaDaCompra, type ConferenciaBalcao, type EstadoCompra } from '../_lib/conferenciaBalcao';

export interface CardConferenciaProps {
  conferencia: ConferenciaBalcao;
  /** Enum do kit — só para a variante do selo (o rótulo já vem derivado). */
  kit: KitInscrito;
  /** Em que pé está a leitura de `pedido`/`pagamento` (define a ausência). */
  estadoCompra: EstadoCompra;
}

export function CardConferencia({
  conferencia,
  kit,
  estadoCompra,
}: CardConferenciaProps): JSX.Element {
  const selo = kitInscritoBadge(kit);
  // Os três campos que moram na compra partilham a MESMA causa de ausência —
  // se a leitura não veio, não veio para os três. Derivar uma vez evita que a
  // tela conte três histórias diferentes sobre o mesmo silêncio.
  const semCompra = ausenciaDaCompra(estadoCompra);

  return (
    <Card as="section" aria-label="Conferência do participante">
      <CardHeader className="flex-row items-center justify-between gap-[var(--spacing-3)]">
        <CardTitle as="h3">{conferencia.nome}</CardTitle>
        <Badge variant={selo.variant}>{conferencia.kitLabel}</Badge>
      </CardHeader>

      <CardContent>
        <FormGrid as="dl" columns={2} from="sm" gap="sm">
          <DefinitionItem
            label="Modalidade"
            value={conferencia.modalidade}
            emptyLabel="Não informada"
            size="sm"
          />
          <DefinitionItem
            label="Lote"
            value={conferencia.lote}
            emptyLabel={semCompra}
            size="sm"
          />
          <DefinitionItem
            label="Kit inclui"
            value={conferencia.incluso}
            emptyLabel={
              conferencia.semKit ? 'Inscrição sem kit' : 'Kit sem itens cadastrados'
            }
            size="sm"
          />
          <DefinitionItem
            label="Tamanho escolhido"
            value={conferencia.tamanho}
            emptyLabel={
              conferencia.semKit ? 'Inscrição sem kit' : 'Kit sem item tamanhado'
            }
            size="sm"
          />
          <DefinitionItem
            label="E-mail de compra"
            value={conferencia.emailCompra}
            emptyLabel={semCompra}
            size="sm"
          />
          <DefinitionItem
            label="Telefone de compra"
            value={conferencia.telefoneCompra}
            emptyLabel={semCompra}
            size="sm"
          />
        </FormGrid>
      </CardContent>
    </Card>
  );
}

CardConferencia.displayName = 'CardConferencia';
