'use client';

import { Card } from '@leela/design-system/server';
import { Button, Input } from '@/app/_ds/ds';

// =============================================================================
// CupomCampo — campo de cupom REUSÁVEL do checkout (S1209-T1 · decisão D-4).
//
// Por que existe: a decisão D-4 do Vitor põe o cupom já no INÍCIO do fluxo
// (paridade com a referência), mas o cupom também segue no Resumo — onde a
// pessoa confere o desconto ao lado do total. Em vez de duplicar markup (e
// duplicar bug), o bloco vira UM componente consumido pelos dois steps; a
// lógica (cotar com o código, auto-apply do link, remover) continua ÚNICA no
// CheckoutFlow. Nada aqui calcula preço: o desconto exibido vem da cotação.
//
// Estado de bloqueio: no step 0 a validação real depende de haver modalidade
// escolhida (o servidor precifica o item para dizer se o cupom cola). Sem ela,
// o botão fica desabilitado com a razão explícita — nada de "aplicado" falso.
// =============================================================================

export interface CupomCampoProps {
  /** Texto digitado (sempre maiúsculo — normalizado pelo consumidor). */
  valor: string;
  onValor: (v: string) => void;
  onAplicar: () => void;
  onRemover: () => void;
  aplicando: boolean;
  /** Código efetivamente aplicado pela COTAÇÃO (servidor) — null = nenhum. */
  codigoAplicado: string | null;
  /** Rótulo do desconto já formatado (ex.: "menos R$ 10,00"); '' = sem valor. */
  descontoLabel: string;
  /** Erro honesto (cupom recusado pelo servidor ou cupom do link que não colou). */
  erro: string | null;
  /** Razão de o "Aplicar" estar indisponível agora; null = pode aplicar. */
  bloqueio: string | null;
  titulo?: string;
  apoio?: string;
}

export function CupomCampo({
  valor,
  onValor,
  onAplicar,
  onRemover,
  aplicando,
  codigoAplicado,
  descontoLabel,
  erro,
  bloqueio,
  titulo = 'Cupom de desconto',
  apoio,
}: CupomCampoProps): React.JSX.Element {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-text-primary">{titulo}</h2>
      {apoio ? <p className="text-xs text-text-tertiary">{apoio}</p> : null}

      {codigoAplicado !== null ? (
        <Card className="flex items-center justify-between gap-3 rounded-ds-md border-border-subtle bg-feedback-success-surface px-4 py-3">
          <p className="text-sm font-medium text-feedback-success-fg">
            Cupom {codigoAplicado} aplicado
            {descontoLabel.length > 0 ? ` — ${descontoLabel}` : ''}
          </p>
          <Button variant="ghost" size="sm" onClick={onRemover}>
            Remover
          </Button>
        </Card>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              aria-label="Código do cupom"
              value={valor}
              placeholder="Ex.: HEROI10"
              onChange={(e) => onValor(e.target.value.toUpperCase())}
            />
          </div>
          <Button
            variant="secondary"
            onClick={onAplicar}
            disabled={aplicando || bloqueio !== null || valor.trim().length === 0}
          >
            {aplicando ? 'Aplicando…' : 'Aplicar'}
          </Button>
        </div>
      )}

      {/* Razão do bloqueio ANTES do erro: se ainda não dá para validar, é isso
          que a pessoa precisa ler (não um erro que ela não causou). */}
      {codigoAplicado === null && bloqueio !== null ? (
        <p role="status" className="text-sm text-text-secondary">
          {bloqueio}
        </p>
      ) : null}
      {erro !== null && codigoAplicado === null ? (
        <p role="alert" className="text-sm text-feedback-warning-fg">
          {erro}
        </p>
      ) : null}
    </section>
  );
}
