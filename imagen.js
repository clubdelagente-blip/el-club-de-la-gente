/* ============================================================
   EL CLUB DE LA GENTE — Compresión de imágenes antes de subir
   ============================================================
   Las fotos que salen directo de un celular (comprobantes, fotos de
   producto, perfil) suelen pesar varios MB -- en 4G eso se traduce en
   subidas lentas y una Tienda/Directorio que carga pesado. Esto las
   reduce en el navegador ANTES de subirlas a Storage, sin tocar nada del
   lado del servidor. Si algo falla (navegador viejo, imagen rara), se
   sube el archivo original tal cual -- nunca debe bloquear una subida. */

export async function comprimirImagen(file, { maxDim = 1600, calidad = 0.82 } = {}) {
  if (!file || !file.type?.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}
