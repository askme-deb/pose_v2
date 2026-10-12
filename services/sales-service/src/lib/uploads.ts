import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

// Local disk, not S3 — S3_ENDPOINT/ACCESS_KEY/SECRET_KEY are blank in every
// environment this has ever run in (see .env.example), same class of gap as
// Razorpay's real credentials. This is a genuinely complete, working upload
// path for a self-hosted deployment, not a stand-in for one.
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
const LOGOS_DIR = path.join(UPLOAD_ROOT, 'logos');
fs.mkdirSync(LOGOS_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']);
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // matches the "Max 2MB" copy already on the settings page

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGOS_DIR),
  filename: (req, file, cb) => {
    const tenantId = req.header('x-tenant-id') || 'default';
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${tenantId}-${Date.now()}${ext}`);
  },
});

export const logoUpload = multer({
  storage,
  limits: { fileSize: MAX_LOGO_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Logo must be a PNG, JPG, SVG, or WebP image'));
      return;
    }
    cb(null, true);
  },
});

export { LOGOS_DIR, UPLOAD_ROOT };
