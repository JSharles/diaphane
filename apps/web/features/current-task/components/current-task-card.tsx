"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { CurrentTaskItem } from "schemas";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/shared/components/ui/carousel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { useCurrentTask } from "../hooks";

// "In progress" is a status, and a status is a badge with a fixed dot: no
// rotating ring, no pulse (DESIGN.md § 5 Mouvement, § 6 Badge). Being under
// way is neutral, not a success and not a warning.

// Frontend-only relative-time formatting from the item's own `updatedAt`
// (backend already tracks this via VulgarizedTask.updatedAt) — no new
// backend contract to design, just surfacing what was already persisted.
// Answers the critique finding
// that nothing on this page tells an anxious client whether "in progress"
// means five minutes ago or three weeks ago.
function formatRelativeTime(isoDate: string, locale: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(-diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(-diffHours, "hour");
  }
  return rtf.format(-Math.round(diffHours / 24), "day");
}

// Plain helper (not the component body) computing everything time-derived —
// keeps Date.now() out of the component's render body, same reasoning as
// formatRelativeTime above (react-hooks/purity flags an impure call written
// directly inside a component/hook, not one hidden behind a called function).
function computeProgress(startedAt: string, estimatedCompletionAt: string) {
  const start = new Date(startedAt).getTime();
  const end = new Date(estimatedCompletionAt).getTime();
  const now = Date.now();
  const totalMs = Math.max(end - start, 1);
  return {
    percent: Math.min(100, Math.max(0, ((now - start) / totalMs) * 100)),
    isOver: now > end,
    diffDays: Math.round((end - now) / (24 * 60 * 60 * 1000)),
  };
}

// 2026-08-09, second pass: the two-column split (title/sections on the
// left, every timestamp/estimate/confidence stacked in a bordered sidebar
// on the right) read as a dashboard stat panel bolted onto a paragraph —
// the user asked for one vertical reading order instead, and for the time/
// confidence info to read as real sentences rather than short icon-led
// labels. Confidence in particular used to just print "high"/"medium"/
// "low" (via the confidence.* keys) — now a full sentence explaining what
// that level actually means for the estimate's reliability, since a bare
// adjective assumes the client already knows what "confidence" refers to.
function ProgressIndicator({
  startedAt,
  estimatedCompletionAt,
  confidence,
  locale,
  t,
}: {
  startedAt: string;
  estimatedCompletionAt: string;
  confidence: "high" | "medium" | "low" | null;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const { percent, isOver, diffDays } = computeProgress(startedAt, estimatedCompletionAt);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  return (
    <div className="flex flex-col gap-2 text-[0.8125rem]">
      <p className={isOver ? "text-warning" : "text-fg-3"}>
        {isOver ? t("runningOver") : t("estimatedCompletion", { time: rtf.format(diffDays, "day") })}
      </p>
      {confidence && (
        <p className={confidence === "low" ? "text-warning" : "text-fg-3"}>
          {t(`confidence.${confidence}`)}
        </p>
      )}
      {/* No colour on the bar (DESIGN.md § 6): the track is a hairline, the
          fill is the text colour, and the sentence above says whether the
          estimate has been passed. */}
      <Progress value={percent} aria-label={t("progressLabel")} />
    </div>
  );
}

// One consistent "label above content" treatment for every section — En
// cours/Pourquoi/Impact/État all read as parallel, equally-weighted parts
// of the same structure (docs/PRODUCT.md "Working notes" sketches this
// literally as a flat bullet list: "En cours — ...", "Pourquoi c'est
// nécessaire — ...", etc.), not a title with three lesser footnotes under
// it.
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* No capitals in a label (DESIGN.md § 4 Interdits typographiques). */}
      <span className="text-[0.8125rem] font-medium text-fg-3">{label}</span>
      {children}
    </div>
  );
}

