'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import QRCode from 'qrcode';
import { Card } from '@leela/design-system/server';
import { Button, useToast } from '@/app/_ds/ds';

// =============================================================================
// PixCobranca — o bloco vivo de uma cobrança PIX (S1209-T2 · D-6 · RN-157).
//
// Por que é um componente só: o QR e o copia-e-cola valem ENQUANTO o PIX está
// pendente, e isso acontece em DUAS telas — a de pagamento e a do pedido
// pendente. Duas cópias do bloco seriam dois relógios, e um deles mentiria.
// Aqui a mesma peça é montada nas duas, com a MESMA fonte de verdade: o
// `pixExpiraEmMillis` carimbado pelo SERVIDOR na criação da cobrança.
//
// Reuso: o QR (lib `qrcode`, a mesma do ingresso) e o botão de copiar vieram
// do A-3, que já vivia em StepPagamento — não foram reescritos, foram movidos
// para cá e ganharam o timer + o toast.
//
// Honestidade do relógio (o ponto caro desta task):
//   - sem `expiraEmMillis` (servidor antigo / provider que não devolve), NÃO
//     se inventa contagem: o bloco aparece sem timer. Um cronômetro fabricado
//     no cliente cancelaria a tela de um PIX ainda válido, ou pior, mostraria
//     um PIX morto como vivo.
//   - quando zera, o QR e o copia-e-cola SOMEM (a cobrança não vale mais) e o
//     consumidor é avisado por `onExpirar` para materializar a expiração no
//     servidor (`expirarPixPendente`) — o servidor confere o próprio relógio;
//     se a UI chamar antes da hora ele recusa. A tela nunca decide sozinha.
//   - o relógio da máquina do comprador pode estar errado; por isso a decisão
//     final é sempre do servidor e o retry é uma cobrança NOVA, nunca a mesma.
// =============================================================================

/**
 * Texto do copia-e-cola exibido/copiado — o payload PIX do provider, ou a URL
 * de pagamento quando é o que ele devolve.
 *
 * S1209-REV: NÃO cai mais no `chargeId`. O id da cobrança é um identificador
 * INTERNO; colocá-lo no lugar do copia-e-cola fazia a tela oferecer para cópia
 * uma string que nenhum banco aceita — e o toast dizer "a chave para pagamento
 * foi copiada" sobre ela. Sem payload, a resposta honesta é `''`, e o bloco
 * mostra o estado de código indisponível em vez de fabricar uma chave.
 */
export function payloadPix(charge: {
  qrCode?: string;
  paymentUrl?: string;
  chargeId: string;
}): string {
  return charge.qrCode ?? charge.paymentUrl ?? '';
}

/** `mm:ss` a partir de milissegundos restantes (nunca negativo). */
export function formatarContagem(restanteMs: number): string {
  const total = Math.max(0, Math.ceil(restanteMs / 1000));
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

/**
 * Milissegundos restantes até `expiraEmMillis`. `null` = não há contagem
 * (sem carimbo do servidor, ou ainda no primeiro paint do cliente — o relógio
 * só entra depois da montagem, para não divergir do HTML do servidor).
 *
 * S1209-PIXBE-T5 (fecha o achado #6 da review): `desvioRelogioMs` é a
 * diferença medida entre o relógio do SERVIDOR e o deste aparelho no
 * instante da cobrança. `expiraEmMillis` sempre foi carimbado pelo servidor;
 * o que faltava era o outro lado da subtração vir da MESMA fonte. Somando o
 * desvio, a contagem passa a ser a duração real da janela: aparelho 40 min
 * atrasado deixa de exibir 70:00 de uma cobrança de 30, e adiantado deixa de
 * zerar um PIX que ainda vale.
 *
 * O `setInterval` continua no relógio local — de propósito. Depois de
 * ancorada, a contagem só precisa MEDIR PASSAGEM DE TEMPO, e para isso o
 * relógio do aparelho serve: quem estava errado era o ponto de partida, não
 * o ritmo do segundo.
 */
function useRestante(
  expiraEmMillis: number | undefined,
  desvioRelogioMs: number
): number | null {
  const [agora, setAgora] = useState<number | null>(null);

  useEffect(() => {
    if (expiraEmMillis === undefined) return;
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiraEmMillis]);

  if (expiraEmMillis === undefined || agora === null) return null;
  return Math.max(0, expiraEmMillis - (agora + desvioRelogioMs));
}

/** QR escaneável do payload (falha de encode cai em silêncio — o texto serve). */
function PixQrCode({ payload }: { payload: string }): React.JSX.Element | null {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    QRCode.toDataURL(payload, { width: 200, margin: 1 })
      .then((url) => {
        if (!cancelado) setQr(url);
      })
      .catch(() => {
        if (!cancelado) setQr(null);
      });
    return () => {
      cancelado = true;
    };
  }, [payload]);

  if (qr === null) return null;
  return (
    <div className="flex justify-center">
      <div className="rounded-ds-md bg-surface-base p-3">
        <img src={qr} alt="QR Code para pagamento via PIX" className="h-44 w-44 object-contain" />
      </div>
    </div>
  );
}

