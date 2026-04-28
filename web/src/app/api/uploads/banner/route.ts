import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { isSafeRequestOrigin } from "@/lib/security/origin";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB (banners are wider)
const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  if (!isSafeRequestOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "You must be signed in." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("banner");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "No banner file received." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ message: "Only PNG, JPG, and WebP files are allowed." }, { status: 415 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ message: "File is too large. Max size is 8MB." }, { status: 413 });
  }

  const extension = ALLOWED_TYPES.get(file.type) ?? "png";
  const fileName = `${user.id}-${randomUUID()}.${extension}`;
  const blobPath = `banners/${user.id}/${fileName}`;

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    try {
      const blob = await put(blobPath, file, {
        access: "public",
        contentType: file.type,
        token: blobToken,
      });

      return NextResponse.json({ url: blob.url });
    } catch (error) {
      console.error("Banner upload to Vercel Blob failed", error);
      return NextResponse.json(
        { message: "Unable to upload banner right now. Please try again later." },
        { status: 500 },
      );
    }
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "Banner storage is not configured for this environment." },
      { status: 500 },
    );
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "banners");
  const filePath = path.join(uploadDir, fileName);

  await mkdir(uploadDir, { recursive: true });
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, fileBuffer);

  const publicUrl = `/uploads/banners/${fileName}`;

  return NextResponse.json({ url: publicUrl });
}
