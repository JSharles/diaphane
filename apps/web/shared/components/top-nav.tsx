"use client";

import { useTranslations } from "next-intl";
import { Emblem } from "@/shared/components/emblem";
import type { User } from "schemas";
import { useLogout } from "@/features/auth/hooks";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

function initials(user: User) {
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
}

export function TopNav({ user }: { user: User }) {
  const logout = useLogout();
  const t = useTranslations("TopNav");

  return (
    // DESIGN.md § 6 Navigation: transparent on the ground, a hairline
    // below, the emblem in the text colour, no diffusion on the wordmark.
    <header className="flex h-14 items-center justify-between border-b border-hairline px-4 sm:px-6">
      <Link href="/home" className="flex items-center gap-2 text-foreground">
        <Emblem />
        <span className="text-base font-medium">Diaphane</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1.5 transition-colors duration-fast hover:bg-surface-1">
          <Avatar className="size-7">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback>{initials(user)}</AvatarFallback>
          </Avatar>
          <span className="hidden truncate text-[0.9375rem] text-fg-2 sm:inline">
            {user.firstName} {user.lastName}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href="/profile">{t("profile")}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => logout.mutate()}>{t("logout")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
