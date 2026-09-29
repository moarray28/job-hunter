import { NextResponse } from "next/server";
import { collections } from "@/lib/server/db";
import { handler, HttpError, isDuplicateKey, parseBody, serialize } from "@/lib/server/http";
import { PortalCreate } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const docs = await (await collections.portals()).find({}).sort({ name: 1 }).toArray();
  return NextResponse.json(docs.map(serialize));
});

/** Attach a job source: store a config row for one of the scraper's adapters. */
export const POST = handler(async (req: Request) => {
  const body = await parseBody(req, PortalCreate);
  const portals = await collections.portals();
  try {
    const { insertedId } = await portals.insertOne({ ...body });
    const doc = await portals.findOne({ _id: insertedId });
    return NextResponse.json(serialize(doc!), { status: 201 });
  } catch (err) {
    if (isDuplicateKey(err)) throw new HttpError(409, "A portal with this name already exists");
    throw err;
  }
});
