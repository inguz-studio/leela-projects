'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import QRCode from 'qrcode';
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

/** Texto do copia-e-cola exibido/copiado (payload PIX ou fallback do provider). */
export function payloadPix(charge: {
  qrCode?: string;
  paymentUrl?: string;
  chargeId: string;
}): string {
  return charge.qrCode ?? charge.paymentUrl ?? charge.chargeId;
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
 */
function useRestante(expiraEmMillis: number | undefined): number | null {
  const [agora, setAgora] = useState<number | null>(null);

  useEffect(() => {
    if (expiraEmMillis === undefined) return;
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiraEmMillis]);

  if (expiraEmMillis === undefined || agora === null) return null;
  return Math.max(0, expiraEmMillis - agora);
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
 * Botão de copiar do D-6: um clique copia a chave inteira (a pessoa nunca
 * precisa selecionar o payload na mão) e dispara o toast com o verbatim do
 * Vitor. O rótulo "Código copiado" continua como confirmação in-place para
 * quem não vê o toast (leitor de tela ouve o toast; o rótulo cobre o resto).
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
    void navigator.clipboard
      ?.writeText(codigo)
      .then(() => {
        setCopiado(true);
        toast({ title: 'A chave para pagamento foi copiada', variant: 'success' });
      })
      .catch(() => setCopiado(false));
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
  nota,
}: {
  /** Payload copia-e-cola da cobrança. */
  codigo: string;
  /** Expiração carimbada pelo SERVIDOR (epoch-ms). `undefined` = sem timer. */
  expiraEmMillis?: number | undefined;
  /** Disparado UMA vez quando a contagem zera (materializa no servidor). */
  onExpirar?: (() => void) | undefined;
  /** Ação de recomeçar com uma cobrança NOVA (RN-157: nunca reusa a mesma). */
  onNovaCobranca?: (() => void) | undefined;
  /** Expiração já conhecida pelo consumidor (ex.: servidor cancelou o pedido). */
  expirado?: boolean | undefined;
  /** Nota de contexto abaixo do bloco (difere por tela). */
  nota?: React.ReactNode;
}): React.JSX.Element {
  const restante = useRestante(expiraEmMillis);
  const expiradoPeloTimer = restante !== null && restante <= 0;
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
      <div
        role="status"
        className="flex flex-col gap-3 rounded-ds-lg border border-border-default bg-feedback-warning-surface p-4 sm:p-5"
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-ds-lg border border-border-subtle bg-surface-raised p-4 sm:p-5">
      <p className="text-sm font-medium text-text-primary">Escaneie o QR ou use o copia e cola</p>

      <PixQrCode payload={codigo} />

      {/* Timer só existe com carimbo do servidor — nunca contagem inventada. */}
      {restante !== null ? (
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
    </div>
  );
}
