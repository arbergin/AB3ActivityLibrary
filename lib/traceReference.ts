// Reference images are temporary editor aids, never activity objects.
export type TraceReference = { image: string; opacity: number; offsetX: number; offsetY: number; scale: number };

export async function prepareTraceImage(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) throw new Error("Choose a PNG, JPEG, or WebP image.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Image must be 12 MB or smaller.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Unable to decode the image.")); });
    const factor = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * factor));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * factor));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally { URL.revokeObjectURL(objectUrl); }
}

export function defaultTraceReference(image: string): TraceReference {
  return { image, opacity: 0.45, offsetX: 0, offsetY: 0, scale: 1 };
}
