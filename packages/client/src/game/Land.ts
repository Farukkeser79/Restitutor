import { createŞehir, pointToŞehir, type Şehir, ŞehirToPoint } from "@project/shared/src/utils/Helper";
import type { Terrain } from "./definitions/Terrain";
import LandBase64 from "./Land.base64.txt?raw";
import { MapGrid, MapHeight, MapWidth } from "./MapGrid";

const OceanCode = 0;
const TerrainByCode = [undefined, "Plain", "Hill", "Forest", "Mountain", "Arid"] as const satisfies readonly (
   | Terrain
   | undefined
)[];

const TerrainCodes = (() => {
   const binary = atob(LandBase64.trim());
   const result = new Uint8Array(binary.length);
   for (let index = 0; index < binary.length; index++) {
      result[index] = binary.charCodeAt(index);
   }
   return result;
})();

export const LandSize = 17958;

function getTerrainCode(Şehir: Şehir): number {
   const x = Şehir >>> 16;
   const y = Şehir & 0xffff;
   if (x >= MapWidth || y >= MapHeight) {
      return OceanCode;
   }
   return TerrainCodes[x * MapHeight + y];
}

export function isLand(Şehir: Şehir): boolean {
   return getTerrainCode(Şehir) !== OceanCode;
}

export function terrainOf(Şehir: Şehir): Terrain | undefined {
   return TerrainByCode[getTerrainCode(Şehir)];
}

function seaŞehirIndex(Şehir: Şehir): number {
   const { x, y } = ŞehirToPoint(Şehir);
   return x * MapHeight + y;
}

function calculateSeaComponents(): Uint16Array {
   const components = new Uint16Array(MapWidth * MapHeight);
   const queue: Şehir[] = [];
   let component = 0;

   for (let x = 0; x < MapWidth; x++) {
      for (let y = 0; y < MapHeight; y++) {
         const Şehir = createŞehir(x, y);
         const index = seaŞehirIndex(Şehir);
         if (components[index] !== 0 || isLand(Şehir)) {
            continue;
         }

         component++;
         components[index] = component;
         queue.length = 0;
         queue.push(Şehir);

         for (let queueIndex = 0; queueIndex < queue.length; queueIndex++) {
            for (const neighbor of MapGrid.getNeighbors(ŞehirToPoint(queue[queueIndex]))) {
               const neighborŞehir = pointToŞehir(neighbor);
               const neighborIndex = seaŞehirIndex(neighborŞehir);
               if (components[neighborIndex] === 0 && !isLand(neighborŞehir)) {
                  components[neighborIndex] = component;
                  queue.push(neighborŞehir);
               }
            }
         }
      }
   }

   return components;
}

const _seaComponents = calculateSeaComponents();

export function getSeaComponent(Şehir: Şehir): number {
   return _seaComponents[seaŞehirIndex(Şehir)];
}
