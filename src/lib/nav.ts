import {
  FileText,
  Image as ImageIcon,
  KeyRound,
  Star,
  Trash2,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  /** i18n key for the label. */
  key: string;
  icon: LucideIcon;
}

/** Primary sections — shown in the sidebar and the mobile bottom nav. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/vault/photos", key: "nav.photos", icon: ImageIcon },
  { href: "/vault/videos", key: "nav.videos", icon: Video },
  { href: "/vault/contacts", key: "nav.contacts", icon: Users },
  { href: "/vault/secure", key: "nav.passwords", icon: KeyRound },
  { href: "/vault/documents", key: "nav.documents", icon: FileText },
];

/** Secondary sections — sidebar + mobile "More" menu. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/vault/favorites", key: "nav.favorites", icon: Star },
  { href: "/vault/trash", key: "nav.trash", icon: Trash2 },
];

export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

/** Returns the i18n key for the current section title. */
export function sectionTitleKey(pathname: string): string {
  if (pathname.startsWith("/vault/secure")) return "nav.notesPasswords";
  const match = ALL_NAV.find((n) => pathname.startsWith(n.href));
  return match ? match.key : "app.name";
}
