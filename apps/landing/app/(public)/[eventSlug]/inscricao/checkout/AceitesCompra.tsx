'use client';

// =============================================================================
// AceitesCompra — os DOIS aceites obrigatórios do passo de pagamento
// (LEELA-CKFORM · spec CHECKOUT-UX §5.3, ratificada 2026-07-18):
//   (a) termos da compra + política de cancelamento — texto renderizado da
//       `politicaVendas` PÚBLICA do leitor (defaults legais CDC Art. 49
//       quando o organizador não configurou), versão vigente exibida;
//   (b) termo de responsabilidade de saúde — template do PRODUTO, versão
//       vigente exibida (`termoSaudeVersao` do leitor). SEMPRE presente, todo
//       evento (decisão CKMOD: declaração de aptidão = aceite; PAR-Q/atestado
//       das flags de exigenciasSaude são superfície FUTURA — D-7).
//
// VOCABULÁRIO (D-0802-1, rodada 2026-08-02 · task C1-LEGAL): este texto era
// modelado no "Termo do Atleta" da Sympla Sports. O benchmark CAIU — a Sympla
// Sports é plataforma de corrida e a Leela é hub de EXPERIÊNCIAS de bem-estar
// (wellness, clubes, retiros). "Participante" e "experiência" são os termos
// guarda-chuva que a PLATAFORMA emite; corrida, prova e atleta são instâncias
// de um evento, nunca a categoria do produto. O conteúdo que o ORGANIZADOR
// escreve (nome, descrição, distâncias, regulamento) segue intocado.
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
import { Card } from '@leela/design-system/server';
import { CheckboxField } from '@/app/_ds/ds';
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
      ? `Transferência de inscrição para outro participante: permitida até ${transferencia.janelaHoras} horas antes do evento${
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

/** Texto do termo de responsabilidade de saúde (template Leela; vocabulário de participante — D-0802-1). */
function paragrafosDoTermoSaude(eventoNome: string, organizadorNome: string | null): string[] {
  const organizacao =
    organizadorNome !== null && organizadorNome.length > 0
      ? `${organizadorNome} (organizador do evento)`
      : 'a organização do evento';
  return [
    `Declaro, para todos os fins, que estou em boas condições de saúde e apto(a) a participar do evento ${eventoNome}, atividade que pode envolver esforço físico.`,
    'Declaro que me preparei adequadamente para a atividade e que não há qualquer recomendação médica que me impeça de participar dela.',
    `Assumo a responsabilidade por qualquer condição de saúde pré-existente não declarada, isentando ${organizacao} e a plataforma Leela de responsabilidade por incidentes decorrentes de condição que eu tenha omitido.`,
    'Estou ciente do regulamento da experiência e das orientações de segurança, e me comprometo a segui-los durante todo o evento.',
    'Autorizo o atendimento médico de emergência em meu favor durante o evento, caso necessário.',
    'Esta declaração vale para todos os participantes deste pedido; ao aceitar em nome de terceiros, o responsável confirma ter obtido a concordância de cada um.',
  ];
}

/**
 * Bloco dos 2 aceites, acima do botão de pagar. `desabilitado` = prova já
 * registrada (cobrança criada) — o estado não pode mais mudar aqui.
 */
export function AceitesCompra({
  politica,
  termoSaudeVersao,
  termoSaudeCustom = null,
  eventoNome,
  organizadorNome,
  aceiteTermos,
  aceiteSaude,
  aceiteSaudeCustom = false,
  onAceiteTermos,
  onAceiteSaude,
  onAceiteSaudeCustom,
  desabilitado = false,
}: {
  politica: PoliticaVendasPublica;
  termoSaudeVersao: number;
  /**
   * S1217-T3 · RN-441 — termo de saúde PRÓPRIO do organizador (aditivo ao
   * base). `null` = evento sem termo custom ativo, e o bloco fica com dois
   * aceites. O leitor público já projetava texto e versão desde a CK2; o que
   * faltava era a tela COLHER a confirmação que o servidor já exigia.
   */
  termoSaudeCustom?: { texto: string; versao: number } | null;
  eventoNome: string;
  organizadorNome: string | null;
  aceiteTermos: boolean;
  aceiteSaude: boolean;
  aceiteSaudeCustom?: boolean;
  onAceiteTermos: (v: boolean) => void;
  onAceiteSaude: (v: boolean) => void;
  onAceiteSaudeCustom?: (v: boolean) => void;
  desabilitado?: boolean;
}): React.JSX.Element {
  const [modalTermos, setModalTermos] = useState(false);
  const [modalSaude, setModalSaude] = useState(false);
  const [modalSaudeCustom, setModalSaudeCustom] = useState(false);
  const gatilhoTermosRef = useRef<HTMLButtonElement | null>(null);
  const gatilhoSaudeRef = useRef<HTMLButtonElement | null>(null);
  const gatilhoSaudeCustomRef = useRef<HTMLButtonElement | null>(null);

  const linkClasse =
    'font-[var(--font-weight-semibold)] text-text-brand underline underline-offset-2 hover:opacity-80';

  return (
    // Onda 1 do cânone: superfície do `Card` do DS, não reescrita à mão.
    // `role="region"` + nome acessível reproduz EXATAMENTE o que o
    // `<section aria-label>` computava — o `Card` renderiza `<div>`, e um div
    // com aria-label e sem role não é landmark nenhum.
    <Card
      role="region"
      aria-label="Aceites obrigatórios da compra"
      className="flex flex-col gap-3 border-border-subtle p-4 sm:p-5"
    >
      {/* (a) Termos da compra + política de cancelamento (resolve o A-1). */}
      <CheckboxField
        checked={aceiteTermos}
        disabled={desabilitado}
        onChange={(e) => onAceiteTermos(e.target.checked)}
        label={
          <>
            Li e aceito os <strong>termos da compra e a política de cancelamento</strong> deste
            evento.
          </>
        }
      />
      <button
        ref={gatilhoTermosRef}
        type="button"
        onClick={() => setModalTermos(true)}
        className={`self-start text-[length:var(--font-size-sm)] ${linkClasse}`}
      >
        Ler os termos da compra
      </button>

      {/* (b) Termo de responsabilidade de saúde — SEMPRE presente (§5.3b). */}
      <CheckboxField
        className="mt-1"
        checked={aceiteSaude}
        disabled={desabilitado}
        onChange={(e) => onAceiteSaude(e.target.checked)}
        label={
          <>
            Declaro que estou em boas condições de saúde e apto(a) a participar deste evento,
            conforme o <strong>termo de responsabilidade</strong>.
          </>
        }
      />
      <button
        ref={gatilhoSaudeRef}
        type="button"
        onClick={() => setModalSaude(true)}
        className={`self-start text-[length:var(--font-size-sm)] ${linkClasse}`}
      >
        Ler o termo de responsabilidade de saúde
      </button>

      {/* (c) S1217-T3 · RN-441 — termo de saúde PRÓPRIO do organizador, só nos
          eventos que o tenham ativo. Fecha um defeito vivo: o servidor já
          lançava `failed-precondition` quando o evento tinha termo custom e o
          input não trazia `saudeCustom === true`, e a tela nunca coletou nem
          enviou esse campo — todo evento com termo próprio estava com a compra
          quebrada, sempre, por construção. Mesmo padrão de modal e de versão
          dos outros dois. */}
      {termoSaudeCustom !== null ? (
        <>
          <CheckboxField
            className="mt-1"
            checked={aceiteSaudeCustom}
            disabled={desabilitado}
            onChange={(e) => onAceiteSaudeCustom?.(e.target.checked)}
            label={
              <>
                Li e aceito o <strong>termo de saúde específico deste evento</strong>, definido
                pelo organizador.
              </>
            }
          />
          <button
            ref={gatilhoSaudeCustomRef}
            type="button"
            onClick={() => setModalSaudeCustom(true)}
            className={`self-start text-[length:var(--font-size-sm)] ${linkClasse}`}
          >
            Ler o termo de saúde do evento
          </button>
        </>
      ) : null}

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

      {/* Modal (b) — template do produto, vocabulário de participante (D-0802-1). */}
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

      {/* Modal (c) — texto do ORGANIZADOR, renderizado como veio. O
          vocabulário da D-0802-1 governa o que a PLATAFORMA escreve; o que o
          organizador escreveu atravessa intacto. */}
      {termoSaudeCustom !== null ? (
        <Dialog
          open={modalSaudeCustom}
          onOpenChange={setModalSaudeCustom}
          title="Termo de saúde do evento"
          titleIcon={
            <HeartPulse
              size={20}
              strokeWidth={1.75}
              aria-hidden
              className="shrink-0 text-text-brand"
            />
          }
          titleAs="h3"
          description={`Versão ${termoSaudeCustom.versao} — definida pelo organizador.`}
          returnFocusRef={gatilhoSaudeCustomRef}
        >
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-text-secondary">
            {termoSaudeCustom.texto
              .split(/\n{2,}|\n/)
              .map((p) => p.trim())
              .filter((p) => p.length > 0)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
        </Dialog>
      ) : null}
    </Card>
  );
}

AceitesCompra.displayName = 'AceitesCompra';
