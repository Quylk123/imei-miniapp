import { Component, type ErrorInfo, type ReactNode } from 'react';

export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    console.error('[app] render failed', { path: window.location.pathname });
  }
  render() {
    if (this.state.failed) return <div role="alert" style={{ padding: '80px 24px', textAlign: 'center' }}>
      <h1>Chưa mở được ứng dụng</h1>
      <p>Vui lòng tải lại để tiếp tục.</p>
      <button onClick={() => window.location.reload()} style={{ padding: 16 }}>Tải lại</button>
    </div>;
    return this.props.children;
  }
}
