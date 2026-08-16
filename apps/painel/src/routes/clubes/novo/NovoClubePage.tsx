// =============================================================================
// NovoClubePage — criação de clube (`/clubes/novo` · fix #14 do review Onda1:
// o CTA primário do hub apontava para rota inexistente e caía no `:slug` com
// "Club não encontrado"). Form controlado com validação do core
// (validarClube), slug derivado do nome (sanitizeSlug — read-only, docId =
// slug por design, mesmo contrato da tela de configurações), codigoConvite
// gerado no submit (RN-101), modelo "Pago" desabilitado (RN-104). Persiste
// via porta criarClubePadrao (write direto — Rules exigem writer + shape +
// ∑ zerados) e navega para o clube criado.
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, CheckboxField, Chip, Input, Select, Textarea, useToast } from '@leela/design-system';
import type { ClubeInput, VisibilidadeClube } from '@leela/core';
import { gerarCodigoConvite, validarClube } from '@leela/core';
import { criarClubePadrao } from '../_data/clubes';
import { useTenantSession } from '../../../lib/session/tenantSession';
import { linkClubePublico } from '../../../lib/linkPublico';
import {
  CATEGORIA_OPCOES,
  MODALIDADE_OPCOES,
  ESTADO_OPCOES,
  MODELOS_ENTRADA,
  TIPOS_LOCALIZACAO,
  VISIBILIDADES,
  sanitizeSlug,
} from '../_lib/configClube';

export function NovoClubePage(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();
  const session = useTenantSession();

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [modalidade, setModalidade] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [online, setOnline] = useState(false);
  const [visibilidade, setVisibilidade] = useState<VisibilidadeClube>('privada');
  const [aprovacaoManual, setAprovacaoManual] = useState(false);
  const [criando, setCriando] = useState(false);

  const slug = sanitizeSlug(nome);
  const podeCriar = nome.trim().length > 0 && slug.length > 0 && !criando;

  async function criar(): Promise<void> {
    if (!session.uid || !session.tenantId) {
      toast({ variant: 'danger', title: 'Sessão não autenticada' });
      return;
    }
    const input: ClubeInput = {
      tenantId: session.tenantId,
      nome: nome.trim(),
      descricao: descricao.trim(),
      slug,
      categoria,
      modalidade,
      localizacao: online
        ? { cidade: '', estado: '', online: true }
        : { cidade: cidade.trim(), estado, online: false },
      ownerId: session.uid,
      codigoConvite: gerarCodigoConvite(),
      visibilidade,
      aprovacaoManual,
      modeloEntrada: 'gratuito',
    };
    const erros = validarClube(input);
    if (erros.length > 0) {
      toast({ variant: 'danger', title: 'Revise o clube', description: erros[0] ?? 'Há campos pendentes.' });
      return;
    }
    setCriando(true);
    try {
      await criarClubePadrao(input);
      toast({ variant: 'success', title: `${input.nome} criado` });
      navigate(`/clubes/${slug}`);
    } catch {
      toast({
        variant: 'danger',
        title: 'Não foi possível criar o clube',
        description: `O endereço "${slug}" pode já estar em uso — ajuste o nome e tente novamente.`,
      });
    } finally {
      setCriando(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-[var(--spacing-6)] p-[var(--spacing-6)]">
      <header className="flex items-center justify-between">
        <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Criar club
        </h1>
        <Button variant="ghost" onClick={() => navigate('/clubes')}>
          Cancelar
        </Button>
      </header>

      <section
        aria-label="Identidade do club"
        className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-6)]"
      >
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <Input
            id="clube-nome"
            label="Nome do club"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {slug
              ? `Endereço público: ${linkClubePublico(slug)} (definido na criação, não pode ser alterado depois)`
              : 'O endereço público será derivado do nome.'}
          </span>
        </div>
        <Textarea
          id="clube-descricao"
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={2}
        />
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
          <Select
            id="clube-categoria"
            label="Tipo de club"
            options={CATEGORIA_OPCOES}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
          <Select
            id="clube-modalidade"
            label="Modalidade"
            options={MODALIDADE_OPCOES}
            value={modalidade}
            onChange={(e) => setModalidade(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-[var(--spacing-2)]">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Localização
          </span>
          <div role="group" aria-label="Tipo de localização" className="flex flex-wrap gap-[var(--spacing-2)]">
            {TIPOS_LOCALIZACAO.map((t) => (
              <Chip
                key={t.id}
                active={online === (t.id === 'online')}
                onClick={() => setOnline(t.id === 'online')}
              >
                {t.label}
              </Chip>
            ))}
          </div>
          {online ? (
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              Clube online — sem sede física. Cidade e estado ficam opcionais.
            </span>
          ) : (
            <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
              <Input
                id="clube-cidade"
                label="Cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
              <Select
                id="clube-estado"
                label="Estado"
                options={ESTADO_OPCOES}
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              />
            </div>
          )}
        </div>
      </section>

      <section
        aria-label="Regras do club"
        className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-6)]"
      >
        <div className="flex flex-col gap-[var(--spacing-2)]">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Visibilidade</span>
          <div role="group" aria-label="Visibilidade" className="flex flex-wrap gap-[var(--spacing-2)]">
            {VISIBILIDADES.map((v) => (
              <Chip key={v.id} active={visibilidade === v.id} onClick={() => setVisibilidade(v.id)}>
                {v.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-[var(--spacing-2)]">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">Modelo de entrada</span>
          <div role="group" aria-label="Modelo de entrada" className="flex flex-wrap gap-[var(--spacing-2)]">
            {MODELOS_ENTRADA.map((m) => (
              <span key={m.id} className="flex items-center gap-[var(--spacing-1)]">
                <Chip active={m.id === 'gratuito'} disabled={m.disabled}>
                  {m.label}
                </Chip>
                {m.disabled ? <Badge variant="neutro">Em breve</Badge> : null}
              </span>
            ))}
          </div>
        </div>
        <CheckboxField
          checked={aprovacaoManual}
          onChange={(e) => setAprovacaoManual(e.target.checked)}
          label="Exigir aprovação manual de novos membros"
        />
      </section>

      <div>
        <Button variant="primary" disabled={!podeCriar} onClick={() => void criar()}>
          {criando ? 'Criando…' : 'Criar club'}
        </Button>
      </div>
    </div>
  );
}

NovoClubePage.displayName = 'NovoClubePage';
