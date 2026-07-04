// =============================================================================
// Utilitário de download client-side (S207-T1 · export CSV). Cria um Blob e
// dispara o download via <a download>. Isolado para ser mockável em teste.
// =============================================================================

/** Baixa `conteudo` como arquivo `nomeArquivo` (mime configurável). */
export function baixarTexto(
  conteudo: string,
  nomeArquivo: string,
  mime = 'text/csv;charset=utf-8',
): void {
  const blob = new Blob([conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
