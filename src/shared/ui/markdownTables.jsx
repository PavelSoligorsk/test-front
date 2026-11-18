export const markdownTableComponents = {
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="whitespace-nowrap px-4 py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-zinc-100 px-4 py-2.5 align-top text-zinc-600 dark:border-zinc-800/50 dark:text-zinc-300">
      {children}
    </td>
  ),
};
