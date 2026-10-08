'use client'

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '@/lib/supabase'
import Modal from '@/components/modal'
import { useAppPreferences } from '@/app/providers'

const PRODUCT_IMAGE_BUCKET = 'product-images'

type Supplier = {
  id: string
  name: string
  phone: string | null
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

type Purchase = {
  id: string
  supplier_id: string | null
  total_cost: number | null
  created_at: string
  purchase_date: string | null
  purchased_at: string | null
  notes: string | null
  created_by: string | null
}

type PurchaseItem = {
  id: string
  purchase_id: string
  product_type_id: string
  quantity: number
  unit_cost: number
  total_cost: number
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

type PurchaseDraftItem = {
  id: string
  product_id: string
  product_type_id: string
  productSearch: string
  typeSearch: string
  quantity: string
  unit_cost: string
}

function createRowId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`
}

function createEmptyRow(): PurchaseDraftItem {
  return {
    id: createRowId(),
    product_id: '',
    product_type_id: '',
    productSearch: '',
    typeSearch: '',
    quantity: '',
    unit_cost: '',
  }
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

export default function PurchasesPage() {
  const { t } = useAppPreferences()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [batches, setBatches] = useState<Batch[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [supplierSaving, setSupplierSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')

  const [showPurchaseModal, setShowPurchaseModal] =
    useState(false)

  const [showSupplierModal, setShowSupplierModal] =
    useState(false)

  const [showPurchaseDetails, setShowPurchaseDetails] =
    useState(false)

  const [selectedPurchase, setSelectedPurchase] =
    useState<Purchase | null>(null)

  const [selectedPurchaseItems, setSelectedPurchaseItems] =
    useState<PurchaseItem[]>([])

  const [detailsLoading, setDetailsLoading] = useState(false)

  const [supplierId, setSupplierId] = useState('')
  const [purchaseDate, setPurchaseDate] =
    useState(getToday())
  const [notes, setNotes] = useState('')

  const [supplierName, setSupplierName] = useState('')
  const [supplierPhone, setSupplierPhone] = useState('')

  const [draftItems, setDraftItems] = useState<
    PurchaseDraftItem[]
  >([])

  async function loadData() {
    setLoading(true)
    setError('')

    const [
      suppliersResult,
      productsResult,
      productTypesResult,
      purchasesResult,
      batchesResult,
    ] = await Promise.all([
      supabase
        .from('suppliers')
        .select('id, name, phone')
        .order('name', { ascending: true }),

      supabase
        .from('products')
        .select('id, name, status')
        .order('name', { ascending: true }),

      supabase
        .from('product_types')
        .select(
          'id, product_id, name, description, image_path, minimum_stock, status'
        )
        .order('name', { ascending: true }),

      supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false }),
    ])

    if (suppliersResult.error) {
      setError(suppliersResult.error.message)
      setLoading(false)
      return
    }

    if (productsResult.error) {
      setError(productsResult.error.message)
      setLoading(false)
      return
    }

    if (productTypesResult.error) {
      setError(productTypesResult.error.message)
      setLoading(false)
      return
    }

    if (purchasesResult.error) {
      setError(purchasesResult.error.message)
      setLoading(false)
      return
    }

    setSuppliers(
      (suppliersResult.data || []) as Supplier[]
    )

    setProducts(
      (productsResult.data || []) as Product[]
    )

    setProductTypes(
      (productTypesResult.data ||
        []) as ProductType[]
    )

    setPurchases(
      (purchasesResult.data || []) as Purchase[]
    )

    if (!batchesResult.error) {
      setBatches(
        (batchesResult.data || []) as Batch[]
      )
    } else {
      setBatches([])
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  function clearMessages() {
    setError('')
    setSuccess('')
  }

  function formatMoney(
    value: number | null | undefined
  ) {
    return Number(value || 0).toLocaleString()
  }

  function getSupplierName(
    id: string | null
  ) {
    if (!id) {
      return 'Unknown supplier'
    }

    const supplier = suppliers.find(
      (item) => item.id === id
    )

    return supplier?.name || 'Unknown supplier'
  }

  function getProductName(productId: string) {
    const product = products.find(
      (item) => item.id === productId
    )

    return product?.name || 'Unknown product'
  }

  function getProductType(
    productTypeId: string
  ) {
    return productTypes.find(
      (item) => item.id === productTypeId
    )
  }

  function getProductTypeName(
    productTypeId: string
  ) {
    return (
      getProductType(productTypeId)?.name ||
      'Unknown product type'
    )
  }

  function getPublicImageUrl(
    imagePath: string | null
  ) {
    if (!imagePath) {
      return null
    }

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

  function getPurchaseDate(
    purchase: Purchase
  ) {
    return (
      purchase.purchase_date ||
      purchase.purchased_at ||
      purchase.created_at
    )
  }

  function getBatchForItem(
    purchaseItemId: string
  ) {
    return batches.find(
      (batch) =>
        batch.purchase_item_id === purchaseItemId
    )
  }

  function openCreatePurchase() {
    clearMessages()

    setSupplierId('')
    setPurchaseDate(getToday())
    setNotes('')
    setDraftItems([createEmptyRow()])

    setShowPurchaseModal(true)
  }

  function closePurchaseModal() {
    if (saving) {
      return
    }

    setShowPurchaseModal(false)
    setDraftItems([])
    setSupplierId('')
    setPurchaseDate(getToday())
    setNotes('')
  }

  function addPurchaseItem() {
    setDraftItems((current) => [
      ...current,
      createEmptyRow(),
    ])
  }

  function removePurchaseItem(
    rowId: string
  ) {
    setDraftItems((current) => {
      if (current.length <= 1) {
        return [createEmptyRow()]
      }

      return current.filter(
        (row) => row.id !== rowId
      )
    })
  }

  function updatePurchaseItem(
    rowId: string,
    field:
      | 'productSearch'
      | 'typeSearch'
      | 'quantity'
      | 'unit_cost',
    value: string
  ) {
    setDraftItems((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    )
  }

  function selectProduct(
    rowId: string,
    product: Product
  ) {
    setDraftItems((current) =>
      current.map((row) => {
        if (row.id !== rowId) {
          return row
        }

        return {
          ...row,
          product_id: product.id,
          product_type_id: '',
          productSearch: product.name,
          typeSearch: '',
        }
      })
    )
  }

  function selectProductType(
    rowId: string,
    productType: ProductType
  ) {
    setDraftItems((current) =>
      current.map((row) => {
        if (row.id !== rowId) {
          return row
        }

        return {
          ...row,
          product_id: productType.product_id,
          product_type_id: productType.id,
          productSearch: getProductName(
            productType.product_id
          ),
          typeSearch: productType.name,
        }
      })
    )
  }

  const draftTotal = useMemo(() => {
    return draftItems.reduce((total, item) => {
      const quantity = Number(item.quantity)
      const unitCost = Number(item.unit_cost)

      if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(unitCost)
      ) {
        return total
      }

      return total + quantity * unitCost
    }, 0)
  }, [draftItems])

  const filteredPurchases = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    if (!query) {
      return purchases
    }

    return purchases.filter((purchase) => {
      const supplier = getSupplierName(
        purchase.supplier_id
      ).toLowerCase()

      const id = purchase.id.toLowerCase()

      const purchaseNotes = (
        purchase.notes || ''
      ).toLowerCase()

      return (
        supplier.includes(query) ||
        id.includes(query) ||
        purchaseNotes.includes(query)
      )
    })
  }, [purchases, suppliers, search])

  async function handleCreateSupplier(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    clearMessages()

    const cleanName = supplierName.trim()
    const cleanPhone = supplierPhone.trim()

    if (!cleanName) {
      setError('Supplier name is required.')
      return
    }

    setSupplierSaving(true)

    /*
     * IMPORTANT:
     * suppliers.status does not exist in this database.
     * Therefore we only insert the columns we know exist.
     */
    const result = await supabase
      .from('suppliers')
      .insert({
        name: cleanName,
        phone: cleanPhone || null,
      })
      .select('id, name, phone')
      .single()

    if (result.error) {
      setError(result.error.message)
      setSupplierSaving(false)
      return
    }

    const newSupplier =
      result.data as Supplier

    setSuppliers((current) =>
      [...current, newSupplier].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    )

    setSupplierId(newSupplier.id)

    setSupplierName('')
    setSupplierPhone('')
    setShowSupplierModal(false)

    setSuccess(
      'Supplier created and selected successfully.'
    )

    setSupplierSaving(false)
  }

  function openSupplierModal() {
    clearMessages()
    setSupplierName('')
    setSupplierPhone('')
    setShowSupplierModal(true)
  }

  function closeSupplierModal() {
    if (supplierSaving) {
      return
    }

    setShowSupplierModal(false)
    setSupplierName('')
    setSupplierPhone('')
  }

  async function handleCreatePurchase(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    clearMessages()

    if (!supplierId) {
      setError('Please select a supplier.')
      return
    }

    if (!purchaseDate) {
      setError('Please select a purchase date.')
      return
    }

    if (draftItems.length === 0) {
      setError('Please add at least one purchase item.')
      return
    }

    const preparedItems: Array<{
      product_type_id: string
      quantity: number
      unit_cost: number
    }> = []

    for (const item of draftItems) {
      const quantity = Number(item.quantity)
      const unitCost = Number(item.unit_cost)

      if (!item.product_type_id) {
        setError(
          'Please select a Product Type / Kind for every item.'
        )
        return
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        setError(
          'Every quantity must be greater than 0.'
        )
        return
      }

      if (
        !Number.isFinite(unitCost) ||
        unitCost < 0
      ) {
        setError(
          'Every supply cost must be 0 or greater.'
        )
        return
      }

      preparedItems.push({
        product_type_id: item.product_type_id,
        quantity,
        unit_cost: unitCost,
      })
    }

    setSaving(true)

    /*
     * KEEPING THE WORKING NEW RPC.
     * No database/business logic change here.
     */
    const rpcResult = await (supabase.rpc as any)(
      'create_purchase',
      {
        p_supplier_id: supplierId,
        p_purchase_date: purchaseDate,
        p_notes: notes.trim() || null,
        p_items: preparedItems,
      }
    )

    if (rpcResult.error) {
      setError(rpcResult.error.message)
      setSaving(false)
      return
    }

    setShowPurchaseModal(false)

    setSupplierId('')
    setPurchaseDate(getToday())
    setNotes('')
    setDraftItems([])

    setSuccess(
      'Purchase created successfully.'
    )

    await loadData()

    setSaving(false)
  }

  async function openPurchaseDetails(
    purchase: Purchase
  ) {
    clearMessages()

    setSelectedPurchase(purchase)
    setSelectedPurchaseItems([])
    setDetailsLoading(true)
    setShowPurchaseDetails(true)

    const result = await supabase
      .from('purchase_items')
      .select(
        'id, purchase_id, product_type_id, quantity, unit_cost, total_cost'
      )
      .eq('purchase_id', purchase.id)
      .order('id', { ascending: true })

    if (result.error) {
      setError(result.error.message)
      setDetailsLoading(false)
      return
    }

    setSelectedPurchaseItems(
      (result.data || []) as PurchaseItem[]
    )

    setDetailsLoading(false)
  }

  function closePurchaseDetails() {
    setShowPurchaseDetails(false)
    setSelectedPurchase(null)
    setSelectedPurchaseItems([])
  }

  return (
    <section className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Inventory
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              Purchases
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Record supplies, create batches, and keep
              every supply cost connected to the exact
              product type.
            </p>
          </div>

          {/* UPDATED CREATE BUTTON */}
          <button
            type="button"
            onClick={openCreatePurchase}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            + Add Purchase
          </button>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            {success}
          </div>
        )}

        {/* SEARCH */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                Purchase History
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {purchases.length} purchase
                {purchases.length === 1 ? '' : 's'}
              </p>
            </div>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search purchases..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white lg:max-w-sm"
            />
          </div>
        </div>

        {/* PURCHASE TABLE */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:hidden">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Swipe horizontally to see all columns.
            </p>
          </div>

          <div className="w-full overflow-x-auto overscroll-x-contain">
            <table className="min-w-[1100px] w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Purchase
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Supplier / Supply Name
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Purchase Date
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Batch
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Total Cost
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      Loading purchases...
                    </td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center"
                    >
                      <p className="font-semibold text-slate-800 dark:text-white">
                        No purchases found
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Add your first purchase to see
                        it here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(
                    (purchase) => (
                      <tr
                        key={purchase.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <p className="font-bold text-slate-900 dark:text-white">
                            #{purchase.id.slice(0, 8)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {getSupplierName(
                              purchase.supplier_id
                            )}
                          </p>

                          {purchase.notes && (
                            <p className="mt-1 max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
                              {purchase.notes}
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {new Date(
                            getPurchaseDate(
                              purchase
                            )
                          ).toLocaleDateString()}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex whitespace-nowrap rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                            Batch created
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-900 dark:text-white">
                          {formatMoney(
                            purchase.total_cost
                          )}{' '}
                          RWF
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                void openPurchaseDetails(
                                  purchase
                                )
                              }
                              className="whitespace-nowrap rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950"
                            >
                              View Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= CREATE PURCHASE ================= */}
      <Modal
        open={showPurchaseModal}
        onClose={closePurchaseModal}
        title="Create Purchase"
        description="Choose the supplier, then add the products and exact product types being supplied."
        size="xl"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={closePurchaseModal}
              disabled={saving}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            {/* UPDATED BUTTON */}
            <button
              type="submit"
              form="purchase-form"
              disabled={saving}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? 'Creating Purchase...'
                : 'Create Purchase'}
            </button>
          </div>
        }
      >
        <form
          id="purchase-form"
          onSubmit={handleCreatePurchase}
          className="space-y-6"
        >
          {/* SUPPLIER + DATE */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                Supplier / Supply Name
              </label>

              <div className="flex gap-2">
                <select
                  value={supplierId}
                  onChange={(event) =>
                    setSupplierId(
                      event.target.value
                    )
                  }
                  required
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">
                    Select supplier
                  </option>

                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.id}
                      value={supplier.id}
                    >
                      {supplier.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={openSupplierModal}
                  className="shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
                >
                  + Add New
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                Purchase Date
              </label>

              <input
                type="date"
                value={purchaseDate}
                onChange={(event) =>
                  setPurchaseDate(
                    event.target.value
                  )
                }
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* ITEMS */}
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Purchase Items
                </h3>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Product → Product Type / Kind →
                  Quantity → Supply Cost
                </p>
              </div>

              <button
                type="button"
                onClick={addPurchaseItem}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                + Add Item
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {draftItems.map(
                (item, index) => {
                  const selectedType =
                    getProductType(
                      item.product_type_id
                    )

                  const productQuery =
                    item.productSearch
                      .trim()
                      .toLowerCase()

                  const typeQuery =
                    item.typeSearch
                      .trim()
                      .toLowerCase()

                  const matchingProducts =
                    products
                      .filter(
                        (product) =>
                          product.status ===
                            'active' &&
                          product.name
                            .toLowerCase()
                            .includes(
                              productQuery
                            )
                      )
                      .slice(0, 20)

                  const matchingTypes =
                    productTypes
                      .filter(
                        (type) =>
                          type.status ===
                            'active' &&
                          type.product_id ===
                            item.product_id &&
                          type.name
                            .toLowerCase()
                            .includes(
                              typeQuery
                            )
                      )
                      .slice(0, 30)

                  const quantity = Number(
                    item.quantity
                  )

                  const unitCost = Number(
                    item.unit_cost
                  )

                  const lineTotal =
                    Number.isFinite(quantity) &&
                    Number.isFinite(unitCost)
                      ? quantity * unitCost
                      : 0

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                    >
                      {/* ITEM HEADER */}
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Item {index + 1}
                          </span>

                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            This purchase item will create
                            its own batch.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removePurchaseItem(
                              item.id
                            )
                          }
                          title="Remove item"
                          aria-label="Remove item"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200 text-lg font-bold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          ×
                        </button>
                      </div>

                      <div className="grid gap-5 lg:grid-cols-2">
                        {/* PRODUCT */}
                        <div>
                          <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">
                            1. Product
                          </label>

                          <input
                            value={
                              item.productSearch
                            }
                            onChange={(event) => {
                              const value =
                                event.target
                                  .value

                              setDraftItems(
                                (current) =>
                                  current.map(
                                    (row) =>
                                      row.id ===
                                      item.id
                                        ? {
                                            ...row,
                                            productSearch:
                                              value,
                                            product_id:
                                              '',
                                            product_type_id:
                                              '',
                                            typeSearch:
                                              '',
                                          }
                                        : row
                                  )
                              )
                            }}
                            placeholder="Search product..."
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />

                          <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
                            {matchingProducts.length ===
                            0 ? (
                              <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                No products found.
                              </p>
                            ) : (
                              matchingProducts.map(
                                (product) => (
                                  <button
                                    key={
                                      product.id
                                    }
                                    type="button"
                                    onClick={() =>
                                      selectProduct(
                                        item.id,
                                        product
                                      )
                                    }
                                    className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition last:border-0 hover:bg-indigo-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                                  >
                                    {product.name}
                                  </button>
                                )
                              )
                            )}
                          </div>
                        </div>

                        {/* PRODUCT TYPE */}
                        <div>
                          <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">
                            2. Product Type / Kind
                          </label>

                          {!item.product_id ? (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              Select a product first.
                            </div>
                          ) : (
                            <>
                              <input
                                value={
                                  item.typeSearch
                                }
                                onChange={(
                                  event
                                ) =>
                                  updatePurchaseItem(
                                    item.id,
                                    'typeSearch',
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="Search product type / kind..."
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                              />

                              <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
                                {matchingTypes.length ===
                                0 ? (
                                  <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                    No product types
                                    found.
                                  </p>
                                ) : (
                                  matchingTypes.map(
                                    (type) => {
                                      const imageUrl =
                                        getPublicImageUrl(
                                          type.image_path
                                        )

                                      return (
                                        <button
                                          key={
                                            type.id
                                          }
                                          type="button"
                                          onClick={() =>
                                            selectProductType(
                                              item.id,
                                              type
                                            )
                                          }
                                          className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition last:border-0 hover:bg-indigo-50 dark:border-slate-800 dark:hover:bg-slate-800"
                                        >
                                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                                            {imageUrl ? (
                                              <img
                                                src={
                                                  imageUrl
                                                }
                                                alt={
                                                  type.name
                                                }
                                                className="h-full w-full object-cover"
                                              />
                                            ) : (
                                              <div className="flex h-full w-full items-center justify-center text-xl">
                                                📦
                                              </div>
                                            )}
                                          </div>

                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                              {
                                                type.name
                                              }
                                            </p>

                                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                              {getProductName(
                                                type.product_id
                                              )}
                                            </p>
                                          </div>
                                        </button>
                                      )
                                    }
                                  )
                                )}
                              </div>
                            </>
                          )}

                          {/* SELECTED TYPE */}
                          {selectedType && (
                            <div className="mt-3 flex items-center gap-3 rounded-xl bg-indigo-50 p-3 dark:bg-indigo-950/30">
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-indigo-100 bg-white dark:border-indigo-900 dark:bg-slate-950">
                                {getPublicImageUrl(
                                  selectedType.image_path
                                ) ? (
                                  <img
                                    src={
                                      getPublicImageUrl(
                                        selectedType.image_path
                                      ) || ''
                                    }
                                    alt={
                                      selectedType.name
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xl">
                                    📦
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                                  Selected Type / Kind
                                </p>

                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                  {
                                    selectedType.name
                                  }
                                </p>

                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {getProductName(
                                    selectedType.product_id
                                  )}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* QUANTITY */}
                        <div>
                          <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">
                            3. Quantity
                          </label>

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              updatePurchaseItem(
                                item.id,
                                'quantity',
                                event.target.value
                              )
                            }
                            placeholder="Enter quantity"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                        </div>

                        {/* UNIT COST */}
                        <div>
                          <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">
                            4. Unit Supply Cost
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.unit_cost}
                            onChange={(event) =>
                              updatePurchaseItem(
                                item.id,
                                'unit_cost',
                                event.target.value
                              )
                            }
                            placeholder="RWF per item"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* LINE SUMMARY */}
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Batch
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                            Automatically created
                          </p>

                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            The supply cost stays connected
                            to this batch.
                          </p>
                        </div>

                        <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/30">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                            Item Total
                          </p>

                          <p className="mt-1 text-lg font-bold text-indigo-700 dark:text-indigo-300">
                            {formatMoney(
                              lineTotal
                            )}{' '}
                            RWF
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </div>

          {/* NOTES */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              rows={3}
              placeholder="Optional purchase notes..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* GRAND TOTAL */}
          <div className="rounded-2xl bg-indigo-600 p-5 text-white shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-indigo-100">
                Purchase Total
              </span>

              <span className="text-xl font-bold">
                {formatMoney(draftTotal)} RWF
              </span>
            </div>
          </div>
        </form>
      </Modal>

      {/* ================= ADD SUPPLIER ================= */}
      <Modal
        open={showSupplierModal}
        onClose={closeSupplierModal}
        title="Add New Supplier"
        description="Create the supplier here and it will automatically be selected for this purchase."
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={closeSupplierModal}
              disabled={supplierSaving}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="supplier-form"
              disabled={supplierSaving}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {supplierSaving
                ? 'Creating...'
                : 'Create Supplier'}
            </button>
          </div>
        }
      >
        <form
          id="supplier-form"
          onSubmit={handleCreateSupplier}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Supplier Name
            </label>

            <input
              value={supplierName}
              onChange={(event) =>
                setSupplierName(
                  event.target.value
                )
              }
              placeholder="Enter supplier name"
              autoFocus
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Phone
            </label>

            <input
              value={supplierPhone}
              onChange={(event) =>
                setSupplierPhone(
                  event.target.value
                )
              }
              placeholder="Optional phone number"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </form>
      </Modal>

      {/* ================= PURCHASE DETAILS ================= */}
      <Modal
        open={
          showPurchaseDetails &&
          selectedPurchase !== null
        }
        onClose={closePurchaseDetails}
        title="Purchase Details"
        description={
          selectedPurchase
            ? `Purchase #${selectedPurchase.id.slice(
                0,
                8
              )}`
            : ''
        }
        size="xl"
        footer={
          <button
            type="button"
            onClick={closePurchaseDetails}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            Close
          </button>
        }
      >
        {selectedPurchase && (
          <div className="space-y-6">
            {/* SUMMARY */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Supplier / Supply Name
                </p>

                <p className="mt-1 break-words text-sm font-bold text-slate-900 dark:text-white">
                  {getSupplierName(
                    selectedPurchase.supplier_id
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Purchase Date
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {new Date(
                    getPurchaseDate(
                      selectedPurchase
                    )
                  ).toLocaleDateString()}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Items
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {selectedPurchaseItems.length}
                </p>
              </div>

              <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/30">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                  Purchase Total
                </p>

                <p className="mt-1 text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  {formatMoney(
                    selectedPurchase.total_cost
                  )}{' '}
                  RWF
                </p>
              </div>
            </div>

            {/* NOTES */}
            {selectedPurchase.notes && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Notes
                </p>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {selectedPurchase.notes}
                </p>
              </div>
            )}

            {/* DETAILS TABLE */}
            <div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Purchase Items
                </h3>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Each item is connected to its exact
                  product type, batch, quantity and supply
                  cost.
                </p>
              </div>

              {detailsLoading ? (
                <div className="mt-4 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500 dark:bg-slate-800">
                  Loading purchase details...
                </div>
              ) : selectedPurchaseItems.length ===
                0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
                  No purchase items found.
                </div>
              ) : (
                <>
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800 sm:hidden">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Swipe horizontally to see all
                      details.
                    </p>
                  </div>

                  <div className="mt-4 w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="min-w-[1150px] w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Batch
                          </th>

                          <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Product Type / Kind
                          </th>

                          <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Product
                          </th>

                          {/* EXPLICIT CAPTION */}
                          <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Quantity
                          </th>

                          {/* EXPLICIT CAPTION */}
                          <th className="whitespace-nowrap px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Unit Supply Cost
                          </th>

                          {/* EXPLICIT CAPTION */}
                          <th className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                            Total Cost
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {selectedPurchaseItems.map(
                          (item) => {
                            const batch =
                              getBatchForItem(
                                item.id
                              )

                            const productType =
                              getProductType(
                                item.product_type_id
                              )

                            const imageUrl =
                              getPublicImageUrl(
                                productType?.image_path ||
                                  null
                              )

                            return (
                              <tr
                                key={item.id}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              >
                                {/* BATCH */}
                                <td className="px-4 py-4">
                                  <p className="whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">
                                    {batch?.batch_number ||
                                      'Batch'}
                                  </p>

                                  {batch && (
                                    <p className="mt-1 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                                      Remaining:{' '}
                                      {
                                        batch.remaining_quantity
                                      }
                                    </p>
                                  )}
                                </td>

                                {/* PRODUCT TYPE */}
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                                      {imageUrl ? (
                                        <img
                                          src={
                                            imageUrl
                                          }
                                          alt={
                                            productType?.name ||
                                            ''
                                          }
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-lg">
                                          📦
                                        </div>
                                      )}
                                    </div>

                                    <p className="whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">
                                      {getProductTypeName(
                                        item.product_type_id
                                      )}
                                    </p>
                                  </div>
                                </td>

                                {/* PRODUCT */}
                                <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                  {productType
                                    ? getProductName(
                                        productType.product_id
                                      )
                                    : 'Unknown product'}
                                </td>

                                {/* QUANTITY */}
                                <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {item.quantity}
                                </td>

                                {/* UNIT SUPPLY COST */}
                                <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {formatMoney(
                                    item.unit_cost
                                  )}{' '}
                                  RWF
                                </td>

                                {/* TOTAL COST */}
                                <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                                  {formatMoney(
                                    item.total_cost
                                  )}{' '}
                                  RWF
                                </td>
                              </tr>
                            )
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}