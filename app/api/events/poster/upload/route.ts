import { requireApiRole } from "@/lib/apiAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const BUCKET = "event-posters";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const safeFileName = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

async function ensureBucket() {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: bucket } = await supabaseAdmin.storage.getBucket(BUCKET);

  if (!bucket) {
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: Array.from(ALLOWED_TYPES),
    });

    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw error;
    }
  }
}

export async function POST(request: Request) {
  try {
    const roleCheck = await requireApiRole(request, ["admin"]);

    if (!roleCheck.ok) {
      return Response.json(
        { error: roleCheck.error },
        { status: roleCheck.status },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Poster image is required." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        { error: "Please upload a JPG, PNG, WebP, or GIF image." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "Poster image must be 8 MB or smaller." },
        { status: 400 },
      );
    }

    await ensureBucket();

    const supabaseAdmin = getSupabaseAdminClient();
    const filePath = `${roleCheck.userId}/${Date.now()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 400 });
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath);

    return Response.json({
      poster: {
        name: file.name,
        path: filePath,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        publicUrl: data.publicUrl,
      },
    });
  } catch (error) {
    console.error("Event poster upload error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
