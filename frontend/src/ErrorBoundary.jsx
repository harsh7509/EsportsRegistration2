import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error){
    return { hasError: true, error };
  }
  componentDidCatch(error, info){
    console.error('ErrorBoundary caught:', error, info);
  }
  render(){
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, color: '#ef4444', fontFamily: 'monospace' }}>
          <h2>Component crashed</h2>
          <pre style={{ whiteSpace:'pre-wrap' }}>
{String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
