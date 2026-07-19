'use client';

// =============================================================================
// AceitesCompra — os DOIS aceites obrigatórios do passo de pagamento
// (LEELA-CKFORM · spec CHECKOUT-UX §5.3, ratificada 2026-07-18):
//   (a) termos da compra + política de cancelamento — texto renderizado da
//       `politicaVendas` PÚBLICA do leitor (defaults legais CDC Art. 49
//       quando o organizador não configurou), versão vigente exibida;
//   (b) termo de responsabilidade de saúde — template do PRODUTO (benchmark
//       Sympla Sports "Termo do Atleta"), versão vigente exibida
//       (`termoSaudeVersao` do leitor). SEMPRE presente, todo evento
//       (decisão CKMOD: declaração de aptidão = aceite; PAR-Q/atestado das
//       flags de exigenciasSaude são superfície FUTURA — D-7).
//
// Padrão de modal: MESMO do RegulamentoModal — primitivo `Dialog` do DS via
// entrada Radix-free (ADR-017), 4 vias de fechamento + retorno de foco.
// Nunca página externa no meio do dinheiro (spec §5.3).
//
// ANTI-FORJA: aqui só se CONFIRMA (booleans). Versão + timestamp + hash do
// material são carimbados pelo SERVIDOR dentro da tx do checkout (CKMOD).
// =============================================================================

import { useRef, useState } from 'react';
import { FileText, HeartPulse } from 'lucide-react';
import { Dialog } from '@leela/design-system/dialog';
import { Checkbox } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import type { PoliticaVendasPublica } from '@/lib/tipos';

/** Parágrafos da política de vendas em linguagem humana (RN-338/339/340/343/344). */
function paragrafosDaPolitica(p: PoliticaVendasPublica): string[] {
  const { reembolso, transferencia, trocaIngresso } = p;
  const linhas: string[] = [
    `Arrependimento e reembolso: você pode cancelar a compra com reembolso integral em até ${reembolso.janelaArrependimentoDias} dias corridos após o pagamento (CDC, Art. 49), desde que faltem mais de ${reembolso.corteHoras} horas para o evento.`,
    `Corte de segurança: pedidos de cancelamento feitos a menos de ${reembolso.corteHoras} horas do evento não são aceitos.`,
    `Fora da janela de arrependimento, o pedido de reembolso entra em análise do organizador, com resposta em até ${reembolso.slaAnaliseDias} dias.`,
    transferencia.habilitada
      ? `Transferência de inscrição para outro atleta: permitida até ${transferencia.janelaHoras} horas antes do evento${
          transferencia.taxa > 0
            ? `, mediante taxa de ${formatarPreco(transferencia.taxa)}`
            : ', sem custo'
        }.`
      : 'Este evento não permite transferência de inscrição para outra pessoa.',
    trocaIngresso.habilitada
      ? `Troca de ingresso (modalidade/kit): permitida até ${trocaIngresso.janelaHoras} horas antes do evento. ${
          trocaIngresso.permiteReembolsoDowngrade
            ? 'Troca para opção mais barata devolve a diferença.'
            : 'Troca para opção mais barata não gera reembolso da diferença.'
        }`
      : 'Este evento não permite troca de ingresso.',
    'O comprovante da compra e os ingressos são enviados ao e-mail do responsável pela inscrição. Os dados coletados são usados exclusivamente para a operação do evento (LGPD).',
  ];
  return linhas;
}

/** Texto do termo de responsabilidade de saúde (template Leela, padrão Sympla Sports). */
function paragrafosDoTermoSaude(eventoNome: string, organizadorNome: string | null): string[] {
  const organizacao =
    organizadorNome !== null && organizadorNome.length > 0
      ? `${organizadorNome} (organizador do evento)`
      : 'a organização do evento';
  return [
    `Declaro, para todos os fins, que estou em boas condições de saúde e apto(a) a participar do evento ${eventoNome}, atividade que envolve esforço físico.`,
    'Declaro que treinei adequadamente para a atividade e que não há qualquer recomendação médica que me impeça de praticar exercícios físicos.',
    `Assumo a responsabilidade por qualquer condição de saúde pré-existente não declarada, isentando ${organizacao} e a plataforma Leela de responsabilidade por incidentes decorrentes de condição que eu tenha omitido.`,
    'Estou ciente do regulamento da prova e das orientações de segurança, e me comprometo a segui-los durante todo o evento.',
    'Autorizo o atendimento médico de emergência em meu favor durante o evento, caso necessário.',
    'Esta declaração vale para todos os atletas deste pedido; ao aceitar em nome de terceiros, o responsável confirma ter obtido a concordância de cada um.',
  ];
}

