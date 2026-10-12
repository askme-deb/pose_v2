import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import multer from 'multer';
import { z } from 'zod';
import { HttpError, requirePermission } from '@pospe/permissions';
import { ALLOWED_IMAGE_TYPES, deleteStoredImage, storeImage } from '../lib/storage';
import { prisma, resolveTenantId } from '../lib/prisma';
import { indexProduct, deleteProductFromIndex } from '../lib/elasticsearch';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'Only JPEG, PNG or WebP images are allowed'));
  },
});

async function assertCategoryInTenant(tenantId: string, categoryId?: string) {
  if (!categoryId) return;
  const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
  if (!category) throw new HttpError(400, 'Category not found');
}

const optionInput = z.object({
  // Present for an existing option (kept, so held bills / history stay linked); absent for a new one.
  id: z.string().optional(),
  name: z.string().trim().min(1),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  price: z.number().nonnegative(),
  mrp: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().optional(),
  stockQty: z.number().int().nonnegative().optional(),
});

const addonInput = z.object({
  addonProductId: z.string().min(1),
  kind: z.enum(['ADDON', 'COMPLEMENTARY']),
  // Ignored for COMPLEMENTARY (always free).
  price: z.number().nonnegative().optional(),
});

const productInput = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  hsnCode: z.string().optional(),
  unit: z.string().optional(),
  mrp: z.number().nonnegative().optional(),
  price: z.number().nonnegative(),
  costPrice: z.number().nonnegative().optional(),
  gstRate: z.number().min(0).max(100).optional(),
  imageUrl: z.string().optional(),
  stockQty: z.number().int().nonnegative().optional(),
  minThreshold: z.number().int().nonnegative().optional(),
  trackBatches: z.boolean().optional(),
  trackSerials: z.boolean().optional(),
  isBundle: z.boolean().optional(),
  // Variation: omit `options` to leave them as they are; send [] to go back
  // to a plain product; otherwise the list below *is* the full option set.
  variationName: z.string().trim().max(40).optional(),
  options: z.array(optionInput).max(50).optional(),
  // Same rule: omit to leave alone, [] to clear.
  addons: z.array(addonInput).max(50).optional(),
});

const productInclude = {
  category: true,
  options: { orderBy: { position: 'asc' } },
  addons: { orderBy: { position: 'asc' }, include: { addonProduct: { select: { id: true, name: true, price: true, imageUrl: true } } } },
} satisfies Prisma.ProductInclude;

type OptionInput = z.infer<typeof optionInput>;
type AddonInput = z.infer<typeof addonInput>;

function assertOptions(options: OptionInput[]) {
  const names = new Set<string>();
  for (const o of options) {
    const key = o.name.toLowerCase();
    if (names.has(key)) throw new HttpError(400, `Duplicate variation option "${o.name}"`);
    names.add(key);
  }
}

async function assertAddons(tenantId: string, productId: string | null, addons: AddonInput[]) {
  const ids = addons.map((a) => a.addonProductId);
  if (new Set(ids).size !== ids.length) throw new HttpError(400, 'The same product is listed twice in addons');
  if (productId && ids.includes(productId)) throw new HttpError(400, 'A product cannot be its own addon');
  const found = await prisma.product.count({ where: { id: { in: ids }, tenantId } });
  if (found !== ids.length) throw new HttpError(400, 'One or more addon products were not found');
}

/** Replaces a product's option set / addon list inside the caller's transaction. */
async function applyVariationsAndAddons(
  tx: Prisma.TransactionClient,
  tenantId: string,
  productId: string,
  options: OptionInput[] | undefined,
  addons: AddonInput[] | undefined,
) {
  if (options) {
    const keep = options.filter((o) => o.id).map((o) => o.id as string);
    await tx.productOption.deleteMany({ where: { productId, ...(keep.length ? { id: { notIn: keep } } : {}) } });
    for (const [position, o] of options.entries()) {
      const data = {
        name: o.name,
        sku: o.sku || null,
        barcode: o.barcode || null,
        price: o.price,
        mrp: o.mrp ?? 0,
        costPrice: o.costPrice ?? 0,
        stockQty: o.stockQty ?? 0,
        position,
      };
      if (o.id) {
        const { count } = await tx.productOption.updateMany({ where: { id: o.id, productId, tenantId }, data });
        if (count !== 1) throw new HttpError(400, `Option "${o.name}" does not belong to this product`);
      } else {
        await tx.productOption.create({ data: { ...data, tenantId, productId } });
      }
    }
  }
  if (addons) {
    await tx.productAddon.deleteMany({ where: { productId } });
    if (addons.length) {
      await tx.productAddon.createMany({
        data: addons.map((a, position) => ({
          tenantId,
          productId,
          addonProductId: a.addonProductId,
          kind: a.kind,
          price: a.kind === 'COMPLEMENTARY' ? 0 : a.price ?? 0,
          position,
        })),
      });
    }
  }
}

