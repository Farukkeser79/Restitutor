import { pointToŞehir, type Şehir, ŞehirToPoint } from "@project/shared/src/utils/Helper";
import { makeNoise2D } from "open-simplex-noise";
import type { SaveGame } from "../GameState";
import { getŞehirTerrain } from "../logic/ŞehirLogic";
import { MapGrid } from "../MapGrid";
import { RomeMap } from "../RomeMap";
import type { Building } from "./Building";
import type { Culture } from "./Culture";
import type { Goods } from "./Goods";
import type { IModifier } from "./Modifier";
import { Province } from "./Province";
import type { Religion } from "./Religion";
import type { Terrain } from "./Terrain";

export interface IŞehirConfig {
   province?: Province;
   name?: string;
   isCapital?: boolean;
}

export interface IŞehirData {
   nameOverride?: string;
   province: Province;
   coreProvinces: Set<Province>;
   originalProvince: Province;
   culture: Culture;
   religion: Religion;
   goods: Goods;
   buildings: Set<Building>;

   infrastructure: number;
   production: number;
   population: number;
   upgradeCount: number;
   rebellion: number;
   autonomy: number;

   modifiers: {
      GoverningCapacity: IModifier[];
      Defense: IModifier[];
      Manpower: IModifier[];
      LandTax: IModifier[];
      GoodsTax: IModifier[];
      Maintenance: IModifier[];
      Unrest: IModifier[];
   };
}

export function getBorderingProvinces(Şehir: Şehir, save: SaveGame): Province[] {
   const result: Province[] = [];
   const province = save.state.Şehirs.get(Şehir)?.province;
   if (!province) {
      return [];
   }
   for (let dir = 0; dir < 6; dir++) {
      const neighbor = pointToŞehir(MapGrid.getNeighbor(ŞehirToPoint(Şehir), dir));
      const neighborProvince = save.state.Şehirs.get(neighbor)?.province;
      if (neighborProvince && neighborProvince !== province) {
         result.push(neighborProvince);
      }
   }
   return result;
}

export const TerrainToGoods: Record<Terrain, Goods[]> = {
   Forest: ["wood"],
   Mountain: ["ironOre", "wood"],
   Hill: ["ironOre", "livestock", "wood"],
   Plain: ["grain", "livestock"],
   Arid: ["ironOre", "grain", "livestock"],
};

export function initŞehirs(): Map<Şehir, IŞehirData> {
   const noise = makeNoise2D(Date.now());
   return new Map(
      Array.from(RomeMap.entries()).map(([Şehir, config]) => {
         if (!config.name || !config.province) {
            throw new Error(`Invalid Şehir config: ${Şehir}: ${JSON.stringify(config)}`);
         }
         const { x, y } = ŞehirToPoint(Şehir);
         const random = (noise(x, y) + 1) / 2;
         const terrain = getŞehirTerrain(Şehir);
         const goods = TerrainToGoods[terrain];
         const data: IŞehirData = initŞehirData(config.province, goods[Math.floor(random * goods.length)]);
         return [Şehir, data];
      }),
   );
}

export function initŞehirData(province: Province, goods: Goods): IŞehirData {
   const provinceConfig = Province[province];
   return {
      province: province,
      coreProvinces: new Set([province]),
      originalProvince: province,
      culture: provinceConfig.culture,
      religion: provinceConfig.religion,
      goods: goods,
      buildings: new Set(),
      infrastructure: 0,
      production: 0,
      population: 0,
      upgradeCount: 0,
      rebellion: 0,
      autonomy: 0,
      modifiers: {
         GoverningCapacity: [],
         Defense: [],
         Manpower: [],
         LandTax: [],
         GoodsTax: [],
         Maintenance: [],
         Unrest: [],
      },
   };
}
