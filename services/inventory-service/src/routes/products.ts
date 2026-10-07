import { Router } from 'express';
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
});

router.get('/products', async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const products = await prisma.product.findMany({
    where: { tenantId },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(products);
});

router.post('/products', requirePermission('inventory:manage'), async (req, res) => {
  const parsed = productInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  await assertCategoryInTenant(tenantId, parsed.data.categoryId);
  const product = await prisma.product.create({
    data: { ...parsed.data, tenantId },
    include: { category: true },
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

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { category: true },
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
  const product = await prisma.product.update({ where: { id: existing.id }, data: { imageUrl: url }, include: { category: true } });
  await deleteStoredImage(existing.imageUrl);
  indexProduct({ ...product, categoryName: product.category?.name });
  res.json(product);
});

export default router;
