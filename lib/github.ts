import axios from "axios";
import type { UserData } from "@/types/github";

// 🛠️ FIX: Track in-flight requests to prevent duplicate network calls
const inFlightRequests = new Map<string, Promise<UserData>>();

/**
 * Fetches a user's profile, repositories, contributions, engagement and
 * productivity from the internal API route. Shared by the home page (compare
 * mode) and the /[username] profile route so both fetch identically.
 */
export async function fetchUserData(username: string): Promise<UserData> {
  // Normalize the username to ensure consistent caching
  const cacheKey = username.toLowerCase();

  // 🛠️ FIX: If a request for this user is already running, return that existing Promise
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  // The API returns its typed `{ error, errorType }` payload with a non-2xx
  // status (404 not-found, 403 rate-limited, 500 failure). Resolve every status
  // so callers can branch on `data.error` instead of catching a thrown response
  // — this is what lets compare mode surface per-user error messages.
  const requestPromise = axios
    .get<UserData>(`/api/github?username=${encodeURIComponent(username)}`, {
      validateStatus: () => true,
    })
    .then((response) => response.data)
    .finally(() => {
      // 🛠️ FIX: Always clean up the Map when the request finishes (success or fail)
      inFlightRequests.delete(cacheKey);
    });

  // Store the active Promise in the Map
  inFlightRequests.set(cacheKey, requestPromise);

  return requestPromise;
}
