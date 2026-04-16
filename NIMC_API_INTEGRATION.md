# NIMC API Integration Documentation

## Overview

This document provides comprehensive documentation for the NIMC (National Identity Management Commission) API integration in the TUGGA IT SOLUTIONS NIN Portal application.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Setup & Configuration](#setup--configuration)
3. [API Modules](#api-modules)
4. [Usage Examples](#usage-examples)
5. [Pricing Structure](#pricing-structure)
6. [Error Handling](#error-handling)
7. [Testing](#testing)
8. [Security Considerations](#security-considerations)

---

## Architecture

### Module Structure

```
tugga-nin/js/
├── nimc-api.js           # Core NIMC API wrapper
├── nimc-integration.js   # Integration layer with TUGGA app
└── app.js                # Main application logic
```

### Data Flow

```
User Interface
    ↓
NIMCIntegration (nimc-integration.js)
    ↓
NIMC_API (nimc-api.js)
    ↓
Third-Party Provider API (VerifyMe/QoreID)
    ↓
NIMC Database
```

---

## Setup & Configuration

### 1. Include Required Scripts

Add these scripts to your HTML files in order:

```html
<!-- Core app functions -->
<script src="../js/app.js"></script>

<!-- NIMC API wrapper -->
<script src="../js/nimc-api.js"></script>

<!-- NIMC integration layer -->
<script src="../js/nimc-integration.js"></script>
```

### 2. Admin Configuration

Administrators must configure the NIMC API settings:

```javascript
// Example configuration
const config = {
  apiKey: 'your-api-key-here',
  provider: 'verifyme',  // Options: 'verifyme', 'qoreid'
  testMode: false,        // Set to true for testing
  enabled: true
};

NIMCIntegration.saveConfig(config);
```

### 3. Supported Providers

#### VerifyMe
- **Base URL**: `https://vapi.verifyme.ng/v1`
- **Documentation**: https://docs.verifyme.ng
- **Test NIN**: `10000000001`
- **Test Person**: John Doe (DOB: 04-04-1944)

#### QoreID
- **Base URL**: `https://api.qoreid.com/v1/ng`
- **Documentation**: https://docs.qoreid.com
- **Features**: Advanced matching, insights, field-level verification

---

## API Modules

### NIMC_API Module (nimc-api.js)

Core API wrapper providing direct access to NIMC verification services.

#### Key Methods

##### 1. Initialize API
```javascript
NIMC_API.init(apiKey, provider, testMode);
```

##### 2. Verify NIN
```javascript
const result = await NIMC_API.verifyNIN(nin, {
  firstname: 'John',
  lastname: 'Doe',
  dob: '1990-01-15',
  phone: '08012345678',
  email: 'john@example.com',
  gender: 'male'
});
```

**Response Structure:**
```javascript
{
  success: true,
  data: {
    nin: '12345678901',
    firstname: 'John',
    lastname: 'Doe',
    middlename: 'James',
    phone: '08012345678',
    gender: 'male',
    birthdate: '15-01-1990',
    photo: 'base64-encoded-image',
    address: '123 Main St, Lagos'
  },
  fieldMatches: {
    firstname: true,
    lastname: true,
    dob: true
  },
  verified: true
}
```

##### 3. Verify with Phone Number
```javascript
const result = await NIMC_API.verifyNINWithPhone('08012345678');
```

##### 4. Verify Virtual NIN (vNIN)
```javascript
const result = await NIMC_API.verifyVirtualNIN(vnin, {
  firstname: 'John',
  lastname: 'Doe',
  dob: '1990-01-15'
});
```

##### 5. Bio-Data Verification
```javascript
const result = await NIMC_API.verifyBioData(nin, {
  firstname: 'John',
  lastname: 'Doe',
  middlename: 'James',
  dob: '1990-01-15',
  phone: '08012345678',
  email: 'john@example.com',
  gender: 'male',
  address: '123 Main St'
});
```

##### 6. Generate Verification Slip
```javascript
const slip = NIMC_API.generateVerificationSlip(verificationData, 'premium');
```

**Slip Types:**
- `normal` - Basic verification slip
- `premium` - Enhanced slip with additional info
- `standard` - Standard format slip
- `verification_info` - Detailed verification information

---

### NIMCIntegration Module (nimc-integration.js)

High-level integration layer that handles wallet management, transactions, and slip storage.

#### Key Methods

##### 1. Verify NIN with Slip
```javascript
const result = await NIMCIntegration.verifyNINWithSlip(
  '12345678901',
  {
    firstname: 'John',
    lastname: 'Doe',
    dob: '1990-01-15'
  },
  'premium'  // Slip type
);
```

**Response:**
```javascript
{
  success: true,
  slip: { /* slip object */ },
  transaction: { /* transaction record */ },
  verification: { /* verification result */ }
}
```

##### 2. Verify with Phone
```javascript
const result = await NIMCIntegration.verifyWithPhone('08012345678', 'normal');
```

##### 3. Verify Bio-Data
```javascript
const result = await NIMCIntegration.verifyBioData(nin, bioData, 'premium');
```

##### 4. Verify Virtual NIN
```javascript
const result = await NIMCIntegration.verifyVNIN(vnin, personalDetails);
```

##### 5. Slip Management
```javascript
// Get user's slips
const slips = NIMCIntegration.getUserSlips(userId);

// Get slip by transaction ID
const slip = NIMCIntegration.getSlipByTransaction(transactionId);

// Print slip
NIMCIntegration.printSlip(slip);

// Download as PDF
NIMCIntegration.downloadSlipAsPDF(slip);
```

---

## Usage Examples

### Example 1: Basic NIN Verification

```javascript
async function verifyUserNIN() {
  const nin = document.getElementById('nin-input').value;
  const firstname = document.getElementById('firstname').value;
  const lastname = document.getElementById('lastname').value;
  const dob = document.getElementById('dob').value;

  // Show loader
  showLoader();

  try {
    const result = await NIMCIntegration.verifyNINWithSlip(
      nin,
      { firstname, lastname, dob },
      'normal'
    );

    hideLoader();

    if (result.success) {
      // Display slip
      displaySlip(result.slip);
      toast('Verification successful!', 'success');
    } else {
      toast(result.error, 'error');
    }
  } catch (error) {
    hideLoader();
    toast('Verification failed', 'error');
  }
}
```

### Example 2: Phone Number Verification

```javascript
async function verifyByPhone() {
  const phone = document.getElementById('phone-input').value;

  if (!NIMC_API.validatePhone(phone)) {
    toast('Invalid phone number format', 'error');
    return;
  }

  showLoader();

  const result = await NIMCIntegration.verifyWithPhone(phone, 'normal');

  hideLoader();

  if (result.success) {
    displayVerificationResult(result.verification.data);
    toast('Phone verification successful!', 'success');
  } else {
    toast(result.error, 'error');
  }
}
```

### Example 3: Bio-Data Verification with Match Score

```javascript
async function verifyBioDataComplete() {
  const bioData = {
    firstname: document.getElementById('firstname').value,
    lastname: document.getElementById('lastname').value,
    middlename: document.getElementById('middlename').value,
    dob: document.getElementById('dob').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    gender: document.getElementById('gender').value
  };

  const nin = document.getElementById('nin').value;

  showLoader();

  const result = await NIMCIntegration.verifyBioData(nin, bioData, 'premium');

  hideLoader();

  if (result.success) {
    const matchScore = result.verification.matchScore;
    const matchLevel = result.verification.matchLevel;

    displayMatchScore(matchScore, matchLevel);
    displaySlip(result.slip);

    if (matchScore === 100) {
      toast('Perfect match! All details verified.', 'success');
    } else if (matchScore >= 80) {
      toast(`High match (${matchScore}%). Most details verified.`, 'success');
    } else {
      toast(`Partial match (${matchScore}%). Some details differ.`, 'warning');
    }
  } else {
    toast(result.error, 'error');
  }
}
```

### Example 4: Admin Configuration

```javascript
function saveNIMCConfig() {
  const config = {
    apiKey: document.getElementById('nimc-api-key').value,
    provider: document.getElementById('nimc-provider').value,
    testMode: document.getElementById('nimc-test-mode').checked,
    enabled: document.getElementById('nimc-enabled').checked
  };

  NIMCIntegration.saveConfig(config);
  toast('NIMC configuration saved successfully!', 'success');
}
```

---

## Pricing Structure

### Default Pricing (in Naira)

#### NIN Verification Slips
| Slip Type | Price |
|-----------|-------|
| Normal Slip | ₦200 |
| Verification Info Slip | ₦250 |
| Premium Slip | ₦350 |
| Standard Slip | ₦200 |

#### Phone Number Verification
| Slip Type | Price |
|-----------|-------|
| Normal Slip | ₦150 |
| Verification Info Slip | ₦200 |
| Premium Slip | ₦300 |
| Standard Slip | ₦150 |

#### Bio-Data Verification
| Slip Type | Price |
|-----------|-------|
| Normal Slip | ₦300 |
| Verification Info Slip | ₦350 |
| Premium Slip | ₦450 |
| Standard Slip | ₦300 |

#### Fingerprint Verification
| Slip Type | Price |
|-----------|-------|
| Normal Slip | ₦200 |
| Verification Info Slip | ₦250 |
| Premium Slip | ₦350 |
| Standard Slip | ₦200 |

#### Other Services
| Service | Price |
|---------|-------|
| Virtual NIN (vNIN) | ₦250 |

### Updating Pricing

Administrators can update pricing through the admin panel:

```javascript
const pricing = {
  nin_normal: 200,
  nin_premium: 350,
  phone_normal: 150,
  // ... other prices
};

localStorage.setItem('tugga_pricing', JSON.stringify(pricing));
```

---

## Error Handling

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_NIN_FORMAT` | NIN is not 11 digits | Validate input format |
| `INVALID_PHONE_FORMAT` | Phone is not 11 digits starting with 0 | Validate phone format |
| `INVALID_VNIN_FORMAT` | vNIN is not 16 characters | Check vNIN length |
| `NOT_FOUND_ERROR` | NIN not found in database | Verify NIN is correct |
| `MISSING_REQUIRED_FIELDS` | Required fields missing | Provide firstname and lastname |
| `INSUFFICIENT_FUNDS` | Wallet balance too low | Fund wallet |
| `NETWORK_ERROR` | API request failed | Check internet connection |
| `PARSE_ERROR` | Response format unknown | Contact support |

### Error Handling Pattern

```javascript
async function handleVerification() {
  try {
    const result = await NIMCIntegration.verifyNINWithSlip(nin, details, slipType);

    if (!result.success) {
      switch (result.code) {
        case 'INSUFFICIENT_FUNDS':
          showFundWalletModal(result.required, result.available);
          break;
        case 'NOT_FOUND_ERROR':
          toast('NIN not found. Please verify the number.', 'error');
          break;
        case 'INVALID_NIN_FORMAT':
          toast('Invalid NIN format. Must be 11 digits.', 'error');
          break;
        default:
          toast(result.error || 'Verification failed', 'error');
      }
      return;
    }

    // Success handling
    displaySlip(result.slip);
    toast('Verification successful!', 'success');

  } catch (error) {
    console.error('Verification error:', error);
    toast('An unexpected error occurred', 'error');
  }
}
```

---

## Testing

### Test Mode

Enable test mode for development:

```javascript
NIMC_API.init('test-key', 'verifyme', true);
```

### Test Credentials

**Test NIN**: `10000000001`

**Test Person**:
- First Name: John
- Last Name: Doe
- DOB: 04-04-1944
- Phone: 08066676673

### Test Verification

```javascript
const result = await NIMC_API.verifyNIN('10000000001', {
  firstname: 'John',
  lastname: 'Doe',
  dob: '04-04-1944'
});

// Should return success with matching data
console.log(result.success); // true
console.log(result.fieldMatches); // { firstname: true, lastname: true, dob: true }
```

### Simulation Mode

For offline testing without API calls:

```javascript
const result = await NIMC_API.simulateVerification('10000000001', {
  firstname: 'John',
  lastname: 'Doe'
});
```

---

## Security Considerations

### 1. API Key Protection

- **Never expose API keys in client-side code**
- Store API keys in admin-only accessible storage
- Use environment variables for production keys
- Rotate keys regularly

### 2. Data Privacy

- NIN data is sensitive personal information
- Implement proper access controls
- Log all verification attempts
- Comply with NIMC data protection guidelines

### 3. Wallet Security

- Validate wallet balance before deductions
- Create transaction records for all operations
- Implement refund mechanisms for failed verifications
- Monitor for suspicious activity

### 4. Input Validation

Always validate user inputs:

```javascript
// Validate NIN
if (!NIMC_API.validateNIN(nin)) {
  return { success: false, error: 'Invalid NIN format' };
}

// Validate phone
if (!NIMC_API.validatePhone(phone)) {
  return { success: false, error: 'Invalid phone format' };
}

// Validate date
if (!NIMC_API.validateDate(dob)) {
  return { success: false, error: 'Invalid date format' };
}
```

### 5. Rate Limiting

Implement rate limiting to prevent abuse:

```javascript
const rateLimiter = {
  attempts: {},
  maxAttempts: 5,
  windowMs: 60000, // 1 minute

  check(userId) {
    const now = Date.now();
    const userAttempts = this.attempts[userId] || [];
    
    // Remove old attempts
    const recentAttempts = userAttempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false; // Rate limit exceeded
    }
    
    recentAttempts.push(now);
    this.attempts[userId] = recentAttempts;
    return true;
  }
};
```

---

## Support & Resources

### Official Documentation
- NIMC Official: https://nimc.gov.ng
- VerifyMe Docs: https://docs.verifyme.ng
- QoreID Docs: https://docs.qoreid.com

### Contact
- **TUGGA IT SOLUTIONS Support**: support@tugga.com
- **NIMC Helpline**: Contact NIMC directly for API access

### License
This integration is proprietary to TUGGA IT SOLUTIONS. Unauthorized use is prohibited.

---

## Changelog

### Version 1.0.0 (2025-01-XX)
- Initial NIMC API integration
- Support for VerifyMe and QoreID providers
- NIN, Phone, vNIN, and Bio-Data verification
- Slip generation and management
- Wallet integration
- Test mode support

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Author**: TUGGA IT SOLUTIONS Development Team
