/**
 * qrToken.test.ts — LEELA-S208-T3 (RN-221/222)
 *
 * Unit PURO (SEM Emulator): formato assinado do qrToken, verificação
 * HMAC-SHA256 server-side, keyring/rotação e a decisão pura de check-in.
 *
 * Cobertura de ameaças (threat model Schneier — FABLE-C-T1-REPORT):
 *   - forja sem segredo / segredo errado → rejeita (assinatura)
 *   - payload adulterado (troca de inscrito/evento/tenant) → rejeita
 *   - versão/estrutura/kid adulterados → rejeita (assinatura cobre tudo)
 *   - rotação: kid antigo continua verificável; kid removido → rejeita
 *   - QR de outro evento/tenant, replay, cancelado → causas DISTINTAS
 *   - config inválida → erro alto (nunca degradar silenciosamente)
 */
import { describe, expect, it } from 'vitest';
import {
  base64UrlParaBytes,
  bytesParaBase64Url,
  bytesUtf8ParaTexto,
  classificarCheckinQr,
  codificarPayloadQr,
  parseQrToken,
  serializarPayloadQr,
  textoParaBytesUtf8,
  VERSAO_QR_TOKEN,
  type QrTokenPayload,
} from '../../../packages/core/src/eventos/qrToken';
import {
  assinarQrToken,
  carregarQrKeyring,
  verificarQrToken,
  type QrKeyring,
} from '../eventos/qrToken';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SEGREDO_K1 = Buffer.alloc(32, 7);
const SEGREDO_K2 = Buffer.alloc(32, 42);

const RING_K1: QrKeyring = { ativo: 'k1', chaves: { k1: SEGREDO_K1 } };
const RING_ROTACIONADO: QrKeyring = {
  ativo: 'k2',
  chaves: { k1: SEGREDO_K1, k2: SEGREDO_K2 },
};

const PAYLOAD: QrTokenPayload = {
  inscritoId: 'insc-0001',
  eventoId: 'meia-floripa-2026',
  tenantId: 'castelo-producoes',
};

// ---------------------------------------------------------------------------
// base64url + UTF-8 portáveis
// ---------------------------------------------------------------------------

