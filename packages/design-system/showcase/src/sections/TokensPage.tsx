/**
 * Fundações — painéis data-driven dos tokens do DS.
 *
 * Regra de ouro: toda amostra é pintada com var(--token). O hex aparece
 * exclusivamente como TEXTO informativo, lido dos JSON de tokens.
 */

import * as React from 'react';
import { Button, cn } from '@leela/design-system';
import primitives from '../../../tokens/primitives.brasa.json';
import semantic from '../../../tokens/semantic.json';
import { DemoCard, Section, TokenLabel } from '../ui';

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------

type TokenTree = Record<string, Record<string, string>>;

const primitivesTree = primitives as unknown as TokenTree;
const semanticTree = semantic as unknown as TokenTree;

const COLOR_FAMILIES = ['primary', 'danger', 'success', 'warning', 'info', 'neutral'] as const;
const SEMANTIC_GROUPS = ['surface', 'text', 'action', 'border', 'feedback'] as const;

const FONT_SIZES = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const;
const FONT_WEIGHTS = ['regular', 'semibold', 'bold'] as const;
const SPACINGS = ['1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24'] as const;
const RADII = ['none', 'sm', 'md', 'lg', 'xl', 'pill'] as const;
const ELEVATIONS = ['0', '1', '2', '3', 'brand'] as const;

function sortSteps(steps: string[]): string[] {
  return [...steps].sort((a, b) => Number(a) - Number(b));
}

// ---------------------------------------------------------------------------
// Blocos
// ---------------------------------------------------------------------------

function ColorRamp({ family }: { family: string }): JSX.Element {
  const steps = sortSteps(Object.keys(primitivesTree[family] ?? {}));
  return (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <p className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        {family}
      </p>
      <div className="grid grid-cols-5 gap-[var(--spacing-2)] lg:grid-cols-10 xl:grid-cols-12">
        {steps.map((step) => (
          <div key={step} className="flex flex-col gap-[var(--spacing-1)]">
            <div
              aria-hidden
              className="h-[var(--spacing-10)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)]"
              style={{ background: `var(--${family}-${step})` }}
            />
            <TokenLabel>{`--${family}-${step}`}</TokenLabel>
            <TokenLabel>{primitivesTree[family]?.[step]}</TokenLabel>
          </div>
        ))}
      </div>
    </div>
  );
}

