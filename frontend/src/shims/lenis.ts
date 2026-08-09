// Minimal Lenis shim for smooth scrolling
class Lenis {
  constructor(options = {}) {
    // store options if needed
    this.options = options;
  }
  // called by Vite plugin code
  raf(time) {}
  scrollTo(target, opts = {}) {}
  destroy() {}
  on(event, handler) {}
}
export default Lenis;
