import {
  House,
  Crosshair,
  Eye,
  ClipboardList,
  Activity,
  GraduationCap,
  Sprout,
  Wheat,
  ShoppingCart,
  type LucideProps,
} from 'lucide-react'
import type { IconKey } from '@/lib/chapters'

const MAP: Record<IconKey, React.ComponentType<LucideProps>> = {
  home: House,
  analiz: Crosshair,
  vizyon: Eye,
  basvuru: ClipboardList,
  takip: Activity,
  egitim: GraduationCap,
  uretim: Sprout,
  hasat: Wheat,
  pazara: ShoppingCart,
}

export function NavIcon({ icon, ...props }: { icon: IconKey } & LucideProps) {
  const Cmp = MAP[icon]
  return <Cmp strokeWidth={1.5} {...props} />
}
