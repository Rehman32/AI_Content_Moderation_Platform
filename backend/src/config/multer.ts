import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

/**
 * Multer configuration for local file storage.
 *
 * MIGRATION PATH TO S3:
 * Replace this entire file with an S3-backed multer storage engine
 * (e.g. multer-s3). The controller and service layers don't need to change
 * because they only interact with the file metadata (originalname, mimetype,
 * size, path) — which both local and S3 engines provide identically.
 *
 * FILE ORGANIZATION STRATEGY:
 * uploads/
 * └── images/
 *     ├── 1718793600000-abc123.jpg
 *     ├── 1718793600001-def456.png
 *     └── ...
 *
 * Files are named with timestamp + random suffix to guarantee uniqueness
 * without requiring database lookups. No subdirectories per user — that
 * creates filesystem hotspots and complicates cleanup. Flat structure is
 * simpler and S3-compatible (S3 has no real directories).
 */

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'images');

// Ensure upload directory exists at startup
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file
const MAX_FILES = 10;                   // per single upload request

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

export { UPLOAD_DIR, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, MAX_FILES };
