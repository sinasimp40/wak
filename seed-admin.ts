import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool);

  // Check if admin already exists
  const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin@rdppanel.com'));
  
  if (existingAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      username: "admin",
      email: "admin@rdppanel.com",
      password: hashedPassword,
      role: "admin",
      balance: "0",
    });
    console.log("Admin user created!");
    console.log("Email: admin@rdppanel.com");
    console.log("Password: admin123");
  } else {
    console.log("Admin user already exists");
  }

  // Check if regular user already exists
  const existingUser = await db.select().from(users).where(eq(users.email, 'user@rdppanel.com'));
  
  if (existingUser.length === 0) {
    const hashedPassword = await bcrypt.hash("user123", 10);
    await db.insert(users).values({
      username: "testuser",
      email: "user@rdppanel.com",
      password: hashedPassword,
      role: "customer",
      balance: "0",
    });
    console.log("Regular user created!");
    console.log("Email: user@rdppanel.com");
    console.log("Password: user123");
  } else {
    console.log("Regular user already exists");
  }

  await pool.end();
}

seed().catch(console.error);
