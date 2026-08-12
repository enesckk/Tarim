// Minimal Lenis shim for smooth scrolling
class Lenis {
  options: Record<string, unknown>

  constructor(options: Record<string, unknown> = {}) {
    this.options = options
  }
  raf(_time: number) {}
  scrollTo(_target: unknown, _opts: Record<string, unknown> = {}) {}
  destroy() {}
  on(_event: string, _handler: (...args: unknown[]) => void) {}
}
export default Lenis
