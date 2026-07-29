// =============================================================================
// apps/landing/app/(public)/ingresso/[token]/IngressoView.tsx
//
// A matriz de estados da RN-421 em forma de componente (S1214-T2 · D-ING-6).
// SERVER COMPONENT puro: sem 'use client', sem hook, sem estado, sem JS no
// cliente. O QR chega renderizado do servidor, então nenhuma dependência nova
// entra no bundle público e a landing segue Radix-free (ADR-017 — só a entrada
// `@leela/design-system/server`).
//
// AS DUAS LINHAS QUE SÃO DECISÃO DE PRODUTO, e por isso estão comentadas aqui
// e não só na spec:
//   - `cancelado`/`estornado` NÃO renderizam QR. Renderizar convidaria a pessoa
//     a viajar até o evento e ser barrada na fila às seis da manhã. A tranca
//     real continua no servidor (`inscrito_cancelado`); a página só não mente.
//     A guarda de verdade está no SERVIDOR: a projeção nem traz `qrDataUri`
//     nesses estados. Aqui é a segunda tranca, não a primeira.
//   - `credenciado` MANTÉM o QR. Esconder depois do check-in não protege nada
//     (o servidor já responde `qr_ja_utilizado`) e tira da pessoa a conferência
//     de que aquele é o ingresso dela.
//
// PRIVACIDADE (RN-422): tudo que está nesta tela é dado que vaza junto com o
// encaminhamento do link. Por isso só entram nome do titular, evento com data e
// local, modalidade, kit com tamanho, código e estado. Encaminhar o link é
// encaminhar o ingresso — a mesma propriedade que o e-mail já tinha.
//
// Zero valor cru: cor, espaçamento e raio vêm de token do DS (governança §2).
// =============================================================================

import { Badge, Card, CardContent } from '@leela/design-system/server';
import {
  formatarCarimbo,
  formatarDataEvento,
  type IngressoProjetado,
} from '../../../../lib/ingresso';

/** Cabeçalho de estado: rótulo, tom do badge e a frase que explica. */
const ESTADO_UI: Record<
  IngressoProjetado['estado'],
  { rotulo: string; variante: 'vitoria' | 'alerta' | 'vulcao' | 'neutro'; aviso: string }
> = {
  valido: {
    rotulo: 'Ingresso válido',
    variante: 'vitoria',
    aviso: 'Apresente este QR no credenciamento. Se a imagem não abrir, o código abaixo identifica a inscrição.',
  },
  credenciado: {
    rotulo: 'Credenciado',
    variante: 'vitoria',
    aviso: 'A presença já foi registrada. O ingresso continua aqui para você conferir.',
  },
  emitindo: {
    rotulo: 'Emitindo',
    variante: 'alerta',
    aviso: 'Estamos emitindo seu ingresso. Assim que ele ficar pronto, o QR aparece nesta mesma página.',
  },
  pendente: {
    rotulo: 'Pagamento pendente',
    variante: 'alerta',
    aviso: 'O pagamento ainda não foi confirmado. O ingresso é emitido assim que a confirmação chegar.',
  },
  cancelado: {
    rotulo: 'Inscrição cancelada',
    variante: 'vulcao',
    aviso: 'Esta inscrição foi cancelada e não dá acesso ao evento. O código continua aqui para atendimento.',
  },
  estornado: {
    rotulo: 'Inscrição estornada',
    variante: 'vulcao',
    aviso: 'O valor desta inscrição foi devolvido, então ela não dá acesso ao evento. O código continua aqui para atendimento.',
  },
  encerrado: {
    rotulo: 'Evento encerrado',
    variante: 'neutro',
    aviso: 'Este evento já aconteceu. A página fica como histórico da sua participação.',
  },
};

export interface IngressoViewProps {
  ingresso: IngressoProjetado;
  /** Versão de impressão: mesma matriz, sem os elementos de navegação. */
  paraImpressao?: boolean;
}

