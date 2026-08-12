<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import type { ComplexFunctionMode } from './project';

  export let amplitude = 1;
  export let frequency = 1;
  export let phase = 0;
  export let mode: ComplexFunctionMode = 'quadratic';

  let canvas: HTMLCanvasElement;
  let resizeObserver: ResizeObserver;
  const dispatch = createEventDispatcher<{ ready: HTMLCanvasElement }>();
  const zetaZeros = [14.134725, 21.02204, 25.010858, 30.424876, 32.935062];

  function hsvToRgb(hue: number, saturation: number, value: number) {
    const h = ((hue % 1) + 1) % 1;
    const index = Math.floor(h * 6);
    const f = h * 6 - index;
    const p = value * (1 - saturation);
    const q = value * (1 - f * saturation);
    const t = value * (1 - (1 - f) * saturation);

    const channels = [
      [value, t, p],
      [q, value, p],
      [p, value, t],
      [p, q, value],
      [t, p, value],
      [value, p, q]
    ][index % 6];

    return channels.map((channel) => Math.round(channel * 255));
  }

  function evaluate(re: number, im: number) {
    if (mode === 'zeta') {
      return zetaApprox(re, im);
    }

    const cRe = 0.18 * Math.cos(phase);
    const cIm = 0.18 * Math.sin(phase);
    const scaledRe = frequency * re;
    const scaledIm = frequency * im;

    return {
      re: amplitude * (scaledRe * scaledRe - scaledIm * scaledIm) + cRe,
      im: amplitude * (2 * scaledRe * scaledIm) + cIm
    };
  }

  function zetaApprox(re: number, im: number) {
    let etaRe = 0;
    let etaIm = 0;
    const terms = 42;
    const shiftedRe = 0.5 + re * 0.34;
    const shiftedIm = zetaCenterT() + im * 4.8;
    const scale = 0.72 + amplitude * 0.18;

    for (let n = 1; n <= terms; n += 1) {
      const sign = n % 2 === 0 ? -1 : 1;
      const logN = Math.log(n);
      const magnitude = Math.exp(-shiftedRe * logN);
      const angle = -shiftedIm * logN;
      etaRe += sign * magnitude * Math.cos(angle);
      etaIm += sign * magnitude * Math.sin(angle);
    }

    const powAngle = -shiftedIm * Math.LN2;
    const powMagnitude = Math.exp((1 - shiftedRe) * Math.LN2);
    const denomRe = 1 - powMagnitude * Math.cos(powAngle);
    const denomIm = -powMagnitude * Math.sin(powAngle);
    const denomMag = denomRe * denomRe + denomIm * denomIm || 1;

    return {
      re: scale * ((etaRe * denomRe + etaIm * denomIm) / denomMag),
      im: scale * ((etaIm * denomRe - etaRe * denomIm) / denomMag)
    };
  }

  function zetaCenterT() {
    return 18 + phase * 0.8;
  }

  function zetaScreenY(zeroT: number, span: number, cssHeight: number) {
    const im = (zeroT - zetaCenterT()) / 4.8;
    if (im < -span || im > span) return undefined;
    return (1 - (im / span + 1) / 2) * cssHeight;
  }

  function draw() {
    if (!canvas) return;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.min(720, Math.round(rect.width * dpr)));
    const height = Math.max(1, Math.min(520, Math.round(rect.height * dpr)));
    canvas.width = width;
    canvas.height = height;

    const image = context.createImageData(width, height);
    const span = mode === 'zeta' ? 2.4 : 3.2;
    const aspect = width / height;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const re = ((x / (width - 1)) * 2 - 1) * span * aspect;
        const im = (1 - (y / (height - 1)) * 2) * span;
        const value = evaluate(re, im);
        const magnitude = Math.hypot(value.re, value.im);
        const angle = Math.atan2(value.im, value.re);
        const hue = angle / (Math.PI * 2) + 0.5;
        const contour = 0.72 + 0.16 * Math.sin(Math.log1p(magnitude) * 12);
        const brightness = Math.min(1, 0.34 + Math.log1p(magnitude) * 0.26) * contour;
        const saturation = Math.max(0.58, 1 - Math.exp(-magnitude * 1.4));
        const zeroGlow = Math.exp(-magnitude * 12);
        const [r, g, b] = hsvToRgb(hue, saturation, Math.max(0.08, brightness));
        const index = (y * width + x) * 4;

        image.data[index] = Math.min(255, r + zeroGlow * 255);
        image.data[index + 1] = Math.min(255, g + zeroGlow * 220);
        image.data[index + 2] = Math.min(255, b + zeroGlow * 90);
        image.data[index + 3] = 255;
      }
    }

    context.putImageData(image, 0, 0);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cssWidth = rect.width;
    const cssHeight = rect.height;
    const criticalX = mode === 'zeta' ? cssWidth / 2 : cssWidth / 2 + (0.5 / (span * aspect)) * (cssWidth / 2);

    context.strokeStyle = 'rgba(237, 242, 244, 0.72)';
    context.lineWidth = 1.25;
    context.setLineDash([6, 8]);
    context.beginPath();
    context.moveTo(criticalX, 18);
    context.lineTo(criticalX, cssHeight - 18);
    context.stroke();
    context.setLineDash([]);

    if (mode === 'zeta') {
      const visibleZeros = zetaZeros
        .map((zero) => ({ zero, y: zetaScreenY(zero, span, cssHeight) }))
        .filter((entry): entry is { zero: number; y: number } => entry.y !== undefined);

      context.save();
      visibleZeros.forEach((entry, index) => {
        const pulse = 1 + 0.18 * Math.sin(phase + index);
        context.shadowColor = 'rgba(244, 211, 94, 0.82)';
        context.shadowBlur = 16;
        context.fillStyle = 'rgba(244, 211, 94, 0.92)';
        context.strokeStyle = 'rgba(237, 242, 244, 0.96)';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(criticalX, entry.y, 6.5 * pulse, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.shadowBlur = 0;
        context.fillStyle = 'rgba(15, 20, 25, 0.74)';
        context.fillRect(criticalX + 12, entry.y - 12, 62, 22);
        context.fillStyle = '#edf2f4';
        context.font = '600 11px Inter, system-ui, sans-serif';
        context.fillText(`t=${entry.zero.toFixed(2)}`, criticalX + 18, entry.y + 3);
      });
      context.restore();
    }

    context.fillStyle = 'rgba(15, 20, 25, 0.72)';
    context.fillRect(18, 18, 196, 58);
    context.strokeStyle = 'rgba(143, 188, 230, 0.6)';
    context.strokeRect(18, 18, 196, 58);
    context.fillStyle = '#edf2f4';
    context.font = '600 14px Inter, system-ui, sans-serif';
    context.fillText(mode === 'zeta' ? 'zeta(s), critical line' : 'f(z)=a(zb)^2 + c(phi)', 32, 43);
    context.fillStyle = '#e9c46a';
    context.font = '12px Inter, system-ui, sans-serif';
    context.fillText(mode === 'zeta' ? `zeros near t=${zetaCenterT().toFixed(1)}` : 'phase = hue, magnitude = light', 32, 62);
  }

  $: amplitude, frequency, phase, mode, draw();

  onMount(() => {
    draw();
    dispatch('ready', canvas);
    resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
  });
</script>

<canvas
  bind:this={canvas}
  aria-label={mode === 'zeta'
    ? 'Complex domain coloring preview with zeta critical line and zero markers'
    : 'Complex domain coloring preview'}
></canvas>
