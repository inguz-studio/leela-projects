import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@leela/design-system/server';
import { ConviteForm } from './ConviteForm';

// Página transacional com TOKEN na query — fora do índice (W2-F-02 ·
// GATE-DS-W2). noindex por metadata + disallow `/convite` no robots.ts.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Página PÚBLICA de aceite do convite de assessoria parceira (E18 · S1801-T2).
// Server Component: captura tenantId/parceriaId/token da URL (o token do link É
// a credencial — Schneier) e delega o fluxo interativo ao <ConviteForm> (Client
// Component). Sem os 3 parâmetros, o convite é inválido — estado honesto, nada
// de formulário. Lê searchParams → dinâmico.
export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

function primeiro(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return valor[0] ?? '';
  return valor ?? '';
}

export default function ConvitePage({ searchParams }: Props): React.JSX.Element {
  const tenantId = primeiro(searchParams['tenantId']);
  const parceriaId = primeiro(searchParams['parceriaId']);
  const token = primeiro(searchParams['token']);

  const linkCompleto = tenantId.length > 0 && parceriaId.length > 0 && token.length > 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-text-primary">
        Aceitar convite de assessoria
      </h1>
      <p className="mt-3 text-text-secondary">
        Você foi convidado a entrar na Be Hero como assessoria parceira. Complete o cadastro abaixo
        para ativar a parceria.
      </p>

      {linkCompleto ? (
        <ConviteForm tenantId={tenantId} parceriaId={parceriaId} token={token} />
      ) : (
        <Card className="mt-8 p-6">
          <p className="text-lg font-semibold text-text-primary">Convite inválido</p>
          <p className="mt-2 text-text-secondary">
            Este link está incompleto ou expirado. Peça ao organizador que reenvie o convite de
            assessoria parceira.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            ← Voltar para a Be Hero
          </Link>
        </Card>
      )}
    </div>
  );
}
