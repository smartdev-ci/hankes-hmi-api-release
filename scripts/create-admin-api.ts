/**
 * Script de création d'un utilisateur administrateur
 * Utilise l'API déployée sur Render
 * 
 * Note: La création directe d'admin peut être restreinte.
 * Si vous recevez une erreur 403, contactez l'équipe technique.
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'https://hankes-hmi-api-release.onrender.com/v1';

// Identifiants admin à créer (modifiables via variables d'environnement)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@hmis.ci';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';
const ADMIN_NOM = process.env.ADMIN_NOM || 'Administrateur';
const ADMIN_PRENOM = process.env.ADMIN_PRENOM || 'Principal';
const ADMIN_TELEPHONE = process.env.ADMIN_TELEPHONE || '+2250102030405';

async function createAdmin() {
  console.log('🚀 Création d\'un utilisateur administrateur...');
  console.log(`📡 URL API: ${API_BASE_URL}`);
  console.log(`📧 Email: ${ADMIN_EMAIL}`);
  console.log(`👤 Nom: ${ADMIN_NOM} ${ADMIN_PRENOM}`);
  console.log(`📞 Téléphone: ${ADMIN_TELEPHONE}`);
  console.log('---');

  try {
    // Endpoint d'inscription
    const response = await axios.post(
      `${API_BASE_URL}/auth/register`,
      {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        nom: ADMIN_NOM,
        telephone: ADMIN_TELEPHONE,
        role: 'admin',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 secondes
      }
    );

    console.log('✅ Administrateur créé avec succès !');
    console.log('---');
    console.log('📋 Réponse de l\'API:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n✨ Prochaines étapes:');
    console.log('1. Un code OTP a été envoyé au téléphone indiqué');
    console.log('2. Vérifiez le compte avec: POST /auth/otp/verifier');
    console.log('3. Connectez-vous avec: POST /auth/login');
    console.log('\n📝 Identifiants:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Mot de passe: ${ADMIN_PASSWORD}`);

  } catch (error: any) {
    console.error('❌ Erreur lors de la création de l\'administrateur');
    
    if (error.response) {
      console.error('---');
      console.error(`📡 Status: ${error.response.status}`);
      console.error('📋 Réponse d\'erreur:');
      console.error(JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 409) {
        console.log('\n⚠️  Cet email ou téléphone est déjà utilisé.');
        console.log('Essayez avec un autre email/téléphone ou connectez-vous directement.');
      } else if (error.response.status === 400) {
        console.log('\n⚠️  Données invalides. Vérifiez le format des informations.');
      } else if (error.response.status === 403) {
        console.log('\n⚠️  La création directe de compte admin est restreinte.');
        console.log('Contactez l\'équipe technique ou utilisez un compte existant.');
      }
    } else if (error.request) {
      console.error('---');
      console.error('📡 Aucune réponse du serveur');
      console.error('Vérifiez que l\'API est accessible et que l\'URL est correcte.');
      console.error(`URL testée: ${API_BASE_URL}`);
      console.log('\n💡 L\'API Render peut prendre 30-60s pour démarrer (cold start).');
    } else {
      console.error('---');
      console.error('📝 Erreur:', error.message);
    }

    process.exit(1);
  }
}

// Exécution
createAdmin();
