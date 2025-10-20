import { useState, useEffect } from 'react';
import api from '../services/authService';

const usePhotoUrl = (customerId, photoUrl) => {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Normalize and trim incoming values
    const id = customerId?.toString().trim();
    const rawUrl = photoUrl?.toString().trim();

    if (!id || !rawUrl) {
      setSignedUrl(null);
      return;
    }

    // Always prefer server-provided URL (public Filebase URL), ignore client-provided query strings

    // Ask backend for the correct URL (public Filebase URL)
    const getSignedUrl = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await api.get(`/customers/${id}/photo`);
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



















