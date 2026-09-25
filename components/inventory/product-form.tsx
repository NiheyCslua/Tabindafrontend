'use client'

import { useEffect, useState, useRef, type ChangeEvent } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ImagePlus, X, Plus, Trash2, ScanBarcode, CheckCircle2, AlertCircle } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import { useInventoryStore } from '@/lib/store/inventory-store'
import { useCategoryStore } from '@/lib/store/category-store'
import { getProductCategories } from '@/lib/dashboard-derived'
import { useVendorStore } from '@/lib/store/vendor-store'
import { useSerialStore } from '@/lib/store/serial-store'
import type { Product, CreateProductDTO } from '@/lib/types'

// ── Zod schema ────────────────────────────────────────────────────────────────

const variantSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Variant name is required'),
  value: z.string().min(1, 'Variant value is required'),
  skuSuffix: z.string().optional(),
  priceAdjustment: z.number().default(0),
})

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  brand: z.string().min(1, 'Brand is required'),
  vendorId: z.string().optional(),
  vendorName: z.string().optional(),
  costPrice: z.number().min(0, 'Cost price must be positive'),
  sellingPrice: z.number().min(0, 'Selling price must be positive'),
  taxRate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),
  // Negative quantity is allowed and expected — a product can go negative
  // from oversold inventory (see "Allow Negative Inventory During Invoice
  // Creation"). No lower bound here at all, just a real number.
  quantity: z.number(),
  reorderLevel: z.number().min(0, 'Reorder level must be positive'),
  maxStock: z.number().min(0, 'Max stock must be positive'),
  status: z.enum(['active', 'inactive']),
  image: z.string().optional(),
  images: z.array(z.string()).default([]),
  variants: z.array(variantSchema).default([]),
})

type ProductFormData = z.infer<typeof productSchema>

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScannedSerial {
  value: string
  error: string  // empty = valid
}

interface ProductFormProps {
  product?: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateProductDTO) => Promise<Product | void>
  isLoading?: boolean
}

