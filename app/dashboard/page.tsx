'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppPreferences } from '@/app/providers'

type Sale = {
  id: string
  sale_date: string
  total_revenue: number | string | null
  total_cost: number | string | null
  total_profit: number | string | null
  amount_paid: number | string | null
  amount_due: number | string | null
  payment_status: string | null
}

type SaleItem = {
  id: string
  sale_id: string
  quantity: number | null
}

type Payment = {
  id: string
  sale_id: string
  amount: number | string | null
  payment_date: string
}

type Batch = {
  id: string
  product_type_id: string
  remaining_quantity: number | null
  unit_cost: number | string | null
  status: string | null
}

type ProductType = {
  id: string
  product_id: string
  name: string
  minimum_stock: number | null
  status: string | null
}

type Product = {
  id: string
  name: string
  status: string | null
}

type StockAdjustment = {
  id: string
  product_type_id: string
  batch_id: string
  quantity: number | string | null
  unit_cost: number | string | null
  adjustment_type: string
  created_at: string
}

type AuditLog = {
  id: string
  user_id?: string | null
  user_email: string | null
  entity_id?: string | null
  before_data?: unknown
  after_data?: unknown
  action_type: string
  entity_type: string
  reason: string | null
  created_at: string
}

type DashboardData = {
  todayRevenue: number
  todayProfit: number
  todayPayments: number
  outstandingDebt: number

  todaySales: number
  todayItems: number

  todayLossValue: number
  todayLostValue: number
  todayDamagedValue: number
  todayLossCount: number

  stockUnits: number
  stockValue: number

  lowStockCount: number
  outOfStockCount: number

  productCount: number
  productTypeCount: number

  recentActivity: AuditLog[]
}

const emptyData: DashboardData = {
  todayRevenue: 0,
  todayProfit: 0,
  todayPayments: 0,
  outstandingDebt: 0,

  todaySales: 0,
  todayItems: 0,

  todayLossValue: 0,
  todayLostValue: 0,
  todayDamagedValue: 0,
  todayLossCount: 0,

  stockUnits: 0,
  stockValue: 0,

  lowStockCount: 0,
  outOfStockCount: 0,

  productCount: 0,
  productTypeCount: 0,

  recentActivity: [],
}

function toNumber(
  value: number | string | null | undefined
) {
  const number = Number(value ?? 0)

  return Number.isFinite(number)
    ? number
    : 0
}

function getTodayDate() {
  const date = new Date()
  const offset = date.getTimezoneOffset()

  return new Date(
    date.getTime() - offset * 60_000
  )
    .toISOString()
    .slice(0, 10)
}

function getDayRange() {
  const today = getTodayDate()

  return {
    start: `${today}T00:00:00`,
    end: `${today}T23:59:59.999`,
  }
}

