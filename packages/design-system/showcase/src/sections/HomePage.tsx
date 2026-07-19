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
  useTheme,
  type Theme,
} from '@leela/design-system';
import primitivesBrasa from '../../../tokens/primitives.brasa.json';
import primitivesWine from '../../../tokens/primitives.wine.json';
import { Section, TokenLabel } from '../ui';
import { BrandLogo } from '../BrandLogo';

// Info por tema — a home reage ao tema ativo (o showroom alterna brasa↔wine),
// então nome, fonte display e hex primário nunca podem ficar cravados em brasa.
type PrimitiveMap = Record<string, Record<string, string>>;
const primary500 = (p: unknown): string => (p as PrimitiveMap).primary?.['500'] ?? '';

const THEME_INFO: Record<Theme, { name: string; displayFont: string; primaryHex: string }> = {
  brasa: { name: 'Brasa', displayFont: 'Exo 2', primaryHex: primary500(primitivesBrasa) },
  wine: { name: 'Wine', displayFont: 'Syne', primaryHex: primary500(primitivesWine) },
};

// Colorways do wordmark (recolor do mesmo escrito). Hex = valor da própria
// colorway (asset de marca); bg = cor pareada p/ contraste no relance.
const COLORWAYS = [
  { name: 'lime',  file: 'leela-wordmark-lime.svg',  hex: '#C8E84A', bg: '#2A1018' },
  { name: 'wine',  file: 'leela-wordmark-wine.svg',  hex: '#7A1520', bg: '#F0ECD8' },
  { name: 'plum',  file: 'leela-wordmark-plum.svg',  hex: '#2A1018', bg: '#C8E84A' },
  { name: 'ember', file: 'leela-wordmark-ember.svg', hex: '#F35606', bg: '#F0ECD8' },
  { name: 'cream', file: 'leela-wordmark-cream.svg', hex: '#F0ECD8', bg: '#7A1520' },
] as const;

// 46 = diretórios reais em src/components (charts conta 1) — recontado no GATE-DS-W1.
const STATS = [
  { value: '46', label: 'componentes' },
  { value: '2', label: 'temas (brasa e wine)' },
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
    description: 'brasa e wine lado a lado, mais a troca ao vivo persistida no navegador.',
  },
];

export function HomePage(): JSX.Element {
  const { theme } = useTheme();
  const info = THEME_INFO[theme];
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
          na identidade {info.name}. Tudo que você vê aqui — sidebar, cabeçalho, cards, botões —
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
        description={`A cor primária e a tipografia display do tema ativo (${info.name}), pintadas por var(), nunca por valor cru.`}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-[length:var(--font-size-md)]">Wordmark oficial</CardTitle>
            <CardDescription>
              O mesmo asset da sidebar do painel e do header da landing, agora
              também no shell do showroom (topo da barra lateral) e no favicon. A
              variante troca por tema para ler nos dois fundos: no {THEME_INFO.brasa.name} (escuro)
              o wordmark limão sobre transparente; no {THEME_INFO.wine.name} (claro) o wordmark
              vinho sobre transparente. Cada variante é um recolor do mesmo escrito — só muda o
              fill, sem caixa. Abaixo, as cinco colorways disponíveis.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-[var(--spacing-4)]">
            <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-[var(--spacing-6)]">
              <BrandLogo className="h-[var(--spacing-8)]" />
            </div>
            {/* Relance das colorways do wordmark. Os hex inline são o PRÓPRIO
                assunto (asset de marca em exibição, como uma rampa de cor mostra
                seus valores), não tokens de tema. Cada wordmark vai sobre a cor
                pareada da colorway para carregar contraste. */}
            <ul className="grid grid-cols-2 gap-[var(--spacing-2)] sm:grid-cols-5">
              {COLORWAYS.map((c) => (
                <li key={c.name} className="flex flex-col gap-[var(--spacing-1)]">
                  <span
                    className="flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-[var(--spacing-3)]"
                    style={{ background: c.bg }}
                  >
                    <img
                      src={`${import.meta.env.BASE_URL}${c.file}`}
                      alt={`Wordmark Leela ${c.name}`}
                      className="h-[var(--spacing-5)] w-auto"
                    />
                  </span>
                  <TokenLabel>{`${c.name} ${c.hex}`}</TokenLabel>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-[var(--spacing-4)] md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-[length:var(--font-size-md)]">{info.name}</CardTitle>
              <CardDescription>cor primária do tema ativo</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-[var(--spacing-4)]">
              <div
                aria-hidden
                className="h-[var(--spacing-16)] w-[var(--spacing-16)] rounded-[var(--radius-md)] shadow-elev-brand"
                style={{ background: 'var(--primary-500)' }}
              />
              <div className="flex flex-col gap-[var(--spacing-1)]">
                <TokenLabel>--primary-500</TokenLabel>
                <TokenLabel>{info.primaryHex}</TokenLabel>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[length:var(--font-size-md)]">Tipografia display</CardTitle>
              <CardDescription>{`--font-family-display (${info.displayFont} no ${info.name})`}</CardDescription>
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
                A corrida começa aqui
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
