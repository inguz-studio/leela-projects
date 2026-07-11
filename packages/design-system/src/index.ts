// =============================================================================
// @leela/design-system — public API
// =============================================================================

// ── Theme ──────────────────────────────────────────────────────────────────
export {
  ThemeProvider,
  useTheme,
  getThemeInitScript,
  type Theme,
  type ThemeContextValue,
  type ThemeProviderProps,
} from './theme/ThemeProvider';

export {
  ThemeProviderRN,
  useTheme as useThemeRN,
  type ThemeProviderRNProps,
  type StorageAdapter,
  type RNThemeContextValue,
} from './theme/ThemeProviderRN';

export {
  generateCSS,
  generateRNTheme,
  collectRefs,
  resolvePath,
  flattenTokens,
  type TokenRecord,
  type FlatTokens,
} from './theme/generate';

export { brasaTheme, leelaTheme } from './theme/rn-themes';

// ── Atoms ──────────────────────────────────────────────────────────────────
export { Button, buttonVariants, type ButtonProps } from './components/Button';
export { Input, type InputProps } from './components/Input';
export { Select, type SelectProps, type SelectOption } from './components/Select';
export { Checkbox, type CheckboxProps } from './components/Checkbox';
export { Textarea, type TextareaProps } from './components/Textarea';
export {
  Radio,
  RadioCard,
  RadioGroup,
  type RadioProps,
  type RadioCardProps,
  type RadioGroupProps,
} from './components/Radio';
export { Switch, type SwitchProps } from './components/Switch';
export { Field, type FieldProps } from './components/Field';
export { Badge, badgeVariants, type BadgeProps } from './components/Badge';
export { Chip, type ChipProps } from './components/Chip';
export { Avatar, type AvatarProps } from './components/Avatar';
export { Divider, type DividerProps } from './components/Divider';
export { IconButton, type IconButtonProps } from './components/IconButton';
export { Sparkline, type SparklineProps } from './components/Sparkline';
export { DateBadge, type DateBadgeProps } from './components/DateBadge';

// ── Toolbar global (Lote FIDELIDADE T3) ─────────────────────────────────────
export { Toolbar, type ToolbarProps } from './components/Toolbar';
export { SearchInput, type SearchInputProps } from './components/SearchInput';

// ── Shell (S001-3-T1) ───────────────────────────────────────────────────────
export { Sidebar, DEFAULT_SIDEBAR_SECTIONS, sidebarNavIcon, SidebarBrand, SidebarFooter } from './components/Sidebar';
export type { SidebarProps, SidebarSection, SidebarItem, SidebarBadgeVariant, SidebarBrandProps, SidebarFooterProps } from './components/Sidebar';
export { Breadcrumb } from './components/Breadcrumb';
export type { BreadcrumbProps, BreadcrumbItem } from './components/Breadcrumb';
export { PageHeader } from './components/PageHeader';
export type { PageHeaderProps } from './components/PageHeader';
export { SubNav } from './components/SubNav';
export type { SubNavProps, SubNavTab } from './components/SubNav';
export { AppShell } from './components/AppShell';
export type { AppShellProps } from './components/AppShell';

// ── Table densa & apoio (S001-3-T2) ─────────────────────────────────────────
export { Table } from './components/Table';
export type { TableProps, TableColumn } from './components/Table';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
export { Pagination, type PaginationProps } from './components/Pagination';
export { Popover } from './components/Popover'; // @deprecated alias de DropdownMenu
export type { PopoverProps, PopoverAction } from './components/Popover';
export { DropdownMenu } from './components/DropdownMenu';
export type { DropdownMenuProps, DropdownMenuAction } from './components/DropdownMenu';

// ── Modais (S001-3-T3) ──────────────────────────────────────────────────────
export { Modal, ConfirmModal } from './components/Modal';
export type { ModalProps, ModalSize, ConfirmModalProps, ConfirmModalDetails } from './components/Modal';

// ── Drawer off-canvas (LEELA-RESP-M1-T2) ────────────────────────────────────
export { Drawer } from './components/Drawer';
export type { DrawerProps, DrawerSide } from './components/Drawer';

// ── Feedback, cards & fluxo (S001-3-T4) ─────────────────────────────────────
export { Toast, toastVariants, ToastProvider, useToast, DEFAULT_TOAST_DURATION } from './components/Toast';
export type { ToastProps, ToastVariant, ToastProviderProps, ToastOptions, ToastContextValue } from './components/Toast';
export { CardEvento } from './components/CardEvento';
export type { CardEventoProps } from './components/CardEvento';
export { EventRow } from './components/EventRow';
export type {
  EventRowProps,
  EventRowCount,
  EventRowMetric,
  EventRowThumbImage,
  EventThumbVariant,
} from './components/EventRow';
export { CardDesafio } from './components/CardDesafio';
export type { CardDesafioProps } from './components/CardDesafio';
export { Stepper } from './components/Stepper';
export type { StepperProps, StepperStep } from './components/Stepper';
export { Skeleton } from './components/Skeleton';
export type { SkeletonProps } from './components/Skeleton';
export { Tabs } from './components/Tabs';
export type { TabsProps, TabItem } from './components/Tabs';

// ── shadcn+brasa (PoC Lote A · brief ds-consolidacao) ──────────────────────
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/Tooltip';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/Card';

// ── Gráficos (Recharts · ADR-010 · lote FID-EVT-T2) ─────────────────────────
export { BarChart, DonutChart, chartCategoryVar, formatChartInt, pctOf, CHART_CATEGORY_COUNT } from './components/charts';
export type { BarChartProps, BarChartDatum, DonutChartProps, DonutChartDatum } from './components/charts';

// ── Utilities ──────────────────────────────────────────────────────────────
export { cn } from './utils/cn';
