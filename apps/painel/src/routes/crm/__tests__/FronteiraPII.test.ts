// =============================================================================
// GATE DE FRONTEIRA DE PII no CRM — risco #7 da rodada IA-MENU, o único dos 8
// que a lane de execução entregou como "vigilância, não prova".
//
// O desenho ratificado (00-decisao §"o que esta rodada NÃO mexe"): **CRM ›
// Visão geral** é a camada AGREGADA sem identidade (RN-820/822, supressão k=5
// no cohort); **CRM › Clientes** é identidade individual (RN-172). As duas
// passaram a dividir a mesma casca de menu — "a fronteira é de dado, não de
// tela". Dividir a moldura NÃO autoriza cruzar as camadas.
//
// Até aqui isso vivia como diretriz em docblock. Diretriz não falha o build; o
// caminho que borra a fronteira é sempre a adição inocente seguinte (um filtro
// por faixa etária na lista, um drill-down do cohort para a ficha, um export).
// Este arquivo transforma a diretriz em GATE: cada asserção abaixo é um dos
// caminhos nomeados no vetor de ataque da review antagonista.
//
// O QUE ESTE GATE **NÃO** PROVA (escalado, não mascarado): as duas camadas são
// autorizadas pela MESMA regra — `crmClientes` lê com `isTenantWriter(tenantId)`
// (firestore.rules) e a área `/crm` não tem guarda de papel no roteador. Logo o
// k=5 do cohort não é controle de confidencialidade contra quem também abre
// Clientes: é minimização na superfície agregada. Separar as duas audiências
// exige papel/claim novo — decisão de produto + backend, fora desta lane.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CRM = join(AQUI, '..');
const VISAO_GERAL = join(CRM, 'visao-geral');

/** Todos os fontes (não-teste) de um diretório, recursivamente. */
function fontes(dir: string): string[] {
  const saida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      if (entrada === '__tests__') continue;
      saida.push(...fontes(caminho));
      continue;
    }
    if (/\.tsx?$/.test(entrada)) saida.push(caminho);
  }
  return saida;
}

function ler(caminho: string): string {
  return readFileSync(caminho, 'utf8');
}

/** Só o código: comentários (onde a fronteira é DESCRITA) não contam. */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const FONTES_AGREGADO = fontes(VISAO_GERAL);

describe('fronteira de PII · o AGREGADO não alcança a identidade individual', () => {
  it('a Visão geral tem fontes (o gate não passa por diretório vazio)', () => {
    expect(FONTES_AGREGADO.length).toBeGreaterThan(5);
  });

  it.each([
    // caminho de ataque              → o que não pode aparecer no agregado
    ['reader de cliente individual', /_data\/clientes/],
    ['coleção de PII individual', /crmClientes/],
    ['tela da lista de clientes', /ClientesPage/],
    ['tela da ficha individual', /ClienteDetailPage/],
  ])('nenhum fonte da Visão geral toca %s', (_caminho, proibido) => {
    const infratores = FONTES_AGREGADO.filter((f) => proibido.test(semComentarios(ler(f))));
    expect(infratores.map((f) => relative(CRM, f))).toEqual([]);
  });

  it('a Visão geral não oferece drill-down para a ficha (nenhuma rota de cliente)', () => {
    const infratores = FONTES_AGREGADO.filter((f) =>
      /['"`]\/crm\/clientes/.test(semComentarios(ler(f))),
    );
    expect(infratores.map((f) => relative(CRM, f))).toEqual([]);
  });

  it('o cohort continua passando pela supressão k=5 antes de virar linha', () => {
    const demografia = ler(join(VISAO_GERAL, '_lib', 'demografia.ts'));
    expect(demografia).toContain('suprimirCohortPorK');
  });
});

describe('fronteira de PII · o INDIVIDUAL não vira recorte demográfico', () => {
  const clientes = ler(join(CRM, 'ClientesPage.tsx'));
  const codigo = semComentarios(clientes);

  it('as opções de ordenação são exatamente as 4 não-demográficas', () => {
    const bloco = /const ORDENS: SelectOption\[\] = \[([\s\S]*?)\];/.exec(clientes)?.[1] ?? '';
    expect(bloco).not.toBe('');
    const valores = [...bloco.matchAll(/value: '([^']+)'/g)].map((m) => m[1]);
    expect(valores).toEqual(['ltv', 'valorGasto', 'qtdEventos', 'nome']);
  });

  it.each([
    ['faixa etária', /\bfaixa\b/i],
    ['idade', /\bidade\b/i],
    ['nascimento', /nascimento/i],
    ['sexo', /\bsexo\b/i],
    ['cohort', /cohort/i],
  ])('a lista não ganhou recorte por %s', (_eixo, proibido) => {
    expect(proibido.test(codigo)).toBe(false);
  });

  it('a lista não exporta a base (export de PII individual é decisão, não layout)', () => {
    for (const proibido of [/baixarTexto/, /gerarCsv/i, /Exportar/i, /\.csv/i]) {
      expect(proibido.test(codigo), `encontrado: ${String(proibido)}`).toBe(false);
    }
  });

  it('a lista não aceita filtro por querystring (nenhum recorte entra pela URL)', () => {
    expect(/useSearchParams|location\.search/.test(codigo)).toBe(false);
  });

  it('a busca continua sendo por prefixo de NOME, nunca por atributo demográfico', () => {
    expect(codigo).toContain('useBuscaClientes');
    expect(clientes).toContain('Início do nome');
  });
});
