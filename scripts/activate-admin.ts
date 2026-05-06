import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  await db.employee.update({
    where: { email: 'Arghap46@gmail.com' },
    data: { isActive: true, role: 'SUPERADMIN' }
  })
  console.log('✅ SUPERADMIN account activated')
}

main().catch(console.error).finally(() => db.$disconnect())
