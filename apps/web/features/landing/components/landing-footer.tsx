import { useTranslations } from "next-intl";
import { Emblem } from "@/shared/components/emblem";
import { Link } from "@/i18n/navigation";

export function LandingFooter() {
  const t = useTranslations("Landing.footer");

  return (
    <footer className="border-t border-hairline px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div className="flex items-center gap-3">
          <Emblem />
          <span className="text-base font-medium text-foreground">
            Diaphane
          </span>
        </div>
        <div className="flex max-w-lg flex-col gap-2 text-[0.9375rem] text-fg-2">
          <p>{t("statement")}</p>
          <p>
            {t("invitedHint")}{" "}
            <Link href="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
              {t("invitedLogin")}
            </Link>
            .
          </p>
        </div>
        <p className="text-xs text-fg-3">
          {t("status")}
        </p>
      </div>
    </footer>
  );
}
