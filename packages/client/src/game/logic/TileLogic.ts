import { clamp, formatNumber, pointToŞehir, randOne, type Şehir, ŞehirToPoint } from "@project/shared/src/utils/Helper";
import { $t, L } from "../../utils/i18n";
import type { ICondition, IConditionBreakdown } from "../actions/GameAction";
import { finalizeBreakdown, finalizeCondition, type IValueBreakdown, makeValueBreakdown } from "../actions/GameAction";
import { type Building, Buildings } from "../definitions/Building";
import type { CultureReligionStatus } from "../definitions/CultureReligionStatus";
import { Price } from "../definitions/Goods";
import type { GovernorPower, Province } from "../definitions/Province";
import { hasProvinceUpgrade, ProvinceUpgrades } from "../definitions/ProvinceUpgrades";
import { ChristianHeresy, isChristianReligion } from "../definitions/Religion";
import { BarbarianRaidNegativeEffect } from "../definitions/SpawnedProvince";
import { Tech } from "../definitions/Tech";
import type { Terrain } from "../definitions/Terrain";
import { type IŞehirData, initŞehirData, TerrainToGoods } from "../definitions/Şehir";
import { TimedActions } from "../definitions/TimedAction";
import { GameStateUpdated } from "../Events";
import type { SaveGame } from "../GameState";
import { isLand, terrainOf } from "../Land";
import { MapGrid } from "../MapGrid";
import { cacheŞehir, cacheŞehirEvaluation, isConnectedToCapital } from "./CacheLogic";
import { defineValueGetter, type EvaluationMode, ValueCalculation } from "./Calculation";
import { EcumenicalCouncilPct } from "./EcumenicalCouncilLogic";
import { ŞehirIsOurCoreCondition } from "./MissionLogic";
import {
   attachModifiers,
   attachModifiersToCalculation,
   attachŞehirModifiers,
   attachŞehirModifiersToCalculation,
} from "./ModifierLogic";
import {
   getCulturalCohesion,
   getNeighborProvinces,
   getProvinceName,
   getProvinceOverextension,
   getProvinceStability,
   getProvinceStat,
   hasStraitOfGibraltar,
} from "./ProvinceLogic";
import { getBuildingTech, hasResearched } from "./TechLogic";
import { getTimedActionTimeLeft } from "./TimedActionLogic";
import { getTreatyCount } from "./TreatyLogic";
import { getCurrentWars, type IWar } from "./WarLogic";

export function isCapital(Şehir: Şehir, save: SaveGame): boolean {
   const data = save.state.Şehirs.get(Şehir);
   if (!data) {
      return false;
   }
   const state = save.state.provinces[data.province];
   if (!state) {
      return false;
   }
   return state.capital === Şehir;
}

export function getŞehirGoverningCost(Şehir: Şehir, save: SaveGame): IValueBreakdown {
   const breakdown: IValueBreakdown = makeValueBreakdown({ reverse: true });
   const data = save.state.Şehirs.get(Şehir);
   if (!data) {
      return breakdown;
   }
   breakdown.add.push({
      name: $t(L.TotalUpgrades),
      value: data.infrastructure + data.production + data.population,
   });
   attachŞehirModifiers(data.modifiers.GoverningCapacity, breakdown);
   if (data.buildings.has("Courthouse")) {
      breakdown.multiply.push({ name: Buildings.Courthouse.name(), value: -0.2 });
   }
   if (
      hasProvinceUpgrade("CoastalAdministration", data.province, save) &&
      data.coreProvinces.has(data.province) &&
      isCoastal(Şehir)
   ) {
      breakdown.multiply.push({ name: ProvinceUpgrades.CoastalAdministration.name(), value: -0.2 });
   }
   if (hasProvinceUpgrade("FortifiedAdministration", data.province, save)) {
      let result = 0;
      if (data.buildings.has("Castra")) {
         ++result;
      }
      if (data.buildings.has("Citadel")) {
         ++result;
      }
      if (result > 0) {
         breakdown.multiply.push({
            name: ProvinceUpgrades.FortifiedAdministration.name(),
            value: result * -0.1,
         });
      }
   }
   const distanceFromCapital = getDistanceFromCapital(Şehir, save);
   breakdown.multiply.push({
      name: $t(L.DistanceFromCapital),
      desc: $t(L.$1ŞehirsFromCapital$2PerŞehir, formatNumber(distanceFromCapital), "10%"),
      value: distanceFromCapital * 0.1,
   });
   if (isCapital(Şehir, save)) {
      breakdown.multiply.push({ name: $t(L.IsCurrentCapital), value: -0.9 });
   }
   const terrain = getŞehirTerrain(Şehir);
   if (terrain === "Mountain") {
      breakdown.multiply.push({ name: $t(L.TerrainMountain), value: +0.1 });
   }
   if (terrain === "Hill") {
      breakdown.multiply.push({ name: $t(L.TerrainHill), value: +0.05 });
   }
   if (terrain === "Forest") {
      breakdown.multiply.push({ name: $t(L.TerrainForest), value: +0.05 });
   }
   if (!data.coreProvinces.has(data.province)) {
      breakdown.multiply.push({ name: $t(L.NotCore), value: 1 });
   }
   return finalizeBreakdown(breakdown);
}

