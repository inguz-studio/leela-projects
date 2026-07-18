'use client';

import { UserRound, Users } from 'lucide-react';
import { Checkbox, Field, Input } from '@/app/_ds/ds';
import type { InscritoForm } from './tipos';
import type { ErrosInscrito, ErrosResponsavel } from './validacao';
import { TituloEtapa, ApoioEtapa } from './tipografia';

/**
 * Etapa 2 — Dados (ADR-011: 1 responsável/pagador + N inscritos). O responsável
 * é sempre o pagador; o checkbox "Eu vou correr" faz dele o 1º inscrito
 * (auto-inscrição). A modalidade e o kit de cada atleta já foram escolhidos na
 * etapa anterior (Modalidade e kit) — aqui é só a identificação.
 *
 * LEELA-R13: formulário 100% VERTICAL (decisão do Vitor, adendo 10) — campos
 * empilhados em coluna única em todos os breakpoints (sem grid de 2 colunas),
 * para facilitar a leitura. Títulos padronizados via `TituloEtapa`/`ApoioEtapa`
 * (escala tipográfica única do checkout).
 */
export function StepDados({
  responsavelNome,
  responsavelEmail,
  onResponsavel,
  euCorro,
  onEuCorro,
  inscritos,
  onInscrito,
  errosResponsavel,
  errosInscritos,
}: {
  responsavelNome: string;
  responsavelEmail: string;
  onResponsavel: (patch: { nome?: string; email?: string }) => void;
  euCorro: boolean;
  onEuCorro: (v: boolean) => void;
  inscritos: InscritoForm[];
  onInscrito: (index: number, patch: Partial<InscritoForm>) => void;
  errosResponsavel: ErrosResponsavel;
  errosInscritos: ErrosInscrito[];
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      {/* Responsável / pagador */}
      <section className="flex flex-col gap-4">
        <div>
          <TituloEtapa icone={UserRound}>Responsável pela inscrição</TituloEtapa>
          <ApoioEtapa>
            Quem faz e paga a inscrição. O comprovante e os ingressos vão para este e-mail.
          </ApoioEtapa>
        </div>
        {/* Vertical: nome e e-mail empilhados (coluna única). */}
        <div className="flex flex-col gap-4">
          <Field label="Nome completo" required errorMessage={errosResponsavel.nome ?? ''}>
            <Input
              value={responsavelNome}
              autoComplete="name"
              onChange={(e) => onResponsavel({ nome: e.target.value })}
              placeholder="Como no documento"
            />
          </Field>
          <Field label="E-mail" required errorMessage={errosResponsavel.email ?? ''}>
            <Input
              type="email"
              value={responsavelEmail}
              autoComplete="email"
              inputMode="email"
              onChange={(e) => onResponsavel({ email: e.target.value })}
              placeholder="voce@email.com"
            />
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-[length:var(--font-size-base)] text-text-primary">
          <Checkbox
            checked={euCorro}
            onChange={(e) => onEuCorro(e.target.checked)}
            aria-label="Eu também vou correr nesta prova"
          />
          <span>Eu também vou correr nesta prova</span>
        </label>
      </section>

      {/* Inscritos */}
      <section className="flex flex-col gap-4">
        <div>
          <TituloEtapa icone={Users}>
            {inscritos.length > 1 ? 'Quem vai correr' : 'Inscrição'}
          </TituloEtapa>
          <ApoioEtapa>
            Cada atleta tem os próprios dados. A modalidade e o kit já foram escolhidos na etapa
            anterior.
          </ApoioEtapa>
        </div>

        {inscritos.map((inscrito, i) => {
          const erros = errosInscritos[i] ?? {};
          const ehVoce = euCorro && i === 0;
          return (
            <div
              key={i}
              className="rounded-ds-lg border border-border-subtle bg-surface-raised p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-text-primary">
                  {ehVoce ? 'Você' : `Atleta ${euCorro ? i : i + 1}`}
                </h3>
              </div>

              {/* Vertical: campos empilhados em coluna única (sem grid). */}
              <div className="flex flex-col gap-4">
                {ehVoce ? (
                  <p className="text-[length:var(--font-size-base)] text-text-secondary">
                    Usando seus dados de responsável
                    {responsavelNome ? ` (${responsavelNome})` : ''}. Falta só o CPF.
                  </p>
                ) : (
                  <>
                    <Field label="Nome completo" required errorMessage={erros.nome ?? ''}>
                      <Input
                        value={inscrito.nome}
                        autoComplete="name"
                        onChange={(e) => onInscrito(i, { nome: e.target.value })}
                      />
                    </Field>
                    <Field label="E-mail" required errorMessage={erros.email ?? ''}>
                      <Input
                        type="email"
                        value={inscrito.email}
                        inputMode="email"
                        onChange={(e) => onInscrito(i, { email: e.target.value })}
                      />
                    </Field>
                  </>
                )}

                <Field label="CPF" required errorMessage={erros.cpf ?? ''}>
                  <Input
                    value={inscrito.cpf}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000.000.000-00"
                    onChange={(e) => onInscrito(i, { cpf: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
