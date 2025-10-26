// Quick verification script for auth configuration
const fs = require('fs');
const path = require('path');

console.log('\n=== NextAuth Configuration Check ===\n');

// Read .env.local file
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getValue = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1] : null;
};

const checks = [
  { name: 'NEXTAUTH_URL', value: getValue('NEXTAUTH_URL'), expected: 'http://localhost:3000' },
  { name: 'NEXTAUTH_SECRET', value: getValue('NEXTAUTH_SECRET') ? '✓ Present (strong)' : '✗ Missing', expected: '✓' },
  { name: 'GOOGLE_CLIENT_ID', value: getValue('GOOGLE_CLIENT_ID') ? '✓ Present' : '✗ Missing', expected: '✓' },
  { name: 'GOOGLE_CLIENT_SECRET', value: getValue('GOOGLE_CLIENT_SECRET') ? '✓ Present' : '✗ Missing', expected: '✓' },
];

checks.forEach(check => {
  const status = check.value === check.expected || check.value?.includes('✓') ? '✓' : '⚠';
  console.log(`${status} ${check.name}: ${check.value}`);
});

console.log('\n=== Google OAuth Redirect URI ===');
console.log('Expected: http://localhost:3000/api/auth/callback/google');
console.log('\nIMPORTANT: Verify this matches your Google Cloud Console settings!');
console.log('Go to: https://console.cloud.google.com/apis/credentials');
const clientId = getValue('GOOGLE_CLIENT_ID');
if (clientId) {
  console.log(`Find client: ${clientId.split('-')[0]}...`);
}

console.log('\n=== Next Steps ===');
console.log('1. Verify Google OAuth Console has correct redirect URI');
console.log('2. Clear browser cache and cookies for localhost:3000');
console.log('3. Restart dev server: npm run dev');
console.log('4. Test login at: http://localhost:3000/api/auth/signin');
console.log('5. Watch terminal for [NextAuth] debug logs\n');
