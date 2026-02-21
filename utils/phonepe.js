const crypto = require('crypto');
const axios = require('axios');

class PhonePeService {
    constructor() {
        this.merchantId = process.env.PHONEPE_MERCHANT_ID;
        this.saltKey = process.env.PHONEPE_SALT_KEY;
        this.saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
        this.env = process.env.PHONEPE_ENV || 'UAT'; // 'PROD' or 'UAT'

        this.baseUrl = this.env === 'PROD'
            ? 'https://api.phonepe.com/apis/hermes'
            : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
    }

    /**
     * Generate checksum for a given payload and endpoint
     */
    generateChecksum(payload, endpoint) {
        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const stringToMash = base64Payload + endpoint + this.saltKey;
        const sha256 = crypto.createHash('sha256').update(stringToMash).digest('hex');
        return `${sha256}###${this.saltIndex}`;
    }

    /**
     * Generate checksum for Status check (No payload, just endpoint)
     */
    generateStatusChecksum(merchantTransactionId) {
        const endpoint = `/pg/v1/status/${this.merchantId}/${merchantTransactionId}`;
        const stringToMash = endpoint + this.saltKey;
        const sha256 = crypto.createHash('sha256').update(stringToMash).digest('hex');
        return `${sha256}###${this.saltIndex}`;
    }

    /**
     * Check status of a transaction
     */
    async checkStatus(merchantTransactionId) {
        if (!this.merchantId || !this.saltKey) {
            console.warn('PhonePe credentials not configured. Simulating successful check for testing.');
            return {
                success: true,
                code: 'PAYMENT_SUCCESS',
                data: {
                    merchantId: this.merchantId || 'TEST_MERCHANT',
                    merchantTransactionId,
                    transactionId: `TEST_${Date.now()}`,
                    amount: 100, // Dummy
                    state: 'COMPLETED',
                    paymentInstrument: { type: 'TEST' }
                }
            };
        }

        try {
            const checksum = this.generateStatusChecksum(merchantTransactionId);
            const url = `${this.baseUrl}/pg/v1/status/${this.merchantId}/${merchantTransactionId}`;

            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': checksum,
                    'X-MERCHANT-ID': this.merchantId
                }
            });

            return response.data;
        } catch (error) {
            console.error('PhonePe Status Check Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }
}

module.exports = new PhonePeService();
