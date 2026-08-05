/**
 * codigoAcessoCore.test.ts — S1229-T1 · RN-476
 *
 * A parte do código de seis dígitos que NÃO precisa de Emulator: forma,
 * sorteio, normalização e — o que carrega a tarefa — a aritmética que obriga o
 * HMAC com pepper no lugar do SHA-256 puro.
 *
 * Por que este arquivo existe separado do de integração: os casos abaixo rodam
 * em milissegundos e provam propriedades de CREDENCIAL. Uma suíte que exige
 * Emulator para provar "o digest não recupera o código" seria uma suíte que
 * ninguém roda antes de commitar.
 */

import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ALFABETO_CODIGO_ACESSO,
  CODIGO_ACESSO_MAX_TENTATIVAS,
  CODIGO_ACESSO_RE,
  CODIGO_ACESSO_TTL_MS,
  codigoDeAcessoValido,
  emailDeCodigoValido,
  gerarCodigoDeAcesso,
  normalizarCodigoDeAcesso,
  normalizarEmailCodigo,
  TAMANHO_CODIGO_ACESSO,
  tentativasRestantes,
} from '@leela/core';
import {
  codigoAcessoPepper,
  digestCodigo,
  digestProva,
  docIdDoEmail,
  janelasDoCodigo,
} from '../auth/codigoDeAcesso';

const PEPPER_ORIGINAL = process.env['CODIGO_ACESSO_PEPPER'];
const PEPPER_TESTE = 'pepper-de-teste-rn476';

beforeEach(() => {
  process.env['CODIGO_ACESSO_PEPPER'] = PEPPER_TESTE;
});

afterEach(() => {
  if (PEPPER_ORIGINAL === undefined) delete process.env['CODIGO_ACESSO_PEPPER'];
  else process.env['CODIGO_ACESSO_PEPPER'] = PEPPER_ORIGINAL;
});

describe('RN-476 · a forma do código', () => {
  it('são seis dígitos decimais', () => {
    expect(TAMANHO_CODIGO_ACESSO).toBe(6);
    expect(ALFABETO_CODIGO_ACESSO).toBe('0123456789');
    for (let i = 0; i < 200; i++) {
      expect(gerarCodigoDeAcesso()).toMatch(CODIGO_ACESSO_RE);
    }
  });

  it('zeros à esquerda SOBREVIVEM à ida e à volta', () => {
    // O defeito que este caso fecha: sortear um número e formatar depois perde
    // o zero na primeira conversão descuidada, e perder o zero reduz o espaço
    // de busca de 10⁶ para 9×10⁵ em silêncio.
    const sempreZero = (): number => 0;
    expect(gerarCodigoDeAcesso(sempreZero)).toBe('000000');

    // `000123`: quatro zeros e depois 1, 2, 3.
    const roteiro = [0, 0, 0, 0.1, 0.2, 0.3];
    let i = 0;
    const pregado = (): number => roteiro[i++] as number;
    const codigo = gerarCodigoDeAcesso(pregado);
    expect(codigo).toBe('000123');
    expect(codigo).toHaveLength(6);
    expect(codigoDeAcessoValido(codigo)).toBe(true);
    // E a ida e a volta pelo digest preserva o zero: o material é a STRING.
    expect(digestCodigo('ana@leela.com', '000123')).toBe(
      digestCodigo('ana@leela.com', codigo)
    );
    expect(digestCodigo('ana@leela.com', '000123')).not.toBe(
      digestCodigo('ana@leela.com', '123')
    );
  });

  it('o sorteio cobre os dez dígitos (a fonte não está grudada)', () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 500; i++) {
      for (const d of gerarCodigoDeAcesso()) vistos.add(d);
    }
    expect(vistos.size).toBe(10);
  });

  it('RNG fora de faixa não produz "undefined" dentro do código', () => {
    expect(gerarCodigoDeAcesso(() => 1)).toMatch(CODIGO_ACESSO_RE);
    expect(gerarCodigoDeAcesso(() => -0.5)).toMatch(CODIGO_ACESSO_RE);
    expect(gerarCodigoDeAcesso(() => Number.NaN)).toMatch(CODIGO_ACESSO_RE);
  });

  it('a régua da forma é ancorada nas duas pontas', () => {
    expect(codigoDeAcessoValido('123456')).toBe(true);
    expect(codigoDeAcessoValido('123 456')).toBe(true); // a pessoa colou do e-mail
    expect(codigoDeAcessoValido('123-456')).toBe(true);
    expect(codigoDeAcessoValido('12345')).toBe(false);
    expect(codigoDeAcessoValido('1234567')).toBe(false);
    expect(codigoDeAcessoValido('abc123456xyz')).toBe(false);
    expect(codigoDeAcessoValido('12345a')).toBe(false);
    expect(codigoDeAcessoValido(null)).toBe(false);
    expect(normalizarCodigoDeAcesso(' 000 123 ')).toBe('000123');
  });
});

