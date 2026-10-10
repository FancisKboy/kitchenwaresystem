'use client'

import {
  Children,
  cloneElement,
  isValidElement,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'

import type { ReactElement, ReactNode } from 'react'

import { useAppPreferences } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/modal'

type Customer = {
  id: string
  name: string
  phone: string | null
  active: boolean
}

type Sale = {
  id: string
  customer_id: string | null
  sale_date: string
  total_revenue: number
  amount_paid: number
  amount_due: number
  payment_status: string
  notes: string | null
}

type Payment = {
  id: string
  sale_id: string
  customer_id: string | null
  amount: number
  payment_date: string
  notes: string | null
  received_by: string | null
  created_at: string
}

type DebtRow = {
  customer: Customer
  salesCount: number
  totalRevenue: number
  totalPaid: number
  totalDue: number
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

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function getPaymentStatusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

const DEBT_TRANSLATIONS: Record<string, string> = {
  'Customer Credit Control': 'Igenzura ry’imyenda y’abakiriya',
  Debts: 'Imyenda',
  'Track customer balances, record payments, and keep every payment history organized.':
    'Kurikirana imyenda y’abakiriya, wandike ubwishyu kandi ubike amateka yabwo.',
  Outstanding: 'Umwenda usigaye',
  'Something went wrong': 'Habaye ikibazo',
  Success: 'Byagenze neza',
  'Total Outstanding': 'Umwenda wose usigaye',
  'Money still owed': 'Amafaranga agomba kwishyurwa',
  'Customers With Debt': 'Abakiriya bafite umwenda',
  'Customers with balance': 'Abakiriya basigaranye umwenda',
  'Total Paid': 'Amafaranga yose yishyuwe',
  'Collected payments': 'Amafaranga yakiriwe',
  'Total Sales Value': 'Agaciro k’ibyagurishijwe',
  'Sales across customers': 'Ibyagurishijwe ku bakiriya bose',
  'Find Customers': 'Shaka abakiriya',
  'Search by customer name or phone number.':
    'Shakisha ukoresheje izina cyangwa nimero ya telefoni.',
  'Search customers': 'Shakisha abakiriya',
  'Customer status': 'Imiterere y’umukiriya',
  'Fully Paid': 'Abamaze kwishyura yose',
  'Customer Debt': 'Imyenda y’abakiriya',
  'customer shown': 'umukiriya agaragajwe',
  'customers shown': 'abakiriya bagaragajwe',
  'Outstanding accounts': 'Abafite imyenda',
  'Loading debt information...': 'Turimo gupakira amakuru y’imyenda...',
  'There are no customers matching the current search and filter.':
    'Nta bakiriya bahuye n’ishakisha n’icyiciro wahisemo.',
  'Reset Filters': 'Siba ibyo wahisemo',
  Customer: 'Umukiriya',
  'No phone number': 'Nta nimero ya telefoni',
  Sales: 'Ibyagurishijwe',
  Paid: 'Yishyuwe',
  Actions: 'Ibikorwa',
  History: 'Amateka',
  'Record Payment': 'Andika ubwishyu',
  'Selected Sale': 'Igicuruzwa cyagurishijwe cyatoranyijwe',
  'Sale Date': 'Itariki yo kugurisha',
  'Sale Total': 'Igiteranyo cy’igicuruzwa',
  'Payment Details': 'Ibisobanuro by’ubwishyu',
  'Enter the amount received and payment information.':
    'Andika amafaranga yakiriwe n’ibisobanuro by’ubwishyu.',
  'Payment Amount': 'Amafaranga yishyuwe',
  'Maximum:': 'Ntarenze:',
  'Enter payment amount': 'Andika amafaranga yishyuwe',
  'Enter an amount up to the current outstanding balance.':
    'Andika amafaranga atarenze umwenda usigaye.',
  'Payment Date': 'Itariki y’ubwishyu',
  'Date & time': 'Itariki n’isaha',
  Notes: 'Ibisobanuro',
  '(optional)': '(si ngombwa)',
  'Extra information': 'Andi makuru',
  'Add an optional note about this payment...':
    'Ongeraho ibisobanuro ku bwishyu...',
  'For example: cash received, bank transfer, or payment reference.':
    'Urugero: amafaranga yakiriwe mu ntoki cyangwa kuri banki.',
  'Payment to Record': 'Amafaranga agiye kwandikwa',
  'Saving...': 'Turabika...',
  Cancel: 'Hagarika',
  'Payment History': 'Amateka y’ubwishyu',
  Close: 'Funga',
  'Total Sales': 'Igiteranyo cy’ibyagurishijwe',
  Payments: 'Ubwishyu',
  'Sales & Outstanding Balances': 'Ibyagurishijwe n’imyenda isigaye',
  'Every sale linked to this customer.':
    'Ibyagurishijwe byose bijyanye n’uyu mukiriya.',
  'No sales found for this customer.':
    'Nta byagurishijwe byabonetse kuri uyu mukiriya.',
  Date: 'Itariki',
  Due: 'Umwenda usigaye',
  Status: 'Imiterere',
  'Recorded payments and corrections.':
    'Ubwishyu bwanditswe n’ibyakosowe.',
  'No payments recorded for this customer.':
    'Nta bwishyu burandikwa kuri uyu mukiriya.',
  Type: 'Ubwoko',
  Payment: 'Ubwishyu',
  'Initial Payment': 'Ubwishyu bwa mbere',
  'Final Payment': 'Ubwishyu bwa nyuma',
  'Installment Payment': 'Ubwishyu bw’igice',
  Correct: 'Kosora',
  'Correct Payment': 'Kosora ubwishyu',
  'Correct the amount, date, or notes for this payment.':
    'Kosora amafaranga, itariki cyangwa ibisobanuro by’ubu bwishyu.',
  'Save Correction': 'Bika ibyahinduwe',
  'Original Amount': 'Amafaranga yari yanditswe',
  'Corrected Amount': 'Amafaranga yakosowe',
  'Payment notes...': 'Ibisobanuro ku bwishyu...',
  'Payment amount must be greater than zero.':
    'Amafaranga yishyuwe agomba kuba arenze zeru.',
  'Corrected amount must be greater than zero.':
    'Amafaranga yakosowe agomba kuba arenze zeru.',
  'Payment recorded successfully.': 'Ubwishyu bwanditswe neza.',
  'Payment corrected successfully.': 'Ubwishyu bwakosowe neza.',
  'Failed to record payment.': 'Kwandika ubwishyu byanze.',
  'Failed to correct payment.': 'Gukosora ubwishyu byanze.',
  'Failed to load debt information.': 'Gupakira amakuru y’imyenda byanze.',
  'This sale has no outstanding balance.':
    'Iki gicuruzwa ntigisigaranye umwenda.',
  'Use full balance': 'Koresha umwenda wose usigaye',
  'Remaining after payment': 'Umwenda uzasigara',
  'Payment cannot exceed the outstanding debt of':
    'Amafaranga yishyurwa ntashobora kurenga umwenda usigaye wa',
  'No matching debt accounts': 'Nta myenda ihuye n’ishakisha',
  'Search name or phone...': 'Shakisha izina cyangwa telefoni...',
  'All Customers': 'Abakiriya bose',
  'Paid accounts': 'Abamaze kwishyura',
  'All accounts': 'Konti zose',
  // Added so every visible Debts-page text has a translation
  'Please select a sale before recording a payment.':
    'Hitamo igicuruzwa mbere yo kwandika ubwishyu.',
  'Please enter a valid payment date and time.':
    'Andika itariki n’isaha y’ubwishyu byemewe.',
  'Record a customer payment.': 'Andika ubwishyu bw’umukiriya.',
  'Enter the amount received from the customer.':
    'Andika amafaranga yakiriwe ku mukiriya.',
  'Date and time the money was received.':
    'Itariki n’isaha amafaranga yakiriweho.',
  'Optional details about this payment.':
    'Andi makuru atari ngombwa kuri ubu bwishyu.',
  'For example: cash received or bank transfer...':
    'Urugero: amafaranga yakiriwe mu ntoki cyangwa yoherejwe kuri banki...',
  Action: 'Igikorwa',
  Amount: 'Amafaranga',
  paid: 'Yishyuwe',
  partial: 'Yishyuwe igice',
  unpaid: 'Ntiyishyuwe',
  'Review the original payment and carefully update its details.':
    'Suzuma ubwishyu bwanditswe hanyuma uvugurure ibisobanuro byabwo witonze.',
  'Original Payment': 'Ubwishyu bwari bwanditswe',
  'Recorded on': 'Bwanditswe ku wa',
  'Only correct this payment if the recorded amount, date, or notes are inaccurate. The original amount above is provided for comparison.':
    'Kosora ubu bwishyu gusa niba amafaranga, itariki cyangwa ibisobanuro byanditswe atari ukuri. Amafaranga yari yanditswe agaragara hejuru kugira ngo ugereranye.',
  'Enter corrected amount': 'Andika amafaranga yakosowe',
  'Difference from original': 'Itandukaniro n’ayari yanditswe',
  'Payment Date & Time': 'Itariki n’isaha y’ubwishyu',
  'Correct when the payment was received.':
    'Kosora igihe ubwishyu bwakiriwe.',
  'Payment Notes': 'Ibisobanuro ku bwishyu',
  'Add or correct the payment explanation.':
    'Ongeraho cyangwa ukosore ibisobanuro by’ubwishyu.',
  'For example: corrected cash amount or payment reference...':
    'Urugero: amafaranga yakosowe yo mu ntoki cyangwa nimero y’ubwishyu...',
}

function translateDebtText(value: string, isKinyarwanda: boolean) {
  if (!isKinyarwanda) return value

  const trimmed = value.trim()

  // Keep dynamic amounts while translating the message around them.
  const debtPrefix = 'Payment cannot exceed the outstanding debt of '

  if (trimmed.startsWith(debtPrefix)) {
    const amountAndCurrency = trimmed.slice(debtPrefix.length)

    return `Amafaranga yishyurwa ntashobora kurenga umwenda usigaye wa ${amountAndCurrency}`
  }

  if (trimmed.startsWith('Payment for ')) {
    return `Ubwishyu bwa ${trimmed.slice('Payment for '.length)}`
  }

  const historySuffix = "'s sales and payments"

  if (trimmed.endsWith(historySuffix)) {
    return `${trimmed.slice(0, -historySuffix.length)}: ibyagurishijwe n’ubwishyu`
  }

  if (Object.prototype.hasOwnProperty.call(DEBT_TRANSLATIONS, trimmed)) {
    return DEBT_TRANSLATIONS[trimmed]
  }

  return value
}

function translateDebtNode(
  node: ReactNode,
  isKinyarwanda: boolean,
): ReactNode {
  if (!isKinyarwanda) return node

  if (typeof node === 'string') {
    const leading = node.match(/^\s*/)?.[0] ?? ''
    const trailing = node.match(/\s*$/)?.[0] ?? ''
    const content = node.slice(
      leading.length,
      node.length - trailing.length,
    )

    if (!content) return node

    return `${leading}${translateDebtText(content, true)}${trailing}`
  }

  if (Array.isArray(node)) {
    // Children.map keeps each element's own key and does not add wrapper
    // elements, so tables, flex rows and lists keep their exact structure.
    return Children.map(node, (item) => translateDebtNode(item, true))
  }

  if (isValidElement(node)) {
    const props = node.props as Record<string, unknown>
    const nextProps: Record<string, unknown> = { ...props }

    const textProps = [
      'title',
      'description',
      'label',
      'subtitle',
      'placeholder',
      'text',
      'hint',
      'aria-label',
    ]

    for (const key of textProps) {
      const value = nextProps[key]

      if (typeof value === 'string') {
        nextProps[key] = translateDebtText(value, true)
      }
    }

    if (props.children !== undefined) {
      nextProps.children = translateDebtNode(
        props.children as ReactNode,
        true,
      )
    }

    if (props.footer !== undefined) {
      nextProps.footer = translateDebtNode(
        props.footer as ReactNode,
        true,
      )
    }

    return cloneElement(
      node as ReactElement<Record<string, unknown>>,
      nextProps,
    )
  }

  return node
}

function DebtTranslation({ children }: { children: ReactNode }) {
  const { t } = useAppPreferences()

  const isKinyarwanda =
    t('inventory').trim().toLowerCase() !== 'inventory'

  return <>{translateDebtNode(children, isKinyarwanda)}</>
}

export default function DebtsPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'debt' | 'paid'
  >('debt')

  const [recordOpen, setRecordOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [correctOpen, setCorrectOpen] = useState(false)

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null)

  const [selectedSale, setSelectedSale] =
    useState<Sale | null>(null)

  const [selectedPayment, setSelectedPayment] =
    useState<Payment | null>(null)

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const [correctedAmount, setCorrectedAmount] =
    useState('')
  const [correctedDate, setCorrectedDate] = useState('')
  const [correctedNotes, setCorrectedNotes] =
    useState('')

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const [
        customersResult,
        salesResult,
        paymentsResult,
      ] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, phone, active')
          .order('name'),

        supabase
          .from('sales')
          .select(
            'id, customer_id, sale_date, total_revenue, amount_paid, amount_due, payment_status, notes',
          )
          .order('sale_date', {
            ascending: false,
          }),

        supabase
          .from('payments')
          .select(
            'id, sale_id, customer_id, amount, payment_date, notes, received_by, created_at',
          )
          .order('payment_date', {
            ascending: false,
          }),
      ])

      if (customersResult.error) {
        throw customersResult.error
      }

      if (salesResult.error) {
        throw salesResult.error
      }

      if (paymentsResult.error) {
        throw paymentsResult.error
      }

      setCustomers(
        (customersResult.data || []) as Customer[],
      )

      setSales(
        (salesResult.data || []) as Sale[],
      )

      setPayments(
        (paymentsResult.data || []) as Payment[],
      )
    } catch (err) {
      console.error('Debts load error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load debt information.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    setPaymentDate(
      new Date().toISOString().slice(0, 16),
    )
  }, [])

  const debtRows = useMemo<DebtRow[]>(() => {
    return customers.map((customer) => {
      const customerSales = sales.filter(
        (sale) =>
          sale.customer_id === customer.id,
      )

      const totalRevenue =
        customerSales.reduce(
          (sum, sale) =>
            sum +
            (Number(sale.total_revenue) || 0),
          0,
        )

      const totalPaid =
        customerSales.reduce(
          (sum, sale) =>
            sum +
            (Number(sale.amount_paid) || 0),
          0,
        )

      const totalDue =
        customerSales.reduce(
          (sum, sale) =>
            sum +
            Math.max(
              Number(sale.amount_due) || 0,
              0,
            ),
          0,
        )

      return {
        customer,
        salesCount: customerSales.length,
        totalRevenue,
        totalPaid,
        totalDue,
      }
    })
  }, [customers, sales])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return debtRows.filter((row) => {
      const matchesSearch =
        !query ||
        row.customer.name
          .toLowerCase()
          .includes(query) ||
        row.customer.phone
          ?.toLowerCase()
          .includes(query)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'debt' &&
          row.totalDue > 0) ||
        (statusFilter === 'paid' &&
          row.totalDue <= 0)

      return matchesSearch && matchesStatus
    })
  }, [
    debtRows,
    search,
    statusFilter,
  ])

  const customersWithDebt =
    debtRows.filter(
      (row) => row.totalDue > 0,
    ).length

  const totalDebt = debtRows.reduce(
    (sum, row) => sum + row.totalDue,
    0,
  )

  const totalPaid = debtRows.reduce(
    (sum, row) => sum + row.totalPaid,
    0,
  )

  const totalSalesValue = debtRows.reduce(
    (sum, row) =>
      sum + row.totalRevenue,
    0,
  )

  const customerSales = selectedCustomer
    ? sales.filter(
        (sale) =>
          sale.customer_id ===
          selectedCustomer.id,
      )
    : []

  const customerDebtSales =
    customerSales.filter(
      (sale) =>
        Number(sale.amount_due) > 0,
    )

  const selectedCustomerDebt =
    customerDebtSales.reduce(
      (sum, sale) =>
        sum +
        (Number(sale.amount_due) || 0),
      0,
    )


    function openRecordPayment(
      customer: Customer,
      sale: Sale,
    ) {
      // Close the history popup before opening the payment form.
      setHistoryOpen(false)
    
      setSelectedCustomer(customer)
      setSelectedSale(sale)
    
      setPaymentAmount(
        Number(sale.amount_due) > 0
          ? String(sale.amount_due)
          : '',
      )
    
      setPaymentDate(
        new Date().toISOString().slice(0, 16),
      )
    
      setPaymentNotes('')
      setError('')
      setSuccess('')
      setRecordOpen(true)
    }
    

  function closeRecordPayment() {
    if (saving) return

    setRecordOpen(false)
    setSelectedSale(null)
    setSelectedCustomer(null)
    setPaymentAmount('')
    setPaymentNotes('')
  }

  function openHistory(customer: Customer) {
    setSelectedCustomer(customer)
    setError('')
    setHistoryOpen(true)
  }

  function closeHistory() {
    setHistoryOpen(false)
    setSelectedCustomer(null)
  }

  function openCorrectPayment(
    payment: Payment,
  ) {
    setSelectedPayment(payment)

    setCorrectedAmount(
      String(payment.amount),
    )

    setCorrectedDate(
      new Date(payment.payment_date)
        .toISOString()
        .slice(0, 16),
    )

    setCorrectedNotes(
      payment.notes || '',
    )

    setError('')
    setSuccess('')
    setCorrectOpen(true)
  }

  function closeCorrectPayment() {
    if (saving) return

    setCorrectOpen(false)
    setSelectedPayment(null)
    setCorrectedAmount('')
    setCorrectedDate('')
    setCorrectedNotes('')
  }

  async function handleRecordPayment(event: FormEvent) {
    event.preventDefault()
  
    if (!selectedSale) {
      setError('Please select a sale before recording a payment.')
      return
    }
  
    const amount = Number(paymentAmount)
    const outstanding = Number(selectedSale.amount_due)
  
    if (!Number.isFinite(outstanding) || outstanding <= 0) {
      setError('This sale has no outstanding balance.')
      return
    }
  
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Payment amount must be greater than zero.')
      return
    }
  
    if (amount > outstanding + 0.000001) {
      setError(
        `Payment cannot exceed the outstanding debt of ${formatMoney(
          outstanding,
        )} RWF.`,
      )
      return
    }
  
    const dateToSave = paymentDate
      ? new Date(paymentDate)
      : new Date()
  
    if (Number.isNaN(dateToSave.getTime())) {
      setError('Please enter a valid payment date and time.')
      return
    }
  
    try {
      setSaving(true)
      setError('')
      setSuccess('')
  
      const { error: rpcError } = await supabase.rpc(
        'record_sale_payment',
        {
          p_sale_id: selectedSale.id,
          p_amount: amount,
          p_payment_date: dateToSave.toISOString(),
          p_notes: paymentNotes.trim() || null,
        },
      )
  
      if (rpcError) {
        throw rpcError
      }
  
      setRecordOpen(false)
      setPaymentAmount('')
      setPaymentNotes('')
      setSelectedSale(null)
      setSelectedCustomer(null)
  
      await loadData()
  
      setSuccess('Payment recorded successfully.')
    } catch (err) {
      console.error('Record payment error:', err)
  
      const message =
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof err.message === 'string'
          ? err.message
          : 'Failed to record payment.'
  
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCorrectPayment(
    event: FormEvent,
  ) {
    event.preventDefault()

    if (!selectedPayment) return

    const amount = Number(correctedAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(
        'Corrected amount must be greater than zero.',
      )
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const { error: rpcError } =
        await supabase.rpc(
          'correct_sale_payment',
          {
            p_payment_id:
              selectedPayment.id,
            p_new_amount: amount,
            p_payment_date:
              correctedDate
                ? new Date(
                    correctedDate,
                  ).toISOString()
                : null,
            p_notes:
              correctedNotes.trim() || null,
          },
        )

      if (rpcError) {
        throw rpcError
      }

      await loadData()

      setSuccess(
        'Payment corrected successfully.',
      )

      setCorrectOpen(false)
      setSelectedPayment(null)
      setCorrectedAmount('')
      setCorrectedDate('')
      setCorrectedNotes('')
    } catch (err) {
      console.error(
        'Correct payment error:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to correct payment.',
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <DebtTranslation>
      <main className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-xl dark:border-gray-800 sm:p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 backdrop-blur">
              <Icon name="wallet" size={15} />
              Customer Credit Control
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Debts
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Track customer balances, record payments,
              and keep every payment history organized.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <Icon name="warning" size={21} />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                Outstanding
              </p>

              <p className="text-xl font-black text-white">
                {formatMoney(totalDebt)} RWF
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <div className="mt-0.5">
            <Icon name="warning" size={18} />
          </div>

          <div className="flex-1">
            <p className="font-semibold">
              Something went wrong
            </p>

            <p className="mt-0.5">
              {error}
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <div className="mt-0.5">
            <Icon name="check" size={18} />
          </div>

          <div>
            <p className="font-semibold">
              Success
            </p>

            <p className="mt-0.5">
              {success}
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Outstanding"
          value={`${formatMoney(totalDebt)} RWF`}
          icon="warning"
          accent="amber"
          subtitle="Money still owed"
        />

        <SummaryCard
          label="Customers With Debt"
          value={String(customersWithDebt)}
          icon="users"
          accent="indigo"
          subtitle="Customers with balance"
        />

        <SummaryCard
          label="Total Paid"
          value={`${formatMoney(totalPaid)} RWF`}
          icon="check"
          accent="emerald"
          subtitle="Collected payments"
        />

        <SummaryCard
          label="Total Sales Value"
          value={`${formatMoney(totalSalesValue)} RWF`}
          icon="money"
          accent="blue"
          subtitle="Sales across customers"
        />
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Find Customers
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Search by customer name or phone number.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Search customers
            </label>

            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icon name="search" size={17} />
              </div>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name or phone..."
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Customer status
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | 'all'
                    | 'debt'
                    | 'paid',
                )
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              <option value="debt">
                Customers With Debt
              </option>

              <option value="all">
                All Customers
              </option>

              <option value="paid">
                Fully Paid
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* Debt table */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                  <Icon name="users" size={18} />
                </div>

                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Customer Debt
                </h2>
              </div>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {filteredRows.length}{' '}
{filteredRows.length === 1
  ? 'customer shown'
  : 'customers shown'}
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              {statusFilter === 'debt'
                ? 'Outstanding accounts'
                : statusFilter === 'paid'
                  ? 'Paid accounts'
                  : 'All accounts'}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-indigo-900 dark:border-t-indigo-400" />
              </div>

              <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
                Loading debt information...
              </p>
            </div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center p-8">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                <Icon name="check" size={28} />
              </div>

              <h3 className="mt-5 text-lg font-bold text-gray-900 dark:text-white">
                No matching debt accounts
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                There are no customers matching the
                current search and filter.
              </p>

              {(search ||
                statusFilter !== 'debt') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('debt')
                  }}
                  className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">
                    Customer
                  </th>

                  <th className="px-5 py-3.5 font-semibold">
                    Sales
                  </th>

                  <th className="px-5 py-3.5 font-semibold">
                    Total Sales
                  </th>

                  <th className="px-5 py-3.5 font-semibold">
                    Paid
                  </th>

                  <th className="px-5 py-3.5 font-semibold">
                    Outstanding
                  </th>

                  <th className="px-5 py-3.5 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredRows.map((row) => (
                  <tr
                    key={row.customer.id}
                    className="group transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-black text-white shadow-sm">
                          {getInitials(
                            row.customer.name,
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {row.customer.name}
                          </p>

                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {row.customer.phone ||
                              'No phone number'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {row.salesCount}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-700 dark:text-gray-300">
                      {formatMoney(
                        row.totalRevenue,
                      )}{' '}
                      RWF
                    </td>

                    <td className="px-5 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(
                        row.totalPaid,
                      )}{' '}
                      RWF
                    </td>

                    <td className="px-5 py-4">
                      {row.totalDue > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          {formatMoney(
                            row.totalDue,
                          )}{' '}
                          RWF
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <Icon
                            name="check"
                            size={13}
                          />
                          Paid
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openHistory(
                              row.customer,
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                        >
                          <Icon
                            name="history"
                            size={14}
                          />
                          History
                        </button>

                        {row.totalDue > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const firstDebtSale =
                                sales.find(
                                  (sale) =>
                                    sale.customer_id ===
                                      row.customer.id &&
                                    Number(
                                      sale.amount_due,
                                    ) > 0,
                                )

                              if (
                                firstDebtSale
                              ) {
                                openRecordPayment(
                                  row.customer,
                                  firstDebtSale,
                                )
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow"
                          >
                            <Icon
                              name="plus"
                              size={14}
                            />
                            Record Payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

     {/* Record Payment Modal */}
<Modal
  open={recordOpen}
  onClose={closeRecordPayment}
  title="Record Payment"
  description={
    selectedCustomer
      ? `Payment for ${selectedCustomer.name}`
      : 'Record a customer payment.'
  }
  footer={
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <button
        type="button"
        onClick={closeRecordPayment}
        disabled={saving}
        className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        Cancel
      </button>

      <button
        type="submit"
        form="record-payment-form"
        disabled={
          saving ||
          !selectedSale ||
          Number(selectedSale.amount_due) <= 0
        }
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/15 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? (
          <>
            <Spinner />
            Saving...
          </>
        ) : (
          <>
            <Icon name="check" size={17} />
            Record Payment
          </>
        )}
      </button>
    </div>
  }
>
  {selectedSale && (
    <form
      id="record-payment-form"
      onSubmit={handleRecordPayment}
      className="space-y-5"
    >
      {/* Selected customer and balance */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-gray-900 dark:to-teal-950/20">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />

        <div className="relative flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <Icon name="wallet" size={23} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Selected Sale
            </p>

            <h3 className="mt-1 truncate text-lg font-black text-gray-950 dark:text-white">
              {selectedCustomer?.name}
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formatDate(selectedSale.sale_date)}
            </p>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/80 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-900/80">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Sale Total
            </p>

            <p className="mt-1 break-words text-base font-black text-gray-900 dark:text-white">
              {formatMoney(Number(selectedSale.total_revenue))} RWF
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Outstanding
            </p>

            <p className="mt-1 break-words text-base font-black text-amber-800 dark:text-amber-200">
              {formatMoney(Number(selectedSale.amount_due))} RWF
            </p>
          </div>
        </div>
      </section>

      {/* Payment amount */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white">
              Payment Amount
            </h3>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter the amount received from the customer.
            </p>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Icon name="money" size={20} />
          </div>
        </div>

        <div className="relative">
          <input
            id="payment-amount"
            type="number"
            min="0.01"
            max={Number(selectedSale.amount_due)}
            step="0.01"
            inputMode="decimal"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(event.target.value)}
            placeholder="Enter payment amount"
            required
            aria-label="Payment Amount"
            className="w-full rounded-2xl border border-gray-300 bg-gray-50 py-4 pl-4 pr-20 text-xl font-black text-gray-950 outline-none transition placeholder:text-sm placeholder:font-normal placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:bg-gray-950"
          />

          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
            RWF
          </span>
        </div>

        <button
          type="button"
          disabled={saving || Number(selectedSale.amount_due) <= 0}
          onClick={() =>
            setPaymentAmount(String(Number(selectedSale.amount_due)))
          }
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
        >
          <Icon name="check" size={14} />
          Use full balance
        </button>

        <div className="mt-4 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Payment to Record
            </span>

            <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
              {formatMoney(Number(paymentAmount) || 0)} RWF
            </span>
          </div>

          <div className="my-3 h-px bg-gray-200 dark:bg-gray-700" />

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Remaining after payment
            </span>

            <span className="text-sm font-black text-amber-700 dark:text-amber-300">
              {formatMoney(
                Math.max(
                  0,
                  Number(selectedSale.amount_due) -
                    (Number(paymentAmount) || 0),
                ),
              )}{' '}
              RWF
            </span>
          </div>
        </div>
      </section>

      {/* Payment date */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
            <Icon name="history" size={19} />
          </div>

          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white">
              Payment Date
            </h3>

            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Date and time the money was received.
            </p>
          </div>
        </div>

        <input
          type="datetime-local"
          value={paymentDate}
          onChange={(event) => setPaymentDate(event.target.value)}
          required
          aria-label="Payment Date"
          className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:bg-gray-950"
        />
      </section>

      {/* Optional notes */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <Icon name="info" size={19} />
          </div>

          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white">
              Notes
            </h3>

            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Optional details about this payment.
            </p>
          </div>
        </div>

        <textarea
          value={paymentNotes}
          onChange={(event) => setPaymentNotes(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="For example: cash received or bank transfer..."
          className="w-full resize-y rounded-xl border border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500 focus:bg-white focus:ring-4 focus:ring-gray-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:bg-gray-950"
        />

        <p className="mt-2 text-right text-xs text-gray-400">
          {paymentNotes.length}/1000
        </p>
      </section>
    </form>
  )}
</Modal>

      {/* Payment History Modal */}
      <Modal
        open={historyOpen}
        onClose={closeHistory}
        title="Payment History"
        description={
          selectedCustomer
            ? `${selectedCustomer.name}'s sales and payments`
            : undefined
        }
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={closeHistory}
              className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        }
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Customer hero */}
            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gradient-to-r from-indigo-50 to-white p-5 dark:border-gray-800 dark:from-indigo-950/40 dark:to-gray-900">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white shadow">
                {getInitials(
                  selectedCustomer.name,
                )}
              </div>

              <div className="min-w-0">
                <p className="text-lg font-black text-gray-900 dark:text-white">
                  {selectedCustomer.name}
                </p>

                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {selectedCustomer.phone ||
                    'No phone number'}
                </p>
              </div>
            </div>

            {/* Customer summary */}
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniSummary
                label="Total Sales"
                value={String(
                  customerSales.length,
                )}
                icon="sales"
              />

              <MiniSummary
                label="Outstanding"
                value={`${formatMoney(
                  selectedCustomerDebt,
                )} RWF`}
                icon="warning"
                valueClass="text-amber-600 dark:text-amber-400"
              />

              <MiniSummary
                label="Payments"
                value={String(
                  payments.filter(
                    (payment) =>
                      payment.customer_id ===
                      selectedCustomer.id,
                  ).length,
                )}
                icon="money"
              />
            </div>

            {/* Sales / debt history */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Sales & Outstanding Balances
                  </h3>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Every sale linked to this customer.
                  </p>
                </div>
              </div>

              {customerSales.length ===
              0 ? (
                <EmptySection text="No sales found for this customer." />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-[900px] w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3">
                          Date
                        </th>

                        <th className="px-4 py-3">
                          Sale Total
                        </th>

                        <th className="px-4 py-3">
                          Paid
                        </th>

                        <th className="px-4 py-3">
                          Due
                        </th>

                        <th className="px-4 py-3">
                          Status
                        </th>

                        <th className="px-4 py-3 text-right">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {customerSales.map(
                        (sale) => (
                          <tr
                            key={sale.id}
                            className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                          >
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                              {formatDate(
                                sale.sale_date,
                              )}
                            </td>

                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                              {formatMoney(
                                Number(
                                  sale.total_revenue,
                                ),
                              )}{' '}
                              RWF
                            </td>

                            <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatMoney(
                                Number(
                                  sale.amount_paid,
                                ),
                              )}{' '}
                              RWF
                            </td>

                            <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">
                              {formatMoney(
                                Number(
                                  sale.amount_due,
                                ),
                              )}{' '}
                              RWF
                            </td>

                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold capitalize text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                {getPaymentStatusLabel(
                                  sale.payment_status,
                                )}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right">
                              {Number(
                                sale.amount_due,
                              ) > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openRecordPayment(
                                      selectedCustomer,
                                      sale,
                                    )
                                  }
                                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                                >
                                  Record Payment
                                </button>
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payment history */}
            <div>
              <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Payment History
                </h3>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Recorded payments and corrections.
                </p>
              </div>

              {payments.filter(
                (payment) =>
                  payment.customer_id ===
                  selectedCustomer.id,
              ).length === 0 ? (
                <EmptySection text="No payments recorded for this customer." />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-[850px] w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3">
                          Date
                        </th>

                        <th className="px-4 py-3">
                          Amount
                        </th>

                        <th className="px-4 py-3">
                          Type
                        </th>

                        <th className="px-4 py-3">
                          Notes
                        </th>

                        <th className="px-4 py-3 text-right">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {payments
                        .filter(
                          (payment) =>
                            payment.customer_id ===
                            selectedCustomer.id,
                        )
                        .sort(
                          (a, b) =>
                            new Date(
                              b.payment_date,
                            ).getTime() -
                            new Date(
                              a.payment_date,
                            ).getTime(),
                        )
                        .map((payment) => (
                          <tr
                            key={payment.id}
                            className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                          >
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                              {formatDateTime(
                                payment.payment_date,
                              )}
                            </td>

                            <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMoney(
                                Number(
                                  payment.amount,
                                ),
                              )}{' '}
                              RWF
                            </td>

                            <td className="px-4 py-3">
                              <PaymentTypeBadge
                                payment={
                                  payment
                                }
                                allPayments={
                                  payments.filter(
                                    (item) =>
                                      item.sale_id ===
                                      payment.sale_id,
                                  )
                                }
                                sale={
                                  sales.find(
                                    (sale) =>
                                      sale.id ===
                                      payment.sale_id,
                                  )
                                }
                              />
                            </td>

                            <td className="max-w-[220px] truncate px-4 py-3 text-gray-600 dark:text-gray-400">
                              {payment.notes ||
                                '—'}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  openCorrectPayment(
                                    payment,
                                  )
                                }
                                className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                              >
                                Correct
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

 
      {/* Correct Payment Modal */}
      <Modal
        open={correctOpen}
        onClose={closeCorrectPayment}
        title="Correct Payment"
        description="Review the original payment and carefully update its details."
        footer={
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeCorrectPayment}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="correct-payment-form"
              disabled={saving || !selectedPayment}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                <>
                  <Icon name="check" size={17} />
                  Save Correction
                </>
              )}
            </button>
          </div>
        }
      >
        {selectedPayment && (
          <form
            id="correct-payment-form"
            onSubmit={handleCorrectPayment}
            className="space-y-5"
          >
            {/* Original payment summary */}
            <section className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 dark:border-blue-900/50 dark:from-blue-950/40 dark:via-gray-900 dark:to-indigo-950/30">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                  <Icon name="edit" size={22} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Original Payment
                  </p>

                  <p className="mt-2 break-words text-2xl font-black tracking-tight text-gray-950 dark:text-white">
                    {formatMoney(Number(selectedPayment.amount))} RWF
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Recorded on {formatDateTime(selectedPayment.payment_date)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-blue-100 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-900/70">
                <p className="text-xs leading-5 text-gray-600 dark:text-gray-300">
                  Only correct this payment if the recorded amount,
                  date, or notes are inaccurate. The original amount
                  above is provided for comparison.
                </p>
              </div>
            </section>

            {/* Corrected amount */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
              <label
                htmlFor="corrected-payment-amount"
                className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-200"
              >
                Corrected Amount
              </label>

              <div className="relative">
                <input
                  id="corrected-payment-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={correctedAmount}
                  onChange={(event) =>
                    setCorrectedAmount(event.target.value)
                  }
                  required
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 pr-20 text-lg font-bold text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:bg-gray-950"
                  placeholder="Enter corrected amount"
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                  RWF
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-3 dark:bg-gray-800/60">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Difference from original
                </span>

                <span
                  className={`text-sm font-black ${
                    Number(correctedAmount) > Number(selectedPayment.amount)
                      ? 'text-blue-600 dark:text-blue-400'
                      : Number(correctedAmount) < Number(selectedPayment.amount)
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {Number(correctedAmount) > Number(selectedPayment.amount)
                    ? '+'
                    : Number(correctedAmount) < Number(selectedPayment.amount)
                      ? '−'
                      : ''}
                  {formatMoney(
                    Math.abs(
                      (Number(correctedAmount) || 0) -
                        Number(selectedPayment.amount),
                    ),
                  )}{' '}
                  RWF
                </span>
              </div>
            </section>

            {/* Corrected date */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                  <Icon name="history" size={19} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Payment Date & Time
                  </h3>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Correct when the payment was received.
                  </p>
                </div>
              </div>

              <input
                id="corrected-payment-date"
                type="datetime-local"
                value={correctedDate}
                onChange={(event) =>
                  setCorrectedDate(event.target.value)
                }
                required
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:bg-gray-950"
              />
            </section>

            {/* Corrected notes */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <Icon name="info" size={19} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Payment Notes
                  </h3>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Add or correct the payment explanation.
                  </p>
                </div>
              </div>

              <textarea
                value={correctedNotes}
                onChange={(event) =>
                  setCorrectedNotes(event.target.value)
                }
                rows={4}
                maxLength={1000}
                placeholder="For example: corrected cash amount or payment reference..."
                className="w-full resize-y rounded-xl border border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:bg-gray-950"
              />

              <p className="mt-2 text-right text-xs text-gray-400">
                {correctedNotes.length}/1000
              </p>
            </section>
          </form>
        )}
      </Modal>

      </main>
  </DebtTranslation>
)
}

/* -------------------------------------------------------------------------- */
/* UI Components                                                              */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  label,
  value,
  icon,
  accent,
  subtitle,
}: {
  label: string
  value: string
  icon: IconName
  accent: 'amber' | 'indigo' | 'emerald' | 'blue'
  subtitle: string
}) {
  const styles = {
    amber: {
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-900/40',
    },
    indigo: {
      icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-900/40',
    },
    emerald: {
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-900/40',
    },
    blue: {
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-900/40',
    },
  }

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-900 ${styles[accent].border}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles[accent].icon}`}
        >
          <Icon
            name={icon}
            size={21}
          />
        </div>
      </div>
    </div>
  )
}

function MiniSummary({
  label,
  value,
  icon,
  valueClass = 'text-gray-900 dark:text-white',
}: {
  label: string
  value: string
  icon: IconName
  valueClass?: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <Icon
          name={icon}
          size={15}
          className="text-gray-400"
        />

        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </p>
      </div>

      <p
        className={`mt-2 text-xl font-black ${valueClass}`}
      >
        {value}
      </p>
    </div>
  )
}

function InfoBox({
  label,
  value,
  valueClass = 'text-gray-900 dark:text-white',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-gray-900">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-bold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  )
}

function Field({
  label,
  hint,
  optional = false,
  children,
}: {
  label: string
  hint?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
          {optional && (
            <span className="ml-1 font-normal text-gray-400">
              (optional)
            </span>
          )}
        </label>

        {hint && (
          <span className="text-xs text-gray-400">
            {hint}
          </span>
        )}
      </div>

      {children}
    </div>
  )
}

function EmptySection({
  text,
}: {
  text: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 p-7 text-center dark:border-gray-700">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
        <Icon name="info" size={19} />
      </div>

      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {text}
      </p>
    </div>
  )
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  )
}

function PaymentTypeBadge(props: {
  payment: Payment
  allPayments: Payment[]
  sale?: Sale
}) {
  return (
    <DebtTranslation>
      {renderPaymentTypeBadge(props)}
    </DebtTranslation>
  )
}

function renderPaymentTypeBadge({
  payment,
  allPayments,
  sale,
}: {
  payment: Payment
  allPayments: Payment[]
  sale?: Sale
}) {
  if (
    payment.notes ===
    'Initial payment at sale creation'
  ) {
    return (
      <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
        Initial Payment
      </span>
    )
  }

  if (!sale) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        Payment
      </span>
    )
  }

  const sorted = [...allPayments].sort(
    (a, b) => {
      const dateDifference =
        new Date(
          a.payment_date,
        ).getTime() -
        new Date(
          b.payment_date,
        ).getTime()

      if (dateDifference !== 0) {
        return dateDifference
      }

      return (
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
      )
    },
  )

  let cumulative = 0

  for (const item of sorted) {
    cumulative +=
      Number(item.amount) || 0

    if (item.id === payment.id) {
      const saleTotal =
        Number(sale.total_revenue) || 0

      if (
        saleTotal > 0 &&
        cumulative >= saleTotal
      ) {
        return (
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            Final Payment
          </span>
        )
      }

      return (
        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          Installment Payment
        </span>
      )
    }
  }

  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      Payment
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

type IconName =
  | 'wallet'
  | 'warning'
  | 'users'
  | 'check'
  | 'money'
  | 'search'
  | 'history'
  | 'plus'
  | 'sales'
  | 'edit'
  | 'info'

function Icon({
  name,
  size = 18,
  className = '',
}: {
  name: IconName
  size?: number
  className?: string
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }

  switch (name) {
    case 'wallet':
      return (
        <svg {...common}>
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 16.5z" />
          <path d="M4 8h14.5A2.5 2.5 0 0 1 21 10.5V15h-5a2 2 0 0 1 0-4h5" />
          <path d="M16 13h.01" />
        </svg>
      )

    case 'warning':
      return (
        <svg {...common}>
          <path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      )

    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )

    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      )

    case 'money':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v9" />
          <path d="M15 9.5c-.6-.8-1.5-1.2-2.9-1.2-1.7 0-2.8.7-2.8 1.8 0 1.2 1.2 1.7 2.8 1.9 1.8.2 2.8.8 2.8 2 0 1.1-1.1 1.8-2.8 1.8-1.4 0-2.5-.5-3.1-1.4" />
        </svg>
      )

    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
      )

    case 'history':
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      )

    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      )

    case 'sales':
      return (
        <svg {...common}>
          <path d="M4 19V9" />
          <path d="M10 19V5" />
          <path d="M16 19v-7" />
          <path d="M22 19H2" />
        </svg>
      )

    case 'edit':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      )

    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
      )

    default:
      return null
  }
}
