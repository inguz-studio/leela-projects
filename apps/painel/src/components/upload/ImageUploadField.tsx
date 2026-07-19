// =============================================================================
// ImageUploadField — campo de imagem UPLOAD-ONLY compartilhado do painel
// (DEC-0719 · RN-168 ampliada + RN-170). NÃO é componente do DS: compõe o
// `FileInput` do DS + preview + ajuste de proporção; vive no painel porque é
// orquestração de fluxo (validar → ajustar → subir → preencher), não um
// primitivo visual.
//
// Consolida 3 near-duplicates que existiam soltos (perfil público avatar/capa,
// capa de clube): cada tela repetia estado de envio + erro + preview + o par
// "FileInput | Input de URL". Aqui há UM caminho — upload — e o "cole uma URL"
// deixa de existir (RN-168: a URL colada morre em todas as superfícies).
//
// Contrato:
//   - `onUpload(file)` sobe o arquivo (seam do api-client) e resolve a
//     downloadURL; o componente chama `onChange(url)` com ela. PERSISTIR não é
//     responsabilidade daqui — segue no "Salvar" da tela (caminho único de
//     escrita do doc), exceto quando a tela persiste na hora (ela decide no
//     onChange). Erro do onUpload vira erro inline (role=alert do FileInput).
//   - `aspecto` = proporção contratada da superfície (RN-170): a imagem é
//     ajustada por COVER antes de subir e o preview usa a MESMA proporção
//     (WYSIWYG). `forma='circulo'` para avatar 1:1.
//
// Reuso: validação de tipo/tamanho = `problemaDoArquivoImagem` (api-client, a
// mesma das storage.rules); ajuste = `ajustarProporcaoImagem` (RN-170).
// =============================================================================

import { useState } from 'react';
import { Button, FileInput } from '@leela/design-system';
import { problemaDoArquivoImagem, IMAGEM_UPLOAD_MAX_BYTES } from '@leela/api-client';
import { ajustarProporcaoImagem } from './ajustarProporcao';

export interface ImageUploadFieldProps {
  /** id base (o FileInput ganha `${id}-arquivo`). */
  id: string;
  /** Label do seletor (também o nome acessível do input). */
  label: string;
  /** Dica abaixo do gatilho. */
  hint?: string;
  /** URL atual da imagem ('' = nenhuma). Decide preview + label "Trocar". */
  value: string;
  /** Recebe a downloadURL após o upload (a tela persiste no seu "Salvar"). */
  onChange: (url: string) => void;
  /** Sobe o arquivo e resolve a downloadURL (seam do api-client). */
  onUpload: (file: File) => Promise<string>;
  /** Proporção-alvo da superfície (RN-170) — ex.: {w:1,h:1} avatar, {w:16,h:9} capa. */
  aspecto: { w: number; h: number };
  /** Forma do preview: retângulo (capa) ou círculo (avatar). Default 'retangulo'. */
  forma?: 'retangulo' | 'circulo';
  /** alt do preview. */
  previewAlt: string;
  /** Maior lado da imagem enviada, em px (default 1600). */
  maxLadoPx?: number;
  /** Teto de bytes da saída (default = teto do upload, 5MB). */
  maxBytes?: number;
  /**
   * Mostra "Remover" quando há imagem (chama `onChange('')`). Preserva o clear
   * que o antigo input de URL dava às capas (vazio → gradiente); default false
   * (avatar/foto seguem o padrão ContaPage sem remover). Rótulo customizável.
   */
  permiteRemover?: boolean;
  removerLabel?: string;
}

/** URL http(s) válida? Só decide se mostra a prévia. @pure */
function urlDeImagemValida(valor: string): boolean {
  const v = valor.trim();
  if (v.length === 0) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ImageUploadField({
  id,
  label,
  hint,
  value,
  onChange,
  onUpload,
  aspecto,
  forma = 'retangulo',
  previewAlt,
  maxLadoPx,
  maxBytes,
  permiteRemover = false,
  removerLabel = 'Remover imagem',
}: ImageUploadFieldProps): JSX.Element {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const temImagem = urlDeImagemValida(value);
  const tetoBytes = maxBytes ?? IMAGEM_UPLOAD_MAX_BYTES;

  async function aoSelecionar(file: File): Promise<void> {
    // 1) Valida tipo/tamanho no ORIGINAL antes de decodificar (rejeita
    //    >5MB/formato cedo). Mesma regra das storage.rules — reuso.
    const problema = problemaDoArquivoImagem(file);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      // 2) Ajusta a proporção por COVER (RN-170). Degrada para o original em
      //    runtime sem canvas (nunca lança).
      const ajustada = await ajustarProporcaoImagem(file, aspecto.w, aspecto.h, {
        ...(maxLadoPx !== undefined ? { maxLadoPx } : {}),
        maxBytes: tetoBytes,
      });
      // 3) Sobe e preenche o campo com a downloadURL.
      const url = await onUpload(ajustada);
      onChange(url);
    } catch (err) {
      setErro(
        err instanceof Error && err.message ? err.message : 'Não foi possível enviar a imagem.'
      );
    } finally {
      setEnviando(false);
    }
  }

  const razao = `${aspecto.w}/${aspecto.h}`;
  const previewCls =
    forma === 'circulo'
      ? 'size-20 overflow-hidden rounded-full bg-[var(--surface-sunken)]'
      : 'overflow-hidden rounded-[var(--card-radius)] bg-[var(--surface-sunken)]';

  return (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <FileInput
        id={`${id}-arquivo`}
        label={label}
        buttonLabel={temImagem ? 'Trocar imagem' : 'Escolher arquivo'}
        busy={enviando}
        {...(hint ? { hint } : {})}
        {...(erro ? { errorMessage: erro } : {})}
        onFileSelected={(file) => void aoSelecionar(file)}
      />
      {temImagem ? (
        <div className={previewCls}>
          <img
            src={value.trim()}
            alt={previewAlt}
            className="h-full w-full object-cover"
            // Proporção dinâmica por superfície (RN-170) — razão sem unidade,
            // permitida pela governança §2. Círculo já é 1:1 via `size-20`.
            {...(forma === 'retangulo' ? { style: { aspectRatio: razao } } : {})}
          />
        </div>
      ) : null}
      {temImagem && permiteRemover ? (
        <div>
          <Button
            type="button"
            variant="ghost"
            disabled={enviando}
            onClick={() => {
              setErro(null);
              onChange('');
            }}
          >
            {removerLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

ImageUploadField.displayName = 'ImageUploadField';
