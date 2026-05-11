import type { JsonObject } from "@/lib/types";

export function BulletList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Not provided</p>;
  }

  return (
    <ul className="list-disc space-y-2 pl-5 leading-7">
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
    return <p className="leading-7">{value}</p>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(value).map(([key, entry]) => (
        <div key={key} className="rounded-md border bg-background p-3">
          <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            {humanizeKey(key)}
          </div>
          {Array.isArray(entry) ? (
            <BulletList items={entry.map(String)} />
          ) : typeof entry === "object" && entry !== null ? (
            <JsonSection value={entry as JsonObject} />
          ) : (
            <p className="leading-7">{String(entry || "Not provided")}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function humanizeKey(value: string) {
  return value.replace(/_/g, " ");
}
