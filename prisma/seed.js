const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // ✅ Admin
  const passwordHashAdmin = await bcrypt.hash("admin123", 10);

  const admin = await prisma.admin.upsert({
    where: { email: "jimdar900@gmail.com" },
    update: {},
    create: {
      email: "jimdar900@gmail.com",
      password: passwordHashAdmin,
    },
  });
  console.log("Admin created:", admin);

  // ✅ Staff
  const passwordHashStaff = await bcrypt.hash("staff123", 10);

  const staff = await prisma.staff.upsert({
    where: { email: "staff@example.com" },
    update: {},
    create: {
      email: "staff@example.com",
      password: passwordHashStaff,
    },
  });
  console.log("Staff created:", staff);
}

// Run the main function
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
