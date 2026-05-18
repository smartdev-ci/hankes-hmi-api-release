/**
 * Script de vérification OTP pour administrateur
 * Utilise l'API déployée sur Render
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'https://hankes-hmi-api-release.onrender.com/v1';

// Informations à fournir
const PHONE = process.env.PHONE || '+2250102030406';
const OTP = process.env.OTP || ''; // À fournir via variable d'environnement

async function verifyOTP() {
  if (!OTP) {
    console.error('❌ Veuillez fournir le code OTP via la variable PHONE');
    console.log('Exemple: PHONE="+2250102030406" OTP="123456" npm run verify-otp');
    process.exit(1);
  }

  console.log('🔐 Vérification du code OTP...');
  console.log(`📡 URL API: ${API_BASE_URL}`);
  console.log(`📞 Téléphone: ${PHONE}`);
  console.log(`🔢 OTP: ${OTP}`);
  console.log('---');

  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/otp/verifier`,
      {
        phone: PHONE,
        otp: OTP,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('✅ Code OTP vérifié avec succès !');
    console.log('---');
    console.log('📋 Réponse de l\'API:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n✨ Vous pouvez maintenant vous connecter avec:');
    console.log(`   POST ${API_BASE_URL}/auth/login`);

  } catch (error: any) {
    console.error('❌ Erreur lors de la vérification de l\'OTP');
    
    if (error.response) {
      console.error('---');
      console.error(`📡 Status: ${error.response.status}`);
      console.error('📋 Réponse d\'erreur:');
      console.error(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('---');
      console.error('📡 Aucune réponse du serveur');
    } else {
      console.error('---');
      console.error('📝 Erreur:', error.message);
    }

    process.exit(1);
  }
}

verifyOTP();
