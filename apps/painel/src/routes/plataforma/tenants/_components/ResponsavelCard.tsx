// =============================================================================
// ResponsavelCard — quem responde por esta produtora, no Resumo da ficha
// (ADMIN-VISAO onda 3 · S1612 · vetável V-3).
//
// A decisão do dono, na íntegra: "Responsável é o dono da conta." É a opção A
// do V-3, então a RN-542 NÃO NASCE — nenhum campo novo, nenhuma coleção,
// nenhum índice. O trabalho foi tipar `telefone` e `organizacao` no
// `Profissional` (gravados desde o auto-cadastro e até agora sem tipo) e
// exibir.
//
// O RÓTULO CARREGA A DECISÃO. "Responsável · o dono da conta" existe porque a
// pergunta que a ficha responde é "com quem eu falo sobre esta produtora", e a
// resposta escolhida foi "com quem abriu a conta". Sem essa linha, quem lê a
// tela daqui a seis meses não sabe se está vendo um contato próprio da
// produtora ou o titular do login — e são coisas diferentes que podem divergir.
//
// Campo ausente é AUSÊNCIA declarada, não string vazia: doc anterior ao
// auto-cadastro não tem telefone nem organização, e "—" com o rótulo do lado
// diz isso melhor do que uma linha que some.
// =============================================================================

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@leela/design-system';
import type { Profissional } from '@leela/core';
import { formatarTelefone } from '../../../eventos/_lib/pii';

export interface ResponsavelCardProps {
  /** Perfil do dono da conta; `null` quando o doc não existe. */
  owner: Profissional | null;
  /** uid do dono — o fallback honesto quando não há perfil. */
  ownerUid: string;
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | undefined }): JSX.Element {
  const preenchido = typeof valor === 'string' && valor.trim() !== '';
  return (
    <div className="flex flex-col gap-[var(--spacing-1)]">
      <dt className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
        {rotulo}
      </dt>
      <dd
        className={
          preenchido
            ? 'text-[length:var(--font-size-base)] text-[var(--text-primary)]'
            : 'text-[length:var(--font-size-base)] text-[var(--text-tertiary)]'
        }
      >
        {preenchido ? valor : 'Não informado'}
      </dd>
    </div>
  );
}

export function ResponsavelCard({ owner, ownerUid }: ResponsavelCardProps): JSX.Element {
  return (
    <Card aria-label="Responsável">
      <CardHeader>
        <CardTitle>Responsável</CardTitle>
        <CardDescription>
          O responsável por esta produtora é o dono da conta — quem abriu o cadastro e responde
          pelo acesso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {owner === null ? (
          <p className="text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
            O perfil do dono da conta não foi encontrado. O vínculo do tenant aponta para o uid{' '}
            <code>{ownerUid}</code>.
          </p>
        ) : (
          <dl className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
            <Campo rotulo="Nome" valor={owner.nome} />
            <Campo rotulo="E-mail" valor={owner.email} />
            <Campo
              rotulo="Telefone"
              valor={owner.telefone ? formatarTelefone(owner.telefone) : undefined}
            />
            <Campo rotulo="Organização" valor={owner.organizacao} />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

ResponsavelCard.displayName = 'ResponsavelCard';
