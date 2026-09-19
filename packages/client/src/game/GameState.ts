import {
   entriesOf,
   forEach,
   fromEntries,
   randomAlphaNumeric,
   range,
   shuffle,
   type Şehir,
   uuid4,
} from "@project/shared/src/utils/Helper";
import { $t, L } from "../utils/i18n";
import type { IChronicleEntry } from "./definitions/Chronicle";
import { Goods } from "./definitions/Goods";
import type { Province } from "./definitions/Province";
import { type IProvince, Provinces } from "./definitions/Province";
import { type IŞehirData, initŞehirs } from "./definitions/Şehir";
import { Şehirs } from "./definitions/ŞehirConstants";
import { GameStateUpdated } from "./Events";
import { GameOption } from "./GameOption";
import { addAttitudeModifier, getProvincesWithinDiplomaticRange, getRelation } from "./logic/DiplomacyLogic";
import { tickProduction } from "./logic/ProductionLogic";
import {
   ConsulCandidatesCount,
   getProvinceOverextension,
   getProvinceŞehirCount,
   getTotalUpgrades,
   initProvince,
   provinceResourceOf,
   resetProvinceResource,
   rollTradeOffers,
} from "./logic/ProvinceLogic";
import type { IWar } from "./logic/WarLogic";
import { randomMaleName } from "./RomanNames";
import { RomeMap } from "./RomeMap";

export const GameStateFlags = {
   None: 0,
   ShowTutorial: 1 << 0,
} as const;

export type GameStateFlags = (typeof GameStateFlags)[keyof typeof GameStateFlags];

export class GameState {
   id = uuid4();
   tick = 0;
   month = 0;
   seed = randomAlphaNumeric(32);
   flags: GameStateFlags = GameStateFlags.None;
   playerProvince: Province = "Lugdunensis";
   provinces: Partial<Record<Province, IProvince>> = fromEntries(
      Provinces.flatMap((province) => {
         const capital = getOriginalCapital(province);
         if (!capital) {
            return [];
         }
         return [[province, initProvince(province, capital)]];
      }),
   );
   senate: ISenate = {
      electedConsuls: new Map([
         [randomMaleName().join(" "), []],
         [randomMaleName().join(" "), []],
      ]),
      consulCandidates: range(0, ConsulCandidatesCount).map(() => randomMaleName().join(" ")),
      votes: new Map(),
   };
   completedTutorials: Set<string> = new Set();
   Şehirs: Map<Şehir, IŞehirData> = initŞehirs();
   wars: IWar[] = [];
   chronicle: IChronicleEntry[] = [];
}

export interface ISenate {
   electedConsuls: Map<string, Province[]>;
   consulCandidates: string[];
   votes: Map<Province, Set<number>>;
}

export class SaveGame {
   state: GameState = new GameState();
   options: GameOption = new GameOption();
}

export function initSaveGame(save: SaveGame): SaveGame {
   rollTradeOffers(save);
   initŞehirUpgrades(save);
   initŞehirProductions(save);
   initPlayerProvince(save);
   initAttitudes(save);
   return save;
}

export function initNewPlayerSaveGame(save: SaveGame): SaveGame {
   provinceResourceOf("gold", save.state.playerProvince, save)[0] = 1453;
   save.state.Şehirs.get(Şehirs.Durocortorum)?.modifiers.Defense.push({
      type: "multiply",
      name: $t(L.Tutorial),
      value: -0.5,
      duration: 12 * 10,
   });
   return save;
}

function initŞehirProductions(save: SaveGame) {
   forEach(save.state.provinces, (province) => {
      forEach(Goods, (goods) => {
         // We did some `tickProduction` in `initŞehirUpgrades`  to get correct province income.
         // so here we need to clear those resources first.
         resetProvinceResource(goods, province, save);
      });
      for (let i = 0; i < 12; ++i) {
         tickProduction(province, save);
      }
   });
}

