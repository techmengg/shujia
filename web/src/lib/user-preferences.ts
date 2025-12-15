/**
 * User preference utilities
 */

import { getCurrentUser } from "./auth/session";
import { prisma } from "./prisma";

/**
 * Get the user's 3-tier adult content preferences
 * Returns all false (hide all adult content) if user is not logged in or hasn't enabled them
 */
export async function getUserAdultContentPreferences(): Promise<{
  showMatureContent: boolean;
  showExplicitContent: boolean;
  showPornographicContent: boolean;
}> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      // Not logged in = hide all adult content
      return {
        showMatureContent: false,
        showExplicitContent: false,
        showPornographicContent: false,
      };
    }
    
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        showMatureContent: true,
        showExplicitContent: true,
        showPornographicContent: true,
      },
    });
    
    return {
      showMatureContent: dbUser?.showMatureContent || false,
      showExplicitContent: dbUser?.showExplicitContent || false,
      showPornographicContent: dbUser?.showPornographicContent || false,
    };
  } catch (error) {
    console.error('[UserPreferences] Error fetching adult content preferences:', error);
    // Default to hiding all adult content on error
    return {
      showMatureContent: false,
      showExplicitContent: false,
      showPornographicContent: false,
    };
  }
}

