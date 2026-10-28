import { PrismaClient, type UserRole } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Cambia el rol de un usuario. No hay interfaz para esto a propósito:
 * nombrar moderadores requiere acceso a la base de datos.
 *
 *   npm run set-role -- <username> admin
 *   npm run set-role -- <username> user
 */
async function main() {
    const [username, roleArg] = process.argv.slice(2);
    const role = roleArg?.toUpperCase() as UserRole | undefined;

    if (!username || (role !== 'ADMIN' && role !== 'USER')) {
        console.error('Uso: npm run set-role -- <username> <admin|user>');
        process.exit(1);
    }

    const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
    if (!user) {
        console.error(`❌ No existe el usuario @${username}`);
        process.exit(1);
    }

    await prisma.user.update({ where: { id: user.id }, data: { role } });
    console.log(`✅ @${username} ahora es ${role}. El cambio aplica en su siguiente petición.`);
}

main()
    .catch((e) => {
        console.error('\n❌ El script se detuvo:', e instanceof Error ? e.message : e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
