// =============================================================================
// PreRequisitoRecebimento — o aviso que substitui a PROXIMIDADE perdida.
//
// Até a rodada IA-MENU, o pré-requisito do saque era garantido por acidente de
// layout: o formulário bancário ficava logo abaixo do botão "Solicitar
// repasse". Com o cadastro em Configurações › Dados de recebimento (RN-366),
// essa garantia sumiu. Este bloco a repõe de propósito: quando não há dado
// salvo, a tela DIZ o que falta e leva até onde se resolve — em vez de deixar
// um botão desabilitado sem explicação, ou pior, abrir um modal de saque que o
// servidor recusaria (RN-352).
//
// Presentational puro: a navegação chega por prop, para o componente não
// conhecer rota nem router.
// =============================================================================

import { Button } from '@leela/design-system';

export interface PreRequisitoRecebimentoProps {
  onIrParaConfiguracoes: () => void;
}

export function PreRequisitoRecebimento({
  onIrParaConfiguracoes,
}: PreRequisitoRecebimentoProps): JSX.Element {
  return (
    <section
      aria-label="Dados de recebimento pendentes"
      className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]"
    >
      <h2 className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        Cadastre seus dados de recebimento
      </h2>
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
        Para solicitar um repasse você precisa informar a conta que vai receber o dinheiro. O
        cadastro é único e vale para todos os seus eventos.
      </p>
      <div>
        <Button variant="primary" size="sm" onClick={onIrParaConfiguracoes}>
          Ir para Configurações
        </Button>
      </div>
    </section>
  );
}

PreRequisitoRecebimento.displayName = 'PreRequisitoRecebimento';
