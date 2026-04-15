const HN_BASE = "https://news.ycombinator.com";

function extractHidden(html: string, name: string): string | null {
  const re = new RegExp(`name=["']${name}["']\\s+value=["']([^"']+)["']`, "i");
  const alt = new RegExp(`value=["']([^"']+)["']\\s+name=["']${name}["']`, "i");
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null;
}

function extractAuthToken(html: string, itemId: number): string | null {
  const re = new RegExp(`vote\\?id=${itemId}&how=up&auth=([a-f0-9]+)`, "i");
  return html.match(re)?.[1] ?? null;
}

export async function login(username: string, password: string): Promise<string | null> {
  const body = new URLSearchParams({
    acct: username,
    pw: password,
    goto: "news",
  });

  const res = await fetch(`${HN_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    redirect: "manual",
  });

  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/user=([^;]+)/);
  if (match) return match[1]!;

  // Some environments follow the redirect — check for cookie in body
  const cookies = res.headers.getSetCookie?.() ?? [];
  for (const c of cookies) {
    const m = c.match(/user=([^;]+)/);
    if (m) return m[1]!;
  }

  return null;
}

export async function submitStory(
  cookie: string,
  title: string,
  url?: string,
  text?: string,
): Promise<boolean> {
  // Step 1: GET /submit to extract fnid
  const page = await fetch(`${HN_BASE}/submit`, {
    headers: { Cookie: `user=${cookie}` },
  });
  const html = await page.text();
  const fnid = extractHidden(html, "fnid");
  const fnop = extractHidden(html, "fnop") ?? "submit-page";
  if (!fnid) return false;

  // Step 2: POST /r with form data
  const params: Record<string, string> = { fnid, fnop, title };
  if (url) params.url = url;
  if (text) params.text = text;

  const res = await fetch(`${HN_BASE}/r`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `user=${cookie}`,
    },
    body: new URLSearchParams(params).toString(),
    redirect: "manual",
  });

  return res.status >= 200 && res.status < 400;
}

export async function submitComment(
  cookie: string,
  parentId: number,
  text: string,
): Promise<boolean> {
  // Step 1: GET /reply?id=X to extract fnid
  const page = await fetch(`${HN_BASE}/reply?id=${parentId}`, {
    headers: { Cookie: `user=${cookie}` },
  });
  const html = await page.text();
  const fnid = extractHidden(html, "fnid");
  const fnop = extractHidden(html, "fnop") ?? "reply";
  if (!fnid) return false;

  // Step 2: POST /r
  const params = new URLSearchParams({
    fnid,
    fnop,
    parent: String(parentId),
    goto: `item?id=${parentId}`,
    text,
  });

  const res = await fetch(`${HN_BASE}/r`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `user=${cookie}`,
    },
    body: params.toString(),
    redirect: "manual",
  });

  return res.status >= 200 && res.status < 400;
}

export async function upvote(cookie: string, itemId: number): Promise<boolean> {
  // Step 1: GET the item page to extract auth token
  const page = await fetch(`${HN_BASE}/item?id=${itemId}`, {
    headers: { Cookie: `user=${cookie}` },
  });
  const html = await page.text();
  const auth = extractAuthToken(html, itemId);
  if (!auth) return false;

  // Step 2: GET the vote URL
  const res = await fetch(
    `${HN_BASE}/vote?id=${itemId}&how=up&auth=${auth}&goto=item%3Fid%3D${itemId}`,
    {
      headers: { Cookie: `user=${cookie}` },
      redirect: "manual",
    },
  );

  return res.status >= 200 && res.status < 400;
}
