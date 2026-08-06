// =============================================================================
// InputSenha — o campo de senha da casa (FRONTEIRA-AUTH · pedido do dono).
//
// O dono pediu três coisas: ver a senha enquanto digita, uma regra de composição
// (número + caractere especial) e um indicador de força. As três valem para as
// NOVE superfícies com campo de senha que o repo tem hoje — quatro no painel
// (`/entrar`, `/cadastrar`, `/redefinir-senha`, `/conta`) e cinco na landing
// (`/definir-senha`, overlay de login, os dois convites, troca de senha da área
// do cliente). Dezessete campos. Colar o mesmo `useState(visivel)` dezessete
// vezes é a garantia de que a décima oitava tela vai esquecer o `type="button"`
// (submete o formulário) ou o `autoComplete` (mata o gerenciador de senha).
//
// -----------------------------------------------------------------------------
// POR QUE ESTE COMPONENTE NÃO CONHECE A POLÍTICA DE SENHA
// -----------------------------------------------------------------------------
// A régua (quantos caracteres, quais requisitos, o que é "forte") vive em
// `@leela/core` · `platform/politicaDeSenha`, porque o SERVIDOR precisa dela e
// o design system não é dependência de Cloud Function. Aqui entra só a
// APRESENTAÇÃO: o consumidor passa `avaliacao={avaliarSenha(senha)}` e este
// componente desenha. Mesmo desenho de `PlatformGuard` (presentacional) com
// `PlatformShell` (contêiner) — e é o que impede o DS de virar dono de regra
// de negócio.
//
// O tipo `AvaliacaoDeSenha` abaixo é estrutural de propósito: `AvaliacaoSenha`
// do core satisfaz sem nenhum import cruzado entre os dois pacotes.
//
// -----------------------------------------------------------------------------
// A COR NÃO É O PORTADOR DO SIGNIFICADO
// -----------------------------------------------------------------------------
// A força é sempre uma PALAVRA ("Fraca", "Média", "Forte"), e as barras são
// contagem além de cor: uma acesa, duas, três. Quem não distingue verde de
// âmbar lê o rótulo e conta os segmentos. WCAG 1.4.1.
// =============================================================================

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Input, type InputProps } from '../Input/Input';
import { IconButton } from '../IconButton/IconButton';

// ---------------------------------------------------------------------------
// Contrato com a política (estrutural — sem import do core)
// ---------------------------------------------------------------------------

export type NivelForcaSenha = 'vazia' | 'fraca' | 'media' | 'forte';

/**
 * O que o medidor precisa saber. `avaliarSenha()` de `@leela/core` devolve um
 * objeto que satisfaz este tipo — passe o retorno inteiro.
 */
export interface AvaliacaoDeSenha {
  forca: NivelForcaSenha;
  /** Palavra mostrada ("Fraca" | "Média" | "Forte"). */
  rotulo: string;
  /** O que ainda falta, em português. Vazio quando a senha atende à regra. */
  pendencias?: readonly string[];
}

export interface InputSenhaProps extends Omit<InputProps, 'type' | 'trailing'> {
  /**
   * Avaliação da política. Ausente = campo de senha SEM medidor — é o caso do
   * login, onde medir a força de uma senha já existente não orienta ninguém e
   * só entrega ao ombro do vizinho que a senha da pessoa é fraca.
   */
  avaliacao?: AvaliacaoDeSenha;
  /** Rótulo acessível do botão quando a senha está oculta. */
  rotuloMostrar?: string;
  /** Rótulo acessível do botão quando a senha está visível. */
  rotuloOcultar?: string;
}

// ---------------------------------------------------------------------------
// Medidor
// ---------------------------------------------------------------------------

const SEGMENTOS_ACESOS: Record<NivelForcaSenha, number> = {
  vazia: 0,
  fraca: 1,
  media: 2,
  forte: 3,
};

const COR_DA_FORCA: Record<NivelForcaSenha, string> = {
  vazia: 'bg-[var(--border-subtle)]',
  fraca: 'bg-[var(--feedback-danger)]',
  media: 'bg-[var(--feedback-warning)]',
  forte: 'bg-[var(--feedback-success)]',
};

const COR_DO_ROTULO: Record<NivelForcaSenha, string> = {
  vazia: 'text-[var(--text-tertiary)]',
  fraca: 'text-[var(--feedback-danger-fg)]',
  media: 'text-[var(--feedback-warning-fg)]',
  forte: 'text-[var(--feedback-success-fg)]',
};

