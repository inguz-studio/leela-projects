'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// =============================================================================
// RefTracker — captura do `?ref=` do link de afiliado (R9-E · RN-313).
//
// Grava em localStorage o refCodigo + instante do PRIMEIRO clique, por
// evento (`leela:ref:{slug}`), para o checkout enviar `ref.clicadoEmMillis`
// e o servidor aplicar a janela de atribuição (`dentroDaJanelaAtribuicao`).
//
// Política de clique (espelho do kernel E05):
//   - MESMO refCodigo re-visitado: preserva o clique MAIS ANTIGO (a janela
//     conta do primeiro clique — revisitar não a estica);
//   - refCodigo DIFERENTE: last-click-wins (novo código, novo clique).
//
// O valor é CLAIM do cliente — o servidor clampa e re-checa a janela na
// confirmação; aqui é só conveniência de atribuição. Nada de PII.
// =============================================================================

const REF_RE = /^[A-Z0-9]{4,20}$/;

export function chaveRefStorage(slug: string): string {
  return `leela:ref:${slug}`;
}

export interface RefCapturado {
  codigo: string;
  clicadoEmMillis: number;
}

/** Lê a captura vigente (null = nada capturado/il legível). */
export function lerRefCapturado(slug: string): RefCapturado | null {
  try {
    const raw = window.localStorage.getItem(chaveRefStorage(slug));
    if (raw === null) return null;
    const dados = JSON.parse(raw) as Partial<RefCapturado>;
    if (
      typeof dados.codigo !== 'string' ||
      !REF_RE.test(dados.codigo) ||
      typeof dados.clicadoEmMillis !== 'number' ||
      !Number.isInteger(dados.clicadoEmMillis) ||
      dados.clicadoEmMillis <= 0
    ) {
      return null;
    }
    return { codigo: dados.codigo, clicadoEmMillis: dados.clicadoEmMillis };
  } catch {
    return null;
  }
}

export function RefTracker({ slug }: { slug: string }): null {
  const params = useSearchParams();
  const refBruto = params.get('ref');

  useEffect(() => {
    if (refBruto === null || refBruto.length === 0) return;
    const codigo = refBruto.trim().toUpperCase();
    if (!REF_RE.test(codigo)) return;
    try {
      const atual = lerRefCapturado(slug);
      if (atual !== null && atual.codigo === codigo) return; // 1º clique vale
      window.localStorage.setItem(
        chaveRefStorage(slug),
        JSON.stringify({ codigo, clicadoEmMillis: Date.now() })
      );
    } catch {
      // storage indisponível (modo privado etc.) — atribuição cai no ?ref
      // da própria URL do checkout, com clicadoEm = agora no servidor.
    }
  }, [refBruto, slug]);

  return null;
}
