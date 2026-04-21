import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";
import { auth } from "@/lib/auth";

export const GET = withAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;
    const category = searchParams.get("category") ?? undefined;

    const where: any = {};
    if (category) where.category = category;
    if (startDate || endDate) {
      where.expenseDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate + "T23:59:59.999Z") }),
      };
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { expenseDate: "desc" },
      }),
      prisma.expense.count({ where }),
    ]);

    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return apiSuccess({
      data: expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
      total,
      page,
      pageSize,
      totalAmount,
    });
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch expenses", 500);
  }
});

export const POST = withAuth(async (req: Request) => {
  try {
    const session = await auth();
    const body = await req.json();
    const { description, category, amount, paidVia, expenseDate, notes } = body;

    if (!description || !category || amount === undefined) {
      return apiError("description, category, and amount are required");
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        category,
        amount: Number(amount),
        paidVia: paidVia ?? "Cash",
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        notes: notes ?? null,
        createdBy: session?.user?.id ?? null,
      },
    });

    return apiSuccess({ ...expense, amount: Number(expense.amount) }, 201);
  } catch (err) {
    console.error(err);
    return apiError("Failed to create expense", 500);
  }
});
