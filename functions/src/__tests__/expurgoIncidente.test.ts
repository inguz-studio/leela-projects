/**
 * expurgoIncidente.test.ts — BUILD-EXPURGO · trace leela-pixreal-diag-20260804
 *
 * O buraco: `expurgarSaude` — o cron que apaga dado de saúde vencido, LGPD
 * Art. 11 / RN-147 — falhou OITO madrugadas seguidas em produção com
 * `FAILED_PRECONDITION`, e a falha existia só como uma linha `E` no meio de
 * centenas. Cron de obrigação legal caiu todo dia e o sistema ficou verde.
 *
 * Este arquivo prova as duas metades do conserto que dependem de código:
 *   - FORMATO: o payload do incidente carrega `alerta`/`severidade`/`canal`/
 *     `tipo`/`causa` estáveis, sem PII, e preserva o link do índice inteiro;
 *   - CAMINHO DE ERRO: o wrapper do cron registra o incidente e RELANÇA — não
 *     troca uma falha silenciosa por uma execução verde e mentirosa.
 *
 * ⚠ ESTÁTICO/PURO: não sobe Emulator, não fala com rede. O que este arquivo
 * NÃO prova, e nenhum teste deste repositório consegue provar, é que o índice
 * existe no SERVIDOR — o Emulator não cobra índice. Essa metade é do
 * `firestoreIndexes.contract.test.ts` (que prova o ARQUIVO) e do deploy.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import * as logger from 'firebase-functions/logger';
import {
  ALERTA_EXPURGO_LGPD,
  classificarCausaExpurgo,
  montarIncidenteExpurgo,
  registrarIncidenteExpurgo,
  urlDoIndiceFaltante,
} from '../eventos/incidenteExpurgo';
import { executarExpurgoSaude } from '../eventos/expurgarSaude';

/** O erro EXATO que produção cuspiu em 2026-08-05T06:20:07Z, encurtado. */
const ERRO_REAL =
  'Error: 9 FAILED_PRECONDITION: The query requires an index. You can create ' +
  'it here: https://console.firebase.google.com/v1/r/project/leela-hub/' +
  'firestore/indexes?create_composite=Cktwcm9qZWN0cy9sZWVsYS1odWIvZGF0YWJhc2Vz' +
  'LyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2V2ZW50b3MvaW5kZXhlcy9fEAEaCgoGc3RhdHVz' +
  'EAEaCAoEZGF0YRABGgwKCF9fbmFtZV9fEAE';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('incidenteExpurgo · formato que a política de alerta casa', () => {
  it('o payload traz alerta, severidade, canal, tipo e causa', () => {
    const p = montarIncidenteExpurgo({ tipo: 'saude', erro: new Error(ERRO_REAL) });
    expect(p['alerta']).toBe(ALERTA_EXPURGO_LGPD);
    expect(p['alerta']).toBe('expurgo_lgpd_falhou');
    expect(p['severidade']).toBe('critico');
    expect(p['canal']).toBe('retencao');
    expect(p['tipo']).toBe('saude');
    expect(p['causa']).toBe('indice_ausente');
  });

  it('classifica índice ausente pelo par FAILED_PRECONDITION + "requires an index"', () => {
    expect(classificarCausaExpurgo(new Error(ERRO_REAL))).toBe('indice_ausente');
    // FAILED_PRECONDITION sozinho é outra coisa (pré-condição de transação):
    // classificar como índice mandaria o plantão consertar o arquivo errado.
    expect(
      classificarCausaExpurgo(new Error('9 FAILED_PRECONDITION: document does not exist'))
    ).toBe('desconhecida');
    expect(classificarCausaExpurgo(new Error('7 PERMISSION_DENIED'))).toBe('desconhecida');
    expect(classificarCausaExpurgo('string solta')).toBe('desconhecida');
    expect(classificarCausaExpurgo(undefined)).toBe('desconhecida');
  });

  it('o link do índice sai INTEIRO num campo próprio, fora do truncamento', () => {
    const p = montarIncidenteExpurgo({ tipo: 'saude', erro: new Error(ERRO_REAL) });
    const url = p['indiceUrl'] as string;
    expect(url.startsWith('https://console.firebase.google.com/')).toBe(true);
    expect(url).toContain('create_composite=');
    // `err` trunca em 200 e cortaria o link no meio — é por isso que ele tem
    // campo próprio: é a única coisa acionável da linha.
    expect((p['err'] as string).length).toBe(200);
    expect(url.length).toBeGreaterThan(200);
  });

  it('sem link no erro, o campo indiceUrl simplesmente não aparece', () => {
    const p = montarIncidenteExpurgo({ tipo: 'saude', erro: new Error('boom') });
    expect('indiceUrl' in p).toBe(false);
    expect(p['err']).toBe('boom');
    expect(p['causa']).toBe('desconhecida');
  });

  it('a pontuação da frase não entra no link', () => {
    const url = urlDoIndiceFaltante(
      new Error('index here: https://console.cloud.google.com/x/y?create_composite=AB.')
    );
    expect(url).toBe('https://console.cloud.google.com/x/y?create_composite=AB');
  });

  it('nenhum campo de dado de saúde vaza para o log', () => {
    const p = montarIncidenteExpurgo({
      tipo: 'saude',
      erro: new Error('falhou com atestadoUrl=https://x/atestado.pdf de fulano@x.com'),
    });
    const serializado = JSON.stringify(p);
    // O `err` é do provedor e é copiado como veio (truncado). O contrato é
    // sobre o que o NOSSO código acrescenta: nenhuma chave de conteúdo.
    for (const proibido of ['atestadoUrl', 'parqRespostas', 'consentimentoSaudeEm']) {
      expect(Object.keys(p)).not.toContain(proibido);
    }
    expect(serializado).not.toContain('"email"');
  });
});

