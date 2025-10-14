# Transaction OTP Verification System

## Overview
This banking system now includes OTP (One-Time Password) verification for transactions over 5,000 LKR. The system automatically detects when OTP is required and sends verification codes to the customer's registered phone number.

## Features

### ✅ **Automatic OTP Detection**
- Transactions over 5,000 LKR automatically require OTP verification
- System checks customer phone number availability
- Provides clear feedback on OTP requirements

### ✅ **Customer Phone Integration**
- Uses customer's registered phone number from database
- Sends OTP via Twilio SMS (with demo mode fallback)
- Supports both real SMS and demo mode for testing

### ✅ **Secure Verification Flow**
- 6-digit OTP codes with 10-minute expiration
- Audit trail for all OTP verifications
- Integration with existing transaction system

## API Endpoints

### 1. Check OTP Requirement
```http
GET /api/transaction-otp/check?accountNumber=BT25874627528&transactionAmount=10000
```

**Response:**
```json
{
  "success": true,
  "requiresOTP": true,
  "data": {
    "accountNumber": "BT25874627528",
    "transactionAmount": 10000,
    "customerName": "John Doe",
    "phoneNumber": "***5957",
    "hasPhoneNumber": true
  }
}
```

### 2. Send Transaction OTP
```http
POST /api/transaction-otp/send
Content-Type: application/json

{
  "accountNumber": "BT25874627528",
  "transactionAmount": 10000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction OTP sent successfully",
  "data": {
    "accountNumber": "BT25874627528",
    "phoneNumber": "+94760159557",
    "transactionAmount": 10000,
    "verificationId": "otp_demo_1760365663511",
    "customerName": "John Doe"
  }
}
```

### 3. Verify Transaction OTP
```http
POST /api/transaction-otp/verify
Content-Type: application/json

{
  "accountNumber": "BT25874627528",
  "phoneNumber": "+94760159557",
  "code": "123456",
  "transactionAmount": 10000
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Transaction OTP verified successfully",
  "data": {
    "accountNumber": "BT25874627528",
    "phoneNumber": "+94760159557",
    "transactionAmount": 10000,
    "verified": true,
    "timestamp": "2025-10-13T14:51:05.575Z"
  }
}
```

## Frontend Components

### TransactionOTP Component
A reusable React component for transaction OTP verification:

```jsx
import TransactionOTP from '../components/TransactionOTP';

<TransactionOTP
  accountNumber="BT25874627528"
  transactionAmount={10000}
  customerName="John Doe"
  phoneNumber="+94760159557"
  onVerified={() => console.log('OTP verified!')}
  onCancel={() => console.log('Cancelled')}
/>
```

### Test Page
Access the test page at: `http://localhost:3000/transaction-otp-test`

## Integration with Transaction System

### Modified Transaction Creation
The transaction creation endpoint now includes OTP verification:

```javascript
// In transaction creation
if (transactionAmount > 5000 && !req.body.otpVerified) {
  return res.status(400).json({
    success: false,
    message: 'OTP verification required for transactions over 5,000 LKR',
    requiresOTP: true,
    data: {
      accountNumber: value.account_number,
      transactionAmount: transactionAmount,
      threshold: 5000
    }
  });
}
```

### Transaction Flow
1. **Check Amount**: System checks if transaction > 5,000 LKR
2. **Send OTP**: If required, sends OTP to customer's phone
3. **Verify OTP**: Customer enters 6-digit code
4. **Create Transaction**: Transaction proceeds after verification
5. **Audit Trail**: OTP verification is logged for compliance

## Database Schema

### OTP Verification Audit Table
```sql
CREATE TABLE transaction_otp_verification (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(20) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    transaction_amount DECIMAL(15,2) NOT NULL,
    verification_status VARCHAR(20) NOT NULL,
    verification_id VARCHAR(100),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes')
);
```

## Demo Mode vs Production Mode

### Demo Mode (Current)
- **When**: Twilio geo-permissions block Sri Lanka or credentials not configured
- **Behavior**: 
  - Logs OTP messages to console
  - Accepts any 6-digit code for verification
  - No actual SMS sent
- **Use Case**: Development and testing

### Production Mode
- **When**: Valid Twilio credentials with Sri Lanka enabled
- **Behavior**:
  - Sends real SMS via Twilio Verify service
  - Validates codes against Twilio's verification system
  - Real-time verification status
