import type { EventoPublico } from '@/lib/tipos';
import { SECTION_REGISTRY } from './sections';

/**
 * Renderizador de seções ORIENTADO POR CONFIGURAÇÃO (aceite S1201-T1).
 *
 * Itera `evento.secoes` — que o leitor já entregou FILTRADO por `ativa` e na
 * ORDEM publicada — e renderiza o componente registrado para cada `id`. Uma
 * seção desativada no painel nem chega aqui (o leitor a removeu). Um `id`
 * desconhecido é ignorado. Cada seção decide render vs `null` conforme haja
 * dado real (sem placeholder fabricado). Server Component.
 */
export function SectionRenderer({ evento }: { evento: EventoPublico }): React.JSX.Element {
  return (
    <>
      {evento.secoes.map((secao) => {
        const Section = SECTION_REGISTRY[secao.id];
        if (Section === undefined) return null;
        return <Section key={secao.id} evento={evento} />;
      })}
    </>
  );
}
