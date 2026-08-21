import React from 'react';
import { AlertTriangle } from 'lucide-react';

class SectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[SectionErrorBoundary] Caught error in section: ${this.props.sectionName || 'Unknown'}`);
    console.error("Error details:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="cv-panel" style={{ padding: '1.5rem', backgroundColor: 'rgba(255,0,0,0.03)', border: '1px dashed var(--danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px' }}>
          <AlertTriangle size={24} className="text-danger" style={{ marginBottom: '0.5rem' }} />
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            {this.props.fallbackTitle || 'Section Unavailable'}
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            We encountered an unexpected issue loading this section. The rest of the page remains functional.
          </p>
          <button 
             className="btn btn-ghost" 
             style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', marginTop: '0.75rem' }}
             onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SectionErrorBoundary;
