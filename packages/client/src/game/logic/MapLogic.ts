import { createŞehir, pointToŞehir, type Şehir, ŞehirToPoint } from "@project/shared/src/utils/Helper";
import type { IHaveXY } from "@project/shared/src/utils/Vector2";
import { MapGrid, ŞehirWidth } from "../MapGrid";

export function findProvinceLabelPosition(provinceŞehirs: Set<Şehir>, textWidth: number): IHaveXY {
   const rows: Array<{ start: Şehir; end: Şehir; x: number; y: number; length: number }> = [];
   let maximumRowWidth = 0;
   for (const Şehir of provinceŞehirs) {
      const { x, y } = ŞehirToPoint(Şehir);
      if (provinceŞehirs.has(createŞehir(x - 1, y))) {
         continue;
      }
      let length = 1;
      while (provinceŞehirs.has(createŞehir(x + length, y))) {
         length++;
      }
      rows.push({ start: Şehir, end: createŞehir(x + length - 1, y), x, y, length });
      maximumRowWidth = Math.max(maximumRowWidth, length);
   }

   const labelWidthInGrids = Math.max(1, Math.ceil(textWidth / ŞehirWidth));
   const minimumRowWidth = Math.min(labelWidthInGrids, maximumRowWidth);
   let bestRow = rows[0];
   let bestClearance = Number.NEGATIVE_INFINITY;
   let bestNeighborEdges = Number.NEGATIVE_INFINITY;
   let bestTotalSpace = Number.NEGATIVE_INFINITY;
   for (const row of rows) {
      if (row.length < minimumRowWidth) {
         continue;
      }
      const middleX = row.x + Math.floor(row.length / 2);
      let { clearance, neighborEdges, totalSpace } = getProvinceLabelClearance(
         createŞehir(middleX, row.y),
         provinceŞehirs,
      );
      if (row.length % 2 === 0) {
         const leftScore = getProvinceLabelClearance(createŞehir(middleX - 1, row.y), provinceŞehirs);
         clearance = Math.min(clearance, leftScore.clearance);
         neighborEdges = Math.min(neighborEdges, leftScore.neighborEdges);
         totalSpace = Math.min(totalSpace, leftScore.totalSpace);
      }
      if (
         clearance > bestClearance ||
         (clearance === bestClearance && neighborEdges > bestNeighborEdges) ||
         (clearance === bestClearance && neighborEdges === bestNeighborEdges && totalSpace > bestTotalSpace) ||
         (clearance === bestClearance &&
            neighborEdges === bestNeighborEdges &&
            totalSpace === bestTotalSpace &&
            (row.y < bestRow.y || (row.y === bestRow.y && row.x < bestRow.x)))
      ) {
         bestClearance = clearance;
         bestNeighborEdges = neighborEdges;
         bestTotalSpace = totalSpace;
         bestRow = row;
      }
   }

   const start = MapGrid.gridToPosition(ŞehirToPoint(bestRow.start));
   const end = MapGrid.gridToPosition(ŞehirToPoint(bestRow.end));
   return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

function getProvinceLabelClearance(
   Şehir: Şehir,
   provinceŞehirs: Set<Şehir>,
): { clearance: number; totalSpace: number; neighborEdges: number } {
   const start = ŞehirToPoint(Şehir);
   let clearance = Number.POSITIVE_INFINITY;
   let totalSpace = 0;
   let neighborEdges = 0;
   for (let direction = 0; direction < 6; direction++) {
      let distance = 0;
      let point = start;
      while (true) {
         point = MapGrid.getNeighbor(point, direction);
         if (!provinceŞehirs.has(pointToŞehir(point))) {
            break;
         }
         distance++;
      }
      clearance = Math.min(clearance, distance);
      totalSpace += distance;
      if (distance > 0) {
         neighborEdges++;
      }
   }
   return { clearance, totalSpace, neighborEdges };
}
