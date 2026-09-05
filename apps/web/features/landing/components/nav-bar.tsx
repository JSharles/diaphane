import { useTranslations } from "next-intl";
import { Emblem } from "@/shared/components/emblem";
import { GlassBar } from "@/features/landing/components/glass-bar";
import { Menu } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

export function NavBar() {
  const t = useTranslations("Landing");

  return (
    // The bar floats over the hero rather than sitting on it: inset from the
    // three edges, the pane's glass and radius, the emblem left, the anchors
    // centred, the two ways in on the right (DESIGN.md § 5, the pane is
    // allowed here).
    <header className="sticky top-0 z-40 w-full px-4 pt-4 sm:px-6">
      <GlassBar>
        <div className="flex w-full items-center justify-between gap-6 px-4">
          <Link href="/" className="flex items-center gap-2 text-foreground">
            <Emblem />
            <span className="text-base font-medium">Diaphane</span>
          </Link>

          <nav className="ui-control hidden items-center gap-7 text-fg-2 md:flex">
            <a
              href="#product"
              className="transition-colors hover:text-foreground"
            >
              {t("nav.product")}
            </a>
            <a
              href="#how-it-works"
              className="transition-colors hover:text-foreground"
            >
              {t("nav.howItWorks")}
            </a>
            <a
              href="#benefits"
              className="transition-colors hover:text-foreground"
            >
              {t("nav.benefits")}
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              {t("faq.navLabel")}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="lg"
              typography="marketing"
              className="hidden border-hairline-strong bg-transparent text-action-secondary hover:text-foreground md:inline-flex"
            >
              <Link href="/login">{t("logIn")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              typography="marketing"
              className="hidden md:inline-flex"
            >
              <Link href="/signup">{t("signUp")}</Link>
            </Button>

            <Sheet>
              <SheetTrigger
                aria-label={t("openMenu")}
                className="rounded-md p-3 text-foreground transition-colors hover:bg-accent md:hidden"
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Diaphane</SheetTitle>
                </SheetHeader>
                <nav className="ui-control flex flex-col gap-1 px-4 text-fg-2">
                  <SheetClose asChild>
                    <a
                      href="#product"
                      className="rounded-md px-2 py-2 transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {t("nav.product")}
                    </a>
                  </SheetClose>
                  <SheetClose asChild>
                    <a
                      href="#how-it-works"
                      className="rounded-md px-2 py-2 transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {t("nav.howItWorks")}
                    </a>
                  </SheetClose>
                  <SheetClose asChild>
                    <a
                      href="#benefits"
                      className="rounded-md px-2 py-2 transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {t("nav.benefits")}
                    </a>
                  </SheetClose>
                  <SheetClose asChild>
                    <a
                      href="#faq"
                      className="rounded-md px-2 py-2 transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {t("faq.navLabel")}
                    </a>
                  </SheetClose>
                </nav>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      typography="marketing"
                      className="w-full border-hairline-strong bg-transparent text-action-secondary hover:text-foreground"
                    >
                      <Link href="/login">{t("logIn")}</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button
                      asChild
                      size="lg"
                      typography="marketing"
                      className="w-full"
                    >
                      <Link href="/signup">{t("signUp")}</Link>
                    </Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </GlassBar>
    </header>
  );
}
