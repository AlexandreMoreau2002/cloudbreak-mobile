import { renderHook } from '@testing-library/react-native';
import {
  CURVE,
  useMascotBob,
  bobRotateDeg,
  bobTranslateY,
  getMascotAssets,
} from './mascotMotion';

describe('mascotMotion', () => {
  it('exposes the signature bezier curve', () => {
    expect(CURVE).toBeDefined();
  });

  describe('getMascotAssets', () => {
    it('uses the accent colour for the shadow in light mode', () => {
      const { src, shadowColor } = getMascotAssets('light', '#B28C6E');
      expect(src).toBeTruthy();
      expect(shadowColor).toBe('#B28C6E');
    });

    it('uses a black shadow in dark mode', () => {
      const { shadowColor } = getMascotAssets('dark', '#B28C6E');
      expect(shadowColor).toBe('#000000');
    });

    it('returns a different asset per scheme', () => {
      expect(getMascotAssets('light', '#000').src).not.toBe(getMascotAssets('dark', '#000').src);
    });
  });

  describe('bob transform helpers', () => {
    it('rests at 0 and dips to -amplitude', () => {
      expect(bobTranslateY(0, 3)).toBe(0);
      expect(bobTranslateY(1, 3)).toBe(-3);
      expect(bobTranslateY(1, 5)).toBe(-5);
    });

    it('oscillates symmetrically around 0 for rotation', () => {
      expect(bobRotateDeg(0, 1)).toBe(-1);
      expect(bobRotateDeg(1, 1)).toBe(1);
      expect(bobRotateDeg(0.5, 2)).toBeCloseTo(0);
    });
  });

  describe('useMascotBob', () => {
    it('defaults to bob amplitude 3px / rotation 1deg', () => {
      const { result } = renderHook(() => useMascotBob());
      expect(result.current.amplitude).toBe(3);
      expect(result.current.rotation).toBe(1);
      expect(result.current.bob).toHaveProperty('value');
    });

    it('accepts curtain-style overrides', () => {
      const { result } = renderHook(() => useMascotBob({ amplitude: 5, rotation: 1.5 }));
      expect(result.current.amplitude).toBe(5);
      expect(result.current.rotation).toBe(1.5);
    });
  });
});