function isDateInRange(
  dateString: string,
  start: string,
  end: string
) {
  const time = new Date(dateString).getTime()
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()

  return (
    Number.isFinite(time) &&
    time >= startTime &&
    time <= endTime
  )
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)} RWF`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

function formatAction(action: string) {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
}

function getActivityClass(action: string) {
  const value = action.toLowerCase()

  if (
    value.includes('create') ||
    value.includes('sale') ||
    value.includes('purchase')
  ) {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
  }

  if (
    value.includes('update') ||
    value.includes('edit') ||
    value.includes('payment')
  ) {
    return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
  }

  if (
    value.includes('delete') ||
    value.includes('loss') ||
    value.includes('damage')
  ) {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
  }

  if (
    value.includes('return') ||
    value.includes('recover')
  ) {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
  }

  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

/* =========================================================
   TRANSLATION (English / Kinyarwanda) + ACTIVITY DETAILS
========================================================= */

const DASH_TRANSLATIONS: Record<string, string> = {
  'Business Overview': 'Incamake y’ubucuruzi',
  'Your business at a glance — today\'s revenue, profit, cash, stock health and operational activity.':
    'Ubucuruzi bwawe mu ncamake — amafaranga yinjiye uyu munsi, inyungu, amafaranga yakiriwe, uko ububiko buhagaze n’ibikorwa.',
  Refresh: 'Vugurura',
  'Refreshing...': 'Birimo kuvugururwa...',
  'Dashboard could not load completely.':
    'Ibikubiye ku rupapuro ntibyabashije gufungurwa byose.',
  'Try Again': 'Ongera ugerageze',
  Today: 'Uyu munsi',
  'Business Performance': 'Imikorere y’ubucuruzi',
  'Live from your business records': 'Biva mu nyandiko z’ubucuruzi bwawe',
  'Today\'s Sales': 'Igurisha ry’uyu munsi',
  'Items Sold Today': 'Ibyagurishijwe uyu munsi',
  'Stock Units': 'Ibice biri mu bubiko',
  'Today\'s Activities': 'Ibikorwa by’uyu munsi',
  'Today\'s Loss': 'Igihombo cy’uyu munsi',
  Lost: 'Byatakaye',
  Damaged: 'Byangiritse',
  record: 'inyandiko',
  records: 'inyandiko',
  'Units in stock': 'Ibice biri mu bubiko',
  low: 'bike',
  out: 'byashize',
  'Stock Value': 'Agaciro k’ububiko',
  'Current sellable inventory cost value.':
    'Agaciro k’ibicuruzwa bihari bishobora kugurishwa.',
  'Current stock': 'Ububiko buhari',
  Inventory: 'Ububiko',
  'Stock Snapshot': 'Uko ububiko buhagaze',
  'Current inventory health.': 'Uko ububiko buhagaze ubu.',
  'Total Units': 'Ibice byose',
  'Current Stock Value': 'Agaciro k’ububiko buhari',
  'Product Families': 'Imiryango y’ibicuruzwa',
  'Product Types / Kinds': 'Ubwoko bw’ibicuruzwa',
  'Low Stock': 'Ububiko bukeya',
  'Out of Stock': 'Ibyashize',
  'Open Inventory': 'Fungura Ububiko',
  'Recent Business Activity': 'Ibikorwa bya vuba by’ubucuruzi',
  'Only today\'s actions are shown here.':
    'Hano hagaragara ibikorwa by’uyu munsi gusa.',
  'View All': 'Reba Byose',
  'View Full History': 'Reba Amateka Yose',
  'No activity yet today': 'Nta gikorwa kirakorwa uyu munsi',
  'Business actions will appear here automatically.':
    'Ibikorwa by’ubucuruzi bizagaragara hano mu buryo bwikora.',
  Shortcuts: 'Inzira z’ako kanya',
  'Quick Actions': 'Ibikorwa by’ako kanya',
  'Jump directly into the most-used business areas.':
    'Jya vuba mu bice bikoreshwa cyane.',
  Amount: 'Amafaranga',
  Total: 'Yose',
  Cost: 'Igiciro',
  Paid: 'Yishyuwe',
  Due: 'Asigaye',
  Profit: 'Inyungu',
  Value: 'Agaciro',
  'Unit price': 'Igiciro ku gice',
  'Unit cost': 'Igiciro cy’igice',
  Quantity: 'Ingano',
  By: 'Na',
  System: 'Sisitemu',
  'Unknown user': 'Utazwi',
  'Just now': 'Ubu nyine',
}

const DASH_WORDS: Record<string, string> = {
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
  lost: 'Byatakaye',
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
  inventory: 'Ibarura',
  type: 'Ubwoko',
  types: 'Ubwoko',
}

function translateDash(text: string, isRw: boolean) {
  if (!isRw) {
    return text
  }

  return Object.prototype.hasOwnProperty.call(
    DASH_TRANSLATIONS,
    text
  )
    ? DASH_TRANSLATIONS[text]
    : text
}

function translateDashWords(
  text: string,
  isRw: boolean
) {
  if (!isRw) {
    return text
  }

  return text
    .split(' ')
    .map((word) => {
      const lower = word.toLowerCase()

      return Object.prototype.hasOwnProperty.call(
        DASH_WORDS,
        lower
      )
        ? DASH_WORDS[lower]
        : word
    })
    .join(' ')
}

function formatAgo(
  dateString: string,
  isRw: boolean
) {
  const time = new Date(dateString).getTime()

  if (!Number.isFinite(time)) {
    return ''
  }

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - time) / 60_000)
  )

  if (minutes < 1) {
    return translateDash('Just now', isRw)
  }

  if (minutes < 60) {
    return isRw
      ? `Hashize iminota ${minutes}`
      : `${minutes} min ago`
  }

  const hours = Math.floor(minutes / 60)

  return isRw
    ? `Hashize amasaha ${hours}`
    : `${hours} h ago`
}

type ActivityChip = {
  label: string
  value: string
  tone: 'slate' | 'emerald' | 'amber' | 'rose'
}

function asRecord(
  value: unknown
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null
  }

  return value as Record<string, unknown>
}

function hasValue(value: unknown) {
  return (
    value !== null &&
    value !== undefined &&
    value !== '' &&
    Number.isFinite(Number(value))
  )
}

/*
 * Reads the audit record's before/after data (the same fields shown on
 * the History page) and turns them into short, readable facts:
 * how much money and how many units were involved.
 */
function getActivityDetails(
  activity: AuditLog,
  isRw: boolean
): { subject: string; chips: ActivityChip[] } {
  const before = asRecord(activity.before_data)
  const after = asRecord(activity.after_data)

  const source = after ?? before

  if (!source) {
    return { subject: '', chips: [] }
  }

  const subjectKey = [
    'customer_name',
    'product_name',
    'supplier_name',
    'name',
  ].find(
    (key) =>
      typeof source[key] === 'string' &&
      String(source[key]).trim() !== ''
  )

  const subject = subjectKey
    ? String(source[subjectKey]).trim()
    : ''

  const definitions: {
    key: string
    label: string
    money: boolean
    tone: ActivityChip['tone']
    hideZero?: boolean
  }[] = [
    { key: 'amount', label: 'Amount', money: true, tone: 'emerald' },
    { key: 'total_revenue', label: 'Total', money: true, tone: 'slate' },
    { key: 'total_cost', label: 'Cost', money: true, tone: 'slate' },
    { key: 'amount_paid', label: 'Paid', money: true, tone: 'emerald' },
    { key: 'amount_due', label: 'Due', money: true, tone: 'amber', hideZero: true },
    { key: 'total_profit', label: 'Profit', money: true, tone: 'emerald' },
    { key: 'selling_price', label: 'Unit price', money: true, tone: 'slate' },
    { key: 'unit_cost', label: 'Unit cost', money: true, tone: 'slate' },
    { key: 'quantity', label: 'Quantity', money: false, tone: 'slate' },
    { key: 'new_quantity', label: 'Quantity', money: false, tone: 'slate' },
  ]

  const chips: ActivityChip[] = []
  const usedLabels = new Set<string>()

  for (const definition of definitions) {
    if (chips.length >= 4) {
      break
    }

    if (usedLabels.has(definition.label)) {
      continue
    }

    const nowValue = source[definition.key]

    if (!hasValue(nowValue)) {
      continue
    }

    const numberNow = Number(nowValue)

    if (definition.hideZero && numberNow === 0) {
      continue
    }

    const format = (value: number) =>
      definition.money
        ? formatMoney(value)
        : formatNumber(value)

    let text = format(numberNow)

    const previous =
      before && after
        ? before[definition.key]
        : undefined

    if (
      hasValue(previous) &&
      Number(previous) !== numberNow
    ) {
      text = `${format(Number(previous))} → ${text}`
    }

    usedLabels.add(definition.label)

    chips.push({
      label: translateDash(definition.label, isRw),
      value: text,
      tone: definition.tone,
    })
  }

  const quantity = source['quantity']
  const unitCost = source['unit_cost']

  if (
    chips.length < 4 &&
    !hasValue(source['total_cost']) &&
    hasValue(quantity) &&
    hasValue(unitCost) &&
    Number(quantity) > 0 &&
    Number(unitCost) > 0
  ) {
    chips.push({
      label: translateDash('Value', isRw),
      value: formatMoney(
        Number(quantity) * Number(unitCost)
      ),
      tone: 'rose',
    })
  }

  return { subject, chips }
}

function getChipClass(tone: ActivityChip['tone']) {
  switch (tone) {
    case 'emerald':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
    case 'amber':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
    case 'rose':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useAppPreferences()

  const isRw =
    t('inventory').trim().toLowerCase() !==
    'inventory'

  const tx = (text: string) =>
    translateDash(text, isRw)

  const [data, setData] =
    useState<DashboardData>(emptyData)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(
    async () => {
      try {
        setError('')

        const { start, end } = getDayRange()

        const [
          salesResult,
          saleItemsResult,
          paymentsResult,
          batchesResult,
          productTypesResult,
          productsResult,
          stockAdjustmentsResult,
          historyResult,
        ] = await Promise.all([
          supabase
            .from('sales')
            .select(
              'id,sale_date,total_revenue,total_cost,total_profit,amount_paid,amount_due,payment_status'
            ),

          supabase
            .from('sale_items')
            .select(
              'id,sale_id,quantity'
            ),

          supabase
            .from('payments')
            .select(
              'id,sale_id,amount,payment_date'
            ),

          supabase
            .from('batches')
            .select(
              'id,product_type_id,remaining_quantity,unit_cost,status'
            ),

          supabase
            .from('product_types')
            .select(
              'id,product_id,name,minimum_stock,status'
            ),

          supabase
            .from('products')
            .select(
              'id,name,status'
            ),

          supabase
            .from('stock_adjustments')
            .select(
              'id,product_type_id,batch_id,quantity,unit_cost,adjustment_type,created_at'
            )
            .in(
              'adjustment_type',
              ['lost', 'damaged']
            )
            .gte('created_at', start)
            .lte('created_at', end),

          supabase.rpc(
            'get_audit_history_with_email'
          ),
        ])

        if (salesResult.error) {
          throw salesResult.error
        }

        if (saleItemsResult.error) {
          throw saleItemsResult.error
        }

        if (paymentsResult.error) {
          throw paymentsResult.error
        }

        if (batchesResult.error) {
          throw batchesResult.error
        }

        if (productTypesResult.error) {
          throw productTypesResult.error
        }

        if (productsResult.error) {
          throw productsResult.error
        }

        if (stockAdjustmentsResult.error) {
          throw stockAdjustmentsResult.error
        }

        const sales =
          (salesResult.data ?? []) as Sale[]

        const saleItems =
          (saleItemsResult.data ??
            []) as SaleItem[]

        const payments =
          (paymentsResult.data ??
            []) as Payment[]

        const batches =
          (batchesResult.data ??
            []) as Batch[]

        const productTypes =
          (productTypesResult.data ??
            []) as ProductType[]

        const products =
          (productsResult.data ??
            []) as Product[]

        const stockAdjustments =
          (stockAdjustmentsResult.data ??
            []) as StockAdjustment[]

        const todaySales = sales.filter(
          (sale) =>
            isDateInRange(
              sale.sale_date,
              start,
              end
            )
        )

        const todaySaleIds = new Set(
          todaySales.map(
            (sale) => sale.id
          )
        )

        const todayRevenue =
          todaySales.reduce(
            (sum, sale) =>
              sum +
              toNumber(
                sale.total_revenue
              ),
            0
          )

        const todayProfit =
          todaySales.reduce(
            (sum, sale) =>
              sum +
              toNumber(
                sale.total_profit
              ),
            0
          )

        const todayPayments =
          payments
            .filter((payment) =>
              isDateInRange(
                payment.payment_date,
                start,
                end
              )
            )
            .reduce(
              (sum, payment) =>
                sum +
                toNumber(payment.amount),
              0
            )

        const outstandingDebt =
          sales.reduce(
            (sum, sale) =>
              sum +
              Math.max(
                0,
                toNumber(
                  sale.amount_due
                )
              ),
            0
          )

        const todayItems =
          saleItems
            .filter((item) =>
              todaySaleIds.has(
                item.sale_id
              )
            )
            .reduce(
              (sum, item) =>
                sum +
                toNumber(
                  item.quantity
                ),
              0
            )

        /*
         * Exact loss value:
         * Lost quantity × exact batch unit cost
         * Damaged quantity × exact batch unit cost
         */
        const todayLostValue =
          stockAdjustments
            .filter(
              (adjustment) =>
                adjustment.adjustment_type ===
                'lost'
            )
            .reduce(
              (sum, adjustment) =>
                sum +
                toNumber(
                  adjustment.quantity
                ) *
                  toNumber(
                    adjustment.unit_cost
                  ),
              0
            )

        const todayDamagedValue =
          stockAdjustments
            .filter(
              (adjustment) =>
                adjustment.adjustment_type ===
                'damaged'
            )
            .reduce(
              (sum, adjustment) =>
                sum +
                toNumber(
                  adjustment.quantity
                ) *
                  toNumber(
                    adjustment.unit_cost
                  ),
              0
            )

        const todayLossValue =
          todayLostValue +
          todayDamagedValue

        const todayLossCount =
          stockAdjustments.length

        const activeProductTypes =
          productTypes.filter(
            (type) =>
              type.status !==
              'inactive'
          )

        const activeProducts =
          products.filter(
            (product) =>
              product.status !==
              'inactive'
          )

        const activeBatches =
          batches.filter(
            (batch) =>
              batch.status !==
              'cancelled'
          )

        const stockUnits =
          activeBatches.reduce(
            (sum, batch) =>
              sum +
              toNumber(
                batch.remaining_quantity
              ),
            0
          )

        const stockValue =
          activeBatches.reduce(
            (sum, batch) =>
              sum +
              toNumber(
                batch.remaining_quantity
              ) *
                toNumber(
                  batch.unit_cost
                ),
            0
          )

        const stockByType =
          new Map<string, number>()

        for (const batch of activeBatches) {
          const current =
            stockByType.get(
              batch.product_type_id
            ) ?? 0

          stockByType.set(
            batch.product_type_id,
            current +
              toNumber(
                batch.remaining_quantity
              )
          )
        }

        let lowStockCount = 0
        let outOfStockCount = 0

        for (const type of activeProductTypes) {
          const quantity =
            stockByType.get(type.id) ??
            0

          const minimum =
            Math.max(
              0,
              toNumber(
                type.minimum_stock
              )
            )

          if (quantity <= 0) {
            outOfStockCount += 1
          } else if (
            quantity <= minimum
          ) {
            lowStockCount += 1
          }
        }

        let recentActivity: AuditLog[] =
          []

        if (
          !historyResult.error &&
          Array.isArray(
            historyResult.data
          )
        ) {
          recentActivity = (
            historyResult.data as AuditLog[]
          )
            .filter((activity) =>
              isDateInRange(
                activity.created_at,
                start,
                end
              )
            )
            .sort(
              (a, b) =>
                new Date(
                  b.created_at
                ).getTime() -
                new Date(
                  a.created_at
                ).getTime()
            )
            .slice(0, 20)
        }

        setData({
          todayRevenue,
          todayProfit,
          todayPayments,
          outstandingDebt,

          todaySales:
            todaySales.length,
          todayItems,

          todayLossValue,
          todayLostValue,
          todayDamagedValue,
          todayLossCount,

          stockUnits,
          stockValue,

          lowStockCount,
          outOfStockCount,

          productCount:
            activeProducts.length,
          productTypeCount:
            activeProductTypes.length,

          recentActivity,
        })
      } catch (err) {
        console.error(
          'Dashboard load error:',
          err
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load dashboard data.'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    []
  )

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const handleRefresh = () => {
    setRefreshing(true)
    void loadDashboard()
  }

  return (
    <section className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* ================= HERO ================= */}
        <div className="relative overflow-hidden rounded-[28px] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                {tx('Business Overview')}
              </div>

              <p className="text-sm font-medium text-slate-400">
                {t('welcomeBack')}
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                {t('dashboard')}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                {tx(
                  "Your business at a glance — today's revenue, profit, cash, stock health and operational activity."
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  handleRefresh
                }
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshIcon
                  className={
                    refreshing
                      ? 'animate-spin'
                      : ''
                  }
                />

                {refreshing
                  ? tx('Refreshing...')
                  : tx('Refresh')}
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/reports'
                  )
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100"
              >
                <ChartIcon />
                {t('viewReports')}
              </button>
            </div>
          </div>
        </div>

        {/* ================= ERROR ================= */}
        {error && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">
                  {tx(
                    'Dashboard could not load completely.'
                  )}
                </p>

                <p className="mt-1 break-words text-xs opacity-80">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                {tx('Try Again')}
              </button>
            </div>
          </div>
        )}

        {/* ================= TODAY ================= */}
        <div className="mt-7 flex items-end justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
              {tx('Today')}
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              {tx('Business Performance')}
            </h2>
          </div>

          <p className="hidden text-xs font-medium text-slate-400 sm:block">
            {tx('Live from your business records')}
          </p>
        </div>

        {/* ================= PRIMARY KPIs ================= */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title={t('todaysRevenue')}
            value={formatMoney(
              data.todayRevenue
            )}
            description={t(
              'salesRevenueToday'
            )}
            loading={loading}
            icon={<MoneyIcon />}
            accent="indigo"
          />

          <DashboardCard
            title={t('todaysProfit')}
            value={formatMoney(
              data.todayProfit
            )}
            description={t(
              'grossProfitToday'
            )}
            loading={loading}
            icon={<ProfitIcon />}
            accent="emerald"
          />

          <DashboardCard
            title={t('cashReceived')}
            value={formatMoney(
              data.todayPayments
            )}
            description={t(
              'paymentsReceivedToday'
            )}
            loading={loading}
            icon={<WalletIcon />}
            accent="blue"
          />

          <DashboardCard
            title={t(
              'outstandingDebt'
            )}
            value={formatMoney(
              data.outstandingDebt
            )}
            description={t(
              'customerBalances'
            )}
            loading={loading}
            icon={<DebtIcon />}
            accent="amber"
          />
        </div>

        {/* ================= SECONDARY STATS ================= */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MiniStat
            label={tx("Today's Sales")}
            value={formatNumber(
              data.todaySales
            )}
            icon={<ReceiptIcon />}
            loading={loading}
          />

          <MiniStat
            label={tx('Items Sold Today')}
            value={formatNumber(
              data.todayItems
            )}
            icon={<BoxIcon />}
            loading={loading}
          />

          <MiniStat
            label={tx('Stock Units')}
            value={formatNumber(
              data.stockUnits
            )}
            icon={<InventoryIcon />}
            loading={loading}
          />

          <LossMiniStat
            value={formatMoney(
              data.todayLossValue
            )}
            lostValue={
              data.todayLostValue
            }
            damagedValue={
              data.todayDamagedValue
            }
            count={
              data.todayLossCount
            }
            loading={loading}
            isRw={isRw}
          />

          <MiniStat
            label={tx("Today's Activities")}
            value={formatNumber(
              data.recentActivity.length
            )}
            icon={<ActivityIcon />}
            loading={loading}
          />
        </div>

        {/* ================= STATUS PANELS ================= */}
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <DashboardPanel
            title={t('inventory')}
            description={t(
              'inventoryOverview'
            )}
            stat={formatNumber(
              data.stockUnits
            )}
            statLabel={tx('Units in stock')}
            icon={<InventoryIcon />}
            onClick={() =>
              router.push(
                '/inventory'
              )
            }
          />

          <DashboardPanel
            title={t('lowOutOfStock')}
            description={t(
              'stockAttention'
            )}
            stat={formatNumber(
              data.lowStockCount +
                data.outOfStockCount
            )}
            statLabel={`${data.lowStockCount} ${tx('low')} • ${data.outOfStockCount} ${tx('out')}`}
            icon={<WarningIcon />}
            alert={
              data.lowStockCount +
                data.outOfStockCount >
              0
            }
            onClick={() =>
              router.push(
                '/inventory'
              )
            }
          />

          <DashboardPanel
            title={tx('Stock Value')}
            description={tx('Current sellable inventory cost value.')}
            stat={formatMoney(
              data.stockValue
            )}
            statLabel={tx('Current stock')}
            icon={<ValueIcon />}
            onClick={() =>
              router.push(
                '/reports'
              )
            }
          />
        </div>

        {/* ================= SNAPSHOT + ACTIVITY ================= */}
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          {/* Inventory Snapshot */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                  {tx('Inventory')}
                </p>

                <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {tx('Stock Snapshot')}
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {tx('Current inventory health.')}
                </p>
              </div>

              <div className="rounded-2xl bg-indigo-50 p-3.5 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <InventoryIcon />
              </div>
            </div>

            <div className="mt-6 space-y-1">
              <SnapshotRow
                label={tx('Total Units')}
                value={formatNumber(
                  data.stockUnits
                )}
              />

              <SnapshotRow
                label={tx('Current Stock Value')}
                value={formatMoney(
                  data.stockValue
                )}
              />

              <SnapshotRow
                label={tx('Product Families')}
                value={formatNumber(
                  data.productCount
                )}
              />

              <SnapshotRow
                label={tx('Product Types / Kinds')}
                value={formatNumber(
                  data.productTypeCount
                )}
              />

              <SnapshotRow
                label={tx('Low Stock')}
                value={formatNumber(
                  data.lowStockCount
                )}
                valueClass={
                  data.lowStockCount >
                  0
                    ? 'text-amber-600 dark:text-amber-400'
                    : undefined
                }
              />

              <SnapshotRow
                label={tx('Out of Stock')}
                value={formatNumber(
                  data.outOfStockCount
                )}
                valueClass={
                  data.outOfStockCount >
                  0
                    ? 'text-rose-600 dark:text-rose-400'
                    : undefined
                }
              />

              <SnapshotRow
                label={tx("Today's Loss")}
                value={formatMoney(
                  data.todayLossValue
                )}
                valueClass={
                  data.todayLossValue >
                  0
                    ? 'text-rose-600 dark:text-rose-400'
                    : undefined
                }
              />
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  '/inventory'
                )
              }
              className="mt-6 flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-black text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
            >
              {tx('Open Inventory')}
              <ArrowIcon />
            </button>
          </div>

          {/* Recent Activity */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:col-span-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                    {tx('Today')}
                  </p>

                  {data.recentActivity.length >
                    0 && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      {
                        data.recentActivity
                          .length
                      }
                    </span>
                  )}
                </div>

                <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {tx('Recent Business Activity')}
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {tx("Only today's actions are shown here.")}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/history'
                  )
                }
                className="hidden items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400 sm:inline-flex"
              >
                {tx('View All')}
                <ArrowIcon />
              </button>
            </div>

            <div className="mt-5">
              {loading ? (
                <ActivitySkeleton />
              ) : data.recentActivity
                  .length === 0 ? (
                <EmptyActivity isRw={isRw} />
              ) : (
                <div className="max-h-[320px] overflow-y-auto overscroll-contain rounded-2xl border border-slate-100 bg-slate-50/70 pr-1 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
                    {data.recentActivity.map(
                      (
                        activity
                      ) => {
                        const details =
                          getActivityDetails(
                            activity,
                            isRw
                          )

                        const who =
                          activity.user_email
                            ? activity.user_email
                            : activity.user_id
                              ? tx('Unknown user')
                              : tx('System')

                        return (
                          <div
                            key={
                              activity.id
                            }
                            className="flex items-start gap-3 px-4 py-4 transition hover:bg-white dark:hover:bg-slate-900"
                          >
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                              <ActivityIcon />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] font-black ${getActivityClass(
                                    activity.action_type
                                  )}`}
                                >
                                  {translateDashWords(
                                    formatAction(
                                      activity.action_type
                                    ),
                                    isRw
                                  )}
                                </span>

                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                  {formatTime(
                                    activity.created_at
                                  )}
                                </span>

                                <span className="text-[11px] font-medium text-slate-400">
                                  {formatAgo(
                                    activity.created_at,
                                    isRw
                                  )}
                                </span>
                              </div>

                              <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-200">
                                {translateDashWords(
                                  formatAction(
                                    activity.entity_type
                                  ),
                                  isRw
                                )}

                                {details.subject && (
                                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                                    {' — '}
                                    {details.subject}
                                  </span>
                                )}
                              </p>

                              {details.chips
                                .length >
                                0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {details.chips.map(
                                    (
                                      chip
                                    ) => (
                                      <span
                                        key={`${chip.label}-${chip.value}`}
                                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${getChipClass(
                                          chip.tone
                                        )}`}
                                      >
                                        <span className="font-semibold opacity-70">
                                          {
                                            chip.label
                                          }
                                        </span>

                                        {
                                          chip.value
                                        }
                                      </span>
                                    )
                                  )}
                                </div>
                              )}

                              {activity.reason && (
                                <p className="mt-1.5 truncate text-xs text-slate-400">
                                  {
                                    activity.reason
                                  }
                                </p>
                              )}

                              <p className="mt-1 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {tx('By')}{' '}
                                <span className="font-bold text-slate-700 dark:text-slate-200">
                                  {who}
                                </span>
                              </p>
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  '/history'
                )
              }
              className="mt-4 flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white sm:hidden"
            >
              {tx('View Full History')}
              <ArrowIcon />
            </button>
          </div>
        </div>

        {/* ================= QUICK ACTIONS ================= */}
        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
              {tx('Shortcuts')}
            </p>

            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {tx('Quick Actions')}
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tx(
                'Jump directly into the most-used business areas.'
              )}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickAction
              label={t('newPurchase')}
              icon={<PurchaseIcon />}
              onClick={() =>
                router.push(
                  '/purchases'
                )
              }
            />

            <QuickAction
              label={t('newSale')}
              icon={<SaleIcon />}
              onClick={() =>
                router.push(
                  '/sales'
                )
              }
            />

            <QuickAction
              label={t('products')}
              icon={<ProductsIcon />}
              onClick={() =>
                router.push(
                  '/products'
                )
              }
            />

            <QuickAction
              label={t('viewInventory')}
              icon={<InventoryIcon />}
              onClick={() =>
                router.push(
                  '/inventory'
                )
              }
            />

            <QuickAction
              label={t('viewReports')}
              icon={<ChartIcon />}
              onClick={() =>
                router.push(
                  '/reports'
                )
              }
            />

            <QuickAction
              label={t('customers')}
              icon={<CustomersIcon />}
              onClick={() =>
                router.push(
                  '/customers'
                )
              }
            />

            <QuickAction
              label={t('debts')}
              icon={<DebtIcon />}
              onClick={() =>
                router.push(
                  '/debts'
                )
              }
            />

            <QuickAction
              label={t('history')}
              icon={<HistoryIcon />}
              onClick={() =>
                router.push(
                  '/history'
                )
              }
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* =========================================================
   COMPONENTS
========================================================= */

function DashboardCard({
  title,
  value,
  description,
  loading,
  icon,
  accent,
}: {
  title: string
  value: string
  description: string
  loading: boolean
  icon: ReactNode
  accent:
    | 'indigo'
    | 'emerald'
    | 'blue'
    | 'amber'
}) {
  const accentClasses = {
    indigo:
      'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    emerald:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    blue:
      'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    amber:
      'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  }

  return (
    <div className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {title}
          </p>

          {loading ? (
            <div className="mt-3 h-8 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          ) : (
            <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {value}
            </p>
          )}

          <p className="mt-2 text-xs leading-5 text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`shrink-0 rounded-2xl p-3.5 transition group-hover:scale-105 ${accentClasses[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  icon,
  loading,
}: {
  label: string
  value: string
  icon: ReactNode
  loading: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-400">
          {label}
        </p>

        {loading ? (
          <div className="mt-1 h-5 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        ) : (
          <p className="mt-0.5 truncate text-base font-black text-slate-900 dark:text-white">
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

function LossMiniStat({
  value,
  lostValue,
  damagedValue,
  count,
  loading,
  isRw = false,
}: {
  value: string
  lostValue: number
  damagedValue: number
  count: number
  loading: boolean
  isRw?: boolean
}) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-4 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white p-2.5 text-rose-600 shadow-sm dark:bg-slate-900 dark:text-rose-400">
          <LossIcon />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
            {translateDash("Today's Loss", isRw)}
          </p>

          {loading ? (
            <div className="mt-1 h-5 w-24 animate-pulse rounded bg-rose-100 dark:bg-rose-900/40" />
          ) : (
            <p className="mt-0.5 truncate text-base font-black text-rose-700 dark:text-rose-300">
              {value}
            </p>
          )}

          {!loading && (
            <p className="mt-1 text-[10px] font-semibold leading-4 text-rose-500/80 dark:text-rose-300/70">
              {translateDash('Lost', isRw)}{' '}
              {formatMoney(lostValue)}
              {' • '}
              {translateDash('Damaged', isRw)}{' '}
              {formatMoney(damagedValue)}
              {' • '}
              {count}{' '}
              {translateDash(
                count === 1
                  ? 'record'
                  : 'records',
                isRw
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function DashboardPanel({
  title,
  description,
  stat,
  statLabel,
  icon,
  alert,
  onClick,
}: {
  title: string
  description: string
  stat: string
  statLabel: string
  icon: ReactNode
  alert?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-48 rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={`rounded-2xl p-3 ${
            alert
              ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
              : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
          }`}
        >
          {icon}
        </div>

        <ArrowUpRightIcon />
      </div>

      <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>

      <div className="mt-5 flex items-end gap-2">
        <span className="truncate text-2xl font-black text-slate-900 dark:text-white">
          {stat}
        </span>

        <span className="pb-1 text-xs font-medium text-slate-400">
          {statLabel}
        </span>
      </div>
    </button>
  )
}

function SnapshotRow({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {label}
      </span>

      <span
        className={`text-sm font-black ${
          valueClass ??
          'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function QuickAction({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-slate-700 dark:hover:text-white"
    >
      <span className="rounded-xl bg-white p-2.5 text-slate-500 shadow-sm transition group-hover:text-indigo-600 dark:bg-slate-900 dark:text-slate-300 dark:group-hover:text-indigo-400">
        {icon}
      </span>

      <span className="flex-1">
        {label}
      </span>

      <ArrowIcon />
    </button>
  )
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      {[
        1,
        2,
        3,
        4,
        5,
      ].map((item) => (
        <div
          key={item}
          className="flex gap-3"
        >
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />

          <div className="flex-1">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

            <div className="mt-2 h-3 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyActivity({ isRw = false }: { isRw?: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-10 text-center dark:border-slate-700 dark:bg-slate-950/40">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm dark:bg-slate-800">
        <ActivityIcon />
      </div>

      <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">
        {translateDash('No activity yet today', isRw)}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {translateDash(
          'Business actions will appear here automatically.',
          isRw
        )}
      </p>
    </div>
  )
}

/* =========================================================
   SVG ICONS
========================================================= */

function Icon({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function MoneyIcon() {
  return (
    <Icon>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />
      <path d="M7 9h.01M17 15h.01" />
      <circle
        cx="12"
        cy="12"
        r="2.5"
      />
    </Icon>
  )
}

function ProfitIcon() {
  return (
    <Icon>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 3-4 3 2 5-7" />
      <path d="M15 6h3v3" />
    </Icon>
  )
}

function WalletIcon() {
  return (
    <Icon>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5z" />
      <path d="M4 8h15" />
      <path d="M15 12h5" />
      <path d="M16.5 12v.01" />
    </Icon>
  )
}

function DebtIcon() {
  return (
    <Icon>
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M12 7v10" />
      <path d="M15 9.5c-.7-.8-1.7-1.2-3-1.2-1.7 0-2.8.8-2.8 2s1.1 1.8 2.8 2.1 2.8.6 2.8 2-1.1 2-2.8 2c-1.3 0-2.4-.5-3.1-1.3" />
    </Icon>
  )
}

function ReceiptIcon() {
  return (
    <Icon>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </Icon>
  )
}

function BoxIcon() {
  return (
    <Icon>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </Icon>
  )
}

function InventoryIcon() {
  return (
    <Icon>
      <path d="M4 7h16v13H4z" />
      <path d="M7 7V4h10v3" />
      <path d="M8 11h8M8 15h5" />
    </Icon>
  )
}

function LossIcon() {
  return (
    <Icon>
      <path d="m12 3 9 17H3z" />
      <path d="M12 8v5" />
      <path d="M12 17v.01" />
    </Icon>
  )
}

function ValueIcon() {
  return (
    <Icon>
      <circle
        cx="12"
        cy="12"
        r="8.5"
      />
      <path d="M12 7v10" />
      <path d="M15 9.5c-.6-.8-1.6-1.2-3-1.2-1.6 0-2.7.7-2.7 1.9s1.1 1.7 2.7 2 2.7.6 2.7 1.9-1.1 1.9-2.7 1.9c-1.4 0-2.5-.4-3.1-1.2" />
    </Icon>
  )
}

function WarningIcon() {
  return (
    <Icon>
      <path d="m12 3 9 17H3z" />
      <path d="M12 9v5M12 17v.01" />
    </Icon>
  )
}

function ActivityIcon() {
  return (
    <Icon>
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </Icon>
  )
}

function ChartIcon() {
  return (
    <Icon>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 16v-4M12 16V8M17 16v-7" />
    </Icon>
  )
}

function PurchaseIcon() {
  return (
    <Icon>
      <path d="M4 5h16v14H4z" />
      <path d="M8 9h8M8 13h5" />
      <path d="M16 17v-4M14 15h4" />
    </Icon>
  )
}

function SaleIcon() {
  return (
    <Icon>
      <path d="M4 6h16v14H4z" />
      <path d="M8 10h8M8 14h5" />
      <path d="M17 4v4" />
    </Icon>
  )
}

function CustomersIcon() {
  return (
    <Icon>
      <circle
        cx="9"
        cy="8"
        r="3"
      />
      <path d="M3 20c.6-3.3 2.6-5 6-5s5.4 1.7 6 5" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M17 15c2.2.4 3.5 2 4 5" />
    </Icon>
  )
}

function HistoryIcon() {
  return (
    <Icon>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 5v5h5" />
      <path d="M12 7v5l3 2" />
    </Icon>
  )
}

function ProductsIcon() {
  return (
    <Icon>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </Icon>
  )
}

function RefreshIcon({
  className = '',
}: {
  className?: string
}) {
  return (
    <Icon className={className}>
      <path d="M20 11a8 8 0 0 0-14-5L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14 5l2-2" />
      <path d="M20 20v-4h-4" />
    </Icon>
  )
}

function ArrowIcon() {
  return (
    <Icon className="h-4 w-4">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  )
}

function ArrowUpRightIcon() {
  return (
    <Icon className="h-4 w-4 text-slate-300 transition group-hover:text-indigo-500 dark:text-slate-600">
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </Icon>
  )
}