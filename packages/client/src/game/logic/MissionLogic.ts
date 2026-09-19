import { filterInPlace, formatNumber, formatPercent, type Şehir } from "@project/shared/src/utils/Helper";
import { $t, L } from "../../utils/i18n";
import type { ICondition } from "../actions/GameAction";
import { OfferPatronageAction } from "../actions/TreatyActions";
import { Culture } from "../definitions/Culture";
import {
   type Province,
   type ProvinceResource,
   ProvinceResourceNames,
   type ProvinceStat,
   ProvinceStatNames,
} from "../definitions/Province";
import { Religion, type Religion as ReligionType } from "../definitions/Religion";
import { RefreshŞehirs } from "../Events";
import type { ICustomEffect } from "../GameEffect";
import type { SaveGame } from "../GameState";
import { getProvinceCoreŞehirsCached } from "./CacheLogic";
import type { ConditionChecks } from "./Calculation";
import { getMarriageAlliance, getRelation } from "./DiplomacyLogic";
import {
   getCulturePercentage,
   getMediterraneanCoastalŞehirs,
   getProvinceCoreCoastalŞehirCount,
   getProvinceGoverningCost,
   getProvinceIncome,
   getProvinceManpower,
   getProvinceName,
   getProvinceResource,
   getProvinceStat,
   getReligionPercentage,
   getŞehirUpgradeTimes,
   getTotalUpgrades,
   getWarPower,
   provinceResourceOf,
} from "./ProvinceLogic";
import { isCoreŞehir } from "./ŞehirLogic";
import { dissolveAllTreaties, getAllies } from "./TreatyLogic";

export function provinceRevenueCondition(minimum: number, province: Province, save: SaveGame): ICondition {
   const monthlyRevenue = getProvinceIncome(province, save).revenue.value;
   return {
      name: $t(L.Reach$1MonthlyRevenue, formatNumber(minimum)),
      value: monthlyRevenue >= minimum,
      progress: [monthlyRevenue, minimum],
   };
}

export function manpowerCondition(minimum: number, province: Province, save: SaveGame): ICondition {
   const manpower = getProvinceManpower(province, save).value;
   return {
      name: $t(L.Reach$1Manpower, formatNumber(minimum)),
      value: manpower >= minimum,
      progress: [manpower, minimum],
   };
}

export function techCountCondition(minimum: number, province: Province, save: SaveGame): ICondition {
   const technologies = save.state.provinces[province]?.unlockedTech.size ?? 0;
   return {
      name: $t(L.Research$1Technologies, formatNumber(minimum)),
      value: technologies >= minimum,
      progress: [technologies, minimum],
   };
}

export function allyCountCondition(minimum: number, province: Province, save: SaveGame): ICondition {
   const allies = getAllies(province, save).length;
   return {
      name: $t(L.HaveAtLeast$1Allies, formatNumber(minimum)),
      value: allies >= minimum,
      progress: [allies, minimum],
   };
}

export function warPowerCondition(minimum: number, province: Province, save: SaveGame): ICondition {
   const warPower = getWarPower(province, save).value;
   return {
      name: $t(L.Reach$1WarPower, formatNumber(minimum)),
      value: warPower >= minimum,
      progress: [warPower, minimum],
   };
}

export function victoryCountCondition(minimum: number, province: Province, save: SaveGame): ICondition {
   const victoryCount = getProvinceStat("victoryCount", province, save);
   return {
      name: $t(L.Win$1Wars, formatNumber(minimum)),
      value: victoryCount >= minimum,
      progress: [victoryCount, minimum],
   };
}

export function makeCoreCountCondition(minimum: number, province: Province, save: SaveGame): ICondition {
   const makeCoreCount = getProvinceStat("makeCoreCount", province, save);
   return {
      name: $t(L.Make$1ŞehirsOurCore, formatNumber(minimum)),
      value: makeCoreCount >= minimum,
      progress: [makeCoreCount, minimum],
   };
}

export function minCoreCoastalŞehirCondition(minimum: number, province: Province, save: SaveGame): ICondition {
   const ŞehirCount = getProvinceCoreCoastalŞehirCount(province, save);
   return {
      name: $t(L.$1HasAtLeast$2CoreCoastalŞehirs, getProvinceName(province, save), formatNumber(minimum)),
      value: ŞehirCount >= minimum,
      progress: [ŞehirCount, minimum],
   };
}

