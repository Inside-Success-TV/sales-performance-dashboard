import { normalizeStringList } from "@/lib/list-format";
import type { JsonObject } from "@/lib/types";

export function BulletList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Not provided</p>;
  }

  return (
    <ul className="list-disc space-y-2 pl-5 leading-7 marker:text-primary">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export function JsonSection({ value }: { value: JsonObject | string | null }) {
  if (!value) {
    return <p className="text-sm text-muted-foreground">Not provided</p>;
  }

  if (typeof value === "string") {
    const items = normalizeStringList(value);
    if (items.length > 1) return <BulletList items={items} />;

    return <p className="leading-7">{value}</p>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(value).map(([key, entry]) => (
        <div key={key} className="border-l-2 border-primary/25 pl-4">
          <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            {humanizeKey(key)}
          </div>
          {Array.isArray(entry) ? (
            <BulletList items={normalizeStringList(entry)} />
          ) : typeof entry === "object" && entry !== null ? (
            <JsonSection value={entry as JsonObject} />
          ) : (
            <JsonEntry value={entry} />
          )}
        </div>
      ))}
    </div>
  );
}

function JsonEntry({ value }: { value: unknown }) {
  const items = normalizeStringList(value);
  if (items.length > 1) return <BulletList items={items} />;

  return <p className="leading-7">{String(value || "Not provided")}</p>;
}

function humanizeKey(value: string) {
  const labels: Record<string, string> = {
    root_cause: "Root Cause",
    missed_moment: "Missed Moment",
    what_to_say_next_time: "What To Say Next Time",
    how_to_stay_on_longer: "How To Stay On Longer",
    what_they_did_right: "Move",
    upsell_opportunity: "Upsell Opportunity",
    how_to_replicate: "Replicate",
    how_to_maximize_value: "Maximize Value",
  };

  return labels[value] || value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
