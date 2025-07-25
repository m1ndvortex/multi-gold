# Authentication and Authorization System

## Overview

This document describes the comprehensive authentication and authorization system implemented for the Jewelry SaaS Platform. The system provides JWT-based authentication, role-based access control (RBAC), two-factor authentication (2FA), and session management with Redis caching.

## Features Implemented

### ✅ Core Authentication
- **JWT-based Authentication**: Secure token-based authentication with access and refresh tokens
- **Password Security**: bcrypt hashing with configurable salt rounds
- **User Registration**: Secure user registration with validation
- **Login/Logout**: Complete authentication flow with device tracking

### ✅ Two-Factor Authentication (2FA)
- **TOTP Support**: Time-based One-Time Password using speakeasy
- **QR Code Generation**: QR codes for easy mobile app setup
- **Backup Codes**: (Ready for implementation)
- **2FA Management**: Enable/disable 2FA with password verification

### ✅ Role-Based Access Control (RBAC)
- **Hierarchical Roles**: SUPER_ADMIN > TENANT_ADMIN > TENANT_EMPLOYEE > CASHIER/ACCOUNTANT
- **Permission System**: Granular permissions for different operations
- **Middleware Protection**: Route-level access control
- **Resource Ownership**: Users can only access their own resources
- **Tenant Isolation**: Strict tenant data separation

### ✅ Session Management
- **Redis Integration**: Fast session storage and retrieval
- **Device Tracking**: Track user sessions across multiple devices
- **Session Limits**: Configurable maximum sessions per user
- **Session Analytics**: Device and location breakdown
- **Suspicious Activity Detection**: Monitor for unusual login patterns

### ✅ Security Features
- **Account Lockout**: Automatic lockout after failed login attempts
- **Rate Limiting**: API rate limiting per user and globally
- **Audit Logging**: Comprehensive logging of all authentication events
- **IP Tracking**: Track login locations and detect anomalies
- **Token Rotation**: Automatic refresh token rotation

## Architecture

### Components

1. **AuthService** (`src/services/authService.ts`)
   - Core authentication logic
   - User registration and login
   - 2FA management
   - Password operations

2. **Authentication Middleware** (`src/middleware/authMiddleware.ts`)
   - JWT token validation
   - User context injection
   - Basic permission checking

3. **RBAC Middleware** (`src/middleware/rbacMiddleware.ts`)
   - Advanced permission checking
   - Role-based access control
   - Resource ownership validation
   - Tenant isolation enforcement

4. **Session Manager** (`src/utils/sessionManager.ts`)
   - Session lifecycle management
   - Device tracking
   - Session analytics
   - Cleanup operations

5. **Auth Routes** (`src/routes/authRoutes.ts`)
   - RESTful authentication endpoints
   - Input validation
   - Error handling

## API Endpoints

### Public Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/logout` - User logout

### Protected Endpoints
- `GET /api/v1/auth/me` - Get current user profile
- `POST /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/2fa/setup` - Setup 2FA
- `POST /api/v1/auth/2fa/verify` - Verify and enable 2FA
- `POST /api/v1/auth/2fa/disable` - Disable 2FA
- `GET /api/v1/auth/sessions` - Get user sessions
- `DELETE /api/v1/auth/sessions/:id` - Revoke session

## User Roles and Permissions

### SUPER_ADMIN
- Full platform access
- Tenant management
- System configuration
- All permissions (`*`)

### TENANT_ADMIN
- Full tenant access
- User management
- Settings configuration
- Business reports
- Permissions: `users.manage`, `settings.manage`, `reports.view`, `invoices.manage`, `customers.manage`, `inventory.manage`, `accounting.manage`

### TENANT_EMPLOYEE
- Basic business operations
- Limited access to core features
- Permissions: `invoices.create`, `invoices.view`, `customers.view`, `inventory.view`

### CASHIER
- Point of sale operations
- Invoice creation
- Customer interaction
- Permissions: `invoices.create`, `invoices.view`, `customers.view`, `inventory.view`