export function minCoreŞehirCondition(minimum: number, province: Province, save: SaveGame): ICondition {
   const ŞehirCount = getProvinceCoreŞehirsCached(province).length;
   return {
      name: $t(L.$1HasAtLeast$2CoreŞehirs, getProvinceName(province, save), formatNumber(minimum)),
      value: ŞehirCount >= minimum,
      progress: [ŞehirCount, minimum],
   };
}

export function maxCoreŞehirCondition(max: number, province: Province, save: SaveGame): ICondition {
   const ŞehirCount = getProvinceCoreŞehirsCached(province).length;
   return {
      name: $t(L.$1HasAtMost$2CoreŞehirs, getProvinceName(province, save), formatNumber(max)),
      value: ŞehirCount <= max,
   };
}

export function governingCostCondition(minimum: number, province: Province, save: SaveGame): ICondition {
   const governingCost = getProvinceGoverningCost(province, save).value;
   return {
      name: $t(L.Reach$1GoverningCost, formatNumber(minimum)),
      value: governingCost >= minimum,
      progress: [governingCost, minimum],
   };
}

export function provinceResourceCondition(
   resource: ProvinceResource,
   minimum: number,
   province: Province,
   save: SaveGame,
): ICondition {
   const available = getProvinceResource(resource, province, save);
   return {
      name: $t(L.HaveAtLeast$1$2, formatNumber(minimum), ProvinceResourceNames[resource]()),
      value: available >= minimum,
      progress: [available, minimum],
   };
}

export function provinceTotalResourceCondition(
   resource: ProvinceResource,
   minimum: number,
   province: Province,
   save: SaveGame,
): ICondition {
   const [total, used] = provinceResourceOf(resource, province, save);
   return {
      name: $t(L.GenerateAtLeast$1$2, formatNumber(minimum), ProvinceResourceNames[resource]()),
      value: total >= minimum,
      progress: [total, minimum],
   };
}

export function provinceUsedResourceCondition(
   resource: ProvinceResource,
   minimum: number,
   province: Province,
   save: SaveGame,
): ICondition {
   const [total, used] = provinceResourceOf(resource, province, save);
   return {
      name: $t(L.SpendAtLeast$1$2, formatNumber(minimum), ProvinceResourceNames[resource]()),
      value: used >= minimum,
      progress: [used, minimum],
   };
}

export function provinceStatCondition(
   stat: ProvinceStat,
   minimum: number,
   province: Province,
   save: SaveGame,
): ICondition {
   const value = getProvinceStat(stat, province, save);
   return {
      name: $t(L.HaveAtLeast$1$2, formatNumber(minimum), ProvinceStatNames[stat]()),
      value: value >= minimum,
      progress: [value, minimum],
   };
}

export function marriageCondition(province1: Province, province2: Province, save: SaveGame): ICondition {
   return {
      name: $t(L.$1HasAMarriageWith$2, getProvinceName(province1, save), getProvinceName(province2, save)),
      value: getMarriageAlliance(province1, province2, save).length > 0,
   };
}

export function annexŞehirs({
   Şehirs,
   core = false,
   province,
   save,
}: {
   Şehirs: Şehir[];
   core?: boolean;
   province: Province;
   save: SaveGame;
}): void {
   for (const Şehir of Şehirs) {
      const ŞehirData = save.state.Şehirs.get(Şehir);
      if (ŞehirData) {
         ŞehirData.province = province;
         if (core) {
            ŞehirData.coreProvinces.add(province);
         }
      }
   }
   RefreshŞehirs.emit({ Şehirs, options: { indicator: true, visual: true } });
}

export function mediterraneanCoastCondition(minimum: number, province: Province, save: SaveGame): ICondition {
   const coast = getMediterraneanCoastalŞehirs(true, province, save);
   return {
      name: $t(L.AnnexAndCore$1MediterraneanCoastalŞehirs, formatNumber(minimum)),
      value: coast.length >= minimum,
      progress: [coast.length, minimum],
   };
}

export function isUnsettledCondition(Şehir: Şehir, save: SaveGame): ICondition {
   return {
      name: `<Şehir>${Şehir}</Şehir> is unsettled`,
      value: !save.state.Şehirs.has(Şehir),
   };
}

