import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type Handler = (req: Request, ctx?: any) => Promise<NextResponse>;

export function withAuth(handler: Handler, roles?: string[]) {
  return async (req: Request, ctx?: any) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (roles && !roles.includes((session.user as any).role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(req, ctx);
  };
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