describe('RN-476 · o pepper é fail-closed', () => {
  it('ausente ⇒ LANÇA, e a mensagem diz o que provisionar', () => {
    delete process.env['CODIGO_ACESSO_PEPPER'];
    expect(() => codigoAcessoPepper()).toThrow(/CODIGO_ACESSO_PEPPER ausente/);
    expect(() => digestCodigo('ana@leela.com', '123456')).toThrow(
      /Secret Manager/
    );
    expect(() => docIdDoEmail('ana@leela.com')).toThrow();
  });

  it('vazio ⇒ LANÇA (string vazia é ausência disfarçada)', () => {
    process.env['CODIGO_ACESSO_PEPPER'] = '';
    expect(() => codigoAcessoPepper()).toThrow(/fail-closed/);
  });

  it('a checagem é em tempo de CHAMADA, não no load do módulo', () => {
    // O deploy não pode quebrar por falta de segredo; a chamada é que quebra
    // alto. Se a checagem fosse no topo do módulo, o import acima já teria
    // lançado e este arquivo nem chegaria aqui.
    delete process.env['CODIGO_ACESSO_PEPPER'];
    expect(() => janelasDoCodigo('ana@leela.com')).not.toThrow();
  });
});

describe('RN-476 · o digest é HMAC com pepper, e isso não é detalhe', () => {
  it('o digest NÃO é SHA-256 do material (o precedente do convite não serve)', () => {
    // O token do convite de assessoria tem 256 bits e `sha256` puro basta lá.
    // Aqui o espaço é 10⁶: quem lê o documento enumera o milhão em
    // milissegundos se o algoritmo for hash puro. Este caso fica vermelho no
    // dia em que alguém "simplificar" para createHash.
    const material = 'ana@leela.com:123456';
    const puro = createHash('sha256').update(material, 'utf8').digest('hex');
    expect(digestCodigo('ana@leela.com', '123456')).not.toBe(puro);
  });

  it('SEM o pepper, o milhão de digests não recupera o código', () => {
    const codigo = '481902';
    const guardado = digestCodigo('ana@leela.com', codigo);

    // O atacante tem o documento e conhece o e-mail e o algoritmo. Sem o
    // pepper, a única coisa que ele pode fazer é chutar a CHAVE do HMAC — o
    // espaço de busca deixou de ser 10⁶. Aqui a varredura é reduzida (o teste
    // não vai calcular um milhão de digests), mas o argumento é o mesmo: o
    // material certo, com pepper errado, nunca bate.
    let acertos = 0;
    for (let n = 481_900; n <= 481_905; n++) {
      const tentativa = String(n).padStart(6, '0');
      const semPepper = createHash('sha256')
        .update(`ana@leela.com:${tentativa}`, 'utf8')
        .digest('hex');
      if (semPepper === guardado) acertos++;
    }
    expect(acertos).toBe(0);

    // E com pepper ERRADO também não bate, mesmo com o código CERTO.
    process.env['CODIGO_ACESSO_PEPPER'] = 'outro-pepper';
    expect(digestCodigo('ana@leela.com', codigo)).not.toBe(guardado);
  });

  it('o digest é amarrado ao ENDEREÇO (não é testável contra outro documento)', () => {
    expect(digestCodigo('ana@leela.com', '123456')).not.toBe(
      digestCodigo('bruno@leela.com', '123456')
    );
  });

  it('a grafia do endereço não cria um segundo código vivo', () => {
    expect(normalizarEmailCodigo('  Ana@Leela.COM ')).toBe('ana@leela.com');
    expect(digestCodigo(' Ana@Leela.COM ', '123456')).toBe(
      digestCodigo('ana@leela.com', '123456')
    );
    expect(docIdDoEmail('ANA@leela.com')).toBe(docIdDoEmail('ana@leela.com'));
    expect(janelasDoCodigo('ANA@leela.com')[0]?.chave).toBe(
      janelasDoCodigo('ana@leela.com')[0]?.chave
    );
  });

  it('o docId não é o e-mail nem um hash sem pepper dele', () => {
    const id = docIdDoEmail('ana@leela.com');
    expect(id).not.toContain('ana');
    expect(id).not.toContain('@');
    expect(id).not.toBe(
      createHash('sha256').update('ana@leela.com', 'utf8').digest('hex').slice(0, 40)
    );
    expect(id).toHaveLength(40);
  });

  it('código e prova vivem em domínios separados', () => {
    // Sem separação de domínio, um digest de prova observado no documento
    // poderia ser conferido contra o campo do código (e vice-versa).
    expect(digestProva('ana@leela.com', '123456')).not.toBe(
      digestCodigo('ana@leela.com', '123456')
    );
  });
});

