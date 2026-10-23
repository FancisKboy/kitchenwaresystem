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
  const date = new Date()
  const offset = date.getTimezoneOffset()

  return new Date(
    date.getTime() - offset * 60_000
  )
    .toISOString()
    .slice(0, 10)
}

function Icon({
  name,
  className = 'h-4 w-4',
}: {
  name:
    | 'plus'
    | 'search'
    | 'edit'
    | 'eye'
    | 'calendar'
    | 'truck'
    | 'package'
    | 'receipt'
    | 'arrow'
    | 'close'
    | 'save'
    | 'chevron'
    | 'check'
    | 'refresh'
  className?: string
}) {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    viewBox: '0 0 24 24',
  }

  switch (name) {
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )

    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      )

    case 'edit':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      )

    case 'eye':
      return (
        <svg {...common}>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      )

    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17" />
        </svg>
      )

    case 'truck':
      return (
        <svg {...common}>
          <path d="M3 6h11v10H3z" />
          <path d="M14 9h4l3 3v4h-7z" />
          <circle cx="7" cy="17" r="1.8" />
          <circle cx="18" cy="17" r="1.8" />
        </svg>
      )

    case 'package':
      return (
        <svg {...common}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" />
          <path d="m4.5 7.5 7.5 4 7.5-4M12 21v-9.5" />
          <path d="M8.5 5 16 9" />
        </svg>
      )

    case 'receipt':
      return (
        <svg {...common}>
          <path d="M6 3.5h12v17l-2.5-1.5-3 1.5-3-1.5L7 20.5 6 20V3.5Z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      )

    case 'arrow':
      return (
        <svg {...common}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      )

    case 'close':
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      )

    case 'save':
      return (
        <svg {...common}>
          <path d="M5 3.5h11l3 3v14H5z" />
          <path d="M8 3.5v5h7v-5M8 20.5v-6h8v6" />
        </svg>
      )

    case 'chevron':
      return (
        <svg {...common}>
          <path d="m7 9 5 5 5-5" />
        </svg>
      )

    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4 10-10" />
        </svg>
      )

    case 'refresh':
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14.7-4.2L3 9" />
          <path d="M3 4v5h5" />
          <path d="M4 13a8 8 0 0 0 14.7 4.2L21 15" />
          <path d="M21 20v-5h-5" />
        </svg>
      )

    default:
      return null
  }
}

function ImageFallback({
  imageUrl,
  alt,
  size = 'md',
}: {
  imageUrl: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClass =
    size === 'sm'
      ? 'h-10 w-10 text-base'
      : size === 'lg'
        ? 'h-16 w-16 text-2xl'
        : 'h-12 w-12 text-lg'

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span>📦</span>
        </div>
      )}
    </div>
  )
}

