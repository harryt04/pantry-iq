/**
 * Zero Permissions Configuration
 *
 * Implements row-level security (RLS) by defining which records each user
 * can access. Zero enforces these permissions on the client-side cache.
 *
 * Important: These permissions are enforced by the Zero cache server via
 * the `clientViewOf` pattern or via subscriptions filtered by user_id.
 */

export type PermissionContext = {
  userId: string
}

/**
 * Build a permission filter for locations
 * Users can only query their own locations
 */
export function getLocationPermissionFilter(context: PermissionContext): {
  userId: string
} {
  return {
    userId: context.userId,
  }
}

/**
 * Build a permission filter for conversations
 * Users can only query conversations for their own locations
 *
 * In practice, this is enforced by filtering to locationId IN (user's locations)
 */
export function getConversationPermissionFilter(
  context: PermissionContext,
  userLocationIds: string[],
): { locationId: { in: string[] } } | null {
  if (userLocationIds.length === 0) {
    return null
  }

  return {
    locationId: { in: userLocationIds },
  }
}

/**
 * Build a permission filter for messages
 * Users can only query messages for conversations they have access to
 *
 * In practice, this is enforced by filtering to conversationId IN (user's conversations)
 */
export function getMessagePermissionFilter(
  context: PermissionContext,
  userConversationIds: string[],
): { conversationId: { in: string[] } } | null {
  if (userConversationIds.length === 0) {
    return null
  }

  return {
    conversationId: { in: userConversationIds },
  }
}

/**
 * Build a permission filter for CSV uploads
 * Users can only query uploads for their own locations
 */
export function getCsvUploadPermissionFilter(
  context: PermissionContext,
  userLocationIds: string[],
): { locationId: { in: string[] } } | null {
  if (userLocationIds.length === 0) {
    return null
  }

  return {
    locationId: { in: userLocationIds },
  }
}

/**
 * Build a permission filter for transactions
 * Users can only query transactions for their own locations
 */
export function getTransactionPermissionFilter(
  context: PermissionContext,
  userLocationIds: string[],
): { locationId: { in: string[] } } | null {
  if (userLocationIds.length === 0) {
    return null
  }

  return {
    locationId: { in: userLocationIds },
  }
}

/**
 * Build a permission filter for POS connections
 * Users can only query connections for their own locations
 */
export function getPosConnectionPermissionFilter(
  context: PermissionContext,
  userLocationIds: string[],
): { locationId: { in: string[] } } | null {
  if (userLocationIds.length === 0) {
    return null
  }

  return {
    locationId: { in: userLocationIds },
  }
}

/**
 * Verify that a user has access to a specific location
 * This is used for authorization checks before operations
 */
export function canAccessLocation(
  context: PermissionContext,
  location: { userId: string },
): boolean {
  return context.userId === location.userId
}

/**
 * Verify that a user has access to a specific conversation
 * This is used for authorization checks before operations
 */
export function canAccessConversation(
  context: PermissionContext,
  conversation: { locationId: string },
  userLocationIds: string[],
): boolean {
  return userLocationIds.includes(conversation.locationId)
}

/**
 * Verify that a user has access to a specific message
 * This is used for authorization checks before operations
 */
export function canAccessMessage(
  context: PermissionContext,
  message: { conversationId: string },
  userConversationIds: string[],
): boolean {
  return userConversationIds.includes(message.conversationId)
}
