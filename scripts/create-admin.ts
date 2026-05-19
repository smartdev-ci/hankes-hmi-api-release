/**
 * Script de création d'un utilisateur administrateur
 * 
 * Usage: npx ts-node scripts/create-admin.ts
 * 
 * Variables d'environnement requises:
 * - DATABASE_URL (déjà configurée pour Supabase)
 */

import { prisma } from '../src/database';
import { hashPassword } from '../src/middleware/auth';
import { UserRole } from '@prisma/client';

async function createAdmin() {
  try {
    console.log('🔐 Création d\'un utilisateur administrateur...\n');

    // Demander les informations à l'utilisateur
    const email = process.env.ADMIN_EMAIL || 'admin@hmis.ci';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const nom = process.env.ADMIN_NOM || 'Administrateur Principal';
    const telephone = process.env.ADMIN_TELEPHONE || '+2250100000001';

    console.log('📋 Informations:');
    console.log(`   Email: ${email}`);
    console.log(`   Nom: ${nom}`);
    console.log(`   Téléphone: ${telephone}`);
    console.log('');

    // Vérifier si un admin existe déjà
    const existingAdmin = await prisma.user.findFirst({
      where: { role: UserRole.admin },
    });

    if (existingAdmin) {
      console.log('⚠️  Un utilisateur administrateur existe déjà:');
      console.log(`   ID: ${existingAdmin.id}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Nom: ${existingAdmin.nom}`);
      console.log('\n💡 Si vous voulez créer un autre admin, utilisez un email différent.');
      
      // Option: créer quand même si l'email est différent
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        console.log('\n❌ Cet email est déjà utilisé. Veuillez changer ADMIN_EMAIL.');
        await prisma.$disconnect();
        return;
      }
    }

    // Hacher le mot de passe
    console.log('🔒 Hachage du mot de passe...');
    const hashedPassword = await hashPassword(password);

    // Créer l'utilisateur admin
    console.log('💾 Création de l\'utilisateur dans la base de données...');
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nom,
        telephone,
        role: UserRole.admin,
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log('\n✅ Administrateur créé avec succès!\n');
    console.log('📄 Détails:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Nom: ${admin.nom}`);
    console.log(`   Téléphone: ${admin.telephone}`);
    console.log(`   Rôle: ${admin.role}`);
    console.log(`   Vérifié: ${admin.isVerified}`);
    console.log(`   Actif: ${admin.isActive}`);
    console.log('');
    console.log('🔑 Identifiants de connexion:');
    console.log(`   Email: ${email}`);
    console.log(`   Mot de passe: ${password}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Changez ce mot de passe après la première connexion!');
    console.log('');
    console.log('🌐 Endpoint de connexion: POST /auth/login');
    console.log('');

  } catch (error: any) {
    console.error('❌ Erreur lors de la création de l\'administrateur:', error.message);
    
    if (error.code === 'P2002') {
      console.error('\n💡 L\'email ou le téléphone est déjà utilisé. Utilisez des valeurs uniques.');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
createAdmin();
