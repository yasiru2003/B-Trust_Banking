import { useState, useEffect } from 'react';
import api from '../services/authService';

const usePhotoUrl = (customerId, photoUrl) => {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!customerId || !photoUrl) {
      setSignedUrl(null);
      return;
    }

    // If it's already a signed URL (contains query parameters), use it directly
    if (photoUrl.includes('?')) {
      setSignedUrl(photoUrl);
      return;
    }

    // If it's a direct Filebase URL, get a signed URL
    const getSignedUrl = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await api.get(`/customers/${customerId}/photo`);
        if (response.data.success) {
          setSignedUrl(response.data.photoUrl);
        } else {
          setError('Failed to get photo URL');
        }
      } catch (err) {
        console.error('Error getting signed photo URL:', err);
        setError('Failed to load photo');
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [customerId, photoUrl]);

  return { signedUrl, loading, error };
};

export default usePhotoUrl;