describe('RN-476 · as janelas do limitador são por ALVO', () => {
  it('duas janelas por endereço: 3/15min e 10/24h', () => {
    const janelas = janelasDoCodigo('ana@leela.com');
    expect(janelas).toHaveLength(2);
    expect(janelas[0]).toMatchObject({ limite: 3, janelaMs: 15 * 60_000 });
    expect(janelas[1]).toMatchObject({ limite: 10, janelaMs: 24 * 60 * 60_000 });
  });

  it('a chave não carrega o endereço em claro', () => {
    for (const j of janelasDoCodigo('ana@leela.com')) {
      expect(j.chave).not.toContain('ana@leela.com');
      expect(j.chave).not.toContain('@');
    }
  });

  it('endereços diferentes caem em baldes diferentes', () => {
    expect(janelasDoCodigo('ana@leela.com')[0]?.chave).not.toBe(
      janelasDoCodigo('bruno@leela.com')[0]?.chave
    );
  });
});

describe('RN-476 · prazo, teto e a contagem que a tela mostra', () => {
  it('dez minutos, cinco tentativas', () => {
    expect(CODIGO_ACESSO_TTL_MS).toBe(10 * 60_000);
    expect(CODIGO_ACESSO_MAX_TENTATIVAS).toBe(5);
  });

  it('a contagem restante nunca fica negativa nem mente', () => {
    expect(tentativasRestantes(0)).toBe(5);
    expect(tentativasRestantes(4)).toBe(1);
    expect(tentativasRestantes(5)).toBe(0);
    expect(tentativasRestantes(9)).toBe(0);
    expect(tentativasRestantes(Number.NaN)).toBe(0);
  });

  it('o endereço tem régua e teto de tamanho', () => {
    expect(emailDeCodigoValido('ana@leela.com')).toBe(true);
    expect(emailDeCodigoValido('ana')).toBe(false);
    expect(emailDeCodigoValido('')).toBe(false);
    expect(emailDeCodigoValido(`${'a'.repeat(250)}@leela.com`)).toBe(false);
  });
});
