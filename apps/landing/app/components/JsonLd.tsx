// =============================================================================
// apps/landing/app/components/JsonLd.tsx
//
// Injeta um bloco de dados estruturados (schema.org) como <script
// application/ld+json> — S1205-T1. Server Component puro: o JSON é serializado
// no servidor e vai no HTML inicial (crawler lê sem executar JS). O objeto vem
// de construtores puros em `lib/seo.ts` (dado projetado do leitor público), não
// de entrada de usuário — o `dangerouslySetInnerHTML` carrega só JSON derivado.
// =============================================================================

export function JsonLd({ data }: { data: Record<string, unknown> }): React.JSX.Element {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify escapa aspas; o conteúdo é dado público projetado, não
      // markup arbitrário. Padrão recomendado do Next para JSON-LD.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
