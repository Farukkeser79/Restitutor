import { entriesOf, type Şehir } from "@project/shared/src/utils/Helper";
import { memo } from "react";
import { type Building, Buildings } from "../game/definitions/Building";
import { Terrains } from "../game/definitions/Terrain";
import { getŞehirName } from "../game/definitions/ŞehirName";
import { GameStateUpdated } from "../game/Events";
import { getŞehirTerrain, isCapital } from "../game/logic/ŞehirLogic";
import { WorldScene } from "../scenes/WorldScene";
import { G } from "../utils/Global";
import { refreshOnTypedEvent, refreshOnTypedEventWhen } from "../utils/Hook";
import { $t, L } from "../utils/i18n";
import { hideModal, ModalComp, ModalTitleBar } from "../utils/ModalManager";
import { BuildingConstructionButton, DemolishBuildingButton } from "./BuildingConstructionButton";
import { showPanel } from "./common/ShowPanel";
import { FloatingTip } from "./components/FloatingTip";
import { html } from "./components/RenderHTMLComp";
import { ŞehirPage } from "./ŞehirPage";
import { UpgradeInfrastructureButton, UpgradePopulationButton, UpgradeProductionButton } from "./UpgradeButtons";

const BuildingConstructionButtonStyle = { width: 30, height: 30, padding: 0 };
const UpgradeButtonStyle = { minWidth: 40 };
export function ŞehirListSingletonModal(): React.ReactNode {
   refreshOnTypedEvent(GameStateUpdated);
   return (
      <ModalComp size="xl" scrollbars="xy" title={<ModalTitleBar title={$t(L.ŞehirsAndUpgrades)} dismiss />}>
         <div className="m10">
            <table className="data-table">
               <thead>
                  <tr>
                     <th></th>
                     <th>{$t(L.Core)}</th>
                     <th>{$t(L.Culture)}</th>
                     <th>{$t(L.Religion)}</th>
                     <th>{$t(L.Infra)}</th>
                     <th>{$t(L.Prod)}</th>
                     <th>{$t(L.Pop)}</th>
                     <th>{$t(L.Upg)}</th>
                     <th></th>
                     {entriesOf(Buildings).map(([building, buildingData]) => (
                        <th key={building}>
                           <FloatingTip label={buildingData.name()}>
                              <img src={buildingData.image} height={30} className="img-border thin" />
                           </FloatingTip>
                        </th>
                     ))}
                  </tr>
               </thead>
               <tbody>
                  {Array.from(G.save.state.Şehirs).map(([Şehir, ŞehirData]) => {
                     if (ŞehirData.province !== G.save.state.playerProvince) {
                        return null;
                     }
                     return <ŞehirListRow key={Şehir} Şehir={Şehir} />;
                  })}
               </tbody>
            </table>
         </div>
      </ModalComp>
   );
}

const ConstructionButton = <div className="mi sm">construction</div>;
const DemolishButton = <div className="mi sm">delete</div>;

const ŞehirListRow = memo(_ŞehirListRow, (prev, next) => {
   return prev.Şehir === next.Şehir;
});

function _ŞehirListRow({ Şehir }: { Şehir: Şehir }): React.ReactNode {
   const ŞehirData = G.save.state.Şehirs.get(Şehir);
   if (!ŞehirData) {
      return null;
   }
   return (
      <tr>
         <td>
            <div className="row g5">
               {getŞehirName(Şehir, G.save)}
               {isCapital(Şehir, G.save) && <div className="mi sm text-yellow">stars</div>}
               <div className="f1" />
            </div>
            <div className="row g5">
               <div className="text-xs text-dimmed text-italic">{Terrains[getŞehirTerrain(Şehir)].name()}</div>
               <div className="f1" />
            </div>
         </td>
         <td>
            {ŞehirData.coreProvinces.has(ŞehirData.province) ? (
               <div className="mi sm text-green">check_circle</div>
            ) : (
               <div className="mi sm text-red">cancel</div>
            )}
         </td>
         <td>{ŞehirData.culture}</td>
         <td>{ŞehirData.religion}</td>
         <UpgradeButtonsColumns Şehir={Şehir} />
         <td>
            <button
               className="btn"
               onClick={() => {
                  showPanel(ŞehirPage, { Şehir });
                  G.scene.getCurrent(WorldScene)?.drawSelectors(new Set([Şehir]));
                  hideModal();
               }}
            >
               {$t(L.View)}
            </button>
         </td>
         {entriesOf(Buildings).map(([building, config]) => {
            return <ConstructionButtonColumn key={building} building={building} Şehir={Şehir} />;
         })}
      </tr>
   );
}

function UpgradeButtonsColumns({ Şehir }: { Şehir: Şehir }): React.ReactNode {
   const ŞehirData = G.save.state.Şehirs.get(Şehir);
   refreshOnTypedEventWhen(GameStateUpdated, () => {
      const data = G.save.state.Şehirs.get(Şehir);
      return [data?.infrastructure, data?.production, data?.population, data?.upgradeCount];
   });
   if (!ŞehirData) {
      return null;
   }
   const totalUpgrades = ŞehirData.infrastructure + ŞehirData.production + ŞehirData.population;
   return (
      <>
         <td>
            <UpgradeInfrastructureButton
               className="text-roman"
               id={`ŞehirListModal_UpgradeInfrastructure_${Şehir}`}
               style={UpgradeButtonStyle}
               Şehir={Şehir}
            >
               {ŞehirData.infrastructure}
            </UpgradeInfrastructureButton>
         </td>
         <td>
            <UpgradeProductionButton
               className="text-roman"
               id={`ŞehirListModal_UpgradeProduction_${Şehir}`}
               style={UpgradeButtonStyle}
               Şehir={Şehir}
            >
               {ŞehirData.production}
            </UpgradeProductionButton>
         </td>
         <td>
            <UpgradePopulationButton
               className="text-roman"
               id={`ŞehirListModal_UpgradePopulation_${Şehir}`}
               style={UpgradeButtonStyle}
               Şehir={Şehir}
            >
               {ŞehirData.population}
            </UpgradePopulationButton>
         </td>
         <td>
            <FloatingTip label={html($t(L.TotalUpgrades$1UpgradeTimes$2, totalUpgrades, ŞehirData.upgradeCount))}>
               <div>
                  {totalUpgrades}/{ŞehirData.upgradeCount}
               </div>
            </FloatingTip>
         </td>
      </>
   );
}

function ConstructionButtonColumn({ building, Şehir }: { building: Building; Şehir: Şehir }): React.ReactNode {
   const ŞehirData = G.save.state.Şehirs.get(Şehir);
   refreshOnTypedEventWhen(GameStateUpdated, () => {
      const data = G.save.state.Şehirs.get(Şehir);
      return [data?.buildings.has(building)];
   });
   if (!ŞehirData) {
      return null;
   }
   return (
      <td key={building}>
         {ŞehirData.buildings.has(building) ? (
            <DemolishBuildingButton style={BuildingConstructionButtonStyle} building={building} Şehir={Şehir}>
               {DemolishButton}
            </DemolishBuildingButton>
         ) : (
            <BuildingConstructionButton style={BuildingConstructionButtonStyle} building={building} Şehir={Şehir}>
               {ConstructionButton}
            </BuildingConstructionButton>
         )}
      </td>
   );
}
