import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { captureException } from '../../monitoring/sentry';

interface ErrorBoundaryProps {
 children: ReactNode;
 fallback?: ReactNode;
 onReset?: () => void;
}

interface ErrorBoundaryState {
 hasError: boolean;
 error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
 public state: ErrorBoundaryState = {
  hasError: false,
  error: null,
 };

 public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
  return { hasError: true, error };
 }

 public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
  // Capture rendering failure to Sentry with component stack
  captureException(error, {
   extra: {
    componentStack: errorInfo.componentStack,
   },
  });
 }

 private handleReset = (): void => {
  this.setState({ hasError: false, error: null });
  if (this.props.onReset) {
   this.props.onReset();
  }
 };

 private handleReload = (): void => {
  window.location.reload();
 };

 private handleGoHome = (): void => {
  this.handleReset();
  window.location.href = '/';
 };

 public render(): ReactNode {
  if (this.state.hasError) {
   if (this.props.fallback) {
    return this.props.fallback;
   }

   return (
    <div
     data-testid="error-boundary-fallback"
     className="min-h-screen bg-taskflow-bg text-taskflow-text flex items-center justify-center p-6"
    >
     <div className="max-w-md w-full bg-taskflow-card/90 border border-taskflow-border rounded-lg p-8 shadow-2xl text-center">
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-5">
       <AlertTriangle className="w-7 h-7" />
      </div>

      <h1 className="text-xl font-semibold text-white mb-2">Something went wrong</h1>
      <p className="text-sm text-taskflow-muted mb-6 leading-relaxed">
       An unexpected interface error occurred. Observability diagnostics have recorded this
       incident to prevent service disruption.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
       <button
        type="button"
        onClick={this.handleReset}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shadow-sm cursor-pointer"
       >
        <RefreshCw className="w-4 h-4" />
        Try Again
       </button>

       <button
        type="button"
        onClick={this.handleReload}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-taskflow-surface hover:bg-taskflow-card-hover text-taskflow-text-dim text-sm font-medium transition-colors border border-taskflow-border cursor-pointer"
       >
        Reload
       </button>

       <button
        type="button"
        onClick={this.handleGoHome}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-taskflow-surface/50 hover:bg-taskflow-surface text-taskflow-muted hover:text-white text-sm font-medium transition-colors border border-taskflow-border cursor-pointer"
       >
        <Home className="w-4 h-4" />
        Home
       </button>
      </div>
     </div>
    </div>
   );
  }

  return this.props.children;
 }
}
