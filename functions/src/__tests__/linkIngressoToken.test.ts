// =============================================================================
// functions/src/__tests__/linkIngressoToken.test.ts
//
// Unit do token `LLIP1` do link da página do ingresso (S1214-T1 · RN-419/420).
// Sem I/O, sem Emulator — só formato, assinatura e as duas separações que a
// review antagonista vai tentar falsificar (⚔ vetores 2, 4 e 5).
// =============================================================================

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import {
  VERSAO_LINK_INGRESSO,
  LINK_INGRESSO_MAX_CHARS,
  dominiosDeTokenSeparados,
  estadoMostraQr,
  parseLinkIngressoToken,
  codificarPayloadLinkIngresso,
  montarLinkIngressoToken,
} from '../../../packages/core/src/tickets/linkIngresso';
import {
  VERSAO_QR_TOKEN,
  parseQrToken,
  bytesParaBase64Url,
} from '../../../packages/core/src/eventos/qrToken';
import {
  assinarLinkIngresso,
  verificarLinkIngresso,
  materialAssinadoLinkIngresso,
} from '../eventos/linkIngresso';
import { assinarQrToken, carregarQrKeyring, type QrKeyring } from '../eventos/qrToken';
import { estadoDaPagina } from '../http/ingressoPorLink';

function keyring(kids: readonly string[], ativo?: string): QrKeyring {
  const chaves: Record<string, Buffer> = Object.create(null);
  for (const kid of kids) {
    // Segredo DETERMINÍSTICO por kid: o teste precisa que k1 assine hoje o
    // mesmo que assinaria depois de o ring ganhar k2.
    chaves[kid] = Buffer.alloc(32, kid.charCodeAt(0));
  }
  return { ativo: ativo ?? (kids[0] as string), chaves };
}

const PAYLOAD = { inscritoId: 'insc-1', eventoId: 'ev-1', tenantId: 'tn-1' };
const QR_VIGENTE = 'LLQR1.k1.eyJpIjoiaW5zYy0xIn0.YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY';

describe('separação de domínio LLIP1 × LLQR1 (RN-419 · ⚔ vetor 4)', () => {
  it('as duas constantes de versão são diferentes — e há guarda executável', () => {
    expect(VERSAO_LINK_INGRESSO).not.toBe(VERSAO_QR_TOKEN);
    expect(dominiosDeTokenSeparados()).toBe(true);
  });

  it('um `qrToken` LLQR1 não abre a página: o parser do link recusa', () => {
    const qr = assinarQrToken(PAYLOAD, keyring(['k1']));
    expect(parseQrToken(qr).ok).toBe(true); // é um QR legítimo…
    expect(parseLinkIngressoToken(qr).ok).toBe(false); // …e mesmo assim não abre
  });

  it('um token LLIP1 não passa no check-in: `parseQrToken` recusa', () => {
    const link = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, keyring(['k1']));
    expect(parseLinkIngressoToken(link).ok).toBe(true);
    expect(parseQrToken(link).ok).toBe(false);
  });

  it('trocar só a versão de um link válido para LLQR1 não o faz virar QR', () => {
    const ring = keyring(['k1']);
    const link = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, ring);
    const disfarcado = `${VERSAO_QR_TOKEN}${link.slice(VERSAO_LINK_INGRESSO.length)}`;
    // Parseia estruturalmente (o formato é irmão), mas a assinatura cobre a
    // versão — logo não verifica em nenhum dos dois domínios.
    expect(verificarLinkIngresso(disfarcado, QR_VIGENTE, ring).ok).toBe(false);
  });
});

