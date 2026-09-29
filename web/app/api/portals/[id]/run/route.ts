import { NextResponse } from "next/server";
import { collections } from "@/lib/server/db";
import { handler, HttpError, toObjectId } from "@/lib/server/http";
import { runPortal } from "@/lib/server/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const POST = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const portal = await (await collections.portals()).findOne({ _id: toObjectId(params.id) });
  if (!portal) throw new HttpError(404, "Portal not found");
  const result = await runPortal(portal);
  if (result.error) throw new HttpError(502, result.error);
  return NextResponse.json(result);
});