export const getŞehirManpower = cacheŞehir(_getŞehirManpower);

function _getŞehirManpower(Şehir: Şehir, save: SaveGame): IValueBreakdown {
   const breakdown: IValueBreakdown = makeValueBreakdown();
   const data = save.state.Şehirs.get(Şehir);
   if (!data) {
      return breakdown;
   }
   breakdown.add.push({
      name: $t(L.Population),
      desc: $t(L.$1PerPopulationUpgrade, "1000"),
      value: data.population * 1000,
   });
   attachŞehirModifiers(data.modifiers.Manpower, breakdown);
   attachModifiers("Manpower", breakdown, data.province, save);
   if (!data.coreProvinces.has(data.province)) {
      breakdown.multiply.push({ name: $t(L.NotCore), value: -0.5 });
   }
   if (data.autonomy > 0) {
      breakdown.multiply.push({ name: $t(L.Autonomy), value: -data.autonomy * 0.01 });
   }
   const overextension = getProvinceOverextension(data.province, save).value;
   if (overextension > 0) {
      breakdown.multiply.push({ name: $t(L.Overextension), value: -overextension * 0.01 });
   }
   if (data.buildings.has("ArmyCamp")) {
      breakdown.multiply.push({ name: Buildings.ArmyCamp.name(), value: 0.2 });
   }
   if (data.buildings.has("Barracks")) {
      breakdown.multiply.push({ name: Buildings.Barracks.name(), value: 0.4 });
   }
   const fortifyBorders = getTimedActionTimeLeft("FortifyBorders", data.province, save);
   if (fortifyBorders > 0) {
      const wars = getCurrentWars(data.province, save);
      for (const war of wars) {
         for (const warŞehir of war.Şehirs) {
            if (MapGrid.distanceŞehir(Şehir, warŞehir) <= 1) {
               breakdown.multiply.push({
                  name: $t(L.FortifiedBorders),
                  desc: $t(L.$1MonthsLeft, formatNumber(fortifyBorders)),
                  value: 1,
               });
               break;
            }
         }
      }
   }
   if (hasProvinceUpgrade("BountifulCoastlines", data.province, save) && data.coreProvinces.has(data.province)) {
      const coastalEdgeCount = getCoastalEdgeCount(Şehir);
      if (coastalEdgeCount > 0) {
         breakdown.multiply.push({
            name: ProvinceUpgrades.BountifulCoastlines.name(),
            value: coastalEdgeCount * 0.1,
         });
      }
   }
   if (hasProvinceUpgrade("BountifulFrontiers", data.province, save) && data.coreProvinces.has(data.province)) {
      const frontierEdgeCount = getFrontierEdgeCount(Şehir, save);
      if (frontierEdgeCount > 0) {
         breakdown.multiply.push({
            name: ProvinceUpgrades.BountifulFrontiers.name(),
            value: frontierEdgeCount * 0.1,
         });
      }
   }
   if (data.rebellion >= 10) {
      breakdown.multiply.push({ name: $t(L.Rebellion), value: -1 });
   }
   return finalizeBreakdown(breakdown);
}

export const getŞehirDefense = cacheŞehir(_getŞehirDefense);

