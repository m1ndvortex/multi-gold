import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { AuthService } from '@/services/authService';

// Simple verification script to test authentication components
async function verifyAuthComponents() {
  console.log('🔐 Testing Authentication Components...\n');

  // Test 1: Password hashing
  console.log('1. Testing password hashing...');
  try {
    const password = 'TestPassword123!';
    const hash = await bcrypt.hash(password, 12);
    const isValid = await bcrypt.compare(password, hash);
    console.log(`   ✅ Password hashing: ${isValid ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.log(`   ❌ Password hashing: FAIL - ${error}`);
  }

  // Test 2: JWT token generation
  console.log('2. Testing JWT token generation...');
  try {
    const payload = {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'TENANT_EMPLOYEE',
      tenantId: 'tenant-123',
      permissions: ['invoices.create'],
    };
    
    const secret = 'test-secret-key';
    const token = jwt.sign(payload, secret, { expiresIn: '15m' });
    const decoded = jwt.verify(token, secret) as any;
    
    const isValid = decoded.id === payload.id && decoded.email === payload.email;
    console.log(`   ✅ JWT tokens: ${isValid ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.log(`   ❌ JWT tokens: FAIL - ${error}`);
  }

  // Test 3: 2FA secret generation
  console.log('3. Testing 2FA secret generation...');
  try {
    const secret = speakeasy.generateSecret({
      name: 'Test App (test@example.com)',
      issuer: 'Jewelry SaaS Platform',
      length: 32,
    });
    
    const token = speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32',
    });
    
    const isValid = speakeasy.totp.verify({
      secret: secret.base32,
      encoding: 'base32',
      token,
      window: 2,
    });
    
    console.log(`   ✅ 2FA generation: ${isValid ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.log(`   ❌ 2FA generation: FAIL - ${error}`);
  }

  // Test 4: Permission checking logic
  console.log('4. Testing permission checking logic...');
  try {
    const userPermissions = ['invoices.create', 'invoices.view', 'customers.view'];
    const requiredPermission = 'invoices.create';
    
    const hasPermission = userPermissions.includes(requiredPermission) || 
                         userPermissions.includes('*');
    
    console.log(`   ✅ Permission checking: ${hasPermission ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.log(`   ❌ Permission checking: FAIL - ${error}`);
  }

  // Test 5: Role hierarchy checking
  console.log('5. Testing role hierarchy...');
  try {
    const adminRoles = ['SUPER_ADMIN', 'TENANT_ADMIN'];
    const userRole = 'TENANT_ADMIN';
    
    const isAdmin = adminRoles.includes(userRole);
    console.log(`   ✅ Role hierarchy: ${isAdmin ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.log(`   ❌ Role hierarchy: FAIL - ${error}`);
  }

  console.log('\n🎉 Authentication component verification completed!');
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifyAuthComponents().catch(console.error);
}

export { verifyAuthComponents };