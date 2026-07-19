// =============================================================================
// AfiliadoModal — config de novo influenciador via MODAL (R9-E · S-R9-11-T4 ·
// RN-317). Modal do DS (4 vias de fechamento — DoD Modal). Dois tipos
// (adendo 3): clube (com mínimo de inscrições RN-315) e pessoa física por
// convite de e-mail (RN-316). Toda decisão sensível (refCodigo/token/
// amarração de cupom) é do SERVIDOR (salvarAfiliado) — aqui só coleta.
//
// Nota shadcn §8 (registrada): o Combobox/DS do lote R9-A ainda não aterrissou
// nesta árvore; cupom/clube entram por Input simples e a troca pelo Combobox
// fica como follow-up de conformidade quando o R9-A mergear (sem mudança de
// contrato).
// =============================================================================

import { useMemo, useState } from 'react';
import { Button, Chip, Input, Modal } from '@leela/design-system';
import type {
  ComissaoAfiliadoClient,
  SalvarAfiliadoClientInput,
  SalvarAfiliadoClientResult,
} from '@leela/api-client';
import type { AfiliadoDoTenant } from '@leela/api-client';
import { isComissaoAfiliadoValida } from '@leela/core';

type TipoComissao = 'nenhuma' | 'percentual' | 'valor_fixo';

/** Reconstrói a config de comissão do formulário (null = sem comissão). */
function montarComissao(tipo: TipoComissao, valor: string): ComissaoAfiliadoClient | null {
  if (tipo === 'nenhuma') return null;
  const n = Number(valor.replace(',', '.'));
  if (tipo === 'percentual') return { tipo: 'percentual', percentual: n };
  return { tipo: 'valor_fixo', valorPorInscricao: n };
}

export interface AfiliadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  /** Afiliado em edição (upsert por refCodigo) — null = novo. */
  afiliado: AfiliadoDoTenant | null;
  /** Salva via callable (container injeta) e devolve o resultado. */
  onSalvar: (
    input: SalvarAfiliadoClientInput
  ) => Promise<SalvarAfiliadoClientResult>;
}

type Tipo = 'clube' | 'pessoa_fisica';