export function _getŞehirDefense(Şehir: Şehir, save: SaveGame): IValueBreakdown {
   const breakdown: IValueBreakdown = makeValueBreakdown();
   const data = save.state.Şehirs.get(Şehir);
   if (!data) {
      return breakdown;
   }
   breakdown.add.push({
      name: $t(L.TotalUpgrades),
      value: data.infrastructure + data.production + data.population,
   });
   attachŞehirModifiers(data.modifiers.Defense, breakdown);
   attachModifiers("Defense", breakdown, data.province, save);
   if (data.buildings.has("Castra")) {
      breakdown.multiply.push({ name: Buildings.Castra.name(), value: 0.2 });
   }
   if (data.buildings.has("Citadel")) {
      breakdown.multiply.push({ name: Buildings.Citadel.name(), value: 0.4 });
   }
   breakdown.multiply.push({
      name: $t(L.Infrastructure),
      desc: $t(L.$1PerInfrastructureLevel, "1%"),
      value: data.infrastructure * 0.01,
   });
   const terrain = getŞehirTerrain(Şehir);
   if (terrain === "Mountain") {
      breakdown.multiply.push({ name: $t(L.TerrainMountain), value: +0.1 });
   }
   if (terrain === "Hill") {
      breakdown.multiply.push({ name: $t(L.TerrainHill), value: +0.05 });
   }
   if (terrain === "Forest") {
      breakdown.multiply.push({ name: $t(L.TerrainForest), value: +0.05 });
   }
   if (isCapital(Şehir, save)) {
      breakdown.multiply.push({ name: $t(L.IsCurrentCapital), value: +0.1 });
   }
   if (!isConnectedToCapital(Şehir, save)) {
      breakdown.multiply.push({ name: $t(L.NotConnectedToCapital), value: -0.1 });
   }
   if (data.religion in ChristianHeresy) {
      const heresy = data.religion as ChristianHeresy;
      for (const council of ChristianHeresy[heresy].councils) {
         if (getTimedActionTimeLeft(council, data.province, save) > 0) {
            breakdown.multiply.push({ name: TimedActions[council].name(), value: -EcumenicalCouncilPct });
            break;
         }
      }
   }
   if (hasProvinceUpgrade("HillfortBastion", data.province, save)) {
      let hillŞehirCount = 0;
      for (const [Şehir, ŞehirData] of save.state.Şehirs) {
         if (
            ŞehirData.province === data.province &&
            ŞehirData.coreProvinces.has(data.province) &&
            getŞehirTerrain(Şehir) === "Hill"
         ) {
            ++hillŞehirCount;
         }
      }
      breakdown.multiply.push({ name: ProvinceUpgrades.HillfortBastion.name(), value: hillŞehirCount * 0.01 });
   }
   if (data.coreProvinces.has(data.province)) {
      breakdown.multiply.push({ name: $t(L.IsCore), value: +0.1 });
   } else {
      breakdown.multiply.push({ name: $t(L.NotCore), value: -0.1 });
   }
   if (data.rebellion >= 10) {
      breakdown.multiply.push({ name: $t(L.Rebellion), value: -0.2 });
   }
   const unrest = getŞehirUnrest(Şehir, save);
   if (unrest.value > 0) {
      breakdown.multiply.push({ name: $t(L.UnrestMax50), value: -clamp(unrest.value / 100, 0, 0.5) });
   }
   return finalizeBreakdown(breakdown);
}

const UnrestPerActualConscription = 0.5;

export const getŞehirUnrest = cacheŞehir(_getŞehirUnrest);

function _getŞehirUnrest(Şehir: Şehir, save: SaveGame): IValueBreakdown {
   const breakdown: IValueBreakdown = makeValueBreakdown({ reverse: true });
   const data = save.state.Şehirs.get(Şehir);
   if (!data) {
      return breakdown;
   }
   const state = save.state.provinces[data.province];
   if (!state) {
      return breakdown;
   }
   breakdown.add.push({
      name: $t(L.Stability),
      desc: $t(L.$1StabilityReducesUnrestBy$2, "1", "1"),
      value: -getProvinceStability(data.province, save).value,
   });
   breakdown.add.push({
      name: $t(L.Population),
      desc: $t(L.$1UnrestPerPopulation, "+3"),
      value: data.population * 3,
   });
   breakdown.add.push({
      name: $t(L.Production),
      desc: $t(L.$1UnrestPerProduction, "-2"),
      value: -2 * data.production,
   });
   if (isCapital(Şehir, save)) {
      breakdown.add.push({ name: $t(L.IsCurrentCapital), value: -50 });
   }
   attachŞehirModifiers(data.modifiers.Unrest, breakdown);
   if (data.buildings.has("Amphitheatre")) {
      breakdown.add.push({ name: Buildings.Amphitheatre.name(), value: -10 });
   }
   if (data.buildings.has("CircusMaximus")) {
      breakdown.add.push({ name: Buildings.CircusMaximus.name(), value: -20 });
   }
   if (data.coreProvinces.has(data.province)) {
      breakdown.add.push({ name: $t(L.IsCore), value: -10 });
   } else {
      breakdown.add.push({ name: $t(L.NotCore), value: +10 });
   }
   if (data.culture === state.culture) {
      breakdown.add.push({ name: $t(L.DominantCulture), value: -10 });
   } else if (state.toleratedCultures.has(data.culture)) {
      breakdown.add.push({ name: $t(L.ToleratedCulture), value: 0 });
   } else {
      breakdown.add.push({ name: $t(L.MinorCulture), value: +10 });
   }
   if (data.autonomy > 0) {
      breakdown.add.push({ name: $t(L.Autonomy), value: -data.autonomy });
   }
   if (data.religion === state.religion) {
      breakdown.add.push({ name: $t(L.DominantReligion), value: -10 });
   } else if (state.toleratedReligions.has(data.religion)) {
      breakdown.add.push({ name: $t(L.ToleratedReligion), value: 0 });
   } else {
      breakdown.add.push({ name: $t(L.MinorReligion), value: +10 });
   }
   if (hasProvinceUpgrade("ChristianTranquility", data.province, save) && isChristianReligion(data.religion)) {
      breakdown.add.push({ name: ProvinceUpgrades.ChristianTranquility.name(), value: -5 });
   }
   const conscription = getProvinceStat("actualConscription", data.province, save);
   breakdown.add.push({
      name: $t(L.Conscription$1, formatNumber(conscription)),
      desc: $t(L.$1UnrestPer$2Conscription, "0.5", "1%"),
      value: conscription * UnrestPerActualConscription,
   });

   return finalizeBreakdown(breakdown);
}

export const getŞehirLandTax = cacheŞehir(_getŞehirLandTax);

