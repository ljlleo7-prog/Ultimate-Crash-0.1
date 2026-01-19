
// Simple obfuscation to prevent casual modification
const SALT = 'AIRCRASHSIM2025';

export const encryptFlightData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    // Simple XOR with SALT
    let result = '';
    for (let i = 0; i < jsonString.length; i++) {
      const charCode = jsonString.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length);
      result += String.fromCharCode(charCode);
    }
    // Convert to Base64 to make it safe for file storage
    return btoa(result);
  } catch (error) {
    console.error('Encryption failed:', error);
    return null;
  }
};

export const decryptFlightData = (encryptedString) => {
  try {
    // Decode Base64
    const xorString = atob(encryptedString);
    let result = '';
    for (let i = 0; i < xorString.length; i++) {
      const charCode = xorString.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length);
      result += String.fromCharCode(charCode);
    }
    return JSON.parse(result);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};
