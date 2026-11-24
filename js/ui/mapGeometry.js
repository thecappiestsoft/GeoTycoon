/*
 * mapGeometry.js — deterministyczne generowanie kształtów 12 regionów fikcyjnej mapy (SVG).
 * Siatka 5×4 wierzchołków z przesunięciami; wspólne krawędzie sąsiadów są identyczne,
 * więc granice pasują do siebie bez szczelin. Wynik jest stały (bez losowości przy każdym uruchomieniu).
 */
(function (GT) {
  var W = 1000, H = 680;
  var XS = [70, 290, 505, 720, 935];
  var YS = [45, 245, 445, 640];
  var COLS = 4, ROWS = 3;

  // Prosty deterministyczny hash → [−1, 1]
  function noise(a, b, c) {
    var x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  }

  var vertexCache = {};
  function vertex(i, j) {
    var key = i + "," + j;
    if (vertexCache[key]) return vertexCache[key];
    var onBorderX = i === 0 || i === COLS, onBorderY = j === 0 || j === ROWS;
    var amp = onBorderX || onBorderY ? 22 : 48;
    var x = XS[i] + (onBorderX ? noise(i, j, 1) * 18 : noise(i, j, 1) * amp);
    var y = YS[j] + (onBorderY ? noise(i, j, 2) * 18 : noise(i, j, 2) * amp * 0.8);
    return (vertexCache[key] = [x, y]);
  }

  /** Punkty krawędzi między wierzchołkami a→b (z falowaniem). Wspólne dla obu regionów. */
  function edgePoints(a, b) {
    var ka = a[0] + "," + a[1], kb = b[0] + "," + b[1];
    var forward = ka < kb;
    var p = forward ? [a, b] : [b, a];
    var va = vertex(p[0][0], p[0][1]), vb = vertex(p[1][0], p[1][1]);
    var border = (p[0][0] === p[1][0] && (p[0][0] === 0 || p[0][0] === COLS)) ||
                 (p[0][1] === p[1][1] && (p[0][1] === 0 || p[0][1] === ROWS));
    var west = border && p[0][0] === 0 && p[1][0] === 0;
    var segs = border ? 7 : 5;
    var amp = west ? 34 : border ? 16 : 14;
    var dx = vb[0] - va[0], dy = vb[1] - va[1];
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;
    var pts = [];
    for (var s = 1; s < segs; s++) {
      var t = s / segs;
      var n = noise(p[0][0] * 7 + p[1][0] * 3 + s, p[0][1] * 5 + p[1][1] * 11, s * 1.7) * amp * Math.sin(Math.PI * t);
      pts.push([va[0] + dx * t + nx * n, va[1] + dy * t + ny * n]);
    }
    return forward ? pts : pts.reverse();
  }

  function regionPolygon(col, row) {
    var corners = [[col, row], [col + 1, row], [col + 1, row + 1], [col, row + 1]];
    var pts = [];
    for (var k = 0; k < 4; k++) {
      var a = corners[k], b = corners[(k + 1) % 4];
      pts.push(vertex(a[0], a[1]));
      pts = pts.concat(edgePoints(a, b));
    }
    return pts;
  }

  function toPath(pts) {
    return "M" + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join("L") + "Z";
  }

  function centroid(col, row) {
    var c = [vertex(col, row), vertex(col + 1, row), vertex(col + 1, row + 1), vertex(col, row + 1)];
    return [(c[0][0] + c[1][0] + c[2][0] + c[3][0]) / 4, (c[0][1] + c[1][1] + c[2][1] + c[3][1]) / 4];
  }

  /** Gładka ścieżka (Catmull-Rom → Bezier). */
  function smoothPath(points) {
    var d = "M" + points[0][0].toFixed(1) + "," + points[0][1].toFixed(1);
    for (var i = 0; i < points.length - 1; i++) {
      var p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      var c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += "C" + c1[0].toFixed(1) + "," + c1[1].toFixed(1) + " " + c2[0].toFixed(1) + "," + c2[1].toFixed(1) + " " + p2[0].toFixed(1) + "," + p2[1].toFixed(1);
    }
    return d;
  }

  /** Rzeka: od gór na wschodzie (Przełęcz Orla) do ujścia na zachodzie (Port Zachodni). */
  function riverPath() {
    var c8 = centroid(3, 1), c7 = centroid(2, 1), c6 = centroid(1, 1), c5 = centroid(0, 1);
    var pts = [
      [c8[0] + 120, c8[1] - 40],
      [c8[0] + 30, c8[1] + 62],
      [c7[0] + 20, c7[1] + 58],
      [c6[0] + 10, c6[1] + 64],
      [c5[0] + 30, c5[1] + 60],
      [vertex(0, 1)[0] + (vertex(0, 2)[0] - vertex(0, 1)[0]) * 0.55 - 30, c5[1] + 66]
    ];
    return smoothPath(pts);
  }

  function countryPath() {
    var pts = [];
    var ring = [];
    for (var i = 0; i < COLS; i++) ring.push([i, 0]);
    for (var j = 0; j < ROWS; j++) ring.push([COLS, j]);
    for (var i2 = COLS; i2 > 0; i2--) ring.push([i2, ROWS]);
    for (var j2 = ROWS; j2 > 0; j2--) ring.push([0, j2]);
    for (var k = 0; k < ring.length; k++) {
      var a = ring[k], b = ring[(k + 1) % ring.length];
      pts.push(vertex(a[0], a[1]));
      pts = pts.concat(edgePoints(a, b));
    }
    return toPath(pts);
  }

  GT.mapGeometry = {
    WIDTH: W, HEIGHT: H,
    VIEWBOX: "22 18 960 650",  // kadr przycięty do kraju (mapa jest większa na ekranie)
    regionPath: function (col, row) { return toPath(regionPolygon(col, row)); },
    centroid: centroid,
    riverPath: riverPath,
    countryPath: countryPath
  };
})(window.GT = window.GT || {});