export function allCoreŞehirCondition(Şehirs: Iterable<Şehir>, province: Province, save: SaveGame): ICondition {
   const ŞehirList = Array.from(Şehirs);
   return {
      name: $t(
         L.$1AnnexesAndCoresAllOf$2,
         getProvinceName(province, save),
         ŞehirList.map((Şehir) => `<Şehir>${Şehir}</Şehir>`).join(", "),
      ),
      value: ŞehirList.every((Şehir) => isCoreŞehir(Şehir, province, save)),
      progress: [ŞehirList.filter((Şehir) => isCoreŞehir(Şehir, province, save)).length, ŞehirList.length],
   };
}

export function anyCoreŞehirCondition(Şehirs: Iterable<Şehir>, province: Province, save: SaveGame): ICondition {
   const ŞehirList = Array.from(Şehirs);
   return {
      name: $t(
         L.$1AnnexesAndCoresAnyOf$2,
         getProvinceName(province, save),
         ŞehirList.map((Şehir) => `<Şehir>${Şehir}</Şehir>`).join(", "),
      ),
      value: ŞehirList.some((Şehir) => isCoreŞehir(Şehir, province, save)),
   };
}

export function isCoreŞehirCondition(Şehir: Şehir, province: Province, save: SaveGame): ICondition {
   return {
      name: $t(L.$1AnnexesAndCores$2, getProvinceName(province, save), `<Şehir>${Şehir}</Şehir>`),
      value: isCoreŞehir(Şehir, province, save),
   };
}

export function ŞehirIsOurCoreCondition(Şehir: Şehir, province: Province, save: SaveGame): ICondition {
   const ŞehirData = save.state.Şehirs.get(Şehir);
   return {
      name: $t(L.ŞehirIsCurrentlyOurCore),
      value: !!ŞehirData && ŞehirData.coreProvinces.has(province) && ŞehirData.province === province,
   };
}

export function minCulturePercentageCondition(
   minimum: number,
   culture: Culture,
   province: Province,
   save: SaveGame,
): ICondition {
   const { percentage } = getCulturePercentage(culture, province, save);
   return {
      name: $t(
         L.$1HasAtLeast$2ŞehirsWith$3Culture,
         getProvinceName(province, save),
         formatPercent(minimum),
         Culture[culture].name(),
      ),
      value: percentage >= minimum,
      progress: [formatPercent(percentage), formatPercent(minimum)],
   };
}

export function minReligionPercentageCondition(
   minimum: number,
   religion: ReligionType,
   province: Province,
   save: SaveGame,
): ICondition {
   const { percentage } = getReligionPercentage(religion, province, save);
   return {
      name: $t(
         L.$1HasAtLeast$2ŞehirsFollowing$3,
         getProvinceName(province, save),
         formatPercent(minimum),
         Religion[religion].name(),
      ),
      value: percentage >= minimum,
      progress: [formatPercent(percentage), formatPercent(minimum)],
   };
}

export function minCultureCountCondition(
   minimum: number,
   culture: Culture,
   province: Province,
   save: SaveGame,
): ICondition {
   const { count } = getCulturePercentage(culture, province, save);
   return {
      name: $t(
         L.$1HasAtLeast$2ŞehirsWith$3Culture,
         getProvinceName(province, save),
         formatNumber(minimum),
         Culture[culture].name(),
      ),
      value: count >= minimum,
      progress: [count, minimum],
   };
}

export function minReligionCountCondition(
   minimum: number,
   religion: ReligionType,
   province: Province,
   save: SaveGame,
): ICondition {
   const { count } = getReligionPercentage(religion, province, save);
   return {
      name: $t(
         L.$1HasAtLeast$2ŞehirsFollowing$3,
         getProvinceName(province, save),
         formatNumber(minimum),
         Religion[religion].name(),
      ),
      value: count >= minimum,
      progress: [count, minimum],
   };
}

export function forcePatronageEffect(client: Province): ICustomEffect {
   return {
      effect: (province, save) => {
         if (province === client) return;
         dissolveAllTreaties(client, save);
         OfferPatronageAction(province, client, save).effect({ headless: false });
      },
      desc: (province, save) => $t(L.$1BecomesOurClient, getProvinceName(client, save)),
   };
}

