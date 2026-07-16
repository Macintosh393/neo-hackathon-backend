const { PrismaClient } = require('@prisma/client');

// Singleton Prisma Client instance shared across controllers and services
const prisma = new PrismaClient();

module.exports = prisma;
