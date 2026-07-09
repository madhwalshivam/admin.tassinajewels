import { NextRequest } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params if required by Next.js version
    const pathParams = await params;
    const path = pathParams.path.join('/')

    const response = await r2.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: path,
      })
    )

    if (!response.Body) {
      return new Response('Image not found', { status: 404 })
    }

    // Convert R2 stream to byte array
    const fileBuffer = await response.Body.transformToByteArray()

    return new Response(Buffer.from(fileBuffer), {
      headers: {
        'Content-Type': response.ContentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error: any) {
    console.error('R2 Image Proxy Error:', error)
    return new Response('Not Found', { status: 404 })
  }
}
