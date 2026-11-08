import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload } from '@vercel/blob/client';
import { isAdmin } from '../_lib/auth.js';
import { isSameOriginRequest, json, methodNotAllowed } from '../_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!isSameOriginRequest(req)) return json(res, 403, { error: 'Invalid request origin.' });
  if (!isAdmin(req)) return json(res, 401, { error: 'Sign in before uploading images.' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json(res, 503, { error: 'Image uploads are not configured. Add BLOB_READ_WRITE_TOKEN in Vercel Storage.' });

  try {
    const result = await handleUpload({
      body: req.body as any,
      request: req as any,
      onBeforeGenerateToken: async (pathname) => {
        const safeName = String(pathname || '').toLowerCase();
        if (!/\.(jpe?g|png|webp|avif)$/.test(safeName)) throw new Error('Only JPG, PNG, WebP and AVIF images are allowed.');
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
          maximumSizeInBytes: 5 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.info('SHXAP gallery upload completed:', blob.url);
      },
    });
    return json(res, 200, result);
  } catch (error) {
    console.error('Blob upload token error:', error);
    return json(res, 400, { error: error instanceof Error ? error.message : 'Image upload failed.' });
  }
}
