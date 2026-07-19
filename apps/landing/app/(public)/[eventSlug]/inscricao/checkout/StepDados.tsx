'use client';

import { useCallback, useRef, useState } from 'react';
import { Loader2, MapPin, UserRound, Users } from 'lucide-react';
import {
  ENDERECO_CAMPO_MAX,
  ENDERECO_LOGRADOURO_MAX,
  ENDERECO_NUMERO_MAX,
  UFS_BRASIL,
  normalizarCep,
} from '@leela/core';
import { Checkbox, Field, Input, Select } from '@/app/_ds/ds';
import type { EnderecoForm, InscritoForm } from './tipos';
import type { ErrosEndereco, ErrosInscrito, ErrosResponsavel } from './validacao';
import { buscarEnderecoPorCep, mascaraCep, mascaraTelefone } from './cep';
import { TituloEtapa, ApoioEtapa } from './tipografia';

/**
 * Etapa 2 — Dados (ADR-011: 1 responsável/pagador + N inscritos). O responsável
 * é sempre o pagador; o checkbox "Eu vou correr" faz dele o 1º inscrito
 * (auto-inscrição). A modalidade e o kit de cada atleta já foram escolhidos na
 * etapa anterior (Modalidade e kit) — aqui é só a identificação.
 *
 * LEELA-R13: formulário 100% VERTICAL (decisão do Vitor, adendo 10) — campos
 * empilhados em coluna única em todos os breakpoints (sem grid de 2 colunas),
 * para facilitar a leitura. Títulos padronizados via `TituloEtapa`/`ApoioEtapa`
 * (escala tipográfica única do checkout).
 *
 * LEELA-CKFORM (spec §5.1, ratificada 2026-07-18): entram telefone do
 * RESPONSÁVEL, nascimento POR ATLETA e ENDEREÇO 1× por pedido (depois dos
 * atletas — logística não compete com identificação), com lookup de CEP
 * (ViaCEP, fail-open — §5.2): a pessoa digita o CEP e completa só o NÚMERO.
 */

/** Estado do lookup de CEP (spec §5.2 — 4 estados). */
type LookupCep = 'inicial' | 'carregando' | 'sucesso' | 'falha';

