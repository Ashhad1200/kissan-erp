import { prisma } from "@/lib/prisma";
import { withAuth, apiSuccess, apiError } from "@/lib/api";

export const GET = withAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const where: any = {};
    if (from || to) {
      where.expenseDate = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to + "T23:59:59.999Z") }),
      };
    }

    const expenses = await prisma.expense.findMany({ where });

    const grouped = expenses.reduce((acc: Record<string, { category: string; total: number; count: number }>, e) => {
      if (!acc[e.category]) acc[e.category] = { category: e.category, total: 0, count: 0 };
      acc[e.category].total += Number(e.amount);
      acc[e.category].count += 1;
      return acc;
    }, {});

    return apiSuccess(Object.values(grouped));
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch expense summary", 500);
  }
});
