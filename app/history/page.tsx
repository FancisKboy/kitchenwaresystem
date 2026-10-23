'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import Modal from '@/components/modal';
import { useAppPreferences } from '@/app/providers';

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

/* ------------------------------------------------------------------ */
/* Translation (English / Kinyarwanda) - uses the existing app language */
/* ------------------------------------------------------------------ */

const HISTORY_TRANSLATIONS: Record<string, string> = {
  'Business Activity': 'Ibikorwa by’ubucuruzi',
  History: 'Amateka',
  'A complete activity trail for sales, purchases, payments, stock changes, returns, losses, recoveries and other important business actions.':
    'Inyandiko yuzuye y’ibikorwa: igurisha, ibyaguzwe, kwishyura, impinduka mu bubiko, ibyagarutse, igihombo, ibyagaruwe n’ibindi bikorwa by’ingenzi by’ubucuruzi.',
  'total records': 'inyandiko zose',
  shown: 'ziragaragara',
  Print: 'Kwandika',
  'Export CSV': 'Gusohora CSV',
  'Total Activities': 'Ibikorwa byose',
  'Business Actions': 'Ibikorwa by’ubucuruzi',
  'Updates & Payments': 'Impinduka n’Ubwishyu',
  'Other / Deleted': 'Ibindi / Ibyasibwe',
  'Records in the current view': 'Inyandiko ziri kugaragara',
  'Sales, purchases and new records': 'Igurisha, ibyaguzwe n’inyandiko nshya',
  'Edits and payments recorded': 'Impinduka n’ubwishyu byanditswe',
  'Deletions and other actions': 'Ibyasibwe n’ibindi bikorwa',
  'Find History': 'Shakisha Amateka',
  'Search and filter your business activity.':
    'Shakisha kandi uhitemo ibikorwa by’ubucuruzi bwawe.',
  'Filters active': 'Ayungurura arakoreshwa',
  Search: 'Gushakisha',
  'Search action, email, ID or reason...':
    'Shakisha igikorwa, imeri, ID cyangwa impamvu...',
  Action: 'Igikorwa',
  Entity: 'Ikintu',
  'All actions': 'Ibikorwa byose',
  'All entities': 'Ibintu byose',
  'Clear Filters': 'Siba Ayungurura',
  From: 'Kuva',
  To: 'Kugeza',
  'Unable to load history': 'Ntibishobotse gufungura amateka',
  'Activity History': 'Amateka y’Ibikorwa',
  Showing: 'Hagaragajwe',
  of: 'kuri',
  activities: 'ibikorwa',
  'Refreshing...': 'Birimo kuvugururwa...',
  Refresh: 'Vugurura',
  'Loading activity history...': 'Birimo gufungura amateka y’ibikorwa...',
  'No history found': 'Nta mateka yabonetse',
  'There are no activities matching your current search and filters.':
    'Nta bikorwa bihuye n’ibyo washakishije n’ayungurura wahisemo.',
  'Date & Time': 'Itariki n’Isaha',
  User: 'Ukoresha',
  Reason: 'Impamvu',
  Details: 'Ibisobanuro',
  'View Details': 'Reba Ibisobanuro',
  'History Details': 'Ibisobanuro by’Amateka',
  Activity: 'Igikorwa',
  'User Email': 'Imeri y’Ukoresha',
  'No reason provided.': 'Nta mpamvu yatanzwe.',
  Before: 'Mbere',
  After: 'Nyuma',
  'Values before this activity': 'Agaciro mbere y’iki gikorwa',
  'Values after this activity': 'Agaciro nyuma y’iki gikorwa',
  'No previous data recorded.': 'Nta makuru yabanje yanditswe.',
  'No updated data recorded.': 'Nta makuru mashya yanditswe.',
  fields: 'ibisobanuro',
  Close: 'Funga',
  System: 'Sisitemu',
  'Unknown Email': 'Imeri itazwi',
  Yes: 'Yego',
  No: 'Oya',
};