/** With options, the product row mirrors them: price = cheapest option, stock = total across options. */
function optionRollup(options: OptionInput[]) {
  return {
    price: Math.min(...options.map((o) => o.price)),
    stockQty: options.reduce((sum, o) => sum + (o.stockQty ?? 0), 0),
  };
}

router.get('/products', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const products = await prisma.product.findMany({
    where: { tenantId },
    include: productInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json(products);
});

// One product with its variation options and addons — what the edit page loads.
router.get('/products/:id', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const product = await prisma.product.findFirst({ where: { id: req.params.id, tenantId }, include: productInclude });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

router.post('/products', requirePermission('inventory:manage'), async (req, res) => {
  const parsed = productInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  await assertCategoryInTenant(tenantId, parsed.data.categoryId);
  const { options, addons, variationName, ...base } = parsed.data;
  if (options?.length) assertOptions(options);
  if (addons?.length) await assertAddons(tenantId, null, addons);

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        ...base,
        tenantId,
        ...(options?.length ? { ...optionRollup(options), variationName: variationName || 'Variation' } : {}),
      },
    });
    await applyVariationsAndAddons(tx, tenantId, created.id, options?.length ? options : undefined, addons?.length ? addons : undefined);
    return tx.product.findUniqueOrThrow({ where: { id: created.id }, include: productInclude });
  });
  indexProduct({ ...product, categoryName: product.category?.name });
  res.status(201).json(product);
});

router.put('/products/:id', requirePermission('inventory:manage'), async (req, res) => {
  const parsed = productInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  await assertCategoryInTenant(tenantId, parsed.data.categoryId);
  const { options, addons, variationName, ...base } = parsed.data;
  if (options?.length) assertOptions(options);
  if (addons?.length) await assertAddons(tenantId, existing.id, addons);

  const product = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: existing.id },
      data: {
        ...base,
        ...(options?.length ? { ...optionRollup(options), variationName: variationName || existing.variationName || 'Variation' } : {}),
        // [] turns it back into a plain product (price/stock sent in `base` then apply).
        ...(options && !options.length ? { variationName: null } : {}),
        ...(!options && variationName && existing.variationName ? { variationName } : {}),
      },
    });
    await applyVariationsAndAddons(tx, tenantId, existing.id, options, addons);
    return tx.product.findUniqueOrThrow({ where: { id: existing.id }, include: productInclude });
  });
  indexProduct({ ...product, categoryName: product.category?.name });
  res.json(product);
});

router.delete('/products/:id', requirePermission('inventory:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  await prisma.product.delete({ where: { id: req.params.id } });
  deleteProductFromIndex(req.params.id);
  res.status(204).end();
});

// Product photo upload (multipart field "image", ≤5 MB). Stored in S3-compatible
// object storage (see lib/storage.ts); the old image is removed afterwards.
router.post('/products/:id/image', requirePermission('inventory:manage'), (req, res, next) => {
  upload.single('image')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) return next(new HttpError(400, err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller' : err.message));
    next(err);
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Attach an image in the "image" field' });
  const tenantId = await resolveTenantId(req);
  const existing = await prisma.product.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const { url } = await storeImage(tenantId, 'products', req.file);
  const product = await prisma.product.update({ where: { id: existing.id }, data: { imageUrl: url }, include: productInclude });
  await deleteStoredImage(existing.imageUrl);
  indexProduct({ ...product, categoryName: product.category?.name });
  res.json(product);
});

export default router;
