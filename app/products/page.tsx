'use client'

import {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '@/lib/supabase'
import Modal from '@/components/modal'
import { useAppPreferences } from '@/app/providers'

type Product = {
  id: string
  name: string
  description: string | null
  status: 'active' | 'inactive'
  created_at: string
}

type ProductType = {
  id: string
  product_id: string
  name: string
  description: string | null
  minimum_stock: number
  status: 'active' | 'inactive'
  image_path: string | null
  created_at: string
}

type ProductTypeStock = {
  product_type_id: string
  total_quantity: number
  total_stock_value: number
  batch_count: number
  stock_status: string
}

type DeactivateTarget =
  | { kind: 'product'; id: string; name: string }
  | { kind: 'productType'; id: string; name: string }
  | null

const PRODUCT_IMAGE_BUCKET = 'product-images'
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

const PRODUCT_TRANSLATIONS: Record<string, string> = {
  'Something went wrong': 'Hari ikitagenze neza',
  Success: 'Byagenze neza',
  active: 'bikora',
  'low-stock types': 'ubwoko bufite ububiko bukeya',
  'Current inventory value': 'Agaciro k’ububiko buhari',
  'Catalog Management': 'Gucunga Urutonde rw’Ibicuruzwa',
  'Manage products and their exact sellable types / kinds.':
    'Gucunga ibicuruzwa n’ubwoko nyabwo bwabyo bugurishwa.',
  shown: 'bigaragara',
  'Product catalog': 'Urutonde rw’ibicuruzwa',
  'Try a different search term.': 'Gerageza irindi jambo ushakisha.',
  Low: 'Bukeya',
  'Update the product information.': 'Vugurura amakuru y’igicuruzwa.',
  'Update the product type, stock threshold and image.':
    'Vugurura ubwoko bw’igicuruzwa, ingano ntoya y’ububiko n’ifoto.',
  'Product Type / Kind': 'Ubwoko bw’Igicuruzwa',
  'Define the exact sellable variation of a parent product.':
    'Sobanura ubwoko nyabwo bugurishwa bw’igicuruzwa nyamukuru.',
  'Parent:': 'Igicuruzwa nyamukuru:',
  UNITS: 'IBICE',
  'Add a visual identity for this exact product type / kind.':
    'Ongeraho ifoto iranga ubu bwoko bw’igicuruzwa.',
  'JPG, PNG, WebP • Max 5 MB': 'JPG, PNG, WebP • Ntarenze 5 MB',
  'Image ready': 'Ifoto irateguye',
  'Product type': 'Ubwoko bw’igicuruzwa',
  'You can also drag another image here or focus this form and press':
    'Ushobora no gukurura indi foto hano cyangwa ugahitamo iyi fomu ugakanda',
  'to paste a copied image.': 'kugira ngo ushyireho ifoto wakoporoye.',
  'Drop image here': 'Reka ifoto hano',
  'Add product type image': 'Ongeraho ifoto y’ubwoko bw’igicuruzwa',
  'Drag an image into this box, choose a file, or copy an image and press':
    'Kurura ifoto muri iki gisanduku, hitamo dosiye, cyangwa wandukure ifoto ukande',
  'or drag & drop / paste': 'cyangwa kurura & reka / shyiraho',
  '(optional)': '(si ngombwa)',
}

function translateProducts(text: string, isRw: boolean) {
  if (!isRw) {
    return text
  }

  return Object.prototype.hasOwnProperty.call(
    PRODUCT_TRANSLATIONS,
    text,
  )
    ? PRODUCT_TRANSLATIONS[text]
    : text
}

export default function ProductsPage() {
  const { t } = useAppPreferences()

  const isRw =
    t('inventory').trim().toLowerCase() !==
    'inventory'

  const tx = (text: string) =>
    translateProducts(text, isRw)

  const [products, setProducts] = useState<Product[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [stockData, setStockData] = useState<
    ProductTypeStock[]
  >([])

  const [search, setSearch] = useState('')

  const [activeTab, setActiveTab] = useState<
    'products' | 'types'
  >('products')

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null)

  const [showProductDetails, setShowProductDetails] =
    useState(false)

  const [showProductModal, setShowProductModal] =
    useState(false)

  const [showTypeModal, setShowTypeModal] =
    useState(false)

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null)

  const [editingProductType, setEditingProductType] =
    useState<ProductType | null>(null)

  const [deactivateTarget, setDeactivateTarget] =
    useState<DeactivateTarget>(null)

  const [productName, setProductName] =
    useState('')

  const [productDescription, setProductDescription] =
    useState('')

  const [typeProductId, setTypeProductId] =
    useState('')

  const [typeName, setTypeName] =
    useState('')

  const [typeDescription, setTypeDescription] =
    useState('')

  const [minimumStock, setMinimumStock] =
    useState('0')

  const [typeImageFile, setTypeImageFile] =
    useState<File | null>(null)

  const [typeImagePreview, setTypeImagePreview] =
    useState<string | null>(null)

  const [removeTypeImage, setRemoveTypeImage] =
    useState(false)

  const [isImageDragging, setIsImageDragging] =
    useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    const [
      productsResult,
      typesResult,
      stockResult,
    ] = await Promise.all([
      supabase
        .from('products')
        .select(
          'id, name, description, status, created_at',
        )
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('product_types')
        .select(
          'id, product_id, name, description, minimum_stock, status, image_path, created_at',
        )
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('v_product_type_stock')
        .select(
          'product_type_id, total_quantity, total_stock_value, batch_count, stock_status',
        ),
    ])

    if (productsResult.error) {
      setError(productsResult.error.message)
      setLoading(false)
      return
    }

    if (typesResult.error) {
      setError(typesResult.error.message)
      setLoading(false)
      return
    }

    if (stockResult.error) {
      setError(stockResult.error.message)
      setLoading(false)
      return
    }

    const nextProducts =
      (productsResult.data || []) as Product[]

    const nextTypes =
      (typesResult.data || []) as ProductType[]

    const nextStock =
      (stockResult.data || []) as ProductTypeStock[]

    setProducts(nextProducts)
    setProductTypes(nextTypes)
    setStockData(nextStock)

    if (
      !typeProductId &&
      nextProducts.length > 0
    ) {
      setTypeProductId(nextProducts[0].id)
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

  function revokeBlobPreview() {
    if (
      typeImagePreview &&
      typeImagePreview.startsWith('blob:')
    ) {
      URL.revokeObjectURL(typeImagePreview)
    }
  }

  function resetProductForm() {
    setProductName('')
    setProductDescription('')
  }

  function resetProductTypeForm() {
    revokeBlobPreview()

    setTypeProductId('')
    setTypeName('')
    setTypeDescription('')
    setMinimumStock('0')
    setTypeImageFile(null)
    setTypeImagePreview(null)
    setRemoveTypeImage(false)
    setIsImageDragging(false)
  }

  function getPublicImageUrl(path: string | null) {
    if (!path) {
      return null
    }

    if (
      path.startsWith('http://') ||
      path.startsWith('https://')
    ) {
      return path
    }

    return supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .getPublicUrl(path).data.publicUrl
  }

  function validateImage(file: File) {
    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.type,
      )
    ) {
      setError(t('invalidImageType'))
      return false
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError(t('imageTooLarge'))
      return false
    }

    return true
  }

  function setTypeImageFromFile(
    file: File | null,
  ) {
    clearMessages()

    if (!file) {
      return
    }

    if (!validateImage(file)) {
      return
    }

    revokeBlobPreview()

    const preview =
      URL.createObjectURL(file)

    setTypeImageFile(file)
    setTypeImagePreview(preview)
    setRemoveTypeImage(false)
  }

  function handleTypeImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files &&
      event.target.files[0]

    if (!file) {
      return
    }

    setTypeImageFromFile(file)

    event.target.value = ''
  }

  function handleTypeImageDrop(
    event: DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault()
    event.stopPropagation()

    setIsImageDragging(false)

    const file =
      event.dataTransfer.files &&
      event.dataTransfer.files[0]

    if (!file) {
      return
    }

    setTypeImageFromFile(file)
  }

  function handleTypeImagePaste(
    event: ClipboardEvent<HTMLFormElement>,
  ) {
    const items = Array.from(
      event.clipboardData.items || [],
    )

    const imageItem = items.find(
      (item) =>
        item.type.startsWith('image/'),
    )

    if (!imageItem) {
      return
    }

    const file = imageItem.getAsFile()

    if (!file) {
      return
    }

    event.preventDefault()
    setTypeImageFromFile(file)
  }

  function handleRemoveTypeImage() {
    clearMessages()

    revokeBlobPreview()

    setTypeImageFile(null)
    setTypeImagePreview(null)
    setRemoveTypeImage(true)
  }

  async function uploadProductTypeImage(
    productTypeId: string,
    file: File,
  ) {
    const nameParts =
      file.name.split('.')

    const extension =
      nameParts.length > 1
        ? nameParts[
            nameParts.length - 1
          ].toLowerCase()
        : 'jpg'

    const filePath =
      productTypeId +
      '/' +
      crypto.randomUUID() +
      '.' +
      extension

    const result =
      await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

    if (result.error) {
      throw new Error(
        result.error.message,
      )
    }

    return filePath
  }

  async function deleteProductTypeImage(
    path: string | null,
  ) {
    if (
      !path ||
      path.startsWith('http://') ||
      path.startsWith('https://')
    ) {
      return
    }

    const result =
      await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove([path])

    if (result.error) {
      console.error(
        result.error.message,
      )
    }
  }

  async function handleCreateProduct(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!productName.trim()) {
      setError(
        t('productNameRequired'),
      )
      return
    }

    setSaving(true)
    clearMessages()

    const result =
      await supabase
        .from('products')
        .insert({
          name: productName.trim(),
          description:
            productDescription.trim() ||
            null,
          status: 'active',
        })

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    resetProductForm()
    setShowProductModal(false)
    setSuccess(
      t('productCreatedSuccessfully'),
    )

    await loadData()

    setSaving(false)
  }

  async function handleUpdateProduct(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!editingProduct) {
      return
    }

    if (!productName.trim()) {
      setError(
        t('productNameRequired'),
      )
      return
    }

    setSaving(true)
    clearMessages()

    const nextName =
      productName.trim()

    const nextDescription =
      productDescription.trim() ||
      null

    const result =
      await supabase
        .from('products')
        .update({
          name: nextName,
          description:
            nextDescription,
        })
        .eq(
          'id',
          editingProduct.id,
        )

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    if (
      selectedProduct &&
      selectedProduct.id ===
        editingProduct.id
    ) {
      setSelectedProduct({
        ...selectedProduct,
        name: nextName,
        description:
          nextDescription,
      })
    }

    setShowProductModal(false)
    setEditingProduct(null)
    resetProductForm()

    setSuccess(
      t('productUpdatedSuccessfully'),
    )

    await loadData()

    setSaving(false)
  }

  async function handleCreateProductType(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!typeProductId) {
      setError(
        t('parentProductRequired'),
      )
      return
    }

    if (!typeName.trim()) {
      setError(
        t('productTypeRequired'),
      )
      return
    }

    const parsedMinimumStock =
      Number(minimumStock)

    if (
      Number.isNaN(
        parsedMinimumStock,
      ) ||
      parsedMinimumStock < 0
    ) {
      setError(
        t('minimumStockZeroOrGreater'),
      )
      return
    }

    setSaving(true)
    clearMessages()

    const insertResult =
      await supabase
        .from('product_types')
        .insert({
          product_id:
            typeProductId,
          name: typeName.trim(),
          description:
            typeDescription.trim() ||
            null,
          minimum_stock:
            parsedMinimumStock,
          status: 'active',
          image_path: null,
        })
        .select('id')
        .single()

    if (
      insertResult.error ||
      !insertResult.data
    ) {
      setError(
        insertResult.error
          ? insertResult.error.message
          : t('productTypeRequired'),
      )

      setSaving(false)
      return
    }

    const typeId =
      insertResult.data.id as string

    let imagePath:
      | string
      | null = null

    if (typeImageFile) {
      try {
        imagePath =
          await uploadProductTypeImage(
            typeId,
            typeImageFile,
          )
      } catch (
        uploadError
      ) {
        await supabase
          .from('product_types')
          .delete()
          .eq('id', typeId)

        setError(
          uploadError instanceof
            Error
            ? uploadError.message
            : t('imageUploadFailed'),
        )

        setSaving(false)
        return
      }

      const imageUpdate =
        await supabase
          .from('product_types')
          .update({
            image_path:
              imagePath,
          })
          .eq(
            'id',
            typeId,
          )

      if (imageUpdate.error) {
        await deleteProductTypeImage(
          imagePath,
        )

        await supabase
          .from('product_types')
          .delete()
          .eq('id', typeId)

        setError(
          imageUpdate.error.message,
        )

        setSaving(false)
        return
      }
    }

    resetProductTypeForm()
    setShowTypeModal(false)

    setSuccess(
      t(
        'productTypeCreatedSuccessfully',
      ),
    )

    await loadData()

    setSaving(false)
  }

  async function handleUpdateProductType(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!editingProductType) {
      return
    }

    if (!typeProductId) {
      setError(
        t('parentProductRequired'),
      )
      return
    }

    if (!typeName.trim()) {
      setError(
        t('productTypeRequired'),
      )
      return
    }

    const parsedMinimumStock =
      Number(minimumStock)

    if (
      Number.isNaN(
        parsedMinimumStock,
      ) ||
      parsedMinimumStock < 0
    ) {
      setError(
        t('minimumStockZeroOrGreater'),
      )
      return
    }

    setSaving(true)
    clearMessages()

    const oldImagePath =
      editingProductType.image_path

    let newImagePath =
      oldImagePath

    if (typeImageFile) {
      try {
        newImagePath =
          await uploadProductTypeImage(
            editingProductType.id,
            typeImageFile,
          )
      } catch (
        uploadError
      ) {
        setError(
          uploadError instanceof
            Error
            ? uploadError.message
            : t('imageUploadFailed'),
        )

        setSaving(false)
        return
      }
    } else if (
      removeTypeImage
    ) {
      newImagePath = null
    }

    const result =
      await supabase
        .from('product_types')
        .update({
          product_id:
            typeProductId,
          name: typeName.trim(),
          description:
            typeDescription.trim() ||
            null,
          minimum_stock:
            parsedMinimumStock,
          image_path:
            newImagePath,
        })
        .eq(
          'id',
          editingProductType.id,
        )

    if (result.error) {
      if (
        typeImageFile &&
        newImagePath &&
        newImagePath !==
          oldImagePath
      ) {
        await deleteProductTypeImage(
          newImagePath,
        )
      }

      setError(
        result.error.message,
      )

      setSaving(false)
      return
    }

    if (
      oldImagePath &&
      newImagePath !==
        oldImagePath
    ) {
      await deleteProductTypeImage(
        oldImagePath,
      )
    }

    resetProductTypeForm()
    setEditingProductType(null)
    setShowTypeModal(false)

    setSuccess(
      t(
        'productTypeUpdatedSuccessfully',
      ),
    )

    await loadData()

    setSaving(false)
  }

  async function handleConfirmDeactivate() {
    if (!deactivateTarget) {
      return
    }

    setSaving(true)
    clearMessages()

    const tableName =
      deactivateTarget.kind ===
      'product'
        ? 'products'
        : 'product_types'

    const result =
      await supabase
        .from(tableName)
        .update({
          status: 'inactive',
        })
        .eq(
          'id',
          deactivateTarget.id,
        )

    if (result.error) {
      setError(
        result.error.message,
      )

      setSaving(false)
      return
    }

    if (
      deactivateTarget.kind ===
        'product' &&
      selectedProduct &&
      selectedProduct.id ===
        deactivateTarget.id
    ) {
      setSelectedProduct({
        ...selectedProduct,
        status: 'inactive',
      })
    }

    setDeactivateTarget(null)

    setSuccess(
      t('deactivate'),
    )

    await loadData()

    setSaving(false)
  }

  async function handleActivateProduct(
    product: Product,
  ) {
    setSaving(true)
    clearMessages()

    const result =
      await supabase
        .from('products')
        .update({
          status: 'active',
        })
        .eq(
          'id',
          product.id,
        )

    if (result.error) {
      setError(
        result.error.message,
      )

      setSaving(false)
      return
    }

    if (
      selectedProduct &&
      selectedProduct.id ===
        product.id
    ) {
      setSelectedProduct({
        ...selectedProduct,
        status: 'active',
      })
    }

    setSuccess(
      t('activate'),
    )

    await loadData()

    setSaving(false)
  }

  async function handleActivateProductType(
    productType: ProductType,
  ) {
    setSaving(true)
    clearMessages()

    const result =
      await supabase
        .from('product_types')
        .update({
          status: 'active',
        })
        .eq(
          'id',
          productType.id,
        )

    if (result.error) {
      setError(
        result.error.message,
      )

      setSaving(false)
      return
    }

    setSuccess(
      t('activate'),
    )

    await loadData()

    setSaving(false)
  }

  function openCreateProduct() {
    clearMessages()
    setEditingProduct(null)
    resetProductForm()
    setShowProductModal(true)
  }

  function openEditProduct(
    product: Product,
  ) {
    clearMessages()
    setShowProductDetails(false)
    setEditingProduct(product)

    setProductName(
      product.name,
    )

    setProductDescription(
      product.description ||
        '',
    )

    setShowProductModal(true)
  }

  function openCreateProductType(
    productId?: string,
  ) {
    clearMessages()
    setEditingProductType(null)
    resetProductTypeForm()

    if (productId) {
      setTypeProductId(
        productId,
      )
    } else if (
      products.length > 0
    ) {
      setTypeProductId(
        products[0].id,
      )
    }

    setShowTypeModal(true)
  }

  function openEditProductType(
    productType: ProductType,
  ) {
    clearMessages()
    setShowProductDetails(false)

    setEditingProductType(
      productType,
    )

    setTypeProductId(
      productType.product_id,
    )

    setTypeName(
      productType.name,
    )

    setTypeDescription(
      productType.description ||
        '',
    )

    setMinimumStock(
      String(
        productType.minimum_stock,
      ),
    )

    setTypeImageFile(null)

    setTypeImagePreview(
      getPublicImageUrl(
        productType.image_path,
      ),
    )

    setRemoveTypeImage(false)
    setIsImageDragging(false)

    setShowTypeModal(true)
  }

  const filteredProducts =
    useMemo(() => {
      const value =
        search.trim().toLowerCase()

      if (!value) {
        return products
      }

      return products.filter(
        function filterProduct(
          product,
        ) {
          return product.name
            .toLowerCase()
            .includes(value)
        },
      )
    }, [
      products,
      search,
    ])

  const filteredTypes =
    useMemo(() => {
      const value =
        search.trim().toLowerCase()

      if (!value) {
        return productTypes
      }

      return productTypes.filter(
        function filterType(type) {
          const parent =
            products.find(
              function findProduct(
                product,
              ) {
                return (
                  product.id ===
                  type.product_id
                )
              },
            )

          const typeMatches =
            type.name
              .toLowerCase()
              .includes(value)

          const productMatches =
            parent
              ? parent.name
                  .toLowerCase()
                  .includes(value)
              : false

          return (
            typeMatches ||
            productMatches
          )
        },
      )
    }, [
      productTypes,
      products,
      search,
    ])

  const selectedProductTypes =
    useMemo(() => {
      if (!selectedProduct) {
        return []
      }

      return productTypes.filter(
        function filterSelectedType(
          type,
        ) {
          return (
            type.product_id ===
            selectedProduct.id
          )
        },
      )
    }, [
      selectedProduct,
      productTypes,
    ])

  const activeProducts =
    products.filter(
      (product) =>
        product.status ===
        'active',
    ).length

  const activeTypes =
    productTypes.filter(
      (type) =>
        type.status ===
        'active',
    ).length

  const totalStockUnits =
    stockData.reduce(
      (sum, item) =>
        sum +
        Number(
          item.total_quantity ||
            0,
        ),
      0,
    )

  const totalStockValue =
    stockData.reduce(
      (sum, item) =>
        sum +
        Number(
          item.total_stock_value ||
            0,
        ),
      0,
    )

  const lowStockTypes =
    productTypes.filter(
      (type) => {
        const stock =
          getTypeStock(
            type.id,
          )

        return (
          type.status ===
            'active' &&
          stock &&
          Number(
            stock.total_quantity ||
              0,
          ) <=
            Number(
              type.minimum_stock ||
                0,
            )
        )
      },
    ).length

  function getProductName(
    productId: string,
  ) {
    const product =
      products.find(
        function findProduct(
          item,
        ) {
          return (
            item.id ===
            productId
          )
        },
      )

    return product
      ? product.name
      : t('unknownProduct')
  }

  function getTypeStock(
    productTypeId: string,
  ) {
    return stockData.find(
      function findStock(
        stock,
      ) {
        return (
          stock.product_type_id ===
          productTypeId
        )
      },
    )
  }

  function getStatusLabel(
    status:
      | 'active'
      | 'inactive',
  ) {
    return status ===
      'active'
      ? t('active')
      : t('inactive')
  }

  function openProductDetails(
    product: Product,
  ) {
    clearMessages()
    setSelectedProduct(product)
    setShowProductDetails(true)
  }

  const productFormTitle =
    editingProduct
      ? t('editProduct')
      : t('createProductTitle')

  const productTypeFormTitle =
    editingProductType
      ? t('editProductType')
      : t(
          'createProductTypeTitle',
        )

  return (
    <section className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-5 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-xl dark:border-slate-800 sm:p-8">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-200 backdrop-blur">
                <Icon
                  name="package"
                  size={15}
                />
                {t('catalog')}
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                {t('products')}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                {t(
                  'productsDescription',
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={
                  openCreateProduct
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                <Icon
                  name="plus"
                  size={16}
                />
                {t('addProduct')}
              </button>

              <button
                type="button"
                onClick={() =>
                  openCreateProductType()
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
              >
                <Icon
                  name="plus"
                  size={16}
                />
                {t(
                  'addProductType',
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Messages */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <div className="mt-0.5">
              <Icon
                name="warning"
                size={18}
              />
            </div>

            <div>
              <p className="font-bold">
                {tx('Something went wrong')}
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <div className="mt-0.5">
              <Icon
                name="check"
                size={18}
              />
            </div>

            <div>
              <p className="font-bold">
                {tx('Success')}
              </p>

              <p className="mt-1">
                {success}
              </p>
            </div>
          </div>
        )}

        {/* Overview */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label={t('products')}
            value={products.length.toLocaleString()}
            subtitle={`${activeProducts} ${tx('active')}`}
            icon="package"
            accent="indigo"
          />

          <SummaryCard
            label={t(
              'productTypes',
            )}
            value={productTypes.length.toLocaleString()}
            subtitle={`${activeTypes} ${tx('active')}`}
            icon="layers"
            accent="blue"
          />

          <SummaryCard
            label={t('stock')}
            value={totalStockUnits.toLocaleString()}
            subtitle={`${lowStockTypes} ${tx('low-stock types')}`}
            icon="inventory"
            accent="amber"
          />

          <SummaryCard
            label={t('stockValue')}
            value={`${totalStockValue.toLocaleString()} RWF`}
            subtitle={tx('Current inventory value')}
            icon="money"
            accent="emerald"
          />
        </div>

        {/* Tabs / Search */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-black">
                {tx('Catalog Management')}
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {tx(
                  'Manage products and their exact sellable types / kinds.',
                )}
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      'products',
                    )
                  }
                  className={
                    activeTab ===
                    'products'
                      ? 'rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400'
                  }
                >
                  {t(
                    'products',
                  )}{' '}
                  ({products.length})
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      'types',
                    )
                  }
                  className={
                    activeTab ===
                    'types'
                      ? 'rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400'
                  }
                >
                  {t(
                    'productTypes',
                  )}{' '}
                  ({productTypes.length})
                </button>
              </div>

              <div className="relative w-full md:w-80">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon
                    name="search"
                    size={17}
                  />
                </div>

                <input
                  value={search}
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    activeTab ===
                    'products'
                      ? t(
                          'searchProducts',
                        )
                      : t(
                          'searchProductTypes',
                        )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-950"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <div>
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-indigo-900 dark:border-t-indigo-400" />
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {t(
                    'loadingProducts',
                  )}
                </p>
              </div>
            </div>
          ) : activeTab ===
            'products' ? (
            /* Products table */
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                        <Icon
                          name="package"
                          size={19}
                        />
                      </div>

                      <div>
                        <h2 className="font-black">
                          {t(
                            'products',
                          )}
                        </h2>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {filteredProducts.length}{' '}
                          {tx('shown')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    {tx('Product catalog')}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1000px] w-full">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t(
                          'product',
                        )}
                      </th>

                      <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t(
                          'productTypes',
                        )}
                      </th>

                      <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t('status')}
                      </th>

                      <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t('created')}
                      </th>

                      <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t(
                          'action',
                        )}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredProducts.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-14 text-center"
                        >
                          <EmptyState
                            icon="search"
                            title={t(
                              'noProductsFound',
                            )}
                            description={tx('Try a different search term.')}
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(
                        function renderProduct(
                          product,
                        ) {
                          const typeCount =
                            productTypes.filter(
                              function countType(
                                type,
                              ) {
                                return (
                                  type.product_id ===
                                  product.id
                                )
                              },
                            ).length

                          return (
                            <tr
                              key={
                                product.id
                              }
                              className="group transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            >
                              <td className="px-5 py-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openProductDetails(
                                      product,
                                    )
                                  }
                                  className="flex items-center gap-3 text-left"
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                                    <Icon
                                      name="package"
                                      size={18}
                                    />
                                  </div>

                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white">
                                      {
                                        product.name
                                      }
                                    </p>

                                    {product.description && (
                                      <p className="mt-1 max-w-md truncate text-xs text-slate-500 dark:text-slate-400">
                                        {
                                          product.description
                                        }
                                      </p>
                                    )}
                                  </div>
                                </button>
                              </td>

                              <td className="px-5 py-4">
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  <Icon
                                    name="layers"
                                    size={12}
                                  />
                                  {typeCount}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <StatusBadge
                                  status={
                                    product.status
                                  }
                                />
                              </td>

                              <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                                {new Date(
                                  product.created_at,
                                ).toLocaleDateString()}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openProductDetails(
                                        product,
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
                                  >
                                    <Icon
                                      name="eye"
                                      size={13}
                                    />
                                    {t(
                                      'viewDetails',
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditProduct(
                                        product,
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                                  >
                                    <Icon
                                      name="edit"
                                      size={13}
                                    />
                                    {t(
                                      'edit',
                                    )}
                                  </button>

                                  {product.status ===
                                  'active' ? (
                                    <button
                                      type="button"
                                      disabled={
                                        saving
                                      }
                                      onClick={() =>
                                        setDeactivateTarget(
                                          {
                                            kind: 'product',
                                            id: product.id,
                                            name: product.name,
                                          },
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
                                    >
                                      <Icon
                                        name="ban"
                                        size={13}
                                      />
                                      {t(
                                        'deactivate',
                                      )}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={
                                        saving
                                      }
                                      onClick={() =>
                                        void handleActivateProduct(
                                          product,
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
                                    >
                                      <Icon
                                        name="check"
                                        size={13}
                                      />
                                      {t(
                                        'activate',
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        },
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            /* Product Types table */
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <Icon
                          name="layers"
                          size={19}
                        />
                      </div>

                      <div>
                        <h2 className="font-black">
                          {t(
                            'productTypes',
                          )}
                        </h2>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {filteredTypes.length}{' '}
                          {tx('shown')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openCreateProductType()
                    }
                    className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    <Icon
                      name="plus"
                      size={13}
                    />
                    {t(
                      'addProductType',
                    )}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1200px] w-full">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t(
                          'productTypeKind',
                        )}
                      </th>

                      <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t(
                          'product',
                        )}
                      </th>

                      <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t(
                          'minimumStock',
                        )}
                      </th>

                      <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t('stock')}
                      </th>

                      <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t(
                          'stockValue',
                        )}
                      </th>

                      <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t(
                          'batches',
                        )}
                      </th>

                      {/* Image column replaced with Edit */}
                      <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t('edit')}
                      </th>

                      <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        {t(
                          'action',
                        )}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTypes.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-14 text-center"
                        >
                          <EmptyState
                            icon="search"
                            title={t(
                              'noProductTypesFound',
                            )}
                            description={tx('Try a different search term.')}
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredTypes.map(
                        function renderType(
                          type,
                        ) {
                          const stock =
                            getTypeStock(
                              type.id,
                            )

                          const quantity =
                            Number(
                              stock
                                ?.total_quantity ||
                                0,
                            )

                          const minimum =
                            Number(
                              type.minimum_stock ||
                                0,
                            )

                          const isLow =
                            type.status ===
                              'active' &&
                            quantity <=
                              minimum

                          const typeImageUrl =
                            getPublicImageUrl(
                              type.image_path,
                            )

                          return (
                            <tr
                              key={
                                type.id
                              }
                              className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  {typeImageUrl ? (
                                    <img
                                      src={
                                        typeImageUrl
                                      }
                                      alt={
                                        type.name
                                      }
                                      loading="lazy"
                                      className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 bg-slate-100 object-cover dark:border-slate-700 dark:bg-slate-800"
                                    />
                                  ) : (
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                                      <Icon
                                        name="layers"
                                        size={18}
                                      />
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    <p className="truncate font-bold text-slate-900 dark:text-white">
                                      {
                                        type.name
                                      }
                                    </p>

                                    {type.description && (
                                      <p className="mt-1 max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
                                        {
                                          type.description
                                        }
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                {getProductName(
                                  type.product_id,
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {minimum.toLocaleString()}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-black">
                                    {quantity.toLocaleString()}
                                  </span>

                                  {isLow && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                      <Icon
                                        name="warning"
                                        size={10}
                                      />
                                      {tx('Low')}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {Number(
                                  stock
                                    ?.total_stock_value ||
                                    0,
                                ).toLocaleString()}{' '}
                                RWF
                              </td>

                              <td className="px-5 py-4">
                                <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {Number(
                                    stock
                                      ?.batch_count ||
                                      0,
                                  )}
                                </span>
                              </td>

                              {/* Dedicated Edit button */}
                              <td className="px-5 py-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditProductType(
                                      type,
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                                >
                                  <Icon
                                    name="edit"
                                    size={13}
                                  />
                                  {t(
                                    'edit',
                                  )}
                                </button>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end">
                                  {type.status ===
                                  'active' ? (
                                    <button
                                      type="button"
                                      disabled={
                                        saving
                                      }
                                      onClick={() =>
                                        setDeactivateTarget(
                                          {
                                            kind: 'productType',
                                            id: type.id,
                                            name: type.name,
                                          },
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"
                                    >
                                      <Icon
                                        name="ban"
                                        size={13}
                                      />
                                      {t(
                                        'deactivate',
                                      )}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={
                                        saving
                                      }
                                      onClick={() =>
                                        void handleActivateProductType(
                                          type,
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
                                    >
                                      <Icon
                                        name="check"
                                        size={13}
                                      />
                                      {t(
                                        'activate',
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        },
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Product Details */}
      <Modal
        open={
          showProductDetails &&
          !!selectedProduct
        }
        onClose={() =>
          setShowProductDetails(
            false,
          )
        }
        title={
          selectedProduct
            ? selectedProduct.name
            : t('productDetails')
        }
        description={t(
          'productDetailsDescription',
        )}
        size="xl"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            {selectedProduct && (
              <button
                type="button"
                onClick={() =>
                  openEditProduct(
                    selectedProduct,
                  )
                }
                className="flex-1 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-300"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Icon
                    name="edit"
                    size={15}
                  />
                  {t('edit')}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setShowProductDetails(
                  false,
                )
              }
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
            >
              {t('close')}
            </button>
          </div>
        }
      >
        {selectedProduct && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <DetailMetric
                label={t('product')}
                value={
                  selectedProduct.name
                }
              />

              <DetailMetric
                label={t(
                  'productTypes',
                )}
                value={String(
                  selectedProductTypes.length,
                )}
              />

              <DetailMetric
                label={t('status')}
                value={getStatusLabel(
                  selectedProduct.status,
                )}
              />
            </div>

            {selectedProduct.description && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {t('description')}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {
                    selectedProduct.description
                  }
                </p>
              </div>
            )}

            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-lg font-black">
                    {t(
                      'productTypesKinds',
                    )}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t(
                      'exactSellableVariations',
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowProductDetails(
                      false,
                    )

                    openCreateProductType(
                      selectedProduct.id,
                    )
                  }}
                  className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-bold text-white dark:bg-white dark:text-slate-900"
                >
                  <Icon
                    name="plus"
                    size={13}
                  />
                  {t('addType')}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {selectedProductTypes.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <Icon
                        name="layers"
                        size={22}
                      />
                    </div>

                    <p className="mt-4 font-bold">
                      {t(
                        'noProductTypesYet',
                      )}
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t(
                        'addFirstProductType',
                      )}
                    </p>
                  </div>
                ) : (
                  selectedProductTypes.map(
                    function renderDetailType(
                      type,
                    ) {
                      const stock =
                        getTypeStock(
                          type.id,
                        )

                      const imageUrl =
                        getPublicImageUrl(
                          type.image_path,
                        )

                      return (
                        <div
                          key={
                            type.id
                          }
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                        >
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex min-w-0 gap-4">
                                {imageUrl ? (
                                  <img
                                    src={
                                      imageUrl
                                    }
                                    alt={
                                      type.name
                                    }
                                    className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                                  />
                                ) : (
                                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                                    <Icon
                                      name="package"
                                      size={25}
                                    />
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-black">
                                      {
                                        type.name
                                      }
                                    </h4>

                                    <StatusBadge
                                      status={
                                        type.status
                                      }
                                    />
                                  </div>

                                  {type.description && (
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                      {
                                        type.description
                                      }
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditProductType(
                                      type,
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-300"
                                >
                                  <Icon
                                    name="edit"
                                    size={13}
                                  />
                                  {t(
                                    'edit',
                                  )}
                                </button>

                                {type.status ===
                                'active' ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeactivateTarget(
                                        {
                                          kind: 'productType',
                                          id: type.id,
                                          name: type.name,
                                        },
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
                                  >
                                    <Icon
                                      name="ban"
                                      size={13}
                                    />
                                    {t(
                                      'deactivate',
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleActivateProductType(
                                        type,
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300"
                                  >
                                    <Icon
                                      name="check"
                                      size={13}
                                    />
                                    {t(
                                      'activate',
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <DetailMetric
                                label={t(
                                  'stock',
                                )}
                                value={
                                  stock
                                    ? Number(
                                        stock.total_quantity,
                                      ).toLocaleString()
                                    : '0'
                                }
                              />

                              <DetailMetric
                                label={t(
                                  'minimumStock',
                                )}
                                value={Number(
                                  type.minimum_stock,
                                ).toLocaleString()}
                              />

                              <DetailMetric
                                label={t(
                                  'batches',
                                )}
                                value={
                                  stock
                                    ? String(
                                        stock.batch_count,
                                      )
                                    : '0'
                                }
                              />

                              <DetailMetric
                                label={t(
                                  'stockValue',
                                )}
                                value={
                                  stock
                                    ? `${Number(
                                        stock.total_stock_value,
                                      ).toLocaleString()} RWF`
                                    : '0 RWF'
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )
                    },
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Product Modal */}
      <Modal
        open={showProductModal}
        onClose={() => {
          if (saving) {
            return
          }

          setShowProductModal(
            false,
          )

          setEditingProduct(null)

          resetProductForm()
        }}
        title={productFormTitle}
        description={
          editingProduct
            ? tx('Update the product information.')
            : t(
                'createProductDescription',
              )
        }
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setShowProductModal(
                  false,
                )

                setEditingProduct(
                  null,
                )

                resetProductForm()
              }}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {t('cancel')}
            </button>

            <button
              type="submit"
              form="product-form"
              disabled={saving}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
            >
              {saving
                ? t('saving')
                : editingProduct
                  ? t('update')
                  : t('createProduct')}
            </button>
          </div>
        }
      >
        <form
          id="product-form"
          onSubmit={
            editingProduct
              ? handleUpdateProduct
              : handleCreateProduct
          }
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-bold dark:text-slate-200">
              {t('productName')}
            </label>

            <input
              value={productName}
              onChange={(event) =>
                setProductName(
                  event.target.value,
                )
              }
              placeholder={t(
                'productNamePlaceholder',
              )}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold dark:text-slate-200">
              {t('description')}
            </label>

            <textarea
              value={
                productDescription
              }
              onChange={(event) =>
                setProductDescription(
                  event.target.value,
                )
              }
              placeholder={t(
                'optionalDescription',
              )}
              rows={5}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </form>
      </Modal>

      {/* Product Type Modal */}
      <Modal
        open={showTypeModal}
        onClose={() => {
          if (saving) {
            return
          }

          setShowTypeModal(false)
          setEditingProductType(
            null,
          )
          resetProductTypeForm()
        }}
        title={productTypeFormTitle}
        description={
          editingProductType
            ? tx(
                'Update the product type, stock threshold and image.',
              )
            : t(
                'createProductTypeDescription',
              )
        }
        size="lg"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                if (saving) {
                  return
                }

                setShowTypeModal(
                  false,
                )

                setEditingProductType(
                  null,
                )

                resetProductTypeForm()
              }}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {t('cancel')}
            </button>

            <button
              type="submit"
              form="product-type-form"
              disabled={saving}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Spinner />
                  {t('saving')}
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <Icon
                    name="check"
                    size={15}
                  />
                  {editingProductType
                    ? t('update')
                    : t(
                        'createProductType',
                      )}
                </span>
              )}
            </button>
          </div>
        }
      >
        <form
          id="product-type-form"
          onSubmit={
            editingProductType
              ? handleUpdateProductType
              : handleCreateProductType
          }
          onPaste={
            handleTypeImagePaste
          }
          className="space-y-6"
        >
          {/* Form Header */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-slate-900 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                <Icon
                  name="layers"
                  size={20}
                />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                  {tx('Product Type / Kind')}
                </p>

                <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  {editingProductType
                    ? typeName ||
                      t(
                        'editProductType',
                      )
                    : t(
                        'createProductTypeTitle',
                      )}
                </h3>

                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {tx(
                    'Define the exact sellable variation of a parent product.',
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Parent Product */}
          <div>
            <label className="mb-2 block text-sm font-bold dark:text-slate-200">
              {t('parentProduct')}
            </label>

            <select
              value={
                typeProductId
              }
              onChange={(event) =>
                setTypeProductId(
                  event.target.value,
                )
              }
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">
                {t(
                  'selectProduct',
                )}
              </option>

              {products.map(
                function renderOption(
                  product,
                ) {
                  return (
                    <option
                      key={
                        product.id
                      }
                      value={
                        product.id
                      }
                    >
                      {
                        product.name
                      }
                    </option>
                  )
                },
              )}
            </select>

            {typeProductId && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Icon
                  name="package"
                  size={12}
                />

                {tx('Parent:')}{' '}
                {getProductName(
                  typeProductId,
                )}
              </div>
            )}
          </div>

          {/* Name + Minimum Stock */}
          <div className="grid gap-5 sm:grid-cols-[1.4fr_0.6fr]">
            <div>
              <label className="mb-2 block text-sm font-bold dark:text-slate-200">
                {t(
                  'productTypeKind',
                )}
              </label>

              <input
                value={typeName}
                onChange={(event) =>
                  setTypeName(
                    event.target.value,
                  )
                }
                placeholder={t(
                  'productTypePlaceholder',
                )}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold dark:text-slate-200">
                {t(
                  'minimumStock',
                )}
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    minimumStock
                  }
                  onChange={(
                    event,
                  ) =>
                    setMinimumStock(
                      event.target
                        .value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-16 text-sm font-semibold outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {tx('UNITS')}
                </span>
              </div>
            </div>
          </div>

          {/* Advanced Image Upload */}
          <div>
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className="block text-sm font-bold dark:text-slate-200">
                  {t('image')}
                </label>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {tx(
                    'Add a visual identity for this exact product type / kind.',
                  )}
                </p>
              </div>

              <span className="text-[11px] font-semibold text-slate-400">
                {tx('JPG, PNG, WebP • Max 5 MB')}
              </span>
            </div>

            <div
              onDragEnter={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setIsImageDragging(
                  true,
                )
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setIsImageDragging(
                  true,
                )
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                event.stopPropagation()

                if (
                  event.currentTarget ===
                  event.target
                ) {
                  setIsImageDragging(
                    false,
                  )
                }
              }}
              onDrop={
                handleTypeImageDrop
              }
              onPaste={
                handleTypeImagePaste
              }
              tabIndex={0}
              className={`relative overflow-hidden rounded-3xl border-2 border-dashed p-3 outline-none transition ${
                isImageDragging
                  ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/10 dark:border-indigo-400 dark:bg-indigo-950/30'
                  : 'border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20'
              }`}
            >
              {typeImagePreview ? (
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <img
                      src={
                        typeImagePreview
                      }
                      alt={
                        typeName ||
                        tx('Product type')
                      }
                      className="h-64 w-full object-cover sm:h-72"
                    />

                    <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                      <Icon
                        name="check"
                        size={12}
                      />
                      {tx('Image ready')}
                    </div>

                    {typeImageFile && (
                      <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-black/60 px-3 py-2 text-xs text-white backdrop-blur">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate font-semibold">
                            {
                              typeImageFile.name
                            }
                          </span>

                          <span className="shrink-0">
                            {(
                              typeImageFile.size /
                              1024 /
                              1024
                            ).toFixed(
                              2,
                            )}{' '}
                            MB
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                      <Icon
                        name="upload"
                        size={16}
                      />
                      {t(
                        'changeImage',
                      )}

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={
                          handleTypeImageChange
                        }
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={
                        handleRemoveTypeImage
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"
                    >
                      <Icon
                        name="trash"
                        size={16}
                      />
                      {t(
                        'removeImage',
                      )}
                    </button>
                  </div>

                  <div className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {tx(
                      'You can also drag another image here or focus this form and press',
                    )}{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      Ctrl + V
                    </strong>{' '}
                    {tx('to paste a copied image.')}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white px-5 py-10 text-center dark:bg-slate-900 sm:py-12">
                  <div
                    className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl transition ${
                      isImageDragging
                        ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <Icon
                      name={
                        isImageDragging
                          ? 'download'
                          : 'image'
                      }
                      size={28}
                    />
                  </div>

                  <h4 className="mt-5 text-base font-black">
                    {isImageDragging
                      ? tx('Drop image here')
                      : tx('Add product type image')}
                  </h4>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {tx(
                      'Drag an image into this box, choose a file, or copy an image and press',
                    )}{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      Ctrl + V
                    </strong>
                    .
                  </p>

                  <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">
                      <Icon
                        name="upload"
                        size={16}
                      />
                      {t(
                        'uploadImage',
                      )}

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={
                          handleTypeImageChange
                        }
                        className="hidden"
                      />
                    </label>

                    <span className="text-xs text-slate-400">
                      {tx('or drag & drop / paste')}
                    </span>
                  </div>

                  <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <div className="rounded-lg bg-slate-100 px-2 py-2 dark:bg-slate-800">
                      JPG
                    </div>

                    <div className="rounded-lg bg-slate-100 px-2 py-2 dark:bg-slate-800">
                      PNG
                    </div>

                    <div className="rounded-lg bg-slate-100 px-2 py-2 dark:bg-slate-800">
                      WEBP
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-bold dark:text-slate-200">
              {t('description')}
              <span className="ml-1 font-normal text-slate-400">
                {tx('(optional)')}
              </span>
            </label>

            <textarea
              value={
                typeDescription
              }
              onChange={(event) =>
                setTypeDescription(
                  event.target.value,
                )
              }
              placeholder={t(
                'optionalDescription',
              )}
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirmation */}
      <Modal
        open={
          !!deactivateTarget
        }
        onClose={() =>
          setDeactivateTarget(
            null,
          )
        }
        title={t('confirm')}
        description={
          deactivateTarget &&
          deactivateTarget.kind ===
            'product'
            ? t(
                'confirmDeactivateProduct',
              )
            : t(
                'confirmDeactivateProductType',
              )
        }
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                setDeactivateTarget(
                  null,
                )
              }
              disabled={saving}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {t('cancel')}
            </button>

            <button
              type="button"
              onClick={() =>
                void handleConfirmDeactivate()
              }
              disabled={saving}
              className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Spinner />
                  {t('saving')}
                </span>
              ) : (
                t('deactivate')
              )}
            </button>
          </div>
        }
      >
        {deactivateTarget && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                <Icon
                  name="warning"
                  size={18}
                />
              </div>

              <div>
                <p className="font-black text-red-800 dark:text-red-300">
                  {
                    deactivateTarget.name
                  }
                </p>

                <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-400">
                  {deactivateTarget.kind ===
                  'product'
                    ? t(
                        'confirmDeactivateProduct',
                      )
                    : t(
                        'confirmDeactivateProductType',
                      )}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Small UI Components                                                        */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  label,
  value,
  subtitle,
  icon,
  accent,
}: {
  label: string
  value: string
  subtitle: string
  icon: IconName
  accent:
    | 'indigo'
    | 'blue'
    | 'amber'
    | 'emerald'
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

    amber: {
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      border:
        'border-amber-200 dark:border-amber-900/40',
    },

    emerald: {
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      border:
        'border-emerald-200 dark:border-emerald-900/40',
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

function StatusBadge({
  status,
}: {
  status:
    | 'active'
    | 'inactive'
}) {
  const { t } = useAppPreferences()

  return status ===
    'active' ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {t('active')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      {t('inactive')}
    </span>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: IconName
  title: string
  description: string
}) {
  return (
    <div>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon
          name={icon}
          size={23}
        />
      </div>

      <p className="mt-4 font-bold text-slate-800 dark:text-white">
        {title}
      </p>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  )
}

function DetailMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  )
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  )
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

type IconName =
  | 'package'
  | 'layers'
  | 'inventory'
  | 'money'
  | 'plus'
  | 'warning'
  | 'search'
  | 'eye'
  | 'edit'
  | 'ban'
  | 'check'
  | 'trash'
  | 'upload'
  | 'download'
  | 'image'

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
    strokeLinecap:
      'round' as const,
    strokeLinejoin:
      'round' as const,
    className,
  }

  switch (name) {
    case 'package':
      return (
        <svg {...common}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
          <path d="m4 7.5 8 4.5 8-4.5" />
          <path d="M12 12v9" />
        </svg>
      )

    case 'layers':
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 16 9 5 9-5" />
        </svg>
      )

    case 'inventory':
      return (
        <svg {...common}>
          <rect
            x="3"
            y="5"
            width="18"
            height="15"
            rx="2"
          />
          <path d="M3 10h18" />
          <path d="M9 5V3h6v2" />
          <path d="M8 14h8" />
        </svg>
      )

    case 'money':
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="8.5"
          />
          <path d="M12 7.5v9" />
          <path d="M15 9.5c-.6-.8-1.5-1.2-2.9-1.2-1.7 0-2.8.7-2.8 1.8 0 1.2 1.2 1.7 2.8 1.9 1.8.2 2.8.8 2.8 2 0 1.1-1.1 1.8-2.8 1.8-1.4 0-2.5-.5-3.1-1.4" />
        </svg>
      )

    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
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

    case 'search':
      return (
        <svg {...common}>
          <circle
            cx="11"
            cy="11"
            r="6.5"
          />
          <path d="m16 16 5 5" />
        </svg>
      )

    case 'eye':
      return (
        <svg {...common}>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle
            cx="12"
            cy="12"
            r="2.5"
          />
        </svg>
      )

    case 'edit':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      )

    case 'ban':
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="m5.5 5.5 13 13" />
        </svg>
      )

    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
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

    case 'upload':
      return (
        <svg {...common}>
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M5 20h14" />
        </svg>
      )

    case 'download':
      return (
        <svg {...common}>
          <path d="M12 4v12" />
          <path d="m7 11 5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
      )

    case 'image':
      return (
        <svg {...common}>
          <rect
            x="3"
            y="4"
            width="18"
            height="16"
            rx="2"
          />
          <circle
            cx="8.5"
            cy="9"
            r="1.5"
          />
          <path d="m21 15-4.5-4.5L7 20" />
        </svg>
      )

    default:
      return null
  }
} 