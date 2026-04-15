import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const SERVICE = "dev.hackernews";
const IS_MACOS = process.platform === "darwin";
const CONFIG_DIR = join(homedir(), ".config", "hakr");
const SESSION_FILE = join(CONFIG_DIR, "session");

// --- macOS Keychain helpers ---

async function keychainGet(): Promise<string | null> {
  try {
    const proc = Bun.spawn(["security", "find-generic-password", "-s", SERVICE, "-w"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const text = await new Response(proc.stdout).text();
    await proc.exited;
    const cookie = text.trim();
    return cookie || null;
  } catch {
    return null;
  }
}

async function keychainSet(cookie: string): Promise<void> {
  // Delete existing entry first
  try {
    Bun.spawnSync(["security", "delete-generic-password", "-s", SERVICE], { stderr: "pipe" });
  } catch {}
  Bun.spawnSync(["security", "add-generic-password", "-s", SERVICE, "-a", "hackernews", "-w", cookie], {
    stderr: "pipe",
  });
}

async function keychainDelete(): Promise<void> {
  try {
    Bun.spawnSync(["security", "delete-generic-password", "-s", SERVICE], { stderr: "pipe" });
  } catch {}
}

// --- File-based helpers (Linux, Windows, fallback) ---

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

function fileGet(): string | null {
  try {
    if (!existsSync(SESSION_FILE)) return null;
    const cookie = readFileSync(SESSION_FILE, "utf-8").trim();
    return cookie || null;
  } catch {
    return null;
  }
}

function fileSet(cookie: string): void {
  ensureConfigDir();
  writeFileSync(SESSION_FILE, cookie, { mode: 0o600 });
  // Extra chmod in case the file already existed with different perms
  try { chmodSync(SESSION_FILE, 0o600); } catch {}
}

function fileDelete(): void {
  try {
    if (existsSync(SESSION_FILE)) unlinkSync(SESSION_FILE);
  } catch {}
}

// --- Public API ---

export async function getStoredCookie(): Promise<string | null> {
  if (IS_MACOS) {
    const cookie = await keychainGet();
    if (cookie) return cookie;
  }
  return fileGet();
}

export async function storeCookie(cookie: string): Promise<void> {
  if (IS_MACOS) {
    await keychainSet(cookie);
  }
  // Always write file too — ensures consistency if keychain fails
  fileSet(cookie);
}

export async function getStoredUsername(): Promise<string | null> {
  const cookie = await getStoredCookie();
  if (!cookie) return null;
  const parts = cookie.split("&");
  return parts[0] ?? null;
}

export async function clearSession(): Promise<void> {
  if (IS_MACOS) {
    await keychainDelete();
  }
  fileDelete();
}