function BlocoEndereco({
  endereco,
  onEndereco,
  erros,
}: {
  endereco: EnderecoForm;
  onEndereco: (patch: Partial<EnderecoForm>) => void;
  erros: ErrosEndereco;
}): React.JSX.Element {
  const [lookup, setLookup] = useState<LookupCep>('inicial');
  // Erro de FORMATO do CEP no blur (antes de qualquer request — spec §5.2);
  // o erro de gate do avanço chega por `erros.cep`.
  const [erroFormatoCep, setErroFormatoCep] = useState<string | null>(null);
  const numeroRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // CEP da última busca — evita re-buscar o mesmo CEP no blur após sucesso.
  const cepBuscadoRef = useRef<string>('');

  const buscar = useCallback(
    (cepMascarado: string) => {
      const digitos = normalizarCep(cepMascarado);
      if (digitos.length !== 8 || digitos === cepBuscadoRef.current) return;
      cepBuscadoRef.current = digitos;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLookup('carregando');
      void buscarEnderecoPorCep(digitos, controller.signal).then((r) => {
        if (controller.signal.aborted) return;
        if (r.status === 'sucesso') {
          // Autopreenche EDITÁVEL (lookup erra em CEP novo/rural) e o foco
          // pula para o único campo que falta digitar: o NÚMERO (spec §5.2).
          onEndereco({
            logradouro: r.endereco.logradouro,
            bairro: r.endereco.bairro,
            cidade: r.endereco.cidade,
            uf: r.endereco.uf,
          });
          setLookup('sucesso');
          numeroRef.current?.focus();
        } else {
          // Não encontrado OU API fora ⇒ fallback manual honesto (fail-open:
          // a compra NUNCA fica refém do lookup — spec §5.2).
          setLookup('falha');
        }
      });
    },
    [onEndereco]
  );

  const onCepChange = useCallback(
    (valor: string) => {
      const mascarado = mascaraCep(valor);
      setErroFormatoCep(null);
      // CEP re-editado invalida busca em voo e o "já buscado" (permite refazer).
      if (normalizarCep(mascarado).length < 8) {
        abortRef.current?.abort();
        cepBuscadoRef.current = '';
        if (lookup === 'carregando') setLookup('inicial');
      }
      onEndereco({ cep: mascarado });
      // 8º dígito dispara o lookup (spec §5.2) — on-blur cobre o resto.
      if (normalizarCep(mascarado).length === 8) buscar(mascarado);
    },
    [buscar, lookup, onEndereco]
  );

  const onCepBlur = useCallback(() => {
    const digitos = normalizarCep(endereco.cep);
    if (digitos.length > 0 && digitos.length < 8) {
      // Erro de formato inline ANTES de qualquer request (spec §5.2).
      setErroFormatoCep('CEP incompleto (8 dígitos).');
      return;
    }
    if (digitos.length === 8) buscar(endereco.cep);
  }, [buscar, endereco.cep]);

  const carregando = lookup === 'carregando';

  return (
    <section className="flex flex-col gap-4">
      <div>
        <TituloEtapa icone={MapPin}>Endereço</TituloEtapa>
        <ApoioEtapa>
          Endereço do responsável pela inscrição. Digite o CEP e complete só o número.
        </ApoioEtapa>
      </div>

      <div className="flex flex-col gap-4">
        <Field label="CEP" required errorMessage={erroFormatoCep ?? erros.cep ?? ''}>
          <Input
            value={endereco.cep}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            onChange={(e) => onCepChange(e.target.value)}
            onBlur={onCepBlur}
          />
        </Field>

        {carregando ? (
          <p
            role="status"
            className="flex items-center gap-2 text-[length:var(--font-size-sm)] text-text-secondary"
          >
            <Loader2 size={16} strokeWidth={2} aria-hidden className="animate-spin" />
            Buscando endereço…
          </p>
        ) : null}
        {lookup === 'falha' ? (
          <p role="status" className="text-[length:var(--font-size-sm)] text-text-secondary">
            Não encontramos esse CEP — preencha o endereço.
          </p>
        ) : null}

        <Field label="Logradouro" required errorMessage={erros.logradouro ?? ''}>
          <Input
            value={endereco.logradouro}
            autoComplete="address-line1"
            maxLength={ENDERECO_LOGRADOURO_MAX}
            disabled={carregando}
            placeholder="Rua, avenida…"
            onChange={(e) => onEndereco({ logradouro: e.target.value })}
          />
        </Field>
        <Field label="Número" required errorMessage={erros.numero ?? ''}>
          <Input
            ref={numeroRef}
            value={endereco.numero}
            maxLength={ENDERECO_NUMERO_MAX}
            disabled={carregando}
            placeholder={'Número (ou "s/n")'}
            onChange={(e) => onEndereco({ numero: e.target.value })}
          />
        </Field>
        <Field label="Complemento (opcional)" errorMessage="">
          <Input
            value={endereco.complemento}
            autoComplete="address-line2"
            maxLength={ENDERECO_CAMPO_MAX}
            disabled={carregando}
            placeholder="Apto, bloco…"
            onChange={(e) => onEndereco({ complemento: e.target.value })}
          />
        </Field>
        <Field label="Bairro" errorMessage={erros.bairro ?? ''}>
          <Input
            value={endereco.bairro}
            maxLength={ENDERECO_CAMPO_MAX}
            disabled={carregando}
            onChange={(e) => onEndereco({ bairro: e.target.value })}
          />
        </Field>
        <Field label="Cidade" required errorMessage={erros.cidade ?? ''}>
          <Input
            value={endereco.cidade}
            autoComplete="address-level2"
            maxLength={ENDERECO_CAMPO_MAX}
            disabled={carregando}
            onChange={(e) => onEndereco({ cidade: e.target.value })}
          />
        </Field>
        <Field label="UF" required errorMessage={erros.uf ?? ''}>
          <Select
            value={endereco.uf}
            autoComplete="address-level1"
            disabled={carregando}
            options={[
              { label: 'Escolha a UF', value: '' },
              ...UFS_BRASIL.map((uf) => ({ label: uf, value: uf })),
            ]}
            onChange={(e) => onEndereco({ uf: e.target.value })}
          />
        </Field>
      </div>
    </section>
  );
}