describe('base64url/utf8 portáveis', () => {
  it('roundtrip bytes ↔ base64url bate com o Buffer do Node', () => {
    for (const len of [0, 1, 2, 3, 31, 32, 33, 100]) {
      const bytes = new Uint8Array(Array.from({ length: len }, (_, i) => (i * 37) % 256));
      const b64 = bytesParaBase64Url(bytes);
      expect(b64).toBe(Buffer.from(bytes).toString('base64url'));
      expect(base64UrlParaBytes(b64)).toEqual(bytes);
    }
  });

  it('rejeita base64url malformado (charset, resto 1)', () => {
    expect(base64UrlParaBytes('ab+/')).toBeNull(); // alfabeto base64 clássico
    expect(base64UrlParaBytes('abcde')).toBeNull(); // length % 4 === 1
    expect(base64UrlParaBytes('ab=')).toBeNull(); // padding não faz parte
  });

  it('roundtrip UTF-8 inclusive não-ASCII', () => {
    for (const texto of ['insc-0001', 'São Paulo', 'maratona-🏃-21k', '']) {
      const bytes = textoParaBytesUtf8(texto);
      expect(Buffer.from(bytes)).toEqual(Buffer.from(texto, 'utf8'));
      expect(bytesUtf8ParaTexto(bytes)).toBe(texto);
    }
  });

  it('rejeita sequência UTF-8 inválida (fail-closed)', () => {
    expect(bytesUtf8ParaTexto(new Uint8Array([0xff]))).toBeNull();
    expect(bytesUtf8ParaTexto(new Uint8Array([0xc3]))).toBeNull(); // truncada
    expect(bytesUtf8ParaTexto(new Uint8Array([0xe0, 0x20, 0x20]))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Assinar → verificar (caminho feliz + determinismo)
// ---------------------------------------------------------------------------

describe('assinarQrToken / verificarQrToken', () => {
  it('roundtrip: token emitido verifica e devolve o payload exato', () => {
    const token = assinarQrToken(PAYLOAD, RING_K1);
    const resultado = verificarQrToken(token, RING_K1);
    expect(resultado).toEqual({ ok: true, payload: PAYLOAD, kid: 'k1' });
  });

  it('é determinístico (mesmo payload + chave ⇒ mesmo token — seed idempotente)', () => {
    expect(assinarQrToken(PAYLOAD, RING_K1)).toBe(assinarQrToken(PAYLOAD, RING_K1));
  });

  it('serialização canônica tem ordem fixa i→e→t', () => {
    expect(serializarPayloadQr(PAYLOAD)).toBe(
      '{"i":"insc-0001","e":"meia-floripa-2026","t":"castelo-producoes"}'
    );
  });

  it('token tem o shape LLQR1.<kid>.<payload>.<sig> e cabe num QR', () => {
    const token = assinarQrToken(PAYLOAD, RING_K1);
    const partes = token.split('.');
    expect(partes).toHaveLength(4);
    expect(partes[0]).toBe(VERSAO_QR_TOKEN);
    expect(partes[1]).toBe('k1');
    expect(token.length).toBeLessThan(256);
  });
});

// ---------------------------------------------------------------------------
// Ameaças: forja, adulteração, downgrade, substituição
// ---------------------------------------------------------------------------

describe('verificarQrToken — rejeições', () => {
  it('segredo errado (forja sem a chave do servidor) → assinatura', () => {
    const forjado = assinarQrToken(PAYLOAD, {
      ativo: 'k1',
      chaves: { k1: Buffer.alloc(32, 99) }, // atacante com chave própria
    });
    expect(verificarQrToken(forjado, RING_K1)).toEqual({
      ok: false,
      causa: 'assinatura',
    });
  });

  it('payload adulterado (troca de inscrito) → assinatura', () => {
    const token = assinarQrToken(PAYLOAD, RING_K1);
    const [v, kid, , sig] = token.split('.') as [string, string, string, string];
    const payloadForjado = codificarPayloadQr({
      ...PAYLOAD,
      inscritoId: 'insc-0453', // tenta virar outro atleta
    });
    const adulterado = `${v}.${kid}.${payloadForjado}.${sig}`;
    expect(verificarQrToken(adulterado, RING_K1)).toEqual({
      ok: false,
      causa: 'assinatura',
    });
  });

  it('assinatura truncada/trocada → formato ou assinatura (nunca ok)', () => {
    const token = assinarQrToken(PAYLOAD, RING_K1);
    const partes = token.split('.') as [string, string, string, string];
    const sigOutra = bytesParaBase64Url(new Uint8Array(32).fill(1));
    expect(
      verificarQrToken(`${partes[0]}.${partes[1]}.${partes[2]}.${sigOutra}`, RING_K1)
    ).toEqual({ ok: false, causa: 'assinatura' });
    expect(
      verificarQrToken(`${partes[0]}.${partes[1]}.${partes[2]}.abc`, RING_K1).ok
    ).toBe(false); // 3 bytes ≠ 32 — barrado no parse (formato)
  });

  it('kid adulterado quebra a assinatura; kid desconhecido → kid_desconhecido', () => {
    const token = assinarQrToken(PAYLOAD, RING_ROTACIONADO); // assinado por k2
    const comK1 = token.replace('.k2.', '.k1.'); // kid existe mas não assinou
    expect(verificarQrToken(comK1, RING_ROTACIONADO)).toEqual({
      ok: false,
      causa: 'assinatura',
    });
    const comKx = token.replace('.k2.', '.kx.');
    expect(verificarQrToken(comKx, RING_ROTACIONADO)).toEqual({
      ok: false,
      causa: 'kid_desconhecido',
    });
  });

  it('versão desconhecida (downgrade) e estrutura inválida → formato', () => {
    const token = assinarQrToken(PAYLOAD, RING_K1);
    expect(verificarQrToken(token.replace('LLQR1', 'LLQR0'), RING_K1)).toEqual({
      ok: false,
      causa: 'formato',
    });
    for (const invalido of [
      '',
      'a.b.c', // 3 partes
      'a.b.c.d.e', // 5 partes
      `LLQR1.k1.${'A'.repeat(600)}.sig`, // acima do teto
      42,
      null,
      undefined,
      { token: 'x' },
    ]) {
      expect(verificarQrToken(invalido, RING_K1)).toEqual({
        ok: false,
        causa: 'formato',
      });
    }
  });

  it('payload não-JSON ou sem campos obrigatórios → formato', () => {
    const sig = bytesParaBase64Url(new Uint8Array(32));
    const naoJson = bytesParaBase64Url(textoParaBytesUtf8('não é json'));
    expect(parseQrToken(`LLQR1.k1.${naoJson}.${sig}`).ok).toBe(false);
    const semCampo = bytesParaBase64Url(
      textoParaBytesUtf8('{"i":"insc-0001","e":"meia-floripa-2026"}')
    );
    expect(parseQrToken(`LLQR1.k1.${semCampo}.${sig}`).ok).toBe(false);
    const campoVazio = bytesParaBase64Url(
      textoParaBytesUtf8('{"i":"","e":"ev","t":"tn"}')
    );
    expect(parseQrToken(`LLQR1.k1.${campoVazio}.${sig}`).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Rotação de chave
// ---------------------------------------------------------------------------

describe('rotação de chave (kid)', () => {
  it('ingresso antigo (k1) continua válido após rotação para k2', () => {
    const antigo = assinarQrToken(PAYLOAD, RING_K1);
    expect(verificarQrToken(antigo, RING_ROTACIONADO)).toEqual({
      ok: true,
      payload: PAYLOAD,
      kid: 'k1',
    });
  });

  it('emissão nova sai com o kid ATIVO (k2)', () => {
    const novo = assinarQrToken(PAYLOAD, RING_ROTACIONADO);
    expect(novo.split('.')[1]).toBe('k2');
    expect(verificarQrToken(novo, RING_ROTACIONADO).ok).toBe(true);
  });

  it('remover k1 do ring REVOGA tudo que k1 assinou', () => {
    const antigo = assinarQrToken(PAYLOAD, RING_K1);
    const ringSemK1: QrKeyring = { ativo: 'k2', chaves: { k2: SEGREDO_K2 } };
    expect(verificarQrToken(antigo, ringSemK1)).toEqual({
      ok: false,
      causa: 'kid_desconhecido',
    });
  });
});

// ---------------------------------------------------------------------------
// Keyring do ambiente (segredo NUNCA hardcoded; config inválida grita)
// ---------------------------------------------------------------------------

describe('carregarQrKeyring', () => {
  const SEGREDO_B64 = Buffer.alloc(32, 5).toString('base64url');

  it('ausente → null (fail-closed decidido pelo chamador)', () => {
    expect(carregarQrKeyring({})).toBeNull();
    expect(carregarQrKeyring({ QR_TOKEN_KEYS: '' })).toBeNull();
  });

  it('válido → ring com kid ativo', () => {
    const ring = carregarQrKeyring({
      QR_TOKEN_KEYS: JSON.stringify({ k1: SEGREDO_B64 }),
      QR_TOKEN_KID_ATIVO: 'k1',
    });
    expect(ring).not.toBeNull();
    expect(ring?.ativo).toBe('k1');
    expect(ring?.chaves['k1']).toEqual(Buffer.alloc(32, 5));
  });

  it('config presente porém inválida → Error alto (nunca degrada calado)', () => {
    const casos: Array<Record<string, string>> = [
      { QR_TOKEN_KEYS: JSON.stringify({ k1: SEGREDO_B64 }) }, // sem kid ativo
      { QR_TOKEN_KEYS: 'não-json', QR_TOKEN_KID_ATIVO: 'k1' },
      { QR_TOKEN_KEYS: '["k1"]', QR_TOKEN_KID_ATIVO: 'k1' },
      {
        // segredo curto (16 bytes < 32)
        QR_TOKEN_KEYS: JSON.stringify({ k1: Buffer.alloc(16, 5).toString('base64url') }),
        QR_TOKEN_KID_ATIVO: 'k1',
      },
      {
        // kid ativo fora do ring (rotação incompleta)
        QR_TOKEN_KEYS: JSON.stringify({ k1: SEGREDO_B64 }),
        QR_TOKEN_KID_ATIVO: 'k2',
      },
    ];
    for (const env of casos) {
      expect(() => carregarQrKeyring(env)).toThrowError();
    }
  });
});

// ---------------------------------------------------------------------------
// Decisão pura do check-in (causas distintas — aceite S208)
// ---------------------------------------------------------------------------

describe('classificarCheckinQr', () => {
  const TOKEN = 'LLQR1.k1.payload.sig'; // decisão é pura — token é opaco aqui
  const base = {
    payload: PAYLOAD,
    tokenApresentado: TOKEN,
    eventoIdBalcao: PAYLOAD.eventoId,
    tenantIdCaller: PAYLOAD.tenantId,
    inscrito: {
      status: 'confirmado' as const,
      jaTemCheckin: false,
      qrTokenEmitido: TOKEN,
    },
  };

  it('caminho válido → ok', () => {
    expect(classificarCheckinQr(base)).toEqual({ ok: true });
  });

  it('QR de OUTRO evento → qr_outro_evento', () => {
    expect(
      classificarCheckinQr({ ...base, eventoIdBalcao: 'corrida-sem-chip-2027' })
    ).toEqual({ ok: false, causa: 'qr_outro_evento' });
  });

  it('QR de outro TENANT colapsa em qr_outro_evento (sem oráculo)', () => {
    expect(classificarCheckinQr({ ...base, tenantIdCaller: 'passo-certo' })).toEqual({
      ok: false,
      causa: 'qr_outro_evento',
    });
  });

  it('inscrito inexistente → inscrito_nao_encontrado', () => {
    expect(classificarCheckinQr({ ...base, inscrito: null })).toEqual({
      ok: false,
      causa: 'inscrito_nao_encontrado',
    });
  });

  it('token assinado porém nunca emitido / re-emitido → qr_divergente', () => {
    expect(
      classificarCheckinQr({
        ...base,
        inscrito: { ...base.inscrito, qrTokenEmitido: null },
      })
    ).toEqual({ ok: false, causa: 'qr_divergente' });
    expect(
      classificarCheckinQr({
        ...base,
        inscrito: { ...base.inscrito, qrTokenEmitido: 'LLQR1.k2.outro.sig' },
      })
    ).toEqual({ ok: false, causa: 'qr_divergente' });
  });

  it('cancelado → inscrito_cancelado (antes de replay — mais acionável)', () => {
    expect(
      classificarCheckinQr({
        ...base,
        inscrito: { ...base.inscrito, status: 'cancelado', jaTemCheckin: true },
      })
    ).toEqual({ ok: false, causa: 'inscrito_cancelado' });
  });

  it('pendente → inscrito_nao_confirmado', () => {
    expect(
      classificarCheckinQr({
        ...base,
        inscrito: { ...base.inscrito, status: 'pendente' },
      })
    ).toEqual({ ok: false, causa: 'inscrito_nao_confirmado' });
  });

  it('checkinEm presente → qr_ja_utilizado (replay — RN-222)', () => {
    expect(
      classificarCheckinQr({
        ...base,
        inscrito: { ...base.inscrito, jaTemCheckin: true },
      })
    ).toEqual({ ok: false, causa: 'qr_ja_utilizado' });
  });
});