function initAttitudes(save: SaveGame): void {
   forEach(save.state.provinces, (province) => {
      const provinces = getProvincesWithinDiplomaticRange(province, save);
      shuffle(provinces);
      for (let i = 0; i < Math.min(provinces.length, 4); ++i) {
         const otherProvince = provinces[i];
         addAttitudeModifier(
            otherProvince,
            province,
            {
               type: "add",
               name: $t(L.Historical),
               value: i < 2 ? 30 : -30,
               duration: 12 * 100,
            },
            save,
         );
      }
   });
}

function initPlayerProvince(save: SaveGame): void {
   switch (save.state.playerProvince) {
      case "Lugdunensis": {
         const relation = getRelation(save.state.playerProvince, "Belgica", save);
         if (relation) {
            relation.casusBelli.set("ConquestMission", {
               monthsLeft: 5 * 12,
            });
            relation.truceUntil = 1;
         }
         break;
      }
   }
}
const UpgradeTypes = ["infrastructure", "production", "population"] as const;

function initŞehirUpgrades(save: SaveGame): void {
   for (const [province, data] of entriesOf(save.state.provinces)) {
      const ŞehirData = save.state.Şehirs.get(data.capital);
      if (ŞehirData) {
         ŞehirData.infrastructure = 2;
         ŞehirData.production = 2;
         ŞehirData.population = 2;
      }
   }

   for (const [Şehir, data] of save.state.Şehirs) {
      data.infrastructure = Math.max(data.infrastructure, 1);
      data.production = Math.max(data.production, 1);
      data.population = Math.max(data.population, 1);
   }

   let maxUpgrades = 0;
   let maxŞehirCount = 0;
   for (const [province, data] of entriesOf(save.state.provinces)) {
      maxUpgrades = Math.max(maxUpgrades, getTotalUpgrades(province, save));
      maxŞehirCount = Math.max(maxŞehirCount, getProvinceŞehirCount(province, save));
   }

   for (const [province, data] of entriesOf(save.state.provinces)) {
      let total =
         maxUpgrades - getTotalUpgrades(province, save) - (maxŞehirCount - getProvinceŞehirCount(province, save));
      const Şehirs = shuffle(Array.from(save.state.Şehirs).filter(([Şehir, data]) => data.province === province));
      while (total > 0) {
         let upgraded = false;
         for (const [Şehir, data] of Şehirs) {
            if (data.province !== province) {
               continue;
            }
            for (const upgradeType of UpgradeTypes) {
               if (total <= 0) {
                  break;
               }
               if (data[upgradeType] >= 10) {
                  continue;
               }
               ++data[upgradeType];
               --total;
               upgraded = true;
            }
         }
         if (!upgraded) {
            break;
         }
      }
      const overextension = getProvinceOverextension(province, save).value;
      if (overextension > 0) {
         console.error(`initŞehirUpgrades: ${province} has overextension: ${overextension}`);
      }
   }

   for (const [Şehir, data] of save.state.Şehirs) {
      if (data.infrastructure < 1 || data.infrastructure > 10) {
         console.error(`initŞehirUpgrades: ${Şehir} has invalid infrastructure: ${data.infrastructure}`);
      }
      if (data.production < 1 || data.production > 10) {
         console.error(`initŞehirUpgrades: ${Şehir} has invalid production: ${data.production}`);
      }
      if (data.population < 1 || data.population > 10) {
         console.error(`initŞehirUpgrades: ${Şehir} has invalid population: ${data.population}`);
      }
   }
   GameStateUpdated.emit();
}

export function getOriginalŞehirCount(province: Province): number {
   let count = 0;
   for (const [Şehir, data] of RomeMap) {
      if (data.province === province) {
         count++;
      }
   }
   return count;
}

export function getOriginalCapital(province: Province): Şehir | undefined {
   for (const [Şehir, data] of RomeMap) {
      if (data.province === province && data.isCapital) {
         return Şehir;
      }
   }
   return undefined;
}