export function StepDados({
  responsavelNome,
  responsavelEmail,
  responsavelTelefone,
  onResponsavel,
  euCorro,
  onEuCorro,
  inscritos,
  onInscrito,
  endereco,
  onEndereco,
  errosResponsavel,
  errosInscritos,
  errosEndereco,
}: {
  responsavelNome: string;
  responsavelEmail: string;
  responsavelTelefone: string;
  onResponsavel: (patch: { nome?: string; email?: string; telefone?: string }) => void;
  euCorro: boolean;
  onEuCorro: (v: boolean) => void;
  inscritos: InscritoForm[];
  onInscrito: (index: number, patch: Partial<InscritoForm>) => void;
  endereco: EnderecoForm;
  onEndereco: (patch: Partial<EnderecoForm>) => void;
  errosResponsavel: ErrosResponsavel;
  errosInscritos: ErrosInscrito[];
  errosEndereco: ErrosEndereco;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      {/* Responsável / pagador */}
      <section className="flex flex-col gap-4">
        <div>
          <TituloEtapa icone={UserRound}>Responsável pela inscrição</TituloEtapa>
          <ApoioEtapa>
            Quem faz e paga a inscrição. O comprovante e os ingressos vão para este e-mail.
          </ApoioEtapa>
        </div>
        {/* Vertical: campos empilhados (coluna única). */}
        <div className="flex flex-col gap-4">
          <Field label="Nome completo" required errorMessage={errosResponsavel.nome ?? ''}>
            <Input
              value={responsavelNome}
              autoComplete="name"
              onChange={(e) => onResponsavel({ nome: e.target.value })}
              placeholder="Como no documento"
            />
          </Field>
          <Field label="E-mail" required errorMessage={errosResponsavel.email ?? ''}>
            <Input
              type="email"
              value={responsavelEmail}
              autoComplete="email"
              inputMode="email"
              onChange={(e) => onResponsavel({ email: e.target.value })}
              placeholder="voce@email.com"
            />
          </Field>
          {/* CKFORM §5.1 item 1: telefone do RESPONSÁVEL — canal de contato
              do pedido (não é por atleta). Máscara é UX; canônico no servidor. */}
          <Field label="Telefone celular" required errorMessage={errosResponsavel.telefone ?? ''}>
            <Input
              type="tel"
              value={responsavelTelefone}
              autoComplete="tel"
              inputMode="tel"
              placeholder="(00) 00000-0000"
              onChange={(e) => onResponsavel({ telefone: mascaraTelefone(e.target.value) })}
            />
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-[length:var(--font-size-base)] text-text-primary">
          <Checkbox
            checked={euCorro}
            onChange={(e) => onEuCorro(e.target.checked)}
            aria-label="Eu também vou correr nesta prova"
          />
          <span>Eu também vou correr nesta prova</span>
        </label>
      </section>

      {/* Inscritos */}
      <section className="flex flex-col gap-4">
        <div>
          <TituloEtapa icone={Users}>
            {inscritos.length > 1 ? 'Quem vai correr' : 'Inscrição'}
          </TituloEtapa>
          <ApoioEtapa>
            Cada atleta tem os próprios dados. A modalidade e o kit já foram escolhidos na etapa
            anterior.
          </ApoioEtapa>
        </div>

        {inscritos.map((inscrito, i) => {
          const erros = errosInscritos[i] ?? {};
          const ehVoce = euCorro && i === 0;
          return (
            <div
              key={i}
              className="rounded-ds-lg border border-border-subtle bg-surface-raised p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-text-primary">
                  {ehVoce ? 'Você' : `Atleta ${euCorro ? i : i + 1}`}
                </h3>
              </div>

              {/* Vertical: campos empilhados em coluna única (sem grid). */}
              <div className="flex flex-col gap-4">
                {ehVoce ? (
                  <p className="text-[length:var(--font-size-base)] text-text-secondary">
                    Usando seus dados de responsável
                    {responsavelNome ? ` (${responsavelNome})` : ''}. Faltam só CPF e nascimento.
                  </p>
                ) : (
                  <>
                    {/* M-3 (spec §5.2): tokens de SEÇÃO por atleta — o autofill
                        do navegador não repete os dados do comprador nos
                        atletas extras. */}
                    <Field label="Nome completo" required errorMessage={erros.nome ?? ''}>
                      <Input
                        value={inscrito.nome}
                        autoComplete={`section-atleta${i + 1} name`}
                        onChange={(e) => onInscrito(i, { nome: e.target.value })}
                      />
                    </Field>
                    <Field label="E-mail" required errorMessage={erros.email ?? ''}>
                      <Input
                        type="email"
                        value={inscrito.email}
                        inputMode="email"
                        autoComplete={`section-atleta${i + 1} email`}
                        onChange={(e) => onInscrito(i, { email: e.target.value })}
                      />
                    </Field>
                  </>
                )}

                <Field label="CPF" required errorMessage={erros.cpf ?? ''}>
                  <Input
                    value={inscrito.cpf}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000.000.000-00"
                    onChange={(e) => onInscrito(i, { cpf: e.target.value })}
                  />
                </Field>
                {/* CKFORM §5.1 item 2: nascimento POR ATLETA (categoria de
                    prova + demografia são do titular — ADR-011). Input date
                    nativo entrega `yyyy-mm-dd` direto (formato do core). */}
                <Field label="Data de nascimento" required errorMessage={erros.nascimento ?? ''}>
                  <Input
                    type="date"
                    value={inscrito.nascimento}
                    autoComplete={ehVoce ? 'bday' : `section-atleta${i + 1} bday`}
                    onChange={(e) => onInscrito(i, { nascimento: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          );
        })}
      </section>

      {/* CKFORM §5.1 item 3: endereço DEPOIS dos atletas — logística não
          compete com identificação. 1× por pedido (do responsável). */}
      <BlocoEndereco endereco={endereco} onEndereco={onEndereco} erros={errosEndereco} />
    </div>
  );
}
