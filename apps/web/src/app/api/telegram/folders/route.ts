import { env } from "@amiro/env/web";

export async function POST(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return Response.json(
      { ok: false, error: "Missing Authorization header." },
      { status: 401 },
    );
  }

  const body = await request.text();
  const response = await fetch(
    `${env.NEXT_PUBLIC_CONVEX_SITE_URL}/api/telegram/folders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body,
    },
  );

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
