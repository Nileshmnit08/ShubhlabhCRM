import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh', 
          background: 'var(--bg-base)', 
          color: 'var(--text-primary)',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <AlertTriangle size={64} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h1 style={{ marginBottom: '0.5rem' }}>Something went wrong.</h1>
          <p className="text-secondary" style={{ marginBottom: '2rem', maxWidth: '500px' }}>
            The CRM encountered an unexpected error. This has been logged. Please try reloading the page to continue.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} /> Reload CRM
          </button>
          
          {process.env.NODE_ENV === 'development' && (
            <div style={{ marginTop: '3rem', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', maxWidth: '800px', overflow: 'auto' }}>
              <h4 style={{ color: 'var(--danger)' }}>{this.state.error && this.state.error.toString()}</h4>
              <pre style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
