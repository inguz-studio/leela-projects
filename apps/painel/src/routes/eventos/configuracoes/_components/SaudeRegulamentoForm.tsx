// =============================================================================
// SaudeRegulamentoForm — aba "Exigências e regulamento" (LEELA-S306-T2 · E04).
// Presentational + controlado (padrão ConfigGeraisForm). Dois blocos:
//   Exigências de saúde (RN-146) — flags atestado/PAR-Q, ambas default OFF
//     (minimização LGPD): o organizador só liga quando o regulamento exige.
//   Regulamento (RN-149) — texto + VERSÃO VIGENTE em leitura. A versão é
//     monotônica e sobe SOZINHA no servidor quando o texto muda (trigger
//     versionarRegulamento); a UI nunca a escreve. Nova versão ⇒ inscritos
//     FUTUROS reaceitam; os antigos mantêm a versão que aceitaram.
//
// PII (RN-147 · Art. 11): o DADO de saúde coletado (atestado/PAR-Q do inscrito)
// vive ISOLADO em `inscritos/{id}/saude` — NUNCA é listado aqui. Esta tela só
// liga/desliga a EXIGÊNCIA; a leitura do dado sensível é gateada nas Rules
// (owner/admin), fora desta superfície.
// =============================================================================

import * as React from 'react';
import { Badge, Button, Switch, Textarea, useToast } from '@leela/design-system';
import type { AtualizarExigenciasRegulamentoInput } from '@leela/api-client';
import { REGULAMENTO_MAX, type Evento } from '@leela/core';
import { formatDataHoraExtenso } from '../../_lib/format';
import {
  construirExigenciasRegulamento,
  valoresDoEventoSaude,
  versaoVigente,
  type SaudeRegulamentoValues,
} from '../_lib/saudeForm';

export interface SaudeRegulamentoFormProps {
  evento: Evento;
  /** Papel pode editar? (desabilita os controles + o Salvar quando false). */
  podeEditar: boolean;
  onSalvar: (input: AtualizarExigenciasRegulamentoInput) => Promise<void>;
}

export function SaudeRegulamentoForm({
  evento,
  podeEditar,
  onSalvar,
}: SaudeRegulamentoFormProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = React.useState<SaudeRegulamentoValues>(() =>
    valoresDoEventoSaude(evento),
  );
  const [salvando, setSalvando] = React.useState(false);

  // Reidrata quando o evento muda (read-your-writes após salvar).
  React.useEffect(() => {
    setValues(valoresDoEventoSaude(evento));
  }, [evento]);

  function set<K extends keyof SaudeRegulamentoValues>(campo: K, valor: SaudeRegulamentoValues[K]) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEditar) return;
    if (values.regulamento.length > REGULAMENTO_MAX) {
      toast({
        variant: 'danger',
        title: 'Regulamento muito longo',
        description: `O texto excede ${REGULAMENTO_MAX.toLocaleString('pt-BR')} caracteres.`,
      });
      return;
    }
    setSalvando(true);
    try {
      await onSalvar(construirExigenciasRegulamento(values));
      toast({ variant: 'success', title: 'Exigências e regulamento salvos' });
    } catch {
      toast({
        variant: 'danger',
        title: 'Não foi possível salvar',
        description: 'Você pode não ter permissão para editar este evento.',
      });
    } finally {
      setSalvando(false);
    }
  }

  const disabled = !podeEditar || salvando;
  const versao = versaoVigente(evento);
  const atualizadoEm = formatDataHoraExtenso(evento.regulamentoAtualizadoEm);

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Exigências de saúde e regulamento"
      className="flex max-w-3xl flex-col gap-[var(--spacing-6)]"
    >
      {!podeEditar ? (
        <p role="status" className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Seu papel não permite editar — os campos estão em leitura.
        </p>
      ) : null}

      {/* Exigências de saúde (RN-146 · minimização LGPD). */}
      <section
        aria-label="Exigências de saúde"
        className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]"
      >
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Exigências de saúde
          </h3>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            Ligue só o que o regulamento da prova exige. O documento enviado pelo atleta é
            dado sensível: fica restrito ao organizador/administrador e nunca aparece nas
            listas do evento.
          </p>
        </div>
        <Switch
          id="saude-atestado"
          label="Exigir atestado médico"
          description="O atleta anexa um atestado no checkout."
          checked={values.atestado}
          disabled={disabled}
          onCheckedChange={(checked) => set('atestado', checked)}
        />
        <Switch
          id="saude-parq"
          label="Exigir questionário PAR-Q"
          description="O atleta responde o PAR-Q (prontidão para atividade física) no checkout."
          checked={values.parq}
          disabled={disabled}
          onCheckedChange={(checked) => set('parq', checked)}
        />
      </section>

      {/* Regulamento + versão vigente (RN-149). */}
      <section
        aria-label="Regulamento"
        className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-2)]">
          <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Regulamento
          </h3>
          {versao > 0 ? (
            <Badge variant="neutro">
              {`Versão ${versao}${atualizadoEm ? ` · atualizado em ${atualizadoEm}` : ''}`}
            </Badge>
          ) : (
            <Badge variant="neutro">Sem regulamento publicado</Badge>
          )}
        </div>
        <Textarea
          id="saude-regulamento"
          label="Texto do regulamento"
          value={values.regulamento}
          onChange={(e) => set('regulamento', e.target.value)}
          disabled={disabled}
          rows={10}
          placeholder="Regras da prova, categorias, premiação, política de reembolso…"
        />
        <p className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
          Quando você muda o texto, a versão sobe automaticamente. Inscritos futuros
          precisam aceitar a nova versão; quem já aceitou mantém a versão anterior (RN-149).
        </p>
      </section>

      {podeEditar ? (
        <div className="flex items-center gap-[var(--spacing-3)]">
          <Button type="submit" variant="primary" disabled={disabled}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

SaudeRegulamentoForm.displayName = 'SaudeRegulamentoForm';
