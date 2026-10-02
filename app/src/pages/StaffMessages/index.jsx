import React from 'react';
import { useOutletContext } from 'react-router-dom';
import StaffMessagesUI from './StaffMessagesUI';

export default function StaffMessages() {
  const context = useOutletContext();
  
  if (!context || !context.sm) {
    return <div>Error: Staff Messages context not found.</div>;
  }

  return <StaffMessagesUI sm={context.sm} isFloating={false} />;
}
