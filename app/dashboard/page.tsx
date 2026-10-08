'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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

type AuditLog = {
  id: string
  user_email: string | null
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
  stockUnits: 0,
  stockValue: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  productCount: 0,
  productTypeCount: 0,
  recentActivity: [],
}

function toNumber(value: number | string | null | undefined) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function getTodayDate() {
  const date = new Date()
  const offset = date.getTimezoneOffset()

  return new Date(date.getTime() - offset * 60_000)
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
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
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

  if (value.includes('return') || value.includes('recover')) {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
  }

  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useAppPreferences()

  const [data, setData] = useState<DashboardData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
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
        historyResult,
      ] = await Promise.all([
        supabase
          .from('sales')
          .select(
            'id,sale_date,total_revenue,total_cost,total_profit,amount_paid,amount_due,payment_status'
          ),

        supabase
          .from('sale_items')
          .select('id,sale_id,quantity'),

        supabase
          .from('payments')
          .select('id,sale_id,amount,payment_date'),

        supabase
          .from('batches')
          .select(
            'id,product_type_id,remaining_quantity,unit_cost,status'
          ),

        supabase
          .from('product_types')
          .select('id,product_id,name,minimum_stock,status'),

        supabase
          .from('products')
          .select('id,name,status'),

        supabase.rpc('get_audit_history_with_email'),
      ])

      if (salesResult.error) throw salesResult.error
      if (saleItemsResult.error) throw saleItemsResult.error
      if (paymentsResult.error) throw paymentsResult.error
      if (batchesResult.error) throw batchesResult.error
      if (productTypesResult.error) throw productTypesResult.error
      if (productsResult.error) throw productsResult.error

      const sales = (salesResult.data ?? []) as Sale[]
      const saleItems = (saleItemsResult.data ?? []) as SaleItem[]
      const payments = (paymentsResult.data ?? []) as Payment[]
      const batches = (batchesResult.data ?? []) as Batch[]
      const productTypes = (productTypesResult.data ?? []) as ProductType[]
      const products = (productsResult.data ?? []) as Product[]

      const todaySales = sales.filter((sale) => {
        return sale.sale_date >= start && sale.sale_date <= end
      })

      const todaySaleIds = new Set(todaySales.map((sale) => sale.id))

      const todayRevenue = todaySales.reduce(
        (sum, sale) => sum + toNumber(sale.total_revenue),
        0
      )

      const todayProfit = todaySales.reduce(
        (sum, sale) => sum + toNumber(sale.total_profit),
        0
      )

      const todayPayments = payments
        .filter((payment) => {
          return (
            payment.payment_date >= start &&
            payment.payment_date <= end
          )
        })
        .reduce((sum, payment) => sum + toNumber(payment.amount), 0)

      const outstandingDebt = sales.reduce(
        (sum, sale) => sum + Math.max(0, toNumber(sale.amount_due)),
        0
      )

      const todayItems = saleItems
        .filter((item) => todaySaleIds.has(item.sale_id))
        .reduce((sum, item) => sum + toNumber(item.quantity), 0)

      const activeProductTypes = productTypes.filter(
        (type) => type.status !== 'inactive'
      )

      const activeProducts = products.filter(
        (product) => product.status !== 'inactive'
      )

      const activeBatches = batches.filter(
        (batch) => batch.status !== 'cancelled'
      )

      const stockUnits = activeBatches.reduce(
        (sum, batch) => sum + toNumber(batch.remaining_quantity),
        0
      )

      const stockValue = activeBatches.reduce(
        (sum, batch) =>
          sum +
          toNumber(batch.remaining_quantity) *
            toNumber(batch.unit_cost),
        0
      )

      const stockByType = new Map<string, number>()

      for (const batch of activeBatches) {
        const current = stockByType.get(batch.product_type_id) ?? 0

        stockByType.set(
          batch.product_type_id,
          current + toNumber(batch.remaining_quantity)
        )
      }

      let lowStockCount = 0
      let outOfStockCount = 0

      for (const type of activeProductTypes) {
        const quantity = stockByType.get(type.id) ?? 0
        const minimum = Math.max(0, toNumber(type.minimum_stock))

        if (quantity <= 0) {
          outOfStockCount += 1
        } else if (quantity <= minimum) {
          lowStockCount += 1
        }
      }

      let recentActivity: AuditLog[] = []

      if (!historyResult.error && Array.isArray(historyResult.data)) {
        recentActivity = (historyResult.data as AuditLog[]).slice(0, 6)
      }

      setData({
        todayRevenue,
        todayProfit,
        todayPayments,
        outstandingDebt,
        todaySales: todaySales.length,
        todayItems,
        stockUnits,
        stockValue,
        lowStockCount,
        outOfStockCount,
        productCount: activeProducts.length,
        productTypeCount: activeProductTypes.length,
        recentActivity,
      })
    } catch (err) {
      console.error('Dashboard load error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load dashboard data.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handleRefresh = () => {
    setRefreshing(true)
    loadDashboard()
  }

  const averageSale = useMemo(() => {
    if (data.todaySales === 0) return 0
    return data.todayRevenue / data.todaySales
  }, [data.todayRevenue, data.todaySales])

  return (
    <section className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-xl sm:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Business Overview
              </div>

              <p className="text-sm font-medium text-slate-400">
                {t('welcomeBack')}
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                {t('dashboard')}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Manage your kitchenware business, monitor stock,
                sales, payments and profit from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshIcon
                  className={refreshing ? 'animate-spin' : ''}
                />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>

              <button
                type="button"
                onClick={() => router.push('/reports')}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
              >
                <ChartIcon />
                {t('viewReports')}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">Dashboard could not load completely.</p>
                <p className="mt-1 break-words text-xs opacity-80">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Today's overview */}
        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Today
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              Business Performance
            </h2>
          </div>

          <p className="hidden text-xs font-medium text-slate-400 sm:block">
            Live from your business records
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title={t('todaysRevenue')}
            value={formatMoney(data.todayRevenue)}
            description={t('salesRevenueToday')}
            loading={loading}
            icon={<MoneyIcon />}
            accent="indigo"
          />

          <DashboardCard
            title={t('todaysProfit')}
            value={formatMoney(data.todayProfit)}
            description={t('grossProfitToday')}
            loading={loading}
            icon={<ProfitIcon />}
            accent="emerald"
          />

          <DashboardCard
            title={t('cashReceived')}
            value={formatMoney(data.todayPayments)}
            description={t('paymentsReceivedToday')}
            loading={loading}
            icon={<WalletIcon />}
            accent="blue"
          />

          <DashboardCard
            title={t('outstandingDebt')}
            value={formatMoney(data.outstandingDebt)}
            description={t('customerBalances')}
            loading={loading}
            icon={<DebtIcon />}
            accent="amber"
          />
        </div>

        {/* Secondary statistics */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat
            label="Today's Sales"
            value={formatNumber(data.todaySales)}
            icon={<ReceiptIcon />}
            loading={loading}
          />

          <MiniStat
            label="Items Sold Today"
            value={formatNumber(data.todayItems)}
            icon={<BoxIcon />}
            loading={loading}
          />

          <MiniStat
            label="Average Sale"
            value={formatMoney(averageSale)}
            icon={<AverageIcon />}
            loading={loading}
          />

          <MiniStat
            label="Stock Units"
            value={formatNumber(data.stockUnits)}
            icon={<InventoryIcon />}
            loading={loading}
          />
        </div>

        {/* Inventory status */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <DashboardPanel
            title={t('inventory')}
            description={t('inventoryOverview')}
            stat={formatNumber(data.stockUnits)}
            statLabel="Units in stock"
            icon={<InventoryIcon />}
            onClick={() => router.push('/inventory')}
          />

          <DashboardPanel
            title={t('lowOutOfStock')}
            description={t('stockAttention')}
            stat={`${data.lowStockCount + data.outOfStockCount}`}
            statLabel={`${data.lowStockCount} low • ${data.outOfStockCount} out`}
            icon={<WarningIcon />}
            alert={
              data.lowStockCount + data.outOfStockCount > 0
            }
            onClick={() => router.push('/inventory')}
          />

          <DashboardPanel
            title={t('recentActivity')}
            description={t('recentBusinessActivity')}
            stat={formatNumber(data.recentActivity.length)}
            statLabel="Recent records"
            icon={<ActivityIcon />}
            onClick={() => router.push('/history')}
          />
        </div>

        {/* Inventory snapshot + recent activity */}
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          {/* Inventory snapshot */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Inventory
                </p>

                <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  Stock Snapshot
                </h3>
              </div>

              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <InventoryIcon />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <SnapshotRow
                label="Total Units"
                value={formatNumber(data.stockUnits)}
              />

              <SnapshotRow
                label="Current Stock Value"
                value={formatMoney(data.stockValue)}
              />

              <SnapshotRow
                label="Product Families"
                value={formatNumber(data.productCount)}
              />

              <SnapshotRow
                label="Product Types / Kinds"
                value={formatNumber(data.productTypeCount)}
              />

              <SnapshotRow
                label="Low Stock"
                value={formatNumber(data.lowStockCount)}
                valueClass={
                  data.lowStockCount > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : undefined
                }
              />

              <SnapshotRow
                label="Out of Stock"
                value={formatNumber(data.outOfStockCount)}
                valueClass={
                  data.outOfStockCount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : undefined
                }
              />
            </div>

            <button
              type="button"
              onClick={() => router.push('/inventory')}
              className="mt-6 flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
            >
              Open Inventory
              <ArrowIcon />
            </button>
          </div>

          {/* Recent activity */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:col-span-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Activity
                </p>

                <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  Recent Business Activity
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Latest actions recorded in the system.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/history')}
                className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400 sm:block"
              >
                View All
              </button>
            </div>

            <div className="mt-5">
              {loading ? (
                <ActivitySkeleton />
              ) : data.recentActivity.length === 0 ? (
                <EmptyActivity />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <ActivityIcon />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${getActivityClass(
                              activity.action_type
                            )}`}
                          >
                            {formatAction(activity.action_type)}
                          </span>

                          <span className="text-xs text-slate-400">
                            {formatTime(activity.created_at)}
                          </span>
                        </div>

                        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {formatAction(activity.entity_type)}
                        </p>

                        {activity.reason && (
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {activity.reason}
                          </p>
                        )}

                        {activity.user_email && (
                          <p className="mt-1 truncate text-[11px] text-slate-400">
                            {activity.user_email}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => router.push('/history')}
              className="mt-5 flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white sm:hidden"
            >
              View Full History
              <ArrowIcon />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Shortcuts
            </p>

            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {t('quickActions')}
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('quickActionsDescription')}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickAction
              label={t('newPurchase')}
              icon={<PurchaseIcon />}
              onClick={() => router.push('/purchases')}
            />

            <QuickAction
              label={t('newSale')}
              icon={<SaleIcon />}
              onClick={() => router.push('/sales')}
            />

            <QuickAction
              label={t('viewInventory')}
              icon={<InventoryIcon />}
              onClick={() => router.push('/inventory')}
            />

            <QuickAction
              label={t('viewReports')}
              icon={<ChartIcon />}
              onClick={() => router.push('/reports')}
            />

            <QuickAction
              label={t('customers')}
              icon={<CustomersIcon />}
              onClick={() => router.push('/customers')}
            />

            <QuickAction
              label={t('debts')}
              icon={<DebtIcon />}
              onClick={() => router.push('/debts')}
            />

            <QuickAction
              label={t('history')}
              icon={<HistoryIcon />}
              onClick={() => router.push('/history')}
            />

            <QuickAction
              label={t('settings')}
              icon={<SettingsIcon />}
              onClick={() => router.push('/settings')}
            />
          </div>
        </div>

        {/* Main management links */}
        <div className="mt-6">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Management
            </p>

            <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              Business Management
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ManagementLink
              title={t('products')}
              description="Manage products and product types."
              icon={<ProductsIcon />}
              onClick={() => router.push('/products')}
            />

            <ManagementLink
              title={t('customers')}
              description="Manage customers and balances."
              icon={<CustomersIcon />}
              onClick={() => router.push('/customers')}
            />

            <ManagementLink
              title={t('history')}
              description="Review sales, payments, losses, returns and stock activity."
              icon={<HistoryIcon />}
              onClick={() => router.push('/history')}
            />

            <ManagementLink
              title={t('settings')}
              description="Manage application preferences."
              icon={<SettingsIcon />}
              onClick={() => router.push('/settings')}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

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
  icon: React.ReactNode
  accent: 'indigo' | 'emerald' | 'blue' | 'amber'
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
    <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {title}
          </p>

          {loading ? (
            <div className="mt-3 h-8 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          ) : (
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {value}
            </p>
          )}

          <p className="mt-2 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`rounded-2xl p-3.5 transition group-hover:scale-105 ${accentClasses[accent]}`}
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
  icon: React.ReactNode
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
  icon: React.ReactNode
  alert?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-48 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500 sm:p-6"
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
        <span className="text-2xl font-black text-slate-900 dark:text-white">
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
          valueClass ?? 'text-slate-900 dark:text-white'
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
  icon: React.ReactNode
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

      <span className="flex-1">{label}</span>

      <ArrowIcon />
    </button>
  )
}

function ManagementLink({
  title,
  description,
  icon,
  onClick,
}: {
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-2xl bg-slate-100 p-3 text-slate-600 transition group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-indigo-500/10 dark:group-hover:text-indigo-400">
          {icon}
        </span>

        <ArrowUpRightIcon />
      </div>

      <h4 className="mt-5 font-black text-slate-900 dark:text-white">
        {title}
      </h4>

      <p className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </button>
  )
}

function ActivitySkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="flex gap-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />

          <div className="flex-1">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-2 h-3 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyActivity() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <ActivityIcon />
      </div>

      <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
        No recent activity
      </p>

      <p className="mt-1 text-xs text-slate-400">
        Business actions will appear here automatically.
      </p>
    </div>
  )
}

/* ---------------- Icons ---------------- */

function Icon({
  children,
  className = '',
}: {
  children: React.ReactNode
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h.01M17 15h.01" />
      <circle cx="12" cy="12" r="2.5" />
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
      <circle cx="12" cy="12" r="9" />
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

function AverageIcon() {
  return (
    <Icon>
      <path d="M4 18h16" />
      <path d="M7 15V9M12 15V5M17 15v-3" />
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
      <circle cx="9" cy="8" r="3" />
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

function SettingsIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-2.4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.6-1H6v-2.4h.1a1.7 1.7 0 0 0 1.6-1A1.7 1.7 0 0 0 8.1 8.7L8 8.6 9.7 7l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5H15v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3L18 6.3 19.7 8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v2.4h-.1a1.7 1.7 0 0 0-1.5 1.6Z" />
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

function RefreshIcon({ className = '' }: { className?: string }) {
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