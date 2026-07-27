// =============================================================================
// CadastrarAssessoriaPage (`/clubes/assessorias/nova`) — form de cadastro de
// assessoria como club parceiro (E18 · S1800). Documento (CNPJ/CPF) validado ao
// vivo pelo core (a MESMA validação da Function). Dois desfechos honestos do
// servidor:
//   - conta do responsável EXISTE → vínculo imediato ('ativa').
//   - conta NÃO existe → convite pendente. Enquanto o EmailProvider é mock, o
//     servidor devolve o TOKEN ao organizador (que entrega o link de aceite).
//     Em produção sem EmailProvider, o ramo convite é FAIL-CLOSED — a tela
//     mostra o erro acionável, NÃO promete e-mail.
// =============================================================================

import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, useToast } from '@leela/design-system';
import {
  cadastrarAssessoriaParceira,
  type CadastrarAssessoriaResult,
} from '@leela/api-client';
import { AuthAlert } from '../../conta/auth/AuthAlert';
import { useTenantSession } from '../../../lib/session/tenantSession';
import {
  CADASTRO_VALORES_INICIAIS,
  problemaDoDocumento,
  validarCadastro,
  type CadastroAssessoriaValues,
} from './_lib/assessoriaForm';
import { PUBLIC_BASE } from '../../../lib/linkPublico';

const SECAO =
  'flex flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-6)]';

function mensagemErro(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const msg = (err as { message?: string })?.message ?? '';
  if (code.includes('failed-precondition')) {
    // Ramo convite fail-closed (sem EmailProvider) ou documento já encerrado.
    return msg || 'Não foi possível concluir: verifique o e-mail/documento e tente de novo.';
  }
  if (code.includes('permission-denied')) {
    return 'Você não tem permissão para cadastrar assessorias neste organizador.';
  }
  if (code.includes('invalid-argument')) {
    return msg || 'Dados inválidos — revise nome, documento e e-mail.';
  }
  return 'Não foi possível cadastrar a assessoria. Tente novamente.';
}

export function CadastrarAssessoriaPage(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();
  const session = useTenantSession();
  const [values, setValues] = useState<CadastroAssessoriaValues>(CADASTRO_VALORES_INICIAIS);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<CadastrarAssessoriaResult | null>(null);

  function set<K extends keyof CadastroAssessoriaValues>(campo: K, valor: string): void {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  const problemaDoc = useMemo(() => problemaDoDocumento(values.documento), [values.documento]);
  const erros = useMemo(() => validarCadastro(values), [values]);
  const podeEnviar = erros.length === 0 && !enviando;

  const linkAceite = useMemo(() => {
    if (!resultado?.tokenAceite || !session.tenantId) return null;
    const params = new URLSearchParams({
      tenantId: session.tenantId,
      parceriaId: resultado.parceriaId,
      token: resultado.tokenAceite,
    });
    return `${PUBLIC_BASE}/convite?${params.toString()}`;
  }, [resultado, session.tenantId]);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!podeEnviar) return;
    setErro(null);
    setEnviando(true);
    try {
      const r = await cadastrarAssessoriaParceira({
        nome: values.nome.trim(),
        documento: values.documento.trim(),
        responsavelEmail: values.responsavelEmail.trim(),
      });
      setResultado(r);
      if (r.vinculoImediato) {
        toast({
          variant: 'success',
          title: r.jaExistia ? 'Assessoria já vinculada' : 'Assessoria vinculada',
          description: 'O responsável já tinha conta — parceria ativa na hora.',
        });
      } else {
        toast({
          variant: 'success',
          title: 'Convite gerado',
          description: 'O responsável ainda não tem conta — entregue o link de aceite abaixo.',
        });
      }
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setEnviando(false);
    }
  }

  // Desfecho vínculo imediato: oferece ir ao detalhe (definir desconto).
  if (resultado?.vinculoImediato) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-[var(--spacing-6)] p-[var(--spacing-6)]">
        <header>
          <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
            Assessoria vinculada
          </h1>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            A parceria está ativa. Defina agora a condição de desconto exclusiva no detalhe.
          </p>
        </header>
        <div className="flex items-center gap-[var(--spacing-3)]">
          <Button variant="primary" onClick={() => navigate(`/clubes/assessorias/${resultado.parceriaId}`)}>
            Definir condição de desconto
          </Button>
          <Button variant="ghost" onClick={() => navigate('/clubes/assessorias')}>
            Ver todas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-[var(--spacing-6)] p-[var(--spacing-6)]">
      <header>
        <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
          Cadastrar assessoria
        </h1>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Cadastre uma assessoria como club parceiro por CNPJ/CPF + e-mail do responsável.
        </p>
      </header>

      <form className={SECAO} onSubmit={(e) => void onSubmit(e)} aria-label="Cadastro de assessoria">
        {erro ? <AuthAlert message={erro} /> : null}

        <Input
          id="assessoria-nome"
          label="Nome da assessoria"
          value={values.nome}
          onChange={(e) => set('nome', e.target.value)}
          placeholder="Assessoria Corrida Livre"
        />
        <Input
          id="assessoria-documento"
          label="CNPJ ou CPF do responsável"
          value={values.documento}
          onChange={(e) => set('documento', e.target.value)}
          placeholder="12.345.678/0001-95"
          inputMode="numeric"
          {...(problemaDoc ? { errorMessage: problemaDoc } : {})}
        />
        <Input
          id="assessoria-email"
          label="E-mail do responsável"
          type="email"
          autoComplete="off"
          value={values.responsavelEmail}
          onChange={(e) => set('responsavelEmail', e.target.value)}
          placeholder="responsavel@assessoria.com"
        />

        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Se o responsável já tiver conta Leela, a parceria fica ativa na hora. Se não, geramos um
          convite — em produção, o link segue por e-mail quando o disparo estiver disponível.
        </p>

        <div className="flex items-center gap-[var(--spacing-3)]">
          <Button type="submit" variant="primary" disabled={!podeEnviar}>
            {enviando ? 'Cadastrando…' : 'Cadastrar'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/clubes/assessorias')}>
            Cancelar
          </Button>
        </div>
      </form>

      {/* Convite pendente: token entregue ao organizador (mock de e-mail). */}
      {resultado && !resultado.vinculoImediato && linkAceite ? (
        <section
          aria-label="Link de aceite do convite"
          className="flex flex-col gap-[var(--spacing-2)] rounded-[var(--card-radius)] bg-[var(--surface-sunken)] p-[var(--spacing-4)]"
        >
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Link de aceite (entregue ao responsável)
          </span>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            O responsável ainda não tem conta. Enquanto o envio automático de e-mail não está ligado,
            entregue este link para ele criar a conta e ativar a parceria. O link expira em 14 dias;
            recadastrar o mesmo documento reemite o convite.
          </p>
          <a
            href={linkAceite}
            target="_blank"
            rel="noreferrer"
            className="break-all font-mono text-[length:var(--font-size-sm)] text-[var(--text-link,var(--text-primary))] underline"
          >
            {linkAceite}
          </a>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(linkAceite).then(
                  () => toast({ variant: 'success', title: 'Link copiado' }),
                  () => toast({ variant: 'danger', title: 'Não foi possível copiar' })
                );
              }}
            >
              Copiar link
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

CadastrarAssessoriaPage.displayName = 'CadastrarAssessoriaPage';
