import { requireApiRole } from "@/lib/apiAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const BUCKET = "paperwork-files";
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
      public: false,
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
    const roleCheck = await requireApiRole(request, ["committee"]);

    if (!roleCheck.ok) {
      return Response.json(
        { error: roleCheck.error },
        { status: roleCheck.status },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Paperwork file is required." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        { error: "Please upload a Word document (.doc/.docx) or PDF file." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "Paperwork file must be 15 MB or smaller." },
        { status: 400 },
      );
    }

    await ensureBucket();

    const supabaseAdmin = getSupabaseAdminClient();
    const filePath = `${roleCheck.userId}/${Date.now()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 400 });
    }

    return Response.json({
      file: {
        name: file.name,
        path: filePath,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Paperwork upload error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