const HISTORY_WORDS: Record<string, string> = {
  create: 'Gushyiraho',
  created: 'Byashyizweho',
  add: 'Kongeramo',
  added: 'Byongeweho',
  update: 'Kuvugurura',
  updated: 'Byavuguruwe',
  edit: 'Guhindura',
  edited: 'Byahinduwe',
  delete: 'Gusiba',
  deleted: 'Byasibwe',
  record: 'Kwandika',
  recorded: 'Byanditswe',
  correct: 'Gukosora',
  corrected: 'Byakosowe',
  adjust: 'Gutunganya',
  adjustment: 'Gutunganya',
  return: 'Gusubiza',
  returned: 'Byagarutse',
  recover: 'Kugarura',
  recovered: 'Byagaruwe',
  recovery: 'Kugarura',
  loss: 'Igihombo',
  damaged: 'Byangiritse',
  sale: 'Igurisha',
  sales: 'Igurisha',
  purchase: 'Kugura',
  purchases: 'Ibyaguzwe',
  payment: 'Ubwishyu',
  payments: 'Ubwishyu',
  stock: 'Ububiko',
  product: 'Igicuruzwa',
  products: 'Ibicuruzwa',
  item: 'Igicuruzwa',
  items: 'Ibicuruzwa',
  batch: 'Icyiciro',
  batches: 'Ibyiciro',
  customer: 'Umukiriya',
  customers: 'Abakiriya',
  supplier: 'Utanga ibicuruzwa',
  suppliers: 'Abatanga ibicuruzwa',
  debt: 'Ideni',
  debts: 'Amadeni',
  expense: 'Igiciro',
  expenses: 'Ibiciro',
  inventory: 'Ibarura',
  total: 'Byose',
  cost: 'Igiciro',
  revenue: 'Amafaranga yinjiye',
  profit: 'Inyungu',
  amount: 'Umubare',
  paid: 'Yishyuwe',
  due: 'Asigaye',
  new: 'Gishya',
  credit: 'Inguzanyo',
  selling: 'Kugurisha',
  price: 'Igiciro',
  unit: 'Igice',
  quantity: 'Ingano',
  remaining: 'Asigaye',
  original: 'Iya mbere',
  previous: 'Iyabanje',
  name: 'Izina',
  date: 'Itariki',
  status: 'Imiterere',
  notes: 'Inyandiko',
  note: 'Inyandiko',
  phone: 'Telefoni',
  email: 'Imeri',
  address: 'Aho aherereye',
  reason: 'Impamvu',
  method: 'Uburyo',
  type: 'Ubwoko',
  category: 'Icyiciro',
  balance: 'Isigaye',
  at: 'ku',
};

const RW_MONTHS = [
  'Mut',
  'Gas',
  'Wer',
  'Mat',
  'Gic',
  'Kam',
  'Nya',
  'Kan',
  'Nze',
  'Ukw',
  'Ugu',
  'Uku',
];

function translateText(text: string, isRw: boolean) {
  if (!isRw) {
    return text;
  }

  return Object.prototype.hasOwnProperty.call(HISTORY_TRANSLATIONS, text)
    ? HISTORY_TRANSLATIONS[text]
    : text;
}