const PURCHASE_TRANSLATIONS: Record<string, string> = {
  "Inventory Operations": "Imikorere y’Ububiko",
  "Purchases": "Ibyaguzwe",
  "Record incoming supplies, create exact inventory batches, and keep every supply cost connected to the correct Product Type / Kind.": "Andika ibicuruzwa byinjiye, ushyireho ibyiciro nyabyo by’ububiko, kandi ugumishe buri giciro cyo gutanga gihuye n’ubwoko bw’igicuruzwa nyabwo.",
  "Add Purchase": "Ongeraho Ibyaguzwe",
  "Total Purchases": "Ibyaguzwe Byose",
  "Supplied Units": "Ibice Byatanzwe",
  "Purchase Value": "Agaciro k’Ibyaguzwe",
  "Purchase History": "Amateka y’Ibyaguzwe",
  "matching purchase": "icyaguzwe gihuye",
  "matching purchases": "ibyaguzwe bihuye",
  "Search supplier, purchase ID, or notes...": "Shakisha utanga ibicuruzwa, nomero y’ibyaguzwe cyangwa inyandiko...",
  "Records": "Inyandiko",
  "Incoming supply history": "Amateka y’ibicuruzwa byinjiye",
  "Refresh": "Vugurura",
  "Swipe horizontally to see all columns.": "Sunikira ku ruhande kugira ngo urebe inkingi zose.",
  "Purchase": "Ibyaguzwe",
  "Supplier / Supply Name": "Utanga ibicuruzwa / Izina",
  "Purchase Date": "Itariki yo Kugura",
  "Batch": "Icyiciro",
  "Total Cost": "Igiciro Cyose",
  "Edit": "Hindura",
  "Action": "Igikorwa",
  "Loading purchases...": "Birimo gufungura ibyaguzwe...",
  "No purchases found": "Nta byaguzwe byabonetse",
  "Try another search or add your first purchase.": "Gerageza irindi jambo ushakisha cyangwa wongereho icyaguzwe cya mbere.",
  "Purchase time": "Isaha yo kugura",
  "Batch created": "Icyiciro cyashyizweho",
  "Edit purchase": "Hindura ibyaguzwe",
  "View Details": "Reba Ibisobanuro",
  "Create Purchase": "Kora Ibyaguzwe",
  "Choose the supplier, then search and add the exact products and product types being supplied.": "Hitamo utanga ibicuruzwa, hanyuma ushakishe wongereho ibicuruzwa n’ubwoko nyabwo butangwa.",
  "Cancel": "Bireke",
  "Creating Purchase...": "Birimo gukora ibyaguzwe...",
  "Purchase Setup": "Itegurwa ry’Ibyaguzwe",
  "Supply Information": "Amakuru y’Itangwa",
  "Select supplier": "Hitamo utanga ibicuruzwa",
  "+ Add New": "+ Ongeraho Mushya",
  "Batch-based costing": "Igiciro gishingiye ku byiciro",
  "Exact supply price": "Igiciro nyacyo cyo gutanga",
  "Purchase Items": "Ibyaguzwe (Ibicuruzwa)",
  "Search Product → choose Product Type / Kind → Quantity → Supply Cost": "Shakisha Igicuruzwa → hitamo Ubwoko bw’Igicuruzwa → Ingano → Igiciro cyo Gutanga",
  "Add Item": "Ongeraho Igicuruzwa",
  "Purchase Item": "Igicuruzwa Cyaguzwe",
  "This item creates its own inventory batch.": "Iki gicuruzwa kigira icyiciro cyacyo mu bubiko.",
  "Remove item": "Kuraho igicuruzwa",
  "1. Product": "1. Igicuruzwa",
  "Change": "Hindura",
  "Search product...": "Shakisha igicuruzwa...",
  "No active products found.": "Nta bicuruzwa bikora byabonetse.",
  "Product": "Igicuruzwa",
  "Selected Product": "Igicuruzwa Cyatoranyijwe",
  "2. Product Type / Kind": "2. Ubwoko bw’Igicuruzwa",
  "Select a product first.": "Banza uhitemo igicuruzwa.",
  "Search product type / kind...": "Shakisha ubwoko bw’igicuruzwa...",
  "No product types found for this product.": "Nta bwoko bw’igicuruzwa bwabonetse kuri iki gicuruzwa.",
  "Product Type / Kind": "Ubwoko bw’Igicuruzwa",
  "Selected Type / Kind": "Ubwoko Bwatoranyijwe",
  "3. Quantity": "3. Ingano",
  "Enter quantity": "Andika ingano",
  "4. Unit Supply Cost": "4. Igiciro cyo Gutanga ku Gice",
  "RWF per item": "RWF ku gice",
  "Automatically created": "Gishyirwaho mu buryo bwikora",
  "The supply cost remains connected to the exact batch created by this purchase.": "Igiciro cyo gutanga gikomeza guhuzwa n’icyiciro nyacyo cyashyizweho n’iki cyaguzwe.",
  "Item Total": "Igiteranyo cy’Igicuruzwa",
  "Quantity × unit supply cost": "Ingano × igiciro cyo gutanga ku gice",
  "Notes": "Inyandiko",
  "Optional purchase notes...": "Inyandiko z’ibyaguzwe (si ngombwa)...",
  "Purchase Total": "Igiteranyo cy’Ibyaguzwe",
  "Total supply value for this purchase.": "Agaciro kose k’ibyatanzwe kuri iki cyaguzwe.",
  "Add New Supplier": "Ongeraho Utanga Ibicuruzwa Mushya",
  "Create the supplier here and it will automatically be selected for this purchase.": "Kora utanga ibicuruzwa hano, kandi azahita atoranywa kuri iki cyaguzwe.",
  "Creating...": "Birimo gukora...",
  "Create Supplier": "Kora Utanga Ibicuruzwa",
  "Supplier Name": "Izina ry’Utanga Ibicuruzwa",
  "Enter supplier name": "Andika izina ry’utanga ibicuruzwa",
  "Phone": "Telefoni",
  "Optional phone number": "Nomero ya telefoni (si ngombwa)",
  "Edit Purchase": "Hindura Ibyaguzwe",
  "Purchase Details": "Ibisobanuro by’Ibyaguzwe",
  "Cancel Edit": "Reka Guhindura",
  "Saving...": "Birimo kubika...",
  "Save Changes": "Bika Impinduka",
  "Close": "Funga",
  "Purchase Header": "Umutwe w’Ibyaguzwe",
  "Edit Purchase Information": "Hindura Amakuru y’Ibyaguzwe",
  "Supplier, date and notes can be updated safely here. Existing purchase items and batches remain unchanged.": "Utanga ibicuruzwa, itariki n’inyandiko bishobora guhindurwa hano nta nkomyi. Ibicuruzwa n’ibyiciro bisanzweho ntibihinduka.",
  "Supplier": "Utanga ibicuruzwa",
  "Items": "Ibicuruzwa",
  "Each item is connected to its exact product type, batch, quantity and supply cost.": "Buri gicuruzwa gihujwe n’ubwoko bwacyo nyabwo, icyiciro, ingano n’igiciro cyo gutanga.",
  "Inventory batches locked": "Ibyiciro by’ububiko birafunze",
  "Loading purchase details...": "Birimo gufungura ibisobanuro by’ibyaguzwe...",
  "No purchase items found.": "Nta bicuruzwa byaguzwe byabonetse.",
  "Swipe horizontally to see all details.": "Sunikira ku ruhande kugira ngo urebe ibisobanuro byose.",
  "Quantity": "Ingano",
  "Unit Supply Cost": "Igiciro cyo Gutanga ku Gice",
  "Remaining:": "Hasigaye:",
  "Unknown supplier": "Utanga ibicuruzwa utazwi",
  "Unknown product": "Igicuruzwa kitazwi",
  "Unknown product type": "Ubwoko butazwi",
  "Supplier name is required.": "Izina ry’utanga ibicuruzwa rirakenewe.",
  "Supplier created and selected successfully.": "Utanga ibicuruzwa yakozwe kandi yatoranyijwe neza.",
  "Please select a supplier.": "Nyamuneka hitamo utanga ibicuruzwa.",
  "Please select a purchase date.": "Nyamuneka hitamo itariki yo kugura.",
  "Please add at least one purchase item.": "Nyamuneka ongeraho nibura igicuruzwa kimwe cyaguzwe.",
  "Please select a Product Type / Kind for every item.": "Nyamuneka hitamo ubwoko bw’igicuruzwa kuri buri gicuruzwa.",
  "Every quantity must be greater than 0.": "Buri ngano igomba kuba irenze 0.",
  "Every supply cost must be 0 or greater.": "Buri giciro cyo gutanga kigomba kuba 0 cyangwa kirenga.",
  "Purchase created successfully.": "Ibyaguzwe byakozwe neza.",
  "Purchase information updated successfully.": "Amakuru y’ibyaguzwe yavuguruwe neza.",
}