describe('assinatura e verificação (RN-419)', () => {
  it('assina e verifica com o mesmo `qrToken` vigente', () => {
    const ring = keyring(['k1']);
    const token = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, ring);
    const v = verificarLinkIngresso(token, QR_VIGENTE, ring);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.payload).toEqual(PAYLOAD);
      expect(v.kid).toBe('k1');
    }
  });

  it('é determinístico: mesmo payload + mesma chave + mesmo qrToken ⇒ mesmo token', () => {
    const ring = keyring(['k1']);
    expect(assinarLinkIngresso(PAYLOAD, QR_VIGENTE, ring)).toBe(
      assinarLinkIngresso(PAYLOAD, QR_VIGENTE, ring)
    );
  });

  it('o token não carrega PII: só os três ids do payload mínimo', () => {
    const token = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, keyring(['k1']));
    const parsed = parseLinkIngressoToken(token);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(Object.keys(parsed.payload).sort()).toEqual([
        'eventoId',
        'inscritoId',
        'tenantId',
      ]);
    }
  });

  it.each([0, 1, 2, 3])('adulterar a parte %i recusa', (indice) => {
    const ring = keyring(['k1']);
    const partes = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, ring).split('.');
    const originais = [...partes];
    // Mutação que preserva o alfabeto base64url (senão o parse morreria por
    // formato e o teste não provaria nada sobre a assinatura).
    const alvo = originais[indice] as string;
    partes[indice] = alvo.startsWith('A') ? `B${alvo.slice(1)}` : `A${alvo.slice(1)}`;
    const v = verificarLinkIngresso(partes.join('.'), QR_VIGENTE, ring);
    expect(v.ok).toBe(false);
  });

  it('kid fora do ring recusa (revogação em massa — RN-420)', () => {
    const anelAntigo = keyring(['k1']);
    const token = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, anelAntigo);
    const anelSemK1 = keyring(['k2']);
    const v = verificarLinkIngresso(token, QR_VIGENTE, anelSemK1);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.causa).toBe('kid_desconhecido');
  });

  it('kid herdado de Object.prototype não resolve para membro herdado', () => {
    const ring = keyring(['k1']);
    for (const kid of ['constructor', 'toString', 'hasOwnProperty']) {
      const payloadB64 = codificarPayloadLinkIngresso(PAYLOAD);
      const forjado = montarLinkIngressoToken(kid, payloadB64, 'A'.repeat(43));
      const v = verificarLinkIngresso(forjado, QR_VIGENTE, ring);
      expect(v.ok).toBe(false);
    }
  });

  it('token acima do teto de caracteres recusa antes de qualquer crypto', () => {
    const gigante = `${VERSAO_LINK_INGRESSO}.k1.${'A'.repeat(LINK_INGRESSO_MAX_CHARS)}.AAAA`;
    expect(parseLinkIngressoToken(gigante).ok).toBe(false);
  });

  it.each([null, undefined, 42, {}, [], '', 'LLIP1', 'LLIP1.k1.AAAA'])(
    'entrada não-token (%p) recusa sem lançar',
    (entrada) => {
      expect(() =>
        verificarLinkIngresso(entrada, QR_VIGENTE, keyring(['k1']))
      ).not.toThrow();
      expect(verificarLinkIngresso(entrada, QR_VIGENTE, keyring(['k1'])).ok).toBe(false);
    }
  );
});

