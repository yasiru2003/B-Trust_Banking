const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class FilebaseService {
  constructor() {
    this.client = new S3Client({
      endpoint: 'https://s3.filebase.com',
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.FILEBASE_ACCESS_KEY || 'A91EA88E68309BAA9947',
        secretAccessKey: process.env.FILEBASE_SECRET_KEY || 'zYRybpwviMvGRwhvptYmAvnJYmfUwSJTUscXq0iF'
      }
    });
    this.bucketName = process.env.FILEBASE_BUCKET || 'b-trust-customer-photos';
  }

  // Ensure bucket exists
  async ensureBucketExists() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        try {
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
          console.log(`📦 Created Filebase bucket: ${this.bucketName}`);
          
          // Set bucket policy for public read access
          try {
            const { PutBucketPolicyCommand } = require('@aws-sdk/client-s3');
            const policy = {
              Version: '2012-10-17',
              Statement: [
                {
                  Sid: 'PublicReadGetObject',
                  Effect: 'Allow',
                  Principal: '*',
                  Action: 's3:GetObject',
                  Resource: `arn:aws:s3:::${this.bucketName}/*`
                }
              ]
            };
            
            await this.client.send(new PutBucketPolicyCommand({
              Bucket: this.bucketName,
              Policy: JSON.stringify(policy)
            }));
            console.log(`📦 Set public read policy for bucket: ${this.bucketName}`);
          } catch (policyError) {
            console.log('Note: Could not set bucket policy (this is normal for some S3-compatible services)');
          }
          
          return true;
        } catch (createError) {
          console.error('Failed to create bucket:', createError);
          return false;
        }
      }
      console.error('Bucket check error:', error);
      return false;
    }
  }

  // Upload customer photo to Filebase
  async uploadCustomerPhoto(customerId, photoData, contentType = 'image/jpeg') {
    try {
      // Ensure bucket exists
      const bucketExists = await this.ensureBucketExists();
      if (!bucketExists) {
        return {
          success: false,
          error: 'Failed to create or access bucket'
        };
      }

      // Remove data URL prefix if present
      const base64Data = photoData.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Trim customer ID to handle CHAR column padding
      const trimmedCustomerId = customerId.trim();
      const key = `customers/${trimmedCustomerId}/photo.jpg`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read', // Make the object publicly readable
        Metadata: {
          customerId: trimmedCustomerId,
          uploadedAt: new Date().toISOString()
        }
      });

      await this.client.send(command);
      
      // Generate a signed URL for secure access
      const signedUrl = await this.getCustomerPhotoUrl(trimmedCustomerId, 86400); // 24 hours expiry
      console.log(`📸 Photo uploaded successfully, signed URL generated`);
      
      return {
        success: true,
        key: key,
        url: signedUrl.url
      };
    } catch (error) {
      console.error('Filebase upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get signed URL for customer photo (for private access)
  async getCustomerPhotoUrl(customerId, expiresIn = 3600) {
    try {
      // Trim customer ID to handle CHAR column padding
      const trimmedCustomerId = customerId.trim();
      const key = `customers/${trimmedCustomerId}/photo.jpg`;
      
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
      
      return {
        success: true,
        url: signedUrl
      };
    } catch (error) {
      console.error('Filebase get URL error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete customer photo
  async deleteCustomerPhoto(customerId) {
    try {
      const key = `customers/${customerId}/photo.jpg`;
      
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.client.send(command);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Filebase delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test connection to Filebase
  async testConnection() {
    try {
      // Try to list objects in bucket (this will fail if bucket doesn't exist, but that's ok)
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: 'test-connection'
      });
      
      await this.client.send(command);
      return { success: true, message: 'Filebase connection successful' };
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.name === 'NoSuchBucket') {
        return { success: true, message: 'Filebase connection successful (bucket may not exist yet)' };
      }
      console.error('Filebase connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FilebaseService();
