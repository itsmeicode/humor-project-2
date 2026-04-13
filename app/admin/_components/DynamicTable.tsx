function cellText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  const s = String(value);
  return s.length > 200 ? `${s.slice(0, 200)}…` : s;
}

export function DynamicTable({
  rows,
}: {
  rows: Record<string, unknown>[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">No rows.</p>
    );
  }

  const keys = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r)))
  ).sort();

  return (
    <div className="w-full max-w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-max min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          <tr>
            {keys.map((k) => (
              <th key={k} className="px-3 py-2 font-medium">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((row, i) => (
            <tr
              key={row.id != null ? String(row.id) : `row-${i}`}
              className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
            >
              {keys.map((k) => (
                <td
                  key={k}
                  className="max-w-[28rem] whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs text-zinc-800 dark:text-zinc-200"
                  title={cellText(row[k])}
                >
                  {cellText(row[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
