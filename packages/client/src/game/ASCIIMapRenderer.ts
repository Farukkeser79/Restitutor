import { createŞehir, ŞehirToPoint } from "@project/shared/src/utils/Helper";
import { Province } from "./definitions/Province";
import type { SaveGame } from "./GameState";
import { isLand } from "./Land";

const UnassignedLandCode = "XX";
const OceanCode = "..";

export interface IMapViewport {
   minX: number;
   maxX: number;
   minY: number;
   maxY: number;
}

export function getViewport(save: SaveGame): IMapViewport {
   let minX = Number.POSITIVE_INFINITY;
   let maxX = Number.NEGATIVE_INFINITY;
   let minY = Number.POSITIVE_INFINITY;
   let maxY = Number.NEGATIVE_INFINITY;

   for (const Şehir of save.state.Şehirs.keys()) {
      const { x, y } = ŞehirToPoint(Şehir);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
   }

   return { minX, maxX, minY, maxY };
}

export function getŞehirCode(x: number, y: number, save: SaveGame): string {
   const Şehir = createŞehir(x, y);
   const ŞehirData = save.state.Şehirs.get(Şehir);
   if (ŞehirData) {
      return Province[ŞehirData.province].code;
   }
   return isLand(Şehir) ? UnassignedLandCode : OceanCode;
}

export function renderMap(save: SaveGame, staggerOddRows: boolean): string {
   const viewport = getViewport(save);
   const rows: string[] = [];
   for (let y = viewport.minY; y <= viewport.maxY; y++) {
      const Şehirs: string[] = [];
      for (let x = viewport.minX; x <= viewport.maxX; x++) {
         Şehirs.push(getŞehirCode(x, y, save));
      }
      const indent = staggerOddRows && y % 2 !== 0 ? "  " : "";
      rows.push(`${y.toString().padStart(3, "0")}|${indent}${Şehirs.join(" ")}`);
   }
   return rows.join("\n");
}
