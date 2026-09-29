"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Jobs" },
  { href: "/portals", label: "Portals" },
  { href: "/applications", label: "Applications" },
  { href: "/profile", label: "Profile" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-4 border-b border-slate-700 px-6 py-4">
      <span className="font-bold text-lg mr-6">Job Hunter</span>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            pathname === link.href
              ? "text-white font-semibold"
              : "text-slate-400 hover:text-white"
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