/**
 * Bloco dos 2 aceites, acima do botão de pagar. `desabilitado` = prova já
 * registrada (cobrança criada) — o estado não pode mais mudar aqui.
 */
export function AceitesCompra({
  politica,
  termoSaudeVersao,
  eventoNome,
  organizadorNome,
  aceiteTermos,
  aceiteSaude,
  onAceiteTermos,
  onAceiteSaude,
  desabilitado = false,
}: {
  politica: PoliticaVendasPublica;
  termoSaudeVersao: number;
  eventoNome: string;
  organizadorNome: string | null;
  aceiteTermos: boolean;
  aceiteSaude: boolean;
  onAceiteTermos: (v: boolean) => void;
  onAceiteSaude: (v: boolean) => void;
  desabilitado?: boolean;
}): React.JSX.Element {
  const [modalTermos, setModalTermos] = useState(false);
  const [modalSaude, setModalSaude] = useState(false);
  const gatilhoTermosRef = useRef<HTMLButtonElement | null>(null);
  const gatilhoSaudeRef = useRef<HTMLButtonElement | null>(null);

  const linkClasse =
    'font-[var(--font-weight-semibold)] text-text-brand underline underline-offset-2 hover:opacity-80';

  return (
    <section
      aria-label="Aceites obrigatórios da compra"
      className="flex flex-col gap-3 rounded-ds-lg border border-border-subtle bg-surface-raised p-4 sm:p-5"
    >
      {/* (a) Termos da compra + política de cancelamento (resolve o A-1). */}
      <label className="flex cursor-pointer items-start gap-3 text-[length:var(--font-size-sm)] text-text-primary">
        <Checkbox
          checked={aceiteTermos}
          disabled={desabilitado}
          onChange={(e) => onAceiteTermos(e.target.checked)}
          aria-label="Li e aceito os termos da compra e a política de cancelamento deste evento"
        />
        <span>
          Li e aceito os <strong>termos da compra e a política de cancelamento</strong> deste
          evento.
        </span>
      </label>
      <button
        ref={gatilhoTermosRef}
        type="button"
        onClick={() => setModalTermos(true)}
        className={`self-start text-[length:var(--font-size-sm)] ${linkClasse}`}
      >
        Ler os termos da compra
      </button>

      {/* (b) Termo de responsabilidade de saúde — SEMPRE presente (§5.3b). */}
      <label className="mt-1 flex cursor-pointer items-start gap-3 text-[length:var(--font-size-sm)] text-text-primary">
        <Checkbox
          checked={aceiteSaude}
          disabled={desabilitado}
          onChange={(e) => onAceiteSaude(e.target.checked)}
          aria-label="Declaro que estou em boas condições de saúde e apto a participar deste evento, conforme o termo de responsabilidade"
        />
        <span>
          Declaro que estou em boas condições de saúde e apto(a) a participar deste evento,
          conforme o <strong>termo de responsabilidade</strong>.
        </span>
      </label>
      <button
        ref={gatilhoSaudeRef}
        type="button"
        onClick={() => setModalSaude(true)}
        className={`self-start text-[length:var(--font-size-sm)] ${linkClasse}`}
      >
        Ler o termo de responsabilidade de saúde
      </button>

      {/* Modal (a) — conteúdo da politicaVendas pública (defaults legais CDC
          quando o organizador não configurou). Padrão RegulamentoModal. */}
      <Dialog
        open={modalTermos}
        onOpenChange={setModalTermos}
        title="Termos da compra e política de cancelamento"
        titleIcon={
          <FileText size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
        }
        titleAs="h3"
        description={`Versão ${politica.versao} — vigente para as compras atuais.`}
        returnFocusRef={gatilhoTermosRef}
      >
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-text-secondary">
          {paragrafosDaPolitica(politica).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Dialog>

      {/* Modal (b) — template do produto (benchmark Sympla Sports). */}
      <Dialog
        open={modalSaude}
        onOpenChange={setModalSaude}
        title="Termo de responsabilidade de saúde"
        titleIcon={
          <HeartPulse
            size={20}
            strokeWidth={1.75}
            aria-hidden
            className="shrink-0 text-text-brand"
          />
        }
        titleAs="h3"
        description={`Versão ${termoSaudeVersao} — vigente para as inscrições atuais.`}
        returnFocusRef={gatilhoSaudeRef}
      >
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-text-secondary">
          {paragrafosDoTermoSaude(eventoNome, organizadorNome).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Dialog>
    </section>
  );
}

AceitesCompra.displayName = 'AceitesCompra';
