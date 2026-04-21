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

    const where: any = {};
    if (startDate || endDate) {
      where.entryDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate + "T23:59:59.999Z") }),
      };
    }

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              debitAccount: { select: { id: true, code: true, name: true } },
              creditAccount: { select: { id: true, code: true, name: true } },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { entryDate: "desc" },
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return apiSuccess({
      data: entries.map((e) => ({
        ...e,
        lines: e.lines.map((l) => ({ ...l, amount: Number(l.amount) })),
      })),
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch journal entries", 500);
  }
});

export const POST = withAuth(async (req: Request) => {
  try {
    const session = await auth();
    const body = await req.json();
    const { description, reference, entryDate, lines } = body;

    if (!description) return apiError("description is required");
    if (!Array.isArray(lines) || lines.length === 0) return apiError("lines are required");

    // Validate double-entry balance: sum of debits == sum of credits
    const totalDebits = lines.reduce((sum: number, l: any) => sum + (l.debitAccountId ? Number(l.amount) : 0), 0);
    const totalCredits = lines.reduce((sum: number, l: any) => sum + (l.creditAccountId ? Number(l.amount) : 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      return apiError("Journal entry is not balanced: debits must equal credits");
    }

    const entry = await prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          description,
          reference: reference ?? null,
          entryDate: entryDate ? new Date(entryDate) : new Date(),
          createdBy: session?.user?.id ?? null,
          lines: {
            create: lines.map((l: any) => ({
              debitAccountId: l.debitAccountId ?? null,
              creditAccountId: l.creditAccountId ?? null,
              amount: Number(l.amount),
              description: l.description ?? null,
            })),
          },
        },
        include: {
          lines: {
            include: {
              debitAccount: { select: { id: true, code: true, name: true } },
              creditAccount: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });

      // Update account balances
      for (const line of lines) {
        if (line.debitAccountId) {
          await tx.account.update({
            where: { id: line.debitAccountId },
            data: { balance: { increment: Number(line.amount) } },
          });
        }
        if (line.creditAccountId) {
          await tx.account.update({
            where: { id: line.creditAccountId },
            data: { balance: { decrement: Number(line.amount) } },
          });
        }
      }

      return journalEntry;
    });

    return apiSuccess(
      { ...entry, lines: entry.lines.map((l) => ({ ...l, amount: Number(l.amount) })) },
      201
    );
  } catch (err) {
    console.error(err);
    return apiError("Failed to create journal entry", 500);
  }
});