export function IngressoView({
  ingresso,
  paraImpressao = false,
}: IngressoViewProps): React.JSX.Element {
  const ui = ESTADO_UI[ingresso.estado];
  const dataEvento = formatarDataEvento(ingresso.evento.dataISO);
  const carimbo = formatarCarimbo(ingresso.credenciadoEm);

  return (
    <article
      data-estado={ingresso.estado}
      data-testid="ingresso"
      className="mx-auto w-full max-w-2xl"
    >
      <Card className="overflow-hidden">
        <CardContent className="p-[var(--spacing-6)]">
          <div className="flex flex-wrap items-start justify-between gap-[var(--spacing-3)]">
            <div className="min-w-0">
              <p className="text-sm text-text-secondary">Ingresso de</p>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-primary">
                {ingresso.titular}
              </h1>
            </div>
            <Badge variant={ui.variante}>{ui.rotulo}</Badge>
          </div>

          <dl className="mt-[var(--spacing-5)] grid gap-[var(--spacing-3)] sm:grid-cols-2">
            <Linha termo="Evento" valor={ingresso.evento.nome} />
            {dataEvento !== '' ? <Linha termo="Data" valor={dataEvento} /> : null}
            {ingresso.evento.local !== '' ? (
              <Linha termo="Local" valor={ingresso.evento.local} />
            ) : null}
            {ingresso.modalidade !== '' ? (
              <Linha termo="Modalidade" valor={ingresso.modalidade} />
            ) : null}
            {ingresso.kit !== null ? (
              <Linha
                termo="Kit"
                valor={
                  ingresso.tamanho !== null
                    ? `${ingresso.kit} · tamanho ${ingresso.tamanho}`
                    : ingresso.kit
                }
              />
            ) : null}
            {carimbo !== '' ? <Linha termo="Credenciado em" valor={carimbo} /> : null}
          </dl>

          {/* O QR SÓ existe quando o servidor mandou a imagem. A projeção não
              traz `qrDataUri` em estornado, cancelado, pendente, emitindo nem
              evento encerrado — a decisão mora lá, e aqui só se obedece. */}
          {ingresso.qrDataUri !== undefined ? (
            <div className="mt-[var(--spacing-6)] flex flex-col items-center gap-[var(--spacing-3)]">
              <div className="rounded-ds-lg bg-surface-base p-[var(--spacing-4)]">
                {/* `<img>` cru de propósito: a carga é um data URI gerado pelo
                    servidor, e `next/image` exige URL otimizável — otimizar um
                    PNG de 320px que já veio pronto só acrescentaria um salto. */}
                <img
                  src={ingresso.qrDataUri}
                  alt="QR do ingresso"
                  width={280}
                  height={280}
                  data-testid="ingresso-qr"
                  className="block h-auto w-full max-w-xs"
                />
              </div>
            </div>
          ) : null}

          <div className="mt-[var(--spacing-6)] rounded-ds-lg bg-surface-base p-[var(--spacing-4)] text-center">
            <p className="text-xs uppercase tracking-wide text-text-secondary">
              Código do ingresso
            </p>
            {ingresso.codigo !== '' ? (
              <p
                data-testid="ingresso-codigo"
                className="mt-[var(--spacing-1)] font-mono text-3xl font-bold tracking-widest text-text-primary"
              >
                {ingresso.codigo}
              </p>
            ) : (
              <p className="mt-[var(--spacing-1)] text-text-secondary">
                O código chega junto com a emissão.
              </p>
            )}
          </div>

          <p className="mt-[var(--spacing-4)] text-sm text-text-secondary">{ui.aviso}</p>

          {!paraImpressao ? (
            <p className="mt-[var(--spacing-4)] text-sm text-text-tertiary">
              Guarde este link: ele é o seu ingresso. Quem tiver o link tem o ingresso, então
              encaminhe só para quem deve entrar com ele.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </article>
  );
}

function Linha({ termo, valor }: { termo: string; valor: string }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-text-secondary">{termo}</dt>
      <dd className="text-text-primary">{valor}</dd>
    </div>
  );
}

/**
 * A negativa ÚNICA (RN-419). Um texto só para token inválido, assinatura
 * inválida, inscrito inexistente e evento inexistente — a página não conta ao
 * visitante qual dos quatro aconteceu.
 */
export function IngressoNaoEncontrado(): React.JSX.Element {
  return (
    <div
      data-testid="ingresso-nao-encontrado"
      className="mx-auto w-full max-w-2xl rounded-ds-lg border border-border-default bg-surface-raised p-[var(--spacing-6)]"
    >
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-primary">
        Não encontramos este ingresso
      </h1>
      <p className="mt-[var(--spacing-3)] text-text-secondary">
        O link pode estar incompleto, pode ter sido substituído por um mais recente ou pode não
        existir. Procure o e-mail da compra: ele traz o código do ingresso em texto e o link
        atual de cada inscrito.
      </p>
    </div>
  );
}

/**
 * Degradação HONESTA quando a leitura falha (RN-421). Não é "não encontrado":
 * dizer que o ingresso não existe quando o que caiu foi a rede é mentir para
 * quem comprou. Também não é a tela de erro do framework.
 */
export function IngressoIndisponivel(): React.JSX.Element {
  return (
    <div
      data-testid="ingresso-indisponivel"
      className="mx-auto w-full max-w-2xl rounded-ds-lg border border-border-default bg-surface-raised p-[var(--spacing-6)]"
    >
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-primary">
        Não conseguimos carregar seu ingresso agora
      </h1>
      <p className="mt-[var(--spacing-3)] text-text-secondary">
        O problema é nosso, não do seu link. Atualize a página em alguns segundos. Se insistir, o
        código do ingresso que está no e-mail da compra basta para o credenciamento.
      </p>
    </div>
  );
}