function translateWords(text: string, isRw: boolean) {
  if (!isRw) {
    return text;
  }

  return text
    .split(' ')
    .map((word) => {
      const lower = word.toLowerCase();

      if (!Object.prototype.hasOwnProperty.call(HISTORY_WORDS, lower)) {
        return word;
      }

      return HISTORY_WORDS[lower];
    })
    .join(' ');
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(value: string, isRw = false) {
  if (isRw) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const pad = (number: number) => String(number).padStart(2, '0');

    return `${pad(date.getDate())} ${RW_MONTHS[date.getMonth()]} ${date.getFullYear()}, ${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  }

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

function formatValue(value: unknown, key?: string, isRw = false) {
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
    return value ? translateText('Yes', isRw) : translateText('No', isRw);
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Technical identifiers (id, customer_id, product_type_id, UUID values...)
   are hidden from the details popup so only business information is shown. */
function isTechnicalId(key: string, value: unknown) {
  const lower = key.toLowerCase();

  if (
    lower === 'id' ||
    lower === 'uuid' ||
    lower.endsWith('_id') ||
    lower.endsWith('_uuid')
  ) {
    return true;
  }

  return typeof value === 'string' && UUID_PATTERN.test(value.trim());
}

function getReadableFields(value: unknown, isRw = false): ReadableField[] {
  const object = getObject(value);

  if (!object) {
    return [];
  }

  return Object.entries(object)
    .filter(([key, item]) => !isTechnicalId(key, item))
    .map(([key, item]) => ({
      label: translateWords(prettifyKey(key), isRw),
      value: formatValue(item, key, isRw),
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

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function HistoryPage() {
  const { t } = useAppPreferences();

  const isRw = t('inventory').trim().toLowerCase() !== 'inventory';

  const tx = (text: string) => translateText(text, isRw);

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

  const hasActiveFilters = Boolean(
    search ||
      actionFilter !== 'all' ||
      entityFilter !== 'all' ||
      startDate ||
      endDate
  );

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
          selectedLog.before_data,
          isRw
        )
      : [];

  const selectedAfterFields =
    selectedLog
      ? getReadableFields(
          selectedLog.after_data,
          isRw
        )
      : [];

  const selectedUserEmail =
    selectedLog
      ? tx(getUserEmail(selectedLog))
      : '';

  const labelClass =
    'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400';

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  const thClass =
    'whitespace-nowrap px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400';

  return (
    <>
      <section className="min-h-full p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* HERO */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl ring-1 ring-white/5">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

                <div className="max-w-3xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {tx('Business Activity')}
                  </div>

                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                    {tx('History')}
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    {tx(
                      'A complete activity trail for sales, purchases, payments, stock changes, returns, losses, recoveries and other important business actions.'
                    )}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 tabular-nums">
                      <span className="font-bold text-white">
                        {logs.length.toLocaleString()}
                      </span>{' '}
                      {tx('total records')}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 tabular-nums">
                      <span className="font-bold text-white">
                        {summary.total.toLocaleString()}
                      </span>{' '}
                      {tx('shown')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    {tx('Print')}
                  </button>

                  <button
                    type="button"
                    onClick={handleExport}
                    className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    {tx('Export CSV')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SUMMARY */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label={tx('Total Activities')}
              caption={tx('Records in the current view')}
              value={summary.total}
              icon="◷"
            />

            <SummaryCard
              label={tx('Business Actions')}
              caption={tx('Sales, purchases and new records')}
              value={summary.creates}
              icon="+"
              accent="emerald"
            />

            <SummaryCard
              label={tx('Updates & Payments')}
              caption={tx('Edits and payments recorded')}
              value={summary.updates}
              icon="↻"
              accent="indigo"
            />

            <SummaryCard
              label={tx('Other / Deleted')}
              caption={tx('Deletions and other actions')}
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
                    {tx('Find History')}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {tx('Search and filter your business activity.')}
                  </p>
                </div>

                {hasActiveFilters && (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    {tx('Filters active')}
                  </span>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

                <div className="xl:col-span-2">
                  <label
                    htmlFor="history-search"
                    className={labelClass}
                  >
                    {tx('Search')}
                  </label>

                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      ⌕
                    </span>

                    <input
                      id="history-search"
                      value={search}
                      onChange={(event) =>
                        setSearch(
                          event.target.value
                        )
                      }
                      placeholder={tx(
                        'Search action, email, ID or reason...'
                      )}
                      className={`${fieldClass} pl-10 pr-3.5`}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="history-action"
                    className={labelClass}
                  >
                    {tx('Action')}
                  </label>

                  <select
                    id="history-action"
                    value={actionFilter}
                    onChange={(event) =>
                      setActionFilter(
                        event.target.value
                      )
                    }
                    className={fieldClass}
                  >
                    <option value="all">
                      {tx('All actions')}
                    </option>

                    {actionOptions.map(
                      (action) => (
                        <option
                          key={action}
                          value={action}
                        >
                          {translateWords(
                            formatAction(action),
                            isRw
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="history-entity"
                    className={labelClass}
                  >
                    {tx('Entity')}
                  </label>

                  <select
                    id="history-entity"
                    value={entityFilter}
                    onChange={(event) =>
                      setEntityFilter(
                        event.target.value
                      )
                    }
                    className={fieldClass}
                  >
                    <option value="all">
                      {tx('All entities')}
                    </option>

                    {entityOptions.map(
                      (entity) => (
                        <option
                          key={entity}
                          value={entity}
                        >
                          {translateWords(
                            formatEntity(entity),
                            isRw
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {tx('Clear Filters')}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="history-from"
                    className={labelClass}
                  >
                    {tx('From')}
                  </label>

                  <input
                    id="history-from"
                    type="date"
                    value={startDate}
                    onChange={(event) =>
                      setStartDate(
                        event.target.value
                      )
                    }
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="history-to"
                    className={labelClass}
                  >
                    {tx('To')}
                  </label>

                  <input
                    id="history-to"
                    type="date"
                    value={endDate}
                    onChange={(event) =>
                      setEndDate(
                        event.target.value
                      )
                    }
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 font-bold dark:bg-rose-900/40">
                !
              </span>

              <div>
                <div className="font-bold">
                  {tx('Unable to load history')}
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
                    {tx('Activity History')}
                  </h2>

                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold tabular-nums text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                    {filteredLogs.length}
                  </span>
                </div>

                <p
                  className="mt-1 text-sm tabular-nums text-slate-500 dark:text-slate-400"
                  aria-live="polite"
                >
                  {`${tx('Showing')} ${filteredLogs.length} ${tx('of')} ${logs.length} ${tx('activities')}.`}
                </p>
              </div>

              <button
                type="button"
                onClick={loadHistory}
                disabled={loading}
                className="w-fit rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {loading
                  ? tx('Refreshing...')
                  : `↻ ${tx('Refresh')}`}
              </button>
            </div>

            {loading ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400" />

                <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {tx('Loading activity history...')}
                </p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800">
                  ◷
                </div>

                <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                  {tx('No history found')}
                </h3>

                <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  {tx(
                    'There are no activities matching your current search and filters.'
                  )}
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                >
                  {tx('Clear Filters')}
                </button>
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full min-w-[1100px] border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 text-left dark:bg-slate-950">
                      <th className={`${thClass} border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950`}>
                        {tx('Date & Time')}
                      </th>

                      <th className={`${thClass} border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950`}>
                        {tx('Action')}
                      </th>

                      <th className={`${thClass} border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950`}>
                        {tx('Entity')}
                      </th>

                      <th className={`${thClass} border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950`}>
                        {tx('User')}
                      </th>

                      <th className={`${thClass} border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950`}>
                        {tx('Reason')}
                      </th>

                      <th className={`${thClass} border-b border-slate-200 bg-slate-50 text-right dark:border-slate-800 dark:bg-slate-950`}>
                        {tx('Details')}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredLogs.map((log) => {
                      const userEmail =
                        tx(getUserEmail(log));

                      const theme =
                        getActionTheme(
                          log.action_type
                        );

                      const cell =
                        'border-b border-slate-100 px-5 py-4 dark:border-slate-800';

                      return (
                        <tr
                          key={log.id}
                          className="group transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          <td className={cell}>
                            <div className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                              {formatDate(
                                log.created_at,
                                isRw
                              )}
                            </div>
                          </td>

                          <td className={cell}>
                            <span
                              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-xs font-bold ${theme.badge}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${theme.dot}`}
                              />

                              {translateWords(
                                formatAction(
                                  log.action_type
                                ),
                                isRw
                              )}
                            </span>
                          </td>

                          <td className={cell}>
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {translateWords(
                                formatEntity(
                                  log.entity_type
                                ),
                                isRw
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

                          <td className={cell}>
                            <div
                              className="max-w-[260px] truncate text-sm font-medium text-slate-700 dark:text-slate-200"
                              title={userEmail}
                            >
                              {userEmail}
                            </div>
                          </td>

                          <td className={`${cell} max-w-[280px]`}>
                            <div
                              className="truncate text-sm text-slate-600 dark:text-slate-300"
                              title={
                                log.reason || ''
                              }
                            >
                              {log.reason || '—'}
                            </div>
                          </td>

                          <td className={`${cell} text-right`}>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedLog(
                                  log
                                )
                              }
                              className="whitespace-nowrap rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/70"
                            >
                              {tx('View Details')}
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
        title={tx('History Details')}
      >
        {selectedLog && (
          <div className="space-y-5">

            {/* ICONIC ACTIVITY HEADER */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-lg ring-1 ring-white/5">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />

              <div className="relative">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {tx('Activity')}
                    </div>

                    <div className="mt-2 text-2xl font-black">
                      {translateWords(
                        formatAction(
                          selectedLog.action_type
                        ),
                        isRw
                      )}
                    </div>
                  </div>

                  <span
                    className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${getActionTheme(
                      selectedLog.action_type
                    ).badge}`}
                  >
                    {translateWords(
                      formatEntity(
                        selectedLog.entity_type
                      ),
                      isRw
                    )}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <DetailItem
                    label={tx('Date & Time')}
                    value={formatDate(
                      selectedLog.created_at,
                      isRw
                    )}
                    dark
                  />

                  <DetailItem
                    label={tx('User Email')}
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
                  {tx('Reason')}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {selectedLog.reason ||
                  tx('No reason provided.')}
              </div>
            </div>

            {/* BEFORE / AFTER */}
            <div className="grid gap-5 lg:grid-cols-2">
              <DataCard
                title={tx('Before')}
                subtitle={tx('Values before this activity')}
                fields={
                  selectedBeforeFields
                }
                fieldsLabel={tx('fields')}
                emptyText={tx('No previous data recorded.')}
              />

              <DataCard
                title={tx('After')}
                subtitle={tx('Values after this activity')}
                fields={
                  selectedAfterFields
                }
                fieldsLabel={tx('fields')}
                emptyText={tx('No updated data recorded.')}
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
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                {tx('Close')}
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
  caption,
  value,
  icon,
  accent = 'slate',
}: {
  label: string;
  caption?: string;
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
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {label}
          </div>

          <div className="mt-2 text-3xl font-black tabular-nums tracking-tight text-slate-900 dark:text-white">
            {value.toLocaleString()}
          </div>

          {caption && (
            <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {caption}
            </div>
          )}
        </div>

        <div
          aria-hidden="true"
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
  fieldsLabel,
  emptyText,
  after = false,
}: {
  title: string;
  subtitle: string;
  fields: ReadableField[];
  fieldsLabel: string;
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
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
              after
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {fields.length} {fieldsLabel}
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
              className="flex flex-col gap-1 px-4 py-3 transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30 sm:flex-row sm:items-center sm:justify-between sm:gap-5"
            >
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {field.label}
              </div>

              <div className="break-all text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100 sm:text-right">
                {field.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
