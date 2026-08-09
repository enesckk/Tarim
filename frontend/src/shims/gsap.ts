// Minimal stub for gsap library
const noopAnim = () => ({ kill: () => {}, play: () => {}, pause: () => {}, reverse: () => {}, restart: () => {} });

/** Apply a subset of GSAP vars directly to DOM elements (no animation, instant). */
function applyVars(target: any, vars: Record<string, any>) {
  if (!target || !vars) return;
  const els: Element[] = Array.isArray(target)
    ? target
    : target instanceof NodeList
    ? Array.from(target)
    : [target];

  const PROP_MAP: Record<string, string> = {
    clipPath: 'clipPath',
    opacity: 'opacity',
    display: 'display',
    width: 'width',
    height: 'height',
    left: 'left',
    top: 'top',
    right: 'right',
    bottom: 'bottom',
    visibility: 'visibility',
    transform: 'transform',
    backgroundColor: 'backgroundColor',
    color: 'color',
  };

  els.forEach((el: any) => {
    if (!el || !el.style) return;
    Object.entries(vars).forEach(([key, value]) => {
      if (key === 'xPercent') {
        // ignore transform shortcuts in the shim
        return;
      }
      const cssProp = PROP_MAP[key];
      if (cssProp) {
        el.style[cssProp] = String(value);
      }
    });
  });
}

const gsap: any = {
  fromTo: (_target: any, _from: any, _to: any) => noopAnim(),
  to: (_target: any, _vars: any) => noopAnim(),
  from: (_target: any, _vars: any) => noopAnim(),
  /** Instantly apply CSS vars to DOM elements (shim equivalent of gsap.set). */
  set: (target: any, vars: any) => { applyVars(target, vars); },
  timeline: (_vars?: any) => ({
    to: () => ({}), from: () => ({}), fromTo: () => ({}),
    set: () => ({}), add: () => ({}), kill: () => {},
    play: () => {}, pause: () => {}, reverse: () => {}, restart: () => {},
  }),
  context: (fn: any, _scope?: any) => { try { fn(); } catch(e) {} return { revert: () => {} }; },
  registerPlugin: (..._plugins: any[]) => {},
  quickSetter: (_target: any, _prop: string) => (_val: any) => {},
  ticker: {
    add: (_cb: any) => {},
    remove: (_cb: any) => {},
    lagSmoothing: (_val: any) => {},
  },
  effects: {},
};

export { gsap };
export default gsap;

export const ScrollTrigger = {
  create: (_options: any) => ({ kill: () => {} }),
  update: () => {},
  refresh: () => {},
};

