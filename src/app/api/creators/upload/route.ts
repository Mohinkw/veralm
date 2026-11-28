import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireCreator } from '@/lib/auth/request';

const ALLOWED_MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'article-media';

function hasValidImageMagic(buf: Buffer, mime: string): boolean {
  if (buf.length < 12) return false;
  if (mime === 'image/png') {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mime === 'image/jpeg') {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mime === 'image/webp') {
    return (
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

export async function POST(request: NextRequest) {
  const auth = await requireCreator(request);
  if ('error' in auth) return auth.error;

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
    }

    const ext = ALLOWED_MIME_EXT[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: 'Only PNG, JPEG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Image size must be between 1 byte and 5 MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidImageMagic(buffer, file.type)) {
      return NextResponse.json(
        { error: 'File contents do not match declared image type.' },
        { status: 400 }
      );
    }

    const { data: buckets } = await auth.db.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET)) {
      await auth.db.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_BYTES,
        allowedMimeTypes: Object.keys(ALLOWED_MIME_EXT),
      });
    }

    const objectPath = `${auth.creatorId}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const { error: uploadErr } = await auth.db.storage
      .from(BUCKET)
      .upload(objectPath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      console.error('[Creator Upload] Storage upload error:', uploadErr);
      return NextResponse.json({ error: 'Could not upload image.' }, { status: 500 });
    }

    const { data: publicData } = auth.db.storage.from(BUCKET).getPublicUrl(objectPath);
    return NextResponse.json({ url: publicData.publicUrl, path: objectPath }, { status: 201 });
  } catch (err) {
    console.error('[Creator Upload] Error:', err);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }
}