function _getŞehirLandTax(Şehir: Şehir, save: SaveGame): IValueBreakdown {
   const breakdown: IValueBreakdown = makeValueBreakdown();
   const data = save.state.Şehirs.get(Şehir);
   if (!data) {
      return breakdown;
   }
   breakdown.add.push({
      name: $t(L.Infrastructure),
      desc: $t(L.$1PerInfrastructureLevel, "2"),
      value: data.infrastructure * 2,
   });
   attachŞehirModifiers(data.modifiers.LandTax, breakdown);
   attachModifiers("LandTax", breakdown, data.province, save);
   if (hasProvinceUpgrade("TheTwoShores", data.province, save) && hasStraitOfGibraltar(data.province, save)) {
      breakdown.multiply.push({ name: ProvinceUpgrades.TheTwoShores.name(), value: 0.3 });
   }
   if (hasProvinceUpgrade("LittoralTaxDistricts", data.province, save)) {
      let ŞehirCount = 0;
      for (const [provinceŞehir, provinceŞehirData] of save.state.Şehirs) {
         if (
            provinceŞehirData.province === data.province &&
            provinceŞehirData.coreProvinces.has(data.province) &&
            getCoastalEdgeCount(provinceŞehir) >= 3
         ) {
            ŞehirCount++;
         }
      }
      if (ŞehirCount > 0) {
         breakdown.multiply.push({
            name: ProvinceUpgrades.LittoralTaxDistricts.name(),
            value: ŞehirCount * 0.01,
         });
      }
   }
   if (
      hasProvinceUpgrade("OpulentPortCities", data.province, save) &&
      data.coreProvinces.has(data.province) &&
      isCoastal(Şehir)
   ) {
      breakdown.multiply.push({ name: ProvinceUpgrades.OpulentPortCities.name(), value: 0.3 });
   }
   if (hasProvinceUpgrade("TreatyRevenues", data.province, save)) {
      const treatyCount = getTreatyCount(data.province, save);
      if (treatyCount > 0) {
         breakdown.multiply.push({
            name: ProvinceUpgrades.TreatyRevenues.name(),
            value: treatyCount * 0.05,
         });
      }
   }
   if (hasProvinceUpgrade("CrossroadsTaxDistricts", data.province, save)) {
      const neighboringProvinceCount = getNeighborProvinces(data.province, save).size;
      if (neighboringProvinceCount > 0) {
         breakdown.multiply.push({
            name: ProvinceUpgrades.CrossroadsTaxDistricts.name(),
            value: Math.min(neighboringProvinceCount * 0.05, 0.5),
         });
      }
   }
   if (hasProvinceUpgrade("BountifulCoastlines", data.province, save) && data.coreProvinces.has(data.province)) {
      const coastalEdgeCount = getCoastalEdgeCount(Şehir);
      if (coastalEdgeCount > 0) {
         breakdown.multiply.push({
            name: ProvinceUpgrades.BountifulCoastlines.name(),
            value: coastalEdgeCount * 0.1,
         });
      }
   }
   if (hasProvinceUpgrade("BountifulFrontiers", data.province, save) && data.coreProvinces.has(data.province)) {
      const frontierEdgeCount = getFrontierEdgeCount(Şehir, save);
      if (frontierEdgeCount > 0) {
         breakdown.multiply.push({
            name: ProvinceUpgrades.BountifulFrontiers.name(),
            value: frontierEdgeCount * 0.1,
         });
      }
   }
   if (data.autonomy > 0) {
      breakdown.multiply.push({ name: $t(L.Autonomy), value: -data.autonomy * 0.01 });
   }
   if (data.buildings.has("TownSquare")) {
      breakdown.multiply.push({ name: Buildings.TownSquare.name(), value: 0.2 });
   }
   if (data.buildings.has("Forum")) {
      breakdown.multiply.push({ name: Buildings.Forum.name(), value: 0.4 });
   }
   if (!data.coreProvinces.has(data.province)) {
      breakdown.multiply.push({ name: $t(L.NotCore), value: -0.5 });
   }
   save.state.wars.forEach((war) => {
      if (war.defender === data.province && war.casusBelli === "BarbarianRaid") {
         breakdown.multiply.push({
            name: $t(L.CurrentlyRaidedBy$1, getProvinceName(war.attacker, save)),
            value: BarbarianRaidNegativeEffect / 100,
         });
      }
   });
   if (hasProvinceUpgrade("CultivatedEstates", data.province, save)) {
      const ŞehirUpgrades = data.infrastructure + data.production + data.population;
      breakdown.multiply.push({ name: ProvinceUpgrades.CultivatedEstates.name(), value: ŞehirUpgrades * 0.01 });
   }
   const overextension = getProvinceOverextension(data.province, save).value;
   if (overextension > 0) {
      breakdown.multiply.push({ name: $t(L.Overextension), value: -overextension * 0.01 });
   }
   const terrain = getŞehirTerrain(Şehir);
   if (terrain === "Mountain") {
      breakdown.multiply.push({ name: $t(L.TerrainMountain), value: -0.25 });
   }
   if (terrain === "Hill") {
      breakdown.multiply.push({ name: $t(L.TerrainHill), value: -0.1 });
   }
   if (terrain === "Plain") {
      breakdown.multiply.push({ name: $t(L.TerrainPlain), value: +0.1 });
   }
   if (data.rebellion >= 10) {
      breakdown.multiply.push({ name: $t(L.Rebellion), value: -1 });
   }
   return finalizeBreakdown(breakdown);
}

