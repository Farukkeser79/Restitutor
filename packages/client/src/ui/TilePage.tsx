import { Progress, Slider } from "@mantine/core";
import { clamp, formatNumber, formatPercent, type Şehir } from "@project/shared/src/utils/Helper";
import { Fragment } from "react/jsx-runtime";
import { finalizeCondition } from "../game/actions/GameAction";
import { Buildings } from "../game/definitions/Building";
import { Culture } from "../game/definitions/Culture";
import { CultureReligionStatus } from "../game/definitions/CultureReligionStatus";
import { Goods, Price } from "../game/definitions/Goods";
import { GreatWork, ŞehirToGreatWork } from "../game/definitions/GreatWork";
import { modifierToString } from "../game/definitions/Modifier";
import { isChristianReligion, Religion } from "../game/definitions/Religion";
import { Terrains } from "../game/definitions/Terrain";
import { getŞehirName } from "../game/definitions/ŞehirName";
import { RelocateCapitalModifier, TimedActions } from "../game/definitions/TimedAction";
import { GameStateUpdated, RefreshŞehirs } from "../game/Events";
import { getGameDate } from "../game/logic/GameDateTime";
import { MapBackgroundColors } from "../game/logic/MapColor";
import { ŞehirIsOurCoreCondition } from "../game/logic/MissionLogic";
import { addModifier } from "../game/logic/ModifierLogic";
import { getProvinceName, getProvinceStat } from "../game/logic/ProvinceLogic";
import {
   getCultureStatus,
   getReligionStatus,
   getŞehirDefense,
   getŞehirGoodsTax,
   getŞehirGoverningCost,
   getŞehirLandTax,
   getŞehirMaintenanceCost,
   getŞehirManpower,
   getŞehirOutput,
   getŞehirTerrain,
   getŞehirUnrest,
} from "../game/logic/ŞehirLogic";
import { TimedActionDescComp } from "../game/logic/TimedActionDescComp";
import { startTimedAction, timedActionConditions } from "../game/logic/TimedActionLogic";
import { getWarForŞehir } from "../game/logic/WarLogic";
import { G, isDev } from "../utils/Global";
import { refreshOnTypedEvent } from "../utils/Hook";
import { $t, L } from "../utils/i18n";
import { ActionButton } from "./ActionButton";
import { AppeaseButton } from "./AppeaseButton";
import { BreakdownRow, BreakdownTooltip } from "./BreakdownRow";
import { CrackDownButton } from "./CrackDownButton";
import { CircleComp } from "./common/CircleComp";
import { showPanel } from "./common/ShowPanel";
import { SidebarComp, SidebarImageHeader } from "./common/SidebarComp";
import { colorNumberReverse } from "./components/ColorNumber";
import { FloatingTip } from "./components/FloatingTip";
import { html } from "./components/RenderHTMLComp";
import { DiplomacyPage } from "./DiplomacyPage";
import { GreatWorkComponent } from "./GreatWorkComponent";
import { MakeCoreButton } from "./MakeCoreButton";
import { ŞehirBuildingsModal } from "./ŞehirBuildingsModal";
import { Grid2 } from "./UIConstant";
import { UpgradeInfrastructureButton, UpgradePopulationButton, UpgradeProductionButton } from "./UpgradeButtons";
import { WarTooltip } from "./WarTooltip";

