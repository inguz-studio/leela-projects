/**
 * Temas — comparação lado a lado brasa × leela.
 *
 * Cada painel fixa data-theme no wrapper: as CSS vars resolvem no escopo do
 * próprio wrapper, então os MESMOS componentes renderizam nos dois temas ao
 * mesmo tempo. A troca ao vivo fica no topo de todas as páginas (PageHeader)
 * e persiste via ThemeProvider do DS (localStorage 'leela-theme-preference').
 */

import {
  Avatar,
  Badge,
  Button,
  CardDesafio,
  Chip,
  Divider,
  Input,
  useTheme,
  cn,
} from '@leela/design-system';
import { Section, TokenLabel } from '../ui';

const SWATCHES = [
  '--primary-500',
  '--surface-base',
  '--surface-raised',
  '--text-primary',
  '--feedback-success',
  '--feedback-warning',
] as const;

function ThemeSample({ theme, label }: { theme: 'brasa' | 'leela'; label: string }): JSX.Element {
  return (
    <div
      data-theme={theme}
      className={cn(
        'flex flex-col gap-[var(--spacing-4)]',
        'rounded-[var(--radius-lg)]',
        'border border-[var(--border-default)]',
        'bg-[var(--surface-base)] text-[var(--text-primary)]',
        'p-[var(--spacing-6)]',
      )}
    >
      <div className="flex items-center justify-between gap-[var(--spacing-3)]">
        <h3
          className={cn(
            'font-display',
            'text-[length:var(--font-size-lg)]',
            'font-[var(--font-weight-bold)]',
          )}
          style={{ fontFamily: 'var(--font-family-display)' }}
        >
          {label}
        </h3>
        <Badge variant="brand">{theme}</Badge>
      </div>

      {/* Amostras de token do tema */}
      <div className="flex flex-wrap gap-[var(--spacing-3)]">
        {SWATCHES.map((token) => (
          <span key={token} className="flex flex-col items-center gap-[var(--spacing-1)]">
            <span
              aria-hidden
              className="h-[var(--spacing-8)] w-[var(--spacing-8)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)]"
              style={{ background: `var(${token})` }}
            />
            <TokenLabel>{token}</TokenLabel>
          </span>
        ))}
      </div>

      <Divider variant="subtle" />

      <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
        <Button size="sm">Primary</Button>
        <Button variant="secondary" size="sm">
          Secondary
        </Button>
        <Button variant="destructive" size="sm">
          Destructive
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
        <Badge variant="vitoria">vitoria</Badge>
        <Badge variant="alerta">alerta</Badge>
        <Badge variant="heroico">heroico</Badge>
        <Chip active>Filtro ativo</Chip>
        <Avatar size="sm" name="Leela DS" />
      </div>

      <Input id={`tema-${theme}-input`} label="Campo de texto" placeholder="Digite algo" />

      <CardDesafio title="Desafio 100 km no mês" progress={62} meta={<span>18 dias restantes</span>} />
    </div>
  );
}

export function ThemesPage(): JSX.Element {
  const { theme } = useTheme();

  return (
    <>
      <Section
        title="Troca ao vivo"
        description="O botão no topo da página alterna o tema do showroom inteiro e persiste a escolha no navegador (ThemeProvider do DS)."
      >
        <p className="text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
          Tema ativo agora: <strong className="text-[var(--text-primary)]">{theme}</strong>. O
          atributo data-theme é aplicado no elemento html; brasa é o default de :root.
        </p>
      </Section>

      <Section
        title="Lado a lado"
        description="Os mesmos componentes renderizados nos dois temas ao mesmo tempo, com data-theme fixado em cada painel."
      >
        <div className="grid grid-cols-1 gap-[var(--spacing-6)] xl:grid-cols-2">
          <ThemeSample theme="brasa" label="Brasa — dark, Exo 2" />
          <ThemeSample theme="leela" label="Leela — light, Syne/Figtree" />
        </div>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Nota: as famílias tipográficas (Exo 2, Syne, Figtree, JetBrains Mono) são declaradas por
          token e usadas quando instaladas no sistema; o showroom não faz nenhum request externo de
          fontes, então sem elas o navegador cai no fallback da pilha.
        </p>
      </Section>
    </>
  );
}
