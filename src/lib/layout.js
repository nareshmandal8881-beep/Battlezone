import { useEffect, useState } from 'react';
import { isApp } from './native';

const QUERY = '(max-width: 767px)';
const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY) : null;

export const isMobileNow = () => isApp || !!mq?.matches;

// true → phone-app layout (bottom tab bar). Android app always; website on phone-sized screens.
export const useAppLayout = () => {
  const [mobile, setMobile] = useState(isMobileNow());
  useEffect(() => {
    if (isApp || !mq) return undefined;
    const on = () => setMobile(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on));
  }, []);
  return mobile;
};
