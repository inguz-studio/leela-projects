'use client';
// =============================================================================
// apps/landing/app/_ds/ds.ts
//
// Boundary de cliente ÚNICO para os componentes do @leela/design-system.
//
// Por que existe: o DS não publica diretiva `'use client'` nem subpath por
// componente, e o barrel avalia `createContext` (ThemeProvider/Toast) no topo
// do módulo — o que é ilegal quando avaliado no grafo de Server Component do
// App Router. Concentrando o consumo dos componentes atrás deste 'use client',
// o barrel só é avaliado no grafo de CLIENTE (onde createContext é válido),
// enquanto as PÁGINAS e o LEITOR seguem Server Components puros (dado e
// credencial ficam no servidor). Os componentes são presentacionais e ainda
// são renderizados no servidor (SSR do client component) — SEO/first paint
// preservados. Servers passam só props serializáveis (strings/números/
// ReactNode server-renderizado).
// =============================================================================

export {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardEvento,
  DateBadge,
  Divider,
  EmptyState,
  // Primitivos de formulário do checkout (S1203) — consumidos por Client
  // Components; passam por este boundary 'use client' para manter o padrão.
  Input,
  // Campo de senha da casa (FRONTEIRA-AUTH). Entra por AQUI, e não por import
  // direto do barrel, pelo mesmo motivo dos outros: o `InputSenha` tem estado
  // (`useState` do olho mostrar/ocultar) e só pode ser avaliado no grafo de
  // cliente. Ele NÃO conhece a política de senha — quem passa `avaliacao` é a
  // tela, com `avaliarSenha()` de `@leela/core`.
  InputSenha,
  Select,
  Checkbox,
  // Par rótulo + caixinha (Onda C0 · CANONE-1). Entra por AQUI, e não pela
  // entrada server-safe, porque compõe o `Checkbox` — que tem `useRef`/
  // `useEffect` para o `indeterminate` — e usa `useId` para fiar o `htmlFor`.
  // O que o ADR-017 proíbe é Radix no bundle público, e o
  // `server-safety.test.ts` caminha o grafo desta peça para provar que não há.
  // Os cinco pares do checkout e da conta são da Onda C2.
  CheckboxField,
  Field,
  Radio,
  RadioGroup,
  RadioCard,
  Stepper,
  // Feedback de ação (S1209-T2 · RN-157): o toast do auto-copy da chave PIX.
  // Peça do DS, Radix-free (fila própria do ToastProvider) — respeita a
  // ADR-017 da landing sem reinventar posicionamento nem fila.
  Toast,
  ToastProvider,
  useToast,
  // Estados de sistema (404/500 públicos) — LEELA-E07-web · S500-T3 / S502-T1.
  SystemStateScreen,
  // Menu secundário da página do produtor (S1707-T3 · RN-443). O `Tabs` é
  // Radix e é de CLIENTE — só a troca de aba. Os painéis continuam vindo
  // renderizados do servidor e entram como `content`, então as três seções
  // seguem no documento entregue (o `forceMount` do DS garante isso) e o
  // conteúdo continua indexável e alcançável pela busca da página.
  Tabs,
} from '@leela/design-system';

export type {
  SystemStateScreenProps,
  SystemStateAction,
  SystemStateVariant,
  TabItem,
  TabsProps,
} from '@leela/design-system';
