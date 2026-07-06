/**
 * Início — hero do showroom com tokens de marca e navegação por Cards do DS.
 */

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Divider,
  cn,
} from '@leela/design-system';
import primitives from '../../../tokens/primitives.brasa.json';
import { Section, TokenLabel } from '../ui';

// Hex exibido apenas como TEXTO informativo, lido do JSON de tokens.
const PRIMARY_500_HEX = (primitives as Record<string, Record<string, string>>).primary?.['500'] ?? '';

const STATS = [
  { value: '25', label: 'componentes' },
  { value: '2', label: 'temas (brasa e leela)' },
  { value: '49', label: 'pares AA validados' },
];

const LINKS = [
  {
    href: '#/fundacoes',
    title: 'Fundações',
    description: 'Rampas de cor, tokens semânticos, tipografia, spacing, radius, elevação e motion.',
  },
  {
    href: '#/componentes',
    title: 'Componentes',
    description: 'Galeria interativa por categoria: ações, formulários, data display, navegação, feedback e overlays.',
  },
  {
    href: '#/icones',
    title: 'Ícones',
    description: 'Os 8 ícones da navegação default e a amostra Lucide no padrão 24px / traço 1.75.',
  },
  {
    href: '#/temas',
    title: 'Temas',
    description: 'brasa e leela lado a lado, mais a troca ao vivo persistida no navegador.',
  },
];

export function HomePage(): JSX.Element {
  return (
    <>
      {/* Hero */}
      <section className="flex flex-col gap-[var(--spacing-4)]">
        <div className="flex items-center gap-[var(--spacing-3)]">
          <Badge variant="brand">showroom</Badge>
          <Badge variant="neutro">estático · sem rede</Badge>
        </div>
        <h1
          className={cn(
            'font-display',
            'text-[length:var(--font-size-4xl)]',
            'font-[var(--font-weight-bold)]',
            'leading-[var(--font-lineHeight-tight)]',
            'text-[var(--text-primary)]',
          )}
        >
          LEELA <span className="text-[var(--text-brand)]">Design System</span>
        </h1>
        <p className="max-w-prose text-[length:var(--font-size-md)] text-[var(--text-secondary)]">
          Vitrine navegável construída com os próprios componentes do DS, dentro do AppShell,
          na identidade brasa. Tudo que você vê aqui — sidebar, cabeçalho, cards, botões —
          é o componente real, com as props reais.
        </p>
      </section>

      {/* Contagens */}
      <section className="grid grid-cols-1 gap-[var(--spacing-4)] md:grid-cols-3">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle
                className={cn(
                  'font-display',
                  'text-[length:var(--font-size-3xl)]',
                  'text-[var(--text-brand)]',
                )}
              >
                {stat.value}
              </CardTitle>
              <CardDescription>{stat.label}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      {/* Marca em destaque */}
      <Section
        title="Marca em um relance"
        description="A cor primária e a tipografia display do tema brasa, pintadas por var(), nunca por valor cru."
      >
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-[length:var(--font-size-md)]">Brasa</CardTitle>
              <CardDescription>cor primária do tema default</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-[var(--spacing-4)]">
              <div
                aria-hidden
                className="h-[var(--spacing-16)] w-[var(--spacing-16)] rounded-[var(--radius-md)] shadow-elev-brand"
                style={{ background: 'var(--primary-500)' }}
              />
              <div className="flex flex-col gap-[var(--spacing-1)]">
                <TokenLabel>--primary-500</TokenLabel>
                <TokenLabel>{PRIMARY_500_HEX}</TokenLabel>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[length:var(--font-size-md)]">Tipografia display</CardTitle>
              <CardDescription>--font-family-display (Exo 2 no brasa)</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-[var(--spacing-2)]">
              <p
                className={cn(
                  'font-display',
                  'text-[length:var(--font-size-2xl)]',
                  'font-[var(--font-weight-bold)]',
                  'text-[var(--text-primary)]',
                )}
              >
                Corra com a brasa acesa
              </p>
              <Divider variant="subtle" />
              <p className="font-ui text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
                Texto de interface em --font-family-ui, corpo base 0.875rem.
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Navegação */}
      <Section title="Explorar o showroom">
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] md:grid-cols-2">
          {LINKS.map((link) => (
            <Card key={link.href}>
              <CardHeader>
                <CardTitle className="text-[length:var(--font-size-md)]">{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="secondary" size="sm">
                  <a href={link.href}>Abrir {link.title.toLowerCase()}</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