// 2026-08-10: only the title, why, timeline, and estimate render directly
// on the card — impact/état never render inline, only in the "read more"
// panel. Why (the reassurance a non-technical client actually reads
// first) stays exactly where they land, without a click; the rest is one
// tap away.
//
// The panel itself always shows all three sections (why repeated, impact,
// état) and the button always renders, regardless of what the AI actually
// filled in — a client landing on two different tasks should find the
// same panel shape every time, not a structure that silently varies with
// how much the source ticket happened to support. A field the model
// genuinely left null (Constitution II, "never fabricate" — a locked
// product principle, not something this component works around) still
// shows its own section, with an explicit "not provided" placeholder
// instead of inventing something plausible.
function TaskCardBody({
  item,
  locale,
  t,
}: {
  item: CurrentTaskItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="flex min-h-0 flex-1 max-w-prose flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Badge>{t("inProgress")}</Badge>
        {/* h2, not a bare span: the task's own title is genuinely the most
            important string on the card and belongs in the heading outline.
            It is a document title, so it speaks in the voice. */}
        <h2 className="font-serif text-[1.625rem] leading-tight font-normal text-balance">
          {item.title}
        </h2>
      </div>

      {item.why && (
        <Section label={t("why")}>
          <p className="font-serif text-[1.0625rem] leading-relaxed">{item.why}</p>
        </Section>
      )}

      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            className="w-fit text-sm font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t("readMore")}
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="gap-0 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{item.title}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-5 px-4 pb-4">
            <Section label={t("why")}>
              <p
                className={cn(
                  "font-serif text-[1.0625rem] leading-relaxed",
                  item.why ? "text-foreground" : "text-fg-3 italic",
                )}
              >
                {item.why ?? t("notProvided")}
              </p>
            </Section>
            <Section label={t("impact")}>
              <p
                className={cn(
                  "font-serif text-[1.0625rem] leading-relaxed",
                  item.impact ? "text-foreground" : "text-fg-3 italic",
                )}
              >
                {item.impact ?? t("notProvided")}
              </p>
            </Section>
            <Section label={t("status")}>
              <p
                className={cn(
                  "font-serif text-[1.0625rem] leading-relaxed",
                  item.status ? "text-foreground" : "text-fg-3 italic",
                )}
              >
                {item.status ?? t("notProvided")}
              </p>
            </Section>
          </div>
        </SheetContent>
      </Sheet>

      {/* Time/estimate/confidence: one vertical reading order, not a
          separate bordered sidebar (that read as a dashboard stat panel
          bolted onto a paragraph) — a plain sentence rather than an
          icon-led label, consistent with the why/impact/status sections
          above it, closing out the card instead of racing it side by
          side. mt-auto (2026-08-10): with every card now stretched to the
          row's tallest (see TaskCardCarousel), a short task's why/impact/
          status content left this floating right under the title instead
          of anchored to the card's own bottom edge like its longer
          neighbors' — auto margin absorbs whatever space the middle
          content didn't use, every card's timeline/estimate ends up flush
          against the bottom regardless of how little sits above it. */}
      <p className="mt-auto border-t border-hairline pt-3 ui-meta text-fg-3">
        {t("timeline", {
          started: formatRelativeTime(item.startedAt, locale),
          updated: formatRelativeTime(item.updatedAt, locale),
        })}
      </p>
      {item.estimatedCompletionAt && (
        <ProgressIndicator
          startedAt={item.startedAt}
          estimatedCompletionAt={item.estimatedCompletionAt}
          confidence={item.estimateConfidence}
          locale={locale}
          t={t}
        />
      )}
    </div>
  );
}

// The full frosted-glass Signature Card for one task — glow, border, blur,
// all of it — not just its inner content. 2026-08-10: rebuilt from a
// content-only carousel (one shared card frame, its text sliding inside)
// after the "which task is this" cue turned out too subtle — the whole
// card itself now pages, so a peeking neighbor (see TaskCardCarousel)
// visibly reads as "another card," not a scrollbar-less content swap.
// `active`: dims/shrinks a peeking, not-currently-selected card — full
// strength (the default) everywhere this renders outside a carousel.
function TaskCard({
  item,
  locale,
  t,
  active = true,
}: {
  item: CurrentTaskItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  active?: boolean;
}) {
  return (
    // max-h (2026-08-10): equal-height (h-full, stretched to the row's
    // tallest sibling) was previously unbounded — one verbose task would
    // balloon every card in the row to match it. A fixed ceiling plus
    // TaskCardBody's own internal clipping (see useIsOverflowing) means a
    // long task's card stops growing and instead offers "read more"
    // rather than dragging its neighbors up with it.
    //
    // flex flex-col here (not just a plain block box) is load-bearing:
    // Card below needs to size against *this* element's actual rendered
    // height, which is auto-but-capped whenever there's no carousel (the
    // single-task case has no ancestor with a definite height at all). A
    // plain `height:100%` child can't resolve against an auto+max-height
    // parent — CSS only treats that as definite for percentage purposes
    // when height was itself an explicit/resolved value, not "auto,
    // clamped." flex-basis sizing doesn't have that restriction: a flex
    // item sizes against its container's *actual* box regardless of how
    // that box's own height was determined. Same reasoning repeats one
    // level down at Card/CardContent/TaskCardBody (flex-1 + min-h-0
    // instead of h-full) — this is the one spot the chain needs to start.
    // La porte (DESIGN.md § 7): the one Lait surface inside the Encre. No
    // border, no shadow, no glass; the contrast with the ground is enough.
    <div
      className={cn(
        "relative flex h-full max-h-[30rem] flex-col overflow-hidden rounded-lg transition-opacity duration-300",
        !active && "opacity-50",
      )}
    >
      <Card
        data-theme="lait"
        className="relative min-h-0 flex-1 border-0 bg-background text-foreground"
      >
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 py-6">
          <TaskCardBody item={item} locale={locale} t={t} />
        </CardContent>
      </Card>
    </div>
  );
}

