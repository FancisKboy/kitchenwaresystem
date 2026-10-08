'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import Modal from '@/components/modal';

type ActionType = 'loss' | 'damage' | 'return' | 'recover';

type Product = {
  id: string;
  name: string;
};

type ProductType = {
  id: string;
  product_id: string;
  name: string;
  image_path: string | null;
  minimum_stock: number;
  status: string;
};

type Batch = {
  id: string;
  product_type_id: string;
  batch_number: string;
  remaining_quantity: number;
  original_quantity: number;
  unit_cost: number;
  received_at: string;
  status: string;
};

type Sale = {
  id: string;
  customer_id: string | null;
  total_revenue: number;
  sale_date: string;
  payment_status: string;
};

type SaleItem = {
  id: string;
  sale_id: string;
  product_type_id: string;
  quantity: number;
  selling_price: number;
  revenue: number;
  cost: number;
  profit: number;
};

type SaleBatchAllocation = {
  id: string;
  sale_item_id: string;
  batch_id: string;
  quantity: number;
  unit_cost: number;
};

type Customer = {
  id: string;
  name: string;
};

type StockAdjustment = {
  id: string;
  product_type_id: string;
  batch_id: string;
  quantity: number;
  adjustment_type: string;
  reason: string;
  created_at: string;
  related_adjustment_id: string | null;
};

type ReturnItem = {
  id: string;
  return_id: string;
  sale_item_id: string | null;
  product_type_id: string;
  batch_id: string | null;
  quantity: number;
  condition: 'resellable' | 'damaged';
  unit_cost: number;
  created_at: string;
};

type ReturnLine = {
  saleItemId: string;
  batchId: string;
  quantity: number;
  condition: 'resellable' | 'damaged';
};

type StockRow = {
  productType: ProductType;
  product: Product;
  batches: Batch[];
  stock: number;
};

const actions = [
  {
    id: 'loss' as ActionType,
    title: 'Record Loss',
    description:
      'Record stock that was lost and remove it from available inventory.',
    icon: '📉',
    button: 'Record Loss',
  },
  {
    id: 'damage' as ActionType,
    title: 'Record Damage',
    description: 'Record damaged stock and remove it from available inventory.',
    icon: '⚠️',
    button: 'Record Damage',
  },
  {
    id: 'return' as ActionType,
    title: 'Process Return',
    description:
      'Process a customer return and choose whether returned items are resellable or damaged.',
    icon: '↩️',
    button: 'Process Return',
  },
  {
    id: 'recover' as ActionType,
    title: 'Recover Lost Stock',
    description:
      'Recover previously lost stock and add the recovered quantity back to its original batch.',
    icon: '♻️',
    button: 'Recover Stock',
  },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-RW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function getPublicImageUrl(path: string | null) {
  if (!path) return null;

  return supabase.storage.from('product-images').getPublicUrl(path).data
    .publicUrl;
}

function getStockStatus(stock: number, minimum: number) {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= minimum) return 'Low Stock';
  return 'Available';
}

function getStockStatusClass(status: string) {
  if (status === 'Out of Stock') {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  }

  if (status === 'Low Stock') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  }

  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
}

function getActionTitle(action: ActionType | null) {
  switch (action) {
    case 'loss':
      return 'Record Loss';
    case 'damage':
      return 'Record Damage';
    case 'return':
      return 'Process Return';
    case 'recover':
      return 'Recover Lost Stock';
    default:
      return 'Stock Management';
  }
}

function Icon({
  name,
  className = 'h-5 w-5',
}: {
  name:
    | 'package'
    | 'loss'
    | 'damage'
    | 'return'
    | 'recover'
    | 'refresh'
    | 'plus'
    | 'search'
    | 'arrow'
    | 'check'
    | 'warning'
    | 'close'
    | 'money';
  className?: string;
}) {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
  };

  switch (name) {
    case 'package':
      return (
        <svg {...common}>
          <path d="m21 8-9 5-9-5 9-5 9 5Z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        </svg>
      );

    case 'loss':
      return (
        <svg {...common}>
          <path d="M4 5v15h16" />
          <path d="m7 9 4 4 3-3 5 5" />
          <path d="M19 15v-4h-4" />
        </svg>
      );

    case 'damage':
      return (
        <svg {...common}>
          <path d="M12 3 3.5 19a1 1 0 0 0 .88 1.5h15.24A1 1 0 0 0 20.5 19L12 3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );

    case 'return':
      return (
        <svg {...common}>
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 6 6v1" />
        </svg>
      );

    case 'recover':
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14.9-4" />
          <path d="M4 4v5h5" />
          <path d="M4 13a8 8 0 0 0 14.9 4" />
          <path d="M20 20v-5h-5" />
        </svg>
      );

    case 'refresh':
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14.9-4" />
          <path d="M4 4v5h5" />
          <path d="M4 13a8 8 0 0 0 14.9 4" />
          <path d="M20 20v-5h-5" />
        </svg>
      );

    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );

    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );

    case 'arrow':
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case 'warning':
      return (
        <svg {...common}>
          <path d="M12 3 3.5 19a1 1 0 0 0 .88 1.5h15.24A1 1 0 0 0 20.5 19L12 3Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      );

    case 'close':
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );

    case 'money':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8" />
          <path d="M15 10.5c0-1-1.2-1.5-3-1.5s-3 .5-3 1.5 1.2 1.5 3 1.5 3 .5 3 1.5-1.2 1.5-3 1.5-3-.5-3-1.5" />
        </svg>
      );
  }
}

