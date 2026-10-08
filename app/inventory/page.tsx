'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import Modal from '@/components/modal';

const PRODUCT_IMAGE_BUCKET = 'product-images';

type Product = {
  id: string;
  name: string;
  status?: string | null;
};

type ProductType = {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  minimum_stock: number;
  status: string;
};

type Batch = {
  id: string;
  product_type_id: string;
  batch_number: string;
  received_at: string;
  original_quantity: number;
  remaining_quantity: number;
  unit_cost: number;
  attachment_path: string | null;
  status: string;
  created_at: string;
};

type InventoryRow = {
  productType: ProductType;
  product: Product | null;
  batches: Batch[];
  stock: number;
  stockValue: number;
};

function toNumber(value: number | string | null | undefined) {
  const number = Number(value ?? 0);

  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-RW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-RW', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getPublicImageUrl(imagePath: string | null) {
  if (!imagePath) return null;

  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(imagePath)
    .data.publicUrl;
}

function getStockStatus(stock: number, minimumStock: number) {
  if (stock <= 0) {
    return {
      label: 'Out of Stock',
      className:
        'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
      dotClass: 'bg-rose-500',
    };
  }

  if (stock <= minimumStock) {
    return {
      label: 'Low Stock',
      className:
        'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
      dotClass: 'bg-amber-500',
    };
  }

  return {
    label: 'In Stock',
    className:
      'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    dotClass: 'bg-emerald-500',
  };
}

