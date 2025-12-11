const bcrypt = require('bcryptjs');

// Generate a new hash
const password = 'SystonAdmin2024!';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('New Hash:', hash);

// Verify the hash works
const isValid = bcrypt.compareSync(password, hash);
console.log('Hash verification:', isValid);

// Test with simpler password for debugging
const simplePass = 'test123';
const simpleHash = bcrypt.hashSync(simplePass, 10);
console.log('\nSimple password test:');
console.log('Password:', simplePass);
console.log('Hash:', simpleHash);
console.log('Verify:', bcrypt.compareSync(simplePass, simpleHash));
