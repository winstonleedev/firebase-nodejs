const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with service account credentials
admin.initializeApp({
  credential: admin.credential.cert('../placeholders/service-account.json'),
});

/**
 * Search for a user by phone number
 * @param {string} phoneNumber - The phone number to search for (in E.164 format, e.g., +1234567890)
 * @return {Promise<admin.auth.UserRecord|null>} - The user record if found, null if not found
 */
async function findUserByPhoneNumber(phoneNumber) {
  try {
    // Validate phone number format
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new Error('Phone number must be a non-empty string');
    }

    // Ensure phone number is in E.164 format (starts with +)
    if (!phoneNumber.startsWith('+')) {
      throw new Error('Phone number must be in E.164 format (e.g., +1234567890)');
    }

    // Search for user by phone number
    const userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
    
    console.log('User found:', {
      uid: userRecord.uid,
      email: userRecord.email,
      phoneNumber: userRecord.phoneNumber,
      displayName: userRecord.displayName,
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled,
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime
    });

    return userRecord;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`No user found with phone number: ${phoneNumber}`);
      return null;
    } else {
      console.error('Error searching for user by phone number:', error.message);
      throw error;
    }
  }
}

/**
 * Search for multiple users by phone numbers
 * @param {string[]} phoneNumbers - Array of phone numbers to search for
 * @return {Promise<{found: admin.auth.UserRecord[], notFound: string[]}>} - Object containing found users and not found phone numbers
 */
async function findUsersByPhoneNumbers(phoneNumbers) {
  const found = [];
  const notFound = [];

  for (const phoneNumber of phoneNumbers) {
    try {
      const user = await findUserByPhoneNumber(phoneNumber);
      if (user) {
        found.push(user);
      } else {
        notFound.push(phoneNumber);
      }
    } catch (error) {
      console.error(`Error searching for ${phoneNumber}:`, error.message);
      notFound.push(phoneNumber);
    }
  }

  return { found, notFound };
}

/**
 * Get detailed user information by phone number
 * @param {string} phoneNumber - The phone number to search for
 * @return {Promise<Object|null>} - Detailed user information or null if not found
 */
async function getUserDetailsByPhoneNumber(phoneNumber) {
  try {
    const userRecord = await findUserByPhoneNumber(phoneNumber);
    
    if (!userRecord) {
      return null;
    }

    // Return detailed user information
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      phoneNumber: userRecord.phoneNumber,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled,
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        lastRefreshTime: userRecord.metadata.lastRefreshTime
      },
      customClaims: userRecord.customClaims || {},
      providerData: userRecord.providerData.map(provider => ({
        uid: provider.uid,
        displayName: provider.displayName,
        email: provider.email,
        phoneNumber: provider.phoneNumber,
        photoURL: provider.photoURL,
        providerId: provider.providerId
      }))
    };
  } catch (error) {
    console.error('Error getting user details:', error.message);
    throw error;
  }
}

// Export functions for use in other modules
module.exports = {
  findUserByPhoneNumber,
  findUsersByPhoneNumbers,
  getUserDetailsByPhoneNumber
};

// CLI functionality - run this script directly with phone number as argument
if (require.main === module) {
  const phoneNumber = process.argv[2];
  
  if (!phoneNumber) {
    console.log(`
Usage: node search.js <phone_number>

Examples:
  node search.js +1234567890
  node search.js +84123456789

The phone number must be in E.164 format (starting with +).
    `);
    process.exit(1);
  }

  // Run the search
  findUserByPhoneNumber(phoneNumber)
    .then(user => {
      if (user) {
        console.log('\n✅ User found successfully!');
      } else {
        console.log('\n❌ No user found with this phone number.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}