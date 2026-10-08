'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '@/lib/supabase'

type Sale = {
  id: string
  customer_id: string | null
  sale_date: string
  total_revenue: number
  total_cost: number
  total_profit: number
  amount_paid: number
  amount_due: number
  payment_status: string
}

type SaleItem = {
  id: string
  sale_id: string
  product_type_id: string
  quantity: number
  selling_price: number
  revenue: number
  cost: number
  profit: number
}

type Payment = {
  id: string
  sale_id: string
  customer_id: string | null
  amount: number
  payment_date: string
  notes: string | null
}

type Product = {
  id: string
  name: string
}

type ProductType = {
  id: string
  product_id: string
  name: string
  status: string
}

type Batch = {
  id: string
  product_type_id: string
  remaining_quantity: number
  unit_cost: number
  status: string
}

type ProductTypeReport = {
  productTypeId: string
  productName: string
  productTypeName: string
  quantitySold: number
  revenue: number
  cost: number
  profit: number
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getToday() {
  return getLocalDateString()
}

function getYesterday() {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return getLocalDateString(date)
}

function getWeekStart() {
  const date = new Date()
  const day = date.getDay()

  const difference = day === 0 ? -6 : 1 - day

  date.setDate(date.getDate() + difference)

  return getLocalDateString(date)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-RW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getStartOfDay(date: string) {
  return `${date}T00:00:00`
}

function getEndOfDay(date: string) {
  return `${date}T23:59:59.999`
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '')

  if (
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n')
  ) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

function getReportPeriodLabel(
  startDate: string,
  endDate: string,
) {
  const today = getToday()
  const yesterday = getYesterday()
  const weekStart = getWeekStart()

  if (startDate === today && endDate === today) {
    return 'Today'
  }

  if (
    startDate === yesterday &&
    endDate === yesterday
  ) {
    return 'Yesterday'
  }

  if (
    startDate === weekStart &&
    endDate === today
  ) {
    return 'This Week'
  }

  return `${formatDate(startDate)} – ${formatDate(endDate)}`
}

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productTypes, setProductTypes] = useState<
    ProductType[]
  >([])
  const [batches, setBatches] = useState<Batch[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Default report = TODAY
  const [startDate, setStartDate] = useState(
    () => getToday(),
  )

  const [endDate, setEndDate] = useState(
    () => getToday(),
  )

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const [
        salesResult,
        saleItemsResult,
        paymentsResult,
        productsResult,
        productTypesResult,
        batchesResult,
      ] = await Promise.all([
        supabase
          .from('sales')
          .select(
            `
              id,
              customer_id,
              sale_date,
              total_revenue,
              total_cost,
              total_profit,
              amount_paid,
              amount_due,
              payment_status
            `,
          )
          .order('sale_date', {
            ascending: false,
          }),

        supabase
          .from('sale_items')
          .select(
            `
              id,
              sale_id,
              product_type_id,
              quantity,
              selling_price,
              revenue,
              cost,
              profit
            `,
          ),

        supabase
          .from('payments')
          .select(
            `
              id,
              sale_id,
              customer_id,
              amount,
              payment_date,
              notes
            `,
          )
          .order('payment_date', {
            ascending: false,
          }),

        supabase
          .from('products')
          .select('id, name')
          .order('name'),

        supabase
          .from('product_types')
          .select(
            'id, product_id, name, status',
          )
          .order('name'),

        supabase
          .from('batches')
          .select(
            `
              id,
              product_type_id,
              remaining_quantity,
              unit_cost,
              status
            `,
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

      if (productsResult.error) {
        throw productsResult.error
      }

      if (productTypesResult.error) {
        throw productTypesResult.error
      }

      if (batchesResult.error) {
        throw batchesResult.error
      }

      setSales(
        (salesResult.data || []) as Sale[],
      )

      setSaleItems(
        (saleItemsResult.data || []) as SaleItem[],
      )

      setPayments(
        (paymentsResult.data || []) as Payment[],
      )

      setProducts(
        (productsResult.data || []) as Product[],
      )

      setProductTypes(
        (productTypesResult.data || []) as ProductType[],
      )

      setBatches(
        (batchesResult.data || []) as Batch[],
      )
    } catch (err) {
      console.error(
        'Reports load error:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load reports.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredSales = useMemo(() => {
    if (!startDate || !endDate) {
      return sales
    }

    const start = new Date(
      getStartOfDay(startDate),
    ).getTime()

    const end = new Date(
      getEndOfDay(endDate),
    ).getTime()

    return sales.filter((sale) => {
      const saleTime = new Date(
        sale.sale_date,
      ).getTime()

      return (
        saleTime >= start &&
        saleTime <= end
      )
    })
  }, [sales, startDate, endDate])

  const filteredSaleIds = useMemo(() => {
    return new Set(
      filteredSales.map((sale) => sale.id),
    )
  }, [filteredSales])

  const filteredSaleItems = useMemo(() => {
    return saleItems.filter((item) =>
      filteredSaleIds.has(item.sale_id),
    )
  }, [saleItems, filteredSaleIds])

  const filteredPayments = useMemo(() => {
    if (!startDate || !endDate) {
      return payments
    }

    const start = new Date(
      getStartOfDay(startDate),
    ).getTime()

    const end = new Date(
      getEndOfDay(endDate),
    ).getTime()

    return payments.filter((payment) => {
      const paymentTime = new Date(
        payment.payment_date,
      ).getTime()

      return (
        paymentTime >= start &&
        paymentTime <= end
      )
    })
  }, [payments, startDate, endDate])

  const totalRevenue = useMemo(
    () =>
      filteredSales.reduce(
        (sum, sale) =>
          sum +
          (Number(sale.total_revenue) || 0),
        0,
      ),
    [filteredSales],
  )

  const totalCost = useMemo(
    () =>
      filteredSales.reduce(
        (sum, sale) =>
          sum +
          (Number(sale.total_cost) || 0),
        0,
      ),
    [filteredSales],
  )

  const totalProfit = useMemo(
    () =>
      filteredSales.reduce(
        (sum, sale) =>
          sum +
          (Number(sale.total_profit) || 0),
        0,
      ),
    [filteredSales],
  )

  const totalPaid = useMemo(
    () =>
      filteredPayments.reduce(
        (sum, payment) =>
          sum +
          (Number(payment.amount) || 0),
        0,
      ),
    [filteredPayments],
  )

  const totalItemsSold = useMemo(
    () =>
      filteredSaleItems.reduce(
        (sum, item) =>
          sum +
          (Number(item.quantity) || 0),
        0,
      ),
    [filteredSaleItems],
  )

  const outstandingDebt = useMemo(
    () =>
      filteredSales.reduce(
        (sum, sale) =>
          sum +
          Math.max(
            Number(sale.amount_due) || 0,
            0,
          ),
        0,
      ),
    [filteredSales],
  )

  const averageSale = useMemo(() => {
    if (filteredSales.length === 0) {
      return 0
    }

    return (
      totalRevenue /
      filteredSales.length
    )
  }, [totalRevenue, filteredSales.length])

  const profitMargin = useMemo(() => {
    if (totalRevenue <= 0) {
      return 0
    }

    return (
      (totalProfit / totalRevenue) *
      100
    )
  }, [totalProfit, totalRevenue])

  const stockUnits = useMemo(
    () =>
      batches.reduce(
        (sum, batch) =>
          sum +
          Math.max(
            Number(
              batch.remaining_quantity,
            ) || 0,
            0,
          ),
        0,
      ),
    [batches],
  )

  const stockValue = useMemo(
    () =>
      batches.reduce(
        (sum, batch) => {
          const quantity =
            Number(
              batch.remaining_quantity,
            ) || 0

          const unitCost =
            Number(batch.unit_cost) || 0

          return sum + quantity * unitCost
        },
        0,
      ),
    [batches],
  )

  const productTypeReports =
    useMemo<ProductTypeReport[]>(() => {
      const reportMap =
        new Map<
          string,
          ProductTypeReport
        >()

      for (const item of filteredSaleItems) {
        const productType =
          productTypes.find(
            (type) =>
              type.id ===
              item.product_type_id,
          )

        if (!productType) continue

        const product =
          products.find(
            (itemProduct) =>
              itemProduct.id ===
              productType.product_id,
          )

        const existing =
          reportMap.get(
            productType.id,
          )

        if (existing) {
          existing.quantitySold +=
            Number(item.quantity) || 0

          existing.revenue +=
            Number(item.revenue) || 0

          existing.cost +=
            Number(item.cost) || 0

          existing.profit +=
            Number(item.profit) || 0
        } else {
          reportMap.set(
            productType.id,
            {
              productTypeId:
                productType.id,
              productName:
                product?.name ||
                'Unknown Product',
              productTypeName:
                productType.name,
              quantitySold:
                Number(
                  item.quantity,
                ) || 0,
              revenue:
                Number(item.revenue) ||
                0,
              cost:
                Number(item.cost) || 0,
              profit:
                Number(item.profit) || 0,
            },
          )
        }
      }

      return Array.from(
        reportMap.values(),
      ).sort(
        (a, b) =>
          b.profit - a.profit,
      )
    }, [
      filteredSaleItems,
      productTypes,
      products,
    ])

  const paymentStatusSummary =
    useMemo(() => {
      const summary = {
        paid: 0,
        partial: 0,
        unpaid: 0,
      }

      for (const sale of filteredSales) {
        const status =
          sale.payment_status

        if (status === 'paid') {
          summary.paid += 1
        } else if (
          status === 'partial'
        ) {
          summary.partial += 1
        } else {
          summary.unpaid += 1
        }
      }

      return summary
    }, [filteredSales])

  function setToday() {
    const today = getToday()

    setStartDate(today)
    setEndDate(today)
  }

  function setYesterday() {
    const yesterday = getYesterday()

    setStartDate(yesterday)
    setEndDate(yesterday)
  }

  function setThisWeek() {
    setStartDate(getWeekStart())
    setEndDate(getToday())
  }

  function handlePrint() {
    window.print()
  }

  function handleExportCsv() {
    const rows: string[][] = []

    rows.push([
      'Kitchenware Management Report',
    ])

    rows.push([
      `Period: ${startDate} to ${endDate}`,
    ])

    rows.push([])

    rows.push([
      'Summary',
      'Value',
    ])

    rows.push([
      'Total Revenue',
      `${totalRevenue} RWF`,
    ])

    rows.push([
      'Total Cost',
      `${totalCost} RWF`,
    ])

    rows.push([
      'Total Profit',
      `${totalProfit} RWF`,
    ])

    rows.push([
      'Profit Margin',
      `${profitMargin.toFixed(2)}%`,
    ])

    rows.push([
      'Total Payments Received',
      `${totalPaid} RWF`,
    ])

    rows.push([
      'Outstanding Debt',
      `${outstandingDebt} RWF`,
    ])

    rows.push([
      'Number of Sales',
      String(filteredSales.length),
    ])

    rows.push([
      'Items Sold',
      String(totalItemsSold),
    ])

    rows.push([
      'Average Sale',
      `${averageSale} RWF`,
    ])

    rows.push([
      'Current Stock Units',
      String(stockUnits),
    ])

    rows.push([
      'Current Stock Value',
      `${stockValue} RWF`,
    ])

    rows.push([])

    rows.push([
      'Product Type Performance',
    ])

    rows.push([
      'Product',
      'Product Type / Kind',
      'Quantity Sold',
      'Revenue',
      'Cost',
      'Profit',
    ])

    for (const row of productTypeReports) {
      rows.push([
        row.productName,
        row.productTypeName,
        String(row.quantitySold),
        `${row.revenue} RWF`,
        `${row.cost} RWF`,
        `${row.profit} RWF`,
      ])
    }

    rows.push([])

    rows.push([
      'Sales',
    ])

    rows.push([
      'Date',
      'Sale ID',
      'Revenue',
      'Cost',
      'Profit',
      'Paid',
      'Due',
      'Status',
    ])

    for (const sale of filteredSales) {
      rows.push([
        formatDateTime(
          sale.sale_date,
        ),
        sale.id,
        String(
          Number(
            sale.total_revenue,
          ) || 0,
        ),
        String(
          Number(
            sale.total_cost,
          ) || 0,
        ),
        String(
          Number(
            sale.total_profit,
          ) || 0,
        ),
        String(
          Number(
            sale.amount_paid,
          ) || 0,
        ),
        String(
          Number(
            sale.amount_due,
          ) || 0,
        ),
        sale.payment_status,
      ])
    }

    rows.push([])

    rows.push([
      'Payment History',
    ])

    rows.push([
      'Date',
      'Payment ID',
      'Sale ID',
      'Amount',
      'Notes',
    ])

    for (const payment of filteredPayments) {
      rows.push([
        formatDateTime(
          payment.payment_date,
        ),
        payment.id,
        payment.sale_id,
        String(
          Number(payment.amount) || 0,
        ),
        payment.notes || '',
      ])
    }

    const csv = rows
      .map((row) =>
        row
          .map(escapeCsv)
          .join(','),
      )
      .join('\n')

    const blob = new Blob(
      [csv],
      {
        type: 'text/csv;charset=utf-8;',
      },
    )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement('a')

    link.href = url

    link.download =
      `kitchenware-report-${startDate}-to-${endDate}.csv`

    document.body.appendChild(link)

    link.click()

    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  const periodLabel =
    getReportPeriodLabel(
      startDate,
      endDate,
    )

  return (
    <>
      <main className="space-y-6 pb-8 print:space-y-4">
        {/* Hero Header */}
        <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-xl dark:border-gray-800 sm:p-8 print:hidden">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100 backdrop-blur">
                <span>📊</span>
                Business Intelligence
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Reports
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Understand today&apos;s sales,
                profit, payments, debts, and
                inventory at a glance.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  📅 {periodLabel}
                </span>

                <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  ● Live Data
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                🖨️ Print
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400"
              >
                📥 Export CSV
              </button>
            </div>
          </div>
        </section>

        {/* Print Header */}
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold">
            Kitchenware Management Report
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Period: {startDate} to {endDate}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Generated:{' '}
            {new Date().toLocaleString()}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 print:hidden">
            <span className="text-lg">
              ⚠️
            </span>

            <div>
              <p className="font-semibold">
                Report could not be loaded
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Date Controls */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 print:hidden">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-lg dark:bg-indigo-500/10">
                  📅
                </span>

                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">
                    Report Period
                  </h2>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Choose the period you want to analyse.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <QuickDateButton
                  label="Today"
                  active={
                    startDate === getToday() &&
                    endDate === getToday()
                  }
                  onClick={setToday}
                />

                <QuickDateButton
                  label="Yesterday"
                  active={
                    startDate ===
                      getYesterday() &&
                    endDate === getYesterday()
                  }
                  onClick={setYesterday}
                />

                <QuickDateButton
                  label="This Week"
                  active={
                    startDate ===
                      getWeekStart() &&
                    endDate === getToday()
                  }
                  onClick={setThisWeek}
                />
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-2xl xl:grid-cols-3">
              <DateInput
                label="Start Date"
                value={startDate}
                max={endDate}
                onChange={setStartDate}
              />

              <DateInput
                label="End Date"
                value={endDate}
                min={startDate}
                onChange={setEndDate}
              />

              <button
                type="button"
                onClick={loadData}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 sm:col-span-2 xl:col-span-1"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-indigo-900 dark:border-t-indigo-400" />
              </div>

              <p className="mt-4 font-semibold text-gray-900 dark:text-white">
                Building your report...
              </p>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Loading sales, payments, and inventory.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Main KPIs */}
            <section>
              <SectionHeading
                icon="💰"
                title="Financial Overview"
                description={`Performance for ${periodLabel.toLowerCase()}.`}
              />

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ReportCard
                  icon="💵"
                  label="Total Revenue"
                  value={`${formatMoney(totalRevenue)} RWF`}
                  accent="indigo"
                />

                <ReportCard
                  icon="📦"
                  label="Total Cost"
                  value={`${formatMoney(totalCost)} RWF`}
                  accent="slate"
                />

                <ReportCard
                  icon="📈"
                  label="Total Profit"
                  value={`${formatMoney(totalProfit)} RWF`}
                  valueClass="text-emerald-600 dark:text-emerald-400"
                  accent="emerald"
                  footer={`${profitMargin.toFixed(1)}% profit margin`}
                />

                <ReportCard
                  icon="⚠️"
                  label="Outstanding Debt"
                  value={`${formatMoney(outstandingDebt)} RWF`}
                  valueClass="text-amber-600 dark:text-amber-400"
                  accent="amber"
                />
              </div>
            </section>

            {/* Activity KPIs */}
            <section>
              <SectionHeading
                icon="⚡"
                title="Business Activity"
                description="Quick numbers for the selected period."
              />

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ReportCard
                  icon="🧾"
                  label="Sales"
                  value={String(
                    filteredSales.length,
                  )}
                  accent="blue"
                />

                <ReportCard
                  icon="🛒"
                  label="Items Sold"
                  value={String(
                    totalItemsSold,
                  )}
                  accent="violet"
                />

                <ReportCard
                  icon="💳"
                  label="Payments Received"
                  value={`${formatMoney(totalPaid)} RWF`}
                  valueClass="text-indigo-600 dark:text-indigo-400"
                  accent="indigo"
                />

                <ReportCard
                  icon="🎯"
                  label="Average Sale"
                  value={`${formatMoney(averageSale)} RWF`}
                  accent="cyan"
                />
              </div>
            </section>

            {/* Stock */}
            <section>
              <SectionHeading
                icon="📦"
                title="Current Stock"
                description="Current inventory based on remaining quantities and exact batch supply costs."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <ReportCard
                  icon="🔢"
                  label="Units In Stock"
                  value={String(stockUnits)}
                  accent="blue"
                />

                <ReportCard
                  icon="💎"
                  label="Current Stock Value"
                  value={`${formatMoney(stockValue)} RWF`}
                  accent="violet"
                />
              </div>
            </section>

            {/* Payment Status */}
            <section>
              <SectionHeading
                icon="💳"
                title="Payment Status"
                description="How sales in this period were paid."
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <StatusCard
                  icon="✅"
                  label="Paid Sales"
                  value={
                    paymentStatusSummary.paid
                  }
                  className="text-emerald-600 dark:text-emerald-400"
                  iconClass="bg-emerald-50 dark:bg-emerald-500/10"
                />

                <StatusCard
                  icon="🟡"
                  label="Partial Sales"
                  value={
                    paymentStatusSummary.partial
                  }
                  className="text-amber-600 dark:text-amber-400"
                  iconClass="bg-amber-50 dark:bg-amber-500/10"
                />

                <StatusCard
                  icon="🔴"
                  label="Unpaid Sales"
                  value={
                    paymentStatusSummary.unpaid
                  }
                  className="text-red-600 dark:text-red-400"
                  iconClass="bg-red-50 dark:bg-red-500/10"
                />
              </div>
            </section>

            {/* Product Performance */}
            <section>
              <SectionHeading
                icon="🏆"
                title="Product Type / Kind Performance"
                description="The strongest product types and kinds during the selected period."
              />

              <ReportTable>
                {productTypeReports.length ===
                0 ? (
                  <EmptyState
                    icon="📊"
                    title="No product sales yet"
                    description="There are no product type sales for this period."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[950px] w-full text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800/60">
                        <tr>
                          <TableHeader>
                            Product
                          </TableHeader>

                          <TableHeader>
                            Product Type / Kind
                          </TableHeader>

                          <TableHeader>
                            Quantity Sold
                          </TableHeader>

                          <TableHeader>
                            Revenue
                          </TableHeader>

                          <TableHeader>
                            Cost
                          </TableHeader>

                          <TableHeader>
                            Profit
                          </TableHeader>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {productTypeReports.map(
                          (row, index) => (
                            <tr
                              key={
                                row.productTypeId
                              }
                              className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm dark:bg-indigo-500/10">
                                    {index ===
                                    0
                                      ? '🏆'
                                      : '📦'}
                                  </span>

                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {
                                      row.productName
                                    }
                                  </span>
                                </div>
                              </td>

                              <td className="px-5 py-4 font-medium text-gray-700 dark:text-gray-300">
                                {
                                  row.productTypeName
                                }
                              </td>

                              <td className="px-5 py-4 font-semibold">
                                {
                                  row.quantitySold
                                }
                              </td>

                              <td className="px-5 py-4">
                                {formatMoney(
                                  row.revenue,
                                )}{' '}
                                RWF
                              </td>

                              <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                                {formatMoney(
                                  row.cost,
                                )}{' '}
                                RWF
                              </td>

                              <td className="px-5 py-4">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatMoney(
                                    row.profit,
                                  )}{' '}
                                  RWF
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </ReportTable>
            </section>

            {/* Sales Report */}
            <section>
              <SectionHeading
                icon="🧾"
                title="Sales Report"
                description={`${filteredSales.length} sale${filteredSales.length === 1 ? '' : 's'} recorded in this period.`}
              />

              <ReportTable>
                {filteredSales.length ===
                0 ? (
                  <EmptyState
                    icon="🧾"
                    title="No sales found"
                    description="No sales were recorded for the selected period."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[1050px] w-full text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800/60">
                        <tr>
                          <TableHeader>
                            Date
                          </TableHeader>

                          <TableHeader>
                            Revenue
                          </TableHeader>

                          <TableHeader>
                            Cost
                          </TableHeader>

                          <TableHeader>
                            Profit
                          </TableHeader>

                          <TableHeader>
                            Paid
                          </TableHeader>

                          <TableHeader>
                            Due
                          </TableHeader>

                          <TableHeader>
                            Status
                          </TableHeader>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {filteredSales.map(
                          (sale) => (
                            <tr
                              key={sale.id}
                              className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                            >
                              <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                                {formatDateTime(
                                  sale.sale_date,
                                )}
                              </td>

                              <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                                {formatMoney(
                                  Number(
                                    sale.total_revenue,
                                  ) || 0,
                                )}{' '}
                                RWF
                              </td>

                              <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                                {formatMoney(
                                  Number(
                                    sale.total_cost,
                                  ) || 0,
                                )}{' '}
                                RWF
                              </td>

                              <td className="px-5 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                                {formatMoney(
                                  Number(
                                    sale.total_profit,
                                  ) || 0,
                                )}{' '}
                                RWF
                              </td>

                              <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                                {formatMoney(
                                  Number(
                                    sale.amount_paid,
                                  ) || 0,
                                )}{' '}
                                RWF
                              </td>

                              <td className="px-5 py-4 font-bold text-amber-600 dark:text-amber-400">
                                {formatMoney(
                                  Number(
                                    sale.amount_due,
                                  ) || 0,
                                )}{' '}
                                RWF
                              </td>

                              <td className="px-5 py-4">
                                <PaymentStatusBadge
                                  status={
                                    sale.payment_status
                                  }
                                />
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </ReportTable>
            </section>

            {/* Payment Report */}
            <section>
              <SectionHeading
                icon="💳"
                title="Payment Report"
                description={`${filteredPayments.length} payment${filteredPayments.length === 1 ? '' : 's'} recorded in this period.`}
              />

              <ReportTable>
                {filteredPayments.length ===
                0 ? (
                  <EmptyState
                    icon="💳"
                    title="No payments found"
                    description="No payments were recorded for the selected period."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[800px] w-full text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800/60">
                        <tr>
                          <TableHeader>
                            Date
                          </TableHeader>

                          <TableHeader>
                            Amount
                          </TableHeader>

                          <TableHeader>
                            Sale
                          </TableHeader>

                          <TableHeader>
                            Notes
                          </TableHeader>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {filteredPayments.map(
                          (payment) => (
                            <tr
                              key={
                                payment.id
                              }
                              className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                            >
                              <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                                {formatDateTime(
                                  payment.payment_date,
                                )}
                              </td>

                              <td className="px-5 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                                {formatMoney(
                                  Number(
                                    payment.amount,
                                  ) || 0,
                                )}{' '}
                                RWF
                              </td>

                              <td className="px-5 py-4">
                                <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                  {payment.sale_id.slice(
                                    0,
                                    8,
                                  )}
                                  ...
                                </span>
                              </td>

                              <td className="max-w-[300px] truncate px-5 py-4 text-gray-600 dark:text-gray-400">
                                {payment.notes ||
                                  '—'}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </ReportTable>
            </section>
          </>
        )}
      </main>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          nav,
          aside,
          header {
            display: none !important;
          }

          * {
            box-shadow: none !important;
          }

          main {
            width: 100% !important;
            max-width: none !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          section {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  )
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg dark:bg-indigo-500/10">
        {icon}
      </div>

      <div>
        <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h2>

        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
    </div>
  )
}

function ReportCard({
  icon,
  label,
  value,
  valueClass = 'text-gray-900 dark:text-white',
  accent = 'indigo',
  footer,
}: {
  icon: string
  label: string
  value: string
  valueClass?: string
  accent?:
    | 'indigo'
    | 'slate'
    | 'emerald'
    | 'amber'
    | 'blue'
    | 'violet'
    | 'cyan'
  footer?: string
}) {
  const accentClasses = {
    indigo:
      'bg-indigo-50 dark:bg-indigo-500/10',
    slate:
      'bg-slate-100 dark:bg-slate-800',
    emerald:
      'bg-emerald-50 dark:bg-emerald-500/10',
    amber:
      'bg-amber-50 dark:bg-amber-500/10',
    blue:
      'bg-blue-50 dark:bg-blue-500/10',
    violet:
      'bg-violet-50 dark:bg-violet-500/10',
    cyan:
      'bg-cyan-50 dark:bg-cyan-500/10',
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>

          <p
            className={`mt-2 break-words text-2xl font-black tracking-tight ${valueClass}`}
          >
            {value}
          </p>

          {footer && (
            <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              {footer}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl transition group-hover:scale-105 ${accentClasses[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusCard({
  icon,
  label,
  value,
  className,
  iconClass,
}: {
  icon: string
  label: string
  value: number
  className: string
  iconClass: string
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </p>

        <p
          className={`mt-1 text-3xl font-black ${className}`}
        >
          {value}
        </p>
      </div>

      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${iconClass}`}
      >
        {icon}
      </div>
    </div>
  )
}

function QuickDateButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
        active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  )
}

function DateInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: string
  min?: string
  max?: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </label>

      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="min-h-[46px] w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
      />
    </div>
  )
}

function ReportTable({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {children}
    </div>
  )
}

function TableHeader({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {children}
    </th>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-2xl dark:bg-gray-800">
        {icon}
      </div>

      <h3 className="mt-4 font-bold text-gray-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  )
}

function PaymentStatusBadge({
  status,
}: {
  status: string
}) {
  const normalized =
    status.toLowerCase()

  if (normalized === 'paid') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <span>✓</span>
        Paid
      </span>
    )
  }

  if (normalized === 'partial') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        <span>◐</span>
        Partial
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold capitalize text-red-700 dark:bg-red-500/10 dark:text-red-400">
      <span>!</span>
      {status.replace(/_/g, ' ')}
    </span>
  )
}