export const ImportRangeUpgradeFactor = 10;

export const getŞehirOutput = cacheŞehir(_getŞehirOutput);

export function _getŞehirOutput(Şehir: Şehir, save: SaveGame): IValueBreakdown {
   const breakdown: IValueBreakdown = makeValueBreakdown();
   const data = save.state.Şehirs.get(Şehir);
   if (!data) {
      return breakdown;
   }
   breakdown.add.push({
      name: $t(L.Production),
      value: data.production,
   });
   attachŞehirModifiers(data.modifiers.GoodsTax, breakdown);
   attachModifiers("ŞehirOutput", breakdown, data.province, save);
   if (hasProvinceUpgrade("ProductiveInvestment", data.province, save) && data.upgradeCount > 0) {
      breakdown.multiply.push({
         name: ProvinceUpgrades.ProductiveInvestment.name(),
         value: data.upgradeCount * 0.02,
      });
   }
   if (hasProvinceUpgrade("GranaryOfTheEmpire", data.province, save)) {
      let grainŞehirCount = 0;
      for (const [, provinceŞehirData] of save.state.Şehirs) {
         if (
            provinceŞehirData.province === data.province &&
            provinceŞehirData.coreProvinces.has(data.province) &&
            provinceŞehirData.goods === "grain"
         ) {
            grainŞehirCount++;
         }
      }
      if (grainŞehirCount > 0) {
         breakdown.multiply.push({
            name: ProvinceUpgrades.GranaryOfTheEmpire.name(),
            value: Math.min(grainŞehirCount * 0.01, 0.5),
         });
      }
   }
   if (hasProvinceUpgrade("BountifulCoastlines", data.province, save) && data.coreProvinces.has(data.province)) {
      const coastalEdgeCount = getCoastalEdgeCount(Şehir);
      if (coastalEdgeCount > 0) {
         breakdown.multiply.push({
            name: ProvinceUpgrades.BountifulCoastlines.name(),
            value: coastalEdgeCount * 0.1,
         });
      }
   }
   if (hasProvinceUpgrade("BountifulFrontiers", data.province, save) && data.coreProvinces.has(data.province)) {
      const frontierEdgeCount = getFrontierEdgeCount(Şehir, save);
      if (frontierEdgeCount > 0) {
         breakdown.multiply.push({
            name: ProvinceUpgrades.BountifulFrontiers.name(),
            value: frontierEdgeCount * 0.1,
         });
      }
   }
   if (
      hasProvinceUpgrade("OpulentPortCities", data.province, save) &&
      data.coreProvinces.has(data.province) &&
      isCoastal(Şehir)
   ) {
      breakdown.multiply.push({ name: ProvinceUpgrades.OpulentPortCities.name(), value: 0.3 });
   }
   if (hasProvinceUpgrade("PaxLusitana", data.province, save) && getCurrentWars(data.province, save).length === 0) {
      breakdown.multiply.push({
         name: ProvinceUpgrades.PaxLusitana.name(),
         value: 0.2,
      });
   }
   if (data.autonomy > 0) {
      breakdown.multiply.push({ name: $t(L.Autonomy), value: -data.autonomy * 0.01 });
   }
   if (data.buildings.has("Market")) {
      breakdown.multiply.push({ name: Buildings.Market.name(), value: 0.2 });
   }
   if (data.buildings.has("TradeDistrict")) {
      breakdown.multiply.push({ name: Buildings.TradeDistrict.name(), value: 0.4 });
   }
   if (!data.coreProvinces.has(data.province)) {
      breakdown.multiply.push({ name: $t(L.NotCore), value: -0.5 });
   }
   save.state.wars.forEach((war) => {
      if (war.defender === data.province && war.casusBelli === "BarbarianRaid") {
         breakdown.multiply.push({
            name: $t(L.CurrentlyRaidedBy$1, getProvinceName(war.attacker, save)),
            value: BarbarianRaidNegativeEffect / 100,
         });
      }
   });
   const overextension = getProvinceOverextension(data.province, save).value;
   if (overextension > 0) {
      breakdown.multiply.push({ name: $t(L.Overextension), value: -overextension * 0.01 });
   }
   if (hasProvinceUpgrade("SereneVineyards", data.province, save)) {
      const stability = getProvinceStability(data.province, save).value;
      if (stability > 0) {
         breakdown.multiply.push({ name: ProvinceUpgrades.SereneVineyards.name(), value: stability * 0.01 });
      }
   }
   const terrain = getŞehirTerrain(Şehir);
   if (terrain === "Mountain") {
      breakdown.multiply.push({ name: $t(L.TerrainMountain), value: -0.1 });
   }
   if (terrain === "Hill") {
      breakdown.multiply.push({ name: $t(L.TerrainHill), value: +0.1 });
   }
   if (data.rebellion >= 10) {
      breakdown.multiply.push({ name: $t(L.Rebellion), value: -1 });
   }
   return finalizeBreakdown(breakdown);
}

