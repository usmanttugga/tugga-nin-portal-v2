// ══════════════════════════════════════════════════════════════════════════════
// NIMC Integration Layer for GET ID FIX
// ══════════════════════════════════════════════════════════════════════════════
// This module connects the NIMC API with the TUGGA app functionality
// ══════════════════════════════════════════════════════════════════════════════

const NIMCIntegration = {
  // ──────────────────────────────────────────────────────────────────────────
  // Initialize NIMC Integration
  // ──────────────────────────────────────────────────────────────────────────
  init() {
    // Load API configuration from localStorage
    const config = this.loadConfig();
    
    if (config.apiKey) {
      NIMC_API.init(config.apiKey, config.provider, config.testMode);
      console.log('NIMC Integration initialized');
    } else {
      console.warn('NIMC API key not configured. Using test mode.');
      NIMC_API.init('test-key', 'verifyme', true);
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Load Configuration
  // ──────────────────────────────────────────────────────────────────────────
  loadConfig() {
    const defaultConfig = {
      apiKey: '',
      provider: 'verifyme',
      testMode: true,
      enabled: false
    };

    const stored = localStorage.getItem('nimc_config');
    return stored ? { ...defaultConfig, ...JSON.parse(stored) } : defaultConfig;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Save Configuration (Admin only)
  // ──────────────────────────────────────────────────────────────────────────
  saveConfig(config) {
    localStorage.setItem('nimc_config', JSON.stringify(config));
    this.init(); // Reinitialize with new config
  },

  // ══════════════════════════════════════════════════════════════════════════
  // NIN VERIFICATION SERVICES
  // ══════════════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────────────────
  // Verify NIN with Slip Generation
  // ──────────────────────────────────────────────────────────────────────────
  async verifyNINWithSlip(nin, personalDetails, slipType = 'normal') {
    try {
      const user = getCurrentUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check wallet balance
      const pricing = this.getPricing();
      const cost = pricing[`nin_${slipType}`] || 200;

      if (user.wallet < cost) {
        return {
          success: false,
          error: 'Insufficient wallet balance',
          code: 'INSUFFICIENT_FUNDS',
          required: cost,
          available: user.wallet
        };
      }

      // Perform verification
      const result = await NIMC_API.verifyNIN(nin, personalDetails);

      if (!result.success) {
        // Create failed transaction record
        addTransaction(
          user.id,
          `NIN Verification (${slipType})`,
          `NIN: ${nin} - Failed: ${result.error}`,
          cost,
          'failed'
        );

        return result;
      }

      // Generate slip
      const slip = NIMC_API.generateVerificationSlip(result, slipType);

      // Deduct from wallet
      this.deductFromWallet(user.id, cost);

      // Create successful transaction
      const txn = addTransaction(
        user.id,
        `NIN Verification (${slipType})`,
        `NIN: ${nin} - ${result.data.firstname} ${result.data.lastname}`,
        cost,
        'success'
      );

      // Store slip
      this.storeSlip(user.id, txn.id, slip);

      return {
        success: true,
        slip: slip,
        transaction: txn,
        verification: result
      };

    } catch (error) {
      console.error('Verification Error:', error);
      return {
        success: false,
        error: error.message || 'Verification failed',
        code: 'VERIFICATION_ERROR'
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Verify with Phone Number
  // ──────────────────────────────────────────────────────────────────────────
  async verifyWithPhone(phone, slipType = 'normal') {
    try {
      const user = getCurrentUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const pricing = this.getPricing();
      const cost = pricing[`phone_${slipType}`] || 150;

      if (user.wallet < cost) {
        return {
          success: false,
          error: 'Insufficient wallet balance',
          code: 'INSUFFICIENT_FUNDS'
        };
      }

      const result = await NIMC_API.verifyNINWithPhone(phone);

      if (!result.success) {
        addTransaction(
          user.id,
          `Phone Verification (${slipType})`,
          `Phone: ${phone} - Failed: ${result.error}`,
          cost,
          'failed'
        );
        return result;
      }

      const slip = NIMC_API.generateVerificationSlip(result, slipType);
      this.deductFromWallet(user.id, cost);

      const txn = addTransaction(
        user.id,
        `Phone Verification (${slipType})`,
        `Phone: ${phone} - ${result.data.firstname} ${result.data.lastname}`,
        cost,
        'success'
      );

      this.storeSlip(user.id, txn.id, slip);

      return {
        success: true,
        slip: slip,
        transaction: txn,
        verification: result
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Verification failed'
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Verify Bio-Data
  // ──────────────────────────────────────────────────────────────────────────
  async verifyBioData(nin, bioData, slipType = 'normal') {
    try {
      const user = getCurrentUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const pricing = this.getPricing();
      const cost = pricing[`bio_${slipType}`] || 300;

      if (user.wallet < cost) {
        return {
          success: false,
          error: 'Insufficient wallet balance',
          code: 'INSUFFICIENT_FUNDS'
        };
      }

      const result = await NIMC_API.verifyBioData(nin, bioData);

      if (!result.success) {
        addTransaction(
          user.id,
          `Bio-Data Verification (${slipType})`,
          `NIN: ${nin} - Failed: ${result.error}`,
          cost,
          'failed'
        );
        return result;
      }

      const slip = NIMC_API.generateVerificationSlip(result, slipType);
      this.deductFromWallet(user.id, cost);

      const txn = addTransaction(
        user.id,
        `Bio-Data Verification (${slipType})`,
        `NIN: ${nin} - Match Score: ${result.matchScore}%`,
        cost,
        'success'
      );

      this.storeSlip(user.id, txn.id, slip);

      return {
        success: true,
        slip: slip,
        transaction: txn,
        verification: result
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Verification failed'
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Verify Virtual NIN
  // ──────────────────────────────────────────────────────────────────────────
  async verifyVNIN(vnin, personalDetails) {
    try {
      const user = getCurrentUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const pricing = this.getPricing();
      const cost = pricing.vnin || 250;

      if (user.wallet < cost) {
        return {
          success: false,
          error: 'Insufficient wallet balance',
          code: 'INSUFFICIENT_FUNDS'
        };
      }

      const result = await NIMC_API.verifyVirtualNIN(vnin, personalDetails);

      if (!result.success) {
        addTransaction(
          user.id,
          'VNIN Verification',
          `vNIN: ${vnin} - Failed: ${result.error}`,
          cost,
          'failed'
        );
        return result;
      }

      const slip = NIMC_API.generateVerificationSlip(result, 'vnin');
      this.deductFromWallet(user.id, cost);

      const txn = addTransaction(
        user.id,
        'VNIN Verification',
        `vNIN: ${vnin} - ${result.data.firstname} ${result.data.lastname}`,
        cost,
        'success'
      );

      this.storeSlip(user.id, txn.id, slip);

      return {
        success: true,
        slip: slip,
        transaction: txn,
        verification: result
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Verification failed'
      };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WALLET & TRANSACTION MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────────────────
  // Deduct from Wallet
  // ──────────────────────────────────────────────────────────────────────────
  deductFromWallet(userId, amount) {
    const user = getCurrentUser();
    if (user && user.id === userId) {
      user.wallet -= amount;
      localStorage.setItem('tuggaNinPortalV2_tugga_user', JSON.stringify(user));

      // Update in all users list
      const allUsers = JSON.parse(localStorage.getItem('tuggaNinPortalV2_tugga_all_users') || '[]');
      const userIndex = allUsers.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        allUsers[userIndex].wallet = user.wallet;
        localStorage.setItem('tuggaNinPortalV2_tugga_all_users', JSON.stringify(allUsers));
      }
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Get Pricing
  // ──────────────────────────────────────────────────────────────────────────
  getPricing() {
    const defaultPricing = {
      nin_normal: 200,
      nin_info: 250,
      nin_premium: 350,
      nin_standard: 200,
      phone_normal: 150,
      phone_info: 200,
      phone_premium: 300,
      phone_standard: 150,
      bio_normal: 300,
      bio_info: 350,
      bio_premium: 450,
      bio_standard: 300,
      fp_normal: 200,
      fp_info: 250,
      fp_premium: 350,
      fp_standard: 200,
      vnin: 250
    };

    const stored = localStorage.getItem('tuggaNinPortalV2_tugga_pricing');
    return stored ? { ...defaultPricing, ...JSON.parse(stored) } : defaultPricing;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SLIP MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────────────────
  // Store Slip
  // ──────────────────────────────────────────────────────────────────────────
  storeSlip(userId, transactionId, slip) {
    const slips = JSON.parse(localStorage.getItem('tuggaNinPortalV2_tugga_slips') || '[]');
    slips.push({
      userId,
      transactionId,
      slip,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('tuggaNinPortalV2_tugga_slips', JSON.stringify(slips));
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Get User Slips
  // ──────────────────────────────────────────────────────────────────────────
  getUserSlips(userId) {
    const slips = JSON.parse(localStorage.getItem('tuggaNinPortalV2_tugga_slips') || '[]');
    return slips.filter(s => s.userId === userId);
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Get Slip by Transaction ID
  // ──────────────────────────────────────────────────────────────────────────
  getSlipByTransaction(transactionId) {
    const slips = JSON.parse(localStorage.getItem('tuggaNinPortalV2_tugga_slips') || '[]');
    return slips.find(s => s.transactionId === transactionId);
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Download Slip as PDF (placeholder - requires PDF library)
  // ──────────────────────────────────────────────────────────────────────────
  downloadSlipAsPDF(slip) {
    // This would require a PDF generation library like jsPDF
    // For now, we'll create a printable HTML version
    this.printSlip(slip);
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Print Slip
  // ──────────────────────────────────────────────────────────────────────────
  printSlip(slip) {
    const printWindow = window.open('', '_blank');
    const slipHTML = this.generateSlipHTML(slip);
    
    printWindow.document.write(slipHTML);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Generate Slip HTML
  // ──────────────────────────────────────────────────────────────────────────
  generateSlipHTML(slip) {
    const { personalInfo, photo, fieldMatches, matchScore, slipId, timestamp } = slip.slip || slip;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>NIN Verification Slip - ${slipId}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .slip-container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #047857;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #047857;
            margin: 0;
            font-size: 24px;
          }
          .header p {
            color: #666;
            margin: 5px 0;
          }
          .photo-section {
            text-align: center;
            margin: 20px 0;
          }
          .photo-section img {
            max-width: 200px;
            border: 3px solid #047857;
            border-radius: 10px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          .info-item {
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
          }
          .info-label {
            font-weight: bold;
            color: #047857;
            font-size: 12px;
            text-transform: uppercase;
          }
          .info-value {
            color: #333;
            font-size: 16px;
            margin-top: 5px;
          }
          .match-section {
            margin: 30px 0;
            padding: 20px;
            background: #e8f5e9;
            border-radius: 10px;
          }
          .match-score {
            text-align: center;
            font-size: 48px;
            font-weight: bold;
            color: #047857;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body { background: white; }
            .slip-container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="slip-container">
          <div class="header">
            <h1>🪪 NIN VERIFICATION SLIP</h1>
            <p>GET ID FIX</p>
            <p>Slip ID: ${slipId}</p>
            <p>Generated: ${new Date(timestamp).toLocaleString()}</p>
          </div>

          ${photo ? `
          <div class="photo-section">
            <img src="${photo}" alt="Photo" />
          </div>
          ` : ''}

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Full Name</div>
              <div class="info-value">${personalInfo.fullName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Date of Birth</div>
              <div class="info-value">${personalInfo.dateOfBirth || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Gender</div>
              <div class="info-value">${personalInfo.gender || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Phone Number</div>
              <div class="info-value">${personalInfo.phone || 'N/A'}</div>
            </div>
          </div>

          ${personalInfo.address ? `
          <div class="info-item" style="margin: 15px 0;">
            <div class="info-label">Address</div>
            <div class="info-value">${personalInfo.address}</div>
          </div>
          ` : ''}

          <div class="match-section">
            <h3 style="text-align:center; color:#047857; margin-top:0;">Verification Status</h3>
            <div class="match-score">${matchScore}%</div>
            <p style="text-align:center; color:#666;">Match Score</p>
          </div>

          <div class="footer">
            <p>This is an official verification slip generated by GET ID FIX</p>
            <p>Verified through NIMC Database</p>
            <p>© ${new Date().getFullYear()} GET ID FIX. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
};

// Initialize on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    NIMCIntegration.init();
  });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NIMCIntegration;
}
