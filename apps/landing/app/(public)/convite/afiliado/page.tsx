import Link from 'next/link';
import { AfiliadoConviteForm } from './AfiliadoConviteForm';

// Página PÚBLICA de aceite do convite de influenciador PF (R9-E · S-R9-11-T6 ·
// RN-316). Espelha a página de aceite de assessoria (E18): captura
// eventoId/afiliadoId/token da URL (o token do link É a credencial — Schneier)
// e delega o fluxo ao <AfiliadoConviteForm> (Client Component). Sem os 3
// parâmetros, o convite é inválido — estado honesto. Lê searchParams → dinâmico.
export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

function primeiro(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return valor[0] ?? '';
  return valor ?? '';
}

export default function ConviteAfiliadoPage({ searchParams }: Props): React.JSX.Element {
  const eventoId = primeiro(searchParams['e']);
  const afiliadoId = primeiro(searchParams['a']);
  const token = primeiro(searchParams['t']);

  const linkCompleto =
    eventoId.length > 0 && afiliadoId.length > 0 && token.length > 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-text-primary">
        Aceitar convite de influenciador
      </h1>
      <p className="mt-3 text-text-secondary">
        Você foi convidado a divulgar um evento como influenciador parceiro.
        Complete o cadastro abaixo para acompanhar as conversões do seu link.
      </p>

      {linkCompleto ? (
        <AfiliadoConviteForm eventoId={eventoId} afiliadoId={afiliadoId} token={token} />
      ) : (
        <div className="mt-8 rounded-ds-lg border border-border-default bg-surface-raised p-6">
          <p className="text-lg font-semibold text-text-primary">Convite inválido</p>
          <p className="mt-2 text-text-secondary">
            Este link está incompleto ou expirado. Peça ao organizador que reenvie
            o convite de influenciador.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            ← Voltar
          </Link>
        </div>
      )}
    </div>
  );
}
