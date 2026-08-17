import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';

import Today from './pages/Today';
import CustomerList from './pages/Customers/List';
import CustomerForm from './pages/Customers/Form';
import CustomerView from './pages/Customers/View';

import RequirementList from './pages/Requirements/List';
import RequirementView from './pages/Requirements/View';
import RequirementForm from './pages/Requirements/Form';

import DataImport from './pages/Data/Import';
import ReviewQueue from './pages/Data/Review';

import ErrorBoundary from './components/ErrorBoundary';

// Placeholders for other routes
const Placeholder = ({ title }) => (
  <div className="animate-fade-in" style={{padding: '3rem', textAlign: 'center'}}>
    <h2>{title}</h2>
    <p className="text-secondary" style={{marginTop: '1rem'}}>This module will be built in a future sprint.</p>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Today />} />
            
            <Route path="customers">
              <Route index element={<CustomerList />} />
              <Route path="new" element={<CustomerForm />} />
              <Route path=":id" element={<CustomerView />} />
              <Route path=":id/edit" element={<CustomerForm />} />
            </Route>
            <Route path="data">
              <Route index element={<Navigate to="import" replace />} />
              <Route path="import" element={<DataImport />} />
              <Route path="review" element={<ReviewQueue />} />
            </Route>
            <Route path="requirements">
              <Route index element={<RequirementList />} />
              <Route path="new" element={<RequirementForm />} />
              <Route path=":id" element={<RequirementView />} />
            </Route>
            
            <Route path="follow-ups" element={<Placeholder title="Follow-ups Engine" />} />
            <Route path="activity" element={<Placeholder title="Activity Log" />} />
            <Route path="settings" element={<Placeholder title="Settings" />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