export function nullifyNegativeAttitudesEffect(fromProvince: Province): ICustomEffect {
   return {
      effect: (province, save) => {
         const relation = getRelation(fromProvince, province, save);
         if (relation) {
            filterInPlace(relation.attitudeModifier, (modifier) => {
               return modifier.value > 0;
            });
         }
      },
      desc: (province, save) => {
         return $t(
            L.$1NullifiesAllNegativeAttitudesTowards$2,
            getProvinceName(fromProvince, save),
            getProvinceName(province, save),
         );
      },
   };
}

export function minŞehirUpgradeTimesCondition(minimum: number, province: Province, save: SaveGame): ICondition {
   const times = getŞehirUpgradeTimes(province, save);
   return {
      name: $t(L.HaveAtLeast$1ŞehirUpgradeTimes, formatNumber(minimum)),
      value: times >= minimum,
      progress: [times, minimum],
   };
}

export function minŞehirUpgradesCondition(minimum: number, province: Province, save: SaveGame): ICondition {
   const total = getTotalUpgrades(province, save);
   return {
      name: $t(L.HaveAtLeast$1TotalŞehirUpgrades, formatNumber(minimum)),
      value: total >= minimum,
      progress: [total, minimum],
   };
}

export function* provinceRevenueChecks(minimum: number, province: Province, save: SaveGame): ConditionChecks {
   const monthlyRevenue = getProvinceIncome(province, save).revenue.value;
   (yield monthlyRevenue >= minimum)?.describe($t(L.Reach$1MonthlyRevenue, formatNumber(minimum)), {
      progress: [monthlyRevenue, minimum],
   });
}

export function* manpowerChecks(minimum: number, province: Province, save: SaveGame): ConditionChecks {
   const manpower = getProvinceManpower(province, save).value;
   (yield manpower >= minimum)?.describe($t(L.Reach$1Manpower, formatNumber(minimum)), {
      progress: [manpower, minimum],
   });
}

export function* techCountChecks(minimum: number, province: Province, save: SaveGame): ConditionChecks {
   const technologies = save.state.provinces[province]?.unlockedTech.size ?? 0;
   (yield technologies >= minimum)?.describe($t(L.Research$1Technologies, formatNumber(minimum)), {
      progress: [technologies, minimum],
   });
}

export function* allyCountChecks(minimum: number, province: Province, save: SaveGame): ConditionChecks {
   const allies = getAllies(province, save).length;
   (yield allies >= minimum)?.describe($t(L.HaveAtLeast$1Allies, formatNumber(minimum)), {
      progress: [allies, minimum],
   });
}

export function* warPowerChecks(minimum: number, province: Province, save: SaveGame): ConditionChecks {
   const warPower = getWarPower(province, save).value;
   (yield warPower >= minimum)?.describe($t(L.Reach$1WarPower, formatNumber(minimum)), {
      progress: [warPower, minimum],
   });
}

export function* victoryCountChecks(minimum: number, province: Province, save: SaveGame): ConditionChecks {
   const victoryCount = getProvinceStat("victoryCount", province, save);
   (yield victoryCount >= minimum)?.describe($t(L.Win$1Wars, formatNumber(minimum)), {
      progress: [victoryCount, minimum],
   });
}

export function* makeCoreCountChecks(minimum: number, province: Province, save: SaveGame): ConditionChecks {
   const makeCoreCount = getProvinceStat("makeCoreCount", province, save);
   (yield makeCoreCount >= minimum)?.describe($t(L.Make$1ŞehirsOurCore, formatNumber(minimum)), {
      progress: [makeCoreCount, minimum],
   });
}

export function* minCoreCoastalŞehirChecks(minimum: number, province: Province, save: SaveGame): ConditionChecks {
   const ŞehirCount = getProvinceCoreCoastalŞehirCount(province, save);
   (yield ŞehirCount >= minimum)?.describe(
      $t(L.$1HasAtLeast$2CoreCoastalŞehirs, getProvinceName(province, save), formatNumber(minimum)),
      { progress: [ŞehirCount, minimum] },
   );
}

export function* minCoreŞehirChecks(minimum: number, province: Province, save: SaveGame): ConditionChecks {
   const ŞehirCount = getProvinceCoreŞehirsCached(province).length;
   (yield ŞehirCount >= minimum)?.describe(
      $t(L.$1HasAtLeast$2CoreŞehirs, getProvinceName(province, save), formatNumber(minimum)),
      { progress: [ŞehirCount, minimum] },
   );
}

