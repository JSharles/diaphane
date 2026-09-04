import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function LandingFooter() {
  const t = useTranslations("Landing.footer");

  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div className="flex items-center gap-3">
          <Image
            src="/images/logo-square.png"
            alt=""
            width={332}
            height={332}
            className="size-8"
          />
          <span className="font-black tracking-tight text-primary">
            Diaphane
          </span>
        </div>
        <div className="flex max-w-lg flex-col gap-2 text-sm text-muted-foreground">
          <p>{t("statement")}</p>
          <p>
            {t("invitedHint")}{" "}
            <Link href="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
              {t("invitedLogin")}
            </Link>
            .
          </p>
        </div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("status")}
        </p>
      </div>
    </footer>
  );
}
