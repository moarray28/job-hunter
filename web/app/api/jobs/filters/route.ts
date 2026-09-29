import { NextResponse } from "next/server";
import { collections } from "@/lib/server/db";
import { FILTERS } from "@/lib/server/filters";
import { handler } from "@/lib/server/http";
import type { FilterDef } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Filter definitions for the UI, with select options resolved from current data. */
export const GET = handler(async () => {
  const jobs = await collections.jobs();
  const defs: FilterDef[] = await Promise.all(
    FILTERS.map(async (f) => ({
      key: f.key,
      label: f.label,
      kind: f.kind,
      placeholder: f.placeholder ?? null,
      options: f.optionsField
        ? ((await jobs.distinct(f.optionsField)) as unknown[])
            .filter((v): v is string => typeof v === "string" && v !== "")
            .sort()
        : f.options
          ? [...f.options]
          : null,
    })),
  );
  return NextResponse.json(defs);
});