describe('binding ao `qrToken` vigente × rotação de chave (RN-420 · ⚔ vetor 5)', () => {
  it('ROTAÇÃO NÃO mata link emitido: k1 continua verificando depois de k2 virar ativo', () => {
    const anelAntes = keyring(['k1']);
    const token = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, anelAntes);
    // Rotação: k2 entra e vira ativo; k1 PERMANECE no ring.
    const anelDepois = keyring(['k1', 'k2'], 'k2');
    expect(verificarLinkIngresso(token, QR_VIGENTE, anelDepois).ok).toBe(true);
  });

  it('RE-EMITIR mata o link antigo: outro `qrToken` gravado ⇒ não verifica', () => {
    const ring = keyring(['k1']);
    const token = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, ring);
    const reemitido = `${QR_VIGENTE.slice(0, -1)}X`;
    const v = verificarLinkIngresso(token, reemitido, ring);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.causa).toBe('assinatura');
  });

  it('as duas propriedades são independentes: rotação preserva E re-emissão revoga', () => {
    const anelAntes = keyring(['k1']);
    const token = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, anelAntes);
    const anelDepois = keyring(['k1', 'k2'], 'k2');
    const reemitido = `${QR_VIGENTE.slice(0, -1)}X`;
    expect(verificarLinkIngresso(token, QR_VIGENTE, anelDepois).ok).toBe(true);
    expect(verificarLinkIngresso(token, reemitido, anelDepois).ok).toBe(false);
  });

  it('sem `qrToken` gravado não há binding: recusa com causa própria', () => {
    const ring = keyring(['k1']);
    const token = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, ring);
    for (const ausente of [null, undefined, '']) {
      const v = verificarLinkIngresso(token, ausente, ring);
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.causa).toBe('sem_ingresso');
    }
  });

  it('assinar sem `qrToken` vigente é ERRO, não caso degradado', () => {
    expect(() => assinarLinkIngresso(PAYLOAD, '', keyring(['k1']))).toThrow(
      /qrToken.*vigente/i
    );
  });

  it('o separador do material assinado impede ambiguidade de concatenação', () => {
    // Sem separador, "LLIP1.k1.AB" + "C" e "LLIP1.k1.A" + "BC" colidiriam.
    expect(materialAssinadoLinkIngresso('LLIP1.k1.AB', 'C')).not.toBe(
      materialAssinadoLinkIngresso('LLIP1.k1.A', 'BC')
    );
  });

  it('assinaturas de payloads diferentes não colidem (amostra aleatória)', () => {
    const ring = keyring(['k1']);
    const vistos = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const qr = `LLQR1.k1.x.${randomBytes(32).toString('base64url')}`;
      vistos.add(assinarLinkIngresso(PAYLOAD, qr, ring));
    }
    expect(vistos.size).toBe(50);
  });
});

describe('matriz de estados da página (RN-421)', () => {
  const base = {
    statusInscrito: 'confirmado',
    statusEvento: 'publicado',
    temQrToken: true,
    temCheckin: false,
  };

  it('confirmado com QR e sem check-in ⇒ valido (mostra QR)', () => {
    expect(estadoDaPagina(base)).toBe('valido');
    expect(estadoMostraQr('valido')).toBe(true);
  });

  it('confirmado com check-in ⇒ credenciado, e o QR CONTINUA visível', () => {
    expect(estadoDaPagina({ ...base, temCheckin: true })).toBe('credenciado');
    expect(estadoMostraQr('credenciado')).toBe(true);
  });

  it('confirmado sem qrToken ⇒ emitindo, sem QR (face da RN-382)', () => {
    expect(estadoDaPagina({ ...base, temQrToken: false })).toBe('emitindo');
    expect(estadoMostraQr('emitindo')).toBe(false);
  });

  it('pendente ⇒ pendente, sem QR', () => {
    expect(estadoDaPagina({ ...base, statusInscrito: 'pendente' })).toBe('pendente');
    expect(estadoMostraQr('pendente')).toBe(false);
  });

  it.each(['cancelado', 'estornado'] as const)(
    '%s ⇒ SEM QR, mesmo com token gravado e evento de pé (⚔ vetor 6)',
    (status) => {
      const estado = estadoDaPagina({ ...base, statusInscrito: status });
      expect(estado).toBe(status);
      expect(estadoMostraQr(estado)).toBe(false);
    }
  );

  it('cancelado vence evento encerrado — é o que aconteceu com o ingresso', () => {
    expect(
      estadoDaPagina({
        ...base,
        statusInscrito: 'cancelado',
        statusEvento: 'encerrado',
      })
    ).toBe('cancelado');
  });

  it('evento encerrado ⇒ histórico, sem QR', () => {
    const estado = estadoDaPagina({ ...base, statusEvento: 'encerrado' });
    expect(estado).toBe('encerrado');
    expect(estadoMostraQr(estado)).toBe(false);
  });

  it('só `valido` e `credenciado` mostram QR — nenhum outro estado', () => {
    const todos = [
      'valido',
      'credenciado',
      'emitindo',
      'pendente',
      'cancelado',
      'estornado',
      'encerrado',
    ] as const;
    expect(todos.filter((e) => estadoMostraQr(e))).toEqual(['valido', 'credenciado']);
  });
});

