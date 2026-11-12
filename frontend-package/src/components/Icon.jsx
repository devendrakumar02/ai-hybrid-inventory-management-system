import React from "react";
import {
  LayoutDashboard,
  Package,
  ScanLine,
  ShoppingCart,
  ShoppingBag,
  ArrowLeftRight,
  Brain,
  FileText,
  FileBarChart2,
  UsersRound,
  Settings,
  LogOut,
  Search,
  Bell,
  Wifi,
  WifiOff,
  User,
  Plus,
  Trash2,
  PlusCircle,
  Minus,
  CheckCircle2,
  RotateCcw,
  ReceiptText,
  Sparkles,
  Menu,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Boxes,
  AlertTriangle,
  IndianRupee,
  Clock3,
  X,
  Pencil,
  Mail,
  Check,
  Shield,
  CircleHelp,
  Network,
  Cpu,
  Server,
  Database,
  Layers,
  Upload,
  Download,
  FileSpreadsheet
} from "lucide-react";

const icons = {
  upload: Upload,
  download: Download,
  fileSpreadsheet: FileSpreadsheet,
  dashboard: LayoutDashboard,
  products: Package,
  barcode: ScanLine,
  sales: ShoppingCart,
  purchases: ShoppingBag,
  transfer: ArrowLeftRight,
  transactions: ReceiptText,

  forecast: Sparkles,
  reports: FileBarChart2,
  alerts: Bell,
  users: UsersRound,

  settings: Settings,
  search: Search,
  menu: Menu,

  chevronDown: ChevronDown,
  chevronRight: ChevronRight,

  sync: RefreshCw,
  online: Wifi,
  offline: WifiOff,

  plus: Plus,
  more: MoreHorizontal,

  up: TrendingUp,
  down: TrendingDown,

  boxes: Boxes,
  warning: AlertTriangle,
  rupee: IndianRupee,
  clock: Clock3,

  help: CircleHelp,

  logout: LogOut,
  receipt: ReceiptText,

  close: X,
  edit: Pencil,
  trash: Trash2,

  plusCircle: PlusCircle,
  minus: Minus,

  cart: ShoppingCart,
  checkCircle: CheckCircle2,

  scan: ScanLine,
  reset: RotateCcw,
  mail: Mail,
  check: Check,
  shield: Shield,
  architecture: Network,
  network: Network,
  cpu: Cpu,
  server: Server,
  database: Database,
  layers: Layers
};

export default function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  ...props
}) {
  const C = icons[name] || CircleHelp || (() => null);

  return (
    <C
      size={size}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}