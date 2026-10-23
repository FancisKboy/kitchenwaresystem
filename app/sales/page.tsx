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

const PRODUCT_IMAGE_BUCKET = 'product-images'

type Customer = {
  id: string
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  active: boolean
}

type Product = {
  id: string
  name: string
  status: 'active' | 'inactive'
}

type ProductType = {
  id: string
  product_id: string
  name: string
  description: string | null
  image_path: string | null
  minimum_stock: number
  status: 'active' | 'inactive'
}

type Sale = {
  id: string
  customer_id: string | null
  sale_date: string
  notes: string | null
  created_by: string
  total_revenue: number
  total_cost: number
  total_profit: number
  amount_paid: number
  amount_due: number
  payment_status: string
  created_at: string
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
  created_at: string
}

type Batch = {
  id: string
  purchase_item_id: string
  product_type_id: string
  batch_number: string
  received_at: string
  original_quantity: number
  remaining_quantity: number
  unit_cost: number
  attachment_path: string | null
  status: string
  created_at: string
}

type SaleBatchAllocation = {
  id: string
  sale_item_id: string
  batch_id: string
  quantity: number
  unit_cost: number
  total_cost: number | null
  created_at: string
}

type Payment = {
  id: string
  sale_id: string
  customer_id: string | null
  amount: number
  payment_date: string
  notes: string | null
  received_by: string
  created_at: string
}

type SaleDraftItem = {
  id: string
  product_id: string
  product_type_id: string
  productSearch: string
  typeSearch: string
  quantity: string
  selling_price: string
}

