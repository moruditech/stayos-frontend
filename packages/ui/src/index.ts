// Gates
export { RoleGate } from './gates/RoleGate';
export { PlanGate } from './gates/PlanGate';

// Real-time
export { SocketProvider, useSocketInstance } from './realtime/SocketProvider';
export { useSocketEvent } from './realtime/useSocketEvent';
export { useEmit } from './realtime/useEmit';

// PII and consent
export { PiiField } from './PiiField';
export { ConsentGate } from './ConsentGate';

// Mandate banners
export { MandateBanner, MandateTerminationBanner } from './MandateBanner';

// Form helpers
export { InlineError, applyServerErrors } from './InlineError';

// Data display
export { DataTable } from './DataTable';
export type { ColumnDef } from './DataTable';

// Primitives
export {
  Modal,
  ConfirmDialog,
  ToastStack,
  useToast,
  SkeletonLoader,
  EmptyState,
  StatusBadge,
  ReadOnlyField,
  Pagination,
  CopyButton,
  DownloadButton,
} from './primitives';

// File input
export { FileUpload } from './FileUpload';

// Nav filtering
export { filterNav } from './nav';
export type { NavItem } from './nav';

// Icon set — namespaced (not spread into this barrel) so this file stays a
// curated list rather than absorbing ~70 icon names. Usage: <Icons.Home />
export * as Icons from './icons';
export type { LucideIcon } from './icons';

// Chart primitives — dependency-free SVG, render only what's passed in.
export { AreaLineChart, HorizontalBarChart, DonutChart } from './charts';
export type { AreaChartPoint, BarChartItem, DonutSlice } from './charts';

// Page-composition patterns shared by Agency + Platform Admin pages.
export {
  PageHeader,
  StatCard,
  Panel,
  LinkArrow,
  InsightList,
  ActivityFeed,
  AlertList,
  RankList,
  QuickActionsBar,
  EmptyBlock,
  LoadingBlock,
} from './patterns';
export type { StatTone, ActivityEntry, AlertEntry, RankEntry, QuickAction } from './patterns';

// Auth shared components
export { MfaStep } from './MfaStep';

// Shared auth page components
export { default as ForgotPasswordPage } from './ForgotPasswordPage';
export { default as ResetPasswordPage } from './ResetPasswordPage';
