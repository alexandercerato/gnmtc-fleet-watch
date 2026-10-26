import { updateGuide } from "@/lib/update-guide";
export function GET() { return Response.json(updateGuide, { headers: { "Cache-Control": "no-store" } }); }
