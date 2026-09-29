import { NextResponse } from "next/server";
import { collections } from "@/lib/server/db";
import { handler, HttpError, isDuplicateKey, parseBody, serialize, toObjectId } from "@/lib/server/http";
import { PortalPatch } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const _id = toObjectId(params.id);
  const patch = await parseBody(req, PortalPatch);
  if (!Object.keys(patch).length) throw new HttpError(400, "No fields to update");
  try {
    const doc = await (await collections.portals()).findOneAndUpdate(
      { _id },
      { $set: patch },
      { returnDocument: "after" },
    );
    if (!doc) throw new HttpError(404, "Portal not found");
    return NextResponse.json(serialize(doc));
  } catch (err) {
    if (isDuplicateKey(err)) throw new HttpError(409, "A portal with this name already exists");
    throw err;
  }
});

/** Remove a source entirely. Jobs it already found are kept. */
export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const result = await (await collections.portals()).deleteOne({ _id: toObjectId(params.id) });
  if (!result.deletedCount) throw new HttpError(404, "Portal not found");
  return new NextResponse(null, { status: 204 });
});
