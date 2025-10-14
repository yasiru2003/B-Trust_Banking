# SMS Notifications System - B-Trust Bank

## Overview

The B-Trust Bank system now includes comprehensive SMS notifications using **Text.lk** service for all major banking operations. Customers receive detailed SMS messages for transactions, account creation, fraud alerts, and more.

## Features

### 📱 SMS Notification Types

1. **Transaction Success Notifications**
   - Detailed transaction information
   - Account balance updates
   - Transaction type (Deposit/Withdrawal)
   - Reference numbers
   - Timestamp

2. **Account Creation Notifications**
   - Welcome message with customer name
   - Account number and type
   - Initial balance information
   - Instructions for using banking services

3. **Fraud Alert Notifications**
   - High-risk transaction alerts
   - Suspicious activity warnings
   - Account security information
   - Contact instructions

4. **Customer Registration Notifications**
   - Welcome message
   - Customer ID information
   - Service availability details

5. **Low Balance Alerts**
   - Balance threshold warnings
   - Deposit reminders
   - Agent contact information

6. **Transaction OTP**
   - Secure OTP for large transactions
   - Transaction amount and account details
   - Validity period information

## Technical Implementation

### SMS Service Architecture

```
SMS Service (smsService.js)
├── Text.lk Service (textLkService.js) - Primary SMS provider
├── Real SMS Service (realSmsService.js) - Backup provider
├── Working SMS Service (workingSmsService.js) - Backup provider
├── Simple SMS Service (simpleSmsService.js) - Backup provider
└── Twilio Service - Legacy backup
```

### Integration Points

1. **Transaction Routes** (`/routes/transactions.js`)
   - Sends success notifications after transaction completion
   - Sends notifications after transaction approval
   - Includes detailed transaction information

2. **Account Routes** (`/routes/accounts.js`)
   - Sends notifications after account creation
   - Includes account details and welcome message

3. **Customer Routes** (`/routes/customers.js`)
   - Sends registration success notifications
   - Includes customer ID and service information

4. **Fraud Detection Routes** (`/routes/fraud.js`)
   - Sends fraud alerts for high-risk transactions
   - Includes security warnings and contact information

## SMS Message Examples

### Transaction Success
```
B-Trust Bank: Deposit successful! LKR 25,000 credited to account BT123456789. 
New balance: LKR 125,000. Ref: TXN001. 2024-01-15 14:30:25
```

### Account Creation
```
B-Trust Bank: Welcome John Doe! Your Savings Account account BT987654321 has been 
created successfully. Initial balance: LKR 5,000. You can now perform transactions 
through our agents.
```

### Fraud Alert
```
B-Trust Bank FRAUD ALERT: Suspicious activity detected on account BT123456789. 
Reason: HIGH_AMOUNT. Amount: LKR 150,000. Transaction ID: TXN123456. Please contact 
your agent immediately or call our hotline. Do not share your account details.
```

### Customer Registration
```
B-Trust Bank: Welcome Jane Smith! Your customer account (ID: CUST001) has been 
created successfully. You can now open bank accounts and perform transactions through 
our agents. Thank you for choosing B-Trust Bank!
```

### Low Balance Alert
```
B-Trust Bank: Low balance alert! Your account BT123456789 balance is LKR 500, 
below the threshold of LKR 1,000. Please visit your agent to deposit funds.
```

### Transaction OTP
```
B-Trust Bank: Your OTP for transaction of LKR 50,000 from account BT123456789 is: 
123456. Valid for 5 minutes.
```

## Configuration

### Environment Variables

```env
# Text.lk Configuration
TEXT_LK_API_TOKEN=your-textlk-token
TEXT_LK_API_URL=https://app.text.lk/api/http

# Backup SMS Services
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_VERIFY_SERVICE_SID=your-verify-service-sid
```

### Phone Number Formatting

The system automatically formats phone numbers for Sri Lankan format:
- Input: `0771234567`
- Formatted: `94771234567` (for Text.lk API)

## Testing

### Test Script

Run the comprehensive test script to verify all SMS notifications:

```bash
cd backend
node test-sms-notifications.js
```

### Manual Testing

1. **Transaction Testing**
   - Create a transaction with a valid phone number
   - Check for SMS notification with transaction details

2. **Account Creation Testing**
   - Create a new account for a customer
   - Verify SMS notification is sent

3. **Fraud Detection Testing**
   - Trigger fraud detection with high-risk transactions
   - Check for fraud alert SMS

## Error Handling

### Fallback Mechanism

1. **Primary**: Text.lk service
2. **Backup 1**: Real SMS service
3. **Backup 2**: Working SMS service
4. **Backup 3**: Simple SMS service
5. **Demo Mode**: Console logging (for development)

### Error Recovery

- SMS failures don't affect core banking operations
- Detailed error logging for troubleshooting
- Automatic fallback to backup services
- Demo mode for development environments

## Security Features

### Fraud Alert Integration

- Real-time fraud detection
- Automatic SMS alerts for suspicious activities
- High-risk transaction notifications
- Customer security warnings

### OTP Security

- Secure OTP generation for large transactions
- Time-limited validity (5 minutes)
- Transaction-specific OTP codes
- Customer verification requirements

## Monitoring and Logging

### SMS Delivery Tracking

- Message ID tracking
- Delivery status monitoring
- Provider performance metrics
- Error rate analysis

### Logging

```javascript
console.log(`📱 Transaction success SMS sent to ${phoneNumber} for transaction ${transactionId}`);
console.log(`📱 Account creation SMS sent to ${phoneNumber} for account ${accountNumber}`);
console.log(`📱 Fraud alert SMS sent to ${phoneNumber} for account ${accountNumber}`);
```

## Best Practices

### Message Content

- Clear and concise messaging
- Include relevant transaction details
- Provide contact information for support
- Use consistent branding (B-Trust Bank)

### Timing

- Send notifications immediately after operations
- Avoid sending during late hours
- Respect customer preferences
- Batch notifications when appropriate

### Compliance

- Follow SMS marketing regulations
- Include opt-out instructions
- Maintain customer privacy
- Secure data transmission

## Troubleshooting

### Common Issues

1. **SMS Not Delivered**
   - Check phone number format
   - Verify Text.lk API configuration
   - Check fallback service status

2. **Invalid Phone Numbers**
   - Ensure 10-digit format
   - Check for special characters
   - Verify country code handling

3. **API Failures**
   - Check API token validity
   - Verify network connectivity
   - Review rate limiting

### Debug Mode

Enable debug logging to troubleshoot SMS issues:

```javascript
console.log('📱 SMS Service: Debug mode enabled');
console.log('📱 Text.lk API Token:', process.env.TEXT_LK_API_TOKEN ? 'Set' : 'Not set');
```

## Future Enhancements

### Planned Features

1. **Multi-language Support**
   - Sinhala and Tamil SMS messages
   - Language preference settings
   - Localized content

2. **SMS Templates**
   - Customizable message templates
   - Brand customization
   - Dynamic content insertion

3. **Delivery Reports**
   - Real-time delivery status
   - Failed message retry
   - Customer notification preferences

4. **Analytics Dashboard**
   - SMS delivery metrics
   - Customer engagement tracking
   - Performance optimization

## Support

For technical support or questions about the SMS notification system:

- Check the logs for detailed error information
- Verify Text.lk API configuration
- Test with the provided test script
- Review the fallback service status

---

**Note**: This SMS notification system is designed to enhance customer experience and provide real-time updates about banking activities. All SMS messages are sent securely and include relevant transaction details for customer awareness and security.
