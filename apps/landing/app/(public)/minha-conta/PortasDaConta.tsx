'use client';
// =============================================================================
// PortasDaConta — as duas portas do fim da área do cliente (S1222-T5).
//
// A REGRA NÃO MORA AQUI. Quem decide qual porta aparece é
// `portaDaConta(claims)`, puro e testável sem montar componente nenhum. Este
// arquivo só desenha o que aquela função respondeu — inclusive o `null`, que
// é a conta de administração da plataforma e não ganha porta nenhuma (RN-449).
//
// OS DOIS DESTINOS SÃO ABSOLUTOS E VÊM DE `painelUrl`, cujo tipo `RotaPainel`
// admite exatamente `/entrar` e `/cadastrar`. Não há valor que produza uma URL
// de `/plataforma` daqui — a proibição é do compilador, e não de uma checagem
// que alguém possa esquecer numa refatoração.
// =============================================================================

import { useEffect, useState } from 'react';
import { getClaims } from '@leela/api-client';
import { painelUrl } from '@/lib/painel';
import { portaDaConta, type PortaDaConta } from '@/lib/portaOrganizador';

const CARTAO = 'rounded-ds-lg border border-border-default bg-surface-raised p-4 sm:p-5';
const LINK =
  'mt-3 inline-flex w-fit items-center rounded-ds-pill border border-border-default px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus';

export function PortasDaConta(): React.JSX.Element | null {
  const [porta, setPorta] = useState<PortaDaConta>(null);

  useEffect(() => {
    let vivo = true;
    void getClaims()
      .then((claims) => {
        if (vivo) setPorta(portaDaConta(claims));
      })
      .catch(() => {
        // Falha ao ler o token: nenhuma porta. Não desenhar é reversível;
        // desenhar a errada, não.
        if (vivo) setPorta(null);
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (porta === null) return null;

  if (porta === 'organizador') {
    return (
      <section className={CARTAO} data-slot="porta-organizador">
        <h2 className="text-base font-semibold text-text-primary">Você também organiza</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Suas experiências, inscrições e repasses ficam no painel do organizador.
        </p>
        <a className={LINK} href={painelUrl('/entrar')} data-slot="ir-para-painel">
          Ir para o painel do organizador
        </a>
      </section>
    );
  }

  return (
    <section className={CARTAO} data-slot="porta-criar-organizador">
      <h2 className="text-base font-semibold text-text-primary">Quer organizar uma experiência?</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Crie sua conta de organizador. Ela nasce separada desta, e você continua entrando pelo
        mesmo e-mail.
      </p>
      <a className={LINK} href={painelUrl('/cadastrar')} data-slot="criar-conta-organizador">
        Criar conta de organizador
      </a>
    </section>
  );
}
