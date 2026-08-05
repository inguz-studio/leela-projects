'use client';
// =============================================================================
// PainelClubes — Meus Clubes e a caixa de convites (S1222-T4 · RN-451).
//
// DUAS SEÇÕES NUMA ABA SÓ, e elas não são a mesma coisa. Em cima, os clubes em
// que a conta já é membro. Embaixo, a caixa de entrada dos convites para virar
// promotor ou influenciador — que chegam de duas máquinas distintas
// (`/convite/afiliado` · RN-316 e `/convite` · E18) e que o servidor já
// entrega numa lista só, com o tipo em cada linha.
//
// A CAIXA NÃO ACEITA CONVITE, E ISSO É DESENHO, NÃO FALTA. O aceite continua
// sendo o link com token que chegou por e-mail: os documentos guardam apenas o
// HASH do token, então o link não é reconstituível nem no servidor. A fila
// escreve a razão em uma linha — "a área lista o que chegou; ela não vira um
// segundo mecanismo de aceite. Duplicar o aceite duplicaria a superfície de
// credencial". O cartão diz onde está o link em vez de fingir um botão que
// levaria a lugar nenhum.
//
// O VAZIO É UMA TELA, NÃO UM BRANCO — e é o caso NORMAL aqui. Não existe hoje
// nenhum caminho pelo qual um participante entre num clube pela Leela (não há
// `entrarNoClube`; os únicos escritores de `membros` são o painel do
// organizador, a Function de agregado e o seed). Então o estado vazio não pode
// prometer um botão de entrar que o produto não tem: ele diz o que é verdade
// hoje, e nada além.
//
// VOCABULÁRIO D-0802-1: experiência e participante; clube é clube.
// =============================================================================

import type { ClubeDaConta, ConviteDaConta } from '@leela/api-client';
import { Badge, EmptyState } from '@/app/_ds/ds';

const FUSO = 'America/Sao_Paulo';
const fmtDia = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: FUSO,
});

const CARTAO =
  'flex flex-col gap-3 rounded-ds-lg border border-border-default bg-surface-raised p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5';

const AVISO =
  'rounded-ds-lg border border-border-default bg-surface-raised p-4 text-sm text-text-secondary';

const TITULO_SECAO = 'text-sm font-semibold uppercase tracking-wide text-text-secondary';

/** O papel só vira rótulo quando diz alguma coisa: "membro" é o default. */
const ROTULO_PAPEL: Record<ClubeDaConta['papel'], string> = {
  owner: 'Você administra',
  admin: 'Administração',
  membro: '',
};

const ROTULO_STATUS_CLUBE: Record<ClubeDaConta['status'], string> = {
  ativo: 'Ativo',
  novo: 'Entrou agora',
  inativo: 'Sem atividade',
};

const VARIANTE_STATUS_CLUBE: Record<ClubeDaConta['status'], 'vitoria' | 'alerta' | 'neutro'> = {
  ativo: 'vitoria',
  novo: 'vitoria',
  inativo: 'neutro',
};

const ROTULO_TIPO: Record<ConviteDaConta['tipo'], string> = {
  influenciador: 'Convite para influenciador',
  promotor: 'Convite para promotor',
};

const ROTULO_ESTADO: Record<ConviteDaConta['estado'], string> = {
  pendente: 'Aguardando você',
  expirado: 'Prazo vencido',
  aceito: 'Aceito',
};

const VARIANTE_ESTADO: Record<ConviteDaConta['estado'], 'vitoria' | 'alerta' | 'neutro'> = {
  pendente: 'alerta',
  expirado: 'neutro',
  aceito: 'vitoria',
};

/** "05/08/2026" — vazio quando não há carimbo legível. @pure */
function formatarDia(iso: string | null): string {
  if (iso === null) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : fmtDia.format(d);
}

