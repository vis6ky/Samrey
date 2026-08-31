/**
 * @license Apache-2.0
 * @samrey/icons - Pure Native SVG Icon Factory
 * Zero external framework dependencies. Generates accessible, scalable SVG elements directly.
 */

import { svgEl } from '@samrey/runtime';

export type IconName =
  | 'layers'
  | 'cpu'
  | 'shield-check'
  | 'shield-alert'
  | 'lock'
  | 'alert-octagon'
  | 'git-pull-request'
  | 'git-branch'
  | 'book-open'
  | 'activity'
  | 'file-code'
  | 'milestone'
  | 'box'
  | 'arrow-right'
  | 'arrow-down'
  | 'check'
  | 'check-circle'
  | 'alert-triangle'
  | 'alert-circle'
  | 'copy'
  | 'download'
  | 'search'
  | 'filter'
  | 'play'
  | 'rotate-ccw'
  | 'clock'
  | 'zap'
  | 'sparkles'
  | 'terminal'
  | 'hard-drive'
  | 'ban'
  | 'sun'
  | 'moon'
  | 'menu'
  | 'x'
  | 'chevron-right'
  | 'chevron-down'
  | 'hash'
  | 'external-link'
  | 'code'
  | 'eye'
  | 'refresh-cw'
  | 'thumbs-up'
  | 'thumbs-down'
  | 'help-circle'
  | 'message-square'
  | 'layout';

