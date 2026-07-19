// =============================================================================
// apps/landing/app/components/JsonLd.tsx
//
// Injeta um bloco de dados estruturados (schema.org) como <script
// application/ld+json> — S1205-T1. Server Component puro: o JSON é serializado
// no servidor e vai no HTML inicial (crawler lê sem executar JS).
//
// SEGURANÇA (fix W2-F-01): o objeto vem de construtores puros em `lib/seo.ts`,
// mas carrega strings do ORGANIZADOR (nome/descrição/local do evento) — tenant
// autenticado é fronteira de confiança vs o visitante público. A serialização
// passa por `serializeJsonLd`, que escapa `<`/`>`/`&`/U+2028/U+2029 como
// escapes unicode JSON: `</script>` no dado NÃO termina a tag (sem stored XSS)
// e `JSON.parse` devolve o texto original para crawlers.
// =============================================================================

import { serializeJsonLd } from '../../lib/seo';

export function JsonLd({ data }: { data: Record<string, unknown> }): React.JSX.Element {
  return (
    <script
      type="application/ld+json"
      // NUNCA voltar a JSON.stringify cru aqui: ele não escapa `<`, e o dado
      // inclui strings do organizador (breakout de `</script>` = XSS público).
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