function translatePurchases(text: string, isRw: boolean) {
  if (!isRw) {
    return text
  }

  return Object.prototype.hasOwnProperty.call(
    PURCHASE_TRANSLATIONS,
    text
  )
    ? PURCHASE_TRANSLATIONS[text]
    : text
}

export default function PurchasesPage() {
  const { t } = useAppPreferences()

  const isRw =
    t('inventory').trim().toLowerCase() !==
    'inventory'

  const tx = (text: string) =>
    translatePurchases(text, isRw)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [batches, setBatches] = useState<Batch[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [supplierSaving, setSupplierSaving] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')

  const [showPurchaseModal, setShowPurchaseModal] =
    useState(false)

  const [openProductRow, setOpenProductRow] =
    useState<string | null>(null)

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

  const [editingPurchase, setEditingPurchase] =
    useState(false)

  const [editSupplierId, setEditSupplierId] =
    useState('')

  const [editPurchaseDate, setEditPurchaseDate] =
    useState(getToday())

  const [editNotes, setEditNotes] = useState('')

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
      return tx('Unknown supplier')
    }

    const supplier = suppliers.find(
      (item) => item.id === id
    )

    return supplier?.name || tx('Unknown supplier')
  }

  function getProductName(productId: string) {
    const product = products.find(
      (item) => item.id === productId
    )

    return product?.name || tx('Unknown product')
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
      tx('Unknown product type')
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

  function getPurchaseDateInput(
    purchase: Purchase
  ) {
    const value = getPurchaseDate(purchase)

    if (!value) {
      return getToday()
    }

    return value.slice(0, 10)
  }

  function formatPurchaseTime(
    purchase: Purchase
  ) {
    const date = new Date(
      purchase.created_at ||
        getPurchaseDate(purchase)
    )

    if (Number.isNaN(date.getTime())) {
      return '—'
    }

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
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

  function clearSelectedProduct(
    rowId: string
  ) {
    setDraftItems((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              product_id: '',
              product_type_id: '',
              productSearch: '',
              typeSearch: '',
            }
          : row
      )
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

  function clearSelectedProductType(
    rowId: string
  ) {
    setDraftItems((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              product_type_id: '',
              typeSearch: '',
            }
          : row
      )
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

  const activeProducts = useMemo(() => {
    return products.filter(
      (product) => product.status === 'active'
    )
  }, [products])

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

  const totalPurchaseValue = useMemo(() => {
    return purchases.reduce(
      (total, purchase) =>
        total + Number(purchase.total_cost || 0),
      0
    )
  }, [purchases])

  const totalPurchaseItems = useMemo(() => {
    return batches.reduce(
      (total, batch) =>
        total + Number(batch.original_quantity || 0),
      0
    )
  }, [batches])

  async function handleCreateSupplier(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    clearMessages()

    const cleanName = supplierName.trim()
    const cleanPhone = supplierPhone.trim()

    if (!cleanName) {
      setError(tx('Supplier name is required.'))
      return
    }

    setSupplierSaving(true)

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
      tx('Supplier created and selected successfully.')
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
      setError(tx('Please select a supplier.'))
      return
    }

    if (!purchaseDate) {
      setError(tx('Please select a purchase date.'))
      return
    }

    if (draftItems.length === 0) {
      setError(tx('Please add at least one purchase item.'))
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
          tx('Please select a Product Type / Kind for every item.')
        )
        return
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        setError(
          tx('Every quantity must be greater than 0.')
        )
        return
      }

      if (
        !Number.isFinite(unitCost) ||
        unitCost < 0
      ) {
        setError(
          tx('Every supply cost must be 0 or greater.')
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
      tx('Purchase created successfully.')
    )

    await loadData()

    setSaving(false)
  }

  async function openPurchaseDetails(
    purchase: Purchase,
    openEdit = false
  ) {
    clearMessages()

    setSelectedPurchase(purchase)
    setSelectedPurchaseItems([])
    setDetailsLoading(true)
    setShowPurchaseDetails(true)

    setEditingPurchase(openEdit)
    setEditSupplierId(
      purchase.supplier_id || ''
    )
    setEditPurchaseDate(
      getPurchaseDateInput(purchase)
    )
    setEditNotes(purchase.notes || '')

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
    if (editSaving) {
      return
    }

    setShowPurchaseDetails(false)
    setSelectedPurchase(null)
    setSelectedPurchaseItems([])
    setEditingPurchase(false)
  }

  function startEditingPurchase() {
    if (!selectedPurchase) {
      return
    }

    clearMessages()

    setEditSupplierId(
      selectedPurchase.supplier_id || ''
    )

    setEditPurchaseDate(
      getPurchaseDateInput(selectedPurchase)
    )

    setEditNotes(
      selectedPurchase.notes || ''
    )

    setEditingPurchase(true)
  }

  function cancelEditingPurchase() {
    if (!selectedPurchase || editSaving) {
      return
    }

    setEditSupplierId(
      selectedPurchase.supplier_id || ''
    )

    setEditPurchaseDate(
      getPurchaseDateInput(selectedPurchase)
    )

    setEditNotes(
      selectedPurchase.notes || ''
    )

    setEditingPurchase(false)
  }

  async function handleSavePurchaseEdit() {
    if (!selectedPurchase) {
      return
    }

    clearMessages()

    if (!editSupplierId) {
      setError(tx('Please select a supplier.'))
      return
    }

    if (!editPurchaseDate) {
      setError(tx('Please select a purchase date.'))
      return
    }

    setEditSaving(true)

    const result = await supabase
      .from('purchases')
      .update({
        supplier_id: editSupplierId,
        purchase_date: editPurchaseDate,
        notes: editNotes.trim() || null,
      })
      .eq('id', selectedPurchase.id)
      .select('*')
      .single()

    if (result.error) {
      setError(result.error.message)
      setEditSaving(false)
      return
    }

    const updatedPurchase =
      result.data as Purchase

    setPurchases((current) =>
      current.map((purchase) =>
        purchase.id === updatedPurchase.id
          ? updatedPurchase
          : purchase
      )
    )

    setSelectedPurchase(
      updatedPurchase
    )

    setEditingPurchase(false)
    setSuccess(
      tx('Purchase information updated successfully.')
    )

    setEditSaving(false)
  }

  return (
    <section className="min-h-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* ================= HERO ================= */}
        <div className="relative overflow-hidden rounded-[28px] bg-slate-950 p-6 shadow-xl sm:p-8">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                <Icon
                  name="truck"
                  className="h-3.5 w-3.5"
                />
                {tx("Inventory Operations")}
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                {tx("Purchases")}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                {tx("Record incoming supplies, create exact inventory batches, and keep every supply cost connected to the correct Product Type / Kind.")}
              </p>
            </div>

            <button
              type="button"
              onClick={openCreatePurchase}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400 active:scale-[0.98]"
            >
              <Icon
                name="plus"
                className="h-4 w-4"
              />
              {tx("Add Purchase")}
            </button>
          </div>

          <div className="relative z-10 mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                  <Icon
                    name="receipt"
                    className="h-5 w-5"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    {tx("Total Purchases")}
                  </p>

                  <p className="mt-1 text-xl font-black text-white">
                    {purchases.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <Icon
                    name="package"
                    className="h-5 w-5"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    {tx("Supplied Units")}
                  </p>

                  <p className="mt-1 text-xl font-black text-white">
                    {totalPurchaseItems.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                  <span className="text-sm font-black">
                    RWF
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-400">
                    {tx("Purchase Value")}
                  </p>

                  <p className="mt-1 truncate text-xl font-black text-white">
                    {formatMoney(
                      totalPurchaseValue
                    )}{' '}
                    RWF
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= MESSAGES ================= */}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            {success}
          </div>
        )}

        {/* ================= SEARCH / TOOLBAR ================= */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                  <Icon
                    name="search"
                    className="h-4 w-4"
                  />
                </div>

                <h2 className="font-black text-slate-900 dark:text-white">
                  {tx("Purchase History")}
                </h2>
              </div>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {filteredPurchases.length}{' '}
                {filteredPurchases.length === 1
                  ? tx('matching purchase')
                  : tx('matching purchases')}
              </p>
            </div>

            <div className="relative w-full xl:max-w-md">
              <Icon
                name="search"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder={tx("Search supplier, purchase ID, or notes...")}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-950 dark:focus:ring-indigo-950/30"
              />
            </div>
          </div>
        </div>

        {/* ================= PURCHASE TABLE ================= */}
        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                {tx("Records")}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                {tx("Incoming supply history")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Icon
                name="refresh"
                className={`h-3.5 w-3.5 ${
                  loading
                    ? 'animate-spin'
                    : ''
                }`}
              />
              {tx("Refresh")}
            </button>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:hidden">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {tx("Swipe horizontally to see all columns.")}
            </p>
          </div>

          <div className="w-full overflow-x-auto overscroll-x-contain">
            <table className="min-w-[1180px] w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {tx("Purchase")}
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {tx("Supplier / Supply Name")}
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {tx("Purchase Date")}
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {tx("Batch")}
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {tx("Total Cost")}
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-center text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {tx("Edit")}
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-right text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {tx("Action")}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex max-w-xs flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                          <Icon
                            name="refresh"
                            className="h-5 w-5 animate-spin"
                          />
                        </div>

                        <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                          {tx("Loading purchases...")}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <Icon
                            name="receipt"
                            className="h-6 w-6"
                          />
                        </div>

                        <p className="mt-4 font-black text-slate-800 dark:text-white">
                          {tx("No purchases found")}
                        </p>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {tx("Try another search or add your first purchase.")}
                        </p>

                        <button
                          type="button"
                          onClick={openCreatePurchase}
                          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700"
                        >
                          <Icon
                            name="plus"
                            className="h-4 w-4"
                          />
                          {tx("Add Purchase")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(
                    (purchase) => (
                      <tr
                        key={purchase.id}
                        className="group transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="whitespace-nowrap px-5 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                              <Icon
                                name="receipt"
                                className="h-4 w-4"
                              />
                            </div>

                            <div>
                              <p className="font-black tabular-nums text-slate-900 dark:text-white">
                                {formatPurchaseTime(
                                  purchase
                                )}
                              </p>

                              <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                {tx('Purchase time')}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <p className="whitespace-nowrap text-sm font-bold text-slate-800 dark:text-slate-200">
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

                        <td className="whitespace-nowrap px-5 py-5">
                          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <Icon
                              name="calendar"
                              className="h-3.5 w-3.5 text-slate-400"
                            />

                            {new Date(
                              getPurchaseDate(
                                purchase
                              )
                            ).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            {tx("Batch created")}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-5">
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            {formatMoney(
                              purchase.total_cost
                            )}{' '}
                            RWF
                          </p>
                        </td>

                        {/* EDIT BUTTON */}
                        <td className="px-5 py-5">
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() =>
                                void openPurchaseDetails(
                                  purchase,
                                  true
                                )
                              }
                              title={tx("Edit purchase")}
                              aria-label={tx("Edit purchase")}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
                            >
                              <Icon
                                name="edit"
                                className="h-4 w-4"
                              />
                            </button>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void openPurchaseDetails(
                                  purchase
                                )
                              }
                              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
                            >
                              <Icon
                                name="eye"
                                className="h-3.5 w-3.5"
                              />
                              {tx("View Details")}
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
        title={tx("Create Purchase")}
        description={tx("Choose the supplier, then search and add the exact products and product types being supplied.")}
        size="xl"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={closePurchaseModal}
              disabled={saving}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {tx("Cancel")}
            </button>

            <button
              type="submit"
              form="purchase-form"
              disabled={saving}
              className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? tx('Creating Purchase...')
                : tx('Create Purchase')}
            </button>
          </div>
        }
      >
        <form
          id="purchase-form"
          onSubmit={handleCreatePurchase}
          className="space-y-6"
        >
          {/* ================= DARK FIRST BOX ================= */}
          <div className="relative overflow-hidden rounded-[24px] bg-slate-950 p-5 shadow-lg sm:p-6">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/15 blur-2xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                  <Icon
                    name="truck"
                    className="h-5 w-5"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">
                    {tx("Purchase Setup")}
                  </p>

                  <h3 className="mt-1 text-lg font-black text-white">
                    {tx("Supply Information")}
                  </h3>
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-300">
                    {tx("Supplier / Supply Name")}
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
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-sm font-semibold text-white outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                    >
                      <option
                        value=""
                        className="bg-slate-950"
                      >
                        {tx("Select supplier")}
                      </option>

                      {suppliers.map(
                        (supplier) => (
                          <option
                            key={supplier.id}
                            value={supplier.id}
                            className="bg-slate-950"
                          >
                            {supplier.name}
                          </option>
                        )
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={
                        openSupplierModal
                      }
                      className="shrink-0 rounded-2xl border border-indigo-400/20 bg-indigo-500/15 px-3.5 text-xs font-black text-indigo-200 transition hover:bg-indigo-500/25"
                    >
                      {tx("+ Add New")}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-300">
                    {tx("Purchase Date")}
                  </label>

                  <div className="relative">
                    <Icon
                      name="calendar"
                      className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(event) =>
                        setPurchaseDate(
                          event.target.value
                        )
                      }
                      required
                      className="w-full rounded-2xl border border-white/10 bg-white/10 py-3.5 pl-11 pr-4 text-sm font-semibold text-white outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-slate-300">
                  <Icon
                    name="package"
                    className="h-3.5 w-3.5"
                  />
                  {tx("Batch-based costing")}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-slate-300">
                  <Icon
                    name="check"
                    className="h-3.5 w-3.5"
                  />
                  {tx("Exact supply price")}
                </span>
              </div>
            </div>
          </div>

          {/* ================= ITEMS ================= */}
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                    <Icon
                      name="package"
                      className="h-4 w-4"
                    />
                  </div>

                  <h3 className="font-black text-slate-900 dark:text-white">
                    {tx("Purchase Items")}
                  </h3>
                </div>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {tx("Search Product → choose Product Type / Kind → Quantity → Supply Cost")}
                </p>
              </div>

              <button
                type="button"
                onClick={addPurchaseItem}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                <Icon
                  name="plus"
                  className="h-3.5 w-3.5"
                />
                {tx("Add Item")}
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
                    activeProducts
                      .filter(
                        (product) =>
                          product.name
                            .toLowerCase()
                            .includes(
                              productQuery
                            )
                      )
                      .slice(0, 50)

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
                      .slice(0, 20)

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
                      className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5"
                    >
                      {/* ITEM HEADER */}
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-slate-600 shadow-sm dark:bg-slate-700 dark:text-slate-200">
                                {index + 1}
                              </span>
                              {tx("Purchase Item")}
                            </span>
                          </div>

                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {tx("This item creates its own inventory batch.")}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removePurchaseItem(
                              item.id
                            )
                          }
                          title={tx("Remove item")}
                          aria-label={tx("Remove item")}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          <Icon
                            name="close"
                            className="h-4 w-4"
                          />
                        </button>
                      </div>

                      <div className="grid gap-5 lg:grid-cols-2">
                        {/* ================= PRODUCT ================= */}
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <label className="block text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {tx("1. Product")}
                            </label>

                            {item.product_id && (
                              <button
                                type="button"
                                onClick={() =>
                                  clearSelectedProduct(
                                    item.id
                                  )
                                }
                                className="text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-300"
                              >
                                {tx("Change")}
                              </button>
                            )}
                          </div>

                          {!item.product_id ? (
                            <>
                              <div className="relative">
                                <Icon
                                  name="search"
                                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                  value={
                                    item.productSearch
                                  }
                                  onChange={(
                                    event
                                  ) => {
                                    const value =
                                      event.target
                                        .value

                                    setDraftItems(
                                      (
                                        current
                                      ) =>
                                        current.map(
                                          (
                                            row
                                          ) =>
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
                                  onFocus={() =>
                                    setOpenProductRow(
                                      item.id
                                    )
                                  }
                                  onBlur={() =>
                                    setOpenProductRow(
                                      (current) =>
                                        current ===
                                        item.id
                                          ? null
                                          : current
                                    )
                                  }
                                  autoComplete="off"
                                  placeholder={tx("Search product...")}
                                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950/30"
                                />
                              </div>

                              {openProductRow ===
                                item.id && (
                                <div
                                  onMouseDown={(
                                    event
                                  ) =>
                                    event.preventDefault()
                                  }
                                  className="mt-2 max-h-44 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-950"
                                >
                                  {matchingProducts.length ===
                                  0 ? (
                                    <div className="px-3 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                      {tx("No active products found.")}
                                    </div>
                                  ) : (
                                    matchingProducts.map(
                                      (product) => (
                                        <button
                                          key={
                                            product.id
                                          }
                                          type="button"
                                          onClick={() => {
                                            selectProduct(
                                              item.id,
                                              product
                                            )

                                            setOpenProductRow(
                                              null
                                            )
                                          }}
                                          className="flex w-full items-center gap-2.5 border-b border-slate-100 px-3 py-2 text-left transition last:border-0 hover:bg-indigo-50 dark:border-slate-800 dark:hover:bg-slate-800"
                                        >
                                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                            <Icon
                                              name="package"
                                              className="h-3.5 w-3.5"
                                            />
                                          </div>

                                          <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                                            {
                                              product.name
                                            }
                                          </p>

                                          <Icon
                                            name="arrow"
                                            className="h-3.5 w-3.5 shrink-0 text-slate-300"
                                          />
                                        </button>
                                      )
                                    )
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/25">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm dark:bg-slate-950 dark:text-indigo-300">
                                <Icon
                                  name="package"
                                  className="h-5 w-5"
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-500">
                                  {tx("Selected Product")}
                                </p>

                                <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">
                                  {
                                    item.productSearch
                                  }
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ================= PRODUCT TYPE ================= */}
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <label className="block text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {tx("2. Product Type / Kind")}
                            </label>

                            {item.product_type_id && (
                              <button
                                type="button"
                                onClick={() =>
                                  clearSelectedProductType(
                                    item.id
                                  )
                                }
                                className="text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-300"
                              >
                                {tx("Change")}
                              </button>
                            )}
                          </div>

                          {!item.product_id ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              {tx("Select a product first.")}
                            </div>
                          ) : !item.product_type_id ? (
                            <>
                              <div className="relative">
                                <Icon
                                  name="search"
                                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                />

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
                                  placeholder={tx("Search product type / kind...")}
                                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950/30"
                                />
                              </div>

                              <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
                                {matchingTypes.length ===
                                0 ? (
                                  <div className="px-4 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    {tx("No product types found for this product.")}
                                  </div>
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
                                          className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3.5 text-left transition last:border-0 hover:bg-indigo-50 dark:border-slate-800 dark:hover:bg-slate-800"
                                        >
                                          <ImageFallback
                                            imageUrl={
                                              imageUrl
                                            }
                                            alt={
                                              type.name
                                            }
                                            size="md"
                                          />

                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                                              {
                                                type.name
                                              }
                                            </p>

                                            <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                                              {getProductName(
                                                type.product_id
                                              )}
                                            </p>

                                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                              {tx("Product Type / Kind")}
                                            </p>
                                          </div>

                                          <Icon
                                            name="arrow"
                                            className="ml-auto h-4 w-4 shrink-0 text-slate-300"
                                          />
                                        </button>
                                      )
                                    }
                                  )
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/25">
                              <ImageFallback
                                imageUrl={getPublicImageUrl(
                                  selectedType?.image_path ||
                                    null
                                )}
                                alt={
                                  selectedType?.name ||
                                  ''
                                }
                                size="md"
                              />

                              <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-500">
                                  {tx("Selected Type / Kind")}
                                </p>

                                <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">
                                  {
                                    selectedType?.name
                                  }
                                </p>

                                <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                                  {getProductName(
                                    selectedType?.product_id ||
                                      ''
                                  )}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ================= QUANTITY ================= */}
                        <div>
                          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {tx("3. Quantity")}
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
                            placeholder={tx("Enter quantity")}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950/30"
                          />
                        </div>

                        {/* ================= UNIT COST ================= */}
                        <div>
                          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {tx("4. Unit Supply Cost")}
                          </label>

                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={
                                item.unit_cost
                              }
                              onChange={(event) =>
                                updatePurchaseItem(
                                  item.id,
                                  'unit_cost',
                                  event.target.value
                                )
                              }
                              placeholder={tx("RWF per item")}
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-16 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950/30"
                            />

                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                              RWF
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ================= LINE SUMMARY ================= */}
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                              <Icon
                                name="package"
                                className="h-4 w-4"
                              />
                            </div>

                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                              {tx("Batch")}
                            </p>
                          </div>

                          <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">
                            {tx("Automatically created")}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {tx("The supply cost remains connected to the exact batch created by this purchase.")}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-indigo-600 p-4 text-white shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-200">
                            {tx("Item Total")}
                          </p>

                          <p className="mt-2 text-2xl font-black">
                            {formatMoney(
                              lineTotal
                            )}{' '}
                            RWF
                          </p>

                          <p className="mt-1 text-xs text-indigo-100">
                            {tx("Quantity × unit supply cost")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </div>

          {/* ================= NOTES ================= */}
          <div>
            <label className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">
              {tx("Notes")}
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              rows={3}
              placeholder={tx("Optional purchase notes...")}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950/30"
            />
          </div>

          {/* ================= GRAND TOTAL ================= */}
          <div className="overflow-hidden rounded-[24px] bg-indigo-600 p-5 text-white shadow-lg sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-200">
                  {tx("Purchase Total")}
                </p>

                <p className="mt-2 text-sm text-indigo-100">
                  {tx("Total supply value for this purchase.")}
                </p>
              </div>

              <span className="text-3xl font-black">
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
        title={tx("Add New Supplier")}
        description={tx("Create the supplier here and it will automatically be selected for this purchase.")}
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={closeSupplierModal}
              disabled={supplierSaving}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {tx("Cancel")}
            </button>

            <button
              type="submit"
              form="supplier-form"
              disabled={supplierSaving}
              className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {supplierSaving
                ? tx('Creating...')
                : tx('Create Supplier')}
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
            <label className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">
              {tx("Supplier Name")}
            </label>

            <input
              value={supplierName}
              onChange={(event) =>
                setSupplierName(
                  event.target.value
                )
              }
              placeholder={tx("Enter supplier name")}
              autoFocus
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">
              {tx("Phone")}
            </label>

            <input
              value={supplierPhone}
              onChange={(event) =>
                setSupplierPhone(
                  event.target.value
                )
              }
              placeholder={tx("Optional phone number")}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950/30"
            />
          </div>
        </form>
      </Modal>

      {/* ================= PURCHASE DETAILS / EDIT ================= */}
      <Modal
        open={
          showPurchaseDetails &&
          selectedPurchase !== null
        }
        onClose={closePurchaseDetails}
        title={
          editingPurchase
            ? tx('Edit Purchase')
            : tx('Purchase Details')
        }
        description={
          selectedPurchase
            ? `${tx('Purchase')} • ${new Date(
                getPurchaseDate(
                  selectedPurchase
                )
              ).toLocaleDateString()} ${formatPurchaseTime(
                selectedPurchase
              )}`
            : ''
        }
        size="xl"
        footer={
          editingPurchase ? (
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={
                  cancelEditingPurchase
                }
                disabled={editSaving}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {tx("Cancel Edit")}
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleSavePurchaseEdit()
                }
                disabled={editSaving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon
                  name="save"
                  className="h-4 w-4"
                />

                {editSaving
                  ? tx('Saving...')
                  : tx('Save Changes')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={closePurchaseDetails}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {tx("Close")}
              </button>

              <button
                type="button"
                onClick={startEditingPurchase}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
              >
                <Icon
                  name="edit"
                  className="h-4 w-4"
                />
                {tx("Edit Purchase")}
              </button>
            </div>
          )
        }
      >
        {selectedPurchase && (
          <div className="space-y-6">
            {/* ================= EDIT HEADER ================= */}
            {editingPurchase ? (
              <div className="rounded-[24px] bg-slate-950 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                    <Icon
                      name="edit"
                      className="h-5 w-5"
                    />
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-300">
                      {tx("Purchase Header")}
                    </p>

                    <h3 className="mt-1 text-lg font-black text-white">
                      {tx("Edit Purchase Information")}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {tx("Supplier, date and notes can be updated safely here. Existing purchase items and batches remain unchanged.")}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-300">
                      {tx("Supplier / Supply Name")}
                    </label>

                    <select
                      value={editSupplierId}
                      onChange={(event) =>
                        setEditSupplierId(
                          event.target.value
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-sm font-semibold text-white outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                    >
                      <option
                        value=""
                        className="bg-slate-950"
                      >
                        {tx("Select supplier")}
                      </option>

                      {suppliers.map(
                        (supplier) => (
                          <option
                            key={supplier.id}
                            value={supplier.id}
                            className="bg-slate-950"
                          >
                            {supplier.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-300">
                      {tx("Purchase Date")}
                    </label>

                    <div className="relative">
                      <Icon
                        name="calendar"
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="date"
                        value={
                          editPurchaseDate
                        }
                        onChange={(event) =>
                          setEditPurchaseDate(
                            event.target
                              .value
                          )
                        }
                        className="w-full rounded-2xl border border-white/10 bg-white/10 py-3.5 pl-11 pr-4 text-sm font-semibold text-white outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-xs font-bold text-slate-300">
                    {tx("Notes")}
                  </label>

                  <textarea
                    value={editNotes}
                    onChange={(event) =>
                      setEditNotes(
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder={tx("Optional purchase notes...")}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-sm font-medium text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
            ) : (
              <>
                {/* ================= SUMMARY ================= */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        <Icon
                          name="truck"
                          className="h-4 w-4"
                        />
                      </div>

                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                        {tx("Supplier")}
                      </p>
                    </div>

                    <p className="mt-3 break-words text-sm font-black text-slate-900 dark:text-white">
                      {getSupplierName(
                        selectedPurchase.supplier_id
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        <Icon
                          name="calendar"
                          className="h-4 w-4"
                        />
                      </div>

                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                        {tx("Purchase Date")}
                      </p>
                    </div>

                    <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">
                      {new Date(
                        getPurchaseDate(
                          selectedPurchase
                        )
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        <Icon
                          name="package"
                          className="h-4 w-4"
                        />
                      </div>

                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                        {tx("Items")}
                      </p>
                    </div>

                    <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">
                      {selectedPurchaseItems.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/30">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-indigo-500">
                      {tx("Purchase Total")}
                    </p>

                    <p className="mt-3 text-lg font-black text-indigo-700 dark:text-indigo-300">
                      {formatMoney(
                        selectedPurchase.total_cost
                      )}{' '}
                      RWF
                    </p>
                  </div>
                </div>

                {/* ================= NOTES ================= */}
                {selectedPurchase.notes && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      {tx("Notes")}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {selectedPurchase.notes}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ================= ITEM DETAILS ================= */}
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {tx("Purchase Items")}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {tx("Each item is connected to its exact product type, batch, quantity and supply cost.")}
                  </p>
                </div>

                {editingPurchase && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                    <Icon
                      name="package"
                      className="h-3.5 w-3.5"
                    />
                    {tx("Inventory batches locked")}
                  </span>
                )}
              </div>

              {detailsLoading ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-10 text-center dark:bg-slate-800">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300">
                    <Icon
                      name="refresh"
                      className="h-5 w-5 animate-spin"
                    />
                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-500 dark:text-slate-300">
                    {tx("Loading purchase details...")}
                  </p>
                </div>
              ) : selectedPurchaseItems.length ===
                0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm font-medium text-slate-500 dark:border-slate-700">
                  {tx("No purchase items found.")}
                </div>
              ) : (
                <>
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800 sm:hidden">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {tx("Swipe horizontally to see all details.")}
                    </p>
                  </div>

                  <div className="mt-4 w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="min-w-[1150px] w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="whitespace-nowrap px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.13em] text-slate-500">
                            {tx("Batch")}
                          </th>

                          <th className="whitespace-nowrap px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.13em] text-slate-500">
                            {tx("Product Type / Kind")}
                          </th>

                          <th className="whitespace-nowrap px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.13em] text-slate-500">
                            {tx("Product")}
                          </th>

                          <th className="whitespace-nowrap px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.13em] text-slate-500">
                            {tx("Quantity")}
                          </th>

                          <th className="whitespace-nowrap px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.13em] text-slate-500">
                            {tx("Unit Supply Cost")}
                          </th>

                          <th className="whitespace-nowrap px-4 py-4 text-right text-[11px] font-black uppercase tracking-[0.13em] text-slate-500">
                            {tx("Total Cost")}
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
                                className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              >
                                <td className="px-4 py-4">
                                  <div className="inline-flex flex-col rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
                                    <p className="whitespace-nowrap text-sm font-black text-slate-900 dark:text-white">
                                      {batch?.batch_number ||
                                        tx('Batch')}
                                    </p>

                                    {batch && (
                                      <p className="mt-1 whitespace-nowrap text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                        {tx('Remaining:')}{' '}
                                        {
                                          batch.remaining_quantity
                                        }
                                      </p>
                                    )}
                                  </div>
                                </td>

                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <ImageFallback
                                      imageUrl={
                                        imageUrl
                                      }
                                      alt={
                                        productType?.name ||
                                        ''
                                      }
                                      size="md"
                                    />

                                    <div className="min-w-0">
                                      <p className="whitespace-nowrap text-sm font-black text-slate-900 dark:text-white">
                                        {getProductTypeName(
                                          item.product_type_id
                                        )}
                                      </p>

                                      <p className="mt-1 text-[11px] font-medium text-slate-400">
                                        {tx("Product Type / Kind")}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                  {productType
                                    ? getProductName(
                                        productType.product_id
                                      )
                                    : tx('Unknown product')}
                                </td>

                                <td className="whitespace-nowrap px-4 py-4 text-sm font-black text-slate-700 dark:text-slate-200">
                                  {item.quantity}
                                </td>

                                <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {formatMoney(
                                    item.unit_cost
                                  )}{' '}
                                  RWF
                                </td>

                                <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-black text-slate-900 dark:text-white">
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