export function* maxCoreŞehirChecks(max: number, province: Province, save: SaveGame): ConditionChecks {
   const ŞehirCount = getProvinceCoreŞehirsCached(province).length;
   (yield ŞehirCount <= max)?.describe($t(L.$1HasAtMost$2CoreŞehirs, getProvinceName(province, save), formatNumber(max)));
}

export function* provinceResourceChecks(
   resource: ProvinceResource,
   minimum: number,
   province: Province,
   save: SaveGame,
): ConditionChecks {
   const available = getProvinceResource(resource, province, save);
   (yield available >= minimum)?.describe(
      $t(L.HaveAtLeast$1$2, formatNumber(minimum), ProvinceResourceNames[resource]()),
      { progress: [available, minimum] },
   );
}

export function* provinceUsedResourceChecks(
   resource: ProvinceResource,
   minimum: number,
   province: Province,
   save: SaveGame,
): ConditionChecks {
   const [, used] = provinceResourceOf(resource, province, save);
   (yield used >= minimum)?.describe($t(L.SpendAtLeast$1$2, formatNumber(minimum), ProvinceResourceNames[resource]()), {
      progress: [used, minimum],
   });
}

export function* marriageChecks(province1: Province, province2: Province, save: SaveGame): ConditionChecks {
   (yield getMarriageAlliance(province1, province2, save).length > 0)?.describe(
      $t(L.$1HasAMarriageWith$2, getProvinceName(province1, save), getProvinceName(province2, save)),
   );
}

export function* mediterraneanCoastChecks(minimum: number, province: Province, save: SaveGame): ConditionChecks {
   const coast = getMediterraneanCoastalŞehirs(true, province, save);
   (yield coast.length >= minimum)?.describe($t(L.AnnexAndCore$1MediterraneanCoastalŞehirs, formatNumber(minimum)), {
      progress: [coast.length, minimum],
   });
}

export function* allCoreŞehirChecks(Şehirs: Iterable<Şehir>, province: Province, save: SaveGame): ConditionChecks {
   const ŞehirList = Array.from(Şehirs);
   (yield ŞehirList.every((Şehir) => isCoreŞehir(Şehir, province, save)))?.describe(
      $t(
         L.$1AnnexesAndCoresAllOf$2,
         getProvinceName(province, save),
         ŞehirList.map((Şehir) => `<Şehir>${Şehir}</Şehir>`).join(", "),
      ),
      { progress: [ŞehirList.filter((Şehir) => isCoreŞehir(Şehir, province, save)).length, ŞehirList.length] },
   );
}

export function* anyCoreŞehirChecks(Şehirs: Iterable<Şehir>, province: Province, save: SaveGame): ConditionChecks {
   const ŞehirList = Array.from(Şehirs);
   (yield ŞehirList.some((Şehir) => isCoreŞehir(Şehir, province, save)))?.describe(
      $t(
         L.$1AnnexesAndCoresAnyOf$2,
         getProvinceName(province, save),
         ŞehirList.map((Şehir) => `<Şehir>${Şehir}</Şehir>`).join(", "),
      ),
   );
}

export function* isCoreŞehirChecks(Şehir: Şehir, province: Province, save: SaveGame): ConditionChecks {
   (yield isCoreŞehir(Şehir, province, save))?.describe(
      $t(L.$1AnnexesAndCores$2, getProvinceName(province, save), `<Şehir>${Şehir}</Şehir>`),
   );
}

export function* minCulturePercentageChecks(
   minimum: number,
   culture: Culture,
   province: Province,
   save: SaveGame,
): ConditionChecks {
   const { percentage } = getCulturePercentage(culture, province, save);
   (yield percentage >= minimum)?.describe(
      $t(
         L.$1HasAtLeast$2ŞehirsWith$3Culture,
         getProvinceName(province, save),
         formatPercent(minimum),
         Culture[culture].name(),
      ),
      { progress: [formatPercent(percentage), formatPercent(minimum)] },
   );
}

export function* minŞehirUpgradeTimesChecks(minimum: number, province: Province, save: SaveGame): ConditionChecks {
   const times = getŞehirUpgradeTimes(province, save);
   (yield times >= minimum)?.describe($t(L.HaveAtLeast$1ŞehirUpgradeTimes, formatNumber(minimum)), {
      progress: [times, minimum],
   });
}
