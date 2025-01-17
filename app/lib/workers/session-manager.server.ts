interface SessionData {
  userId: string;
  sessionId: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  expiresAt: number;
  createdAt: number;
}

/**
 * Session Manager Class
 * Manages user session information using Cloudflare KV storage
 */
export class SessionManager {
  // Private static property for managing KV key prefixes
  private static readonly PRIVATE_PREFIX = "session";

  /**
   * @param kv - Cloudflare KV namespace instance
   * @param maxAge - Maximum session lifetime in seconds (default: 24 hours)
   */
  constructor(
    private kv: KVNamespace,
    private maxAge: number = 60 * 60 * 24,
  ) {}

  /**
   * Generate session storage key
   * Format: session:{userId}:{sessionId}
   * @param userId User ID
   * @param sessionId Session ID
   * @returns Generated KV key
   */
  private getSessionKey(userId: string, sessionId: string) {
    return `${SessionManager.PRIVATE_PREFIX}:${userId}:${sessionId}`;
  }

  /**
   * Create new session
   * @param data - Session data without sessionId
   * @returns Newly created session ID
   */
  async createSession(data: Omit<SessionData, "sessionId">): Promise<string> {
    // Generate unique session ID
    const sessionId = crypto.randomUUID();
    // Construct KV storage key
    const key = this.getSessionKey(data.userId, sessionId);
    // Get current timestamp
    const now = Date.now();

    // Build complete session data object
    const sessionData: SessionData = {
      ...data,
      sessionId,
      createdAt: now,
      expiresAt: now + this.maxAge * 1000, // Convert to milliseconds
    };

    // Store session data in KV with expiration
    await this.kv.put(key, JSON.stringify(sessionData), {
      expirationTtl: this.maxAge,
    });

    return sessionId;
  }

  /**
   * Get specified session information
   * @param userId User ID
   * @param sessionId Session ID
   * @returns Session data or null if not found
   */
  async getSession(
    userId: string,
    sessionId: string,
  ): Promise<SessionData | null> {
    // Construct KV storage key
    const key = this.getSessionKey(userId, sessionId);
    // Get session data from KV
    const data = await this.kv.get(key);
    // Parse and return JSON if exists, otherwise return null
    return data ? (JSON.parse(data) as SessionData) : null;
  }

  /**
   * Delete specified session
   * @param userId User ID
   * @param sessionId Session ID
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    // Construct KV storage key
    const key = this.getSessionKey(userId, sessionId);
    // Delete session data from KV
    await this.kv.delete(key);
  }

  /**
   * Get list of all user sessions
   * @param userId User ID
   * @returns Array of sessions sorted by creation time (descending)
   */
  async listUserSessions(userId: string): Promise<{
    sessions: Array<SessionData>;
  }> {
    // Construct KV key prefix for listing all user sessions
    const prefix = `${SessionManager.PRIVATE_PREFIX}:${userId}:`;
    // List all keys matching the prefix from KV
    const { keys } = await this.kv.list({ prefix });

    const sessions: SessionData[] = [];
    // Iterate through all matching keys
    for (const keyInfo of keys) {
      // Get value for each key from KV
      const value = await this.kv.get(keyInfo.name);
      // If value exists, parse JSON and add to sessions array
      if (value) {
        sessions.push(JSON.parse(value) as SessionData);
      }
    }

    // Sort sessions by creation time descending
    return {
      sessions: sessions.sort((a, b) => b.createdAt - a.createdAt),
    };
  }

  /**
   * Delete all sessions for a user
   * @param userId User ID
   */
  async deleteUserSessions(userId: string): Promise<void> {
    // Construct KV key prefix for listing all user sessions
    const prefix = `${SessionManager.PRIVATE_PREFIX}:${userId}:`;
    // List all keys matching the prefix from KV
    const { keys } = await this.kv.list({ prefix });
    // Delete all matching session data
    await Promise.all(keys.map((keyInfo) => this.kv.delete(keyInfo.name)));
  }

  /**
   * Delete all sessions except the current one
   * @param userId User ID
   * @param currentSessionId - Current session ID (will not be deleted)
   */
  async deleteOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<void> {
    // Construct KV key prefix for listing all user sessions
    const prefix = `${SessionManager.PRIVATE_PREFIX}:${userId}:`;
    // List all keys matching the prefix from KV
    const { keys } = await this.kv.list({ prefix });

    const deletePromises: Promise<void>[] = [];
    // Iterate through all matching keys
    for (const keyInfo of keys) {
      // Extract session ID from key name
      const parts = keyInfo.name.split(":");
      const sessionId = parts.length > 2 ? parts[2] : undefined;
      // If session ID exists and isn't current session, add to delete promises
      if (sessionId && sessionId !== currentSessionId) {
        deletePromises.push(this.kv.delete(keyInfo.name));
      }
    }

    // Execute delete operations concurrently
    await Promise.all(deletePromises);
  }

  /**
   * Update session data
   * @param userId - User ID
   * @param sessionId - Session ID
   * @param updateData - Partial session data to update
   * @returns Whether update was successful
   */
  async updateSession(
    userId: string,
    sessionId: string,
    updateData: Partial<SessionData>,
  ): Promise<boolean> {
    // Construct KV storage key
    const key = this.getSessionKey(userId, sessionId);
    // Get existing session data
    const existingData = await this.getSession(userId, sessionId);

    // Return false if session doesn't exist
    if (!existingData) {
      return false;
    }

    // Merge existing session data with update data
    const updatedData: SessionData = {
      ...existingData,
      ...updateData,
    };

    // Calculate new expiration time (seconds)
    const expirationTtl = Math.ceil(
      (updatedData.expiresAt - Date.now()) / 1000,
    );

    // Store updated session data in KV with updated expiration
    await this.kv.put(key, JSON.stringify(updatedData), {
      expirationTtl: expirationTtl > 0 ? expirationTtl : 1, // Ensure expiration time is positive
    });

    return true;
  }
}
