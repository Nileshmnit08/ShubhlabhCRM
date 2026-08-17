import React from 'react';

/**
 * A lightweight error boundary that sits at the very root of the app.
 * It avoids importing complex SVG icons or UI libraries so it can 
 * render even if chunk loading or other module imports fail.
 */
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("AppErrorBoundary caught a fatal error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh', 
          backgroundColor: '#0f172a', 
          color: '#f8fafc',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ marginBottom: '1rem', color: '#ef4444' }}>Critical Application Error</h1>
          <p style={{ marginBottom: '2rem', maxWidth: '400px', color: '#94a3b8' }}>
            The app could not be initialized. This might be due to an unsupported browser feature or strict privacy settings blocking storage.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '1rem',
              cursor: 'pointer' 
            }}
          >
            Reload Application
          </button>
          
          {this.state.error && (
            <div style={{ marginTop: '3rem', textAlign: 'left', background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px', maxWidth: '800px', overflow: 'auto' }}>
              <pre style={{ fontSize: '0.8rem', color: '#ef4444' }}>
                {this.state.error.toString()}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
