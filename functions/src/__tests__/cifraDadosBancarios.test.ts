/**
 * cifraDadosBancarios.test.ts — LEELA-E09s-L2-T2 (unit, sem Emulator)
 *
 * Prova o ADR-014 no nível do mecanismo:
 *   - roundtrip cifra→decifra devolve o payload exato;
 *   - IV único: dois envelopes do MESMO payload nunca coincidem;
 *   - AAD = tenantId: blob copiado para OUTRO tenant FALHA a decifra;
 *   - blob adulterado (ciphertext/authTag) FALHA;
 *   - chave errada FALHA; chave ausente/malformada ⇒ chaveVigente() null
 *     (fail-closed);
 *   - rotação: envelope keyVersion antiga decifra via BANK_DATA_KEY_V{n};
 *   - tabela de máscaras (conta/CPF/CNPJ/PIX e-mail/telefone/aleatória).
 */
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  chavePorVersao,
  chaveVigente,
  cifrarDadosBancarios,
  decifrarDadosBancarios,
  ENV_BANK_DATA_KEY,
  ENV_BANK_DATA_KEY_VERSION,
  mascararConta,
  mascararCpfCnpj,
  mascararPix,
  somenteDigitos,
} from '../finance/cifraDadosBancarios';
import {
  derivarMascarado,
  validarDadosBancariosInput,
} from '../finance/saveDadosBancarios';

const TENANT_A = 'castelo-producoes';
const TENANT_B = 'passo-certo';
const PAYLOAD = { conta: '12345-6', pix: 'marina@gmail.com' };

const KEY_B64 = randomBytes(32).toString('base64');

const envBackup: Record<string, string | undefined> = {};
const ENV_KEYS = [
  ENV_BANK_DATA_KEY,
  ENV_BANK_DATA_KEY_VERSION,
  `${ENV_BANK_DATA_KEY}_V1`,
  `${ENV_BANK_DATA_KEY}_V2`,
];

beforeEach(() => {
  for (const k of ENV_KEYS) envBackup[k] = process.env[k];
  process.env[ENV_BANK_DATA_KEY] = KEY_B64;
  delete process.env[ENV_BANK_DATA_KEY_VERSION];
  delete process.env[`${ENV_BANK_DATA_KEY}_V1`];
  delete process.env[`${ENV_BANK_DATA_KEY}_V2`];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (envBackup[k] === undefined) delete process.env[k];
    else process.env[k] = envBackup[k];
  }
});

