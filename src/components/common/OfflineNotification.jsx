import { useState, useEffect } from 'react';
import { FiWifiOff, FiWifi } from 'react-icons/fi';

const OfflineNotification = () => {
  const [status, setStatus] = useState('online'); // 'online' | 'offline' | 'reconnected'
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeoutId;

    // Check initial state
    if (!navigator.onLine) {
      setStatus('offline');
      setIsVisible(true);
    }

    const handleOnline = () => {
      setStatus('reconnected');
      setIsVisible(true);

      // After 3 seconds, slide down smoothly
      timeoutId = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    };

    const handleOffline = () => {
      clearTimeout(timeoutId);
      setStatus('offline');
      setIsVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(timeoutId);
    };
  }, []);

  const isOffline = status === 'offline';

  // Transition classes:
  // Using transform and translate-y for smooth slide up and down.
  // The color transition is also smooth due to 'transition-colors' in 'transition-all'.
  const bannerClasses = `fixed bottom-0 left-0 w-full z-[9999] text-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transform transition-all duration-700 ease-in-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
    } ${isOffline ? 'bg-harvest-600' : 'bg-primary-600'
    }`;

  return (
    <div className={bannerClasses}>
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center space-x-3">
          {isOffline ? (
            <>
              <FiWifiOff className="h-5 w-5 animate-pulse" />
              <p className="text-sm font-medium text-center">
                Bạn đang ngoại tuyến. Một số tính năng có thể không hoạt động.
              </p>
            </>
          ) : (
            <>
              <FiWifi className="h-5 w-5" />
              <p className="text-sm font-medium text-center">
                Đã khôi phục kết nối Internet. Mọi tính năng đã hoạt động trở lại.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineNotification;