function getBatchStatusClass(status: string) {
  const value = status.toLowerCase();

  if (value.includes('finished')) {
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }

  if (value.includes('low')) {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
  }

  if (value.includes('cancel')) {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
  }

  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ');
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  const [selectedRow, setSelectedRow] = useState<InventoryRow | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadInventory = useCallback(async () => {
    try {
      setError('');

      const [productsResult, productTypesResult, batchesResult] =
        await Promise.all([
          supabase.from('products').select('id, name, status').order('name'),

          supabase
            .from('product_types')
            .select(
              'id, product_id, name, description, image_path, minimum_stock, status'
            )
            .order('name'),

          supabase
            .from('batches')
            .select(
              'id, product_type_id, batch_number, received_at, original_quantity, remaining_quantity, unit_cost, attachment_path, status, created_at'
            )
            .order('received_at', {
              ascending: true,
            }),
        ]);

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (productTypesResult.error) {
        throw productTypesResult.error;
      }

      if (batchesResult.error) {
        throw batchesResult.error;
      }

      setProducts((productsResult.data || []) as Product[]);

      setProductTypes((productTypesResult.data || []) as ProductType[]);

      setBatches((batchesResult.data || []) as Batch[]);
    } catch (err) {
      console.error('Inventory load error:', err);

      setError(
        err instanceof Error ? err.message : 'Failed to load inventory.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const inventoryRows = useMemo<InventoryRow[]>(() => {
    const productMap = new Map(
      products.map((product) => [product.id, product])
    );

    const batchesByProductType = new Map<string, Batch[]>();

    for (const batch of batches) {
      const existing = batchesByProductType.get(batch.product_type_id) || [];

      existing.push(batch);

      batchesByProductType.set(batch.product_type_id, existing);
    }

    return productTypes
      .filter((productType) => productType.status !== 'inactive')
      .map((productType) => {
        const typeBatches = batchesByProductType.get(productType.id) || [];

        const stock = typeBatches.reduce(
          (total, batch) =>
            total + Math.max(toNumber(batch.remaining_quantity), 0),
          0
        );

        const stockValue = typeBatches.reduce((total, batch) => {
          const quantity = Math.max(toNumber(batch.remaining_quantity), 0);

          const unitCost = toNumber(batch.unit_cost);

          return total + quantity * unitCost;
        }, 0);

        return {
          productType,
          product: productMap.get(productType.product_id) || null,
          batches: typeBatches,
          stock,
          stockValue,
        };
      });
  }, [products, productTypes, batches]);

  const filteredRows = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return inventoryRows.filter((row) => {
      const matchesSearch =
        !searchValue ||
        row.productType.name.toLowerCase().includes(searchValue) ||
        row.product?.name.toLowerCase().includes(searchValue) ||
        row.batches.some((batch) =>
          batch.batch_number.toLowerCase().includes(searchValue)
        );

      const matchesProduct =
        productFilter === 'all' || row.productType.product_id === productFilter;

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'out' && row.stock <= 0) ||
        (stockFilter === 'low' &&
          row.stock > 0 &&
          row.stock <= row.productType.minimum_stock) ||
        (stockFilter === 'available' &&
          row.stock > row.productType.minimum_stock);

      return matchesSearch && matchesProduct && matchesStock;
    });
  }, [inventoryRows, search, productFilter, stockFilter]);

  const totalTypes = inventoryRows.length;

  const totalUnits = inventoryRows.reduce((total, row) => total + row.stock, 0);

  const totalStockValue = inventoryRows.reduce(
    (total, row) => total + row.stockValue,
    0
  );

  const lowStockCount = inventoryRows.filter(
    (row) => row.stock > 0 && row.stock <= row.productType.minimum_stock
  ).length;

  const outOfStockCount = inventoryRows.filter((row) => row.stock <= 0).length;

  const availableCount = inventoryRows.filter(
    (row) => row.stock > row.productType.minimum_stock
  ).length;

  function handleRefresh() {
    setRefreshing(true);
    loadInventory();
  }

  function openDetails(row: InventoryRow) {
    setSelectedRow(row);
    setDetailsOpen(true);
  }

  function closeDetails() {
    setDetailsOpen(false);
    setSelectedRow(null);
  }

  const selectedImageUrl = selectedRow
    ? getPublicImageUrl(selectedRow.productType.image_path)
    : null;

  const selectedStatus = selectedRow
    ? getStockStatus(selectedRow.stock, selectedRow.productType.minimum_stock)
    : null;

  return (
    <main className="min-h-full space-y-6 bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-xl sm:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Stock Control
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Inventory
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Monitor your kitchenware stock, product types, batches and
                current inventory value.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshIcon className={refreshing ? 'animate-spin' : ''} />

              {refreshing ? 'Refreshing...' : 'Refresh Inventory'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">
                  Inventory could not load completely.
                </p>

                <p className="mt-1 break-words text-xs opacity-80">{error}</p>
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

        {/* Summary */}
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Overview
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
            Stock at a Glance
          </h2>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Product Types"
            value={formatNumber(totalTypes)}
            description="Active types / kinds"
            icon={<TypeIcon />}
            accent="indigo"
          />

          <SummaryCard
            title="Units in Stock"
            value={formatNumber(totalUnits)}
            description="Across all active batches"
            icon={<BoxIcon />}
            accent="blue"
          />

          <SummaryCard
            title="Stock Value"
            value={`${formatMoney(totalStockValue)} RWF`}
            description="Current inventory cost value"
            icon={<MoneyIcon />}
            accent="emerald"
          />

          <SummaryCard
            title="Stock Attention"
            value={formatNumber(lowStockCount + outOfStockCount)}
            description={`${lowStockCount} low • ${outOfStockCount} out`}
            icon={<WarningIcon />}
            accent="amber"
          />
        </div>

        {/* Status strip */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatusStat
            label="Available"
            value={availableCount}
            icon={<CheckIcon />}
            className="text-emerald-600 dark:text-emerald-400"
          />

          <StatusStat
            label="Low Stock"
            value={lowStockCount}
            icon={<WarningIcon />}
            className="text-amber-600 dark:text-amber-400"
          />

          <StatusStat
            label="Out of Stock"
            value={outOfStockCount}
            icon={<AlertIcon />}
            className="text-rose-600 dark:text-rose-400"
          />
        </div>

        {/* Filters */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Find Stock
            </p>

            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Search & Filters
            </h2>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Search
              </label>

              <div className="relative">
                <SearchIcon />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Product, type, or batch..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-950"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Product
              </label>

              <select
                value={productFilter}
                onChange={(event) => setProductFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="all">All Products</option>

                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Stock Status
              </label>

              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="all">All Stock</option>

                <option value="available">Available</option>

                <option value="low">Low Stock</option>

                <option value="out">Out of Stock</option>
              </select>
            </div>
          </div>

          {(search || productFilter !== 'all' || stockFilter !== 'all') && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400">
                Active filters:
              </span>

              {search && (
                <FilterBadge
                  label={`Search: ${search}`}
                  onClear={() => setSearch('')}
                />
              )}

              {productFilter !== 'all' && (
                <FilterBadge
                  label="Product filter"
                  onClear={() => setProductFilter('all')}
                />
              )}

              {stockFilter !== 'all' && (
                <FilterBadge
                  label={`Stock: ${stockFilter}`}
                  onClear={() => setStockFilter('all')}
                />
              )}

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setProductFilter('all');
                  setStockFilter('all');
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Inventory Records
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  Stock Overview
                </h2>
              </div>

              <p className="text-sm text-slate-400">
                {filteredRows.length} of {inventoryRows.length} types shown
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : filteredRows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-bold">Product</th>

                    <th className="px-5 py-4 font-bold">Type / Kind</th>

                    <th className="px-5 py-4 font-bold">Stock</th>

                    <th className="px-5 py-4 font-bold">Minimum</th>

                    <th className="px-5 py-4 font-bold">Stock Value</th>

                    <th className="px-5 py-4 font-bold">Batches</th>

                    <th className="px-5 py-4 font-bold">Status</th>

                    <th className="px-5 py-4 text-right font-bold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRows.map((row) => {
                    const status = getStockStatus(
                      row.stock,
                      row.productType.minimum_stock
                    );

                    const imageUrl = getPublicImageUrl(
                      row.productType.image_path
                    );

                    return (
                      <tr
                        key={row.productType.id}
                        className="group transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                              <ProductsIcon />
                            </div>

                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                {row.product?.name || 'Unknown product'}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                Product
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => openDetails(row)}
                            className="group/type flex items-center gap-3 text-left"
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={row.productType.name}
                                className="h-12 w-12 rounded-xl border border-slate-200 object-cover shadow-sm transition group-hover/type:scale-105 dark:border-slate-700"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition group-hover/type:scale-105 dark:bg-slate-800 dark:text-slate-300">
                                <ImageIcon />
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="font-bold text-indigo-700 transition group-hover/type:text-indigo-600 dark:text-indigo-400">
                                {row.productType.name}
                              </p>

                              {row.productType.description && (
                                <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                                  {row.productType.description}
                                </p>
                              )}
                            </div>
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-black text-slate-900 dark:text-white">
                            {formatNumber(row.stock)}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">units</p>
                        </td>

                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                          {formatNumber(
                            toNumber(row.productType.minimum_stock)
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {formatMoney(row.stockValue)} RWF
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <BatchIcon />
                            {row.batches.length}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-bold ${status.className}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`}
                            />

                            {status.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openDetails(row)}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                          >
                            View
                            <ArrowIcon />
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

        {/* Details Modal */}
        <Modal
          open={detailsOpen}
          onClose={closeDetails}
          title="Inventory Details"
          description={
            selectedRow
              ? `${selectedRow.product?.name || 'Unknown product'} → ${
                  selectedRow.productType.name
                }`
              : undefined
          }
          footer={
            <button
              type="button"
              onClick={closeDetails}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Close
            </button>
          }
        >
          {selectedRow && (
            <div className="space-y-6">
              {/* Product Type Hero */}
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                  {/* IMAGE */}
                  <div className="relative min-h-[220px] bg-slate-100 dark:bg-slate-800">
                    {selectedImageUrl ? (
                      <img
                        src={selectedImageUrl}
                        alt={selectedRow.productType.name}
                        className="h-full min-h-[220px] w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-[220px] items-center justify-center">
                        <div className="text-center">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm dark:bg-slate-900 dark:text-slate-500">
                            <ImageIcon className="h-8 w-8" />
                          </div>

                          <p className="mt-3 text-xs font-semibold text-slate-400">
                            No image available
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* INFORMATION */}
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                        Product Type / Kind
                      </span>

                      {selectedStatus && (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${selectedStatus.className}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${selectedStatus.dotClass}`}
                          />

                          {selectedStatus.label}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {selectedRow.productType.name}
                    </h3>

                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {selectedRow.product?.name || 'Unknown product'}
                    </p>

                    <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {selectedRow.productType.description ||
                        'No description has been added for this product type.'}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <InfoMetric
                        label="Current Stock"
                        value={formatNumber(selectedRow.stock)}
                      />

                      <InfoMetric
                        label="Stock Value"
                        value={`${formatMoney(selectedRow.stockValue)} RWF`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main metrics */}
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard
                  label="Current Stock"
                  value={formatNumber(selectedRow.stock)}
                  icon={<BoxIcon />}
                  accent="indigo"
                />

                <MetricCard
                  label="Minimum Stock"
                  value={formatNumber(
                    toNumber(selectedRow.productType.minimum_stock)
                  )}
                  icon={<TargetIcon />}
                  accent="amber"
                />

                <MetricCard
                  label="Stock Value"
                  value={`${formatMoney(selectedRow.stockValue)} RWF`}
                  icon={<MoneyIcon />}
                  accent="emerald"
                />
              </div>

              {/* Batch section */}
              <div>
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      Batch Breakdown
                    </p>

                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                      Stock by Batch
                    </h3>
                  </div>

                  <span className="text-xs text-slate-400">
                    {selectedRow.batches.length} batch
                    {selectedRow.batches.length === 1 ? '' : 'es'}
                  </span>
                </div>

                {selectedRow.batches.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                    <BatchIcon className="mx-auto h-7 w-7 text-slate-400" />

                    <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                      No batches found
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      This product type does not have any batch records yet.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="overflow-x-auto">
                      <table className="min-w-[900px] w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                          <tr>
                            <th className="px-4 py-3 font-bold">Batch</th>

                            <th className="px-4 py-3 font-bold">Received</th>

                            <th className="px-4 py-3 font-bold">Original</th>

                            <th className="px-4 py-3 font-bold">Remaining</th>

                            <th className="px-4 py-3 font-bold">Unit Cost</th>

                            <th className="px-4 py-3 font-bold">
                              Remaining Value
                            </th>

                            <th className="px-4 py-3 font-bold">Status</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedRow.batches.map((batch) => {
                            const remaining = Math.max(
                              toNumber(batch.remaining_quantity),
                              0
                            );

                            const original = Math.max(
                              toNumber(batch.original_quantity),
                              0
                            );

                            const unitCost = toNumber(batch.unit_cost);

                            const batchValue = remaining * unitCost;

                            return (
                              <tr
                                key={batch.id}
                                className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                              >
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                      <BatchIcon />
                                    </span>

                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {batch.batch_number}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                                  {formatDate(batch.received_at)}
                                </td>

                                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                                  {formatNumber(original)}
                                </td>

                                <td className="px-4 py-4">
                                  <span className="font-black text-slate-900 dark:text-white">
                                    {formatNumber(remaining)}
                                  </span>
                                </td>

                                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                                  {formatMoney(unitCost)} RWF
                                </td>

                                <td className="px-4 py-4">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {formatMoney(batchValue)} RWF
                                  </span>
                                </td>

                                <td className="px-4 py-4">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${getBatchStatusClass(
                                      batch.status
                                    )}`}
                                  >
                                    {formatStatus(batch.status)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Image path info intentionally omitted */}
            </div>
          )}
        </Modal>
      </div>
    </main>
  );
}

/* ---------------- Components ---------------- */

function SummaryCard({
  title,
  value,
  description,
  icon,
  accent,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  accent: 'indigo' | 'blue' | 'emerald' | 'amber';
}) {
  const classes = {
    indigo:
      'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    emerald:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber:
      'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  };

  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">{description}</p>
        </div>

        <div
          className={`rounded-2xl p-3.5 transition group-hover:scale-105 ${classes[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusStat({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={className}>{icon}</div>

      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>

        <p className="text-lg font-black text-slate-900 dark:text-white">
          {formatNumber(value)}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: 'indigo' | 'amber' | 'emerald';
}) {
  const classes = {
    indigo:
      'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    amber:
      'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    emerald:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${classes[accent]}`}>{icon}</div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{label}</p>

          <p className="mt-0.5 truncate text-base font-black text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>

      <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function FilterBadge({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
    >
      {label}

      <span className="text-indigo-400">×</span>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[340px] items-center justify-center p-8">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400" />

        <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
          Loading inventory...
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Reading products, types and batches.
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[340px] items-center justify-center p-8">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <BoxIcon className="h-8 w-8" />
        </div>

        <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">
          No inventory found
        </h3>

        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Try changing your search or stock filters. Active product types will
          appear here.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Icons ---------------- */

function Icon({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
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
  );
}

function RefreshIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M20 11a8 8 0 0 0-14-5L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14 5l2-2" />
      <path d="M20 20v-4h-4" />
    </Icon>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <Icon className="h-4 w-4">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  );
}

function BoxIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </Icon>
  );
}

function TypeIcon() {
  return (
    <Icon>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </Icon>
  );
}

function ProductsIcon() {
  return (
    <Icon>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </Icon>
  );
}

function MoneyIcon() {
  return (
    <Icon>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h.01M17 15h.01" />
      <circle cx="12" cy="12" r="2.5" />
    </Icon>
  );
}

function WarningIcon() {
  return (
    <Icon>
      <path d="m12 3 9 17H3z" />
      <path d="M12 9v5M12 17v.01" />
    </Icon>
  );
}

function AlertIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16v.01" />
    </Icon>
  );
}

function CheckIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </Icon>
  );
}

function BatchIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" />
    </Icon>
  );
}

function ImageIcon({ className = '' }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m4 17 5-5 3 3 2-2 6 5" />
    </Icon>
  );
}

function TargetIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </Icon>
  );
}
