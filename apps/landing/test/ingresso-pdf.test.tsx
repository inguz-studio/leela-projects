// =============================================================================
// apps/landing/test/ingresso-pdf.test.tsx
//
// O ingresso como ARQUIVO (S1214-T5 · RN-473) — os dois gates nomeados da
// Frente 4 da fila, provados sobre o código de verdade.
//
// GATE (a) · O CABEÇALHO NÃO ACEITA DADO CRU. `Content-Disposition` sai do
// predicado canônico do core (`isCodigoIngressoValido`, RN-396) e de mais nada
// — com bateria de código ausente, fora do formato e com caractere de controle.
// É a única superfície de ataque nova que a task cria.
//
// GATE (b) · O PDF PARA ONDE O QR PARA. Um caso por estado, chamando o Route
// Handler DE VERDADE: gera em `valido` e `credenciado`, redireciona nos cinco
// restantes, e o botão não é renderizado em nenhum deles. Mais o teste que
// cobra do ARQUIVO GERADO os campos da RN-422 e nenhum a mais — ele lê os bytes
// do PDF, não a intenção do código, e é ele que segura a deriva do segundo
// layout que a spec nomeou como custo.
// =============================================================================

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { isCodigoIngressoValido, type EstadoIngressoPagina } from '@leela/core';

// O leitor da Function é o ÚNICO ponto mockado: tudo o mais nestes testes é o
// código de produção — a rota, o gerador do PDF e a página.
vi.mock('../lib/ingresso', async (original) => {
  const real = await original<typeof import('../lib/ingresso')>();
  return { ...real, buscarIngressoPorLink: vi.fn() };
});

import { buscarIngressoPorLink, type IngressoProjetado } from '../lib/ingresso';
import {
  bytesDoQr,
  contentDispositionIngresso,
  conteudoDoPdf,
  gerarPdfIngresso,
  nomeArquivoIngresso,
  textoParaPdf,
} from '../lib/ingressoPdf';
import { GET } from '../app/(public)/ingresso/[token]/pdf/route';
import IngressoPage from '../app/(public)/ingresso/[token]/page';
import ImprimirIngressoPage from '../app/(public)/ingresso/[token]/imprimir/page';

afterEach(cleanup);

const buscar = vi.mocked(buscarIngressoPorLink);

/** PNG 1×1 — o QR de mentira, do mesmo formato que a Function projeta. */
const QR_FAKE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const TOKEN = 'LLIP1.k1.YWJj.ZGVm';

type Override = { [K in keyof IngressoProjetado]?: IngressoProjetado[K] | undefined };

function projecao(over: Override = {}): IngressoProjetado {
  return {
    estado: 'valido',
    titular: 'Marina Corredora',
    evento: {
      nome: 'Meia Maratona Floripa 2026',
      dataISO: '2026-09-13T09:00:00.000Z',
      local: 'Beira-Mar Norte, Florianópolis/SC',
    },
    modalidade: '21k',
    kit: 'Kit Prata',
    tamanho: 'M',
    codigo: 'AB2CD3',
    qrDataUri: QR_FAKE,
    ...over,
  } as IngressoProjetado;
}

const SEM_QR: readonly EstadoIngressoPagina[] = [
  'emitindo',
  'pendente',
  'cancelado',
  'estornado',
  'encerrado',
];

function chamarRota(token = TOKEN): Promise<Response> {
  return GET(new Request(`http://localhost/ingresso/${token}/pdf`), { params: { token } });
}

beforeEach(() => {
  buscar.mockReset();
});

// ---------------------------------------------------------------------------
// GATE (a) — o cabeçalho não aceita dado cru
// ---------------------------------------------------------------------------

