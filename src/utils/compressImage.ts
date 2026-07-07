// Compresión de imágenes antes de subir a Firebase Storage
// Reduce fotos de celular de ~4MB a ~120KB en WebP
export async function compressImage(
  file: File,
  maxWidth = 1280,
  quality = 0.82
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('compressImage falló')),
      'image/webp',
      quality
    )
  })
}
