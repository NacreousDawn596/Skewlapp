/**
 * 🔥 GLOBAL API ERROR HANDLER
 * 
 * Use this wrapper around ALL API calls in your app
 * It catches UNAUTHORIZED errors and calls the central handler
 * 
 * Example usage:
 * 
 * const modules = await withAuthErrorHandler(
 *   () => schoolAppClient.getModules(niveau, filiere, semestre),
 *   handleUnauthorized
 * );
 */

/**
 * Check if an error is an UNAUTHORIZED error from the package
 */
export const isUnauthorizedError = (error: any): boolean => {
  return error?.message === "UNAUTHORIZED";
};

/**
 * Wrap an async API call with automatic UNAUTHORIZED handling
 * 
 * @param fn - The async function to execute
 * @param onUnauthorized - Handler to call if UNAUTHORIZED is caught
 * @returns The result of the function, or throws if error is not UNAUTHORIZED
 */
export async function withAuthErrorHandler<T>(
  fn: () => Promise<T>,
  onUnauthorized: () => void | Promise<void>
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (isUnauthorizedError(error)) {
      console.warn("[API] UNAUTHORIZED caught - calling handler");
      await onUnauthorized();
      // Re-throw so UI can show appropriate message
      throw error;
    }
    // Other errors - just re-throw
    throw error;
  }
}

/**
 * React Query wrapper - use with useQuery
 * 
 * Example:
 * 
 * const query = useQuery({
 *   queryKey: ["modules"],
 *   queryFn: withReactQueryAuthHandler(
 *     () => schoolAppClient.getModules(niveau, filiere, semestre),
 *     handleUnauthorized
 *   ),
 * });
 */
export function withReactQueryAuthHandler<T>(
  fn: () => Promise<T>,
  onUnauthorized: () => void | Promise<void>
): () => Promise<T> {
  return async () => {
    try {
      return await fn();
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        console.warn("[API] UNAUTHORIZED in React Query - calling handler");
        await onUnauthorized();
      }
      throw error;
    }
  };
}