export function AfiliadoModal({
  open,
  onOpenChange,
  eventoId,
  afiliado,
  onSalvar,
}: AfiliadoModalProps): JSX.Element {
  const editando = afiliado !== null;
  const [tipo, setTipo] = useState<Tipo>(afiliado?.tipo ?? 'pessoa_fisica');
  const [nome, setNome] = useState(afiliado?.nome ?? '');
  const [refCodigo, setRefCodigo] = useState(afiliado?.refCodigo ?? '');
  const [canal, setCanal] = useState(afiliado?.canal ?? '');
  const [janela, setJanela] = useState(
    String(afiliado?.janelaAtribuicaoDias ?? 7)
  );
  const [minimo, setMinimo] = useState(
    afiliado?.minimoInscricoes !== null && afiliado?.minimoInscricoes !== undefined
      ? String(afiliado.minimoInscricoes)
      : ''
  );
  const [cupomCodigo, setCupomCodigo] = useState(afiliado?.cupomCodigo ?? '');
  const [clubeRef, setClubeRef] = useState(afiliado?.clubeRef ?? '');
  const [email, setEmail] = useState(afiliado?.responsavelEmail ?? '');
  const [documento, setDocumento] = useState('');
  // FASE 2 (COMF2 · RN-310): config de comissão — o ORGANIZADOR define; mudar
  // só afeta conversões FUTURAS (config congelada por conversão no servidor).
  const comissaoInicial = afiliado?.comissao ?? null;
  const [comTipo, setComTipo] = useState<TipoComissao>(comissaoInicial?.tipo ?? 'nenhuma');
  const [comValor, setComValor] = useState(
    comissaoInicial?.tipo === 'percentual'
      ? String(comissaoInicial.percentual ?? '')
      : comissaoInicial?.tipo === 'valor_fixo'
        ? String(comissaoInicial.valorPorInscricao ?? '')
        : '',
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tokenGerado, setTokenGerado] = useState<string | null>(null);

  const valido = useMemo(() => {
    if (nome.trim().length === 0) return false;
    const j = Number(janela);
    if (!Number.isInteger(j) || j < 1 || j > 90) return false;
    if (minimo.trim() !== '') {
      const m = Number(minimo);
      if (!Number.isInteger(m) || m < 1) return false;
    }
    if (tipo === 'pessoa_fisica' && !editando && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return false;
    }
    if (comTipo !== 'nenhuma') {
      // Espelha o core (isComissaoAfiliadoValida): percentual 0,01..100 passo
      // 0,01 OU valor fixo R$ > 0 cent-exato ≤ teto. O servidor revalida.
      if (!isComissaoAfiliadoValida(montarComissao(comTipo, comValor))) return false;
    }
    return true;
  }, [nome, janela, minimo, tipo, email, editando, comTipo, comValor]);

  async function salvar(): Promise<void> {
    if (!valido || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const input: SalvarAfiliadoClientInput = {
        eventoId,
        tipo,
        nome: nome.trim(),
        janelaAtribuicaoDias: Number(janela),
        minimoInscricoes: minimo.trim() === '' ? null : Number(minimo),
        cupomCodigo: cupomCodigo.trim() === '' ? null : cupomCodigo.trim(),
        // FASE 2: null = sem comissão (ou remover a vigente). Como o form
        // inicia da config atual, não-tocar reenvia a mesma (idempotente).
        comissao: montarComissao(comTipo, comValor),
      };
      if (refCodigo.trim() !== '') input.refCodigo = refCodigo.trim();
      if (canal.trim() !== '') input.canal = canal.trim();
      if (tipo === 'clube' && clubeRef.trim() !== '') input.clubeRef = clubeRef.trim();
      if (tipo === 'pessoa_fisica') {
        input.responsavelEmail = email.trim();
        if (documento.trim() !== '') input.documento = documento.trim();
      }
      const r = await onSalvar(input);
      if (r.tokenAceite !== undefined) {
        // Sem EmailProvider (emulator/flag): o organizador entrega o link.
        setTokenGerado(r.tokenAceite);
      } else {
        onOpenChange(false);
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message;
      setErro(msg && msg.length > 0 ? msg : 'Não foi possível salvar o afiliado.');
    } finally {
      setEnviando(false);
    }
  }

  const footer = tokenGerado === null ? (
    <>
      <Button variant="secondary" onClick={() => onOpenChange(false)}>
        Cancelar
      </Button>
      <Button variant="primary" disabled={!valido || enviando} onClick={() => void salvar()}>
        {enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar afiliado'}
      </Button>
    </>
  ) : (
    <Button variant="primary" onClick={() => onOpenChange(false)}>
      Concluir
    </Button>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editando ? `Editar afiliado · ${afiliado.refCodigo}` : 'Novo influenciador'}
      description="Link rastreável com atribuição por janela e comissão opcional (congelada por conversão)."
      footer={footer}
    >
      {tokenGerado !== null ? (
        <div className="flex flex-col gap-[var(--spacing-3)]">
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
            Convite criado. Sem provedor de e-mail configurado, é você quem
            entrega o link de aceite ao influenciador:
          </p>
          <code className="break-all rounded-[var(--radius-md)] bg-[var(--surface-base)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
            {`/convite/afiliado?e=${encodeURIComponent(eventoId)}&a=${encodeURIComponent(
              refCodigo.trim() !== '' ? refCodigo.trim().toUpperCase() : ''
            )}&t=${tokenGerado}`}
          </code>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            O convite expira em 14 dias. Reenviar = salvar o afiliado de novo
            (re-emite o link).
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-4)]">
          <div className="flex flex-col gap-[var(--spacing-2)]">
            <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
              Tipo de influenciador
            </span>
            <div role="group" aria-label="Tipo de influenciador" className="flex gap-[var(--spacing-2)]">
              <Chip
                active={tipo === 'pessoa_fisica'}
                onClick={() => !editando && setTipo('pessoa_fisica')}
              >
                Pessoa física
              </Chip>
              <Chip active={tipo === 'clube'} onClick={() => !editando && setTipo('clube')}>
                Clube
              </Chip>
            </div>
          </div>

          <Input
            id="afiliado-nome"
            label="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={tipo === 'clube' ? 'Floripa Run Coletivo' : 'Dioney Galharte'}
          />

          <Input
            id="afiliado-ref"
            label="Código do link (opcional — gerado se vazio)"
            value={refCodigo}
            onChange={(e) => setRefCodigo(e.target.value.toUpperCase())}
            placeholder="DIONEY10"
            disabled={editando}
          />

          {tipo === 'pessoa_fisica' ? (
            <>
              <Input
                id="afiliado-email"
                type="email"
                label="E-mail do convite"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="influencer@exemplo.com"
                disabled={editando}
              />
              <Input
                id="afiliado-doc"
                label="CPF (opcional)"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="000.000.000-00"
              />
            </>
          ) : (
            <Input
              id="afiliado-clube"
              label="Clube vinculado (id/slug — opcional)"
              value={clubeRef}
              onChange={(e) => setClubeRef(e.target.value)}
              placeholder="floripa-run"
            />
          )}

          <Input
            id="afiliado-canal"
            label="Canal (opcional)"
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
            placeholder="instagram"
          />

          <div className="grid grid-cols-2 gap-[var(--spacing-4)]">
            <Input
              id="afiliado-janela"
              type="number"
              inputMode="numeric"
              label="Janela de atribuição (dias)"
              value={janela}
              onChange={(e) => setJanela(e.target.value)}
            />
            <Input
              id="afiliado-minimo"
              type="number"
              inputMode="numeric"
              label="Mínimo p/ desconto (opcional)"
              value={minimo}
              onChange={(e) => setMinimo(e.target.value)}
            />
          </div>

          <Input
            id="afiliado-cupom"
            label="Cupom do link (código — opcional)"
            value={cupomCodigo}
            onChange={(e) => setCupomCodigo(e.target.value.toUpperCase())}
            placeholder="FLORIPA10OFF"
          />

          <div className="flex flex-col gap-[var(--spacing-2)] rounded-[var(--radius-md)] bg-[var(--surface-base)] p-[var(--spacing-3)]">
            <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
              Comissão (opcional)
            </span>
            <div role="group" aria-label="Tipo de comissão" className="flex flex-wrap gap-[var(--spacing-2)]">
              <Chip active={comTipo === 'nenhuma'} onClick={() => setComTipo('nenhuma')}>
                Sem comissão
              </Chip>
              <Chip active={comTipo === 'percentual'} onClick={() => setComTipo('percentual')}>
                Percentual sobre a face
              </Chip>
              <Chip active={comTipo === 'valor_fixo'} onClick={() => setComTipo('valor_fixo')}>
                Valor fixo por inscrição
              </Chip>
            </div>
            {comTipo !== 'nenhuma' ? (
              <>
                <Input
                  id="afiliado-comissao-valor"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  label={comTipo === 'percentual' ? 'Percentual (%) — 0,01 a 100' : 'Valor por inscrição (R$)'}
                  value={comValor}
                  onChange={(e) => setComValor(e.target.value)}
                  placeholder={comTipo === 'percentual' ? '10' : '5,00'}
                />
                <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                  Mudanças na comissão valem só para conversões futuras — a config
                  é congelada por conversão (sem retroatividade).
                </p>
              </>
            ) : null}
          </div>

          {erro !== null ? (
            <p role="alert" className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg)]">
              {erro}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

AfiliadoModal.displayName = 'AfiliadoModal';
