/* Four-neighbour, earliest-arrival propagation. Resistant cells receive smoke,
   but never enter the queue and can never relay it. Times are in seconds. */
(function (root) {
  'use strict';
  function makeBoard(cols, rows, random = Math.random) {
    const center = Math.floor(rows / 2) * cols + Math.floor(cols / 2);
    const immune = new Set([cols + 1, (rows - 2) * cols + cols - 2]);
    const cells = Array.from({ length: cols * rows }, (_, id) => ({
      id, col: id % cols, row: Math.floor(id / cols), immune: immune.has(id), at: Infinity
    }));
    const edges = [], queue = [center];
    cells[center].at = 0;
    while (queue.length) {
      queue.sort((a, b) => cells[a].at - cells[b].at);
      const id = queue.shift(), cell = cells[id];
      if (cell.visited) continue;
      cell.visited = true;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const x = cell.col + dx, y = cell.row + dy;
        if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
        const next = cells[y * cols + x];
        if (next.at <= cell.at) continue;
        const start = cell.at + 0.52 + random() * 0.18;
        const end = start + 0.78 + random() * 0.28;
        if (next.immune) edges.push({ from: id, to: next.id, start, end, blocked: true });
        else if (end < next.at) {
          next.at = end;
          next.incoming = { from: id, to: next.id, start, end, blocked: false };
          queue.push(next.id);
        }
      }
    }
    cells.forEach(c => { if (c.incoming) edges.push(c.incoming); delete c.visited; delete c.incoming; });
    return { cols, rows, center, cells, edges, duration: Math.max(...cells.filter(c => !c.immune).map(c => c.at)) + 1.2 };
  }
  root.AngerContagion = { makeBoard };
  if (typeof module !== 'undefined') module.exports = root.AngerContagion;
})(typeof window === 'undefined' ? globalThis : window);
