import { $ } from "bun";

const SERVICE = "dev.hackernews";

export async function getStoredCookie(): Promise<string | null> {
  try {
    const result =
      await $`security find-generic-password -s ${SERVICE} -w 2>/dev/null`.text();
    const cookie = result.trim();
    return cookie || null;
  } catch {
    return null;
  }
}

export async function storeCookie(cookie: string): Promise<void> {
  // Delete existing entry first (ignore errors if it doesn't exist)
  try {
    await $`security delete-generic-password -s ${SERVICE} 2>/dev/null`.quiet();
  } catch {}

  await $`security add-generic-password -s ${SERVICE} -a hackernews -w ${cookie}`.quiet();
}

export async function getStoredUsername(): Promise<string | null> {
  const cookie = await getStoredCookie();
  if (!cookie) return null;
  // Cookie format: username&hash
  const parts = cookie.split("&");
  return parts[0] ?? null;
}

export async function clearSession(): Promise<void> {
  try {
    await $`security delete-generic-password -s ${SERVICE} 2>/dev/null`.quiet();
  } catch {}
}
