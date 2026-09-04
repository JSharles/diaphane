"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import type { EstimateUnit } from "schemas";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";

const UNITS: EstimateUnit[] = ["days", "hours"];

// How the board's numeric "Estimate" converts to a duration when there is no
// "Target date" to read directly. The same two buttons whether the board is
// being chosen (ConnectBoardDialog) or already connected (BoardConnectionCard):
// the unit is a reading of the board, changed beside the board it reads.
export function EstimateUnitField({
  value,
  onChange,
  disabled,
}: {
  value: EstimateUnit;
  onChange: (unit: EstimateUnit) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Projects.EstimateUnitField");
  const labelId = useId();

  return (
    <div className="flex flex-col gap-1">
      <Label id={labelId}>{t("label")}</Label>
      <div className="flex gap-2" role="radiogroup" aria-labelledby={labelId}>
        {UNITS.map((unit) => (
          <Button
            key={unit}
            type="button"
            role="radio"
            aria-checked={value === unit}
            size="sm"
            variant={value === unit ? "default" : "outline"}
            disabled={disabled}
            onClick={() => onChange(unit)}
          >
            {t(unit)}
          </Button>
        ))}
      </div>
    </div>
  );
}