function ImageBox({
  path,
  name,
  size = 'md',
}: {
  path: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const imageUrl = getPublicImageUrl(path);

  const sizeClass =
    size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';

  return imageUrl ? (
    <img
      src={imageUrl}
      alt={name}
      className={`${sizeClass} shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700`}
    />
  ) : (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500`}
    >
      <Icon name="package" className="h-5 w-5" />
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
  accent = 'indigo',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  accent?: 'indigo' | 'blue' | 'emerald';
}) {
  const focusClass =
    accent === 'blue'
      ? 'focus:border-blue-500 focus:ring-blue-500/10'
      : accent === 'emerald'
      ? 'focus:border-emerald-500 focus:ring-emerald-500/10'
      : 'focus:border-indigo-500 focus:ring-indigo-500/10';

  return (
    <div className="relative">
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm outline-none ring-0 transition ${focusClass} dark:border-slate-700 dark:bg-slate-950 dark:text-white`}
      />
    </div>
  );
}

export default function StockManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [allocations, setAllocations] = useState<SaleBatchAllocation[]>([]);

  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(
    []
  );
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);

  const [selectedProductTypeId, setSelectedProductTypeId] = useState('');

  const [selectedBatchId, setSelectedBatchId] = useState('');

  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [returnReason, setReturnReason] = useState('');

  const [returnLines, setReturnLines] = useState<ReturnLine[]>([]);

  const [selectedLossId, setSelectedLossId] = useState('');
  const [recoveryQuantity, setRecoveryQuantity] = useState('');
  const [recoveryReason, setRecoveryReason] = useState('');

  const [stockSearch, setStockSearch] = useState('');

  const [productTypeSearch, setProductTypeSearch] = useState('');
  const [saleSearch, setSaleSearch] = useState('');
  const [lossSearch, setLossSearch] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [
        productsResult,
        productTypesResult,
        batchesResult,
        salesResult,
        customersResult,
        saleItemsResult,
        allocationsResult,
        stockAdjustmentsResult,
        returnItemsResult,
      ] = await Promise.all([
        supabase.from('products').select('id, name').order('name'),

        supabase
          .from('product_types')
          .select('id, product_id, name, image_path, minimum_stock, status')
          .eq('status', 'active')
          .order('name'),

        supabase
          .from('batches')
          .select(
            'id, product_type_id, batch_number, remaining_quantity, original_quantity, unit_cost, received_at, status'
          )
          .neq('status', 'cancelled')
          .order('received_at', {
            ascending: true,
          }),

        supabase
          .from('sales')
          .select('id, customer_id, total_revenue, sale_date, payment_status')
          .order('sale_date', {
            ascending: false,
          })
          .limit(100),

        supabase.from('customers').select('id, name').order('name'),

        supabase
          .from('sale_items')
          .select(
            'id, sale_id, product_type_id, quantity, selling_price, revenue, cost, profit'
          ),

        supabase
          .from('sale_batch_allocations')
          .select('id, sale_item_id, batch_id, quantity, unit_cost'),

        supabase
          .from('stock_adjustments')
          .select(
            'id, product_type_id, batch_id, quantity, adjustment_type, reason, created_at, related_adjustment_id'
          )
          .in('adjustment_type', ['lost', 'recovered'])
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('return_items')
          .select(
            'id, return_id, sale_item_id, product_type_id, batch_id, quantity, condition, unit_cost, created_at'
          ),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (productTypesResult.error) throw productTypesResult.error;
      if (batchesResult.error) throw batchesResult.error;
      if (salesResult.error) throw salesResult.error;
      if (customersResult.error) throw customersResult.error;
      if (saleItemsResult.error) throw saleItemsResult.error;
      if (allocationsResult.error) throw allocationsResult.error;
      if (stockAdjustmentsResult.error) throw stockAdjustmentsResult.error;
      if (returnItemsResult.error) throw returnItemsResult.error;

      setProducts((productsResult.data || []) as Product[]);
      setProductTypes((productTypesResult.data || []) as ProductType[]);
      setBatches((batchesResult.data || []) as Batch[]);
      setSales((salesResult.data || []) as Sale[]);
      setCustomers((customersResult.data || []) as Customer[]);
      setSaleItems((saleItemsResult.data || []) as SaleItem[]);
      setAllocations((allocationsResult.data || []) as SaleBatchAllocation[]);
      setStockAdjustments(
        (stockAdjustmentsResult.data || []) as StockAdjustment[]
      );
      setReturnItems((returnItemsResult.data || []) as ReturnItem[]);
    } catch (err) {
      console.error('Stock management load error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load stock management data.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const productMap = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  const productTypeMap = useMemo(() => {
    return new Map(productTypes.map((type) => [type.id, type]));
  }, [productTypes]);

  const batchMap = useMemo(() => {
    return new Map(batches.map((batch) => [batch.id, batch]));
  }, [batches]);

  const customerMap = useMemo(() => {
    return new Map(customers.map((customer) => [customer.id, customer]));
  }, [customers]);

  const stockRows = useMemo<StockRow[]>(() => {
    return productTypes.map((productType) => {
      const typeBatches = batches.filter(
        (batch) => batch.product_type_id === productType.id
      );

      const stock = typeBatches.reduce(
        (total, batch) =>
          total + Math.max(Number(batch.remaining_quantity) || 0, 0),
        0
      );

      return {
        productType,
        product: productMap.get(productType.product_id) || {
          id: productType.product_id,
          name: 'Unknown Product',
        },
        batches: typeBatches,
        stock,
      };
    });
  }, [productTypes, batches, productMap]);

  const filteredStockRows = useMemo(() => {
    const value = stockSearch.trim().toLowerCase();

    if (!value) return stockRows;

    return stockRows.filter((row) => {
      return (
        row.product.name.toLowerCase().includes(value) ||
        row.productType.name.toLowerCase().includes(value) ||
        row.batches.some((batch) =>
          batch.batch_number.toLowerCase().includes(value)
        )
      );
    });
  }, [stockRows, stockSearch]);

  const selectedTypeBatches = useMemo(() => {
    if (!selectedProductTypeId) return [];

    return batches.filter(
      (batch) =>
        batch.product_type_id === selectedProductTypeId &&
        Number(batch.remaining_quantity) > 0
    );
  }, [batches, selectedProductTypeId]);

  const selectedBatch = selectedBatchId
    ? batchMap.get(selectedBatchId)
    : undefined;

  const selectedProductType = selectedProductTypeId
    ? productTypeMap.get(selectedProductTypeId)
    : undefined;

  const selectedProduct = selectedProductType
    ? productMap.get(selectedProductType.product_id)
    : undefined;

  const selectedProductStock = selectedProductTypeId
    ? stockRows.find((row) => row.productType.id === selectedProductTypeId)
        ?.stock || 0
    : 0;

  const selectedSaleItems = useMemo(() => {
    if (!selectedSaleId) return [];

    return saleItems.filter((item) => item.sale_id === selectedSaleId);
  }, [saleItems, selectedSaleId]);

  const unresolvedLostAdjustments = useMemo(() => {
    const lost = stockAdjustments.filter(
      (adjustment) => adjustment.adjustment_type === 'lost'
    );

    const recovered = stockAdjustments.filter(
      (adjustment) => adjustment.adjustment_type === 'recovered'
    );

    return lost
      .map((adjustment) => {
        const recoveredQuantity = recovered
          .filter((item) => item.related_adjustment_id === adjustment.id)
          .reduce((total, item) => total + Number(item.quantity || 0), 0);

        return {
          ...adjustment,
          unresolvedQuantity: Math.max(
            Number(adjustment.quantity || 0) - recoveredQuantity,
            0
          ),
        };
      })
      .filter((adjustment) => adjustment.unresolvedQuantity > 0);
  }, [stockAdjustments]);

  const searchableProductTypes = useMemo(() => {
    const value = productTypeSearch.trim().toLowerCase();

    const results = stockRows.filter((row) => {
      if (row.stock <= 0) return false;

      if (!value) return true;

      return (
        row.product.name.toLowerCase().includes(value) ||
        row.productType.name.toLowerCase().includes(value) ||
        row.batches.some((batch) =>
          batch.batch_number.toLowerCase().includes(value)
        )
      );
    });

    return results.slice(0, 30);
  }, [stockRows, productTypeSearch]);

  const searchableSales = useMemo(() => {
    const value = saleSearch.trim().toLowerCase();

    const results = sales.filter((sale) => {
      const customerName = sale.customer_id
        ? customerMap.get(sale.customer_id)?.name || ''
        : 'Walk-in Customer';

      if (!value) return true;

      return (
        customerName.toLowerCase().includes(value) ||
        sale.payment_status.toLowerCase().includes(value) ||
        formatDate(sale.sale_date).toLowerCase().includes(value) ||
        formatMoney(Number(sale.total_revenue) || 0)
          .toLowerCase()
          .includes(value)
      );
    });

    return results.slice(0, 30);
  }, [sales, customerMap, saleSearch]);

  const searchableLosses = useMemo(() => {
    const value = lossSearch.trim().toLowerCase();

    const results = unresolvedLostAdjustments.filter((adjustment) => {
      const type = productTypeMap.get(adjustment.product_type_id);

      const product = type ? productMap.get(type.product_id) : undefined;

      const batch = batchMap.get(adjustment.batch_id);

      if (!value) return true;

      return (
        product?.name.toLowerCase().includes(value) ||
        type?.name.toLowerCase().includes(value) ||
        batch?.batch_number.toLowerCase().includes(value) ||
        adjustment.reason.toLowerCase().includes(value)
      );
    });

    return results.slice(0, 30);
  }, [
    unresolvedLostAdjustments,
    productTypeMap,
    productMap,
    batchMap,
    lossSearch,
  ]);

  const totalUnits = stockRows.reduce((total, row) => total + row.stock, 0);

  const lowStockCount = stockRows.filter(
    (row) =>
      row.stock > 0 && row.stock <= Number(row.productType.minimum_stock || 0)
  ).length;

  const outOfStockCount = stockRows.filter((row) => row.stock <= 0).length;

  const totalStockValue = stockRows.reduce(
    (total, row) =>
      total +
      row.batches.reduce(
        (batchTotal, batch) =>
          batchTotal +
          Math.max(Number(batch.remaining_quantity) || 0, 0) *
            (Number(batch.unit_cost) || 0),
        0
      ),
    0
  );

  function resetActionForms() {
    setSelectedProductTypeId('');
    setSelectedBatchId('');
    setQuantity('');
    setReason('');

    setSelectedSaleId('');
    setReturnReason('');
    setReturnLines([]);

    setSelectedLossId('');
    setRecoveryQuantity('');
    setRecoveryReason('');

    setProductTypeSearch('');
    setSaleSearch('');
    setLossSearch('');
  }

  function openAction(action: ActionType, preselectedProductTypeId = '') {
    resetActionForms();
    setError('');
    setSuccess('');
    setSelectedAction(action);

    if (preselectedProductTypeId) {
      setSelectedProductTypeId(preselectedProductTypeId);
    }
  }

  function closeAction() {
    if (saving) return;

    setSelectedAction(null);
    resetActionForms();
  }

  function handleProductTypeSelect(productTypeId: string) {
    setSelectedProductTypeId(productTypeId);
    setSelectedBatchId('');
    setProductTypeSearch('');
    setError('');
  }

  function clearProductTypeSelection() {
    setSelectedProductTypeId('');
    setSelectedBatchId('');
    setProductTypeSearch('');
  }

  function handleSaleSelect(saleId: string) {
    setSelectedSaleId(saleId);
    setReturnLines([]);
    setSaleSearch('');
    setError('');
  }

  function clearSaleSelection() {
    setSelectedSaleId('');
    setReturnLines([]);
    setSaleSearch('');
  }

  function handleLossSelect(lossId: string) {
    setSelectedLossId(lossId);
    setLossSearch('');
    setError('');
  }

  function clearLossSelection() {
    setSelectedLossId('');
    setLossSearch('');
  }

  function getReturnLine(saleItemId: string, batchId: string) {
    return returnLines.find(
      (line) => line.saleItemId === saleItemId && line.batchId === batchId
    );
  }

  function getAllocatedQuantity(saleItemId: string, batchId: string) {
    return allocations
      .filter(
        (allocation) =>
          allocation.sale_item_id === saleItemId &&
          allocation.batch_id === batchId
      )
      .reduce(
        (total, allocation) => total + Number(allocation.quantity || 0),
        0
      );
  }

  function getReturnedQuantity(saleItemId: string, batchId: string) {
    return returnItems
      .filter(
        (item) => item.sale_item_id === saleItemId && item.batch_id === batchId
      )
      .reduce((total, item) => total + Number(item.quantity || 0), 0);
  }

  function getReturnableQuantity(saleItemId: string, batchId: string) {
    const allocated = getAllocatedQuantity(saleItemId, batchId);

    const returned = getReturnedQuantity(saleItemId, batchId);

    return Math.max(allocated - returned, 0);
  }

  function toggleReturnLine(saleItemId: string, batchId: string) {
    const existing = getReturnLine(saleItemId, batchId);

    if (existing) {
      setReturnLines((current) =>
        current.filter(
          (line) =>
            !(line.saleItemId === saleItemId && line.batchId === batchId)
        )
      );

      return;
    }

    const maxQuantity = getReturnableQuantity(saleItemId, batchId);

    if (maxQuantity <= 0) return;

    setReturnLines((current) => [
      ...current,
      {
        saleItemId,
        batchId,
        quantity: maxQuantity,
        condition: 'resellable',
      },
    ]);
  }

  function updateReturnLine(
    saleItemId: string,
    batchId: string,
    changes: Partial<ReturnLine>
  ) {
    setReturnLines((current) =>
      current.map((line) => {
        if (line.saleItemId !== saleItemId || line.batchId !== batchId) {
          return line;
        }

        return {
          ...line,
          ...changes,
        };
      })
    );
  }

  async function handleLossOrDamage(event: FormEvent) {
    event.preventDefault();

    if (!selectedProductTypeId) {
      setError('Please select a product type.');
      return;
    }

    if (!selectedBatchId) {
      setError('Please select a batch.');
      return;
    }

    const requestedQuantity = Number(quantity);

    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (!reason.trim()) {
      setError('Please enter a reason.');
      return;
    }

    if (!selectedBatch) {
      setError('Selected batch was not found.');
      return;
    }

    if (requestedQuantity > Number(selectedBatch.remaining_quantity)) {
      setError(
        `Only ${selectedBatch.remaining_quantity} units are currently available in this batch.`
      );
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { error: rpcError } = await supabase.rpc('create_stock_loss', {
        p_product_type_id: selectedProductTypeId,
        p_batch_id: selectedBatchId,
        p_quantity: requestedQuantity,
        p_adjustment_type: selectedAction === 'damage' ? 'damaged' : 'lost',
        p_reason: reason.trim(),
      });

      if (rpcError) throw rpcError;

      await loadData();

      setSuccess(
        selectedAction === 'damage'
          ? 'Stock damage recorded successfully.'
          : 'Stock loss recorded successfully.'
      );

      setSelectedAction(null);
      resetActionForms();
    } catch (err) {
      console.error('Stock adjustment error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to record stock adjustment.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReturn(event: FormEvent) {
    event.preventDefault();

    if (!selectedSaleId) {
      setError('Please select a sale.');
      return;
    }

    if (!returnLines.length) {
      setError('Please select at least one item to return.');
      return;
    }

    if (!returnReason.trim()) {
      setError('Please enter a return reason.');
      return;
    }

    for (const line of returnLines) {
      const maxQuantity = getReturnableQuantity(line.saleItemId, line.batchId);

      if (line.quantity <= 0 || line.quantity > maxQuantity) {
        setError('One or more return quantities are invalid.');
        return;
      }
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const items = returnLines.map((line) => ({
        sale_item_id: line.saleItemId,
        batch_id: line.batchId,
        quantity: line.quantity,
        condition: line.condition,
      }));

      const { error: rpcError } = await supabase.rpc('process_sale_return', {
        p_sale_id: selectedSaleId,
        p_reason: returnReason.trim(),
        p_items: items,
      });

      if (rpcError) throw rpcError;

      await loadData();

      setSuccess('Customer return processed successfully.');

      setSelectedAction(null);
      resetActionForms();
    } catch (err) {
      console.error('Return processing error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to process customer return.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRecovery(event: FormEvent) {
    event.preventDefault();

    if (!selectedLossId) {
      setError('Please select a lost stock record.');
      return;
    }

    const requestedQuantity = Number(recoveryQuantity);

    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      setError('Recovery quantity must be greater than zero.');
      return;
    }

    if (!recoveryReason.trim()) {
      setError('Please enter a recovery reason.');
      return;
    }

    const selectedLoss = unresolvedLostAdjustments.find(
      (adjustment) => adjustment.id === selectedLossId
    );

    if (!selectedLoss) {
      setError('Selected loss record was not found.');
      return;
    }

    if (requestedQuantity > selectedLoss.unresolvedQuantity) {
      setError(
        `Only ${selectedLoss.unresolvedQuantity} units can currently be recovered.`
      );
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { error: rpcError } = await supabase.rpc('recover_lost_stock', {
        p_loss_adjustment_id: selectedLossId,
        p_quantity: requestedQuantity,
        p_reason: recoveryReason.trim(),
      });

      if (rpcError) throw rpcError;

      await loadData();

      setSuccess('Lost stock recovered successfully.');

      setSelectedAction(null);
      resetActionForms();
    } catch (err) {
      console.error('Stock recovery error:', err);

      setError(
        err instanceof Error ? err.message : 'Failed to recover lost stock.'
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedSale = selectedSaleId
    ? sales.find((sale) => sale.id === selectedSaleId)
    : undefined;

  const selectedLoss = selectedLossId
    ? unresolvedLostAdjustments.find((loss) => loss.id === selectedLossId)
    : undefined;

  return (
    <main className="space-y-6 pb-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
        <div className="relative p-6 sm:p-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Inventory Control
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Stock Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Control stock losses, damaged items, customer returns, and
                recovery of previously lost stock using your exact batch
                inventory.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <Icon
                name="refresh"
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
            <Icon name="warning" className="h-4 w-4" />
          </div>

          <p className="pt-1">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
            <Icon name="check" className="h-4 w-4" />
          </div>

          <p className="pt-1">{success}</p>
        </div>
      )}

      {/* Overview */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          icon="package"
          label="Units In Stock"
          value={totalUnits.toString()}
          description={`${stockRows.length} product types`}
        />

        <OverviewCard
          icon="money"
          label="Stock Value"
          value={`${formatMoney(totalStockValue)} RWF`}
          description="Based on remaining batch costs"
        />

        <OverviewCard
          icon="warning"
          label="Low Stock"
          value={lowStockCount.toString()}
          description="Product types at minimum level"
          valueClass={
            lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : undefined
          }
        />

        <OverviewCard
          icon="damage"
          label="Out of Stock"
          value={outOfStockCount.toString()}
          description="Product types with zero stock"
          valueClass={
            outOfStockCount > 0 ? 'text-red-600 dark:text-red-400' : undefined
          }
        />
      </section>

      {/* Actions */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Stock Actions
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Search instead of scrolling through large lists when selecting
            stock, sales, or lost records.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map((action) => (
            <div
              key={action.id}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    action.id === 'loss'
                      ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300'
                      : action.id === 'damage'
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300'
                      : action.id === 'return'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300'
                  }`}
                >
                  <span className="text-xl">{action.icon}</span>
                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Stock
                </span>
              </div>

              <h3 className="mt-5 text-base font-bold text-slate-900 dark:text-white">
                {action.title}
              </h3>

              <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-500 dark:text-slate-400">
                {action.description}
              </p>

              <button
                type="button"
                onClick={() => openAction(action.id)}
                className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition ${
                  action.id === 'loss'
                    ? 'bg-red-600 hover:bg-red-700'
                    : action.id === 'damage'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : action.id === 'return'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {action.button}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Current Stock */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Current Stock
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Click a product type to open stock adjustment with that product
              already selected.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />

            <input
              value={stockSearch}
              onChange={(event) => setStockSearch(event.target.value)}
              placeholder="Search product, type, batch..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[250px] items-center justify-center">
            <Icon
              name="refresh"
              className="h-7 w-7 animate-spin text-indigo-600"
            />
          </div>
        ) : filteredStockRows.length === 0 ? (
          <div className="p-10 text-center">
            <Icon
              name="package"
              className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600"
            />

            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              No stock found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-bold">Product Type</th>
                  <th className="px-5 py-4 font-bold">Product</th>
                  <th className="px-5 py-4 font-bold">Stock</th>
                  <th className="px-5 py-4 font-bold">Minimum</th>
                  <th className="px-5 py-4 font-bold">Batches</th>
                  <th className="px-5 py-4 font-bold">Status</th>
                  <th className="px-5 py-4 text-right font-bold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredStockRows.map((row) => {
                  const status = getStockStatus(
                    row.stock,
                    Number(row.productType.minimum_stock || 0)
                  );

                  return (
                    <tr
                      key={row.productType.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            openAction('damage', row.productType.id)
                          }
                          className="flex items-center gap-3 rounded-xl text-left transition hover:opacity-80"
                        >
                          <ImageBox
                            path={row.productType.image_path}
                            name={row.productType.name}
                            size="md"
                          />

                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {row.productType.name}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {row.batches.length} batch
                              {row.batches.length === 1 ? '' : 'es'} · click to
                              adjust
                            </p>
                          </div>
                        </button>
                      </td>

                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                        {row.product.name}
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {row.stock}
                        </span>

                        <span className="ml-1 text-xs text-slate-400">
                          units
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                        {row.productType.minimum_stock}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                        {row.batches.length}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getStockStatusClass(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            openAction('damage', row.productType.id)
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300"
                        >
                          Adjust Stock
                          <Icon name="arrow" className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Loss / Damage */}
      <Modal
        open={selectedAction === 'loss' || selectedAction === 'damage'}
        onClose={closeAction}
        title={getActionTitle(selectedAction)}
        description={
          selectedAction === 'loss'
            ? 'Record stock that is missing from the selected batch.'
            : 'Record stock that is damaged and should no longer be sellable.'
        }
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeAction}
              disabled={saving}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="stock-adjustment-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && (
                <Icon name="refresh" className="h-4 w-4 animate-spin" />
              )}

              {saving
                ? 'Saving...'
                : selectedAction === 'damage'
                ? 'Record Damage'
                : 'Record Loss'}
            </button>
          </div>
        }
      >
        <form
          id="stock-adjustment-form"
          onSubmit={handleLossOrDamage}
          className="space-y-5"
        >
          <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/30">
            <div className="flex gap-3">
              <Icon
                name={selectedAction === 'damage' ? 'damage' : 'loss'}
                className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300"
              />

              <p className="text-sm leading-6 text-indigo-800 dark:text-indigo-200">
                The selected quantity will be removed from the exact batch. The
                existing stock function will also record the adjustment and
                history automatically.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Product / Product Type
            </label>

            {!selectedProductType ? (
              <div className="space-y-3">
                <SearchBox
                  value={productTypeSearch}
                  onChange={setProductTypeSearch}
                  placeholder="Search product or product type..."
                />

                {productTypeSearch.trim() && (
                  <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                    {searchableProductTypes.length === 0 ? (
                      <div className="p-5 text-center">
                        <Icon
                          name="search"
                          className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600"
                        />

                        <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          No matching stock found
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Try a product or type name.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {searchableProductTypes.map((row) => (
                          <button
                            key={row.productType.id}
                            type="button"
                            onClick={() =>
                              handleProductTypeSelect(row.productType.id)
                            }
                            className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                          >
                            <ImageBox
                              path={row.productType.image_path}
                              name={row.productType.name}
                              size="sm"
                            />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                {row.productType.name}
                              </p>

                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {row.product.name}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {row.stock}
                              </p>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                in stock
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!productTypeSearch.trim() && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                    <Icon
                      name="search"
                      className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600"
                    />

                    <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Search for a product
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Search by product name or product type.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                <div className="flex items-center gap-3">
                  <ImageBox
                    path={selectedProductType.image_path}
                    name={selectedProductType.name}
                    size="lg"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900 dark:text-white">
                      {selectedProductType.name}
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedProduct?.name || 'Product'}
                    </p>

                    <p className="mt-1 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                      {selectedProductStock} units left
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearProductTypeSelection}
                    className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                    title="Change selection"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Batch
            </label>

            <select
              value={selectedBatchId}
              onChange={(event) => setSelectedBatchId(event.target.value)}
              required
              disabled={!selectedProductTypeId}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
            >
              <option value="">Select batch</option>

              {selectedTypeBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_number} — {batch.remaining_quantity} remaining —{' '}
                  {formatMoney(Number(batch.unit_cost) || 0)} RWF/unit
                </option>
              ))}
            </select>
          </div>

          {selectedBatch && (
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniInfo
                label="Remaining"
                value={`${selectedBatch.remaining_quantity} units`}
              />

              <MiniInfo
                label="Unit Cost"
                value={`${formatMoney(
                  Number(selectedBatch.unit_cost) || 0
                )} RWF`}
              />

              <MiniInfo
                label="Received"
                value={formatDate(selectedBatch.received_at)}
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Quantity
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="Enter quantity"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Reason
            </label>

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder={
                selectedAction === 'damage'
                  ? 'Why was the stock damaged?'
                  : 'Why is the stock considered lost?'
              }
              required
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </form>
      </Modal>

      {/* Return Modal */}
      <Modal
        open={selectedAction === 'return'}
        onClose={closeAction}
        title="Process Customer Return"
        description="Search for the original sale, then select the exact sold batch items being returned."
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeAction}
              disabled={saving}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="return-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && (
                <Icon name="refresh" className="h-4 w-4 animate-spin" />
              )}

              {saving ? 'Processing...' : 'Process Return'}
            </button>
          </div>
        }
      >
        <form id="return-form" onSubmit={handleReturn} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Original Sale
            </label>

            {!selectedSale ? (
              <div className="space-y-3">
                <SearchBox
                  value={saleSearch}
                  onChange={setSaleSearch}
                  placeholder="Search customer, date, amount..."
                  accent="blue"
                />

                {saleSearch.trim() && (
                  <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                    {searchableSales.length === 0 ? (
                      <div className="p-5 text-center">
                        <Icon
                          name="search"
                          className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600"
                        />

                        <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          No matching sales found
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {searchableSales.map((sale) => {
                          const customer = sale.customer_id
                            ? customerMap.get(sale.customer_id)
                            : undefined;

                          return (
                            <button
                              key={sale.id}
                              type="button"
                              onClick={() => handleSaleSelect(sale.id)}
                              className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            >
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                                <Icon name="return" className="h-5 w-5" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                  {customer?.name || 'Walk-in Customer'}
                                </p>

                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatDate(sale.sale_date)} ·{' '}
                                  {sale.payment_status}
                                </p>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                  {formatMoney(Number(sale.total_revenue) || 0)}{' '}
                                  RWF
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {!saleSearch.trim() && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                    <Icon
                      name="search"
                      className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600"
                    />

                    <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Search for the sale
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Search by customer, date, amount, or payment status.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                    <Icon name="return" className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedSale.customer_id
                        ? customerMap.get(selectedSale.customer_id)?.name ||
                          'Customer'
                        : 'Walk-in Customer'}
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(selectedSale.sale_date)} ·{' '}
                      {formatMoney(Number(selectedSale.total_revenue) || 0)} RWF
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearSaleSelection}
                    className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                    title="Change sale"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedSale && (
            <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/30">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                Original Sale
              </p>

              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <MiniInfo
                  label="Customer"
                  value={
                    selectedSale.customer_id
                      ? customerMap.get(selectedSale.customer_id)?.name ||
                        'Customer'
                      : 'Walk-in Customer'
                  }
                />

                <MiniInfo
                  label="Revenue"
                  value={`${formatMoney(
                    Number(selectedSale.total_revenue) || 0
                  )} RWF`}
                />

                <MiniInfo
                  label="Date"
                  value={formatDate(selectedSale.sale_date)}
                />
              </div>
            </div>
          )}

          {selectedSaleId && (
            <div>
              <div className="mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Sold Items
                </h3>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Select the exact batch and quantity being returned.
                </p>
              </div>

              <div className="space-y-3">
                {selectedSaleItems.map((item) => {
                  const type = productTypeMap.get(item.product_type_id);

                  const product = type
                    ? productMap.get(type.product_id)
                    : undefined;

                  const itemAllocations = allocations.filter(
                    (allocation) => allocation.sale_item_id === item.id
                  );

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <ImageBox
                          path={type?.image_path || null}
                          name={type?.name || 'Product Type'}
                        />

                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {type?.name || 'Product Type'}
                          </p>

                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {product?.name || 'Product'} · Sold: {item.quantity}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {itemAllocations.map((allocation) => {
                          const batch = batchMap.get(allocation.batch_id);

                          const returnable = getReturnableQuantity(
                            item.id,
                            allocation.batch_id
                          );

                          const line = getReturnLine(
                            item.id,
                            allocation.batch_id
                          );

                          return (
                            <div
                              key={allocation.id}
                              className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60"
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={Boolean(line)}
                                  disabled={returnable <= 0}
                                  onChange={() =>
                                    toggleReturnLine(
                                      item.id,
                                      allocation.batch_id
                                    )
                                  }
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                                        Batch {batch?.batch_number || 'Batch'}
                                      </p>

                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Sold: {allocation.quantity} ·
                                        Returnable: {returnable}
                                      </p>
                                    </div>

                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                      {formatMoney(
                                        Number(allocation.unit_cost) || 0
                                      )}{' '}
                                      RWF/unit
                                    </span>
                                  </div>

                                  {line && (
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                                          Return Quantity
                                        </label>

                                        <input
                                          type="number"
                                          min="1"
                                          max={returnable}
                                          value={line.quantity}
                                          onChange={(event) =>
                                            updateReturnLine(
                                              item.id,
                                              allocation.batch_id,
                                              {
                                                quantity: Math.min(
                                                  Math.max(
                                                    Number(
                                                      event.target.value
                                                    ) || 1,
                                                    1
                                                  ),
                                                  returnable
                                                ),
                                              }
                                            )
                                          }
                                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                                          Condition
                                        </label>

                                        <select
                                          value={line.condition}
                                          onChange={(event) =>
                                            updateReturnLine(
                                              item.id,
                                              allocation.batch_id,
                                              {
                                                condition: event.target
                                                  .value as
                                                  | 'resellable'
                                                  | 'damaged',
                                              }
                                            )
                                          }
                                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                        >
                                          <option value="resellable">
                                            Resellable
                                          </option>

                                          <option value="damaged">
                                            Damaged
                                          </option>
                                        </select>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {itemAllocations.length === 0 && (
                          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                            No batch allocation was found for this sale item.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {selectedSaleItems.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No sale items found.
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Return Reason
            </label>

            <textarea
              value={returnReason}
              onChange={(event) => setReturnReason(event.target.value)}
              rows={3}
              placeholder="Why is the customer returning these items?"
              required
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </form>
      </Modal>

      {/* Recover Lost Stock */}
      <Modal
        open={selectedAction === 'recover'}
        onClose={closeAction}
        title="Recover Lost Stock"
        description="Search for a previously lost stock record and recover it back to its original batch."
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeAction}
              disabled={saving}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="recovery-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving && (
                <Icon name="refresh" className="h-4 w-4 animate-spin" />
              )}

              {saving ? 'Recovering...' : 'Recover Stock'}
            </button>
          </div>
        }
      >
        <form
          id="recovery-form"
          onSubmit={handleRecovery}
          className="space-y-5"
        >
          <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <div className="flex gap-3">
              <Icon
                name="recover"
                className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300"
              />

              <p className="text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                Recovered stock goes back to the original batch. The existing
                recovery function will record the recovery and update inventory.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Lost Stock Record
            </label>

            {!selectedLoss ? (
              <div className="space-y-3">
                <SearchBox
                  value={lossSearch}
                  onChange={setLossSearch}
                  placeholder="Search product, type, batch..."
                  accent="emerald"
                />

                {lossSearch.trim() && (
                  <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                    {searchableLosses.length === 0 ? (
                      <div className="p-5 text-center">
                        <Icon
                          name="recover"
                          className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600"
                        />

                        <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          No recoverable losses found
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {searchableLosses.map((loss) => {
                          const type = productTypeMap.get(loss.product_type_id);

                          const product = type
                            ? productMap.get(type.product_id)
                            : undefined;

                          const batch = batchMap.get(loss.batch_id);

                          return (
                            <button
                              key={loss.id}
                              type="button"
                              onClick={() => handleLossSelect(loss.id)}
                              className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            >
                              <ImageBox
                                path={type?.image_path || null}
                                name={type?.name || 'Product Type'}
                                size="sm"
                              />

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                  {type?.name || 'Product Type'}
                                </p>

                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {product?.name || 'Product'} · Batch{' '}
                                  {batch?.batch_number || 'Batch'}
                                </p>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                  {loss.unresolvedQuantity}
                                </p>

                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  recoverable
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {!lossSearch.trim() && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                    <Icon
                      name="recover"
                      className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600"
                    />

                    <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Search for lost stock
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Only losses with unresolved quantities are shown.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3">
                  <ImageBox
                    path={
                      productTypeMap.get(selectedLoss.product_type_id)
                        ?.image_path || null
                    }
                    name={
                      productTypeMap.get(selectedLoss.product_type_id)?.name ||
                      'Product Type'
                    }
                    size="lg"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900 dark:text-white">
                      {productTypeMap.get(selectedLoss.product_type_id)?.name ||
                        'Product Type'}
                    </p>

                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {productMap.get(
                        productTypeMap.get(selectedLoss.product_type_id)
                          ?.product_id || ''
                      )?.name || 'Product'}{' '}
                      · Batch{' '}
                      {batchMap.get(selectedLoss.batch_id)?.batch_number ||
                        'Batch'}
                    </p>

                    <p className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                      {selectedLoss.unresolvedQuantity} units recoverable
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearLossSelection}
                    className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                    title="Change selection"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedLoss && (
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniInfo
                label="Originally Lost"
                value={`${selectedLoss.quantity} units`}
              />

              <MiniInfo
                label="Can Recover"
                value={`${selectedLoss.unresolvedQuantity} units`}
              />

              <MiniInfo
                label="Recorded"
                value={formatDate(selectedLoss.created_at)}
              />
            </div>
          )}

          {selectedLoss && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Original Reason
              </p>

              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                {selectedLoss.reason}
              </p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Recovery Quantity
            </label>

            <input
              type="number"
              min="1"
              max={selectedLoss?.unresolvedQuantity}
              step="1"
              value={recoveryQuantity}
              onChange={(event) => setRecoveryQuantity(event.target.value)}
              placeholder="Enter quantity recovered"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Recovery Reason
            </label>

            <textarea
              value={recoveryReason}
              onChange={(event) => setRecoveryReason(event.target.value)}
              rows={3}
              placeholder="Explain why the lost stock was recovered."
              required
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </form>
      </Modal>
    </main>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  description,
  valueClass,
}: {
  icon: 'package' | 'warning' | 'damage' | 'money';
  label: string;
  value: string;
  description: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
        <Icon name={icon} className="h-5 w-5" />
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold ${
          valueClass || 'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </p>

      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}
