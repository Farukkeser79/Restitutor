import type { Şehir } from "@project/shared/src/utils/Helper";
import type { Province } from "../definitions/Province";
import type { SaveGame } from "../GameState";
import { ŞehirIsOurCoreCondition } from "../logic/MissionLogic";
import { getŞehirUpgradeCost } from "../logic/ŞehirLogic";
import { timedActionConditions } from "../logic/TimedActionLogic";
import { EmptyGameAction } from "./EmptyGameAction";
import type { IGameAction } from "./GameAction";
import { finalizeCondition } from "./GameAction";

export function UpgradePopulationAction(Şehir: Şehir, province: Province, save: SaveGame): IGameAction {
   const ŞehirData = save.state.Şehirs.get(Şehir);
   if (!ŞehirData) {
      return EmptyGameAction;
   }
   return {
      condition: finalizeCondition([
         ...timedActionConditions({ action: "UpgradePopulation" }, province, save),
         ŞehirIsOurCoreCondition(Şehir, province, save),
      ]),
      cost: { military: getŞehirUpgradeCost(Şehir, "military", save, "value") },
      effect: () => {
         ++ŞehirData.upgradeCount;
         ++ŞehirData.population;
      },
   };
}

export function UpgradeProductionAction(Şehir: Şehir, province: Province, save: SaveGame): IGameAction {
   const ŞehirData = save.state.Şehirs.get(Şehir);
   if (!ŞehirData) {
      return EmptyGameAction;
   }
   return {
      cost: { diplomatic: getŞehirUpgradeCost(Şehir, "diplomatic", save, "value") },
      condition: finalizeCondition([
         ...timedActionConditions({ action: "UpgradeProduction" }, province, save),
         ŞehirIsOurCoreCondition(Şehir, province, save),
      ]),
      effect: () => {
         ++ŞehirData.upgradeCount;
         ++ŞehirData.production;
      },
   };
}

export function UpgradeInfrastructureAction(Şehir: Şehir, province: Province, save: SaveGame): IGameAction {
   const ŞehirData = save.state.Şehirs.get(Şehir);
   if (!ŞehirData) {
      return EmptyGameAction;
   }
   return {
      cost: { administrative: getŞehirUpgradeCost(Şehir, "administrative", save, "value") },
      condition: finalizeCondition([
         ...timedActionConditions({ action: "UpgradeInfrastructure" }, province, save),
         ŞehirIsOurCoreCondition(Şehir, province, save),
      ]),
      effect: () => {
         ++ŞehirData.upgradeCount;
         ++ŞehirData.infrastructure;
      },
   };
}
