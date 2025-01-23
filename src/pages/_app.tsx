import { useTokenRefresh } from '../hooks/useTokenRefresh';
import { ComponentType } from 'react';

type AppProps = {
  Component: ComponentType;
  pageProps: Record<string, unknown>;
};

function MyApp({ Component, pageProps }: AppProps) {
  useTokenRefresh();
  return <Component {...pageProps} />;
}

export default MyApp; 