const EMPTY_FORM_VALUES: ProductFormData = {
  name: '',
  sku: '',
  barcode: '',
  description: '',
  category: '',
  subcategory: '',
  brand: '',
  vendorId: '',
  vendorName: '',
  costPrice: 0,
  sellingPrice: 0,
  taxRate: 0,
  quantity: 0,
  reorderLevel: 0,
  maxStock: 100,
  status: 'active',
  image: '',
  images: [],
  variants: [],
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductForm({
  product,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: ProductFormProps) {
  const isEdit = !!product
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [deleteCategoryName, setDeleteCategoryName] = useState<string | null>(null)
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)

  // Multi-scan serial state — same pattern as invoice form
  const [serials, setSerials] = useState<ScannedSerial[]>([])
  const [scanInput, setScanInput] = useState('')
  const scanInputRef = useRef<HTMLInputElement>(null)

  const { vendors, fetchVendors } = useVendorStore()
  const { addUnits, findBySerial } = useSerialStore()
  const products = useInventoryStore((state) => state.products)
  const savedCategories = useCategoryStore((state) => state.categories)
  const fetchCategories = useCategoryStore((state) => state.fetchCategories)
  const addCategory = useCategoryStore((state) => state.addCategory)
  const deleteCategory = useCategoryStore((state) => state.deleteCategory)
  const productCategories = getProductCategories(products, savedCategories.map(category => category.name))

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_FORM_VALUES,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'variants' })

  useEffect(() => {
    fetchVendors()
    fetchCategories()
  }, [fetchVendors, fetchCategories])

  useEffect(() => {
    if (!open) return

    if (product) {
      const existingImages =
        product.images && product.images.length > 0
          ? product.images
          : product.image ? [product.image] : []

      reset({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || '',
        description: product.description,
        category: product.category,
        subcategory: product.subcategory || '',
        brand: product.brand,
        vendorId: product.vendorId || '',
        vendorName: product.vendorName || '',
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        taxRate: product.taxRate,
        quantity: product.quantity,
        reorderLevel: product.reorderLevel,
        maxStock: product.maxStock,
        status: product.status,
        image: existingImages[0] || '',
        images: existingImages,
        variants: product.variants || [],
      })
      setImagePreviews(existingImages)
    } else {
      reset(EMPTY_FORM_VALUES)
      setImagePreviews([])
    }

    setSerials([])
    setScanInput('')
    setSubmitError(null)
    setIsAddingCategory(false)
    setNewCategoryName('')
    setCategoryError(null)
    setDeleteCategoryName(null)
  }, [product, open, reset])

  const status   = watch('status')
  const category = watch('category')
  const vendorId = watch('vendorId')


  // ── Category helper ───────────────────────────────────────────────────────

  const handleAddCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) {
      setCategoryError('Category name is required.')
      return
    }

    try {
      const category = await addCategory(name)
      setValue('category', category.name, { shouldValidate: true, shouldDirty: true })
      setNewCategoryName('')
      setIsAddingCategory(false)
      setCategoryError(null)
    } catch (err: unknown) {
      setCategoryError(err instanceof Error ? err.message : 'Failed to add category.')
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteCategoryName) return
    setIsDeletingCategory(true)
    try {
      await deleteCategory(deleteCategoryName)
      // Refresh so "Uncategorized" (guaranteed to exist server-side once a
      // category has ever been deleted) shows up in the picker immediately.
      await fetchCategories()
      // Products using this category were reassigned to "Uncategorized"
      // server-side — if the form currently has the deleted category
      // selected, follow that reassignment here too.
      if (category.toLowerCase() === deleteCategoryName.toLowerCase()) {
        setValue('category', 'Uncategorized', { shouldValidate: true, shouldDirty: true })
      }
      setCategoryError(null)
    } catch (err: unknown) {
      setCategoryError(err instanceof Error ? err.message : 'Failed to delete category.')
    } finally {
      setIsDeletingCategory(false)
      setDeleteCategoryName(null)
    }
  }

  // ── Vendor helper ─────────────────────────────────────────────────────────

  const handleVendorChange = (id: string) => {
    if (id === 'none') {
      setValue('vendorId', '', { shouldDirty: true })
      setValue('vendorName', '', { shouldDirty: true })
      return
    }

    setValue('vendorId', id, { shouldDirty: true })
    const vendor = vendors.find(v => v.id === id)
    setValue('vendorName', vendor ? vendor.company : '', { shouldDirty: true })
  }

  // ── Image helpers ─────────────────────────────────────────────────────────

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const readFile = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    const newImages = await Promise.all(files.map(readFile))
    const updatedImages = [...imagePreviews, ...newImages]
    setImagePreviews(updatedImages)
    setValue('images', updatedImages, { shouldValidate: true, shouldDirty: true })
    setValue('image', updatedImages[0] || '', { shouldValidate: true, shouldDirty: true })
    e.target.value = ''
  }

  const removeImageAt = (index: number) => {
    const updatedImages = imagePreviews.filter((_, i) => i !== index)
    setImagePreviews(updatedImages)
    setValue('images', updatedImages, { shouldValidate: true, shouldDirty: true })
    setValue('image', updatedImages[0] || '', { shouldValidate: true, shouldDirty: true })
  }

  const setPrimaryImage = (index: number) => {
    const updatedImages = [...imagePreviews]
    const [selected] = updatedImages.splice(index, 1)
    updatedImages.unshift(selected)
    setImagePreviews(updatedImages)
    setValue('images', updatedImages, { shouldValidate: true, shouldDirty: true })
    setValue('image', updatedImages[0] || '', { shouldValidate: true, shouldDirty: true })
  }

  // ── Variant helpers ───────────────────────────────────────────────────────

  const addVariantRow = () => {
    append({
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}`,
      name: '',
      value: '',
      skuSuffix: '',
      priceAdjustment: 0,
    })
  }

  // ── Serial scan helpers ───────────────────────────────────────────────────

  const validateSerial = (sn: string): string => {
    if (serials.some(s => s.value === sn)) return 'Already scanned.'
    const existing = findBySerial(sn)
    if (existing && existing.productId !== product?.id) {
      return `Already registered to "${existing.productName}".`
    }
    if (existing && existing.status === 'sold') {
      return 'This unit has already been sold.'
    }
    return ''
  }

  const commitSerial = () => {
    const trimmed = scanInput.trim()
    if (!trimmed) return
    const error = validateSerial(trimmed)
    const newSerials = [...serials, { value: trimmed, error }]
    setSerials(newSerials)
    setScanInput('')
    // Auto-sync quantity to count of valid serials
    if (!error) {
      const validCount = newSerials.filter(s => !s.error).length
      setValue('quantity', validCount, { shouldDirty: true })
    }
    // keep focus for rapid back-to-back scanning
    setTimeout(() => scanInputRef.current?.focus(), 0)
  }

  const removeSerial = (index: number) => {
    const removed = serials[index]
    const newSerials = serials.filter((_, i) => i !== index)
    setSerials(newSerials)
    // Re-sync quantity only if the removed serial was valid
    if (!removed.error) {
      const validCount = newSerials.filter(s => !s.error).length
      setValue('quantity', validCount, { shouldDirty: true })
    }
  }

  const hasSerialErrors = serials.some(s => s.error)
  const validSerials = serials.filter(s => !s.error)

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleFormSubmit = async (data: ProductFormData) => {
    setSubmitError(null)

    if (hasSerialErrors) {
      setSubmitError('Please remove invalid serial numbers before saving.')
      return
    }

    const cleanedVariants = data.variants.filter(v => v.name.trim() && v.value.trim())

    try {
      const savedProduct = await onSubmit({
        ...data,
        barcode: data.barcode || '',
        description: data.description || '',
        vendorId: data.vendorId || undefined,
        vendorName: data.vendorName || undefined,
        image: data.images[0] || '',
        images: data.images,
        variants: cleanedVariants,
      })

      // Register all valid scanned serials as in-stock units
      if (validSerials.length > 0) {
        const productId = product?.id || savedProduct?.id
        if (!productId) throw new Error('Product was saved, but the backend did not return a product id for serial tracking.')
        await addUnits(validSerials.map(s => ({
          serialNumber: s.value,
          productId,
          productName: data.name,
          productSku: data.sku,
          barcode: data.barcode || '',
          vendorId: data.vendorId,
          vendorName: data.vendorName,
          purchaseDate: new Date().toISOString(),
          costPrice: data.costPrice,
        })))
      }

      reset(EMPTY_FORM_VALUES)
      setImagePreviews([])
      setSerials([])
      setScanInput('')
      onOpenChange(false)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save product.')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the product information below.' : 'Fill in the product details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">

          {/* ── Basic Information ── */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" {...register('name')} className="border-border bg-muted/50" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" {...register('sku')} className="border-border bg-muted/50" />
                {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
              </div>
            </div>

            {/* Barcode — scan-only, no generate button */}
            <div className="space-y-2">
              <Label htmlFor="barcode" className="flex items-center gap-1.5">
                <ScanBarcode className="h-4 w-4" />
                Barcode
                <span className="text-xs text-muted-foreground font-normal">(optional — unique per product-vendor)</span>
              </Label>
              <Input
                id="barcode"
                {...register('barcode')}
                placeholder="Scan barcode or type manually…"
                className="border-border bg-muted/50 font-mono"
                autoComplete="off"
              />
              {errors.barcode && <p className="text-sm text-destructive">{errors.barcode.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={category}
                  onValueChange={v => setValue('category', v, { shouldValidate: true, shouldDirty: true })}
                >
                  <SelectTrigger className="border-border bg-muted/50">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.length === 0 ? (
                      <div className="px-2 py-2 text-sm text-muted-foreground">No categories yet.</div>
                    ) : (
                      productCategories.map(cat => (
                        <div key={cat} className="group relative flex items-center">
                          <SelectItem value={cat} className="flex-1 pr-8">{cat}</SelectItem>
                          {cat.toLowerCase() !== 'uncategorized' && (
                            <button
                              type="button"
                              aria-label={`Delete category ${cat}`}
                              className="absolute right-1.5 rounded p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                setDeleteCategoryName(cat)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}

                    <div
                      className="mt-1 border-t border-border p-2"
                      onPointerDown={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      {isAddingCategory ? (
                        <div className="space-y-2">
                          <Input
                            value={newCategoryName}
                            onChange={(event) => {
                              setNewCategoryName(event.target.value)
                              setCategoryError(null)
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                handleAddCategory()
                              }
                            }}
                            placeholder="Category name"
                            className="h-8"
                            autoFocus
                          />
                          {categoryError && <p className="text-xs text-destructive">{categoryError}</p>}
                          <div className="flex gap-2">
                            <Button type="button" size="sm" className="h-8 flex-1" onClick={handleAddCategory}>
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => {
                                setIsAddingCategory(false)
                                setNewCategoryName('')
                                setCategoryError(null)
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setIsAddingCategory(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />Add category
                        </Button>
                      )}
                    </div>
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
                {categoryError && !isAddingCategory && <p className="text-sm text-destructive">{categoryError}</p>}
              </div>
              {/* Subcategory field hidden for now — schema/form state kept intact so it can be re-enabled later */}
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" {...register('brand')} className="border-border bg-muted/50" />
                {errors.brand && <p className="text-sm text-destructive">{errors.brand.message}</p>}
              </div>
            </div>

            {/* Vendor */}
            <div className="space-y-2">
              <Label htmlFor="vendorId">Vendor (optional)</Label>
              <Select value={vendorId || ''} onValueChange={handleVendorChange}>
                <SelectTrigger className="border-border bg-muted/50">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No vendor —</SelectItem>
                  {vendors.filter(v => v.status === 'active').map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.company} — {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea id="description" {...register('description')} className="min-h-[90px] border-border bg-muted/50" />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>

            {/* Images */}
            <div className="space-y-3">
              <Label htmlFor="images">Product Images</Label>
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Add product images</p>
                    <p className="text-sm text-muted-foreground">Upload one or more images. The first will be the main thumbnail.</p>
                  </div>
                  <Label htmlFor="images" className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <ImagePlus className="mr-2 h-4 w-4" />Add Images
                  </Label>
                </div>
                <Input id="images" type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {imagePreviews.map((img, index) => (
                      <div key={`${img}-${index}`} className="overflow-hidden rounded-lg border bg-background">
                        <div className="aspect-square">
                          <img src={img} alt={`Product ${index + 1}`} className="h-full w-full object-cover" />
                        </div>
                        <div className="space-y-2 p-2">
                          <div className="text-xs text-muted-foreground">{index === 0 ? 'Main image' : `Image ${index + 1}`}</div>
                          <div className="flex gap-2">
                            {index !== 0 && (
                              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setPrimaryImage(index)}>Set Main</Button>
                            )}
                            <Button type="button" variant="outline" size="sm" className="px-3" onClick={() => removeImageAt(index)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Variants ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">Variants</h3>
              <Button type="button" variant="outline" size="sm" onClick={addVariantRow}>
                <Plus className="mr-2 h-4 w-4" />Add Variant
              </Button>
            </div>
            {fields.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No variants added. Add options like Size, Color, Material, or Pack Type.
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium">Variant {index + 1}</p>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => remove(index)}>
                        <Trash2 className="mr-2 h-4 w-4" />Remove
                      </Button>
                    </div>
                    <input type="hidden" {...register(`variants.${index}.id`)} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Variant Name</Label>
                        <Input placeholder="Color" {...register(`variants.${index}.name`)} />
                        {errors.variants?.[index]?.name && <p className="text-sm text-destructive">{errors.variants[index]?.name?.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Variant Value</Label>
                        <Input placeholder="Black" {...register(`variants.${index}.value`)} />
                        {errors.variants?.[index]?.value && <p className="text-sm text-destructive">{errors.variants[index]?.value?.message}</p>}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>SKU Suffix</Label>
                        <Input placeholder="BLK" {...register(`variants.${index}.skuSuffix`)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Price Adjustment</Label>
                        <Input type="number" step="0.01" placeholder="0" {...register(`variants.${index}.priceAdjustment`, { valueAsNumber: true })} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Pricing ── */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Pricing</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input id="costPrice" type="number" step="0.01" {...register('costPrice', { valueAsNumber: true })} className="border-border bg-muted/50" />
                {errors.costPrice && <p className="text-sm text-destructive">{errors.costPrice.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Selling Price</Label>
                <Input id="sellingPrice" type="number" step="0.01" {...register('sellingPrice', { valueAsNumber: true })} className="border-border bg-muted/50" />
                {errors.sellingPrice && <p className="text-sm text-destructive">{errors.sellingPrice.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input id="taxRate" type="number" step="0.1" {...register('taxRate', { valueAsNumber: true })} className="border-border bg-muted/50" />
                {errors.taxRate && <p className="text-sm text-destructive">{errors.taxRate.message}</p>}
              </div>
            </div>
          </div>

          {/* ── Inventory ── */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Inventory</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity {serials.length > 0 && <span className="text-xs text-muted-foreground font-normal">(auto-managed by serials)</span>}</Label>
                <Input
                  id="quantity"
                  type="number"
                  {...register('quantity', { valueAsNumber: true })}
                  className="border-border bg-muted/50"
                  readOnly={serials.some(s => !s.error)}
                  title={serials.some(s => !s.error) ? 'Quantity is managed automatically by serial numbers' : undefined}
                />
                {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderLevel">Reorder Level</Label>
                <Input id="reorderLevel" type="number" {...register('reorderLevel', { valueAsNumber: true })} className="border-border bg-muted/50" />
                {errors.reorderLevel && <p className="text-sm text-destructive">{errors.reorderLevel.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStock">Max Stock</Label>
                <Input id="maxStock" type="number" {...register('maxStock', { valueAsNumber: true })} className="border-border bg-muted/50" />
                {errors.maxStock && <p className="text-sm text-destructive">{errors.maxStock.message}</p>}
              </div>
            </div>
          </div>

          {/* ── Status ── */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
              <div className="space-y-1">
                <Label htmlFor="status" className="text-sm font-medium">Product Status</Label>
                <p className="text-sm text-muted-foreground">
                  {status === 'active' ? 'This product is active and available.' : 'This product is inactive and hidden from active workflows.'}
                </p>
              </div>
              <Switch
                checked={status === 'active'}
                onCheckedChange={checked => setValue('status', checked ? 'active' : 'inactive', { shouldValidate: true, shouldDirty: true })}
              />
            </div>
          </div>

          {/* ── Serial Numbers ── */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Serial Numbers</h3>
            <div className={`rounded-lg border p-4 space-y-3 ${hasSerialErrors ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/10'}`}>
              {/* Scan input */}
              <div className="flex gap-2">
                <Input
                  ref={scanInputRef}
                  type="text"
                  placeholder="Scan serial number or type, then press Enter…"
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitSerial() } }}
                  className="font-mono text-sm bg-muted/50 border-border flex-1"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={commitSerial}
                  disabled={!scanInput.trim()}
                >
                  Add
                </Button>
              </div>

              {/* Scanned serials — identical chip style to invoice form */}
              {serials.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      {validSerials.length} unit{validSerials.length !== 1 ? 's' : ''} scanned
                      {hasSerialErrors && (
                        <span className="text-destructive ml-2">
                          · {serials.filter(s => s.error).length} error{serials.filter(s => s.error).length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSerials([])}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {serials.map((s, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-mono ${
                          s.error
                            ? 'border-destructive/50 bg-destructive/10 text-destructive'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {s.error
                          ? <AlertCircle className="h-3 w-3 shrink-0" />
                          : <CheckCircle2 className="h-3 w-3 shrink-0" />
                        }
                        <span>{s.value}</span>
                        {s.error && (
                          <span className="not-font-mono text-[10px] ml-1 opacity-80">{s.error}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeSerial(i)}
                          className="ml-0.5 opacity-60 hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {serials.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No serial numbers scanned yet.</p>
              )}
            </div>
          </div>

          {/* ── Submit error ── */}
          {submitError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(EMPTY_FORM_VALUES); setImagePreviews([]); setSerials([]); setScanInput(''); onOpenChange(false) }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || hasSerialErrors} className="min-w-[140px]">
              {isLoading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                : isEdit ? 'Update Product' : 'Create Product'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deleteCategoryName !== null} onOpenChange={(isOpen) => { if (!isOpen) setDeleteCategoryName(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete category "{deleteCategoryName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Any products currently using this category will be reassigned to "Uncategorized". This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeletingCategory}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => { event.preventDefault(); handleDeleteCategory() }}
            disabled={isDeletingCategory}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeletingCategory ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
