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
  ShieldCheck,
  UserCheck,
  Users,
  Flower2,
  Dna,
  Hexagon,
  Factory,
  Store,
  type LucideProps,
} from 'lucide-react'
import type { IconKey } from '@/lib/chapters'

const MAP: Record<IconKey, React.ComponentType<LucideProps>> = {
  home: House,
  sosyal: Users,
  tahil: Wheat,
  aromatik: Flower2,
  klonlama: Dna,
  aricilik: Hexagon,
  katma: Factory,
  sekabel: Store,
  analiz: Crosshair,
  vizyon: Eye,
  basvuru: ClipboardList,
  takip: Activity,
  egitim: GraduationCap,
  uretim: Sprout,
  hasat: Wheat,
  pazara: ShoppingCart,
  tahsis: UserCheck,
  alim: ShieldCheck,
}

export function NavIcon({ icon, ...props }: { icon: IconKey } & LucideProps) {
  const Cmp = MAP[icon] || House
  return <Cmp strokeWidth={1.5} {...props} />
}
