'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import Modal from '@/components/modal';

type AuditLog = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  before_data: unknown;
  after_data: unknown;
  reason: string | null;
  created_at: string;
};

type ReadableField = {
  label: string;
  value: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatAction(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatEntity(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMoney(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value ?? '—');
  }

  return `${number.toLocaleString('en-US')} RWF`;
}

function formatNumber(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value ?? '—');
  }

  return number.toLocaleString('en-US');
}

function formatValue(value: unknown, key?: string) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (
    key &&
    [
      'total_cost',
      'total_revenue',
      'total_profit',
      'amount_paid',
      'amount_due',
      'new_customer_credit',
      'selling_price',
      'unit_cost',
    ].includes(key)
  ) {
    return formatMoney(value);
  }

  if (
    key &&
    [
      'quantity',
      'remaining_quantity',
      'original_quantity',
      'previous_quantity',
      'new_quantity',
    ].includes(key)
  ) {
    return formatNumber(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function prettifyKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActionTheme(action: string) {
  const value = action.toLowerCase();

  if (
    value.includes('delete') ||
    value.includes('loss') ||
    value.includes('damaged')
  ) {
    return {
      badge:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300',
      dot: 'bg-rose-500',
      icon: '×',
    };
  }

  if (
    value.includes('return') ||
    value.includes('recover')
  ) {
    return {
      badge:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
      dot: 'bg-amber-500',
      icon: '↩',
    };
  }

  if (
    value.includes('create') ||
    value.includes('purchase') ||
    value.includes('sale')
  ) {
    return {
      badge:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      icon: '+',
    };
  }

  if (
    value.includes('update') ||
    value.includes('edit') ||
    value.includes('payment')
  ) {
    return {
      badge:
        'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300',
      dot: 'bg-indigo-500',
      icon: '↻',
    };
  }

  return {
    badge:
      'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-500',
    icon: '•',
  };
}

function getObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getReadableFields(value: unknown): ReadableField[] {
  const object = getObject(value);

  if (!object) {
    return [];
  }

  return Object.entries(object).map(([key, item]) => ({
    label: prettifyKey(key),
    value: formatValue(item, key),
  }));
}

function getUserEmail(log: AuditLog) {
  if (!log.user_id) {
    return 'System';
  }

  if (!log.user_email) {
    return 'Unknown Email';
  }

  return log.user_email;
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data, error: historyError } = await supabase.rpc(
      'get_audit_history_with_email'
    );

    if (historyError) {
      setError(historyError.message);
      setLogs([]);
      setLoading(false);
      return;
    }

    setLogs((data || []) as AuditLog[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const actionOptions = useMemo(() => {
    return Array.from(
      new Set(
        logs
          .map((item) => item.action_type)
          .filter(Boolean)
      )
    ).sort();
  }, [logs]);

  const entityOptions = useMemo(() => {
    return Array.from(
      new Set(
        logs
          .map((item) => item.entity_type)
          .filter(Boolean)
      )
    ).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      const userEmail = getUserEmail(log);

      const matchesSearch =
        !query ||
        [
          log.action_type,
          log.entity_type,
          log.entity_id,
          log.reason,
          userEmail,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query)
          );

      const matchesAction =
        actionFilter === 'all' ||
        log.action_type === actionFilter;

      const matchesEntity =
        entityFilter === 'all' ||
        log.entity_type === entityFilter;

      const logDate = new Date(log.created_at);

      const matchesStart =
        !startDate ||
        logDate >=
          new Date(`${startDate}T00:00:00`);

      const matchesEnd =
        !endDate ||
        logDate <=
          new Date(`${endDate}T23:59:59`);

      return (
        matchesSearch &&
        matchesAction &&
        matchesEntity &&
        matchesStart &&
        matchesEnd
      );
    });
  }, [
    logs,
    search,
    actionFilter,
    entityFilter,
    startDate,
    endDate,
  ]);

  const summary = useMemo(() => {
    let creates = 0;
    let updates = 0;
    let deletes = 0;
    let other = 0;

    for (const log of filteredLogs) {
      const action =
        log.action_type.toLowerCase();

      if (action.includes('delete')) {
        deletes += 1;
      } else if (
        action.includes('create') ||
        action.includes('purchase') ||
        action.includes('sale')
      ) {
        creates += 1;
      } else if (
        action.includes('update') ||
        action.includes('edit') ||
        action.includes('payment')
      ) {
        updates += 1;
      } else {
        other += 1;
      }
    }

    return {
      total: filteredLogs.length,
      creates,
      updates,
      deletes,
      other,
    };
  }, [filteredLogs]);

  function clearFilters() {
    setSearch('');
    setActionFilter('all');
    setEntityFilter('all');
    setStartDate('');
    setEndDate('');
  }

  function handlePrint() {
    window.print();
  }

  function handleExport() {
    const rows = [
      [
        'Date & Time',
        'Action',
        'Entity',
        'Entity ID',
        'User Email',
        'Reason',
      ],
      ...filteredLogs.map((log) => [
        formatDate(log.created_at),
        formatAction(log.action_type),
        formatEntity(log.entity_type),
        log.entity_id || '',
        getUserEmail(log),
        log.reason || '',
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map(escapeCsv).join(',')
      )
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;

    link.download = `history-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  }

  const selectedBeforeFields =
    selectedLog
      ? getReadableFields(
          selectedLog.before_data
        )
      : [];

  const selectedAfterFields =
    selectedLog
      ? getReadableFields(
          selectedLog.after_data
        )
      : [];

  const selectedUserEmail =
    selectedLog
      ? getUserEmail(selectedLog)
      : '';

  return (
    <>
      <section className="min-h-full p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* HERO */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

                <div className="max-w-3xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Business Activity
                  </div>

                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                    History
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    A complete activity trail for sales,
                    purchases, payments, stock changes,
                    returns, losses, recoveries and
                    other important business actions.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
                    <span className="rounded-full bg-white/5 px-3 py-1.5">
                      {logs.length.toLocaleString()} total records
                    </span>

                    <span className="rounded-full bg-white/5 px-3 py-1.5">
                      {summary.total.toLocaleString()} shown
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
                  >
                    Print
                  </button>

                  <button
                    type="button"
                    onClick={handleExport}
                    className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SUMMARY */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total Activities"
              value={summary.total}
              icon="◷"
            />

            <SummaryCard
              label="Business Actions"
              value={summary.creates}
              icon="+"
              accent="emerald"
            />

            <SummaryCard
              label="Updates & Payments"
              value={summary.updates}
              icon="↻"
              accent="indigo"
            />

            <SummaryCard
              label="Other / Deleted"
              value={
                summary.deletes +
                summary.other
              }
              icon="!"
              accent="rose"
            />
          </div>

          {/* FILTERS */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    Find History
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Search and filter your business activity.
                  </p>
                </div>

                {(search ||
                  actionFilter !== 'all' ||
                  entityFilter !== 'all' ||
                  startDate ||
                  endDate) && (
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    Filters active
                  </span>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

                <div className="xl:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Search
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      ⌕
                    </span>

                    <input
                      value={search}
                      onChange={(event) =>
                        setSearch(
                          event.target.value
                        )
                      }
                      placeholder="Search action, email, ID or reason..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Action
                  </label>

                  <select
                    value={actionFilter}
                    onChange={(event) =>
                      setActionFilter(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="all">
                      All actions
                    </option>

                    {actionOptions.map(
                      (action) => (
                        <option
                          key={action}
                          value={action}
                        >
                          {formatAction(action)}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Entity
                  </label>

                  <select
                    value={entityFilter}
                    onChange={(event) =>
                      setEntityFilter(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="all">
                      All entities
                    </option>

                    {entityOptions.map(
                      (entity) => (
                        <option
                          key={entity}
                          value={entity}
                        >
                          {formatEntity(entity)}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    From
                  </label>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) =>
                      setStartDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    To
                  </label>

                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) =>
                      setEndDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 font-bold dark:bg-rose-900/40">
                !
              </span>

              <div>
                <div className="font-bold">
                  Unable to load history
                </div>

                <div className="mt-0.5">
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* ACTIVITY TABLE */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    Activity History
                  </h2>

                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                    {filteredLogs.length}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Showing {filteredLogs.length} of{' '}
                  {logs.length} activities.
                </p>
              </div>

              <button
                type="button"
                onClick={loadHistory}
                disabled={loading}
                className="w-fit rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {loading
                  ? 'Refreshing...'
                  : '↻ Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400" />

                <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Loading activity history...
                </p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800">
                  ◷
                </div>

                <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                  No history found
                </h3>

                <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  There are no activities matching
                  your current search and filters.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/50">
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Date & Time
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Action
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Entity
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                        User
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Reason
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        Details
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLogs.map((log) => {
                      const userEmail =
                        getUserEmail(log);

                      const theme =
                        getActionTheme(
                          log.action_type
                        );

                      return (
                        <tr
                          key={log.id}
                          className="group transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-5 py-4">
                            <div className="whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {formatDate(
                                log.created_at
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-bold ${theme.badge}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${theme.dot}`}
                              />

                              {formatAction(
                                log.action_type
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {formatEntity(
                                log.entity_type
                              )}
                            </div>

                            {log.entity_id && (
                              <div
                                className="mt-1 max-w-[220px] truncate font-mono text-[11px] text-slate-400"
                                title={log.entity_id}
                              >
                                {log.entity_id}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div
                              className="max-w-[260px] truncate text-sm font-medium text-slate-700 dark:text-slate-200"
                              title={userEmail}
                            >
                              {userEmail}
                            </div>
                          </td>

                          <td className="max-w-[280px] px-5 py-4">
                            <div
                              className="truncate text-sm text-slate-600 dark:text-slate-300"
                              title={
                                log.reason || ''
                              }
                            >
                              {log.reason || '—'}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedLog(
                                  log
                                )
                              }
                              className="rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/70"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* HISTORY DETAILS */}
      <Modal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="History Details"
      >
        {selectedLog && (
          <div className="space-y-5">

            {/* ICONIC ACTIVITY HEADER */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-lg">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />

              <div className="relative">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Activity
                    </div>

                    <div className="mt-2 text-2xl font-black">
                      {formatAction(
                        selectedLog.action_type
                      )}
                    </div>
                  </div>

                  <span
                    className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${getActionTheme(
                      selectedLog.action_type
                    ).badge}`}
                  >
                    {formatEntity(
                      selectedLog.entity_type
                    )}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <DetailItem
                    label="Date & Time"
                    value={formatDate(
                      selectedLog.created_at
                    )}
                    dark
                  />

                  <DetailItem
                    label="User Email"
                    value={selectedUserEmail}
                    dark
                  />
                </div>
              </div>
            </div>

            {/* REASON */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />

                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Reason
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {selectedLog.reason ||
                  'No reason provided.'}
              </div>
            </div>

            {/* BEFORE / AFTER */}
            <div className="grid gap-5 lg:grid-cols-2">
              <DataCard
                title="Before"
                subtitle="Values before this activity"
                fields={
                  selectedBeforeFields
                }
                emptyText="No previous data recorded."
              />

              <DataCard
                title="After"
                subtitle="Values after this activity"
                fields={
                  selectedAfterFields
                }
                emptyText="No updated data recorded."
                after
              />
            </div>

            {/* CLOSE */}
            <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setSelectedLog(null)
                }
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          nav,
          aside,
          header,
          button,
          input,
          select {
            display: none !important;
          }

          section {
            padding: 0 !important;
          }

          .shadow-sm,
          .shadow-xl,
          .shadow-lg {
            box-shadow: none !important;
          }

          .rounded-3xl,
          .rounded-2xl {
            border-radius: 0 !important;
          }
        }
      `}</style>
    </>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  accent = 'slate',
}: {
  label: string;
  value: number;
  icon: string;
  accent?: 'slate' | 'emerald' | 'indigo' | 'rose';
}) {
  const accentClasses = {
    slate:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    emerald:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300',
    indigo:
      'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300',
    rose:
      'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300',
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </div>

          <div className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {value.toLocaleString()}
          </div>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black ${accentClasses[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  dark = false,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 ${
        dark
          ? 'bg-white/5'
          : 'bg-slate-50'
      }`}
    >
      <div
        className={`text-xs font-medium ${
          dark
            ? 'text-slate-400'
            : 'text-slate-500'
        }`}
      >
        {label}
      </div>

      <div
        className={`mt-1 break-all text-sm font-semibold ${
          dark
            ? 'text-white'
            : 'text-slate-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function DataCard({
  title,
  subtitle,
  fields,
  emptyText,
  after = false,
}: {
  title: string;
  subtitle: string;
  fields: ReadableField[];
  emptyText: string;
  after?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div
        className={`border-b px-4 py-4 ${
          after
            ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20'
            : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">
              {title}
            </h3>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              after
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {fields.length} fields
          </span>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
          {emptyText}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {fields.map((field) => (
            <div
              key={`${field.label}-${field.value}`}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5"
            >
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {field.label}
              </div>

              <div className="break-all text-sm font-semibold text-slate-800 dark:text-slate-100 sm:text-right">
                {field.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}