function SemanticGroup({ group }: { group: string }): JSX.Element {
  const entries = Object.entries(semanticTree[group] ?? {});
  return (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <p className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        {group}
      </p>
      <div className="grid grid-cols-2 gap-[var(--spacing-2)] md:grid-cols-4 xl:grid-cols-6">
        {entries.map(([key, ref]) => (
          <div
            key={key}
            className="flex items-center gap-[var(--spacing-2)] rounded-[var(--radius-sm)] bg-[var(--surface-raised)] p-[var(--spacing-2)]"
          >
            <span
              aria-hidden
              className="h-[var(--spacing-8)] w-[var(--spacing-8)] shrink-0 rounded-[var(--radius-sm)] border border-[var(--border-subtle)]"
              style={{ background: `var(--${group}-${key})` }}
            />
            <span className="flex min-w-0 flex-col">
              <TokenLabel>{`--${group}-${key}`}</TokenLabel>
              <TokenLabel>{ref}</TokenLabel>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MotionSampleProps {
  title: string;
  description: string;
  animationClass: string;
  durationToken: string;
  easingToken: string;
}

function MotionSample({
  title,
  description,
  animationClass,
  durationToken,
  easingToken,
}: MotionSampleProps): JSX.Element {
  const [run, setRun] = React.useState(0);
  return (
    <DemoCard title={title} description={description}>
      <div className="flex h-[var(--spacing-20)] items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-overlay)]">
        <div
          key={run}
          aria-hidden
          className={cn(
            'h-[var(--spacing-12)] w-[var(--spacing-12)]',
            'rounded-[var(--radius-md)]',
            'shadow-elev-2',
            'animate-in',
            animationClass,
          )}
          style={{
            background: 'var(--action-primary)',
            animationDuration: `var(${durationToken})`,
            animationTimingFunction: `var(${easingToken})`,
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-[var(--spacing-3)]">
        <span className="flex flex-col">
          <TokenLabel>{durationToken}</TokenLabel>
          <TokenLabel>{easingToken}</TokenLabel>
        </span>
        <Button variant="secondary" size="sm" onClick={() => setRun((n) => n + 1)}>
          Reproduzir
        </Button>
      </div>
    </DemoCard>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export function TokensPage(): JSX.Element {
  return (
    <>
      <Section
        title="Cores primitivas"
        description="Rampas 50–900 do tema brasa. Amostras pintadas com var(); o hex é texto informativo lido de tokens/primitives.brasa.json."
      >
        <div className="flex flex-col gap-[var(--spacing-6)]">
          {COLOR_FAMILIES.map((family) => (
            <ColorRamp key={family} family={family} />
          ))}
        </div>
      </Section>

      <Section
        title="Cores semânticas"
        description="Papéis de uso (surface, text, action, border, feedback) com a referência primitiva declarada em tokens/semantic.json."
      >
        <div className="flex flex-col gap-[var(--spacing-6)]">
          {SEMANTIC_GROUPS.map((group) => (
            <SemanticGroup key={group} group={group} />
          ))}
        </div>
      </Section>

      <Section
        title="Tipografia"
        description="Escala --font-size-* renderizada com a própria variável; famílias e pesos por token."
      >
        <div className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-[var(--spacing-6)]">
          {FONT_SIZES.map((size) => (
            <div key={size} className="flex items-baseline gap-[var(--spacing-4)]">
              <span className="w-[var(--spacing-24)] shrink-0">
                <TokenLabel>{`--font-size-${size}`}</TokenLabel>
              </span>
              <span
                className="truncate font-display text-[var(--text-primary)]"
                style={{ fontSize: `var(--font-size-${size})` }}
              >
                A brasa nunca apaga
              </span>
            </div>
          ))}
          <div className="mt-[var(--spacing-3)] flex flex-wrap gap-[var(--spacing-6)]">
            {FONT_WEIGHTS.map((weight) => (
              <span key={weight} className="flex flex-col gap-[var(--spacing-1)]">
                <span
                  className="text-[length:var(--font-size-lg)] text-[var(--text-primary)]"
                  style={{ fontWeight: `var(--font-weight-${weight})` as React.CSSProperties['fontWeight'] }}
                >
                  Peso {weight}
                </span>
                <TokenLabel>{`--font-weight-${weight}`}</TokenLabel>
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Spacing" description="Escala de espaçamento em barras na largura do próprio token.">
        <div className="flex flex-col gap-[var(--spacing-2)] rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-[var(--spacing-6)]">
          {SPACINGS.map((step) => (
            <div key={step} className="flex items-center gap-[var(--spacing-4)]">
              <span className="w-[var(--spacing-24)] shrink-0">
                <TokenLabel>{`--spacing-${step}`}</TokenLabel>
              </span>
              <span
                aria-hidden
                className="h-[var(--spacing-2)] rounded-[var(--radius-pill)]"
                style={{ width: `var(--spacing-${step})`, background: 'var(--action-primary)' }}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius" description="Cantos aplicados com border-radius: var(--radius-*).">
        <div className="flex flex-wrap gap-[var(--spacing-6)] rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-[var(--spacing-6)]">
          {RADII.map((radius) => (
            <div key={radius} className="flex flex-col items-center gap-[var(--spacing-2)]">
              <div
                aria-hidden
                className="h-[var(--spacing-16)] w-[var(--spacing-16)] border border-[var(--border-strong)] bg-[var(--surface-overlay)]"
                style={{ borderRadius: `var(--radius-${radius})` }}
              />
              <TokenLabel>{`--radius-${radius}`}</TokenLabel>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Elevação"
        description="Sombras --elevation-0 a 3 e o glow de marca --elevation-brand."
      >
        <div className="grid grid-cols-1 gap-[var(--spacing-6)] p-[var(--spacing-4)] md:grid-cols-3 xl:grid-cols-5">
          {ELEVATIONS.map((level) => (
            <div
              key={level}
              className="flex h-[var(--spacing-24)] items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-raised)]"
              style={{ boxShadow: `var(--elevation-${level})` }}
            >
              <TokenLabel>{`--elevation-${level}`}</TokenLabel>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Motion"
        description="Animações do tailwindcss-animate tokenizadas pelo preset: duração e easing vêm de var(--motion-*). Reproduza para re-montar o elemento."
      >
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] md:grid-cols-3">
          <MotionSample
            title="Fade in — fast"
            description="animate-in fade-in-0"
            animationClass="fade-in-0"
            durationToken="--motion-duration-fast"
            easingToken="--motion-easing-default"
          />
          <MotionSample
            title="Zoom in — normal"
            description="animate-in fade-in-0 zoom-in-50"
            animationClass="fade-in-0 zoom-in-50"
            durationToken="--motion-duration-normal"
            easingToken="--motion-easing-enter"
          />
          <MotionSample
            title="Slide in — slow"
            description="animate-in fade-in-0 slide-in-from-bottom-4"
            animationClass="fade-in-0 slide-in-from-bottom-4"
            durationToken="--motion-duration-slow"
            easingToken="--motion-easing-enter"
          />
        </div>
      </Section>
    </>
  );
}
