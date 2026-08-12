import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

const viewports = [
  { name: 'desktop', width: 1440, height: 960 },
  { name: 'compact', width: 1100, height: 760 }
];

function assertPixelVariety(samples, label) {
  const unique = new Set(samples.map((sample) => sample.join(',')));
  if (unique.size < 6) {
    throw new Error(`${label} appears blank or visually under-rendered`);
  }
}

function sampleSignature(samples) {
  return samples.map((sample) => sample.join(',')).join('|');
}

async function canvasChecksum(page, selector) {
  return page.locator(selector).evaluate((canvas) => {
    const target = canvas;
    const probe = document.createElement('canvas');
    probe.width = target.width;
    probe.height = target.height;
    const context = probe.getContext('2d', { willReadFrequently: true });
    if (!context) return 0;

    context.drawImage(target, 0, 0);
    const data = context.getImageData(0, 0, probe.width, probe.height).data;
    let checksum = 0;

    for (let index = 0; index < data.length; index += 16) {
      checksum = (checksum + data[index] * 3 + data[index + 1] * 5 + data[index + 2] * 7) % 1000000007;
    }

    return checksum;
  });
}

async function canvasDataUrlSignature(page, selector) {
  const dataUrl = await page.locator(selector).evaluate((canvas) => canvas.toDataURL('image/png'));
  let checksum = 0;

  for (let index = 0; index < dataUrl.length; index += 1) {
    checksum = (checksum * 31 + dataUrl.charCodeAt(index)) % 1000000007;
  }

  return { checksum, length: dataUrl.length };
}

async function imageDataUrlSignature(page, selector) {
  const dataUrl = await page.locator(selector).evaluate((image) => image.getAttribute('src') ?? '');
  let checksum = 0;

  for (let index = 0; index < dataUrl.length; index += 1) {
    checksum = (checksum * 31 + dataUrl.charCodeAt(index)) % 1000000007;
  }

  return { checksum, length: dataUrl.length };
}

async function sampleCanvas(page, selector) {
  return page.locator(selector).evaluate((canvas) => {
    const target = canvas;
    const probe = document.createElement('canvas');
    probe.width = target.width;
    probe.height = target.height;
    const context = probe.getContext('2d', { willReadFrequently: true });
    if (!context) return [];

    context.drawImage(target, 0, 0);

    const width = probe.width;
    const height = probe.height;
    const samples = [];

    for (let row = 1; row <= 24; row += 1) {
      for (let column = 1; column <= 24; column += 1) {
        const x = Math.floor((width * column) / 25);
        const y = Math.floor((height * row) / 25);
        samples.push(Array.from(context.getImageData(x, y, 1, 1).data));
      }
    }

    return samples;
  });
}