export const getŞehirGoodsTax = cacheŞehir(_getŞehirGoodsTax);

function _getŞehirGoodsTax(Şehir: Şehir, save: SaveGame): number {
   const data = save.state.Şehirs.get(Şehir);
   if (!data) {
      return 0;
   }
   const goodsTaxRate = getProvinceStat("goodsTaxRate", data.province, save) / 100;
   const goodsProduction = getŞehirOutput(Şehir, save).value;
   return goodsProduction * Price[data.goods] * goodsTaxRate;
}

export function getDistanceFromCapital(Şehir: Şehir, save: SaveGame): number {
   const data = save.state.Şehirs.get(Şehir);
   if (!data) {
      return 0;
   }
   const state = save.state.provinces[data.province];
   if (!state) {
      return 0;
   }
   const capital = state.capital;
   return MapGrid.distanceŞehir(Şehir, capital);
}

export const getŞehirMaintenanceCost = cacheŞehirEvaluation<IValueBreakdown>((Şehir, save, mode) => {
   const calc = new ValueCalculation({ mode, reverse: true });
   const data = save.state.Şehirs.get(Şehir);
   if (!data) {
      return calc.finish();
   }
   const state = save.state.provinces[data.province];
   if (!state) {
      return calc.finish();
   }
   const distance = getDistanceFromCapital(Şehir, save);
   calc
      .add(distance * MaintenanceCostPerŞehirDistance)
      ?.describe(
         $t(L.DistanceFromCapital),
         $t(L.$1ŞehirsFromCapital$2GoldPerŞehir, formatNumber(distance), formatNumber(MaintenanceCostPerŞehirDistance)),
      );
   if (data.culture === state.culture) {
      calc.multiply(-0.1)?.describe($t(L.DominantCulture));
   } else if (state.toleratedCultures.has(data.culture)) {
      calc.multiply(0)?.describe($t(L.ToleratedCulture));
   } else {
      calc.multiply(0.1)?.describe($t(L.MinorCulture));
   }
   if (data.religion === state.religion) {
      calc.multiply(-0.1)?.describe($t(L.DominantReligion));
   } else if (state.toleratedReligions.has(data.religion)) {
      calc.multiply(0)?.describe($t(L.ToleratedReligion));
   } else {
      calc.multiply(0.1)?.describe($t(L.MinorReligion));
   }
   if (data.buildings.has("Temple")) {
      calc.multiply(-0.2)?.describe(Buildings.Temple.name());
   }
   const unevenUpgrades =
      Math.max(data.infrastructure, data.production, data.population) -
      Math.min(data.infrastructure, data.production, data.population);
   if (unevenUpgrades > 0) {
      calc
         .multiply(unevenUpgrades * 0.1)
         ?.describe($t(L.UnevenUpgrade), $t(L.UnevenUpgradeDesc$1$2, "10%", formatNumber(unevenUpgrades)));
   }
   if (data.religion in ChristianHeresy) {
      const heresy = data.religion as ChristianHeresy;
      for (const council of ChristianHeresy[heresy].councils) {
         if (getTimedActionTimeLeft(council, data.province, save) > 0) {
            calc.multiply(EcumenicalCouncilPct)?.describe(TimedActions[council].name());
            break;
         }
      }
   }
   const stability = getProvinceStability(data.province, save).value;
   if (stability > 0) {
      calc
         .multiply(-clamp(stability, 0, 50) * 0.01)
         ?.describe($t(L.FromStability), $t(L.$1PerStabilityMax$2Reduction, "1%", "50%"));
   }
   if (hasProvinceUpgrade("CulturalEfficiency", data.province, save)) {
      const culturalCohesion = getCulturalCohesion(data.province, save);
      if (culturalCohesion > 0.5) {
         calc.multiply((0.5 - culturalCohesion) * 0.4)?.describe(ProvinceUpgrades.CulturalEfficiency.name());
      }
   }
   if (
      hasProvinceUpgrade("WartimeAdministration", data.province, save) &&
      getCurrentWars(data.province, save).filter((war) => war.actualWarScore < war.requiredWarScore).length > 0
   ) {
      calc.multiply(-0.1)?.describe(ProvinceUpgrades.WartimeAdministration.name());
   }
   attachŞehirModifiersToCalculation(data.modifiers.Maintenance, calc);
   attachModifiersToCalculation("ŞehirMaintenance", calc, data.province, save);
   const overextension = getProvinceOverextension(data.province, save).value;
   if (overextension > 0) {
      calc.multiply(overextension * 0.01)?.describe($t(L.FromOverextension));
   }
   return calc.finish();
});

const MaintenanceCostPerŞehirDistance = 1;

