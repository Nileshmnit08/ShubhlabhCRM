// Environment configuration
// Values should not be hard-coded here. They should be injected at build time.

export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com',
  ENVIRONMENT: process.env.EXPO_PUBLIC_ENV || 'development',
};
