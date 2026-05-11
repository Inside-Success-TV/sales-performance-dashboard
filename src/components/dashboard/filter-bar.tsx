import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DashboardFilters, RepSummary } from "@/lib/types";

type FilterBarProps = {
  filters: DashboardFilters;
  reps: RepSummary[];
  repLocked?: boolean;
};

export function FilterBar({ filters, reps, repLocked = false }: FilterBarProps) {
  return (
    <form className="grid gap-3 rounded-lg border bg-card p-3 shadow-sm md:grid-cols-[minmax(220px,1fr)_160px_160px_140px_140px_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          name="q"
          defaultValue={filters.q}
          placeholder="Search coaching notes, clients, reps"
        />
      </div>

      {!repLocked ? (
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          name="rep"
          defaultValue={filters.rep || ""}
          aria-label="Filter by rep"
        >
          <option value="">All reps</option>
          {reps.map((rep) => (
            <option key={rep.rep_slug} value={rep.rep_slug}>
              {rep.rep_name}
            </option>
          ))}
        </select>
      ) : null}

      <Input name="client" defaultValue={filters.client} placeholder="Client" />
      <Input name="from" defaultValue={filters.from} type="date" aria-label="From date" />
      <Input name="to" defaultValue={filters.to} type="date" aria-label="To date" />
      <Button type="submit">Apply</Button>
    </form>
  );
}