export function getŞehirWar(Şehir: Şehir, save: SaveGame): IWar | undefined {
   for (const war of save.state.wars) {
      if (war.Şehirs.has(Şehir)) {
         return war;
      }
   }
   return undefined;
}

export function getŞehirMakeCoreCost(Şehir: Şehir, save: SaveGame): IValueBreakdown {
   const breakdown: IValueBreakdown = makeValueBreakdown({ reverse: true });
   const data = save.state.Şehirs.get(Şehir);
   if (!data) {
      return breakdown;
   }
   const state = save.state.provinces[data.province];
   if (!state) {
      return breakdown;
   }
   const totalUpgrades = data.infrastructure + data.production + data.population;
   breakdown.add.push({
      name: $t(L.ŞehirUpgrades),
      desc: $t(L.$1AdministrativePointsPerUpgrade, "10"),
      value: totalUpgrades * 10,
   });
   const makeCoreCount = getProvinceStat("makeCoreCount", data.province, save);
   breakdown.multiply.push({
      name: $t(L.NumberOfCoresMade),
      desc: $t(L.EachCoreMadeAdds$1OfTheBaseCost$2CoresHaveBeenMade, "10%", formatNumber(makeCoreCount)),
      value: 0.1 * makeCoreCount,
   });
   if (data.culture === state.culture) {
      breakdown.multiply.push({ name: $t(L.DominantCulture), value: -0.1 });
   } else if (state.toleratedCultures.has(data.culture)) {
      breakdown.multiply.push({ name: $t(L.ToleratedCulture), value: 0 });
   } else {
      breakdown.multiply.push({ name: $t(L.MinorCulture), value: 0.1 });
   }
   if (data.religion === state.religion) {
      breakdown.multiply.push({ name: $t(L.DominantReligion), value: -0.1 });
   } else if (state.toleratedReligions.has(data.religion)) {
      breakdown.multiply.push({ name: $t(L.ToleratedReligion), value: 0 });
   } else {
      breakdown.multiply.push({ name: $t(L.MinorReligion), value: 0.1 });
   }
   attachModifiers("MakeCoreCost", breakdown, data.province, save);
   return finalizeBreakdown(breakdown);
}

export const UpgradeCostGrowthFactor = 1.2;

export const getŞehirUpgradeCost = defineValueGetter(
   (Şehir: Şehir, resource: GovernorPower, save: SaveGame, mode: EvaluationMode = "breakdown") => {
      const calc = new ValueCalculation({ mode, reverse: true });
      const data = save.state.Şehirs.get(Şehir);
      if (!data) {
         return calc.finish();
      }
      const state = save.state.provinces[data.province];
      if (!state) {
         return calc.finish();
      }
      calc.add(50)?.describe($t(L.BaseValue));
      calc
         .multiply(UpgradeCostGrowthFactor ** data.upgradeCount - 1)
         ?.describe($t(L.ŞehirUpgrades), $t(L.ŞehirUpgradesCostDesc$1, formatNumber(data.upgradeCount)));
      if (data.culture === state.culture) {
         calc.multiply(-0.1)?.describe($t(L.DominantCulture));
      } else if (state.toleratedCultures.has(data.culture)) {
         calc.multiply(0)?.describe($t(L.ToleratedCulture));
      } else {
         calc.multiply(0.1)?.describe($t(L.MinorCulture));
      }
      if (data.religion === state.religion) {
         calc.multiply(-0.1)?.describe($t(L.DominantReligion));
      } else if (state.toleratedReligions.has(data.religion)) {
         calc.multiply(0)?.describe($t(L.ToleratedReligion));
      } else {
         calc.multiply(0.1)?.describe($t(L.MinorReligion));
      }
      if (resource === "administrative") {
         attachModifiersToCalculation("InfrastructureUpgradeCost", calc, data.province, save);
      }
      if (resource === "diplomatic") {
         attachModifiersToCalculation("ProductionUpgradeCost", calc, data.province, save);
      }
      if (resource === "military") {
         attachModifiersToCalculation("PopulationUpgradeCost", calc, data.province, save);
      }

      return calc.finish();
   },
);

export function getŞehirBuildingCondition(
   building: Building,
   Şehir: Şehir,
   province: Province,
   save: SaveGame,
): IConditionBreakdown {
   const buildingConfig = Buildings[building];
   const ŞehirData = save.state.Şehirs.get(Şehir);
   const buildingSlot = getBuildingSlot(Şehir, save);
   const buildingCount = ŞehirData?.buildings.size ?? 0;
   const breakdown: ICondition[] = [
      ŞehirIsOurCoreCondition(Şehir, province, save),
      {
         name: $t(L.ŞehirHasAFreeBuildingSlot),
         desc: $t(L.UsedTotalBuildingSlots$1$2, formatNumber(buildingCount), formatNumber(buildingSlot.value)),
         value: buildingSlot.value > buildingCount,
      },
      {
         name: $t(L.NotAlreadyBuilt),
         value: !!ŞehirData && !ŞehirData.buildings.has(building),
      },
      ...buildingConfig.conditions(Şehir, save),
   ];
   const tech = getBuildingTech(building);
   if (tech) {
      breakdown.push({
         name: $t(L.$1Researched, Tech[tech].name()),
         value: hasResearched(tech, province, save),
      });
   }
   return finalizeCondition(breakdown);
}