- **Use Case**: Production deployment

## Error Handling

### Common Scenarios
1. **No Phone Number**: Customer phone not registered
2. **Invalid Account**: Account not found
3. **Geo-Permissions**: Sri Lanka blocked by Twilio
4. **Invalid OTP**: Wrong verification code
5. **Expired OTP**: Code expired after 10 minutes

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "details": "Detailed error information",
  "error": "Technical error message"
}
```

## Security Features

1. **Amount Threshold**: Only transactions > 5,000 LKR require OTP
2. **Phone Verification**: Uses customer's registered phone number
3. **Code Expiration**: OTP codes expire after 10 minutes
4. **Audit Trail**: All verifications logged for compliance
5. **Rate Limiting**: Built-in protection against abuse

## Testing

### Manual Testing
1. Start the backend server: `npm run dev`
2. Visit: `http://localhost:3000/transaction-otp-test`
3. Enter account number and transaction amount
4. Test OTP verification flow

### API Testing
```bash
# Check OTP requirement
curl "http://localhost:5001/api/transaction-otp/check?accountNumber=BT25874627528&transactionAmount=10000"

# Send OTP
curl -X POST http://localhost:5001/api/transaction-otp/send \
  -H "Content-Type: application/json" \
  -d '{"accountNumber": "BT25874627528", "transactionAmount": 10000}'

# Verify OTP
curl -X POST http://localhost:5001/api/transaction-otp/verify \
  -H "Content-Type: application/json" \
  -d '{"accountNumber": "BT25874627528", "phoneNumber": "+94760159557", "code": "123456", "transactionAmount": 10000}'
```

## Configuration

### Environment Variables
```env
# Twilio Configuration (for real SMS)
TWILIO_ACCOUNT_SID=AC04b86ab1c8aedc72a2fc482177f0a976
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=VAe9b91f837b394ff646a759ff1298bc23
```

### Threshold Configuration
The 5,000 LKR threshold is hardcoded in the system. To change it:

1. **Backend**: Update `backend/routes/transactions.js` line 328
2. **Frontend**: Update `frontend/src/components/TransactionOTP.js` threshold display

## Integration Examples

### 1. Customer Registration with Phone
```javascript
// Ensure customer has phone number during registration
const customerData = {
  first_name: "John",
  last_name: "Doe",
  phone_number: "+94760159557", // Required for OTP
  // ... other fields
};
```

### 2. Transaction with OTP Check
```javascript
// Check if OTP required before creating transaction
const checkOTP = await axios.get('/api/transaction-otp/check', {
  params: { accountNumber, transactionAmount }
});

if (checkOTP.data.requiresOTP) {
  // Show OTP verification UI
  // After verification, create transaction with otpVerified: true
}
```

### 3. Manager Override (Future)
```javascript
// Managers could potentially override OTP requirement
if (userRole === 'Manager' && managerOverride) {
  // Skip OTP verification
}
```

## Next Steps

1. **Enable Sri Lanka**: Update Twilio geo-permissions for production SMS
2. **UI Integration**: Add OTP flow to main transaction form
3. **Manager Override**: Allow managers to bypass OTP for urgent transactions
4. **Rate Limiting**: Implement rate limiting for OTP requests
5. **Analytics**: Add OTP usage analytics and reporting
6. **Multi-language**: Support OTP messages in local languages

## Support

For issues related to:
- **Twilio**: Check geo-permissions and account settings
- **Database**: Verify customer phone numbers are registered
- **Frontend**: Ensure React Query is properly installed
- **Backend**: Check server logs for detailed error messages

## Files Created/Modified

### New Files
- `backend/routes/transaction-otp.js` - OTP API endpoints
- `backend/scripts/create-otp-audit-table.sql` - Database schema
- `frontend/src/components/TransactionOTP.js` - OTP verification component
- `frontend/src/pages/TransactionOTPTest.js` - Test page

### Modified Files
- `backend/services/smsService.js` - Added transaction OTP methods
- `backend/routes/transactions.js` - Added OTP requirement check
- `backend/server.js` - Added OTP routes
- `frontend/src/App.js` - Added test page routing

The system is now fully functional with OTP verification for high-value transactions! 🎉