describe('envelope AES-256-GCM (ADR-014)', () => {
  it('roundtrip: decifra devolve o payload exato', () => {
    const chave = chaveVigente();
    expect(chave).not.toBeNull();
    const env = cifrarDadosBancarios(PAYLOAD, TENANT_A, chave!);
    expect(env.algoritmo).toBe('aes-256-gcm');
    expect(env.keyVersion).toBe(1);
    expect(decifrarDadosBancarios(env, TENANT_A)).toEqual(PAYLOAD);
  });

  it('IV único: dois envelopes do MESMO payload nunca coincidem', () => {
    const chave = chaveVigente()!;
    const a = cifrarDadosBancarios(PAYLOAD, TENANT_A, chave);
    const b = cifrarDadosBancarios(PAYLOAD, TENANT_A, chave);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('ATAQUE — blob copiado para OUTRO tenant falha a decifra (AAD)', () => {
    const env = cifrarDadosBancarios(PAYLOAD, TENANT_A, chaveVigente()!);
    expect(() => decifrarDadosBancarios(env, TENANT_B)).toThrow();
  });

  it('ATAQUE — ciphertext/authTag adulterados falham (integridade GCM)', () => {
    const env = cifrarDadosBancarios(PAYLOAD, TENANT_A, chaveVigente()!);
    const flip = (b64: string): string => {
      const buf = Buffer.from(b64, 'base64');
      const primeiro = buf[0] ?? 0;
      buf[0] = primeiro ^ 0xff;
      return buf.toString('base64');
    };
    expect(() =>
      decifrarDadosBancarios({ ...env, ciphertext: flip(env.ciphertext) }, TENANT_A)
    ).toThrow();
    expect(() =>
      decifrarDadosBancarios({ ...env, authTag: flip(env.authTag) }, TENANT_A)
    ).toThrow();
  });

  it('ATAQUE — chave errada falha; payload nunca vaza na mensagem', () => {
    const env = cifrarDadosBancarios(PAYLOAD, TENANT_A, chaveVigente()!);
    process.env[ENV_BANK_DATA_KEY] = randomBytes(32).toString('base64');
    let mensagem = '';
    try {
      decifrarDadosBancarios(env, TENANT_A);
    } catch (err) {
      mensagem = err instanceof Error ? err.message : String(err);
    }
    expect(mensagem).not.toBe('');
    expect(mensagem).not.toContain('12345');
    expect(mensagem).not.toContain('marina');
  });

  it('fail-closed: env ausente ou chave de tamanho errado ⇒ chaveVigente() null', () => {
    delete process.env[ENV_BANK_DATA_KEY];
    expect(chaveVigente()).toBeNull();
    process.env[ENV_BANK_DATA_KEY] = randomBytes(16).toString('base64'); // 128 bits — insuficiente
    expect(chaveVigente()).toBeNull();
  });

  it('rotação (ADR-014 §4): envelope antigo decifra via BANK_DATA_KEY_V{n}', () => {
    // cifra na versão 1
    const envleope1 = cifrarDadosBancarios(PAYLOAD, TENANT_A, chaveVigente()!);
    // rotaciona: nova chave vigente v2, antiga vira _V1
    process.env[`${ENV_BANK_DATA_KEY}_V1`] = KEY_B64;
    process.env[ENV_BANK_DATA_KEY] = randomBytes(32).toString('base64');
    process.env[ENV_BANK_DATA_KEY_VERSION] = '2';
    expect(chaveVigente()!.version).toBe(2);
    expect(chavePorVersao(1)).not.toBeNull();
    expect(decifrarDadosBancarios(envleope1, TENANT_A)).toEqual(PAYLOAD);
    // e a versão sem chave publicada falha fechado
    expect(() =>
      decifrarDadosBancarios({ ...envleope1, keyVersion: 7 }, TENANT_A)
    ).toThrow(/versão 7/);
  });
});

describe('máscaras (RN-354)', () => {
  it('conta: só os 4 últimos dígitos', () => {
    expect(mascararConta('12345-6')).toBe('****3456');
    expect(mascararConta('00012.345.678-9')).toBe('****6789');
  });

  it('CPF/CNPJ: formato canônico do L1', () => {
    expect(mascararCpfCnpj('123.456.789-12')).toBe('***.***.***-12');
    expect(mascararCpfCnpj('12345678000155')).toBe('**.***.***/****-55');
  });

  it('PIX: e-mail → ***@g***.com; CPF → máscara fiscal; demais → ****+4', () => {
    expect(mascararPix('marina@gmail.com')).toBe('***@g***.com');
    expect(mascararPix('12345678912')).toBe('***.***.***-12');
    expect(mascararPix('+5548999991234')).toBe('****1234');
    expect(mascararPix('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe('****7890');
  });

  it('somenteDigitos remove máscara de formatação', () => {
    expect(somenteDigitos('123.456.789-12')).toBe('12345678912');
  });
});

describe('validação e derivação do mascarado (saveDadosBancarios)', () => {
  const inputValido = {
    banco: '260 — Nubank',
    agencia: '0001',
    conta: '12345-6',
    tipo: 'corrente',
    pix: 'marina@gmail.com',
    titular: 'Marina Castelo',
    cpfCnpj: '123.456.789-12',
  };

  it('input válido passa; derivado NUNCA contém conta/PIX em claro', () => {
    expect(validarDadosBancariosInput(inputValido)).toEqual([]);
    const mascarado = derivarMascarado(TENANT_A, inputValido);
    expect(mascarado).toEqual({
      tenantId: TENANT_A,
      banco: '260 — Nubank',
      agencia: '0001',
      contaMascarada: '****3456',
      tipo: 'corrente',
      pixMascarado: '***@g***.com',
      titular: 'Marina Castelo',
      cpfCnpjMascarado: '***.***.***-12',
    });
    const serializado = JSON.stringify(mascarado);
    expect(serializado).not.toContain('12345-6');
    expect(serializado).not.toContain('marina@gmail.com');
    expect(serializado).not.toContain('12345678912');
  });

  it('rejeita: banco vazio, conta curta, tipo inválido, CPF de 10 dígitos, pix vazio', () => {
    expect(validarDadosBancariosInput({ ...inputValido, banco: ' ' })).toHaveLength(1);
    expect(validarDadosBancariosInput({ ...inputValido, conta: '123' })).toHaveLength(1);
    expect(validarDadosBancariosInput({ ...inputValido, tipo: 'salario' })).toHaveLength(1);
    expect(validarDadosBancariosInput({ ...inputValido, cpfCnpj: '1234567891' })).toHaveLength(1);
    expect(validarDadosBancariosInput({ ...inputValido, pix: '' })).toHaveLength(1);
    expect(validarDadosBancariosInput(null)).toHaveLength(1);
  });

  it('pix ausente ⇒ pixMascarado null (não string vazia)', () => {
    const semPix = { ...inputValido } as Record<string, unknown>;
    delete semPix['pix'];
    expect(validarDadosBancariosInput(semPix)).toEqual([]);
    expect(
      derivarMascarado(TENANT_A, semPix as never).pixMascarado
    ).toBeNull();
  });
});