// ---------------------------------------------------------------------------
// ⚔ 3 — rotação REAL (review INGPAGE-REV, item 3 do brief)
//
// A suíte de integração prova rotação com `QrKeyring` montado à mão. Isso pula
// justamente a peça que o operador de verdade mexe no dia da virada:
// `QR_TOKEN_KEYS` + `QR_TOKEN_KID_ATIVO` no ambiente, lidos por
// `carregarQrKeyring`. Um ring montado à mão não pode reproduzir o erro que
// mais assusta numa rotação — trocar o kid ativo e descobrir que os links já
// enviados pararam de abrir. Aqui a cerimônia inteira roda pelo LOADER.
// ---------------------------------------------------------------------------

describe('⚔ 3 — a cerimônia de rotação, pelo carregador de verdade', () => {
  const SEGREDO_K1 = bytesParaBase64Url(new Uint8Array(randomBytes(32)));
  const SEGREDO_K2 = bytesParaBase64Url(new Uint8Array(randomBytes(32)));
  const PAYLOAD = { inscritoId: 'insc-1', eventoId: 'ev-1', tenantId: 'ten-1' };
  const QR_VIGENTE = 'LLQR1.k1.payload.assinatura';

  /** Passo 1 da rotação: só k1 no ring, k1 ativo. */
  const ENV_ANTES = {
    QR_TOKEN_KEYS: JSON.stringify({ k1: SEGREDO_K1 }),
    QR_TOKEN_KID_ATIVO: 'k1',
  };
  /** Passo 2: k2 ENTRA e vira ativo; k1 permanece (verificação aceita os dois). */
  const ENV_ROTACIONADO = {
    QR_TOKEN_KEYS: JSON.stringify({ k1: SEGREDO_K1, k2: SEGREDO_K2 }),
    QR_TOKEN_KID_ATIVO: 'k2',
  };
  /** Passo 3: k1 SAI do ring — a alavanca de revogação em massa. */
  const ENV_REVOGADO = {
    QR_TOKEN_KEYS: JSON.stringify({ k2: SEGREDO_K2 }),
    QR_TOKEN_KID_ATIVO: 'k2',
  };

  it('trocar QR_TOKEN_KID_ATIVO NÃO mata o link já enviado (RN-420, prop. 1)', () => {
    const antes = carregarQrKeyring(ENV_ANTES) as QrKeyring;
    const link = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, antes);
    expect(link.startsWith('LLIP1.k1.')).toBe(true);

    // O operador roda a virada. O link da caixa de entrada de alguém continua.
    const depois = carregarQrKeyring(ENV_ROTACIONADO) as QrKeyring;
    expect(depois.ativo).toBe('k2');
    expect(verificarLinkIngresso(link, QR_VIGENTE, depois).ok).toBe(true);
  });

  it('depois da virada, link NOVO sai assinado com o kid novo', () => {
    const depois = carregarQrKeyring(ENV_ROTACIONADO) as QrKeyring;
    const novo = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, depois);
    expect(novo.startsWith('LLIP1.k2.')).toBe(true);
    expect(verificarLinkIngresso(novo, QR_VIGENTE, depois).ok).toBe(true);
  });

  it('tirar k1 do ring REVOGA em massa o que k1 assinou (RN-420, prop. 2)', () => {
    const antes = carregarQrKeyring(ENV_ANTES) as QrKeyring;
    const linkAntigo = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, antes);

    const revogado = carregarQrKeyring(ENV_REVOGADO) as QrKeyring;
    const r = verificarLinkIngresso(linkAntigo, QR_VIGENTE, revogado);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.causa).toBe('kid_desconhecido');

    // …e o que k2 assinou sobrevive à mesma remoção.
    const linkNovo = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, revogado);
    expect(verificarLinkIngresso(linkNovo, QR_VIGENTE, revogado).ok).toBe(true);
  });

  it('as três propriedades são INDEPENDENTES: re-emissão mata sem tocar no ring', () => {
    const ring = carregarQrKeyring(ENV_ROTACIONADO) as QrKeyring;
    const link = assinarLinkIngresso(PAYLOAD, QR_VIGENTE, ring);
    expect(verificarLinkIngresso(link, QR_VIGENTE, ring).ok).toBe(true);

    // Re-emissão troca o `qrToken` gravado. MESMO ring, MESMO kid ativo.
    const r = verificarLinkIngresso(link, 'LLQR1.k2.outro.token', ring);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.causa).toBe('assinatura');
  });
});