/**
 * Aviso quando a cópia não acontece (S1209-REV). O botão vive na tela do
 * dinheiro: clique sem resposta nenhuma é o pior desfecho, porque a pessoa
 * acha que a chave está na área de transferência e cola outra coisa no banco.
 */
const COPIA_FALHOU = 'Não conseguimos copiar. Selecione o código acima e copie manualmente.';

/**
 * Fallback de cópia para contexto SEM Clipboard API (origem http do preview,
 * WebView antiga de app de banco). Devolve `false` quando nem isso existe —
 * aí quem avisa a pessoa é o toast, não o silêncio.
 */
function copiaDeFallback(texto: string): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;
  const area = document.createElement('textarea');
  area.value = texto;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

/** `true` só quando a chave REALMENTE foi para a área de transferência. */
function copiarChave(texto: string): Promise<boolean> {
  const api = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
  if (api !== undefined && typeof api.writeText === 'function') {
    return api.writeText(texto).then(
      () => true,
      () => copiaDeFallback(texto),
    );
  }
  return Promise.resolve(copiaDeFallback(texto));
}

/**
 * Botão de copiar do D-6: um clique copia a chave inteira (a pessoa nunca
 * precisa selecionar o payload na mão) e dispara o toast com o verbatim do
 * Vitor. O rótulo "Código copiado" continua como confirmação in-place para
 * quem não vê o toast (leitor de tela ouve o toast; o rótulo cobre o resto).
 *
 * S1209-REV: o toast de sucesso só sai quando a cópia CONFIRMA. Falha (sem
 * API, permissão negada, WebView) devolve um toast de erro com a saída manual
 * — antes o clique morria em silêncio e a pessoa ficava sem chave e sem aviso.
 */
function CopiarChavePix({ codigo }: { codigo: string }): React.JSX.Element {
  const [copiado, setCopiado] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(t);
  }, [copiado]);

  const copiar = (): void => {
    void copiarChave(codigo).then((ok) => {
      setCopiado(ok);
      toast(
        ok
          ? { title: 'A chave para pagamento foi copiada', variant: 'success' }
          : { title: COPIA_FALHOU, variant: 'danger' },
      );
    });
  };

  return (
    <Button variant="secondary" size="sm" onClick={copiar}>
      {copiado ? (
        <Check size={16} strokeWidth={2} aria-hidden className="mr-1.5" />
      ) : (
        <Copy size={16} strokeWidth={2} aria-hidden className="mr-1.5" />
      )}
      {copiado ? 'Código copiado' : 'Copiar código'}
    </Button>
  );
}

