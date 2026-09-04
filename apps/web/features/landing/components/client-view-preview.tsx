import { useTranslations } from "next-intl";
import type { PublicMilestone } from "schemas";
import { ClientTimeline } from "@/shared/components/client-timeline";

// The client's roadmap, rendered by the very component the client's page
// uses (ClientTimeline), on an example project: not a drawing of the view,
// the view. The marker sits on the second phase's second step, so the shape
// answers "where are we?" before a word is read.
const CURRENT_ID = "m2-s2";

export function ClientViewPreview() {
  const t = useTranslations("Landing.clients.preview");

  const milestones: PublicMilestone[] = [
    {
      id: "m1",
      title: t("m1Title"),
      when: t("m1When"),
      description: null,
      substeps: [
        { id: "m1-s1", title: t("m1S1"), when: null, description: null },
        { id: "m1-s2", title: t("m1S2"), when: null, description: null },
      ],
    },
    {
      id: "m2",
      title: t("m2Title"),
      when: t("m2When"),
      description: null,
      substeps: [
        { id: "m2-s1", title: t("m2S1"), when: null, description: null },
        { id: CURRENT_ID, title: t("m2S2"), when: null, description: null },
        { id: "m2-s3", title: t("m2S3"), when: null, description: null },
      ],
    },
    {
      id: "m3",
      title: t("m3Title"),
      when: t("m3When"),
      description: null,
      substeps: [
        { id: "m3-s1", title: t("m3S1"), when: null, description: null },
        { id: "m3-s2", title: t("m3S2"), when: null, description: null },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <span className="w-fit font-mono text-xs font-semibold tracking-[0.08em] text-primary uppercase">
        {t("label")}
      </span>
      <div className="rounded-xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur sm:p-6">
        <p className="text-lg font-bold">{t("projectTitle")}</p>
        {/* The client's tab strip, shown, not operable: a list with the open
            tab marked, so assistive tech is never told there are tabs to work. */}
        <ul className="mt-4 flex gap-5 border-b border-border text-sm">
          {(["tabProject", "tabRoadmap", "tabTask"] as const).map((key) => {
            const open = key === "tabRoadmap";
            return (
              <li
                key={key}
                aria-current={open ? "true" : undefined}
                className={
                  open
                    ? "-mb-px border-b-2 border-foreground pb-2 font-semibold text-foreground"
                    : "pb-2 text-muted-foreground"
                }
              >
                {t(key)}
              </li>
            );
          })}
        </ul>
        <div className="mt-6">
          <ClientTimeline milestones={milestones} currentMilestoneId={CURRENT_ID} />
        </div>
        <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
          {t("note")}
        </p>
      </div>
    </div>
  );
}