### ACCOUNTANT
- Financial operations
- Accounting management
- Financial reports
- Permissions: `invoices.view`, `customers.view`, `inventory.view`, `accounting.manage`, `reports.view`

## Security Measures

### Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character
- bcrypt hashing with 12 salt rounds
- Password change requires current password verification

### Account Protection
- Account lockout after 5 failed attempts
- 30-minute lockout duration
- Failed attempt tracking
- IP-based monitoring

### Token Security
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Automatic token rotation
- Secure token storage in Redis

### Session Security
- Device fingerprinting
- IP address tracking
- Session timeout
- Maximum concurrent sessions
- Suspicious activity detection

## Configuration

### Environment Variables
```bash
# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""
```

## Usage Examples

### User Registration
```typescript
const response = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
    name: 'John Doe',
    tenantId: 'tenant-123',
    role: 'TENANT_EMPLOYEE'
  })
});
```

### User Login
```typescript
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
    twoFactorCode: '123456' // Optional, required if 2FA enabled
  })
});
```

### Protected Request
```typescript
const response = await fetch('/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-Tenant-ID': 'tenant-123'
  }
});
```

### RBAC Middleware Usage
```typescript
// Require specific permission
app.get('/api/v1/invoices', 
  authMiddleware, 
  requirePermission('invoices.view'), 
  getInvoices
);

// Require specific role
app.post('/api/v1/users', 
  authMiddleware, 
  requireRole(['TENANT_ADMIN', 'SUPER_ADMIN']), 
  createUser
);

// Require tenant admin or higher
app.put('/api/v1/settings', 
  authMiddleware, 
  requireTenantAdmin, 
  updateSettings
);
```

## Testing

The authentication system includes comprehensive tests:

### Unit Tests
- AuthService functionality
- RBAC middleware logic
- Session manager operations
- Password hashing and validation

### Integration Tests
- API endpoint testing
- Authentication flows
- Permission enforcement
- Error handling

### Security Tests
- Token validation
- Permission bypass attempts
- Rate limiting
- Account lockout

## Monitoring and Logging

### Audit Events
- User registration
- Login/logout events
- Password changes
- 2FA setup/disable
- Permission changes
- Failed authentication attempts

### Metrics
- Active sessions count
- Login success/failure rates
- 2FA adoption rate
- Device distribution
- Geographic distribution

## Future Enhancements

### Planned Features
- [ ] OAuth2/OIDC integration
- [ ] Biometric authentication
- [ ] Advanced fraud detection
- [ ] Single Sign-On (SSO)
- [ ] API key management
- [ ] Advanced audit reporting

### Security Improvements
- [ ] Hardware security key support
- [ ] Advanced threat detection
- [ ] Behavioral analysis
- [ ] Risk-based authentication
- [ ] Certificate-based authentication

## Troubleshooting

### Common Issues

1. **Token Expired**
   - Use refresh token to get new access token
   - Check token expiration settings

2. **Account Locked**
   - Wait for lockout period to expire
   - Admin can manually unlock account

3. **2FA Issues**
   - Verify time synchronization
   - Check backup codes
   - Disable and re-enable 2FA if needed

4. **Permission Denied**
   - Verify user role and permissions
   - Check tenant isolation
   - Ensure proper middleware order

### Debug Commands
```bash
# Check user sessions
npm run tenant -- sessions list --user-id=user-123

# Unlock user account
npm run tenant -- users unlock --email=user@example.com

# View audit logs
npm run tenant -- audit --user-id=user-123 --limit=50
```

## Conclusion

The authentication and authorization system provides enterprise-grade security features suitable for a multi-tenant SaaS platform. It implements industry best practices for authentication, authorization, and session management while maintaining flexibility for future enhancements.

The system is designed to be:
- **Secure**: Multiple layers of security protection
- **Scalable**: Redis-based session management
- **Flexible**: Configurable roles and permissions
- **Auditable**: Comprehensive logging and monitoring
- **User-friendly**: Smooth authentication experience

All components are thoroughly tested and ready for production deployment.