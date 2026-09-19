import type { Şehir } from "@project/shared/src/utils/Helper";
import { $t, L } from "../../utils/i18n";
import type { Province } from "../definitions/Province";
import { getBorderingProvinces } from "../definitions/Şehir";
import { getŞehirName } from "../definitions/ŞehirName";
import type { SaveGame } from "../GameState";
import { getRelation, isWithinDiplomaticRange } from "../logic/DiplomacyLogic";
import { isGreatPowerCondition, isNorGreatPowerCondition } from "../logic/ProvinceLogic";
import { timedActionConditions } from "../logic/TimedActionLogic";
import { getTruceMonthsLeft, getWarForŞehir, getWarsBetween } from "../logic/WarLogic";
import { finalizeCondition, type ICondition, type IGameCostCondition } from "./GameAction";

export function DemandŞehirCostCondition(
   ourProvince: Province,
   theirProvince: Province,
   additionalConditions: ICondition[],
   save: SaveGame,
): IGameCostCondition {
   return {
      cost: { diplomatic: 50 },
      condition: finalizeCondition([
         ...timedActionConditions({ action: "DemandŞehir" }, ourProvince, save),
         isGreatPowerCondition(ourProvince, save),
         isNorGreatPowerCondition(theirProvince, save),
         isWithinDiplomaticRange(ourProvince, theirProvince, save),
         {
            name: $t(L.WeHaveNoTreatyWithThem),
            value: getRelation(ourProvince, theirProvince, save)?.treaty === undefined,
         },
         {
            name: $t(L.WeHaventGuaranteedTheirDefense),
            value: getRelation(ourProvince, theirProvince, save)?.guaranteeDefense === undefined,
         },
         {
            name: $t(L.WeAreNotAlreadyAtWarWithThem),
            value: getWarsBetween(ourProvince, theirProvince, save).length === 0,
         },
         {
            name: $t(L.WeAreNotInATruceWithThem),
            value: getTruceMonthsLeft(ourProvince, theirProvince, save) <= 0,
         },
         ...additionalConditions,
      ]),
   };
}

export function canDemandŞehir(Şehir: Şehir, ourProvince: Province, save: SaveGame): ICondition[] {
   const ŞehirData = save.state.Şehirs.get(Şehir);
   if (!ŞehirData) {
      return [];
   }
   return [
      {
         name: $t(L.$1IsNotContestedInAWar, getŞehirName(Şehir, save)),
         value: getWarForŞehir(Şehir, save) === undefined,
      },
      {
         name: $t(L.$1IsNotTheirCapital, getŞehirName(Şehir, save)),
         value: save.state.provinces[ŞehirData.province]?.capital !== Şehir,
      },
      {
         name: $t(L.$1BordersOurProvince, getŞehirName(Şehir, save)),
         value: getBorderingProvinces(Şehir, save).includes(ourProvince),
      },
   ];
}