export function PixCobranca({
  codigo,
  expiraEmMillis,
  onExpirar,
  onNovaCobranca,
  expirado: expiradoExterno = false,
  vivoPeloServidor = false,
  desvioRelogioMs = 0,
  nota,
}: {
  /** Payload copia-e-cola da cobrança. `''` = o provider não devolveu chave. */
  codigo: string;
  /** Expiração carimbada pelo SERVIDOR (epoch-ms). `undefined` = sem timer. */
  expiraEmMillis?: number | undefined;
  /** Disparado UMA vez quando a contagem zera (materializa no servidor). */
  onExpirar?: (() => void) | undefined;
  /** Ação de recomeçar com uma cobrança NOVA (RN-157: nunca reusa a mesma). */
  onNovaCobranca?: (() => void) | undefined;
  /** Expiração já conhecida pelo consumidor (ex.: servidor cancelou o pedido). */
  expirado?: boolean | undefined;
  /**
   * S1209-REV: o SERVIDOR recusou a expiração (`failed-precondition`) — a
   * cobrança está viva e quem errou foi o relógio deste dispositivo. O
   * veredito do servidor SUPERA a contagem local: o bloco volta a mostrar a
   * chave e a contagem some (00:00 seria a mentira do relógio errado).
   */
  vivoPeloServidor?: boolean | undefined;
  /**
   * S1209-PIXBE-T5: relógio do SERVIDOR menos o relógio deste aparelho,
   * medido no instante da cobrança (`servidorAgoraMillis` da resposta). É o
   * que ancora a contagem no mesmo relógio que carimbou a expiração —
   * default 0 = comportamento vigente (servidor antigo sem o campo).
   */
  desvioRelogioMs?: number | undefined;
  /** Nota de contexto abaixo do bloco (difere por tela). */
  nota?: React.ReactNode;
}): React.JSX.Element {
  const restante = useRestante(expiraEmMillis, desvioRelogioMs);
  const expiradoPeloTimer = !vivoPeloServidor && restante !== null && restante <= 0;
  const expirado = expiradoExterno || expiradoPeloTimer;

  // Avisa o consumidor UMA vez — o efeito depende do booleano, não do tempo,
  // então não re-dispara a cada tique.
  const avisar = useCallback(() => {
    if (expiradoPeloTimer) onExpirar?.();
  }, [expiradoPeloTimer, onExpirar]);
  useEffect(() => {
    avisar();
  }, [avisar]);

  if (expirado) {
    return (
      <Card
        role="status"
        className="flex flex-col gap-3 bg-feedback-warning-surface p-4 sm:p-5"
      >
        <p className="text-sm font-semibold text-feedback-warning-fg">Código PIX expirado</p>
        <p className="text-sm text-text-primary">
          A cobrança valia por 30 minutos e o prazo terminou. Nada foi cobrado de você — para
          continuar, gere uma cobrança nova com um código novo.
        </p>
        {onNovaCobranca ? (
          <div>
            <Button variant="secondary" size="sm" onClick={onNovaCobranca}>
              Gerar nova cobrança
            </Button>
          </div>
        ) : null}
      </Card>
    );
  }

  // S1209-REV: cobrança criada, mas o provider não devolveu copia-e-cola nem
  // URL. Sem chave não há o que escanear nem o que copiar — e o id interno da
  // cobrança JAMAIS ocupa esse lugar (era o que o fallback antigo fazia).
  if (codigo.length === 0) {
    return (
      <Card
        role="status"
        className="flex flex-col gap-3 bg-feedback-warning-surface p-4 sm:p-5"
      >
        <p className="text-sm font-semibold text-feedback-warning-fg">Código PIX indisponível</p>
        <p className="text-sm text-text-primary">
          A cobrança foi aberta, mas o código de pagamento não chegou. Nada foi cobrado de você —
          gere uma cobrança nova para receber um código novo.
        </p>
        {onNovaCobranca ? (
          <div>
            <Button variant="secondary" size="sm" onClick={onNovaCobranca}>
              Gerar nova cobrança
            </Button>
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 border-border-subtle p-4 sm:p-5">
      <p className="text-sm font-medium text-text-primary">Escaneie o QR ou use o copia e cola</p>

      <PixQrCode payload={codigo} />

      {/* Timer só existe com carimbo do servidor — nunca contagem inventada.
          E some quando o servidor já provou que este relógio está errado. */}
      {vivoPeloServidor ? (
        <p role="status" className="text-center text-sm text-text-secondary">
          Esta cobrança continua válida. O prazo é conferido pelo servidor.
        </p>
      ) : restante !== null ? (
        <p
          role="timer"
          aria-live="off"
          className="text-center text-sm text-text-secondary"
          data-testid="pix-timer"
        >
          Este código expira em{' '}
          <span className="font-mono font-semibold text-text-primary">
            {formatarContagem(restante)}
          </span>
        </p>
      ) : null}

      <p className="break-all rounded-ds-md bg-surface-sunken px-3 py-2 font-mono text-xs text-text-secondary">
        {codigo}
      </p>

      <div>
        <CopiarChavePix codigo={codigo} />
      </div>

      {nota}
    </Card>
  );
}
