"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase, missingSettings } from "@/lib/supabase";

type CaseRow = {
  id: string;
  created_at: string;
  name: string;
  track: string;
  chase_date: string;
  fee: number;
  outcome: "open" | "called" | "sent" | "done";
};

const TRACKS = [
  "flat search",
  "job application",
  "form to send",
  "letter to answer",
];

const OUTCOMES = ["called", "sent", "done"] as const;

const todayStr = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

function dayStatus(chaseDate: string, outcome: string) {
  if (outcome === "done") return { kind: "done" as const, label: "Done" };
  if (chaseDate < todayStr()) return { kind: "slipping" as const, label: "Slipping" };
  if (chaseDate === todayStr()) return { kind: "today" as const, label: "Due today" };
  return { kind: "ahead" as const, label: "Coming up" };
}

function prettyDate(iso: string) {
  const [y, m, d] = iso.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

function formatFee(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function Board() {
  const [status, setStatus] = useState<
    "loading" | "missing" | "error" | "empty" | "ready"
  >("loading");
  const [missing, setMissing] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const supabase = useMemo(() => getSupabase(), []);

  const load = async (silent = false) => {
    const ms = missingSettings();
    if (ms.length > 0) {
      setMissing(ms);
      setStatus("missing");
      return;
    }
    if (!supabase) {
      setErrorMsg("Supabase client could not be created.");
      setStatus("error");
      return;
    }
    if (!silent) setStatus("loading");
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("chase_date", { ascending: true });
      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }
      const list = (data as CaseRow[]) ?? [];
      if (list.length === 0) {
        setStatus("empty");
        return;
      }
      setRows(list);
      setStatus("ready");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setOutcome = async (id: string, outcome: CaseRow["outcome"]) => {
    if (!supabase) return;
    setSaving(id);
    const prev = rows;
    try {
      const { error } = await supabase
        .from("cases")
        .update({ outcome })
        .eq("id", id);
      if (error) throw new Error(error.message);
      setRows((r) =>
        r.map((row) => (row.id === id ? { ...row, outcome } : row)),
      );
    } catch (e) {
      setErrorMsg(
        `Could not save: ${e instanceof Error ? e.message : String(e)}`,
      );
      setRows(prev);
    } finally {
      setSaving(null);
    }
  };

  const totals = useMemo(() => {
    const done = rows.filter((r) => r.outcome === "done").length;
    const open = rows.filter((r) => r.outcome === "open").length;
    const slipping = rows.filter(
      (r) => r.outcome !== "done" && r.chase_date < todayStr(),
    ).length;
    const atStake = rows
      .filter((r) => r.outcome !== "done")
      .reduce((sum, r) => sum + r.fee, 0);
    return { total: rows.length, done, open, slipping, atStake };
  }, [rows]);

  if (status === "missing") {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-12">
        <Shell>
          <div className="rounded-xl border-2 border-dashed border-[#b3261e] bg-white p-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#b3261e]">
              Board can&apos;t start
            </p>
            <h1 className="mb-3 text-2xl font-bold">A setting is missing</h1>
            <p className="mb-4 text-[#5b6270]">
              The case board needs two environment variables before it can read
              your data. Missing:
            </p>
            <ul className="mb-4 space-y-2">
              {missing.map((name) => (
                <li key={name} className="rounded-lg bg-[#f4f4f1] px-3 py-2 font-mono text-sm">
                  {name}
                </li>
              ))}
            </ul>
            <p className="mb-4 text-sm text-[#5b6270]">
              Add them to <code className="font-mono">.env.local</code> in the
              project, then restart <code className="font-mono">npm run dev</code>.
            </p>
            <button
              onClick={() => load()}
              className="h-11 w-full rounded-lg bg-[#16181d] text-white"
            >
              Retry
            </button>
          </div>
        </Shell>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-12">
        <Shell>
          <div className="rounded-xl border-2 border-[#b3261e] bg-white p-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#b3261e]">
              Connection failed
            </p>
            <h1 className="mb-3 text-2xl font-bold">
              Couldn&apos;t reach the case table
            </h1>
            <p className="mb-4 text-[#5b6270]">
              Supabase answered, but the read failed. The error was:
            </p>
            <pre className="mb-4 overflow-x-auto rounded-lg bg-[#16181d] px-3 py-3 font-mono text-sm text-[#f4f4f1]">
              {errorMsg}
            </pre>
            <p className="mb-4 text-sm text-[#5b6270]">
              If it mentions the table relation, run{" "}
              <code className="font-mono">supabase-sql.sql</code> (Block 1) in
              the Supabase SQL editor first.
            </p>
            <button
              onClick={() => load()}
              className="h-11 w-full rounded-lg bg-[#16181d] text-white"
            >
              Retry
            </button>
          </div>
        </Shell>
      </main>
    );
  }

  if (status === "empty") {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-12">
        <Shell>
          <div className="rounded-xl border-2 border-[#2f6fed] bg-white p-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#2f6fed]">
              Waiting for data
            </p>
            <h1 className="mb-3 text-2xl font-bold">The table is empty</h1>
            <p className="mb-4 text-[#5b6270]">
              The <code className="font-mono">cases</code> table exists and the
              connection works, but it has no rows. Run{" "}
              <code className="font-mono">supabase-sql.sql</code> (Block 2) in
              the Supabase SQL editor to fill it with demo data.
            </p>
            <button
              onClick={() => load()}
              className="h-11 w-full rounded-lg bg-[#16181d] text-white"
            >
              Refresh
            </button>
          </div>
        </Shell>
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-12">
        <Shell>
          <div className="space-y-3">
            <div className="h-4 w-40 animate-pulse rounded bg-[#e3e3de]" />
            <div className="h-10 w-full animate-pulse rounded bg-[#e3e3de]" />
            <div className="h-10 w-full animate-pulse rounded bg-[#e3e3de]" />
            <div className="h-10 w-full animate-pulse rounded bg-[#e3e3de]" />
          </div>
        </Shell>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-12">
      <Shell>
        <header className="mb-8">
          <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-[#2f6fed]">
            ChaseMate · Case board
          </p>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            What&apos;s slipping this week
          </h1>
          <p className="text-[#5b6270]">
            One look at every person you are helping and what is stuck.
          </p>
        </header>

        <section
          aria-label="Totals"
          className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <Stat label="Open cases" value={totals.open} />
          <Stat
            label="Slipping"
            value={totals.slipping}
            tone={totals.slipping > 0 ? "bad" : "ok"}
          />
          <Stat label="Done" value={totals.done} />
          <Stat label="Fee at stake" value={formatFee(totals.atStake)} tone="accent" />
        </section>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-[#b3261e] bg-[#b3261e]/5 px-4 py-3 text-sm text-[#b3261e]">
            {errorMsg}
          </div>
        )}

        <ul className="space-y-3">
          {rows.map((row) => {
            const st = dayStatus(row.chase_date, row.outcome);
            const trackPill =
              st.kind === "slipping"
                ? "border-[#b3261e] bg-[#b3261e]/10 text-[#b3261e]"
                : st.kind === "today"
                  ? "border-[#2f6fed] bg-[#2f6fed]/10 text-[#2f6fed]"
                  : "border-[#e3e3de] bg-[#f4f4f1] text-[#5b6270]";
            return (
              <li
                key={row.id}
                className="rounded-xl border border-[#e3e3de] bg-white p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold leading-snug">
                      {row.name}
                    </h2>
                    <p className="mt-1 text-sm text-[#5b6270]">{row.track}</p>
                  </div>
                  <div
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${trackPill}`}
                  >
                    {st.label}
                  </div>
                </div>

                <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#5b6270]">
                    Chase date {prettyDate(row.chase_date)}
                  </span>
                  <span className="font-semibold">{formatFee(row.fee)}</span>
                </div>

                <div
                  className="grid grid-cols-3 gap-2"
                  role="group"
                  aria-label="Tick an outcome"
                >
                  {OUTCOMES.map((outcome) => {
                    const selected = row.outcome === outcome;
                    return (
                      <button
                        key={outcome}
                        disabled={saving === row.id}
                        onClick={() => setOutcome(row.id, outcome)}
                        className={
                          selected
                            ? "h-11 rounded-lg bg-[#16181d] font-semibold text-white"
                            : "h-11 rounded-lg border border-[#e3e3de] text-[#16181d] hover:bg-[#f4f4f1]"
                        }
                      >
                        {outcome.slice(0, 1).toUpperCase() + outcome.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        <footer className="mt-8 flex items-center justify-between text-xs text-[#5b6270]">
          <span>
            {totals.total} cases · data stays after refresh (Supabase)
          </span>
          <button onClick={() => load(true)} className="h-11 px-2 font-medium">
            Refresh
          </button>
        </footer>
      </Shell>
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="font-[Geist,sans-serif]">{children}</div>;
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "bad" | "ok" | "accent";
}) {
  const color =
    tone === "bad"
      ? "text-[#b3261e]"
      : tone === "ok"
        ? "text-[#17734b]"
        : tone === "accent"
          ? "text-[#2f6fed]"
          : "text-[#16181d]";
  return (
    <div className="rounded-xl border border-[#e3e3de] bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#5b6270]">
        {label}
      </p>
      <p className={`mt-1 truncate text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
