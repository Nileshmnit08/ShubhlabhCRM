import React, { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext();

export const useOnboarding = () => useContext(OnboardingContext);

export const OnboardingProvider = ({ children }) => {
  const [onboardingData, setOnboardingData] = useState({
    shopConfirmed: false,
    shopLocation: null,
    deliveryType: null, // 'SAME' or 'DIFFERENT'
    deliveryAddress: null,
    shopPhoto: null,
  });

  const updateData = (updates) => {
    setOnboardingData(prev => ({ ...prev, ...updates }));
  };

  return (
    <OnboardingContext.Provider value={{ onboardingData, updateData }}>
      {children}
    </OnboardingContext.Provider>
  );
};
