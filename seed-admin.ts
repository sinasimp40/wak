import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { users } from "./shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  // Check if admin already exists
  const existingAdmin = await db.select().from(users).where((u: any) => u.email === 'admin@rdppanel.com');
  
  if (existingAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      username: "admin",
      email: "admin@rdppanel.com",
      password: hashedPassword,
      role: "admin",
      balance: "1000.00",
    });
    console.log("Admin user created!");
    console.log("Email: admin@rdppanel.com");
    console.log("Password: admin123");
  } else {
    console.log("Admin user already exists");
  }
}

seed().catch(console.error);
