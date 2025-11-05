import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { isSafeRequestOrigin } from "@/lib/security/origin";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
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
  const file = formData.get("avatar");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "No avatar file received." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ message: "Only PNG and JPG files are allowed." }, { status: 415 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ message: "File is too large. Max size is 5MB." }, { status: 413 });
  }

  const extension = ALLOWED_TYPES.get(file.type) ?? "png";
  const fileName = `${user.id}-${randomUUID()}.${extension}`;
  const blobPath = `avatars/${user.id}/${fileName}`;

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
      console.error("Avatar upload to Vercel Blob failed", error);
      return NextResponse.json(
        { message: "Unable to upload avatar right now. Please try again later." },
        { status: 500 },
      );
    }
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "Avatar storage is not configured for this environment." },
      { status: 500 },
    );
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
  const filePath = path.join(uploadDir, fileName);

  await mkdir(uploadDir, { recursive: true });
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, fileBuffer);

  const publicUrl = `/uploads/avatars/${fileName}`;

  return NextResponse.json({ url: publicUrl });
}