export function icon(name: IconName, className = 'w-4 h-4'): SVGElement {
  const svg = svgEl('svg', {
    class: className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true'
  });

  switch (name) {
    case 'layers':
      svg.appendChild(svgEl('path', { d: 'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z' }));
      svg.appendChild(svgEl('path', { d: 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65' }));
      svg.appendChild(svgEl('path', { d: 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65' }));
      break;

    case 'cpu':
      svg.appendChild(svgEl('rect', { width: '16', height: '16', x: '4', y: '4', rx: '2' }));
      svg.appendChild(svgEl('rect', { width: '6', height: '6', x: '9', y: '9', rx: '1' }));
      svg.appendChild(svgEl('path', { d: 'M15 2v2' }));
      svg.appendChild(svgEl('path', { d: 'M15 20v2' }));
      svg.appendChild(svgEl('path', { d: 'M2 15h2' }));
      svg.appendChild(svgEl('path', { d: 'M2 9h2' }));
      svg.appendChild(svgEl('path', { d: 'M20 15h2' }));
      svg.appendChild(svgEl('path', { d: 'M20 9h2' }));
      svg.appendChild(svgEl('path', { d: 'M9 2v2' }));
      svg.appendChild(svgEl('path', { d: 'M9 20v2' }));
      break;

    case 'shield-check':
      svg.appendChild(svgEl('path', { d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' }));
      svg.appendChild(svgEl('path', { d: 'm9 12 2 2 4-4' }));
      break;

    case 'shield-alert':
      svg.appendChild(svgEl('path', { d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' }));
      svg.appendChild(svgEl('path', { d: 'M12 8v4' }));
      svg.appendChild(svgEl('path', { d: 'M12 16h.01' }));
      break;

    case 'lock':
      svg.appendChild(svgEl('rect', { width: '18', height: '11', x: '3', y: '11', rx: '2', ry: '2' }));
      svg.appendChild(svgEl('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }));
      break;

    case 'alert-octagon':
      svg.appendChild(svgEl('polygon', { points: '7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2' }));
      svg.appendChild(svgEl('line', { x1: '12', x2: '12', y1: '8', y2: '12' }));
      svg.appendChild(svgEl('line', { x1: '12', x2: '12.01', y1: '16', y2: '16' }));
      break;

    case 'git-pull-request':
      svg.appendChild(svgEl('circle', { cx: '18', cy: '18', r: '3' }));
      svg.appendChild(svgEl('circle', { cx: '6', cy: '6', r: '3' }));
      svg.appendChild(svgEl('path', { d: 'M13 6h3a2 2 0 0 1 2 2v7' }));
      svg.appendChild(svgEl('line', { x1: '6', x2: '6', y1: '9', y2: '21' }));
      break;

    case 'git-branch':
      svg.appendChild(svgEl('line', { x1: '6', x2: '6', y1: '3', y2: '15' }));
      svg.appendChild(svgEl('circle', { cx: '18', cy: '9', r: '3' }));
      svg.appendChild(svgEl('circle', { cx: '6', cy: '18', r: '3' }));
      svg.appendChild(svgEl('path', { d: 'M18 9a9 9 0 0 1-9 9' }));
      break;

    case 'book-open':
      svg.appendChild(svgEl('path', { d: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z' }));
      svg.appendChild(svgEl('path', { d: 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' }));
      break;

    case 'activity':
      svg.appendChild(svgEl('path', { d: 'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.48 12H2' }));
      break;

    case 'file-code':
      svg.appendChild(svgEl('path', { d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' }));
      svg.appendChild(svgEl('path', { d: 'M14 2v4a2 2 0 0 0 2 2h4' }));
      svg.appendChild(svgEl('path', { d: 'm10 13-2 2 2 2' }));
      svg.appendChild(svgEl('path', { d: 'm14 17 2-2-2-2' }));
      break;

    case 'milestone':
      svg.appendChild(svgEl('path', { d: 'M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z' }));
      svg.appendChild(svgEl('path', { d: 'M12 13v8' }));
      svg.appendChild(svgEl('path', { d: 'M12 3v3' }));
      break;

    case 'box':
      svg.appendChild(svgEl('path', { d: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' }));
      svg.appendChild(svgEl('path', { d: 'm3.3 7 8.7 5 8.7-5' }));
      svg.appendChild(svgEl('path', { d: 'M12 22V12' }));
      break;

    case 'arrow-right':
      svg.appendChild(svgEl('path', { d: 'M5 12h14' }));
      svg.appendChild(svgEl('path', { d: 'm12 5 7 7-7 7' }));
      break;

    case 'arrow-down':
      svg.appendChild(svgEl('path', { d: 'M12 5v14' }));
      svg.appendChild(svgEl('path', { d: 'm19 12-7 7-7-7' }));
      break;

    case 'check':
      svg.appendChild(svgEl('polyline', { points: '20 6 9 17 4 12' }));
      break;

    case 'check-circle':
      svg.appendChild(svgEl('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }));
      svg.appendChild(svgEl('polyline', { points: '22 4 12 14.01 9 11.01' }));
      break;

    case 'alert-triangle':
      svg.appendChild(svgEl('path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' }));
      svg.appendChild(svgEl('line', { x1: '12', x2: '12', y1: '9', y2: '13' }));
      svg.appendChild(svgEl('line', { x1: '12', x2: '12.01', y1: '17', y2: '17' }));
      break;

    case 'alert-circle':
      svg.appendChild(svgEl('circle', { cx: '12', cy: '12', r: '10' }));
      svg.appendChild(svgEl('line', { x1: '12', x2: '12', y1: '8', y2: '12' }));
      svg.appendChild(svgEl('line', { x1: '12', x2: '12.01', y1: '16', y2: '16' }));
      break;

    case 'copy':
      svg.appendChild(svgEl('rect', { width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2' }));
      svg.appendChild(svgEl('path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }));
      break;

    case 'download':
      svg.appendChild(svgEl('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }));
      svg.appendChild(svgEl('polyline', { points: '7 10 12 15 17 10' }));
      svg.appendChild(svgEl('line', { x1: '12', x2: '12', y1: '15', y2: '3' }));
      break;

    case 'search':
      svg.appendChild(svgEl('circle', { cx: '11', cy: '11', r: '8' }));
      svg.appendChild(svgEl('path', { d: 'm21 21-4.3-4.3' }));
      break;

    case 'filter':
      svg.appendChild(svgEl('polygon', { points: '22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' }));
      break;

    case 'play':
      svg.appendChild(svgEl('polygon', { points: '6 3 20 12 6 21 6 3' }));
      break;

    case 'rotate-ccw':
      svg.appendChild(svgEl('path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }));
      svg.appendChild(svgEl('path', { d: 'M3 3v5h5' }));
      break;

    case 'clock':
      svg.appendChild(svgEl('circle', { cx: '12', cy: '12', r: '10' }));
      svg.appendChild(svgEl('polyline', { points: '12 6 12 12 16 14' }));
      break;

    case 'zap':
      svg.appendChild(svgEl('polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' }));
      break;

    case 'sparkles':
      svg.appendChild(svgEl('path', { d: 'm12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z' }));
      break;

    case 'terminal':
      svg.appendChild(svgEl('polyline', { points: '4 17 10 11 4 5' }));
      svg.appendChild(svgEl('line', { x1: '12', x2: '20', y1: '19', y2: '19' }));
      break;

    case 'hard-drive':
      svg.appendChild(svgEl('line', { x1: '12', x2: '12.01', y1: '18', y2: '18' }));
      svg.appendChild(svgEl('rect', { width: '20', height: '8', x: '2', y: '14', rx: '2' }));
      svg.appendChild(svgEl('path', { d: 'M6 14V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10' }));
      break;

    case 'ban':
      svg.appendChild(svgEl('circle', { cx: '12', cy: '12', r: '10' }));
      svg.appendChild(svgEl('path', { d: 'm4.9 4.9 14.2 14.2' }));
      break;

    case 'sun':
      svg.appendChild(svgEl('circle', { cx: '12', cy: '12', r: '4' }));
      svg.appendChild(svgEl('path', { d: 'M12 2v2' }));
      svg.appendChild(svgEl('path', { d: 'M12 20v2' }));
      svg.appendChild(svgEl('path', { d: 'm4.93 4.93 1.41 1.41' }));
      svg.appendChild(svgEl('path', { d: 'm17.66 17.66 1.41 1.41' }));
      svg.appendChild(svgEl('path', { d: 'M2 12h2' }));
      svg.appendChild(svgEl('path', { d: 'M20 12h2' }));
      svg.appendChild(svgEl('path', { d: 'm6.34 17.66-1.41 1.41' }));
      svg.appendChild(svgEl('path', { d: 'm19.07 4.93-1.41 1.41' }));
      break;

    case 'moon':
      svg.appendChild(svgEl('path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }));
      break;

    case 'menu':
      svg.appendChild(svgEl('line', { x1: '4', x2: '20', y1: '12', y2: '12' }));
      svg.appendChild(svgEl('line', { x1: '4', x2: '20', y1: '6', y2: '6' }));
      svg.appendChild(svgEl('line', { x1: '4', x2: '20', y1: '18', y2: '18' }));
      break;

    case 'x':
      svg.appendChild(svgEl('path', { d: 'M18 6 6 18' }));
      svg.appendChild(svgEl('path', { d: 'm6 6 12 12' }));
      break;

    case 'chevron-right':
      svg.appendChild(svgEl('path', { d: 'm9 18 6-6-6-6' }));
      break;

    case 'chevron-down':
      svg.appendChild(svgEl('path', { d: 'm6 9 6 6 6-6' }));
      break;

    case 'hash':
      svg.appendChild(svgEl('line', { x1: '4', x2: '20', y1: '9', y2: '9' }));
      svg.appendChild(svgEl('line', { x1: '4', x2: '20', y1: '15', y2: '15' }));
      svg.appendChild(svgEl('line', { x1: '10', x2: '8', y1: '3', y2: '21' }));
      svg.appendChild(svgEl('line', { x1: '16', x2: '14', y1: '3', y2: '21' }));
      break;

    case 'external-link':
      svg.appendChild(svgEl('path', { d: 'M15 3h6v6' }));
      svg.appendChild(svgEl('path', { d: 'M10 14 21 3' }));
      svg.appendChild(svgEl('path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }));
      break;

    case 'code':
      svg.appendChild(svgEl('polyline', { points: '16 18 22 12 16 6' }));
      svg.appendChild(svgEl('polyline', { points: '8 6 2 12 8 18' }));
      break;

    case 'eye':
      svg.appendChild(svgEl('path', { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' }));
      svg.appendChild(svgEl('circle', { cx: '12', cy: '12', r: '3' }));
      break;

    case 'refresh-cw':
      svg.appendChild(svgEl('path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }));
      svg.appendChild(svgEl('path', { d: 'M21 3v5h-5' }));
      svg.appendChild(svgEl('path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }));
      svg.appendChild(svgEl('path', { d: 'M8 16H3v5' }));
      break;

    case 'thumbs-up':
      svg.appendChild(svgEl('path', { d: 'M7 10v12' }));
      svg.appendChild(svgEl('path', { d: 'M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h3' }));
      break;

    case 'thumbs-down':
      svg.appendChild(svgEl('path', { d: 'M17 14V2' }));
      svg.appendChild(svgEl('path', { d: 'M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3' }));
      break;

    case 'help-circle':
      svg.appendChild(svgEl('circle', { cx: '12', cy: '12', r: '10' }));
      svg.appendChild(svgEl('path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }));
      svg.appendChild(svgEl('line', { x1: '12', y1: '17', x2: '12.01', y2: '17' }));
      break;

    case 'message-square':
      svg.appendChild(svgEl('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }));
      break;

    case 'layout':
      svg.appendChild(svgEl('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2', ry: '2' }));
      svg.appendChild(svgEl('line', { x1: '3', y1: '9', x2: '21', y2: '9' }));
      svg.appendChild(svgEl('line', { x1: '9', y1: '21', x2: '9', y2: '9' }));
      break;

    default:
      svg.appendChild(svgEl('circle', { cx: '12', cy: '12', r: '10' }));
      break;
  }

  return svg;
}
