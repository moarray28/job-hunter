import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z, ZodError, ZodTypeAny } from "zod";

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid id");
  return new ObjectId(id);
}

/** Convert a Mongo document to API JSON: `_id` → `id` string. */
export function serialize<T extends { _id: ObjectId }>(doc: T): Omit<T, "_id"> & { id: string } {
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}

export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  return schema.parse(raw);
}

export function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

/** Wrap a route handler so thrown HttpError/ZodError become JSON error responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ detail: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const detail = err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
        return NextResponse.json({ detail }, { status: 422 });
      }
      console.error(err);
      return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
    }
  };
}