describe('expurgarSaude · o caminho de erro do cron vira incidente', () => {
  type Db = Parameters<typeof executarExpurgoSaude>[0];

  /** `db` mínimo que estoura na primeira query, como produção estourava. */
  function dbQueEstoura(erro: unknown): Db {
    const query = {
      where: () => query,
      get: () => Promise.reject(erro),
    };
    return { collection: () => query } as unknown as Db;
  }

  it('registra o incidente e RELANÇA (execução verde seria pior)', async () => {
    const erro = new Error(ERRO_REAL);
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    await expect(executarExpurgoSaude(dbQueEstoura(erro))).rejects.toThrow(
      /FAILED_PRECONDITION/
    );

    expect(spy).toHaveBeenCalledTimes(1);
    const [evento, payload] = spy.mock.calls[0] as [string, Record<string, unknown>];
    expect(evento).toBe('expurgo_saude_falhou');
    expect(payload['alerta']).toBe('expurgo_lgpd_falhou');
    expect(payload['severidade']).toBe('critico');
    expect(payload['causa']).toBe('indice_ausente');
  });

  it('erro que não é de índice também vira incidente, com causa desconhecida', async () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    await expect(executarExpurgoSaude(dbQueEstoura(new Error('rede caiu')))).rejects.toThrow(
      'rede caiu'
    );
    const [, payload] = spy.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload['causa']).toBe('desconhecida');
    expect(payload['err']).toBe('rede caiu');
  });

  it('sucesso não registra incidente nenhum', async () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const query = { where: () => query, get: () => Promise.resolve({ docs: [], size: 0 }) };
    const db = { collection: () => query } as unknown as Db;

    await expect(executarExpurgoSaude(db)).resolves.toEqual({
      eventosVarridos: 0,
      eventosExpurgados: 0,
      docsApagados: 0,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('registrarIncidenteExpurgo usa logger.error, nunca logger.info', () => {
    const err = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    registrarIncidenteExpurgo('expurgo_saude_falhou', {
      tipo: 'saude',
      erro: new Error('x'),
    });
    expect(err).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();
  });
});
