import React from 'react';
import usePhotoUrl from '../hooks/usePhotoUrl';

const CustomerPhoto = ({ customerId, photoUrl, firstName, lastName, className = "h-10 w-10 rounded-full object-cover border-2 border-gray-200" }) => {
  const { signedUrl, loading, error } = usePhotoUrl(customerId, photoUrl);

  if (!photoUrl) {
    return (
      <div className={`${className} bg-gray-200 border-2 border-gray-300 flex items-center justify-center`}>
        <span className="text-gray-500 text-sm font-medium">
          {firstName?.[0]}{lastName?.[0]}
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${className} bg-gray-200 border-2 border-gray-300 flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`${className} bg-gray-200 border-2 border-gray-300 flex items-center justify-center`}>
        <span className="text-gray-500 text-sm font-medium">
          {firstName?.[0]}{lastName?.[0]}
        </span>
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={`${firstName} ${lastName}`}
      className={className}
      onError={(e) => {
        console.error('Image failed to load:', signedUrl);
        e.target.style.display = 'none';
      }}
      onLoad={() => {
        console.log('Image loaded successfully:', signedUrl);
      }}
    />
  );
};

export default CustomerPhoto;


















