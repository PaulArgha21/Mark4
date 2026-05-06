import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const employees = await db.employee.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true }
  })
  console.log('All employees:', JSON.stringify(employees, null, 2))
}

main().catch(console.error).finally(() => db.$disconnect())
