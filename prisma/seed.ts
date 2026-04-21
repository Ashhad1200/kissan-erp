import "dotenv/config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // Admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@kissanmall.pk" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@kissanmall.pk",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin user:", admin.email);

  // Categories
  const categories = ["Fertilizers", "Seeds", "Pesticides", "Tools & Equipment", "Irrigation", "Animal Feed"];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("✅ Categories created");

  // Chart of Accounts
  const accounts = [
    { code: "1000", name: "Current Assets", type: "ASSET" as const },
    { code: "1100", name: "Cash", type: "ASSET" as const },
    { code: "1200", name: "Bank", type: "ASSET" as const },
    { code: "1300", name: "Accounts Receivable", type: "ASSET" as const },
    { code: "1400", name: "Inventory", type: "ASSET" as const },
    { code: "2000", name: "Current Liabilities", type: "LIABILITY" as const },
    { code: "2100", name: "Accounts Payable", type: "LIABILITY" as const },
    { code: "3000", name: "Equity", type: "EQUITY" as const },
    { code: "3100", name: "Owner's Capital", type: "EQUITY" as const },
    { code: "4000", name: "Revenue", type: "REVENUE" as const },
    { code: "4100", name: "Sales Revenue", type: "REVENUE" as const },
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" as const },
    { code: "6000", name: "Operating Expenses", type: "EXPENSE" as const },
    { code: "6100", name: "Salaries", type: "EXPENSE" as const },
    { code: "6200", name: "Rent", type: "EXPENSE" as const },
    { code: "6300", name: "Utilities", type: "EXPENSE" as const },
    { code: "6400", name: "Transport", type: "EXPENSE" as const },
    { code: "6500", name: "Marketing", type: "EXPENSE" as const },
    { code: "6600", name: "Miscellaneous", type: "EXPENSE" as const },
  ];

  for (const acc of accounts) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: {},
      create: acc,
    });
  }
  console.log("✅ Chart of accounts created");

  console.log("🎉 Seeding complete!");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
