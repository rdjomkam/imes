/* IMES Agent — compact line-icon set (Lucide-style, 24px grid, 1.75 stroke).
   Self-contained so the projected demo never depends on a CDN.
   Exposes window.IMESIcon (a React component). */
(function () {
  const P = {
    fingerprint: ['M12 5.5c-3 0-5.5 2.4-5.5 5.4v2.2', 'M6.7 17.5c.4-1 .6-2.1.6-3.2v-2.4a4.7 4.7 0 0 1 9.4 0v2.4', 'M12 9.5a1.7 1.7 0 0 0-1.7 1.7v2.7c0 1.6-.4 3.2-1.2 4.6', 'M15.4 18.5c.3-1.1.4-2.3.4-3.4v-3.9', 'M9.5 6.3a5.5 5.5 0 0 1 7.7 4.9'],
    globe: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M3.3 9h17.4', 'M3.3 15h17.4', 'M12 3c2.5 2.4 3.9 5.6 3.9 9s-1.4 6.6-3.9 9c-2.5-2.4-3.9-5.6-3.9-9S9.5 5.4 12 3Z'],
    activity: ['M3 12h4l3 8 4-16 3 8h4'],
    target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z', 'M12 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z'],
    compass: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M15.8 8.2 13.6 13.6 8.2 15.8 10.4 10.4 15.8 8.2Z'],
    'pen-line': ['M4 20h4', 'M14.5 4.5l3 3', 'M5 17l9.5-9.5 3 3L8 20H5v-3Z'],
    shield: ['M12 3l7 3v5c0 4.4-3 8.3-7 9.5-4-1.2-7-5.1-7-9.5V6l7-3Z', 'M9 12l2 2 4-4'],
    search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z', 'M20 20l-4-4'],
    sparkles: ['M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z', 'M18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z'],
    play: ['M7 4.5v15l13-7.5-13-7.5Z'],
    'rotate-ccw': ['M4 5v5h5', 'M4.6 14a8 8 0 1 0 1.3-7.5L4 10'],
    check: ['M5 12.5l4.5 4.5L19 7'],
    'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
    mail: ['M4 6h16v12H4V6Z', 'M4.5 6.5 12 13l7.5-6.5'],
    'chevron-right': ['M9 6l6 6-6 6'],
    'file-text': ['M7 3h7l5 5v13H7V3Z', 'M14 3v5h5', 'M10 13h6', 'M10 17h6'],
    'building-2': ['M4 21V7l6-3v17', 'M10 21V9l9 3v9', 'M4 21h17', 'M13 13h.01', 'M13 16.5h.01'],
    lock: ['M6 11h12v9H6v-9Z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
    'wifi-off': ['M3 4l18 18', 'M5 9a14 14 0 0 1 4-2.3', 'M2 8.8A18 18 0 0 1 6.5 6', 'M9.5 13a7 7 0 0 1 6.3-.3', 'M12 17h.01'],
    quote: ['M7 7h4v6c0 2-1.5 3.5-3.5 4', 'M14 7h4v6c0 2-1.5 3.5-3.5 4'],
    layers: ['M12 3l9 5-9 5-9-5 9-5Z', 'M3 13l9 5 9-5'],
    zap: ['M13 3 5 13h6l-1 8 8-10h-6l1-8Z'],
  };

  function IMESIcon({ name, size = 22, stroke = 1.75, color = 'currentColor', style = {} }) {
    const paths = P[name];
    if (!paths) return null;
    return React.createElement(
      'svg',
      {
        width: size, height: size, viewBox: '0 0 24 24',
        fill: 'none', stroke: color, strokeWidth: stroke,
        strokeLinecap: 'round', strokeLinejoin: 'round',
        style: { display: 'block', flex: 'none', ...style },
        'aria-hidden': true,
      },
      paths.map((d, i) => React.createElement('path', { key: i, d }))
    );
  }

  window.IMESIcon = IMESIcon;
})();