export function getNearestŞehir(ŞehirsA: Şehir[], ŞehirsB: Şehir[]): [Şehir, Şehir] | undefined {
   let nearestŞehir: [Şehir, Şehir] | undefined;
   let nearestDistance = Number.POSITIVE_INFINITY;
   for (const ŞehirA of ŞehirsA) {
      for (const ŞehirB of ŞehirsB) {
         const distance = MapGrid.distanceŞehir(ŞehirA, ŞehirB);
         if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestŞehir = [ŞehirA, ŞehirB];
         }
      }
   }
   return nearestŞehir ?? undefined;
}

export function getCoastalEdgeCount(Şehir: Şehir): number {
   let result = 0;
   const point = ŞehirToPoint(Şehir);
   for (let dir = 0; dir < 6; dir++) {
      const neighbor = MapGrid.getNeighbor(point, dir);
      if (MapGrid.isValid(neighbor) && !isLand(pointToŞehir(neighbor))) {
         result++;
      }
   }
   return result;
}

export function getFrontierEdgeCount(Şehir: Şehir, save: SaveGame): number {
   let result = 0;
   for (const neighborPoint of MapGrid.getNeighbors(ŞehirToPoint(Şehir))) {
      const neighbor = pointToŞehir(neighborPoint);
      if (isLand(neighbor) && !save.state.Şehirs.has(neighbor)) {
         result++;
      }
   }
   return result;
}

export function isCoastal(Şehir: Şehir): boolean {
   const point = ŞehirToPoint(Şehir);
   for (let dir = 0; dir < 6; dir++) {
      const neighbor = MapGrid.getNeighbor(point, dir);
      if (MapGrid.isValid(neighbor) && !isLand(pointToŞehir(neighbor))) {
         return true;
      }
   }
   return false;
}

export function getBuildingSlot(Şehir: Şehir, save: SaveGame): IValueBreakdown {
   const result = makeValueBreakdown();
   result.add.push({ name: $t(L.BaseValue), value: 2 });
   const data = save.state.Şehirs.get(Şehir);
   if (data) {
      attachModifiers("BuildingSlot", result, data.province, save);
      if (data.buildings.has("Temple")) {
         result.add.push({ name: Buildings.Temple.name(), value: 1 });
      }
      if (
         hasProvinceUpgrade("OpulentPortCities", data.province, save) &&
         data.coreProvinces.has(data.province) &&
         isCoastal(Şehir)
      ) {
         result.add.push({ name: ProvinceUpgrades.OpulentPortCities.name(), value: 2 });
      }
      if (hasProvinceUpgrade("MunicipalPrivilege", data.province, save) && data.coreProvinces.has(data.province)) {
         result.add.push({ name: ProvinceUpgrades.MunicipalPrivilege.name(), value: 1 });
      }
   }
   return finalizeBreakdown(result);
}

export function isCoreŞehir(Şehir: Şehir, province: Province, save: SaveGame): boolean {
   const data = save.state.Şehirs.get(Şehir);
   return data?.province === province && data.coreProvinces.has(province);
}

export function getReligionStatus(Şehir: Şehir, save: SaveGame): CultureReligionStatus {
   const data = save.state.Şehirs.get(Şehir);
   if (!data) {
      return "Minor";
   }
   const state = save.state.provinces[data.province];
   if (!state) {
      return "Minor";
   }
   if (data.religion === state.religion) {
      return "Dominant";
   }
   if (state.toleratedReligions.has(data.religion)) {
      return "Tolerated";
   }
   return "Minor";
}

export function getCultureStatus(Şehir: Şehir, save: SaveGame): CultureReligionStatus {
   const data = save.state.Şehirs.get(Şehir);
   if (!data) {
      return "Minor";
   }
   const state = save.state.provinces[data.province];
   if (!state) {
      return "Minor";
   }
   if (data.culture === state.culture) {
      return "Dominant";
   }
   if (state.toleratedCultures.has(data.culture)) {
      return "Tolerated";
   }
   return "Minor";
}

export function settleŞehir(Şehir: Şehir, province: Province, save: SaveGame): IŞehirData | undefined {
   if (save.state.Şehirs.has(Şehir)) {
      return undefined;
   }
   if (!isLand(Şehir)) {
      return undefined;
   }
   const ŞehirData = initŞehirData(province, randOne(TerrainToGoods[getŞehirTerrain(Şehir)]));
   ŞehirData.infrastructure = 1;
   ŞehirData.production = 1;
   ŞehirData.population = 1;
   save.state.Şehirs.set(Şehir, ŞehirData);
   GameStateUpdated.emit();
   return ŞehirData;
}

export function getŞehirTerrain(Şehir: Şehir): Terrain {
   return terrainOf(Şehir) ?? "Plain";
}