async function main() {
  await mkdir('artifacts', { recursive: true });
  const browser = await chromium.launch();

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
      await page.getByText('Native library available in Tauri').waitFor();

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      const download = await downloadPromise;
      const projectPath = await download.path();
      if (!projectPath) {
        throw new Error(`${viewport.name} project download did not produce a file`);
      }
      const project = JSON.parse(await readFile(projectPath, 'utf8'));
      if (project.schemaVersion !== 1 || !Array.isArray(project.scenes) || project.scenes.length === 0) {
        throw new Error(`${viewport.name} downloaded project has invalid format`);
      }
      if (!Array.isArray(project.scenes[0].derivationSteps) || project.scenes[0].derivationSteps.length === 0) {
        throw new Error(`${viewport.name} downloaded project is missing derivation steps`);
      }
      if (!project.scenes[0].overlay?.enabled) {
        throw new Error(`${viewport.name} downloaded project is missing overlay settings`);
      }
      if (
        project.scenes[0].overlay?.formulaPosition !== 'top-left' ||
        project.scenes[0].overlay?.derivationPosition !== 'bottom-right' ||
        Math.abs(project.scenes[0].overlay?.cardScale - 1) > 0.000001
      ) {
        throw new Error(`${viewport.name} downloaded project is missing default overlay layout`);
      }
      if (typeof project.scenes[0].expression !== 'string' || project.scenes[0].expression.length === 0) {
        throw new Error(`${viewport.name} downloaded project is missing editable expression`);
      }
      if (
        project.scenes[0].visual?.colorMap !== 'studio-blue' ||
        project.scenes[0].visual?.lineWeight !== 2.5 ||
        project.scenes[0].visual?.showAxes !== true ||
        project.scenes[0].visual?.threeMode !== 'surface' ||
        project.scenes[0].visual?.surfaceStyle !== 'smooth' ||
        Math.abs(project.scenes[0].visual?.rotationSpeed - 0.0025) > 0.000001 ||
        Math.abs(project.scenes[0].visual?.surfaceHeightScale - 1) > 0.000001 ||
        project.scenes[0].visual?.surfaceResolution !== 96
      ) {
        throw new Error(`${viewport.name} downloaded project is missing default visual settings`);
      }
      if (
        project.scenes[0].annotation?.showTracePoint !== true ||
        project.scenes[0].annotation?.animateTracePoint !== true ||
        project.scenes[0].annotation?.showTangent !== false ||
        Math.abs(project.scenes[0].annotation?.traceX ?? 99) > 0.000001
      ) {
        throw new Error(`${viewport.name} downloaded project is missing default annotation settings`);
      }
      if (
        project.exportSettings?.width !== 1920 ||
        project.exportSettings?.height !== 1080 ||
        project.exportSettings?.frameCount !== 48 ||
        project.exportSettings?.fps !== 24 ||
        project.exportSettings?.transparentBackground !== false
      ) {
        throw new Error(`${viewport.name} downloaded project is missing default export settings`);
      }

      await page.locator('.katex').first().waitFor();
      await page.getByRole('button', { name: 'Load Fourier Build template' }).click();
      await page.locator('.katex').first().waitFor();
      await page.locator('[aria-label="Presentation overlay"]').waitFor();
      await page.getByRole('button', { name: 'Jump to solution step Limit' }).click();
      await page.waitForFunction(() => Number(document.querySelector('input[aria-label="Timeline scrubber"]')?.value) >= 7);
      await page
        .locator('[aria-label="Presentation overlay"]')
        .getByText('Resolve the construction into the target waveform.')
        .waitFor();
      const stepTime = await page.locator('input[aria-label="Timeline scrubber"]').inputValue();
      if (Number(stepTime) < 7) {
        throw new Error(`${viewport.name} derivation step did not move the timeline`);
      }
      const formulaText = await page.locator('input[aria-label="Active formula LaTeX"]').inputValue();
      if (!formulaText.includes('\\sum')) {
        throw new Error(`${viewport.name} formula editor did not expose LaTeX state`);
      }
      await page.locator('input[aria-label="Scene duration seconds"]').fill('12');
      await page.locator('input[aria-label="Export width"]').fill('1280');
      await page.locator('input[aria-label="Export height"]').fill('720');
      await page.locator('input[aria-label="Export frame count"]').fill('18');
      await page.locator('input[aria-label="Export fps"]').fill('30');
      await page.locator('input[aria-label="Transparent export background"]').check();
      await page.locator('img[alt="2D export frame preview"]').waitFor();
      await page.getByText('480x270 preview of 1280x720').waitFor();
      const exportPreviewBeforeOverlay = await imageDataUrlSignature(page, 'img[alt="2D export frame preview"]');
      if (exportPreviewBeforeOverlay.length < 12000) {
        throw new Error(`${viewport.name} export frame preview appears blank or under-rendered`);
      }
      await page.locator('select[aria-label="2D color map"]').selectOption('fireline');
      await page.locator('input[aria-label="2D line weight"]').fill('6');
      await page.locator('input[aria-label="Show 2D axes"]').uncheck();
      await page.locator('input[aria-label="Animate 2D trace point"]').uncheck();
      await page.locator('input[aria-label="2D trace x"]').fill('1.4');
      await page.locator('input[aria-label="Show 2D tangent"]').check();
      const formulaOverlayBefore = await page.locator('.formula-overlay').boundingBox();
      await page.locator('select[aria-label="Formula overlay position"]').selectOption('bottom-left');
      await page.locator('select[aria-label="Derivation overlay position"]').selectOption('top-right');
      await page.locator('input[aria-label="Overlay card scale"]').fill('1.2');
      await page.waitForTimeout(300);
      const formulaOverlayAfter = await page.locator('.formula-overlay').boundingBox();
      if (
        !formulaOverlayBefore ||
        !formulaOverlayAfter ||
        Math.abs(formulaOverlayBefore.y - formulaOverlayAfter.y) < 60
      ) {
        throw new Error(`${viewport.name} overlay layout controls did not move the formula card`);
      }
      const exportPreviewAfterOverlay = await imageDataUrlSignature(page, 'img[alt="2D export frame preview"]');
      if (exportPreviewBeforeOverlay.checksum === exportPreviewAfterOverlay.checksum) {
        throw new Error(`${viewport.name} export frame preview did not reflect overlay layout changes`);
      }
      await page.locator('input[aria-label="Timeline marker 9 terms time"]').fill('8.4');
      await page.locator('input[aria-label="Timeline marker 9 terms label"]').fill('Crest');
      await page.getByRole('button', { name: 'Add timeline marker' }).click();
      await page.getByText('Added timeline marker').waitFor();
      await page.locator('input[aria-label="Solution step Limit time"]').fill('6.8');
      await page.locator('input[aria-label="Solution step Limit LaTeX"]').fill('S_N(x)\\\\to f(x)');
      await page.locator('textarea[aria-label="Solution step Limit note"]').fill('Edited narration beat for export.');
      await page.locator('input[aria-label="Solution step Limit label"]').fill('Resolution');
      await page.getByRole('button', { name: 'Jump to solution step Resolution' }).click();
      await page
        .locator('[aria-label="Presentation overlay"]')
        .getByText('Edited narration beat for export.')
        .waitFor();
      await page.getByRole('button', { name: 'Add solution step' }).click();
      await page.getByText('Added solution step').waitFor();
      await page.locator('input[aria-label="Keyframe Fundamental amplitude"]').fill('2.35');
      await page.locator('select[aria-label="Keyframe Fundamental easing"]').selectOption('ease-in-out');
      await page.getByRole('button', { name: 'Capture parameter keyframe' }).click();
      await page.getByText('Captured parameter keyframe').waitFor();

      const editedDownloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      const editedDownload = await editedDownloadPromise;
      const editedProjectPath = await editedDownload.path();
      if (!editedProjectPath) {
        throw new Error(`${viewport.name} edited project download did not produce a file`);
      }
      const editedProject = JSON.parse(await readFile(editedProjectPath, 'utf8'));
      if (Math.abs(editedProject.scenes[0].durationSeconds - 12) > 0.001) {
        throw new Error(`${viewport.name} edited scene duration was not saved`);
      }
      if (
        editedProject.exportSettings?.width !== 1280 ||
        editedProject.exportSettings?.height !== 720 ||
        editedProject.exportSettings?.frameCount !== 18 ||
        editedProject.exportSettings?.fps !== 30 ||
        editedProject.exportSettings?.transparentBackground !== true
      ) {
        throw new Error(`${viewport.name} edited export settings were not saved`);
      }
      if (
        editedProject.scenes[0].visual?.colorMap !== 'fireline' ||
        editedProject.scenes[0].visual?.lineWeight !== 6 ||
        editedProject.scenes[0].visual?.showAxes !== false
      ) {
        throw new Error(`${viewport.name} edited visual settings were not saved`);
      }
      if (
        editedProject.scenes[0].annotation?.animateTracePoint !== false ||
        editedProject.scenes[0].annotation?.showTangent !== true ||
        Math.abs(editedProject.scenes[0].annotation?.traceX - 1.4) > 0.001
      ) {
        throw new Error(`${viewport.name} edited annotation settings were not saved`);
      }
      if (
        editedProject.scenes[0].overlay?.formulaPosition !== 'bottom-left' ||
        editedProject.scenes[0].overlay?.derivationPosition !== 'top-right' ||
        Math.abs(editedProject.scenes[0].overlay?.cardScale - 1.2) > 0.001
      ) {
        throw new Error(`${viewport.name} edited overlay layout was not saved`);
      }
      const editedMarkers = editedProject.scenes[0].timeline;
      const crestMarker = editedMarkers.find((marker) => marker.id === 'term-9');
      if (crestMarker?.label !== 'Crest' || Math.abs(crestMarker?.timeSeconds - 8.4) > 0.001) {
        throw new Error(`${viewport.name} edited timeline marker was not saved`);
      }
      if (Math.abs(crestMarker?.atPercent - 70) > 0.001) {
        throw new Error(`${viewport.name} edited timeline marker percent was not recomputed`);
      }
      if (!editedMarkers.some((marker) => marker.label === 'Marker 5')) {
        throw new Error(`${viewport.name} added timeline marker was not saved`);
      }
      const editedSteps = editedProject.scenes[0].derivationSteps;
      const resolutionStep = editedSteps.find((step) => step.id === 'fourier-limit');
      if (resolutionStep?.label !== 'Resolution' || resolutionStep?.note !== 'Edited narration beat for export.') {
        throw new Error(`${viewport.name} edited solution step was not saved`);
      }
      if (Math.abs(resolutionStep?.timeSeconds - 6.8) > 0.001 || resolutionStep?.latex !== 'S_N(x)\\\\to f(x)') {
        throw new Error(`${viewport.name} edited solution step timing or LaTeX was not saved`);
      }
      if (!editedSteps.some((step) => step.label === 'Step 4')) {
        throw new Error(`${viewport.name} added solution step was not saved`);
      }
      const editedKeyframes = editedProject.scenes[0].parameterKeyframes;
      const fundamentalKeyframe = editedKeyframes.find((keyframe) => keyframe.id === 'fourier-start');
      if (Math.abs(fundamentalKeyframe?.parameters?.amplitude - 2.35) > 0.001) {
        throw new Error(`${viewport.name} edited keyframe amplitude was not saved`);
      }
      if (fundamentalKeyframe?.easing !== 'ease-in-out') {
        throw new Error(`${viewport.name} edited keyframe easing was not saved`);
      }
      if (!editedKeyframes.some((keyframe) => keyframe.label === 'Key 4')) {
        throw new Error(`${viewport.name} captured parameter keyframe was not saved`);
      }
      await page.getByLabel('Show presentation overlay').uncheck();
      if (await page.locator('[aria-label="Presentation overlay"]').count()) {
        throw new Error(`${viewport.name} presentation overlay did not hide`);
      }
      await page.getByLabel('Show presentation overlay').check();

      await page.locator('canvas[aria-label="2D sine graph preview"]').waitFor();
      const beforeExpression = await canvasChecksum(page, 'canvas[aria-label="2D sine graph preview"]');
      await page.locator('select[aria-label="2D color map"]').selectOption('viridis');
      await page.waitForTimeout(300);
      const afterVisualStyle = await canvasChecksum(page, 'canvas[aria-label="2D sine graph preview"]');
      if (beforeExpression === afterVisualStyle) {
        throw new Error(`${viewport.name} visual style controls did not affect the 2D render`);
      }
      await page.locator('input[aria-label="Show 2D tangent"]').uncheck();
      await page.waitForTimeout(300);
      const afterAnnotationStyle = await canvasChecksum(page, 'canvas[aria-label="2D sine graph preview"]');
      if (afterVisualStyle === afterAnnotationStyle) {
        throw new Error(`${viewport.name} annotation controls did not affect the 2D render`);
      }
      const svgPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'SVG' }).click();
      const svgDownload = await svgPromise;
      if (!svgDownload.suggestedFilename().endsWith('.svg')) {
        throw new Error(`${viewport.name} SVG export did not create an SVG`);
      }
      await page.locator('input[aria-label="2D expression"]').fill('a*');
      await page.getByText('Missing operand').waitFor();
      await page.locator('input[aria-label="2D expression"]').fill('a*cos(b*x+phi)');
      await page.getByText('Expression OK').waitFor();
      await page.waitForTimeout(300);
      const afterExpression = await canvasChecksum(page, 'canvas[aria-label="2D sine graph preview"]');
      if (beforeExpression === afterExpression) {
        throw new Error(`${viewport.name} editable expression did not affect the 2D render`);
      }
      const plotSamples = await sampleCanvas(page, 'canvas[aria-label="2D sine graph preview"]');
      assertPixelVariety(plotSamples, `${viewport.name} 2D plot`);
      const snapshotPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export' }).click();
      const snapshot = await snapshotPromise;
      if (!snapshot.suggestedFilename().endsWith('.png')) {
        throw new Error(`${viewport.name} snapshot export did not create a PNG`);
      }
      const beforePlayback = await canvasChecksum(page, 'canvas[aria-label="2D sine graph preview"]');

      await page.getByRole('button', { name: 'Toggle timeline playback' }).click();
      await page.waitForTimeout(900);
      await page.getByRole('button', { name: 'Toggle timeline playback' }).click();
      const afterPlayback = await canvasChecksum(page, 'canvas[aria-label="2D sine graph preview"]');
      if (beforePlayback === afterPlayback) {
        throw new Error(`${viewport.name} timeline playback did not affect the 2D render`);
      }

      await page.getByRole('button', { name: 'Load Parametric Orbit template' }).click();
      await page.getByText('Parametric curve mode').waitFor();
      await page.waitForTimeout(300);
      const parametricSamples = await sampleCanvas(page, 'canvas[aria-label="2D sine graph preview"]');
      assertPixelVariety(parametricSamples, `${viewport.name} parametric curve`);
      const parametricDownloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      const parametricDownload = await parametricDownloadPromise;
      const parametricProjectPath = await parametricDownload.path();
      if (!parametricProjectPath) {
        throw new Error(`${viewport.name} parametric project download did not produce a file`);
      }
      const parametricProject = JSON.parse(await readFile(parametricProjectPath, 'utf8'));
      if (parametricProject.scenes[0].plotMode !== 'parametric') {
        throw new Error(`${viewport.name} parametric template was not saved`);
      }

      await page.getByRole('button', { name: 'Load Eigen Transform template' }).click();
      await page.getByText('Linear transform mode').waitFor();
      await page.waitForTimeout(300);
      const linearSamples = await sampleCanvas(page, 'canvas[aria-label="2D sine graph preview"]');
      assertPixelVariety(linearSamples, `${viewport.name} linear transform`);
      const linearDownloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      const linearDownload = await linearDownloadPromise;
      const linearProjectPath = await linearDownload.path();
      if (!linearProjectPath) {
        throw new Error(`${viewport.name} linear-transform project download did not produce a file`);
      }
      const linearProject = JSON.parse(await readFile(linearProjectPath, 'utf8'));
      if (linearProject.scenes[0].plotMode !== 'linear-transform') {
        throw new Error(`${viewport.name} linear-transform template was not saved`);
      }

      await page.getByRole('button', { name: 'Load Phase Portrait template' }).click();
      await page.getByText('Vector field mode').waitFor();
      await page.waitForTimeout(300);
      const vectorSamples = await sampleCanvas(page, 'canvas[aria-label="2D sine graph preview"]');
      assertPixelVariety(vectorSamples, `${viewport.name} vector field`);
      const vectorDownloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      const vectorDownload = await vectorDownloadPromise;
      const vectorProjectPath = await vectorDownload.path();
      if (!vectorProjectPath) {
        throw new Error(`${viewport.name} vector-field project download did not produce a file`);
      }
      const vectorProject = JSON.parse(await readFile(vectorProjectPath, 'utf8'));
      if (vectorProject.scenes[0].plotMode !== 'vector-field') {
        throw new Error(`${viewport.name} vector-field template was not saved`);
      }

      await page.getByRole('button', { name: 'Load 3D Surface Ripple template' }).click();
      await page.locator('.three-host canvas').waitFor();
      await page.waitForTimeout(500);
      const surfaceSignature = await canvasDataUrlSignature(page, '.three-host canvas');
      if (surfaceSignature.length < 12000) {
        throw new Error(`${viewport.name} 3D surface appears blank or under-rendered`);
      }
      await page.locator('select[aria-label="2D color map"]').selectOption('viridis');
      await page.waitForTimeout(500);
      const recoloredSurfaceSignature = await canvasDataUrlSignature(page, '.three-host canvas');
      if (surfaceSignature.checksum === recoloredSurfaceSignature.checksum) {
        throw new Error(`${viewport.name} 3D color map controls did not affect the render`);
      }
      await page.locator('select[aria-label="3D surface style"]').selectOption('wireframe');
      await page.locator('input[aria-label="3D rotation speed"]').fill('0.006');
      await page.locator('input[aria-label="3D height scale"]').fill('1.8');
      await page.locator('input[aria-label="3D mesh density"]').fill('48');
      await page.waitForTimeout(500);
      const styledSurfaceSignature = await canvasDataUrlSignature(page, '.three-host canvas');
      if (recoloredSurfaceSignature.checksum === styledSurfaceSignature.checksum) {
        throw new Error(`${viewport.name} 3D visual style controls did not affect the render`);
      }
      await page.locator('input[aria-label="Camera keyframe Wide orbit fov"]').fill('52');
      await page.locator('input[aria-label="Camera keyframe Wide orbit position 0"]').fill('7.1');
      await page.locator('select[aria-label="Camera keyframe Wide orbit easing"]').selectOption('linear');
      await page.getByRole('button', { name: 'Capture camera keyframe' }).click();
      await page.getByText('Captured camera keyframe').waitFor();

      const cameraDownloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      const cameraDownload = await cameraDownloadPromise;
      const cameraProjectPath = await cameraDownload.path();
      if (!cameraProjectPath) {
        throw new Error(`${viewport.name} camera project download did not produce a file`);
      }
      const cameraProject = JSON.parse(await readFile(cameraProjectPath, 'utf8'));
      if (
        cameraProject.scenes[0].visual?.surfaceStyle !== 'wireframe' ||
        cameraProject.scenes[0].visual?.colorMap !== 'viridis' ||
        Math.abs(cameraProject.scenes[0].visual?.rotationSpeed - 0.006) > 0.000001 ||
        Math.abs(cameraProject.scenes[0].visual?.surfaceHeightScale - 1.8) > 0.001 ||
        cameraProject.scenes[0].visual?.surfaceResolution !== 48
      ) {
        throw new Error(`${viewport.name} 3D visual settings were not saved`);
      }
      const cameraKeyframes = cameraProject.scenes[0].cameraKeyframes;
      const wideCamera = cameraKeyframes.find((keyframe) => keyframe.id === 'surface-cam-wide');
      if (Math.abs(wideCamera?.camera?.fovDegrees - 52) > 0.001) {
        throw new Error(`${viewport.name} edited camera FOV was not saved`);
      }
      if (Math.abs(wideCamera?.camera?.position?.[0] - 7.1) > 0.001) {
        throw new Error(`${viewport.name} edited camera position was not saved`);
      }
      if (wideCamera?.easing !== 'linear') {
        throw new Error(`${viewport.name} edited camera easing was not saved`);
      }
      if (!cameraKeyframes.some((keyframe) => keyframe.label === 'Camera 4')) {
        throw new Error(`${viewport.name} captured camera keyframe was not saved`);
      }
      const surfaceBeforeCamera = await canvasDataUrlSignature(page, '.three-host canvas');
      await page.locator('input[aria-label="Timeline scrubber"]').fill('6');
      await page.waitForTimeout(500);
      const surfaceAfterCamera = await canvasDataUrlSignature(page, '.three-host canvas');
      if (surfaceBeforeCamera.checksum === surfaceAfterCamera.checksum) {
        throw new Error(`${viewport.name} camera timeline did not affect 3D render`);
      }
      await page.locator('input[aria-label="Export frame count"]').fill('2');
      const surfaceSequencePromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'PNG Seq' }).click();
      const surfaceSequenceDownload = await surfaceSequencePromise;
      if (!surfaceSequenceDownload.suggestedFilename().startsWith('mathscape-3d-frame-')) {
        throw new Error(`${viewport.name} 3D PNG sequence did not create 3D frames`);
      }
      await page.getByText('3D PNG frames saved from viewport').waitFor();

      await page.getByRole('button', { name: 'Load 3D Helix Curve template' }).click();
      await page.locator('.three-host canvas').waitFor();
      await page.waitForTimeout(500);
      const helixSignature = await canvasDataUrlSignature(page, '.three-host canvas');
      if (helixSignature.length < 12000) {
        throw new Error(`${viewport.name} 3D helix curve appears blank or under-rendered`);
      }
      await page.locator('select[aria-label="3D render mode"]').selectOption('surface');
      await page.waitForTimeout(500);
      const helixAsSurfaceSignature = await canvasDataUrlSignature(page, '.three-host canvas');
      if (helixSignature.checksum === helixAsSurfaceSignature.checksum) {
        throw new Error(`${viewport.name} 3D render mode control did not affect the render`);
      }
      await page.locator('select[aria-label="3D render mode"]').selectOption('curve');

      const helixDownloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      const helixDownload = await helixDownloadPromise;
      const helixProjectPath = await helixDownload.path();
      if (!helixProjectPath) {
        throw new Error(`${viewport.name} helix project download did not produce a file`);
      }
      const helixProject = JSON.parse(await readFile(helixProjectPath, 'utf8'));
      if (helixProject.scenes[0].visual?.threeMode !== 'curve') {
        throw new Error(`${viewport.name} 3D helix render mode was not saved`);
      }

      await page.getByRole('button', { name: 'Complex' }).click();
      await page.locator('canvas[aria-label*="Complex domain coloring preview"]').waitFor();
      const complexSamples = await sampleCanvas(page, 'canvas[aria-label*="Complex domain coloring preview"]');
      assertPixelVariety(complexSamples, `${viewport.name} complex domain coloring`);
      const complexBeforeZeta = await canvasChecksum(page, 'canvas[aria-label*="Complex domain coloring preview"]');

      await page.getByRole('button', { name: 'Zeta', exact: true }).click();
      await page.waitForTimeout(600);
      await page.locator('canvas[aria-label*="zeta critical line and zero markers"]').waitFor();
      const zetaSamples = await sampleCanvas(page, 'canvas[aria-label*="Complex domain coloring preview"]');
      assertPixelVariety(zetaSamples, `${viewport.name} zeta domain coloring`);
      const complexAfterZeta = await canvasChecksum(page, 'canvas[aria-label*="Complex domain coloring preview"]');
      if (complexBeforeZeta === complexAfterZeta) {
        throw new Error(`${viewport.name} zeta preset did not affect complex render`);
      }
      await page.locator('input[aria-label="Export frame count"]').fill('2');
      const complexSequencePromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'PNG Seq' }).click();
      const complexSequenceDownload = await complexSequencePromise;
      if (!complexSequenceDownload.suggestedFilename().startsWith('mathscape-complex-frame-')) {
        throw new Error(`${viewport.name} complex PNG sequence did not create complex frames`);
      }
      await page.getByText('Complex PNG frames saved').waitFor();

      await page.getByRole('button', { name: 'MP4' }).click();
      await page.getByText('MP4 export is available in the Tauri app').waitFor();

      await page.getByRole('button', { name: '2D' }).click();
      await page.locator('canvas[aria-label="2D sine graph preview"]').waitFor();
      await page.getByRole('button', { name: 'Apply pulse and zoom animation preset' }).click();
      await page.getByText('Pulse and zoom preset applied').waitFor();
      const presetBeforeSeek = await canvasChecksum(page, 'canvas[aria-label="2D sine graph preview"]');
      await page.locator('input[aria-label="Timeline scrubber"]').fill('5');
      await page.waitForTimeout(300);
      const presetAfterSeek = await canvasChecksum(page, 'canvas[aria-label="2D sine graph preview"]');
      if (presetBeforeSeek === presetAfterSeek) {
        throw new Error(`${viewport.name} animation preset did not drive the 2D timeline render`);
      }
      const presetDownloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      const presetDownload = await presetDownloadPromise;
      const presetProjectPath = await presetDownload.path();
      if (!presetProjectPath) {
        throw new Error(`${viewport.name} preset project download did not produce a file`);
      }
      const presetProject = JSON.parse(await readFile(presetProjectPath, 'utf8'));
      const presetScene = presetProject.scenes[0];
      if (Math.abs(presetScene.durationSeconds - 10) > 0.001) {
        throw new Error(`${viewport.name} animation preset duration was not saved`);
      }
      if (!presetScene.parameterKeyframes.some((keyframe) => keyframe.id === 'preset-param-pulse')) {
        throw new Error(`${viewport.name} animation preset parameter keys were not saved`);
      }
      if (!presetScene.cameraKeyframes.some((keyframe) => keyframe.id === 'preset-cam-punch')) {
        throw new Error(`${viewport.name} animation preset camera keys were not saved`);
      }
      if (!presetScene.timeline.some((marker) => marker.label === 'Build' && Math.abs(marker.atPercent - 50) < 0.001)) {
        throw new Error(`${viewport.name} animation preset timeline markers were not saved`);
      }

      await page.screenshot({ path: `artifacts/visual-check-${viewport.name}.png`, fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