// Same frosted-glass frame as TaskCard, without needing an actual item —
// reused for the loading skeleton and the empty state so every state of
// this card reads as the same surface, not a plain box that upgrades to
// the Signature Card only once real data exists.
function CardShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-lg">
      <Card
        data-theme="lait"
        className="relative border-0 bg-background text-foreground"
      >
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

// Mounted once there are 2+ in-progress items. The cards themselves slide
// (each a full TaskCard, not shared content inside one frame), and the
// next/previous card peeks in at each edge — align: "center" plus each
// slide sized under 100% width is what produces the peek, entirely inside
// the carousel's own clipped viewport (no page-level overflow risk). A
// peeking card is clickable (a full-cover button appears over it only
// while it isn't the selected one) so "browse by clicking a neighbor" and
// "browse via the prev/next buttons" both work. The counter stays visible
// before any interaction, same reasoning as before: a carousel that only
// reveals how many tasks exist after paging through works against this
// product's "total transparency" premise (docs/PRODUCT.md tagline) — here
// the peeking cards themselves already do that job, the counter is the
// exact-count backup for someone who can't judge it from a sliver.
function TaskCardCarousel({
  items,
  locale,
  t,
}: {
  items: CurrentTaskItem[];
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    // No synchronous setCurrent() here: the initial snap is always index 0
    // (no startIndex configured), matching current's own initial state —
    // this effect only needs to subscribe to *changes* from here on.
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 flex flex-col gap-4 motion-safe:duration-300">
      <Carousel setApi={setApi} opts={{ align: "center", loop: false }}>
        {/* No items-start override here (unlike a plain content carousel)
            — cards of unequal height should still read as one consistent
            row, not a ragged one where a short task's card visibly stops
            short next to a long one's. Default flex stretch handles it,
            provided every layer between here and TaskCard's own Card
            propagates h-full instead of collapsing to its own content. */}
        <CarouselContent>
          {items.map((item, index) => (
            <CarouselItem key={item.title} className="basis-[85%]">
              <div className="relative h-full">
                <TaskCard item={item} locale={locale} t={t} active={index === current} />
                {index !== current && (
                  <button
                    type="button"
                    className="absolute inset-0 cursor-pointer rounded-xl"
                    aria-label={t("selectTask", { title: item.title })}
                    onClick={() => api?.scrollTo(index)}
                  />
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("previousTask")}
          disabled={!api?.canScrollPrev()}
          onClick={() => api?.scrollPrev()}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {t("taskCounter", { current: current + 1, total: items.length })}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("nextTask")}
          disabled={!api?.canScrollNext()}
          onClick={() => api?.scrollNext()}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function CurrentTaskCard({ projectId }: { projectId: string }) {
  const { data: items, isPending } = useCurrentTask(projectId);
  const t = useTranslations("Projects.CurrentTaskCard");
  const locale = useLocale();

  if (isPending) {
    return (
      <CardShell>
        <Skeleton className="h-10 w-full" />
      </CardShell>
    );
  }

  if (!items || items.length === 0) {
    return (
      <CardShell>
        {/* Nothing under way is a neutral status, not a broken card. */}
        <Badge>{t("emptyBadge")}</Badge>
        <p className="text-[0.9375rem] text-fg-2">{t("empty")}</p>
      </CardShell>
    );
  }

  if (items.length === 1) {
    // Single task: no carousel chrome (prev/next buttons that would
    // always be disabled, a peek that has nothing to peek at) — same
    // authored entrance motion as the carousel case below.
    return (
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
        <TaskCard item={items[0]} locale={locale} t={t} />
      </div>
    );
  }

  return <TaskCardCarousel items={items} locale={locale} t={t} />;
}
