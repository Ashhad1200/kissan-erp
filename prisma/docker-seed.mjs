// Plain ESM seed — no tsx, no path aliases, runs directly with node
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL env var is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log("🌱 Seeding database...");

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

  const categories = ["Fertilizers", "Seeds", "Pesticides", "Tools & Equipment", "Irrigation", "Animal Feed"];
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log("✅ Categories seeded");

  const accounts = [
    { code: "1000", name: "Current Assets",       type: "ASSET"     },
    { code: "1100", name: "Cash",                 type: "ASSET"     },
    { code: "1200", name: "Bank",                 type: "ASSET"     },
    { code: "1300", name: "Accounts Receivable",  type: "ASSET"     },
    { code: "1400", name: "Inventory",            type: "ASSET"     },
    { code: "2000", name: "Current Liabilities",  type: "LIABILITY" },
    { code: "2100", name: "Accounts Payable",     type: "LIABILITY" },
    { code: "3000", name: "Equity",               type: "EQUITY"    },
    { code: "3100", name: "Owner's Capital",      type: "EQUITY"    },
    { code: "4000", name: "Revenue",              type: "REVENUE"   },
    { code: "4100", name: "Sales Revenue",        type: "REVENUE"   },
    { code: "5000", name: "Cost of Goods Sold",   type: "EXPENSE"   },
    { code: "6000", name: "Operating Expenses",   type: "EXPENSE"   },
    { code: "6100", name: "Salaries",             type: "EXPENSE"   },
    { code: "6200", name: "Rent",                 type: "EXPENSE"   },
    { code: "6300", name: "Utilities",            type: "EXPENSE"   },
    { code: "6400", name: "Transport",            type: "EXPENSE"   },
    { code: "6500", name: "Marketing",            type: "EXPENSE"   },
    { code: "6600", name: "Miscellaneous",        type: "EXPENSE"   },
  ];
  for (const acc of accounts) {
    await prisma.account.upsert({ where: { code: acc.code }, update: {}, create: acc });
  }
  console.log("✅ Chart of accounts seeded");

  console.log("🎉 Seeding complete!");
}

await seed().finally(() => prisma.$disconnect());
