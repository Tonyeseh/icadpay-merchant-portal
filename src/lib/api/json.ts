import { throwFromResponse } from "@/lib/auth/merchantAuthApi";

export async function readJsonUnknown(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function parseOkJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    await throwFromResponse(res);
  }
  const body = await readJsonUnknown(res);
  return body as T;
}