describe('gate (a) · o nome do arquivo passa pelo predicado do core (RN-473 · RN-396)', () => {
  it('código canônico vira `ingresso-<codigo>.pdf`', () => {
    expect(nomeArquivoIngresso('AB2CD3')).toBe('ingresso-AB2CD3.pdf');
    expect(contentDispositionIngresso('AB2CD3')).toBe(
      'attachment; filename="ingresso-AB2CD3.pdf"'
    );
  });

  it.each([
    ['ausente (undefined)', undefined],
    ['ausente (null)', null],
    ['ausente (vazio)', ''],
    ['número em vez de texto', 123456],
    ['minúscula', 'ab2cd3'],
    ['curto demais', 'AB2CD'],
    ['longo demais', 'AB2CD3X'],
    ['com o zero ambíguo', 'AB0CD3'],
    ['com o um ambíguo', 'AB1CD3'],
    ['com a letra I', 'ABICD3'],
    ['com a letra O', 'ABOCD3'],
    ['com a letra L', 'ABLCD3'],
    ['com espaço', 'AB 2CD3'],
    ['com hífen', 'AB-CD3'],
  ])('código %s cai em `ingresso.pdf`', (_caso, codigo) => {
    expect(nomeArquivoIngresso(codigo)).toBe('ingresso.pdf');
  });

  it.each([
    ['CRLF + cabeçalho injetado', 'AB2CD3\r\nX-Injetado: sim'],
    ['LF sozinho', 'AB2CD3\nSet-Cookie: a=b'],
    ['CR sozinho', 'AB2CD3\rLocation: https://evil.test'],
    ['NUL', 'AB2CD3\u0000'],
    ['aspas fechando o filename', 'AB2CD3"; filename="roubado.pdf'],
    ['ponto-e-vírgula', 'AB2CD3; x=1'],
    ['travessia de caminho', '../../etc/passwd'],
    ['barra invertida', 'AB2CD3\\..\\a'],
    ['gigante', 'A'.repeat(10_000)],
  ])('injeção por %s não chega ao cabeçalho', (_caso, codigo) => {
    const cabecalho = contentDispositionIngresso(codigo);
    expect(cabecalho).toBe('attachment; filename="ingresso.pdf"');
    expect(/[\r\n\u0000]/.test(cabecalho)).toBe(false);
  });

  it('o cabeçalho tem UMA forma possível, qualquer que seja a entrada', () => {
    const hostis: unknown[] = [
      undefined,
      null,
      '',
      {},
      [],
      42,
      'AB2CD3',
      'ab2cd3',
      'AB2CD3\r\nX: y',
      '"; drop',
      '../..',
      'A'.repeat(10_000),
    ];
    for (const entrada of hostis) {
      expect(contentDispositionIngresso(entrada)).toMatch(
        /^attachment; filename="ingresso(-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6})?\.pdf"$/
      );
    }
  });

  it('a porta é o predicado do CORE — não um sanitizador local que só concorda por acaso', () => {
    // A propriedade que amarra as duas coisas: o nome só carrega o código
    // quando o predicado canônico aceita o valor. Se alguém trocar a porta por
    // um regex próprio, este teste é o que quebra.
    const amostra: unknown[] = [
      'AB2CD3',
      'ZZZZZZ',
      '234567',
      'ab2cd3',
      'AB0CD3',
      'AB2CD',
      'AB2CD3X',
      '',
      undefined,
      null,
      42,
      'AB2CD3\r\n',
    ];
    for (const valor of amostra) {
      const carregaCodigo = nomeArquivoIngresso(valor) !== 'ingresso.pdf';
      expect(carregaCodigo).toBe(isCodigoIngressoValido(valor));
    }
  });

  it('a rota devolve o cabeçalho montado por essa porta, e não por concatenação própria', async () => {
    buscar.mockResolvedValue({ situacao: 'ok', ingresso: projecao() });
    const r = await chamarRota();
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/pdf');
    expect(r.headers.get('content-disposition')).toBe(
      'attachment; filename="ingresso-AB2CD3.pdf"'
    );
  });

  it('projeção com código sujo desce como `ingresso.pdf`, sem cabeçalho quebrado', async () => {
    buscar.mockResolvedValue({
      situacao: 'ok',
      ingresso: projecao({ codigo: 'AB2CD3\r\nX-Injetado: sim' }),
    });
    const r = await chamarRota();
    expect(r.status).toBe(200);
    expect(r.headers.get('content-disposition')).toBe('attachment; filename="ingresso.pdf"');
  });
});

