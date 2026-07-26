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
  Select,
  Checkbox,
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
} from '@leela/design-system';

export type {
  SystemStateScreenProps,
  SystemStateAction,
  SystemStateVariant,
} from '@leela/design-system';
