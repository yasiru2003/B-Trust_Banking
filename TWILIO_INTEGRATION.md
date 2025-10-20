# Twilio SMS Verification Integration

## Overview
This banking system now includes Twilio SMS verification for secure phone number validation. The integration supports both demo mode (for testing) and production mode (with real SMS delivery).

## Configuration

### 1. Environment Variables
Add these to your `backend/.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=AC04b86ab1c8aedc72a2fc482177f0a976
TWILIO_AUTH_TOKEN=YOUR_ACTUAL_AUTH_TOKEN_HERE
TWILIO_VERIFY_SERVICE_SID=VAe9b91f837b394ff646a759ff1298bc23
```

### 2. Twilio Setup
1. **Account SID**: `AC04b86ab1c8aedc72a2fc482177f0a976` (already configured)
2. **Auth Token**: Replace `YOUR_ACTUAL_AUTH_TOKEN_HERE` with your actual Twilio auth token
3. **Verify Service SID**: `VAe9b91f837b394ff646a759ff1298bc23` (already configured)

## API Endpoints

### Send Verification Code
```http
POST /api/verification/send
Content-Type: application/json

{
  "phoneNumber": "+94760159557"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "data": {
    "phoneNumber": "+94760159557",
    "messageId": "verify_1760365663511",
    "status": "pending"
  }
}
```

### Verify Code
```http
POST /api/verification/verify
Content-Type: application/json

{
  "phoneNumber": "+94760159557",
  "code": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Phone number verified successfully",
  "data": {
    "phoneNumber": "+94760159557",
    "verified": true,
    "status": "approved"
  }
}
```

**Response (Invalid Code):**
```json
{
  "success": false,
  "message": "Invalid verification code",
  "data": {
    "phoneNumber": "+94760159557",
    "verified": false,
    "status": "pending"
  }
}
```

### Check Service Status
```http
GET /api/verification/status?phoneNumber=+94760159557
```

## Frontend Components

### PhoneVerification Component
A reusable React component for phone verification:

```jsx
import PhoneVerification from '../components/PhoneVerification';

<PhoneVerification
  phoneNumber="+94760159557"
  onVerified={(phone) => console.log('Verified:', phone)}
  onCancel={() => console.log('Cancelled')}
/>
```

### Test Page
Access the test page at: `http://localhost:3000/phone-verification-test`

## Demo Mode vs Production Mode

### Demo Mode (Current)
- **When**: Twilio credentials not configured or invalid
- **Behavior**: 
  - Logs SMS messages to console
  - Accepts any 6-digit code for verification
  - No actual SMS sent
- **Use Case**: Development and testing

### Production Mode
- **When**: Valid Twilio credentials provided
- **Behavior**:
  - Sends real SMS via Twilio Verify service
  - Validates codes against Twilio's verification system
  - Real-time verification status
- **Use Case**: Production deployment

## Integration Examples

### 1. Customer Registration with Phone Verification
```javascript
// In your customer registration flow
const handleCustomerRegistration = async (customerData) => {
  // Step 1: Send verification code
  const verificationResult = await axios.post('/api/verification/send', {
    phoneNumber: customerData.phone
  });
  
  // Step 2: Show verification UI
  // Step 3: Verify code
  const verifyResult = await axios.post('/api/verification/verify', {
    phoneNumber: customerData.phone,
    code: userEnteredCode
  });
  
  if (verifyResult.data.success && verifyResult.data.data.verified) {
    // Proceed with customer registration
    await createCustomer(customerData);
  }
};
```

### 2. Transaction Authorization
```javascript
// For high-value transactions
const handleLargeTransaction = async (transactionData) => {
  if (transactionData.amount > 100000) {
    // Send verification code to customer
    await axios.post('/api/verification/send', {
      phoneNumber: transactionData.customerPhone
    });
    
    // Wait for verification before processing transaction
    // ... verification UI ...
  }
};
```

## SMS Service Methods

The `SMSService` class now includes these new methods:

```javascript
// Send verification code
await smsService.sendVerificationCode('+94760159557');

// Verify code
const result = await smsService.verifyCode('+94760159557', '123456');
console.log(result.valid); // true/false
```

## Error Handling

### Common Error Scenarios
1. **Invalid Phone Number**: Returns 400 with validation error
2. **Twilio API Error**: Returns 500 with error details
3. **Invalid Verification Code**: Returns 400 with verification failure
4. **Service Unavailable**: Falls back to demo mode

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "details": "Detailed error information",
  "error": "Technical error message"
}
```

## Security Considerations

1. **Rate Limiting**: Consider implementing rate limiting for verification requests
2. **Code Expiration**: Twilio Verify codes expire automatically (default: 10 minutes)
3. **Phone Number Validation**: Input validation ensures proper phone number format
4. **Environment Variables**: Keep Twilio credentials secure in environment variables

## Testing

### Manual Testing
1. Start the backend server: `npm run dev`
2. Visit: `http://localhost:3000/phone-verification-test`
3. Enter phone number and test verification flow

### API Testing
```bash
# Send verification code
curl -X POST http://localhost:5001/api/verification/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+94760159557"}'

# Verify code
curl -X POST http://localhost:5001/api/verification/verify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+94760159557", "code": "123456"}'
```

## Next Steps

1. **Replace Auth Token**: Update `TWILIO_AUTH_TOKEN` in `.env` with your actual token
2. **Test Production Mode**: Verify real SMS delivery works
3. **Integrate with Customer Flow**: Add verification to customer registration
4. **Add to Transaction Flow**: Implement for high-value transactions
5. **Rate Limiting**: Add rate limiting to prevent abuse
6. **Logging**: Implement proper logging for verification attempts

## Support

For Twilio-related issues:
- Twilio Console: https://console.twilio.com/
- Twilio Verify Documentation: https://www.twilio.com/docs/verify
- Twilio Support: https://support.twilio.com/












