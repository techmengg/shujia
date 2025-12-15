import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { showMatureContent, showExplicitContent, showPornographicContent } = body;

    // Validate all 3 booleans
    if (typeof showMatureContent !== "boolean" || 
        typeof showExplicitContent !== "boolean" ||
        typeof showPornographicContent !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Invalid content preference values" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        showMatureContent,
        showExplicitContent,
        showPornographicContent,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Content Preferences] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