interface MedidorProps {
  avaliacao: AvaliacaoDeSenha;
  id: string;
}

function MedidorDeForca({ avaliacao, id }: MedidorProps): JSX.Element {
  const acesos = SEGMENTOS_ACESOS[avaliacao.forca];
  const pendencias = avaliacao.pendencias ?? [];

  return (
    <div className="flex flex-col gap-[var(--spacing-1)]" id={id}>
      {/* Barras: aria-hidden porque a informação inteira já está no texto
          abaixo. Anunciar "três divs" não ajuda ninguém. */}
      <div aria-hidden className="flex gap-[var(--spacing-1)]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'h-[var(--spacing-1)] flex-1 rounded-[var(--radius-sm)]',
              'transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
              i < acesos ? COR_DA_FORCA[avaliacao.forca] : 'bg-[var(--border-subtle)]',
            )}
          />
        ))}
      </div>
      {/* Região polida: o leitor de tela só ouve quando o NÍVEL muda, porque é
          só isso que o texto contém. Digitar dentro do mesmo nível não gera
          anúncio — é a pausa que o brief pediu, obtida por conteúdo estável e
          não por debounce. */}
      <p
        aria-live="polite"
        className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
      >
        {avaliacao.forca === 'vazia' ? null : (
          <>
            <span className={cn('font-[var(--font-weight-semibold)]', COR_DO_ROTULO[avaliacao.forca])}>
              Senha {avaliacao.rotulo.toLowerCase()}
            </span>
            {pendencias.length > 0 ? <>. Falta {listar(pendencias)}.</> : null}
          </>
        )}
      </p>
    </div>
  );
}

/** "a, b e c" — a conjunção que o português usa, para a frase não sair robótica. */
function listar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens[0] ?? '';
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

const InputSenha = React.forwardRef<HTMLInputElement, InputSenhaProps>(
  (
    {
      avaliacao,
      rotuloMostrar = 'Mostrar a senha',
      rotuloOcultar = 'Ocultar a senha',
      id,
      'aria-describedby': ariaDescribedBy,
      className,
      ...props
    },
    ref,
  ) => {
    // Começa OCULTA, sempre. Um campo que nasce visível expõe a senha de quem
    // usa gerenciador e nem pensou em digitar.
    const [visivel, setVisivel] = React.useState(false);
    const reactId = React.useId();
    const fieldId = id ?? reactId;
    const medidorId = `${fieldId}-forca`;

    // O MESMO nó de input nos dois estados — só o atributo `type` muda. Trocar
    // o elemento (dois `<input>` alternados, ou key diferente) faz o React
    // desmontar e remontar: o gerenciador de senha perde o campo que estava
    // preenchendo e o cursor volta ao início.
    const descritores = [ariaDescribedBy, avaliacao ? medidorId : null]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="flex flex-col gap-[var(--spacing-2)]">
        <Input
          ref={ref}
          id={fieldId}
          type={visivel ? 'text' : 'password'}
          className={cn(
            // O Edge injeta um "olho" nativo próprio em campos de senha. Sem
            // isto a tela fica com DOIS olhos, um deles fora do nosso controle
            // de foco e de rótulo.
            '[&::-ms-reveal]:hidden [&::-ms-clear]:hidden',
            className,
          )}
          {...(descritores ? { 'aria-describedby': descritores } : {})}
          trailing={
            <IconButton
              // type="button" vem do IconButton (default). Registrado aqui
              // porque um botão sem type DENTRO de <form> submete o formulário
              // — é o defeito nº 1 desta feature.
              aria-label={visivel ? rotuloOcultar : rotuloMostrar}
              aria-pressed={visivel}
              aria-controls={fieldId}
              disabled={props.disabled}
              // O clique NÃO tira o foco do campo nem move o cursor: o
              // mousedown padrão é que rouba o foco, e é ele que cancelamos.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setVisivel((v) => !v)}
            >
              {visivel ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </IconButton>
          }
          {...props}
        />
        {avaliacao ? <MedidorDeForca avaliacao={avaliacao} id={medidorId} /> : null}
      </div>
    );
  },
);
InputSenha.displayName = 'InputSenha';

export { InputSenha };