function getPublicImageUrl(imagePath: string | null) {
  if (!imagePath) return null

  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://')
  ) {
    return imagePath
  }

  return supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(imagePath).data.publicUrl
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString()} RWF`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

function makeDraftItem(): SaleDraftItem {
  return {
    id: crypto.randomUUID(),
    product_id: '',
    product_type_id: '',
    productSearch: '',
    typeSearch: '',
    quantity: '',
    selling_price: '',
  }
}

function getCurrentDateTimeLocal() {
  const date = new Date()

  const offset = date.getTimezoneOffset()
  const localDate = new Date(
    date.getTime() - offset * 60 * 1000,
  )

  return localDate.toISOString().slice(0, 16)
}

function getDateTimeLocalFromDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return getCurrentDateTimeLocal()
  }

  const offset = date.getTimezoneOffset()
  const localDate = new Date(
    date.getTime() - offset * 60 * 1000,
  )

  return localDate.toISOString().slice(0, 16)
}

const SALES_TRANSLATIONS: Record<string, string> = {
  'Customer name is required.': 'Izina ry’umukiriya rirakenewe.',
  'Customer created successfully.': 'Umukiriya yanditswe neza.',
  'Please select a customer.': 'Hitamo umukiriya.',
  'Please add at least one valid sale item.': 'Ongeraho nibura igicuruzwa kimwe cyemewe.',
  'Initial payment cannot be negative.': 'Ubwishyu bwa mbere ntibushobora kuba munsi ya zeru.',
  'Initial payment cannot exceed the sale total.': 'Ubwishyu bwa mbere ntibushobora kurenga igiteranyo cy’igurisha.',
  'No sale selected.': 'Nta gurisha ryatoranyijwe.',
  'Payment amount must be greater than zero.': 'Amafaranga yishyuwe agomba kuba arenze zeru.',
  'Payment was recorded, but the page could not refresh.': 'Ubwishyu bwanditswe, ariko paji ntiyashoboye kwivugurura.',
  'No payment selected.': 'Nta bwishyu bwatoranyijwe.',
  'Corrected payment amount must be greater than zero.': 'Amafaranga y’ubwishyu yakosowe agomba kuba arenze zeru.',
  'Payment date is required.': 'Itariki y’ubwishyu irakenewe.',
  'Payment was corrected, but the page could not refresh.': 'Ubwishyu bwakosowe, ariko paji ntiyashoboye kwivugurura.',
  'Unknown product': 'Igicuruzwa kitazwi',
  'Walk-in Customer': 'Umukiriya uje mu iduka',
  'Unknown customer': 'Umukiriya utazwi',
  'Unknown type': 'Ubwoko butazwi',
  'Unknown': 'Ntizwi',
  'Initial payment at sale creation': 'Ubwishyu bwa mbere igihe igurisha ryandikwaga',
  'Sales Management': 'Imicungire y’ibyagurishijwe',
  'Sales': 'Ibyagurishijwe',
  'Record sales, track exact FIFO costs, monitor profit, payments and customer balances.': 'Andika ibyagurishijwe, ukurikirane ibiciro nyakuri bya FIFO, inyungu, ubwishyu n’imyenda y’abakiriya.',
  'Create Sale': 'Andika igurisha',
  'Something went wrong': 'Habaye ikibazo',
  'Success': 'Byagenze neza',
  'Total Sales': 'Igiteranyo cy’ibyagurishijwe',
  'Recorded transactions': 'Ibikorwa byanditswe',
  'Total Revenue': 'Amafaranga yose yinjiye',
  'Customer sales value': 'Agaciro k’ibyagurishijwe ku bakiriya',
  'Total Profit': 'Inyungu yose',
  'Profit after FIFO cost': 'Inyungu nyuma y’igiciro cya FIFO',
  'Amount Due': 'Umwenda usigaye',
  'Outstanding customer balance': 'Umwenda usigaye ku bakiriya',
  'Sales History': 'Amateka y’ibyagurishijwe',
  'All recorded sales and payment status.': 'Ibyagurishijwe byose byanditswe n’imiterere y’ubwishyu.',
  'sale': 'ibyagurishijwe',
  's': '',
  'Loading sales...': 'Turimo gupakira ibyagurishijwe...',
  'No sales yet': 'Nta byagurishijwe biraba',
  'Create your first sale to start tracking revenue, cost, profit and payments.': 'Andika igurisha ryawe rya mbere kugira ngo utangire gukurikirana amafaranga yinjiye, ibiciro, inyungu n’ubwishyu.',
  'Create First Sale': 'Andika igurisha rya mbere',
  'Sale': 'Igurisha',
  'Customer': 'Umukiriya',
  'Sale Date': 'Itariki y’igurisha',
  'Revenue': 'Amafaranga yinjiye',
  'Cost': 'Igiciro',
  'Profit': 'Inyungu',
  'Paid': 'Yishyuwe',
  'Due': 'Umwenda usigaye',
  'Status': 'Imiterere',
  'Action': 'Igikorwa',
  'Payment': 'Ubwishyu',
  'Details': 'Ibisobanuro birambuye',
  'paid': 'Yishyuwe',
  'partial': 'Yishyuwe igice',
  'unpaid': 'Ntiyishyuwe',
  'Build the sale, choose the customer, and enter the selling prices.': 'Tegura igurisha, uhitemo umukiriya kandi wandike ibiciro byo kugurisha.',
  'Choose who is buying these items.': 'Hitamo ugura ibi bicuruzwa.',
  'Add Customer': 'Ongeraho umukiriya',
  'Select customer': 'Hitamo umukiriya',
  'No phone number': 'Nta nimero ya telefoni',
  'Sale Items': 'Ibicuruzwa byagurishijwe',
  'Search the product first, then choose its product type / kind.': 'Banza ushake igicuruzwa, hanyuma uhitemo ubwoko bwacyo.',
  'Add Item': 'Ongeraho igicuruzwa',
  'Sale Item': 'Igicuruzwa cyagurishijwe',
  'Product → Type / Kind → Price': 'Igicuruzwa → Ubwoko → Igiciro',
  'Remove': 'Kuraho',
  'Product': 'Igicuruzwa',
  'Search to display products': 'Shakisha kugira ngo ibicuruzwa bigaragare',
  'Type a product name to search...': 'Andika izina ry’igicuruzwa ushaka...',
  'Selected Product': 'Igicuruzwa cyatoranyijwe',
  'Change': 'Hindura',
  'No products match “': 'Nta bicuruzwa bihuye na “',
  'Product Type / Kind': 'Ubwoko bw’igicuruzwa',
  'Search to display types': 'Shakisha kugira ngo ubwoko bugaragare',
  'Type a product type / kind to search...': 'Andika ubwoko bw’igicuruzwa ushaka...',
  'Select a product first...': 'Banza uhitemo igicuruzwa...',
  'Selected Type / Kind': 'Ubwoko bwatoranyijwe',
  'Current stock:': 'Ibiri mu bubiko ubu:',
  'Stock:': 'Ibiri mu bubiko:',
  'No product types match “': 'Nta bwoko buhuye na “',
  'Quantity': 'Ingano',
  'Selling Price / Item': 'Igiciro cyo kugurisha / kimwe',
  'Item Revenue': 'Amafaranga y’igicuruzwa',
  'Initial Payment': 'Ubwishyu bwa mbere',
  'Pay the full sale now or record a partial payment.': 'Ishyura igurisha ryose ubu cyangwa wandike ubwishyu bw’igice.',
  'Notes': 'Ibisobanuro',
  '(optional)': '(si ngombwa)',
  'Optional sale notes...': 'Ibisobanuro ku igurisha (si ngombwa)...',
  'Sale Summary': 'Incamake y’igurisha',
  'Review before saving.': 'Suzuma mbere yo kubika.',
  'Payment Status': 'Imiterere y’ubwishyu',
  'Cancel': 'Hagarika',
  'Creating Sale...': 'Turimo kwandika igurisha...',
  'Create a customer without leaving the sales screen.': 'Ongeraho umukiriya utavuye kuri paji y’ibyagurishijwe.',
  'Customer Name': 'Izina ry’umukiriya',
  'Enter customer name': 'Andika izina ry’umukiriya',
  'Phone': 'Telefoni',
  'Optional phone number': 'Nimero ya telefoni (si ngombwa)',
  'Address': 'Aderesi',
  'Optional address': 'Aderesi (si ngombwa)',
  'Optional customer notes': 'Ibisobanuro ku mukiriya (si ngombwa)',
  'Saving...': 'Turabika...',
  'Create Customer': 'Andika umukiriya',
  'Sale Details': 'Ibisobanuro by’igurisha',
  'Paid:': 'Yishyuwe:',
  '• Due:': '• Umwenda usigaye:',
  '+ Add Payment': '+ Ongeraho ubwishyu',
  'Add Payment': 'Ongeraho ubwishyu',
  'Sold Items': 'Ibicuruzwa byagurishijwe',
  'Actual FIFO cost and batch allocation.': 'Igiciro nyakuri cya FIFO n’uko ibyiciro by’ibicuruzwa byakoreshejwe.',
  'Selling Price': 'Igiciro cyo kugurisha',
  'Actual FIFO Cost': 'Igiciro nyakuri cya FIFO',
  'Batch Allocations': 'Ibyiciro by’ibicuruzwa byakoreshejwe',
  'Batch:': 'Icyiciro:',
  'No allocation found.': 'Nta cyiciro cyabonetse.',
  'Totals': 'Igiteranyo',
  'Payment History': 'Amateka y’ubwishyu',
  'Every payment received for this sale.': 'Ubwishyu bwose bwakiriwe kuri iri gurisha.',
  'No separate payment records found.': 'Nta bwishyu bwihariye bwabonetse.',
  'Payment Date': 'Itariki y’ubwishyu',
  'Amount': 'Amafaranga',
  'Payment ID': 'Nimero y’ubwishyu',
  'Final Payment': 'Ubwishyu bwa nyuma',
  'Installment Payment': 'Ubwishyu bw’igice',
  'Edit': 'Hindura',
  'Sale Notes': 'Ibisobanuro ku igurisha',
  'Record Payment': 'Andika ubwishyu',
  'Outstanding Balance': 'Umwenda usigaye',
  'Current payment position': 'Uko ubwishyu bumeze ubu',
  'Sale Total': 'Igiteranyo cy’igurisha',
  'Already Paid': 'Hamaze kwishyurwa',
  'Remaining Due': 'Umwenda usigaye',
  'Payment Amount': 'Amafaranga yishyuwe',
  'Max': 'Ntarenze',
  'Enter amount': 'Andika amafaranga',
  'Pay Full Due': 'Ishyura umwenda wose',
  'New remaining due:': 'Umwenda uzasigara:',
  'Optional payment note...': 'Ibisobanuro ku bwishyu (si ngombwa)...',
  'Recording...': 'Turandika...',
  'Edit Payment': 'Hindura ubwishyu',
  'Correct the amount, date or notes for an existing payment.': 'Kosora amafaranga, itariki cyangwa ibisobanuro by’ubwishyu busanzwe.',
  'Payment Record': 'Inyandiko y’ubwishyu',
  'Initial': 'Bwa mbere',
  'Final': 'Bwa nyuma',
  'Installment': 'Igice',
  'Important correction': 'Ikosora ry’ingenzi',
  "Use this only when the payment was entered incorrectly. The sale's paid amount, remaining debt and payment status will be recalculated.": 'Koresha ibi gusa igihe ubwishyu bwanditswe nabi. Amafaranga yishyuwe ku igurisha, umwenda usigaye n’imiterere y’ubwishyu bizongera kubarwa.',
  'Amount Correction': 'Ikosora ry’amafaranga',
  'Current': 'Ayari asanzwe',
  'Corrected': 'Yakosowe',
  'Corrected Payment Amount': 'Amafaranga y’ubwishyu yakosowe',
  'Payment Notes': 'Ibisobanuro ku bwishyu',
  'Payment note...': 'Ibisobanuro ku bwishyu...',
  'Saving Correction...': 'Turabika ibyakosowe...',
  'Save Correction': 'Bika ibyakosowe',
}

function translateSalesText(value: string, isKinyarwanda: boolean) {
  if (!isKinyarwanda) return value

  const trimmed = value.trim()

  // Keep dynamic parts (amounts, ids, names) while translating the text around them.
  const prefixes: Array<[string, string]> = [
    [
      'Payment cannot exceed the remaining due of ',
      'Amafaranga yishyurwa ntashobora kurenga umwenda usigaye wa ',
    ],
    [
      'Sale created successfully. Sale ID: ',
      'Igurisha ryanditswe neza. Nimero y’igurisha: ',
    ],
    [
      'Payment corrected successfully to ',
      'Ubwishyu bwakosowe neza, ubu ni ',
    ],
    ['Record a payment for sale #', 'Andika ubwishyu bw’igurisha #'],
    ['Increase of ', 'Ubwiyongere bwa '],
    ['Decrease of ', 'Igabanuka rya '],
    ['Sale #', 'Igurisha #'],
  ]

  for (const [english, kinyarwanda] of prefixes) {
    if (trimmed.startsWith(english)) {
      return kinyarwanda + trimmed.slice(english.length)
    }
  }

  const paymentOfPrefix = 'Payment of '
  const recordedSuffix = ' recorded successfully.'

  if (
    trimmed.startsWith(paymentOfPrefix) &&
    trimmed.endsWith(recordedSuffix)
  ) {
    const amount = trimmed.slice(
      paymentOfPrefix.length,
      trimmed.length - recordedSuffix.length,
    )

    return `Ubwishyu bwa ${amount} bwanditswe neza.`
  }

  if (Object.prototype.hasOwnProperty.call(SALES_TRANSLATIONS, trimmed)) {
    return SALES_TRANSLATIONS[trimmed]
  }

  return value
}

function translateSalesNode(
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

    return `${leading}${translateSalesText(content, true)}${trailing}`
  }

  if (Array.isArray(node)) {
    // Children.map keeps each element's own key and does not add wrapper
    // elements, so tables, flex rows and lists keep their exact structure.
    return Children.map(node, (item) => translateSalesNode(item, true))
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
        nextProps[key] = translateSalesText(value, true)
      }
    }

    if (props.children !== undefined) {
      nextProps.children = translateSalesNode(
        props.children as ReactNode,
        true,
      )
    }

    if (props.footer !== undefined) {
      nextProps.footer = translateSalesNode(
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

function SalesTranslation({ children }: { children: ReactNode }) {
  const { t } = useAppPreferences()

  const isKinyarwanda =
    t('inventory').trim().toLowerCase() !== 'inventory'

  return <>{translateSalesNode(children, isKinyarwanda)}</>
}

export default function SalesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [allocations, setAllocations] = useState<
    SaleBatchAllocation[]
  >([])
  const [payments, setPayments] = useState<Payment[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [correctingPayment, setCorrectingPayment] =
    useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showCreateModal, setShowCreateModal] =
    useState(false)
  const [showCustomerModal, setShowCustomerModal] =
    useState(false)
  const [showDetailsModal, setShowDetailsModal] =
    useState(false)
  const [showPaymentModal, setShowPaymentModal] =
    useState(false)
  const [showCorrectPaymentModal, setShowCorrectPaymentModal] =
    useState(false)

  const [selectedSale, setSelectedSale] =
    useState<Sale | null>(null)

  const [selectedPayment, setSelectedPayment] =
    useState<Payment | null>(null)

  const [selectedCustomerId, setSelectedCustomerId] =
    useState('')
  const [saleDate, setSaleDate] = useState('')
  const [notes, setNotes] = useState('')
  const [initialPayment, setInitialPayment] =
    useState('')

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] =
    useState('')
  const [customerAddress, setCustomerAddress] =
    useState('')
  const [customerNotes, setCustomerNotes] =
    useState('')
  const [savingCustomer, setSavingCustomer] =
    useState(false)

  const [paymentAmount, setPaymentAmount] =
    useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentNotes, setPaymentNotes] =
    useState('')

  const [correctPaymentAmount, setCorrectPaymentAmount] =
    useState('')
  const [correctPaymentDate, setCorrectPaymentDate] =
    useState('')
  const [correctPaymentNotes, setCorrectPaymentNotes] =
    useState('')

  const [draftItems, setDraftItems] = useState<
    SaleDraftItem[]
  >([makeDraftItem()])

  async function loadData() {
    setLoading(true)
    setError('')

    const [
      customersResult,
      productsResult,
      productTypesResult,
      salesResult,
      batchesResult,
    ] = await Promise.all([
      supabase
        .from('customers')
        .select(
          'id,name,phone,address,notes,active',
        )
        .eq('active', true)
        .order('name'),

      supabase
        .from('products')
        .select('id,name,status')
        .eq('status', 'active')
        .order('name'),

      supabase
        .from('product_types')
        .select(
          'id,product_id,name,description,image_path,minimum_stock,status',
        )
        .eq('status', 'active')
        .order('name'),

      supabase
        .from('sales')
        .select(
          'id,customer_id,sale_date,notes,created_by,total_revenue,total_cost,total_profit,amount_paid,amount_due,payment_status,created_at',
        )
        .order('sale_date', {
          ascending: false,
        }),

      supabase
        .from('batches')
        .select(
          'id,purchase_item_id,product_type_id,batch_number,received_at,original_quantity,remaining_quantity,unit_cost,attachment_path,status,created_at',
        ),
    ])

    const firstError =
      customersResult.error ||
      productsResult.error ||
      productTypesResult.error ||
      salesResult.error ||
      batchesResult.error

    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    setCustomers(customersResult.data || [])
    setProducts(productsResult.data || [])
    setProductTypes(productTypesResult.data || [])
    setSales(salesResult.data || [])
    setBatches(batchesResult.data || [])

    setLoading(false)
  }

  useEffect(() => {
    setSaleDate(getCurrentDateTimeLocal())
    setPaymentDate(getCurrentDateTimeLocal())
    loadData()
  }, [])

  const walkInCustomer = useMemo(
    () =>
      customers.find(
        (customer) =>
          customer.name.toLowerCase() ===
          'walk-in customer',
      ),
    [customers],
  )

  const selectedCustomer = useMemo(
    () =>
      customers.find(
        (customer) =>
          customer.id === selectedCustomerId,
      ),
    [customers, selectedCustomerId],
  )

  const draftTotal = useMemo(() => {
    return draftItems.reduce((total, item) => {
      const quantity = Number(item.quantity || 0)
      const price = Number(
        item.selling_price || 0,
      )

      return total + quantity * price
    }, 0)
  }, [draftItems])

  const paymentNumber = Number(initialPayment || 0)

  const amountDue = Math.max(
    draftTotal - paymentNumber,
    0,
  )

  const paymentStatus =
    amountDue <= 0
      ? 'paid'
      : paymentNumber > 0
        ? 'partial'
        : 'unpaid'

  const totalSales = sales.length

  const totalRevenue = sales.reduce(
    (sum, sale) =>
      sum + Number(sale.total_revenue || 0),
    0,
  )

  const totalProfit = sales.reduce(
    (sum, sale) =>
      sum + Number(sale.total_profit || 0),
    0,
  )

  const totalDue = sales.reduce(
    (sum, sale) =>
      sum + Number(sale.amount_due || 0),
    0,
  )

  const selectedSaleDue = selectedSale
    ? Number(selectedSale.amount_due || 0)
    : 0

  const paymentNumberForModal = Number(
    paymentAmount || 0,
  )

  const correctedAmountNumber = Number(
    correctPaymentAmount || 0,
  )

  const correctionDifference =
    selectedPayment
      ? correctedAmountNumber -
        Number(selectedPayment.amount || 0)
      : 0

  function updateDraftItem(
    id: string,
    changes: Partial<SaleDraftItem>,
  ) {
    setDraftItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...changes,
            }
          : item,
      ),
    )
  }

  function removeDraftItem(id: string) {
    setDraftItems((current) => {
      if (current.length === 1) {
        return current
      }

      return current.filter(
        (item) => item.id !== id,
      )
    })
  }

  function addDraftItem() {
    setDraftItems((current) => [
      ...current,
      makeDraftItem(),
    ])
  }

  function resetCreateForm() {
    setSelectedCustomerId(
      walkInCustomer?.id || '',
    )
    setSaleDate(getCurrentDateTimeLocal())
    setNotes('')
    setInitialPayment('')
    setDraftItems([makeDraftItem()])
  }

  function openCreateModal() {
    setError('')
    setSuccess('')
    resetCreateForm()
    setShowCreateModal(true)
  }

  function openPaymentModal(sale: Sale) {
    setSelectedSale(sale)
    setPaymentAmount('')
    setPaymentDate(getCurrentDateTimeLocal())
    setPaymentNotes('')
    setError('')
    setSuccess('')
    setShowPaymentModal(true)
  }

  function openCorrectPaymentModal(
    payment: Payment,
  ) {
    setSelectedPayment(payment)

    setCorrectPaymentAmount(
      String(payment.amount),
    )

    setCorrectPaymentDate(
      getDateTimeLocalFromDate(
        payment.payment_date,
      ),
    )

    setCorrectPaymentNotes(
      payment.notes || '',
    )

    setError('')
    setSuccess('')
    setShowCorrectPaymentModal(true)
  }

  async function handleCreateCustomer(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!customerName.trim()) {
      setError('Customer name is required.')
      return
    }

    setSavingCustomer(true)
    setError('')
    setSuccess('')

    const { data, error: customerError } =
      await supabase
        .from('customers')
        .insert({
          name: customerName.trim(),
          phone: customerPhone.trim() || null,
          address:
            customerAddress.trim() || null,
          notes:
            customerNotes.trim() || null,
        })
        .select(
          'id,name,phone,address,notes,active',
        )
        .single()

    if (customerError) {
      setError(customerError.message)
      setSavingCustomer(false)
      return
    }

    if (data) {
      setCustomers((current) =>
        [...current, data].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      )

      setSelectedCustomerId(data.id)
    }

    setCustomerName('')
    setCustomerPhone('')
    setCustomerAddress('')
    setCustomerNotes('')

    setShowCustomerModal(false)
    setSavingCustomer(false)
    setSuccess('Customer created successfully.')
  }

  async function handleCreateSale(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!selectedCustomerId) {
      setError('Please select a customer.')
      return
    }

    const validItems = draftItems.filter(
      (item) =>
        item.product_type_id &&
        Number(item.quantity) > 0 &&
        Number(item.selling_price) >= 0,
    )

    if (validItems.length === 0) {
      setError(
        'Please add at least one valid sale item.',
      )
      return
    }

    if (paymentNumber < 0) {
      setError(
        'Initial payment cannot be negative.',
      )
      return
    }

    if (paymentNumber > draftTotal) {
      setError(
        'Initial payment cannot exceed the sale total.',
      )
      return
    }

    setSaving(true)

    const items = validItems.map((item) => ({
      product_type_id: item.product_type_id,
      quantity: Number(item.quantity),
      selling_price: Number(
        item.selling_price,
      ),
    }))

    const { data, error: saleError } =
      await supabase.rpc('create_sale', {
        p_customer_id:
          selectedCustomerId || null,
        p_sale_date: new Date(
          saleDate,
        ).toISOString(),
        p_notes: notes.trim() || null,
        p_items: items,
        p_initial_payment: paymentNumber,
      })

    if (saleError) {
      setError(saleError.message)
      setSaving(false)
      return
    }

    setShowCreateModal(false)
    setSaving(false)

    resetCreateForm()

    await loadData()

    setSuccess(
      `Sale created successfully. Sale ID: ${data}`,
    )
  }

  async function viewSaleDetails(
    sale: Sale,
  ) {
    setSelectedSale(sale)
    setError('')
    setSuccess('')

    const [
      saleItemsResult,
      allocationsResult,
      paymentsResult,
    ] = await Promise.all([
      supabase
        .from('sale_items')
        .select(
          'id,sale_id,product_type_id,quantity,selling_price,revenue,cost,profit,created_at',
        )
        .eq('sale_id', sale.id)
        .order('created_at'),

      supabase
        .from('sale_batch_allocations')
        .select(
          'id,sale_item_id,batch_id,quantity,unit_cost,total_cost,created_at',
        )
        .order('created_at'),

      supabase
        .from('payments')
        .select(
          'id,sale_id,customer_id,amount,payment_date,notes,received_by,created_at',
        )
        .eq('sale_id', sale.id)
        .order('payment_date', {
          ascending: false,
        }),
    ])

    const detailsError =
      saleItemsResult.error ||
      allocationsResult.error ||
      paymentsResult.error

    if (detailsError) {
      setError(detailsError.message)
      return
    }

    setSaleItems(saleItemsResult.data || [])
    setAllocations(
      allocationsResult.data || [],
    )
    setPayments(paymentsResult.data || [])
    setShowDetailsModal(true)
  }

  async function refreshSelectedSale(
    saleId: string,
  ) {
    const { data, error: saleError } =
      await supabase
        .from('sales')
        .select(
          'id,customer_id,sale_date,notes,created_by,total_revenue,total_cost,total_profit,amount_paid,amount_due,payment_status,created_at',
        )
        .eq('id', saleId)
        .single()

    if (saleError) {
      throw saleError
    }

    if (!data) return

    setSelectedSale(data)

    setSales((current) =>
      current.map((sale) =>
        sale.id === data.id
          ? data
          : sale,
      ),
    )

    const {
      data: paymentData,
      error: paymentError,
    } = await supabase
      .from('payments')
      .select(
        'id,sale_id,customer_id,amount,payment_date,notes,received_by,created_at',
      )
      .eq('sale_id', saleId)
      .order('payment_date', {
        ascending: false,
      })

    if (paymentError) {
      throw paymentError
    }

    setPayments(paymentData || [])
  }

  async function handleRecordPayment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!selectedSale) {
      setError('No sale selected.')
      return
    }

    const amount = Number(paymentAmount || 0)

    if (!amount || amount <= 0) {
      setError(
        'Payment amount must be greater than zero.',
      )
      return
    }

    if (amount > selectedSaleDue) {
      setError(
        `Payment cannot exceed the remaining due of ${formatMoney(
          selectedSaleDue,
        )}.`,
      )
      return
    }

    setSavingPayment(true)
    setError('')
    setSuccess('')

    const { error: paymentError } =
      await supabase.rpc(
        'record_sale_payment',
        {
          p_sale_id: selectedSale.id,
          p_amount: amount,
          p_payment_date: new Date(
            paymentDate,
          ).toISOString(),
          p_notes:
            paymentNotes.trim() || null,
        },
      )

    if (paymentError) {
      setError(paymentError.message)
      setSavingPayment(false)
      return
    }

    try {
      await refreshSelectedSale(
        selectedSale.id,
      )
      await loadData()
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Payment was recorded, but the page could not refresh.',
      )
      setSavingPayment(false)
      return
    }

    setPaymentAmount('')
    setPaymentDate(getCurrentDateTimeLocal())
    setPaymentNotes('')
    setShowPaymentModal(false)
    setSavingPayment(false)

    setSuccess(
      `Payment of ${formatMoney(
        amount,
      )} recorded successfully.`,
    )
  }

  async function handleCorrectPayment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!selectedPayment) {
      setError('No payment selected.')
      return
    }

    const newAmount = Number(
      correctPaymentAmount || 0,
    )

    if (!newAmount || newAmount <= 0) {
      setError(
        'Corrected payment amount must be greater than zero.',
      )
      return
    }

    if (!correctPaymentDate) {
      setError('Payment date is required.')
      return
    }

    setCorrectingPayment(true)
    setError('')
    setSuccess('')

    const { error: correctionError } =
      await supabase.rpc(
        'correct_sale_payment',
        {
          p_payment_id:
            selectedPayment.id,
          p_new_amount: newAmount,
          p_payment_date: new Date(
            correctPaymentDate,
          ).toISOString(),
          p_notes:
            correctPaymentNotes.trim() || null,
        },
      )

    if (correctionError) {
      setError(correctionError.message)
      setCorrectingPayment(false)
      return
    }

    try {
      await refreshSelectedSale(
        selectedPayment.sale_id,
      )
      await loadData()
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Payment was corrected, but the page could not refresh.',
      )
      setCorrectingPayment(false)
      return
    }

    setShowCorrectPaymentModal(false)
    setSelectedPayment(null)
    setCorrectPaymentAmount('')
    setCorrectPaymentDate('')
    setCorrectPaymentNotes('')
    setCorrectingPayment(false)

    setSuccess(
      `Payment corrected successfully to ${formatMoney(
        newAmount,
      )}.`,
    )
  }

  function getProductName(
    productId: string,
  ) {
    return (
      products.find(
        (product) => product.id === productId,
      )?.name || 'Unknown product'
    )
  }

  function getProductType(
    productTypeId: string,
  ) {
    return productTypes.find(
      (type) => type.id === productTypeId,
    )
  }

  function getBatch(batchId: string) {
    return batches.find(
      (batch) => batch.id === batchId,
    )
  }

  function getItemAllocations(
    saleItemId: string,
  ) {
    return allocations.filter(
      (allocation) =>
        allocation.sale_item_id === saleItemId,
    )
  }

  function getCustomerName(
    customerId: string | null,
  ) {
    if (!customerId) {
      return 'Walk-in Customer'
    }

    return (
      customers.find(
        (customer) => customer.id === customerId,
      )?.name || 'Unknown customer'
    )
  }

  function getPaymentType(
    payment: Payment,
    allPayments: Payment[],
    saleTotal: number,
  ) {
    const isInitialPayment =
      payment.notes ===
      'Initial payment at sale creation'

    if (isInitialPayment) {
      return 'initial'
    }

    const chronologicalPayments = [
      ...allPayments,
    ].sort((a, b) => {
      const dateDifference =
        new Date(a.payment_date).getTime() -
        new Date(b.payment_date).getTime()

      if (dateDifference !== 0) {
        return dateDifference
      }

      return (
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
      )
    })

    let runningTotal = 0

    for (const currentPayment of chronologicalPayments) {
      runningTotal += Number(
        currentPayment.amount || 0,
      )

      if (
        currentPayment.id === payment.id &&
        runningTotal >= saleTotal
      ) {
        return 'final'
      }
    }

    return 'installment'
  }

  return (
    <SalesTranslation>
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-xl dark:border-slate-800 sm:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 backdrop-blur">
                <Icon
                  name="sales"
                  size={15}
                />
                Sales Management
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Sales
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Record sales, track exact FIFO costs,
                monitor profit, payments and customer
                balances.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              <Icon
                name="plus"
                size={17}
              />
              Create Sale
            </button>
          </div>
        </section>

        {/* Messages */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <Icon
              name="warning"
              size={18}
            />

            <div>
              <p className="font-bold">
                Something went wrong
              </p>
              <p className="mt-1">
                {error}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <Icon
              name="check"
              size={18}
            />

            <div>
              <p className="font-bold">
                Success
              </p>
              <p className="mt-1">
                {success}
              </p>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Sales"
            value={totalSales.toLocaleString()}
            subtitle="Recorded transactions"
            accent="indigo"
            icon="sales"
          />

          <SummaryCard
            label="Total Revenue"
            value={formatMoney(totalRevenue)}
            subtitle="Customer sales value"
            accent="blue"
            icon="money"
          />

          <SummaryCard
            label="Total Profit"
            value={formatMoney(totalProfit)}
            subtitle="Profit after FIFO cost"
            accent="emerald"
            icon="profit"
          />

          <SummaryCard
            label="Amount Due"
            value={formatMoney(totalDue)}
            subtitle="Outstanding customer balance"
            accent="amber"
            icon="warning"
          />
        </div>

        {/* Sales History */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                    <Icon
                      name="sales"
                      size={19}
                    />
                  </div>

                  <div>
                    <h2 className="text-lg font-black">
                      Sales History
                    </h2>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      All recorded sales and payment
                      status.
                    </p>
                  </div>
                </div>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {sales.length} sale
                {sales.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center p-8">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-indigo-900 dark:border-t-indigo-400" />
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Loading sales...
                </p>
              </div>
            </div>
          ) : sales.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                  <Icon
                    name="sales"
                    size={28}
                  />
                </div>

                <h3 className="mt-5 text-lg font-black">
                  No sales yet
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Create your first sale to start
                  tracking revenue, cost, profit and
                  payments.
                </p>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  Create First Sale
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto overscroll-x-contain">
              <table className="min-w-[1150px] w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="px-5 py-3.5">
                      Sale
                    </th>

                    <th className="px-5 py-3.5">
                      Customer
                    </th>

                    <th className="px-5 py-3.5">
                      Sale Date
                    </th>

                    <th className="px-5 py-3.5 text-right">
                      Revenue
                    </th>

                    <th className="px-5 py-3.5 text-right">
                      Cost
                    </th>

                    <th className="px-5 py-3.5 text-right">
                      Profit
                    </th>

                    <th className="px-5 py-3.5 text-right">
                      Paid
                    </th>

                    <th className="px-5 py-3.5 text-right">
                      Due
                    </th>

                    <th className="px-5 py-3.5">
                      Status
                    </th>

                    <th className="px-5 py-3.5 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="group transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold">
                          #{sale.id.slice(0, 8)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(
                            sale.created_at,
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {getCustomerName(
                          sale.customer_id,
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {formatDate(
                          sale.sale_date,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {formatMoney(
                          sale.total_revenue,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">
                        {formatMoney(
                          sale.total_cost,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(
                          sale.total_profit,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {formatMoney(
                          sale.amount_paid,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-amber-600 dark:text-amber-400">
                        {formatMoney(
                          sale.amount_due,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <PaymentStatusBadge
                          status={
                            sale.payment_status
                          }
                        />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {Number(
                            sale.amount_due,
                          ) > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                openPaymentModal(
                                  sale,
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow"
                            >
                              <Icon
                                name="plus"
                                size={13}
                              />
                              Payment
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              viewSaleDetails(
                                sale,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
                          >
                            <Icon
                              name="eye"
                              size={14}
                            />
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Create Sale Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          if (!saving) {
            setShowCreateModal(false)
          }
        }}
        title="Create Sale"
        description="Build the sale, choose the customer, and enter the selling prices."
        size="xl"
      >
        <form
          onSubmit={handleCreateSale}
          className="space-y-6"
        >
          {/* Customer */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                    <Icon
                      name="users"
                      size={17}
                    />
                  </div>

                  <h3 className="font-black">
                    Customer
                  </h3>
                </div>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Choose who is buying these items.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setError('')
                  setShowCustomerModal(true)
                }}
                className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-900/50 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
              >
                <Icon
                  name="plus"
                  size={13}
                />
                Add Customer
              </button>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(event) =>
                setSelectedCustomerId(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">
                Select customer
              </option>

              {customers.map((customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {customer.name}
                  {customer.phone
                    ? ` — ${customer.phone}`
                    : ''}
                </option>
              ))}
            </select>

            {selectedCustomer && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-xs font-black text-white">
                  {selectedCustomer.name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) =>
                      part
                        .charAt(0)
                        .toUpperCase(),
                    )
                    .join('')}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {selectedCustomer.name}
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedCustomer.phone ||
                      'No phone number'}
                    {selectedCustomer.address
                      ? ` • ${selectedCustomer.address}`
                      : ''}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Date */}
          <section>
            <label className="mb-2 block text-sm font-bold">
              Sale Date
            </label>

            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon
                  name="calendar"
                  size={17}
                />
              </div>

              <input
                type="datetime-local"
                value={saleDate}
                onChange={(event) =>
                  setSaleDate(event.target.value)
                }
                required
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </section>

          {/* Items */}
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <Icon
                      name="package"
                      size={17}
                    />
                  </div>

                  <h3 className="text-base font-black">
                    Sale Items
                  </h3>
                </div>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Search the product first, then choose its
                  product type / kind.
                </p>
              </div>

              <button
                type="button"
                onClick={addDraftItem}
                className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/60"
              >
                <Icon
                  name="plus"
                  size={13}
                />
                Add Item
              </button>
            </div>

            {draftItems.map(
              (item, index) => {
                const productQuery =
                  item.productSearch
                    .trim()
                    .toLowerCase()

                const typeQuery =
                  item.typeSearch
                    .trim()
                    .toLowerCase()

                /*
                 * IMPORTANT UX CHANGE:
                 * No product results are shown when the
                 * search field is empty.
                 */
                const matchingProducts =
                  !item.product_id &&
                  productQuery
                    ? products
                        .filter((product) =>
                          product.name
                            .toLowerCase()
                            .includes(
                              productQuery,
                            ),
                        )
                        .slice(0, 12)
                    : []

                const selectedProduct =
                  products.find(
                    (product) =>
                      product.id ===
                      item.product_id,
                  )

                const selectedProductTypes =
                  item.product_id
                    ? productTypes.filter(
                        (type) =>
                          type.product_id ===
                          item.product_id,
                      )
                    : []

                /*
                 * Product Type results are also hidden
                 * until the user searches for them.
                 */
                const matchingTypes =
                  item.product_id &&
                  !item.product_type_id &&
                  typeQuery
                    ? selectedProductTypes
                        .filter((type) =>
                          type.name
                            .toLowerCase()
                            .includes(typeQuery),
                        )
                        .slice(0, 12)
                    : []

                const selectedType =
                  getProductType(
                    item.product_type_id,
                  )

                const typeStock =
                  selectedType
                    ? batches
                        .filter(
                          (batch) =>
                            batch.product_type_id ===
                            selectedType.id &&
                            batch.status !==
                              'cancelled',
                        )
                        .reduce(
                          (sum, batch) =>
                            sum +
                            Number(
                              batch.remaining_quantity ||
                                0,
                            ),
                          0,
                        )
                    : 0

                const itemTotal =
                  Number(item.quantity || 0) *
                  Number(
                    item.selling_price || 0,
                  )

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"
                  >
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {index + 1}
                        </div>

                        <div>
                          <p className="text-sm font-black">
                            Sale Item {index + 1}
                          </p>

                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Product → Type / Kind → Price
                          </p>
                        </div>
                      </div>

                      {draftItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeDraftItem(
                              item.id,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <Icon
                            name="trash"
                            size={13}
                          />
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Product Search */}
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Product
                        </label>

                        {!item.product_id && (
                          <span className="text-[11px] text-slate-400">
                            Search to display products
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Icon
                            name="search"
                            size={16}
                          />
                        </div>

                        <input
                          type="text"
                          value={
                            selectedProduct
                              ? selectedProduct.name
                              : item.productSearch
                          }
                          onChange={(event) => {
                            const value =
                              event.target.value

                            updateDraftItem(
                              item.id,
                              {
                                productSearch:
                                  value,
                                product_id: '',
                                product_type_id:
                                  '',
                                typeSearch:
                                  '',
                              },
                            )
                          }}
                          placeholder="Type a product name to search..."
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-950"
                        />
                      </div>

                      {selectedProduct && (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                              <Icon
                                name="box"
                                size={18}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                                Selected Product
                              </p>

                              <p className="truncate text-sm font-black text-indigo-950 dark:text-indigo-100">
                                {selectedProduct.name}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updateDraftItem(
                                item.id,
                                {
                                  product_id: '',
                                  product_type_id:
                                    '',
                                  productSearch:
                                    '',
                                  typeSearch:
                                    '',
                                },
                              )
                            }
                            className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-indigo-200 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-indigo-900/50"
                          >
                            Change
                          </button>
                        </div>
                      )}

                      {matchingProducts.length > 0 && (
                        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
                          {matchingProducts.map(
                            (product) => (
                              <button
                                type="button"
                                key={product.id}
                                onClick={() =>
                                  updateDraftItem(
                                    item.id,
                                    {
                                      product_id:
                                        product.id,
                                      product_type_id:
                                        '',
                                      productSearch:
                                        product.name,
                                      typeSearch:
                                        '',
                                    },
                                  )
                                }
                                className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-white p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50 dark:bg-slate-900 dark:hover:border-indigo-900/50 dark:hover:bg-indigo-950/20"
                              >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                  <Icon
                                    name="box"
                                    size={17}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold">
                                    {product.name}
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    Product
                                  </p>
                                </div>

                                <Icon
                                  name="arrow"
                                  size={15}
                                  className="ml-auto text-slate-400"
                                />
                              </button>
                            ),
                          )}
                        </div>
                      )}

                      {productQuery &&
                        !item.product_id &&
                        matchingProducts.length === 0 && (
                          <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            No products match “
                            {item.productSearch}”
                          </div>
                        )}
                    </div>

                    {/* Product Type */}
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Product Type / Kind
                        </label>

                        {item.product_id &&
                          !item.product_type_id && (
                            <span className="text-[11px] text-slate-400">
                              Search to display types
                            </span>
                          )}
                      </div>

                      <div className="relative">
                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Icon
                            name="search"
                            size={16}
                          />
                        </div>

                        <input
                          type="text"
                          value={
                            selectedType
                              ? selectedType.name
                              : item.typeSearch
                          }
                          onChange={(event) => {
                            const value =
                              event.target.value

                            updateDraftItem(
                              item.id,
                              {
                                typeSearch:
                                  value,
                                product_type_id:
                                  '',
                              },
                            )
                          }}
                          placeholder={
                            item.product_id
                              ? 'Type a product type / kind to search...'
                              : 'Select a product first...'
                          }
                          disabled={!item.product_id}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-950"
                        />
                      </div>

                      {selectedType && (
                        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                          {getPublicImageUrl(
                            selectedType.image_path,
                          ) ? (
                            <img
                              src={
                                getPublicImageUrl(
                                  selectedType.image_path,
                                ) as string
                              }
                              alt={selectedType.name}
                              className="h-12 w-12 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 dark:bg-slate-900 dark:text-emerald-400">
                              <Icon
                                name="package"
                                size={19}
                              />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                              Selected Type / Kind
                            </p>

                            <p className="truncate text-sm font-black text-emerald-950 dark:text-emerald-100">
                              {selectedType.name}
                            </p>

                            <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400">
                              Current stock:{' '}
                              <strong>
                                {typeStock.toLocaleString()}
                              </strong>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updateDraftItem(
                                item.id,
                                {
                                  product_type_id:
                                    '',
                                  typeSearch:
                                    '',
                                },
                              )
                            }
                            className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-emerald-200 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-emerald-900/50"
                          >
                            Change
                          </button>
                        </div>
                      )}

                      {matchingTypes.length > 0 && (
                        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
                          {matchingTypes.map(
                            (type) => {
                              const imageUrl =
                                getPublicImageUrl(
                                  type.image_path,
                                )

                              const stock =
                                batches
                                  .filter(
                                    (batch) =>
                                      batch.product_type_id ===
                                        type.id &&
                                      batch.status !==
                                        'cancelled',
                                  )
                                  .reduce(
                                    (
                                      sum,
                                      batch,
                                    ) =>
                                      sum +
                                      Number(
                                        batch.remaining_quantity ||
                                          0,
                                      ),
                                    0,
                                  )

                              return (
                                <button
                                  type="button"
                                  key={type.id}
                                  onClick={() =>
                                    updateDraftItem(
                                      item.id,
                                      {
                                        product_type_id:
                                          type.id,
                                        typeSearch:
                                          type.name,
                                      },
                                    )
                                  }
                                  className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-white p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50 dark:bg-slate-900 dark:hover:border-indigo-900/50 dark:hover:bg-indigo-950/20"
                                >
                                  {imageUrl ? (
                                    <img
                                      src={
                                        imageUrl
                                      }
                                      alt={
                                        type.name
                                      }
                                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                      <Icon
                                        name="package"
                                        size={18}
                                      />
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold">
                                      {type.name}
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                      Stock:{' '}
                                      <strong>
                                        {stock.toLocaleString()}
                                      </strong>
                                    </p>
                                  </div>

                                  <Icon
                                    name="arrow"
                                    size={15}
                                    className="shrink-0 text-slate-400"
                                  />
                                </button>
                              )
                            },
                          )}
                        </div>
                      )}

                      {item.product_id &&
                        typeQuery &&
                        !item.product_type_id &&
                        matchingTypes.length ===
                          0 && (
                          <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            No product types match “
                            {item.typeSearch}”
                          </div>
                        )}
                    </div>

                    {/* Quantity + Price */}
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Quantity
                        </label>

                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateDraftItem(
                              item.id,
                              {
                                quantity:
                                  event.target
                                    .value,
                              },
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Selling Price / Item
                        </label>

                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              item.selling_price
                            }
                            onChange={(event) =>
                              updateDraftItem(
                                item.id,
                                {
                                  selling_price:
                                    event.target
                                      .value,
                                },
                              )
                            }
                            placeholder="0"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 pr-14 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950"
                          />

                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            RWF
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Item Revenue
                        </label>

                        <div className="flex h-[46px] items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-black text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                          {formatMoney(
                            itemTotal,
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
            )}
          </section>

          {/* Initial Payment */}
          <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 dark:border-emerald-900/50 dark:from-emerald-950/20 dark:to-slate-900 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Icon
                  name="money"
                  size={19}
                />
              </div>

              <div>
                <h3 className="font-black text-emerald-900 dark:text-emerald-200">
                  Initial Payment
                </h3>

                <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-400">
                  Pay the full sale now or record a
                  partial payment.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-bold">
                Initial Payment
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={initialPayment}
                  onChange={(event) =>
                    setInitialPayment(
                      event.target.value,
                    )
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-3 pr-16 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-emerald-800 dark:bg-slate-950"
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  RWF
                </span>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <label className="mb-2 block text-sm font-bold">
              Notes
              <span className="ml-1 font-normal text-slate-400">
                (optional)
              </span>
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              rows={3}
              placeholder="Optional sale notes..."
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900"
            />
          </section>

          {/* Summary */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Icon
                  name="calculator"
                  size={17}
                />
              </div>

              <div>
                <h3 className="font-black">
                  Sale Summary
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review before saving.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">
                  Total Revenue
                </span>

                <span className="font-black">
                  {formatMoney(draftTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">
                  Initial Payment
                </span>

                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {formatMoney(paymentNumber)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                <span className="font-bold">
                  Amount Due
                </span>

                <span className="font-black text-amber-600 dark:text-amber-400">
                  {formatMoney(amountDue)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">
                  Payment Status
                </span>

                <PaymentStatusBadge
                  status={paymentStatus}
                />
              </div>
            </div>
          </section>

          {/* Buttons */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                setShowCreateModal(false)
              }
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Spinner />
                  Creating Sale...
                </>
              ) : (
                <>
                  <Icon
                    name="check"
                    size={16}
                  />
                  Create Sale
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        open={showCustomerModal}
        onClose={() => {
          if (!savingCustomer) {
            setShowCustomerModal(false)
          }
        }}
        title="Add Customer"
        description="Create a customer without leaving the sales screen."
        size="md"
      >
        <form
          onSubmit={handleCreateCustomer}
          className="space-y-5"
        >
          <FormInput
            label="Customer Name"
            value={customerName}
            onChange={setCustomerName}
            placeholder="Enter customer name"
            required
          />

          <FormInput
            label="Phone"
            value={customerPhone}
            onChange={setCustomerPhone}
            placeholder="Optional phone number"
          />

          <FormInput
            label="Address"
            value={customerAddress}
            onChange={setCustomerAddress}
            placeholder="Optional address"
          />

          <FormTextarea
            label="Notes"
            value={customerNotes}
            onChange={setCustomerNotes}
            placeholder="Optional customer notes"
          />

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
            <button
              type="button"
              disabled={savingCustomer}
              onClick={() =>
                setShowCustomerModal(false)
              }
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={savingCustomer}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingCustomer
                ? 'Saving...'
                : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Sale Details Modal */}
      <Modal
        open={showDetailsModal}
        onClose={() =>
          setShowDetailsModal(false)
        }
        title="Sale Details"
        description={
          selectedSale
            ? `Sale #${selectedSale.id.slice(
                0,
                8,
              )} • ${getCustomerName(
                selectedSale.customer_id,
              )}`
            : undefined
        }
        size="xl"
      >
        {selectedSale && (
          <div className="space-y-6">
            {/* Sale Header */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCard
                label="Customer"
                value={getCustomerName(
                  selectedSale.customer_id,
                )}
                icon="users"
              />

              <InfoCard
                label="Sale Date"
                value={formatDate(
                  selectedSale.sale_date,
                )}
                icon="calendar"
              />

              <InfoCard
                label="Revenue"
                value={formatMoney(
                  selectedSale.total_revenue,
                )}
                icon="money"
              />

              <InfoCard
                label="Amount Due"
                value={formatMoney(
                  selectedSale.amount_due,
                )}
                icon="warning"
                tone="amber"
              />
            </div>

            {/* Payment Summary */}
            <section className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4 dark:border-emerald-900/50 dark:from-emerald-950/20 dark:to-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <Icon
                        name="money"
                        size={17}
                      />
                    </div>

                    <h3 className="font-black">
                      Payment Status
                    </h3>
                  </div>

                  <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
                    Paid:{' '}
                    <strong>
                      {formatMoney(
                        selectedSale.amount_paid,
                      )}
                    </strong>{' '}
                    • Due:{' '}
                    <strong>
                      {formatMoney(
                        selectedSale.amount_due,
                      )}
                    </strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <PaymentStatusBadge
                    status={
                      selectedSale.payment_status
                    }
                  />

                  {Number(
                    selectedSale.amount_due,
                  ) > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        openPaymentModal(
                          selectedSale,
                        )
                      }
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                    >
                      + Add Payment
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Sold Items */}
            <section>
              <div className="mb-4">
                <h3 className="text-lg font-black">
                  Sold Items
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Actual FIFO cost and batch allocation.
                </p>
              </div>

              <div className="w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-[1250px] w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                      <th className="px-4 py-3">
                        Product Type / Kind
                      </th>

                      <th className="px-4 py-3">
                        Product
                      </th>

                      <th className="px-4 py-3 text-right">
                        Quantity
                      </th>

                      <th className="px-4 py-3 text-right">
                        Selling Price
                      </th>

                      <th className="px-4 py-3 text-right">
                        Revenue
                      </th>

                      <th className="px-4 py-3 text-right">
                        Actual FIFO Cost
                      </th>

                      <th className="px-4 py-3 text-right">
                        Profit
                      </th>

                      <th className="px-4 py-3">
                        Batch Allocations
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {saleItems.map(
                      (item) => {
                        const type =
                          getProductType(
                            item.product_type_id,
                          )

                        const itemAllocations =
                          getItemAllocations(
                            item.id,
                          )

                        return (
                          <tr
                            key={item.id}
                            className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                {type &&
                                getPublicImageUrl(
                                  type.image_path,
                                ) ? (
                                  <img
                                    src={
                                      getPublicImageUrl(
                                        type.image_path,
                                      ) as string
                                    }
                                    alt={type.name}
                                    className="h-12 w-12 rounded-xl object-cover"
                                  />
                                ) : (
                                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                                    <Icon
                                      name="package"
                                      size={18}
                                    />
                                  </div>
                                )}

                                <p className="font-bold">
                                  {type?.name ||
                                    'Unknown type'}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-4 font-semibold">
                              {type
                                ? getProductName(
                                    type.product_id,
                                  )
                                : 'Unknown'}
                            </td>

                            <td className="px-4 py-4 text-right">
                              {Number(
                                item.quantity,
                              ).toLocaleString()}
                            </td>

                            <td className="px-4 py-4 text-right">
                              {formatMoney(
                                item.selling_price,
                              )}
                            </td>

                            <td className="px-4 py-4 text-right font-semibold">
                              {formatMoney(
                                item.revenue,
                              )}
                            </td>

                            <td className="px-4 py-4 text-right font-semibold">
                              {formatMoney(
                                item.cost,
                              )}
                            </td>

                            <td className="px-4 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMoney(
                                item.profit,
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                {itemAllocations.map(
                                  (
                                    allocation,
                                  ) => {
                                    const batch =
                                      getBatch(
                                        allocation.batch_id,
                                      )

                                    return (
                                      <div
                                        key={
                                          allocation.id
                                        }
                                        className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950"
                                      >
                                        <p className="font-bold">
                                          Batch:{' '}
                                          {batch?.batch_number ||
                                            'Unknown'}
                                        </p>

                                        <p className="mt-1 text-slate-500 dark:text-slate-400">
                                          {allocation.quantity.toLocaleString()}{' '}
                                          ×{' '}
                                          {formatMoney(
                                            allocation.unit_cost,
                                          )}{' '}
                                          ={' '}
                                          {formatMoney(
                                            Number(
                                              allocation.total_cost ||
                                                allocation.quantity *
                                                  allocation.unit_cost,
                                            ),
                                          )}
                                        </p>
                                      </div>
                                    )
                                  },
                                )}

                                {itemAllocations.length ===
                                  0 && (
                                  <span className="text-xs text-slate-400">
                                    No allocation found.
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      },
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 font-black dark:border-slate-800 dark:bg-slate-950">
                      <td
                        colSpan={4}
                        className="px-4 py-4 text-right"
                      >
                        Totals
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatMoney(
                          selectedSale.total_revenue,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatMoney(
                          selectedSale.total_cost,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-emerald-600 dark:text-emerald-400">
                        {formatMoney(
                          selectedSale.total_profit,
                        )}
                      </td>

                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Payment History */}
            <section>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-lg font-black">
                    Payment History
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Every payment received for this sale.
                  </p>
                </div>

                {Number(
                  selectedSale.amount_due,
                ) > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      openPaymentModal(
                        selectedSale,
                      )
                    }
                    className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    <Icon
                      name="plus"
                      size={14}
                    />
                    Add Payment
                  </button>
                )}
              </div>

              {payments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
                  No separate payment records found.
                </div>
              ) : (
                <div className="w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="min-w-[950px] w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                        <th className="px-4 py-3">
                          Payment
                        </th>

                        <th className="px-4 py-3">
                          Payment Date
                        </th>

                        <th className="px-4 py-3 text-right">
                          Amount
                        </th>

                        <th className="px-4 py-3">
                          Notes
                        </th>

                        <th className="px-4 py-3">
                          Payment ID
                        </th>

                        <th className="px-4 py-3 text-right">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {payments.map(
                        (payment) => {
                          const paymentType =
                            getPaymentType(
                              payment,
                              payments,
                              Number(
                                selectedSale.total_revenue ||
                                  0,
                              ),
                            )

                          const paymentTypeLabel =
                            paymentType ===
                            'initial'
                              ? 'Initial Payment'
                              : paymentType ===
                                  'final'
                                ? 'Final Payment'
                                : 'Installment Payment'

                          const paymentTypeClass =
                            paymentType ===
                            'initial'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                              : paymentType ===
                                  'final'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'

                          return (
                            <tr
                              key={payment.id}
                              className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            >
                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${paymentTypeClass}`}
                                >
                                  {paymentTypeLabel}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                {formatDate(
                                  payment.payment_date,
                                )}
                              </td>

                              <td className="px-4 py-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                                {formatMoney(
                                  payment.amount,
                                )}
                              </td>

                              <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                {payment.notes ||
                                  '—'}
                              </td>

                              <td className="px-4 py-4 font-mono text-xs text-slate-400">
                                {payment.id.slice(
                                  0,
                                  8,
                                )}
                              </td>

                              <td className="px-4 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openCorrectPaymentModal(
                                      payment,
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50"
                                >
                                  <Icon
                                    name="edit"
                                    size={13}
                                  />
                                  Edit
                                </button>
                              </td>
                            </tr>
                          )
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Notes */}
            {selectedSale.notes && (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <Icon
                    name="info"
                    size={16}
                    className="text-slate-400"
                  />

                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Sale Notes
                  </p>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {selectedSale.notes}
                </p>
              </section>
            )}
          </div>
        )}
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        open={showPaymentModal}
        onClose={() => {
          if (!savingPayment) {
            setShowPaymentModal(false)
          }
        }}
        title="Record Payment"
        description={
          selectedSale
            ? `Record a payment for sale #${selectedSale.id.slice(
                0,
                8,
              )}.`
            : undefined
        }
        size="md"
      >
        {selectedSale && (
          <form
            onSubmit={handleRecordPayment}
            className="space-y-5"
          >
            {/* Debt summary */}
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 dark:border-amber-900/50 dark:from-amber-950/20 dark:to-slate-900">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Icon
                    name="warning"
                    size={17}
                  />
                </div>

                <div>
                  <p className="text-sm font-black text-amber-900 dark:text-amber-200">
                    Outstanding Balance
                  </p>

                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Current payment position
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniValueCard
                  label="Sale Total"
                  value={formatMoney(
                    selectedSale.total_revenue,
                  )}
                />

                <MiniValueCard
                  label="Already Paid"
                  value={formatMoney(
                    selectedSale.amount_paid,
                  )}
                />

                <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-100/60 p-3 dark:border-amber-900/40 dark:bg-amber-900/20">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Remaining Due
                  </p>

                  <p className="mt-1 text-2xl font-black text-amber-800 dark:text-amber-200">
                    {formatMoney(
                      selectedSale.amount_due,
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-sm font-bold">
                  Payment Amount
                </label>

                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  Max {formatMoney(
                    selectedSaleDue,
                  )}
                </span>
              </div>

              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500">
                  <Icon
                    name="money"
                    size={17}
                  />
                </div>

                <input
                  type="number"
                  min="1"
                  max={selectedSaleDue}
                  step="1"
                  value={paymentAmount}
                  onChange={(event) =>
                    setPaymentAmount(
                      event.target.value,
                    )
                  }
                  placeholder="Enter amount"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3.5 pl-10 pr-16 text-sm font-bold outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-950"
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-white px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                  RWF
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPaymentAmount(
                    String(
                      Math.max(
                        Math.floor(
                          selectedSaleDue,
                        ),
                        0,
                      ),
                    ),
                  )
                }
                className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                Pay Full Due
              </button>

              {paymentNumberForModal > 0 && (
                <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  New remaining due:{' '}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {formatMoney(
                      Math.max(
                        selectedSaleDue -
                          paymentNumberForModal,
                        0,
                      ),
                    )}
                  </strong>
                </div>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                Payment Date
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon
                    name="calendar"
                    size={17}
                  />
                </div>

                <input
                  type="datetime-local"
                  value={paymentDate}
                  onChange={(event) =>
                    setPaymentDate(
                      event.target.value,
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-950"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                Notes
                <span className="ml-1 font-normal text-slate-400">
                  (optional)
                </span>
              </label>

              <textarea
                value={paymentNotes}
                onChange={(event) =>
                  setPaymentNotes(
                    event.target.value,
                  )
                }
                rows={4}
                placeholder="Optional payment note..."
                className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-950"
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                disabled={savingPayment}
                onClick={() =>
                  setShowPaymentModal(false)
                }
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  savingPayment ||
                  !paymentAmount
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingPayment ? (
                  <>
                    <Spinner />
                    Recording...
                  </>
                ) : (
                  <>
                    <Icon
                      name="check"
                      size={16}
                    />
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Correct Payment Modal */}
      <Modal
        open={showCorrectPaymentModal}
        onClose={() => {
          if (!correctingPayment) {
            setShowCorrectPaymentModal(false)
          }
        }}
        title="Edit Payment"
        description="Correct the amount, date or notes for an existing payment."
        size="md"
      >
        {selectedPayment && (
          <form
            onSubmit={handleCorrectPayment}
            className="space-y-5"
          >
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                    Payment Record
                  </p>

                  <h3 className="mt-1 text-lg font-black">
                    {getPaymentType(
                      selectedPayment,
                      payments,
                      Number(
                        selectedSale?.total_revenue ||
                          0,
                      ),
                    ) === 'initial'
                      ? 'Initial Payment'
                      : getPaymentType(
                            selectedPayment,
                            payments,
                            Number(
                              selectedSale?.total_revenue ||
                                0,
                            ),
                          ) === 'final'
                        ? 'Final Payment'
                        : 'Installment Payment'}
                  </h3>

                  <p className="mt-1 font-mono text-xs text-slate-400">
                    ID:{' '}
                    {selectedPayment.id.slice(
                      0,
                      8,
                    )}
                  </p>
                </div>

                {(() => {
                  const paymentType =
                    getPaymentType(
                      selectedPayment,
                      payments,
                      Number(
                        selectedSale?.total_revenue ||
                          0,
                      ),
                    )

                  const label =
                    paymentType ===
                    'initial'
                      ? 'Initial'
                      : paymentType === 'final'
                        ? 'Final'
                        : 'Installment'

                  const className =
                    paymentType ===
                    'initial'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : paymentType === 'final'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'

                  return (
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${className}`}
                    >
                      {label}
                    </span>
                  )
                })()}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 font-black text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  !
                </div>

                <div>
                  <p className="text-sm font-black text-amber-800 dark:text-amber-300">
                    Important correction
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-400">
                    Use this only when the payment was
                    entered incorrectly. The sale's paid
                    amount, remaining debt and payment
                    status will be recalculated.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                Amount Correction
              </p>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Current
                  </p>

                  <p className="mt-1 text-lg font-black">
                    {formatMoney(
                      selectedPayment.amount,
                    )}
                  </p>
                </div>

                <div className="text-lg font-black text-slate-400">
                  →
                </div>

                <div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-950/30">
                  <p className="text-xs text-violet-600 dark:text-violet-400">
                    Corrected
                  </p>

                  <p className="mt-1 text-lg font-black text-violet-700 dark:text-violet-300">
                    {correctedAmountNumber > 0
                      ? formatMoney(
                          correctedAmountNumber,
                        )
                      : '—'}
                  </p>
                </div>
              </div>

              {correctedAmountNumber > 0 &&
                correctionDifference !==
                  0 && (
                  <p
                    className={`mt-3 text-xs font-bold ${
                      correctionDifference >
                      0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {correctionDifference >
                    0
                      ? `Increase of ${formatMoney(
                          correctionDifference,
                        )}`
                      : `Decrease of ${formatMoney(
                          Math.abs(
                            correctionDifference,
                          ),
                        )}`}
                  </p>
                )}
            </div>

            <FormInput
              label="Corrected Payment Amount"
              value={correctPaymentAmount}
              onChange={setCorrectPaymentAmount}
              type="number"
              min="1"
              step="1"
              required
              autoFocus
            />

            <div>
              <label className="mb-2 block text-sm font-bold">
                Payment Date
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon
                    name="calendar"
                    size={17}
                  />
                </div>

                <input
                  type="datetime-local"
                  value={correctPaymentDate}
                  onChange={(event) =>
                    setCorrectPaymentDate(
                      event.target.value,
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>

            <FormTextarea
              label="Payment Notes"
              value={correctPaymentNotes}
              onChange={setCorrectPaymentNotes}
              placeholder="Payment note..."
            />

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                disabled={correctingPayment}
                onClick={() =>
                  setShowCorrectPaymentModal(
                    false,
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  correctingPayment ||
                  !correctPaymentAmount ||
                  !correctPaymentDate
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {correctingPayment ? (
                  <>
                    <Spinner />
                    Saving Correction...
                  </>
                ) : (
                  <>
                    <Icon
                      name="edit"
                      size={15}
                    />
                    Save Correction
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </main>
    </SalesTranslation>
  )
}

/* -------------------------------------------------------------------------- */
/* UI Components                                                              */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  label,
  value,
  subtitle,
  accent,
  icon,
}: {
  label: string
  value: string
  subtitle: string
  accent:
    | 'indigo'
    | 'blue'
    | 'emerald'
    | 'amber'
  icon: IconName
}) {
  const styles = {
    indigo: {
      icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
      border:
        'border-indigo-200 dark:border-indigo-900/40',
    },
    blue: {
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      border:
        'border-blue-200 dark:border-blue-900/40',
    },
    emerald: {
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      border:
        'border-emerald-200 dark:border-emerald-900/40',
    },
    amber: {
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      border:
        'border-amber-200 dark:border-amber-900/40',
    },
  }

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${styles[accent].border}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-black tracking-tight">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
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

function renderPaymentStatusBadge({
  status,
}: {
  status: string
}) {
  const normalized = status.toLowerCase()

  const className =
    normalized === 'paid'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
      : normalized === 'partial'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
        : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold capitalize ${className}`}
    >
      {normalized === 'paid' ? (
        <Icon
          name="check"
          size={12}
        />
      ) : normalized === 'partial' ? (
        <Icon
          name="clock"
          size={12}
        />
      ) : (
        <Icon
          name="warning"
          size={12}
        />
      )}

      {normalized}
    </span>
  )
}

function renderInfoCard({
  label,
  value,
  icon,
  tone = 'slate',
}: {
  label: string
  value: string
  icon: IconName
  tone?: 'slate' | 'amber'
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        tone === 'amber'
          ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20'
          : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          tone === 'amber'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400'
        }`}
      >
        <Icon
          name={icon}
          size={16}
        />
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-sm font-black ${
          tone === 'amber'
            ? 'text-amber-700 dark:text-amber-300'
            : ''
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function MiniValueCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-amber-100 bg-white/80 p-3 dark:border-amber-900/30 dark:bg-slate-900/70">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black">
        {value}
      </p>
    </div>
  )
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  step,
  required = false,
  autoFocus = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  min?: string
  step?: string
  required?: boolean
  autoFocus?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        min={min}
        step={step}
        required={required}
        autoFocus={autoFocus}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950"
      />
    </div>
  )
}

function renderFormTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold">
        {label}
        <span className="ml-1 font-normal text-slate-400">
          (optional)
        </span>
      </label>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        rows={3}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950"
      />
    </div>
  )
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  )
}

function PaymentStatusBadge(
  props: Parameters<typeof renderPaymentStatusBadge>[0],
) {
  return (
    <SalesTranslation>
      {renderPaymentStatusBadge(props)}
    </SalesTranslation>
  )
}

function InfoCard(
  props: Parameters<typeof renderInfoCard>[0],
) {
  return (
    <SalesTranslation>
      {renderInfoCard(props)}
    </SalesTranslation>
  )
}

function FormTextarea(
  props: Parameters<typeof renderFormTextarea>[0],
) {
  return (
    <SalesTranslation>
      {renderFormTextarea(props)}
    </SalesTranslation>
  )
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

type IconName =
  | 'sales'
  | 'money'
  | 'profit'
  | 'warning'
  | 'users'
  | 'plus'
  | 'check'
  | 'eye'
  | 'calendar'
  | 'package'
  | 'box'
  | 'search'
  | 'arrow'
  | 'calculator'
  | 'trash'
  | 'edit'
  | 'info'
  | 'clock'

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
    case 'sales':
      return (
        <svg {...common}>
          <path d="M4 19V9" />
          <path d="M10 19V5" />
          <path d="M16 19v-7" />
          <path d="M22 19H2" />
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

    case 'profit':
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M6 16V9" />
          <path d="M12 16V5" />
          <path d="M18 16v-4" />
          <path d="m5 7 4-3 4 2 5-4" />
          <path d="M16 2h2v2" />
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

    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      )

    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      )

    case 'eye':
      return (
        <svg {...common}>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      )

    case 'calendar':
      return (
        <svg {...common}>
          <rect
            x="3"
            y="4.5"
            width="18"
            height="16"
            rx="2"
          />
          <path d="M8 2.5v4" />
          <path d="M16 2.5v4" />
          <path d="M3 9h18" />
        </svg>
      )

    case 'package':
      return (
        <svg {...common}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
          <path d="m4 7.5 8 4.5 8-4.5" />
          <path d="M12 12v9" />
        </svg>
      )

    case 'box':
      return (
        <svg {...common}>
          <path d="m4 7 8-4 8 4-8 4-8-4Z" />
          <path d="M4 7v10l8 4 8-4V7" />
          <path d="M12 11v10" />
        </svg>
      )

    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
      )

    case 'arrow':
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      )

    case 'calculator':
      return (
        <svg {...common}>
          <rect
            x="4"
            y="2"
            width="16"
            height="20"
            rx="2"
          />
          <path d="M8 6h8" />
          <path d="M8 10h.01" />
          <path d="M12 10h.01" />
          <path d="M16 10h.01" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
          <path d="M16 18h.01" />
        </svg>
      )

    case 'trash':
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="m9 7 1-3h4l1 3" />
          <path d="M6 7l1 14h10l1-14" />
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

    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )

    default:
      return null
  }
}
