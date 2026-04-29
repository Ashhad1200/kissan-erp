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

  // ─── Users ────────────────────────────────────────────────────────────────
  const h = (p) => bcrypt.hash(p, 10);
  const users = [
    { email: "admin@kissanmall.pk",   name: "Admin",        role: "ADMIN",   password: await h("admin123")   },
    { email: "manager@kissanmall.pk", name: "Ali Manager",  role: "MANAGER", password: await h("manager123") },
    { email: "staff1@kissanmall.pk",  name: "Bilal Ahmed",  role: "STAFF",   password: await h("staff123")   },
    { email: "staff2@kissanmall.pk",  name: "Sara Khan",    role: "STAFF",   password: await h("staff123")   },
    { email: "staff3@kissanmall.pk",  name: "Usman Tariq",  role: "STAFF",   password: await h("staff123")   },
  ];
  for (const u of users) {
    await prisma.user.upsert({ where: { email: u.email }, update: {}, create: u });
  }
  console.log("✅ Users seeded");

  // ─── Categories ───────────────────────────────────────────────────────────
  const catNames = ["Fertilizers", "Seeds", "Pesticides", "Tools & Equipment", "Irrigation", "Animal Feed"];
  const catMap = {};
  for (const name of catNames) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    catMap[name] = c.id;
  }
  console.log("✅ Categories seeded");

  // ─── Chart of Accounts ────────────────────────────────────────────────────
  const accounts = [
    { code: "1000", name: "Current Assets",      type: "ASSET"     },
    { code: "1100", name: "Cash",                type: "ASSET"     },
    { code: "1200", name: "Bank",                type: "ASSET"     },
    { code: "1300", name: "Accounts Receivable", type: "ASSET"     },
    { code: "1400", name: "Inventory",           type: "ASSET"     },
    { code: "2000", name: "Current Liabilities", type: "LIABILITY" },
    { code: "2100", name: "Accounts Payable",    type: "LIABILITY" },
    { code: "3000", name: "Equity",              type: "EQUITY"    },
    { code: "3100", name: "Owner Capital",       type: "EQUITY"    },
    { code: "4000", name: "Revenue",             type: "REVENUE"   },
    { code: "4100", name: "Sales Revenue",       type: "REVENUE"   },
    { code: "5000", name: "Cost of Goods Sold",  type: "EXPENSE"   },
    { code: "6000", name: "Operating Expenses",  type: "EXPENSE"   },
    { code: "6100", name: "Salaries",            type: "EXPENSE"   },
    { code: "6200", name: "Rent",                type: "EXPENSE"   },
    { code: "6300", name: "Utilities",           type: "EXPENSE"   },
    { code: "6400", name: "Transport",           type: "EXPENSE"   },
    { code: "6500", name: "Marketing",           type: "EXPENSE"   },
    { code: "6600", name: "Miscellaneous",       type: "EXPENSE"   },
  ];
  for (const a of accounts) {
    await prisma.account.upsert({ where: { code: a.code }, update: {}, create: a });
  }
  console.log("✅ Chart of accounts seeded");

  // ─── Products ─────────────────────────────────────────────────────────────
  const productsData = [
    { sku: "FERT-UREA-50",  name: "Urea Fertilizer 50kg",         unit: "bag", costPrice: 2800, salePrice: 3200, reorderLevel: 20, reorderQty: 100, categoryId: catMap["Fertilizers"],        description: "High nitrogen urea fertilizer 50kg bag" },
    { sku: "FERT-DAP-50",   name: "DAP Fertilizer 50kg",          unit: "bag", costPrice: 5200, salePrice: 5800, reorderLevel: 15, reorderQty: 80,  categoryId: catMap["Fertilizers"],        description: "Di-ammonium phosphate fertilizer 50kg" },
    { sku: "FERT-NP-50",    name: "NP Fertilizer 50kg",           unit: "bag", costPrice: 4500, salePrice: 5000, reorderLevel: 10, reorderQty: 50,  categoryId: catMap["Fertilizers"],        description: "Nitrogen phosphorus compound 50kg" },
    { sku: "SEED-WHEAT-40", name: "Wheat Seeds 40kg",             unit: "bag", costPrice: 1800, salePrice: 2200, reorderLevel: 25, reorderQty: 120, categoryId: catMap["Seeds"],             description: "Certified wheat seed variety Sehar-2006" },
    { sku: "SEED-COTTON-1", name: "Cotton Seeds 1kg",             unit: "kg",  costPrice: 800,  salePrice: 1000, reorderLevel: 30, reorderQty: 150, categoryId: catMap["Seeds"],             description: "BT cotton hybrid seeds 1kg pack" },
    { sku: "SEED-MAIZE-5",  name: "Maize Seeds 5kg",              unit: "bag", costPrice: 1200, salePrice: 1500, reorderLevel: 20, reorderQty: 100, categoryId: catMap["Seeds"],             description: "Hybrid maize seeds 5kg" },
    { sku: "PEST-CHLORO-1", name: "Chlorpyrifos 1L",              unit: "ltr", costPrice: 900,  salePrice: 1100, reorderLevel: 15, reorderQty: 60,  categoryId: catMap["Pesticides"],        description: "Broad spectrum insecticide 1 litre" },
    { sku: "PEST-GLYPHO-1", name: "Glyphosate Herbicide 1L",      unit: "ltr", costPrice: 650,  salePrice: 800,  reorderLevel: 15, reorderQty: 60,  categoryId: catMap["Pesticides"],        description: "Systemic herbicide for weed control" },
    { sku: "PEST-FUNGAL-1", name: "Mancozeb Fungicide 500g",      unit: "pkt", costPrice: 450,  salePrice: 550,  reorderLevel: 20, reorderQty: 80,  categoryId: catMap["Pesticides"],        description: "Broad spectrum fungicide 500g pack" },
    { sku: "TOOL-SPRAY-16", name: "Knapsack Sprayer 16L",         unit: "pcs", costPrice: 2200, salePrice: 2800, reorderLevel: 5,  reorderQty: 20,  categoryId: catMap["Tools & Equipment"], description: "Manual knapsack sprayer 16 litre" },
    { sku: "TOOL-TROWEL",   name: "Hand Trowel Set",              unit: "set", costPrice: 350,  salePrice: 500,  reorderLevel: 10, reorderQty: 40,  categoryId: catMap["Tools & Equipment"], description: "Garden hand trowel set of 3 pieces" },
    { sku: "IRR-DRIP-100",  name: "Drip Irrigation Kit 100m",     unit: "kit", costPrice: 8500, salePrice: 10000,reorderLevel: 3,  reorderQty: 10,  categoryId: catMap["Irrigation"],         description: "Complete drip irrigation kit 100 metre" },
    { sku: "IRR-PIPE-1",    name: "PVC Pipe 1 inch 20ft",         unit: "pcs", costPrice: 280,  salePrice: 350,  reorderLevel: 20, reorderQty: 100, categoryId: catMap["Irrigation"],         description: "PVC water pipe 1 inch 20 feet" },
    { sku: "FEED-CHICK-50", name: "Broiler Chicken Feed 50kg",    unit: "bag", costPrice: 3200, salePrice: 3600, reorderLevel: 20, reorderQty: 100, categoryId: catMap["Animal Feed"],        description: "Complete broiler feed 50kg" },
    { sku: "FEED-CATT-50",  name: "Cattle Concentrate Feed 50kg", unit: "bag", costPrice: 2800, salePrice: 3200, reorderLevel: 15, reorderQty: 80,  categoryId: catMap["Animal Feed"],        description: "High protein cattle feed 50kg bag" },
  ];
  const prodMap = {};
  for (const p of productsData) {
    const prod = await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p });
    prodMap[p.sku] = prod.id;
  }
  console.log("✅ Products seeded");

  // ─── Opening Stock ─────────────────────────────────────────────────────────
  const opening = [
    { sku: "FERT-UREA-50",  qty: 150, cost: 2800 },
    { sku: "FERT-DAP-50",   qty: 80,  cost: 5200 },
    { sku: "SEED-WHEAT-40", qty: 200, cost: 1800 },
    { sku: "SEED-COTTON-1", qty: 120, cost: 800  },
    { sku: "PEST-CHLORO-1", qty: 60,  cost: 900  },
    { sku: "PEST-GLYPHO-1", qty: 50,  cost: 650  },
    { sku: "TOOL-SPRAY-16", qty: 25,  cost: 2200 },
    { sku: "IRR-DRIP-100",  qty: 10,  cost: 8500 },
    { sku: "FEED-CHICK-50", qty: 100, cost: 3200 },
    { sku: "FEED-CATT-50",  qty: 90,  cost: 2800 },
  ];
  for (const s of opening) {
    const exists = await prisma.stockMovement.findFirst({ where: { productId: prodMap[s.sku], type: "OPENING" } });
    if (!exists) {
      await prisma.stockMovement.create({ data: { productId: prodMap[s.sku], type: "OPENING", qty: s.qty, balanceQty: s.qty, unitCost: s.cost, notes: "Opening stock", createdBy: "admin@kissanmall.pk" } });
    }
  }
  console.log("✅ Opening stock seeded");

  // ─── Suppliers ────────────────────────────────────────────────────────────
  const suppData = [
    { name: "Engro Fertilizers Ltd",  contactPerson: "Tariq Mehmood", phone: "0300-1234567", email: "tariq@engro.com",     city: "Karachi",    paymentTerms: "30 Days" },
    { name: "National Seeds Corp",    contactPerson: "Asif Raza",     phone: "0311-2345678", email: "asif@nsc.pk",         city: "Lahore",     paymentTerms: "15 Days" },
    { name: "FMC Pakistan Pvt Ltd",   contactPerson: "Hina Shahid",   phone: "0321-3456789", email: "hina@fmc.com.pk",     city: "Islamabad",  paymentTerms: "Cash"    },
    { name: "Agriauto Industries",    contactPerson: "Kamran Ali",    phone: "0333-4567890", email: "kamran@agriauto.pk",  city: "Faisalabad", paymentTerms: "45 Days" },
    { name: "Punjab Agri Supplies",   contactPerson: "Zafar Iqbal",   phone: "0345-5678901", email: "zafar@punjabagg.pk", city: "Multan",     paymentTerms: "Cash"    },
  ];
  const suppMap = {};
  for (const s of suppData) {
    let sup = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!sup) sup = await prisma.supplier.create({ data: s });
    suppMap[s.name] = sup.id;
  }
  console.log("✅ Suppliers seeded");

  // ─── Customers ────────────────────────────────────────────────────────────
  const custData = [
    { name: "Muhammad Imran",    phone: "0300-9876543", email: "imran.farmer@gmail.com", city: "Sahiwal",    address: "Village Chak 45, Sahiwal"  },
    { name: "Ghulam Hussain",    phone: "0311-8765432", email: "ghulam.h@yahoo.com",     city: "Okara",      address: "Mouza Depalpur, Okara"     },
    { name: "Fatima Agri Farm",  phone: "0321-7654321", email: "fatima.farm@gmail.com",  city: "Vehari",     address: "Chak 100/WB, Vehari"       },
    { name: "Rana Brothers",     phone: "0333-6543210", email: "rana.bros@hotmail.com",  city: "Khanewal",   address: "Main Bazar, Khanewal"      },
    { name: "Al-Barkat Nursery", phone: "0345-5432109", email: "albarkat@nursery.pk",    city: "Bahawalpur", address: "Model Town, Bahawalpur"    },
  ];
  const custMap = {};
  for (const c of custData) {
    let cust = await prisma.customer.findFirst({ where: { name: c.name } });
    if (!cust) cust = await prisma.customer.create({ data: c });
    custMap[c.name] = cust.id;
  }
  console.log("✅ Customers seeded");

  // ─── Purchase Orders ──────────────────────────────────────────────────────
  const poList = [
    { poNumber: "PO-2026-001", supplier: "Engro Fertilizers Ltd",  status: "RECEIVED", paid: 296000, items: [{ sku: "FERT-UREA-50", qty: 50, cost: 2800 }, { sku: "FERT-DAP-50", qty: 30, cost: 5200 }] },
    { poNumber: "PO-2026-002", supplier: "National Seeds Corp",    status: "RECEIVED", paid: 300000, items: [{ sku: "SEED-WHEAT-40", qty: 100, cost: 1800 }, { sku: "SEED-COTTON-1", qty: 80, cost: 800 }, { sku: "SEED-MAIZE-5", qty: 50, cost: 1200 }] },
    { poNumber: "PO-2026-003", supplier: "FMC Pakistan Pvt Ltd",   status: "PARTIAL",  paid: 50000,  items: [{ sku: "PEST-CHLORO-1", qty: 40, cost: 900 }, { sku: "PEST-GLYPHO-1", qty: 40, cost: 650 }, { sku: "PEST-FUNGAL-1", qty: 60, cost: 450 }] },
    { poNumber: "PO-2026-004", supplier: "Agriauto Industries",    status: "ORDERED",  paid: 20000,  items: [{ sku: "TOOL-SPRAY-16", qty: 20, cost: 2200 }, { sku: "TOOL-TROWEL", qty: 30, cost: 350 }, { sku: "IRR-DRIP-100", qty: 5, cost: 8500 }] },
    { poNumber: "PO-2026-005", supplier: "Punjab Agri Supplies",   status: "RECEIVED", paid: 332000, items: [{ sku: "FEED-CHICK-50", qty: 60, cost: 3200 }, { sku: "FEED-CATT-50", qty: 50, cost: 2800 }] },
  ];
  for (const po of poList) {
    const exists = await prisma.purchaseOrder.findUnique({ where: { poNumber: po.poNumber } });
    if (exists) continue;
    const sub = po.items.reduce((s, i) => s + i.qty * i.cost, 0);
    await prisma.purchaseOrder.create({
      data: {
        poNumber: po.poNumber, supplierId: suppMap[po.supplier],
        status: po.status, subTotal: sub, total: sub, paidAmount: po.paid,
        items: { create: po.items.map(i => ({ productId: prodMap[i.sku], qty: i.qty, receivedQty: po.status === "RECEIVED" ? i.qty : po.status === "PARTIAL" ? Math.floor(i.qty / 2) : 0, unitCost: i.cost, total: i.qty * i.cost })) },
        payments: po.paid > 0 ? { create: [{ type: "PURCHASE_PAYMENT", method: "BANK_TRANSFER", amount: po.paid, notes: `Payment for ${po.poNumber}` }] } : undefined,
      },
    });
  }
  console.log("✅ Purchase orders seeded");

  // ─── Sale Orders ──────────────────────────────────────────────────────────
  const soList = [
    { orderNumber: "SO-2026-001", customer: "Muhammad Imran",    status: "COMPLETED",  paid: 38000, items: [{ sku: "FERT-UREA-50",  qty: 5,  price: 3200, cost: 2800 }, { sku: "SEED-WHEAT-40", qty: 10, price: 2200, cost: 1800 }] },
    { orderNumber: "SO-2026-002", customer: "Ghulam Hussain",    status: "COMPLETED",  paid: 45500, items: [{ sku: "PEST-CHLORO-1", qty: 5,  price: 1100, cost: 900  }, { sku: "PEST-GLYPHO-1", qty: 5, price: 800, cost: 650 }, { sku: "FEED-CHICK-50", qty: 10, price: 3600, cost: 3200 }] },
    { orderNumber: "SO-2026-003", customer: "Fatima Agri Farm",  status: "PROCESSING", paid: 10000, items: [{ sku: "IRR-DRIP-100",  qty: 2,  price: 10000,cost: 8500 }, { sku: "IRR-PIPE-1",    qty: 20, price: 350,  cost: 280  }] },
    { orderNumber: "SO-2026-004", customer: "Rana Brothers",     status: "COMPLETED",  paid: 78000, items: [{ sku: "FERT-DAP-50",   qty: 10, price: 5800, cost: 5200 }, { sku: "SEED-COTTON-1", qty: 20, price: 1000, cost: 800  }] },
    { orderNumber: "SO-2026-005", customer: "Al-Barkat Nursery", status: "CONFIRMED",  paid: 5000,  items: [{ sku: "TOOL-SPRAY-16", qty: 3,  price: 2800, cost: 2200 }, { sku: "TOOL-TROWEL",   qty: 5,  price: 500,  cost: 350  }, { sku: "FEED-CATT-50", qty: 5, price: 3200, cost: 2800 }] },
  ];
  for (const so of soList) {
    const exists = await prisma.saleOrder.findUnique({ where: { orderNumber: so.orderNumber } });
    if (exists) continue;
    const sub = so.items.reduce((s, i) => s + i.qty * i.price, 0);
    await prisma.saleOrder.create({
      data: {
        orderNumber: so.orderNumber, customerId: custMap[so.customer],
        status: so.status, channel: "PHYSICAL", subTotal: sub, total: sub, paidAmount: so.paid,
        items: { create: so.items.map(i => ({ productId: prodMap[i.sku], qty: i.qty, unitPrice: i.price, unitCost: i.cost, discount: 0, total: i.qty * i.price })) },
        payments: so.paid > 0 ? { create: [{ type: "SALE_RECEIPT", method: "CASH", amount: so.paid, notes: `Payment for ${so.orderNumber}` }] } : undefined,
      },
    });
  }
  console.log("✅ Sale orders seeded");

  // ─── Expenses ─────────────────────────────────────────────────────────────
  const expList = [
    { description: "Shop Rent - January 2026",    category: "Rent",       amount: 25000,  paidVia: "Bank Transfer", expenseDate: new Date("2026-01-01") },
    { description: "Electricity Bill - Jan 2026",  category: "Utilities",  amount: 8500,   paidVia: "Cash",          expenseDate: new Date("2026-01-05") },
    { description: "Staff Salaries - January",     category: "Salaries",   amount: 120000, paidVia: "Bank Transfer", expenseDate: new Date("2026-01-31") },
    { description: "Delivery Van Fuel - Feb",      category: "Transport",  amount: 15000,  paidVia: "Cash",          expenseDate: new Date("2026-02-10") },
    { description: "Facebook Ads - Feb 2026",      category: "Marketing",  amount: 10000,  paidVia: "Bank Transfer", expenseDate: new Date("2026-02-01") },
    { description: "Shop Rent - February 2026",    category: "Rent",       amount: 25000,  paidVia: "Bank Transfer", expenseDate: new Date("2026-02-01") },
    { description: "Internet & Phone Bill - Feb",  category: "Utilities",  amount: 3500,   paidVia: "Cash",          expenseDate: new Date("2026-02-05") },
  ];
  for (const e of expList) {
    const exists = await prisma.expense.findFirst({ where: { description: e.description } });
    if (!exists) await prisma.expense.create({ data: { ...e, createdBy: "admin@kissanmall.pk" } });
  }
  console.log("✅ Expenses seeded");

  // ─── Journal Entries ──────────────────────────────────────────────────────
  const cashId = (await prisma.account.findUnique({ where: { code: "1100" } }))?.id;
  const bankId = (await prisma.account.findUnique({ where: { code: "1200" } }))?.id;
  const salesId = (await prisma.account.findUnique({ where: { code: "4100" } }))?.id;
  const cogsId  = (await prisma.account.findUnique({ where: { code: "5000" } }))?.id;
  const invId   = (await prisma.account.findUnique({ where: { code: "1400" } }))?.id;
  const apId    = (await prisma.account.findUnique({ where: { code: "2100" } }))?.id;

  const jeList = [
    { ref: "JV-001", desc: "Opening cash balance",              dr: cashId,  cr: null,     amt: 500000 },
    { ref: "JV-002", desc: "Sales receipt SO-2026-001",         dr: cashId,  cr: salesId,  amt: 38000  },
    { ref: "JV-003", desc: "Purchase payment PO-2026-001",      dr: apId,    cr: bankId,   amt: 296000 },
    { ref: "JV-004", desc: "Cost of goods sold SO-2026-002",    dr: cogsId,  cr: invId,    amt: 40750  },
    { ref: "JV-005", desc: "Sales receipt SO-2026-004",         dr: cashId,  cr: salesId,  amt: 78000  },
  ];
  for (const je of jeList) {
    const exists = await prisma.journalEntry.findFirst({ where: { reference: je.ref } });
    if (!exists) {
      await prisma.journalEntry.create({
        data: {
          reference: je.ref, description: je.desc, createdBy: "admin@kissanmall.pk",
          lines: { create: [{ debitAccountId: je.dr ?? null, creditAccountId: je.cr ?? null, amount: je.amt }] },
        },
      });
    }
  }
  console.log("✅ Journal entries seeded");

  console.log("🎉 Seeding complete!");
}

await seed().finally(() => prisma.$disconnect());
