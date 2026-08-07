import { describe, expect, it } from 'vitest';
import { render2dFrameSvg } from './export';
import { createDefaultProject } from './project';

describe('render2dFrameSvg', () => {
  it('renders the active 2D frame as a scalable SVG document', () => {
    const scene = createDefaultProject().scenes[0];
    const svg = render2dFrameSvg(scene, 2, 1280, 720);

    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('viewBox="0 0 1280 720"');
    expect(svg).toContain('<path d="M ');
    expect(svg).toContain('aria-label="Sine transformation 2D graph"');
    expect(svg).toContain('presentation overlay');
    expect(svg).toContain('plot annotations');
  });

  it('reflects scene visual settings in SVG output', () => {
    const scene = {
      ...createDefaultProject().scenes[0],
      visual: {
        ...createDefaultProject().scenes[0].visual,
        colorMap: 'viridis' as const,
        lineWeight: 7,
        showAxes: false
      }
    };
    const svg = render2dFrameSvg(scene, 0, 1920, 1080);

    expect(svg).toContain('stroke="#72d38b" stroke-width="7"');
    expect(svg).not.toContain('aria-label="plot grid"');
  });

  it('can render SVG graph artwork without a background for video compositing', () => {
    const scene = createDefaultProject().scenes[0];
    const svg = render2dFrameSvg(scene, 1, 1280, 720, true);

    expect(svg).not.toContain('<rect width="100%" height="100%" fill="url(#bg)"/>');
    expect(svg).toContain('<path d="M ');
    expect(svg).toContain('presentation overlay');
  });

  it('renders vector-field scenes as arrow groups in SVG exports', () => {
    const scene = {
      ...createDefaultProject().scenes[0],
      plotMode: 'vector-field' as const,
      expression: "x'=y, y'=-a*sin(x)-(b-1)y"
    };
    const svg = render2dFrameSvg(scene, 1, 1280, 720);

    expect(svg).toContain('aria-label="vector field"');
    expect(svg).toContain('aria-label="vector trajectory"');
    expect(svg).toContain('<line ');
    expect(svg).toContain('<path d="M ');
  });

  it('renders parametric scenes as SVG curve paths', () => {
    const scene = {
      ...createDefaultProject().scenes[0],
      plotMode: 'parametric' as const,
      expression: 'x(t)=a*sin(b*t+phi), y(t)=a*sin((b+1)*t)'
    };
    const svg = render2dFrameSvg(scene, 1, 1280, 720);

    expect(svg).toContain('stroke="#8fbce6"');
    expect(svg).toContain('<path d="M ');
    expect(svg).not.toContain('aria-label="vector field"');
  });

  it('renders linear-transform scenes as transformed grid SVG artwork', () => {
    const scene = {
      ...createDefaultProject().scenes[0],
      plotMode: 'linear-transform' as const,
      expression: 'A*x = lambda*x'
    };
    const svg = render2dFrameSvg(scene, 1, 1280, 720);

    expect(svg).toContain('aria-label="linear transform"');
    expect(svg).toContain('aria-label="transformed basis"');
    expect(svg).toContain('aria-label="eigen directions"');
    expect(svg).toContain('T(e1)');
  });

  it('escapes overlay text for XML-safe formula export', () => {
    const scene = {
      ...createDefaultProject().scenes[0],
      name: 'A < B & C',
      formulaLatex: 'f(x)<g(x)&h(x)'
    };
    const svg = render2dFrameSvg(scene, 0, 640, 360);

    expect(svg).toContain('A &lt; B &amp; C');
    expect(svg).toContain('f(x)&lt;g(x)&amp;h(x)');
    expect(svg).not.toContain('A < B & C');
  });
});