// ---------------------------------------------------------------------------
// GATE (b) — o PDF para onde o QR para
// ---------------------------------------------------------------------------

describe('gate (b) · o PDF existe onde o QR existe (RN-473 sobre RN-421)', () => {
  it.each(['valido', 'credenciado'] as const)('%s GERA o arquivo', async (estado) => {
    buscar.mockResolvedValue({
      situacao: 'ok',
      ingresso: projecao(
        estado === 'credenciado' ? { estado, credenciadoEm: '2026-09-13T09:12:00.000Z' } : { estado }
      ),
    });
    const r = await chamarRota();
    expect(r.status).toBe(200);
    const bytes = new Uint8Array(await r.arrayBuffer());
    expect(Buffer.from(bytes.subarray(0, 5)).toString('latin1')).toBe('%PDF-');
    expect(bytes.byteLength).toBeGreaterThan(500);
  });

  it.each(SEM_QR)('%s NÃO gera arquivo: volta para a página', async (estado) => {
    buscar.mockResolvedValue({
      situacao: 'ok',
      ingresso: projecao({ estado, qrDataUri: undefined }),
    });
    const r = await chamarRota();
    expect(r.status).toBe(303);
    expect(r.headers.get('location')).toBe(`/ingresso/${encodeURIComponent(TOKEN)}`);
    expect(r.headers.get('content-disposition')).toBeNull();
    expect((await r.arrayBuffer()).byteLength).toBe(0);
  });

  it('estado sem QR NÃO gera nem quando a projeção traz a imagem (a regra é o estado)', async () => {
    // Contrato explícito: a guarda da rota é `estadoMostraQr`, não a presença
    // do campo. Um `qrDataUri` que vazasse para um estado terminal não pode
    // virar arquivo — arquivo congela, e um PDF de ingresso cancelado seria
    // mostrado no credenciamento sem nenhuma superfície capaz de corrigi-lo.
    buscar.mockResolvedValue({
      situacao: 'ok',
      ingresso: projecao({ estado: 'cancelado', qrDataUri: QR_FAKE }),
    });
    expect((await chamarRota()).status).toBe(303);
  });

  it('estado que mostra QR mas sem imagem embutível também volta — nada de arquivo pela metade', async () => {
    for (const qr of [undefined, '', 'data:image/png;base64,', 'https://exemplo.test/qr.png']) {
      buscar.mockResolvedValue({ situacao: 'ok', ingresso: projecao({ qrDataUri: qr }) });
      const r = await chamarRota();
      expect(r.status).toBe(303);
    }
  });

  it.each(['nao_encontrado', 'indisponivel'] as const)(
    '%s devolve a MESMA resposta dos estados sem QR — sem oráculo (RN-419)',
    async (situacao) => {
      buscar.mockResolvedValue({ situacao });
      const r = await chamarRota();
      expect(r.status).toBe(303);
      expect(r.headers.get('location')).toBe(`/ingresso/${encodeURIComponent(TOKEN)}`);
    }
  );

  it('as sete negativas são indistinguíveis entre si, byte a byte', async () => {
    const respostas: string[] = [];
    for (const estado of SEM_QR) {
      buscar.mockResolvedValue({
        situacao: 'ok',
        ingresso: projecao({ estado, qrDataUri: undefined }),
      });
      respostas.push(await assinaturaDaResposta(await chamarRota()));
    }
    for (const situacao of ['nao_encontrado', 'indisponivel'] as const) {
      buscar.mockResolvedValue({ situacao });
      respostas.push(await assinaturaDaResposta(await chamarRota()));
    }
    expect(new Set(respostas).size).toBe(1);
  });

  it('o token não escapa do segmento de caminho no redirecionamento', async () => {
    buscar.mockResolvedValue({ situacao: 'nao_encontrado' });
    const r = await chamarRota('..%2F..%2Fevil.test');
    const location = r.headers.get('location') ?? '';
    expect(location.startsWith('/ingresso/')).toBe(true);
    expect(location.slice('/ingresso/'.length)).not.toContain('/');
    expect(/[\r\n]/.test(location)).toBe(false);
  });

  it('a rota NÃO escreve nada: a única chamada de saída é a leitura da projeção (RN-418)', async () => {
    buscar.mockResolvedValue({ situacao: 'ok', ingresso: projecao() });
    await chamarRota();
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(buscar).toHaveBeenCalledWith(TOKEN);
  });

  it('o estado é lido NO ATO — duas chamadas seguidas obedecem a duas verdades', async () => {
    buscar.mockResolvedValueOnce({ situacao: 'ok', ingresso: projecao() });
    expect((await chamarRota()).status).toBe(200);
    buscar.mockResolvedValueOnce({
      situacao: 'ok',
      ingresso: projecao({ estado: 'cancelado', qrDataUri: undefined }),
    });
    expect((await chamarRota()).status).toBe(303);
  });

  it('a resposta do arquivo não pode ser guardada por proxy nem indexada (RN-422)', async () => {
    buscar.mockResolvedValue({ situacao: 'ok', ingresso: projecao() });
    const r = await chamarRota();
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
    expect(r.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });
});

/** Assinatura comparável de uma resposta — status, cabeçalhos e corpo. */
async function assinaturaDaResposta(r: Response): Promise<string> {
  const cabecalhos = [...r.headers.entries()].sort().map(([k, v]) => `${k}: ${v}`);
  return JSON.stringify([r.status, cabecalhos, (await r.arrayBuffer()).byteLength]);
}

// ---------------------------------------------------------------------------
// O que o arquivo carrega — lido dos BYTES do PDF
// ---------------------------------------------------------------------------

/**
 * Texto legível de dentro do PDF: infla os streams comprimidos e traduz as
 * strings hexadecimais que as fontes padrão produzem. É o que permite cobrar do
 * ARQUIVO, e não do código que o escreve.
 */
function textoDoPdf(bytes: Uint8Array): string {
  const bruto = Buffer.from(bytes).toString('latin1');
  let inflado = '';
  let i = 0;
  for (;;) {
    const abre = bruto.indexOf('stream', i);
    if (abre < 0) break;
    let corpo = abre + 'stream'.length;
    if (bruto[corpo] === '\r') corpo += 1;
    if (bruto[corpo] === '\n') corpo += 1;
    const fecha = bruto.indexOf('endstream', corpo);
    if (fecha < 0) break;
    try {
      inflado += `${inflateSync(Buffer.from(bruto.slice(corpo, fecha), 'latin1')).toString('latin1')}\n`;
    } catch {
      // Stream que não é Flate (ou binário de imagem) — não interessa ao texto.
    }
    i = fecha + 'endstream'.length;
  }
  const tudo = `${bruto}\n${inflado}`;
  let hex = '';
  for (const achado of tudo.matchAll(/<([0-9A-Fa-f]{4,})>/g)) {
    hex += `${Buffer.from(achado[1] ?? '', 'hex').toString('latin1')}\n`;
  }
  return `${tudo}\n${hex}`;
}

describe('o que o arquivo carrega (RN-422) e o que ele nunca carrega (RN-419)', () => {
  it('a leitura do PDF funciona — controle positivo antes de qualquer "não contém"', async () => {
    const texto = textoDoPdf(await gerarPdfIngresso(projecao()));
    // Sem este controle, um "não contém" passaria mesmo se o leitor estivesse
    // devolvendo string vazia — que é como teste de privacidade vira teatro.
    expect(texto).toContain('AB2CD3');
    expect(texto).toContain('Marina Corredora');
  });

  it('leva o mínimo da RN-422: titular, evento com data e local, modalidade, kit, estado e aviso', async () => {
    const texto = textoDoPdf(
      await gerarPdfIngresso(projecao({ estado: 'credenciado', credenciadoEm: '2026-09-13T09:12:00.000Z' }))
    );
    for (const esperado of [
      'Marina Corredora',
      'Meia Maratona Floripa 2026',
      '13 de setembro de 2026',
      'Beira-Mar Norte',
      '21k',
      'Kit Prata',
      'tamanho M',
      'Credenciado',
      'AB2CD3',
      'A presen', // início do aviso do estado, sem depender do acento no meio
    ]) {
      expect(texto).toContain(esperado);
    }
  });

  it('e NADA além disso, mesmo com projeção contaminada', async () => {
    const contaminada = {
      ...projecao(),
      cpf: '12345678909',
      telefone: '48999990000',
      email: 'marina@exemplo.test',
      nascimento: '1990-04-01',
      endereco: 'Rua das Palmeiras 404',
      contatoEmergencia: 'Joao 48988887777',
      respostasFormulario: { camisa: 'sim' },
      valorPago: 18900,
      qrToken: 'LLQR1.k1.abc.def',
      linkIngresso: `https://leela.test/ingresso/${TOKEN}`,
    } as unknown as IngressoProjetado;

    const texto = textoDoPdf(await gerarPdfIngresso(contaminada));
    for (const proibido of [
      '12345678909',
      '48999990000',
      'marina@exemplo.test',
      '1990-04-01',
      'Palmeiras',
      '48988887777',
      'camisa',
      'LLQR1',
      'leela.test',
    ]) {
      expect(texto).not.toContain(proibido);
    }
  });

  it('o ARQUIVO não carrega o link nem o token (RN-419 aplicada a arquivo)', async () => {
    const texto = textoDoPdf(await gerarPdfIngresso(projecao()));
    expect(texto).not.toContain(TOKEN);
    expect(texto).not.toContain('LLIP1');
    expect(texto).not.toContain('/ingresso/');
    // A garantia real é de ASSINATURA: o gerador recebe a projeção e só ela.
    expect(gerarPdfIngresso.length).toBe(1);
  });

  it('o arquivo baixado pela ROTA também não leva o token, ponta a ponta', async () => {
    buscar.mockResolvedValue({ situacao: 'ok', ingresso: projecao() });
    const r = await chamarRota();
    const texto = textoDoPdf(new Uint8Array(await r.arrayBuffer()));
    expect(texto).not.toContain(TOKEN);
    expect(texto).toContain('AB2CD3');
  });

  it('nome de pessoa não entra no nome do arquivo (RN-473)', async () => {
    buscar.mockResolvedValue({ situacao: 'ok', ingresso: projecao() });
    const cabecalho = (await chamarRota()).headers.get('content-disposition') ?? '';
    // O titular está DENTRO do arquivo (a RN-422 manda) e nunca no nome dele:
    // nome de pessoa em nome de arquivo vaza na lista de downloads, no seletor
    // de anexo e na tela compartilhada.
    expect(cabecalho).toBe('attachment; filename="ingresso-AB2CD3.pdf"');
    for (const pedaco of ['Marina', 'marina', 'Corredora']) {
      expect(cabecalho).not.toContain(pedaco);
    }
  });

  it('a lista de campos é FECHADA — o PDF não faz spread da projeção', () => {
    const conteudo = conteudoDoPdf({
      ...projecao(),
      valorPago: 18900,
    } as unknown as IngressoProjetado);
    expect(conteudo.campos.map((c) => c.termo)).toEqual([
      'Evento',
      'Data',
      'Local',
      'Modalidade',
      'Kit',
    ]);
    expect(JSON.stringify(conteudo)).not.toContain('18900');
  });

  it('a copy do estado sai da MESMA fonte que a página usa — nada de segunda redação', async () => {
    const { ESTADO_INGRESSO_UI } = await import('../lib/ingresso');
    for (const estado of ['valido', 'credenciado'] as const) {
      const conteudo = conteudoDoPdf(projecao({ estado }));
      expect(conteudo.estado).toBe(ESTADO_INGRESSO_UI[estado].rotulo);
      expect(conteudo.aviso).toBe(ESTADO_INGRESSO_UI[estado].aviso);
    }
  });
});

describe('robustez do gerador', () => {
  it('nome com caractere que a fonte do PDF não escreve não derruba o download', async () => {
    const bytes = await gerarPdfIngresso(
      projecao({
        titular: 'Marina 🏃 Corredora',
        evento: {
          nome: 'Corrida 東京 2026',
          dataISO: '2026-09-13T09:00:00.000Z',
          local: 'Beira-Mar Norte, Florianópolis/SC',
        },
      })
    );
    expect(Buffer.from(bytes.subarray(0, 5)).toString('latin1')).toBe('%PDF-');
    expect(textoDoPdf(bytes)).toContain('Corredora');
  });

  it('acento do português atravessa inteiro', () => {
    expect(textoParaPdf('Florianópolis, São José, Ilhéus')).toBe(
      'Florianópolis, São José, Ilhéus'
    );
    expect(textoParaPdf('a\u0000b')).toBe('a b');
  });

  it('o QR só é aceito como PNG em data URI', () => {
    expect(bytesDoQr(QR_FAKE)).not.toBeNull();
    expect(bytesDoQr(undefined)).toBeNull();
    expect(bytesDoQr('https://exemplo.test/qr.png')).toBeNull();
    expect(bytesDoQr('data:image/svg+xml;base64,PHN2Zy8+')).toBeNull();
  });

  it('gerar sem QR embutível LANÇA — nunca devolve um documento sem o que serve', async () => {
    await expect(gerarPdfIngresso(projecao({ qrDataUri: undefined }))).rejects.toThrow(
      'ingresso_sem_qr'
    );
  });
});

// ---------------------------------------------------------------------------
// O botão na página
// ---------------------------------------------------------------------------

describe('o botão "Salvar como PDF" na página do ingresso (RN-473)', () => {
  it.each(['valido', 'credenciado'] as const)('%s: o botão aparece e é link de verdade', async (estado) => {
    buscar.mockResolvedValue({ situacao: 'ok', ingresso: projecao({ estado }) });
    render(await IngressoPage({ params: { token: TOKEN } }));

    const botao = screen.getByTestId('ingresso-baixar-pdf');
    expect(botao.tagName).toBe('A');
    expect(botao.getAttribute('href')).toBe(`/ingresso/${encodeURIComponent(TOKEN)}/pdf`);
    expect(botao.textContent).toBe('Salvar como PDF');
    // WCAG 2.5.3: o texto visível está DENTRO do nome acessível, na mesma ordem.
    expect(botao.getAttribute('aria-label')).toBe('Salvar ingresso como PDF');
    expect(botao.getAttribute('aria-label')).toContain('Salvar');
    expect(botao.hasAttribute('download')).toBe(true);
    // Alvo de toque e anel de foco por TOKEN do DS — zero valor cru.
    expect(botao.className).toContain('h-[var(--btn-height-lg)]');
    expect(botao.className).toContain('focus-visible:ring-ring');
    expect(/#[0-9a-fA-F]{3,8}\b/.test(botao.className)).toBe(false);
  });

  it.each(SEM_QR)('%s: o botão NÃO é renderizado, e a versão para imprimir continua', async (estado) => {
    buscar.mockResolvedValue({
      situacao: 'ok',
      ingresso: projecao({ estado, qrDataUri: undefined }),
    });
    render(await IngressoPage({ params: { token: TOKEN } }));
    expect(screen.queryByTestId('ingresso-baixar-pdf')).toBeNull();
    expect(screen.getByText('Versão para imprimir')).toBeTruthy();
  });

  it.each(['nao_encontrado', 'indisponivel'] as const)(
    '%s: nem botão, nem link de impressão',
    async (situacao) => {
      buscar.mockResolvedValue({ situacao });
      render(await IngressoPage({ params: { token: TOKEN } }));
      expect(screen.queryByTestId('ingresso-baixar-pdf')).toBeNull();
      expect(screen.queryByText('Versão para imprimir')).toBeNull();
    }
  );

  it('a folha de impressão NÃO ganha o botão — dois nomes parecidos na mesma folha confundem', async () => {
    buscar.mockResolvedValue({ situacao: 'ok', ingresso: projecao() });
    render(await ImprimirIngressoPage({ params: { token: TOKEN } }));
    expect(screen.queryByTestId('ingresso-baixar-pdf')).toBeNull();
  });

  it('a copy da folha parou de disputar o nome do botão', async () => {
    buscar.mockResolvedValue({ situacao: 'ok', ingresso: projecao() });
    const { container } = render(await ImprimirIngressoPage({ params: { token: TOKEN } }));
    expect(container.textContent).not.toContain('escolha “Salvar como PDF”');
    expect(container.textContent).toContain('comando de impressão do navegador');
    expect(container.textContent).toContain('volte ao ingresso');
  });
});

// ---------------------------------------------------------------------------
// A biblioteca de PDF não chega ao navegador
// ---------------------------------------------------------------------------

describe('nenhuma dependência nova no bundle público (critério de aceite da S1214)', () => {
  const RAIZ = resolve(__dirname, '..');

  function fontes(pasta: string): string[] {
    return readdirSync(resolve(RAIZ, pasta), { recursive: true, encoding: 'utf8' })
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => resolve(RAIZ, pasta, f));
  }

  const arquivos = [...fontes('app'), ...fontes('lib')];

  it('`pdf-lib` é importado por UM arquivo só, e ele é de servidor', () => {
    const importam = arquivos.filter((f) => /from '(pdf-lib)'/.test(readFileSync(f, 'utf8')));
    expect(importam.map((f) => f.replace(RAIZ, '').replace(/\\/g, '/'))).toEqual([
      '/lib/ingressoPdf.ts',
    ]);
  });

  it('o gerador só é alcançado pelo Route Handler — nenhum componente de cliente o toca', () => {
    const consumidores = arquivos.filter(
      (f) => f.endsWith('ingressoPdf.ts') === false && /ingressoPdf/.test(readFileSync(f, 'utf8'))
    );
    expect(consumidores.map((f) => f.replace(RAIZ, '').replace(/\\/g, '/'))).toEqual([
      '/app/(public)/ingresso/[token]/pdf/route.ts',
    ]);
  });

  it('nenhum arquivo com `use client` encosta no gerador nem na biblioteca', () => {
    const clientes = arquivos.filter((f) => /^['"]use client['"]/m.test(readFileSync(f, 'utf8')));
    expect(clientes.length).toBeGreaterThan(0); // controle: existem clientes na landing
    for (const f of clientes) {
      const fonte = readFileSync(f, 'utf8');
      expect(fonte).not.toContain('pdf-lib');
      expect(fonte).not.toContain('ingressoPdf');
    }
  });

  it('a rota do arquivo roda em Node e é sempre dinâmica', () => {
    const fonte = readFileSync(
      resolve(RAIZ, 'app/(public)/ingresso/[token]/pdf/route.ts'),
      'utf8'
    );
    expect(fonte).toContain("export const runtime = 'nodejs'");
    expect(fonte).toContain("export const dynamic = 'force-dynamic'");
  });

  it('a chave NÃO desce para a landing e a rota não lê banco (RN-419 · D-ING-3)', () => {
    // Só o CÓDIGO, sem os comentários — o cabeçalho do arquivo cita
    // `QR_TOKEN_KEYS` de propósito, para dizer que ele não entra aqui.
    const codigo = readFileSync(resolve(RAIZ, 'app/(public)/ingresso/[token]/pdf/route.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(codigo).not.toContain('QR_TOKEN_KEYS');
    expect(codigo).not.toContain('process.env');
    expect(codigo).not.toContain('firebase-admin');
    expect(codigo).not.toContain('firebaseAdmin');
    // A única porta de saída continua sendo a Function, pelo leitor que a
    // página já usa.
    expect(codigo).toContain('buscarIngressoPorLink');
  });

  it('os três cabeçalhos da RN-422 já cobrem a rota nova pelo `*` do next.config', async () => {
    const config = require('../next.config.js') as {
      headers?: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
    };
    const regra = ((await config.headers?.()) ?? []).find((r) => r.source.startsWith('/ingresso'));
    // `/ingresso/:token*` casa `/ingresso/{token}/pdf` como já casava
    // `/ingresso/{token}/imprimir` — nenhuma linha nova de configuração.
    expect(regra?.source).toBe('/ingresso/:token*');
  });
});
