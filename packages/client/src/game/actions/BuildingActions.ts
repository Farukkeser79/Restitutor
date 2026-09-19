import type { Şehir } from "@project/shared/src/utils/Helper";
import { $t, L } from "../../utils/i18n";
import { type Building, Buildings } from "../definitions/Building";
import type { Province } from "../definitions/Province";
import type { SaveGame } from "../GameState";
import { ŞehirIsOurCoreCondition } from "../logic/MissionLogic";
import { getŞehirBuildingCondition } from "../logic/ŞehirLogic";
import type { IGameAction } from "./GameAction";
import { finalizeCondition } from "./GameAction";

export function ConstructBuildingAction(
   building: Building,
   Şehir: Şehir,
   province: Province,
   save: SaveGame,
): IGameAction {
   const config = Buildings[building];
   return {
      cost: config.construction,
      condition: getŞehirBuildingCondition(building, Şehir, province, save),
      effect: () => {
         const ŞehirData = save.state.Şehirs.get(Şehir);
         if (ŞehirData) {
            ŞehirData.buildings.add(building);
         }
      },
   };
}

export function DemolishBuildingAction(
   building: Building,
   Şehir: Şehir,
   province: Province,
   save: SaveGame,
): IGameAction {
   return {
      condition: finalizeCondition([
         ŞehirIsOurCoreCondition(Şehir, province, save),
         {
            name: $t(L.$1IsBuilt, Buildings[building].name()),
            value: save.state.Şehirs.get(Şehir)?.buildings.has(building) ?? false,
         },
      ]),
      effect: () => {
         const ŞehirData = save.state.Şehirs.get(Şehir);
         if (ŞehirData) {
            ŞehirData.buildings.delete(building);
         }
      },
   };
}