function CartaoClube({ clube }: { clube: ClubeDaConta }): React.JSX.Element {
  const desde = formatarDia(clube.entrouEmIso);
  const papel = ROTULO_PAPEL[clube.papel];
  return (
    <li className={CARTAO} data-slot="clube-cartao">
      <div className="min-w-0">
        <p className="text-base font-semibold text-text-primary">
          {/* Clube apagado depois do vínculo ainda é um vínculo: a linha fica,
              com o nome que faltou resolvido em texto, não em branco. */}
          {clube.nome.length > 0 ? clube.nome : 'Clube'}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {[papel, desde.length > 0 ? `Desde ${desde}` : ''].filter((t) => t.length > 0).join(' · ')}
        </p>
      </div>
      <div className="shrink-0">
        <Badge variant={VARIANTE_STATUS_CLUBE[clube.status]}>
          {ROTULO_STATUS_CLUBE[clube.status]}
        </Badge>
      </div>
    </li>
  );
}

function CartaoConvite({ convite }: { convite: ConviteDaConta }): React.JSX.Element {
  const quando = formatarDia(convite.convidadoEmIso);
  const prazo = formatarDia(convite.expiraEmIso);
  return (
    <li className={CARTAO} data-slot="convite-cartao">
      <div className="min-w-0">
        <p className="text-base font-semibold text-text-primary">
          {ROTULO_TIPO[convite.tipo]}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {convite.origemNome.length > 0 ? convite.origemNome : 'Leela'}
          {quando.length > 0 ? ` · enviado em ${quando}` : ''}
        </p>

        {/* O caminho do aceite, dito por extenso. Não há botão porque não há
            link a montar: a credencial é o token, e ele só existe no e-mail. */}
        {convite.estado === 'pendente' ? (
          <p className="mt-2 text-sm text-text-secondary" data-slot="convite-como-aceitar">
            Para aceitar, abra o link do convite no e-mail que você recebeu
            {prazo.length > 0 ? `. O link vale até ${prazo}` : ''}.
          </p>
        ) : null}

        {convite.estado === 'expirado' ? (
          <p className="mt-2 text-sm text-text-secondary" data-slot="convite-expirado">
            O prazo deste convite venceu
            {prazo.length > 0 ? ` em ${prazo}` : ''}. Peça um novo a quem convidou você.
          </p>
        ) : null}

        {convite.estado === 'aceito' ? (
          <p className="mt-2 text-sm text-text-secondary" data-slot="convite-aceito">
            Você já aceitou este convite.
          </p>
        ) : null}
      </div>
      <div className="shrink-0">
        <Badge variant={VARIANTE_ESTADO[convite.estado]}>{ROTULO_ESTADO[convite.estado]}</Badge>
      </div>
    </li>
  );
}

export interface PainelClubesProps {
  clubes: ClubeDaConta[];
  convites: ConviteDaConta[];
  /** false = a lista de clubes foi cortada ou falhou; a tela DIZ. */
  clubesCompletos: boolean;
  /** false = a caixa de convites foi cortada ou falhou; a tela DIZ. */
  convitesCompletos: boolean;
}

export function PainelClubes({
  clubes,
  convites,
  clubesCompletos,
  convitesCompletos,
}: PainelClubesProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-10" data-slot="painel-clubes">
      <section>
        <h2 className={TITULO_SECAO}>Meus clubes</h2>

        {!clubesCompletos ? (
          // Degradação DECLARADA: ou o teto cortou a lista, ou a leitura falhou.
          // Calar aqui produziria a lista que mente — o defeito desta rodada.
          <p role="status" data-slot="clubes-lista-parcial" className={`mt-3 ${AVISO}`}>
            Pode estar faltando algum clube nesta lista. Se você não encontrar o seu, fale com quem
            administra o clube.
          </p>
        ) : null}

        {clubes.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="Você ainda não faz parte de nenhum clube"
              description="Quem administra um clube na Leela é quem inclui os participantes. Quando você entrar em um, ele aparece aqui."
            />
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {clubes.map((c) => (
              <CartaoClube key={c.chave} clube={c} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className={TITULO_SECAO}>Convites</h2>

        {!convitesCompletos ? (
          <p role="status" data-slot="convites-lista-parcial" className={`mt-3 ${AVISO}`}>
            Pode estar faltando algum convite nesta lista. O link que chegou no seu e-mail continua
            valendo.
          </p>
        ) : null}

        {convites.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="Nenhum convite por aqui"
              description="Convites para divulgar uma experiência como promotor ou influenciador aparecem nesta caixa."
            />
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {convites.map((c) => (
              <CartaoConvite key={c.chave} convite={c} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
