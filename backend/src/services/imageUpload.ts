/**
 * Reads an uploaded picture from a request: either the raw image as the body
 * (the website and web app) or a multipart form field (the phone app, which
 * can only stream files as forms). Callers check the type and size.
 */
export async function readImageUpload(req: Request, field: string): Promise<Uint8Array | null> {
  const type = req.headers.get("content-type") || "";
  if (type.startsWith("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get(field);
    if (!file || typeof file === "string") return null;
    return new Uint8Array(await file.arrayBuffer());
  }
  return new Uint8Array(await req.arrayBuffer());
}
