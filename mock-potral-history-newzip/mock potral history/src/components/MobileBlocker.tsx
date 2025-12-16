import { useState, useEffect } from 'react';

export default function MobileBlocker({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      
      const mobileKeywords = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS|Tablet|PlayBook|Silk|Kindle|ARM|Touch/i;
      const isMobileUA = mobileKeywords.test(userAgent);
      
      const platform = navigator.platform || '';
      const mobilePlatforms = /iPhone|iPad|iPod|Android|Linux armv|Linux aarch/i;
      const isMobilePlatform = mobilePlatforms.test(platform);
      
      const hasMobileTouch = navigator.maxTouchPoints > 1;
      
      const hasOrientation = typeof window.orientation !== 'undefined';
      
      const screenRatio = window.screen.width / window.screen.height;
      const isMobileRatio = screenRatio < 0.7 || screenRatio > 1.5;
      
      const isMobileScreen = window.screen.width < 1024 || window.screen.height < 600;
      
      const mobile = isMobileUA || isMobilePlatform || hasOrientation || (hasMobileTouch && (isMobileRatio || isMobileScreen));
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-white text-2xl font-bold mb-4">Desktop Only</h1>
          <p className="text-gray-300 text-lg">
            This test portal is only accessible on desktop devices. 
            Please use a laptop or computer to access the mock test.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
