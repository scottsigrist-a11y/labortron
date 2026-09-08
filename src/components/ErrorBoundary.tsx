import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  declare readonly props: Props;
  public state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in MRBD App:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-100 p-6 text-slate-900 select-text">
          <div className="w-full max-w-md rounded-2xl border-2 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h1 className="text-base font-black uppercase tracking-wider text-rose-600 mb-2">
              Application Error
            </h1>
            <p className="text-xs text-slate-700 mb-3 font-medium">
              The application encountered an unexpected error during initialization.
            </p>
            <pre className="mb-4 max-h-40 overflow-auto rounded-xl bg-slate-950 p-3 text-[11px] font-mono text-amber-300 border border-black">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full cursor-pointer rounded-xl border-2 border-black bg-yellow-400 py-2.5 text-xs font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-none transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