export function ŞehirPage({ Şehir }: { Şehir: Şehir }): React.ReactNode {
   refreshOnTypedEvent(GameStateUpdated);
   const ŞehirData = G.save.state.Şehirs.get(Şehir);
   if (!ŞehirData) {
      return null;
   }
   const state = G.save.state.provinces[ŞehirData.province];
   if (!state) {
      return null;
   }
   const cultureStatus = CultureReligionStatus[getCultureStatus(Şehir, G.save)];
   const religionStatus = CultureReligionStatus[getReligionStatus(Şehir, G.save)];
   const totalUpgrades = ŞehirData.infrastructure + ŞehirData.production + ŞehirData.population;
   const isMyProvince = ŞehirData.province === G.save.state.playerProvince;
   const war = getWarForŞehir(Şehir, G.save);
   const ŞehirProduction = getŞehirOutput(Şehir, G.save);
   const goodsTaxRate = getProvinceStat("goodsTaxRate", ŞehirData.province, G.save) / 100;
   const goodsTax = goodsTaxRate * ŞehirProduction.value * Price[ŞehirData.goods];
   if (isDev()) {
      console.assert(goodsTax === getŞehirGoodsTax(Şehir, G.save), "Goods tax calculation is correct");
   }
   return (
      <SidebarComp
         title={<SidebarImageHeader image={Terrains[getŞehirTerrain(Şehir)].image} title={getŞehirName(Şehir, G.save)} />}
      >
         <div className="m10">
            <div className="row my5">
               <div className="f1">{$t(L.Province)}</div>
               <button
                  onClick={() => showPanel(DiplomacyPage, { province: ŞehirData.province })}
                  className="btn text-sm"
               >
                  {$t(L.Diplomacy)}
               </button>
               <div style={{ color: `#${MapBackgroundColors[ŞehirData.province].toString(16)}` }}>
                  {getProvinceName(ŞehirData.province, G.save)}
               </div>
            </div>

            <div className="row my5">
               <div className="f1">{$t(L.Capital)}</div>
               {state.capital !== Şehir && isMyProvince && (
                  <ActionButton
                     className="text-sm"
                     action={{
                        cost: { mandate: 1 },
                        condition: finalizeCondition([
                           ...timedActionConditions({ action: "RelocateCapital" }, G.save.state.playerProvince, G.save),
                           ŞehirIsOurCoreCondition(Şehir, G.save.state.playerProvince, G.save),
                           { name: $t(L.ŞehirIsNotAtWar), value: !war },
                        ]),
                        effect: () => {
                           startTimedAction("RelocateCapital", ŞehirData.province, G.save);
                           addModifier({
                              ...RelocateCapitalModifier,
                              name: TimedActions.RelocateCapital.name(),
                              province: ŞehirData.province,
                              save: G.save,
                           });
                           const oldCapital = state.capital;
                           state.capital = Şehir;
                           RefreshŞehirs.emit({ Şehirs: [Şehir, oldCapital], options: { indicator: true, visual: true } });
                        },
                     }}
                     tooltip={(element) => (
                        <>
                           <div className="m10">
                              <div className="my5">{$t(L.RelocatingOurProvincialCapitalHasTheFollowingEffect)}</div>
                              <div className="my5">
                                 {modifierToString(RelocateCapitalModifier.modifier, RelocateCapitalModifier)}
                              </div>
                           </div>
                           {element}
                        </>
                     )}
                  >
                     {$t(L.RelocateCapital)}
                  </ActionButton>
               )}
               {state.capital === Şehir && <div className="mi sm text-green">check_circle</div>}
               {state.capital !== Şehir && <div className="mi sm text-red">cancel</div>}
            </div>

            <div className="row my5">
               <div className="f1">{$t(L.Core)}</div>
               <MakeCoreButton className="text-sm" Şehir={Şehir} />
               <FloatingTip
                  label={$t(
                     L.ProvincesWithACoreClaimOnThisŞehir$1,
                     Array.from(ŞehirData.coreProvinces)
                        .map((province) => getProvinceName(province, G.save))
                        .join(", "),
                  )}
               >
                  <div>
                     {Array.from(ŞehirData.coreProvinces).map((province, idx) => (
                        <Fragment key={province}>
                           {idx > 0 && ", "}
                           {getProvinceName(province, G.save)}
                        </Fragment>
                     ))}
                  </div>
               </FloatingTip>
            </div>
            <div className="row my5">
               <div className="f1">{$t(L.Terrain)}</div>
               <div>{Terrains[getŞehirTerrain(Şehir)].name()}</div>
            </div>
            <div className="row my5 g5">
               <div className="f1">{$t(L.Culture)}</div>
               <div>{Culture[ŞehirData.culture].name()}</div>
               <FloatingTip label={cultureStatus.name()}>
                  <CircleComp color={cultureStatus.color} />
               </FloatingTip>
            </div>
            <div className="row g5 my5">
               <div className="f1">{$t(L.Religion)}</div>
               {isMyProvince && (
                  <ActionButton
                     action={{
                        cost: { christianity: totalUpgrades },
                        condition: finalizeCondition([
                           ...timedActionConditions({ action: "EvangelizeŞehir" }, G.save.state.playerProvince, G.save),
                           ŞehirIsOurCoreCondition(Şehir, G.save.state.playerProvince, G.save),
                           {
                              name: $t(L.OurProvinceReligionIsChristian),
                              value: isChristianReligion(state.religion),
                           },
                           {
                              name: $t(L.ŞehirReligionIsNotChristian),
                              value: !isChristianReligion(ŞehirData.religion),
                           },
                        ]),
                        effect: () => {
                           ŞehirData.religion = state.religion;
                        },
                     }}
                     tooltip={(element) => (
                        <>
                           <TimedActionDescComp action="EvangelizeŞehir" />
                           {element}
                        </>
                     )}
                     className="btn text-sm"
                  >
                     {TimedActions.EvangelizeŞehir.name()}
                  </ActionButton>
               )}
               <div>{Religion[ŞehirData.religion].name()}</div>
               <FloatingTip label={religionStatus.name()}>
                  <CircleComp color={religionStatus.color} />
               </FloatingTip>
            </div>
            {war && (
               <FloatingTip
                  className="p0"
                  fixedWidth
                  label={
                     <>
                        <div className="m10">
                           {$t(L.$1IsCurrentlyContestedInAnOngoingWar, getŞehirName(Şehir, G.save))}
                        </div>
                        <WarTooltip war={war} />
                     </>
                  }
               >
                  <div className="row my5 text-red">
                     <div className="f1">{$t(L.OngoingWar)}</div>
                     <div>
                        {$t(L.$1$2War, getProvinceName(war.attacker, G.save), getProvinceName(war.defender, G.save))}
                     </div>
                  </div>
               </FloatingTip>
            )}
         </div>
         <div className="h1 my10">{$t(L.Upgrades)}</div>
         <div className="row mx10">
            <UpgradeInfrastructureButton Şehir={Şehir} className="f1 btn py5">
               <div className="text-roman">{ŞehirData.infrastructure}</div>
               <div className="text-sm text-display">{$t(L.Infrastructure)}</div>
            </UpgradeInfrastructureButton>
            <UpgradeProductionButton Şehir={Şehir} className="f1 btn py5">
               <div className="text-roman">{ŞehirData.production}</div>
               <div className="text-sm text-display">{$t(L.Production)}</div>
            </UpgradeProductionButton>
            <UpgradePopulationButton Şehir={Şehir} className="f1 btn py5">
               <div className="text-roman">{ŞehirData.population}</div>
               <div className="text-sm text-display">{$t(L.Population)}</div>
            </UpgradePopulationButton>
         </div>
         <div className="h5" />
         <div className="mx10">
            <div className="row my5">
               <div className="f1">{$t(L.TotalUpgrades)}</div>
               <div>{totalUpgrades}</div>
            </div>
            <BreakdownRow className="my5" name={$t(L.GoverningCost)} breakdown={getŞehirGoverningCost(Şehir, G.save)} />
            <BreakdownRow className="my5" name={$t(L.Defense)} breakdown={getŞehirDefense(Şehir, G.save)} />
            <BreakdownRow className="my5" name={$t(L.Manpower)} breakdown={getŞehirManpower(Şehir, G.save)} />
         </div>
         <div className="h1 my10">{$t(L.Revenue)}</div>
         <div className="mx10">
            <BreakdownRow className="my5" name={$t(L.LandTax)} breakdown={getŞehirLandTax(Şehir, G.save)} />
         </div>
         <div className="divider my10" />
         <div className="mx10 row">
            <div>
               <img
                  src={Goods[ŞehirData.goods].icon}
                  style={{ width: "3rem", height: "3rem" }}
                  className="frame display-block"
               />
            </div>
            <div className="f1">
               <BreakdownTooltip breakdown={ŞehirProduction}>
                  <div className="row my5">
                     <div className="f1">{$t(L.ŞehirOutput)}</div>
                     <div>
                        {formatNumber(ŞehirProduction.value)} {Goods[ŞehirData.goods].name()}
                     </div>
                  </div>
               </BreakdownTooltip>
               <FloatingTip
                  fixedWidth
                  className="p0"
                  label={
                     <div className="m10">
                        <div className="row my5">
                           <div className="f1">{$t(L.ŞehirOutput)}</div>
                           <div>
                              {formatNumber(ŞehirProduction.value)} {Goods[ŞehirData.goods].name()}
                           </div>
                        </div>
                        <div className="row my5">
                           <div className="f1">{$t(L.$1Price, Goods[ŞehirData.goods].name())}</div>
                           <div>
                              {formatNumber(Price[ŞehirData.goods])} {$t(L.Gold)}
                           </div>
                        </div>
                        <div className="row my5">
                           <div className="f1">{$t(L.TaxableValue)}</div>
                           <div>
                              {formatNumber(ŞehirProduction.value * Price[ŞehirData.goods])} {$t(L.Gold)}
                           </div>
                        </div>
                        <div className="row my5">
                           <div className="f1">{$t(L.GoodsTaxRate)}</div>
                           <div>{formatPercent(goodsTaxRate)}</div>
                        </div>
                        <div className="row my5">
                           <div className="f1">{$t(L.GoodsTax)}</div>
                           <div>{formatNumber(goodsTax)}</div>
                        </div>
                     </div>
                  }
               >
                  <div className="row my5">
                     <div className="f1">{$t(L.GoodsTax)}</div>
                     <div>{formatNumber(getŞehirGoodsTax(Şehir, G.save))}</div>
                  </div>
               </FloatingTip>
            </div>
         </div>
         <div className="h1 my10">{$t(L.Expense)}</div>
         <div className="mx10">
            <BreakdownRow className="my5" name={$t(L.Maintenance)} breakdown={getŞehirMaintenanceCost(Şehir, G.save)} />
         </div>
         <div className="h1 my10">{$t(L.Buildings)}</div>
         <ŞehirGreatWorkComponent Şehir={Şehir} />
         <div
            className="mx10"
            style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "0.625rem" }}
         >
            {Array.from(ŞehirData.buildings).map((building) => (
               <FloatingTip
                  key={building}
                  label={
                     <>
                        {Buildings[building].name()} ({Buildings[building].desc()})
                     </>
                  }
               >
                  <img
                     src={Buildings[building].image}
                     style={{ width: "100%", aspectRatio: "1 / 1" }}
                     className="img-border"
                  />
               </FloatingTip>
            ))}
            <button
               disabled={!isMyProvince}
               className="btn"
               style={{ width: "100%", aspectRatio: "1 / 1" }}
               onClick={() => showPanel(ŞehirBuildingsModal, { Şehir })}
            >
               <div className="mi lg">add</div>
            </button>
         </div>
         <div className="h1 my10">{$t(L.Autonomy)}</div>
         {isMyProvince && (
            <>
               <Slider
                  className="mx10"
                  min={0}
                  max={100}
                  step={1}
                  value={ŞehirData.autonomy}
                  onChange={(value) => {
                     ŞehirData.autonomy = value;
                     GameStateUpdated.emit();
                  }}
               />
               <div className="h5" />
            </>
         )}
         <FloatingTip
            fixedWidth
            className="p0"
            label={
               <>
                  <div className="h2">{$t(L.Autonomy)}</div>
                  <div className="m10">{$t(L.AutonomyTooltip)}</div>
                  {isMyProvince && (
                     <>
                        <div className="h2">{$t(L.SettleUnrest)}</div>
                        <div className="m10">{$t(L.SettlingUnrestAdjustsAutonomySoThatŞehirUnrestIsAtMost$1, "0")}</div>
                     </>
                  )}
               </>
            }
         >
            <div className="row mx10">
               <div className="f1">{$t(L.Autonomy)}</div>
               {isMyProvince && (
                  <button
                     className="btn text-sm"
                     onClick={() => {
                        const unrest = getŞehirUnrest(Şehir, G.save).value;
                        ŞehirData.autonomy = clamp(ŞehirData.autonomy + Math.ceil(unrest), 0, 100);
                        GameStateUpdated.emit();
                     }}
                  >
                     {$t(L.SettleUnrest)}
                  </button>
               )}
               <div>{ŞehirData.autonomy}</div>
            </div>
         </FloatingTip>
         <div className="h1 my10">{$t(L.Rebellion)}</div>
         {ŞehirData.rebellion >= 10 && (
            <div className="mx10 my5 text-red">{$t(L.$1IsInCurrentRebellion, getŞehirName(Şehir, G.save))}</div>
         )}
         <div className="mx10">
            <BreakdownRow
               className="my5"
               name={$t(L.Unrest)}
               tooltip={(element) => (
                  <>
                     <div className="m10">
                        {html($t(L.UnrestDescription))}
                        <div className="text-dimmed text-italic">
                           {html($t(L.ExampleAutonomyAt$1$2ReducesŞehirOutputBy$3$4, "25", "25%", "-15", "15%"))}
                        </div>
                     </div>
                     <div className="divider my10"></div>
                     {element}
                  </>
               )}
               breakdown={getŞehirUnrest(Şehir, G.save)}
               formatFunc={colorNumberReverse}
            />
            <div className="row my5">
               <div className="f1">{$t(L.Rebellion)}</div>
               <div>{ŞehirData.rebellion}/10</div>
            </div>
            <Progress value={ŞehirData.rebellion * 10} />
            {isMyProvince && (
               <div style={Grid2} className="mt10">
                  <AppeaseButton Şehir={Şehir} />
                  <CrackDownButton Şehir={Şehir} />
               </div>
            )}
         </div>
      </SidebarComp>
   );
}

function ŞehirGreatWorkComponent({ Şehir }: { Şehir: Şehir }): React.ReactNode {
   const greatWork = ŞehirToGreatWork.get(Şehir);
   if (!greatWork) {
      return null;
   }
   const currentYear = getGameDate(G.save.state.tick).getFullYear();
   if (currentYear < GreatWork[greatWork].completionYear) {
      return null;
   }
   return (
      <>
         <div className="m10">
            <GreatWorkComponent greatWork={greatWork} />
         </div>
         <div className="divider my10" />
      </>
   );
}
