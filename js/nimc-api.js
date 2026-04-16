// ══════════════════════════════════════════════════════════════════════════════
// NIMC API Integration Module
// ══════════════════════════════════════════════════════════════════════════════
// This module provides integration with NIMC verification services through
// licensed third-party providers (VerifyMe, QoreID, etc.)
// ══════════════════════════════════════════════════════════════════════════════

const NIMC_API = {
  // Configuration
  config: {
    provider: 'verifyme', // Options: 'verifyme', 'qoreid', 'custom'
    apiKey: '', // Set via admin settings
    baseUrl: {
      verifyme: 'https://vapi.verifyme.ng/v1',
      qoreid: 'https://api.qoreid.com/v1/ng',
      custom: '' // For direct NIMC integration
    },
    testMode: true, // Toggle for test/production
    testNIN: '10000000001', // Test NIN for sandbox
    testPerson: {
      firstname: 'John',
      lastname: 'Doe',
      dob: '04-04-1944',
      phone: '08066676673'
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Initialize API Configuration
  // ──────────────────────────────────────────────────────────────────────────
  init(apiKey, provider = 'verifyme', testMode = true) {
    this.config.apiKey = apiKey;
    this.config.provider = provider;
    this.config.testMode = testMode;
    console.log(`NIMC API initialized: Provider=${provider}, TestMode=${testMode}`);
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Get API Base URL
  // ──────────────────────────────────────────────────────────────────────────
  getBaseUrl() {
    return this.config.baseUrl[this.config.provider] || this.config.baseUrl.verifyme;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Get Authorization Headers
  // ──────────────────────────────────────────────────────────────────────────
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  },

  // ══════════════════════════════════════════════════════════════════════════
  // NIN VERIFICATION METHODS
  // ══════════════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Verify NIN with Personal Details
  // ──────────────────────────────────────────────────────────────────────────
  async verifyNIN(nin, personalDetails) {
    try {
      const { firstname, lastname, dob, middlename, phone, email, gender } = personalDetails;

      // Validate NIN format
      if (!this.validateNIN(nin)) {
        return {
          success: false,
          error: 'Invalid NIN format. NIN must be 11 digits.',
          code: 'INVALID_NIN_FORMAT'
        };
      }

      // Validate required fields
      if (!firstname || !lastname) {
        return {
          success: false,
          error: 'First name and last name are required.',
          code: 'MISSING_REQUIRED_FIELDS'
        };
      }

      // Build request based on provider
      let endpoint, requestBody;

      if (this.config.provider === 'verifyme') {
        endpoint = `${this.getBaseUrl()}/verifications/identities/nin/${nin}`;
        requestBody = {
          firstname,
          lastname,
          dob: dob || undefined
        };
      } else if (this.config.provider === 'qoreid') {
        endpoint = `${this.getBaseUrl()}/identities/nin/${nin}`;
        requestBody = {
          firstname,
          lastname,
          middlename: middlename || undefined,
          dob: dob || undefined,
          phone: phone || undefined,
          email: email || undefined,
          gender: gender || undefined
        };
      }

      // Make API request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      // Parse response based on provider
      return this.parseVerificationResponse(data, this.config.provider);

    } catch (error) {
      console.error('NIN Verification Error:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
        code: 'NETWORK_ERROR'
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Verify NIN with Phone Number
  // ──────────────────────────────────────────────────────────────────────────
  async verifyNINWithPhone(phone) {
    try {
      // Validate phone format
      if (!this.validatePhone(phone)) {
        return {
          success: false,
          error: 'Invalid phone number format. Must be 11 digits starting with 0.',
          code: 'INVALID_PHONE_FORMAT'
        };
      }

      const endpoint = `${this.getBaseUrl()}/verifications/identities/nin_phone/${phone}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders()
      });

      const data = await response.json();
      return this.parseVerificationResponse(data, this.config.provider);

    } catch (error) {
      console.error('Phone Verification Error:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
        code: 'NETWORK_ERROR'
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Verify Virtual NIN (vNIN)
  // ──────────────────────────────────────────────────────────────────────────
  async verifyVirtualNIN(vnin, personalDetails) {
    try {
      const { firstname, lastname, dob } = personalDetails;

      // Validate vNIN format (16 characters)
      if (!vnin || vnin.length !== 16) {
        return {
          success: false,
          error: 'Invalid vNIN format. vNIN must be 16 characters.',
          code: 'INVALID_VNIN_FORMAT'
        };
      }

      const endpoint = `${this.getBaseUrl()}/verifications/identities/vnin/${vnin}`;
      const requestBody = { firstname, lastname, dob };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      return this.parseVerificationResponse(data, this.config.provider);

    } catch (error) {
      console.error('vNIN Verification Error:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
        code: 'NETWORK_ERROR'
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Bio-Data Verification (Advanced Matching)
  // ──────────────────────────────────────────────────────────────────────────
  async verifyBioData(nin, bioData) {
    try {
      const {
        firstname,
        lastname,
        middlename,
        dob,
        phone,
        email,
        gender,
        address
      } = bioData;

      // Comprehensive validation
      const result = await this.verifyNIN(nin, {
        firstname,
        lastname,
        middlename,
        dob,
        phone,
        email,
        gender
      });

      if (result.success) {
        // Calculate match score
        result.matchScore = this.calculateMatchScore(result.fieldMatches);
        result.matchLevel = this.getMatchLevel(result.matchScore);
      }

      return result;

    } catch (error) {
      console.error('Bio-Data Verification Error:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
        code: 'NETWORK_ERROR'
      };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RESPONSE PARSING & FORMATTING
  // ══════════════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────────────────
  // Parse API Response
  // ──────────────────────────────────────────────────────────────────────────
  parseVerificationResponse(data, provider) {
    // Handle error responses
    if (data.code === 'NOT_FOUND_ERROR' || data.error) {
      return {
        success: false,
        error: data.message || data.error || 'NIN not found',
        code: data.code || 'NOT_FOUND'
      };
    }

    // Parse VerifyMe response
    if (provider === 'verifyme' && data.status === 'success') {
      return {
        success: true,
        data: {
          nin: data.data.nin,
          firstname: data.data.firstname,
          lastname: data.data.lastname,
          middlename: data.data.middlename,
          phone: data.data.phone,
          gender: data.data.gender,
          birthdate: data.data.birthdate,
          photo: data.data.photo,
          address: data.data.address || null
        },
        fieldMatches: data.data.fieldMatches || {},
        verified: true
      };
    }

    // Parse QoreID response
    if (provider === 'qoreid' && data.status?.state === 'complete') {
      return {
        success: true,
        data: {
          nin: data.nin.nin,
          firstname: data.nin.firstname,
          lastname: data.nin.lastname,
          middlename: data.nin.middlename,
          phone: data.nin.phone,
          gender: data.nin.gender,
          birthdate: data.nin.birthdate,
          photo: data.nin.photo,
          address: data.nin.address
        },
        fieldMatches: data.summary?.nin_check?.fieldMatches || {},
        matchStatus: data.summary?.nin_check?.status,
        verified: data.status.status === 'verified',
        insights: data.insight || []
      };
    }

    // Unknown response format
    return {
      success: false,
      error: 'Unknown response format',
      code: 'PARSE_ERROR',
      rawData: data
    };
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Calculate Match Score (0-100)
  // ──────────────────────────────────────────────────────────────────────────
  calculateMatchScore(fieldMatches) {
    if (!fieldMatches || typeof fieldMatches !== 'object') return 0;

    const fields = Object.keys(fieldMatches);
    if (fields.length === 0) return 0;

    const matchedFields = fields.filter(field => fieldMatches[field] === true);
    return Math.round((matchedFields.length / fields.length) * 100);
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Get Match Level
  // ──────────────────────────────────────────────────────────────────────────
  getMatchLevel(score) {
    if (score === 100) return 'EXACT_MATCH';
    if (score >= 80) return 'HIGH_MATCH';
    if (score >= 60) return 'PARTIAL_MATCH';
    if (score >= 40) return 'LOW_MATCH';
    return 'NO_MATCH';
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VALIDATION HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────────────────
  // Validate NIN Format
  // ──────────────────────────────────────────────────────────────────────────
  validateNIN(nin) {
    if (!nin) return false;
    const ninStr = String(nin).trim();
    return /^\d{11}$/.test(ninStr);
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Validate Phone Format
  // ──────────────────────────────────────────────────────────────────────────
  validatePhone(phone) {
    if (!phone) return false;
    const phoneStr = String(phone).trim();
    return /^0\d{10}$/.test(phoneStr);
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Validate Date Format (DD-MM-YYYY or YYYY-MM-DD)
  // ──────────────────────────────────────────────────────────────────────────
  validateDate(date) {
    if (!date) return false;
    return /^\d{2}-\d{2}-\d{4}$/.test(date) || /^\d{4}-\d{2}-\d{2}$/.test(date);
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Format Date to API Format (YYYY-MM-DD)
  // ──────────────────────────────────────────────────────────────────────────
  formatDate(date) {
    if (!date) return null;
    
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    
    // Convert DD-MM-YYYY to YYYY-MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      const [day, month, year] = date.split('-');
      return `${year}-${month}-${day}`;
    }
    
    return null;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SLIP GENERATION
  // ══════════════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────────────────
  // Generate Verification Slip
  // ──────────────────────────────────────────────────────────────────────────
  generateVerificationSlip(verificationData, slipType = 'normal') {
    const { data, fieldMatches, verified } = verificationData;

    const slip = {
      slipType: slipType, // normal, premium, standard, verification_info
      timestamp: new Date().toISOString(),
      verified: verified,
      nin: data.nin,
      personalInfo: {
        fullName: `${data.firstname} ${data.middlename || ''} ${data.lastname}`.trim(),
        firstname: data.firstname,
        lastname: data.lastname,
        middlename: data.middlename,
        dateOfBirth: data.birthdate,
        gender: data.gender,
        phone: data.phone,
        address: data.address
      },
      photo: data.photo,
      fieldMatches: fieldMatches,
      matchScore: this.calculateMatchScore(fieldMatches),
      matchLevel: this.getMatchLevel(this.calculateMatchScore(fieldMatches)),
      slipId: 'SLIP-' + Date.now(),
      generatedBy: 'TUGGA IT SOLUTIONS'
    };

    // Add additional info for premium/verification_info slips
    if (slipType === 'premium' || slipType === 'verification_info') {
      slip.additionalInfo = {
        verificationMethod: 'NIN',
        apiProvider: this.config.provider,
        verificationStatus: verified ? 'VERIFIED' : 'UNVERIFIED'
      };
    }

    return slip;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TEST MODE HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────────────────
  // Simulate Test Verification (for development)
  // ──────────────────────────────────────────────────────────────────────────
  async simulateVerification(nin, personalDetails) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const isTestNIN = nin === this.config.testNIN;
    const matchesTestPerson = 
      personalDetails.firstname?.toLowerCase() === this.config.testPerson.firstname.toLowerCase() &&
      personalDetails.lastname?.toLowerCase() === this.config.testPerson.lastname.toLowerCase();

    if (isTestNIN && matchesTestPerson) {
      return {
        success: true,
        data: {
          nin: this.config.testNIN,
          firstname: this.config.testPerson.firstname,
          lastname: this.config.testPerson.lastname,
          middlename: 'Jane',
          phone: this.config.testPerson.phone,
          gender: 'male',
          birthdate: this.config.testPerson.dob,
          photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          address: '123 Test Street, Lagos, Nigeria'
        },
        fieldMatches: {
          firstname: true,
          lastname: true,
          dob: personalDetails.dob === this.config.testPerson.dob
        },
        verified: true
      };
    }

    return {
      success: false,
      error: 'NIN not found or details do not match',
      code: 'NOT_FOUND_ERROR'
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NIMC_API;
}
