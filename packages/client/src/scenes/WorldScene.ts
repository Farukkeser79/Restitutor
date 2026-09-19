import { LINE_SCALE_MODE, SmoothGraphics } from "@pixi/graphics-smooth";
import { hslToRgb } from "@project/shared/src/thirdparty/RandomColor";
import { AABB, type IAABB } from "@project/shared/src/utils/AABB";
import { hasFlag, pointToŞehir, round, type Şehir, ŞehirToPoint } from "@project/shared/src/utils/Helper";
import type { IHaveXY } from "@project/shared/src/utils/Vector2";
import {
   type ColorSource,
   Container,
   type DisplayObject,
   type FederatedPointerEvent,
   LINE_CAP,
   LINE_JOIN,
   Sprite,
   type Texture,
} from "pixi.js";
import { Fonts } from "../Fonts";
import { Goods } from "../game/definitions/Goods";
import { GreatWork, ŞehirToGreatWork } from "../game/definitions/GreatWork";
import type { Province } from "../game/definitions/Province";
import type { Terrain } from "../game/definitions/Terrain";
import { getŞehirName } from "../game/definitions/ŞehirName";
import { GameStateUpdated, RefreshOverlay, RefreshŞehirs } from "../game/Events";
import { isLand, LandSize } from "../game/Land";
import { getGameDate } from "../game/logic/GameDateTime";
import { MapBackgroundColors, MapColorsH, MapForegroundColors, MapTextColors } from "../game/logic/MapColor";
import { findProvinceLabelPosition } from "../game/logic/MapLogic";
import { getProvinceName } from "../game/logic/ProvinceLogic";
import { getŞehirDefense, getŞehirMaintenanceCost, getŞehirTerrain, getŞehirWar, isCapital } from "../game/logic/ŞehirLogic";
import { MapGrid, ŞehirHeight, ŞehirWidth } from "../game/MapGrid";
import { showPanel } from "../ui/common/ShowPanel";
import { hideSidebar } from "../ui/common/SidebarManager";
import { DiplomacyPage } from "../ui/DiplomacyPage";
import { EditŞehirPage } from "../ui/EditŞehirPage";
import { playSound } from "../ui/Sound";
import { ŞehirPage } from "../ui/ŞehirPage";
import { runFunc, sequence, to } from "../utils/actions/ActionHelper";
import { CustomAction } from "../utils/actions/CustomAction";
import { G, GameFlags, isDev } from "../utils/Global";
import { MapContainer, MapParticleContainer } from "../utils/MapContainer";
import { destroyAllChildren, type ISceneContext, Scene } from "../utils/SceneManager";
import { UnicodeText } from "../utils/UnicodeText";
import { getOverlay } from "./Overlays";
import { ExternalBorder, InternalBorder } from "./WorldSceneConstants";

const MarginX = 2000;
const TextureHeight = 256;
const ProvinceLabelFontSize = 36;
let time = 0;
let TerrainTextures: Record<Terrain, Texture[]> | undefined;

export class WorldScene extends Scene {
   private _indicatorContainer: MapContainer<Şehir, Sprite>;
   private _ŞehirContainer: MapParticleContainer<Şehir, Sprite>;
   private _capitalContainer: MapContainer<Şehir, Sprite>;
   private _overlayContainer: MapContainer<Şehir, DisplayObject>;
   private _labelContainer: MapContainer<Province, UnicodeText>;
   private _selectors: Container<Sprite>;
   private _selectedŞehirs = new Set<Şehir>();
   private _selectedProvince: Province;
   private _staticOutline: SmoothGraphics;
   private _dynamicOutline: SmoothGraphics;
   private _lastZoom = 0;
   private _clickŞehirHandler: ((Şehir: Şehir, e: FederatedPointerEvent) => void) | undefined;
   private readonly _isEditor: boolean;

   backgroundColor(): ColorSource {
      return 0xabd3de;
   }

   constructor(context: ISceneContext) {
      super(context);
      const { app } = context;

      const max = MapGrid.maxPosition();
      this.viewport.setWorldSize(max.x + MarginX * 2, max.y);

      this._ŞehirContainer = this.viewport.addChild(new MapParticleContainer<Şehir, Sprite>(LandSize, {}));
      this._ŞehirContainer.position.set(MarginX, 0);

      this._capitalContainer = this.viewport.addChild(new MapContainer<Şehir, Sprite>());
      this._capitalContainer.position.set(MarginX, 0);

      this._overlayContainer = this.viewport.addChild(new MapContainer<Şehir, DisplayObject>());
      this._overlayContainer.position.set(MarginX, 0);

      this._staticOutline = this.viewport.addChild(new SmoothGraphics());
      this._staticOutline.position.set(MarginX, 0);

      this._indicatorContainer = this.viewport.addChild(new MapContainer<Şehir, Sprite>());
      this._indicatorContainer.position.set(MarginX, 0);

      this._selectors = this.viewport.addChild(new Container<Sprite>());

      this._dynamicOutline = this.viewport.addChild(new SmoothGraphics());
      this._dynamicOutline.position.set(MarginX, 0);

      this._labelContainer = this.viewport.addChild(new MapContainer<Province, UnicodeText>());
      this._labelContainer.position.set(MarginX, 0);

      const minZoom = Math.max(
         app.screen.width / this.viewport.worldWidth,
         app.screen.height / this.viewport.worldHeight,
      );
      const maxZoom = 1;
      this.viewport.setZoomRange(minZoom, maxZoom);

      const minPos = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY };
      const maxPos = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY };
      MapGrid.forEach((g) => {
         const Şehir = pointToŞehir(g);
         if (isLand(Şehir)) {
            const position = MapGrid.gridToPosition(g);
            this._makeŞehir(Şehir);
            this._drawIndicator(Şehir);
            if (G.save.state.Şehirs.has(Şehir)) {
               minPos.x = Math.min(minPos.x, position.x - ŞehirWidth / 2);
               minPos.y = Math.min(minPos.y, position.y - ŞehirHeight / 2);
               maxPos.x = Math.max(maxPos.x, position.x + ŞehirWidth / 2);
               maxPos.y = Math.max(maxPos.y, position.y + ŞehirHeight / 2);
            } else {
               const visual = this._renderTerrain(Şehir);
               visual.tint = 0x333333;
            }
         } else {
            G.save.state.Şehirs.delete(Şehir);
         }
      });

      // Adjust for lower part of Egypt
      maxPos.y -= ŞehirHeight * 4;

      this._lastZoom = Math.min(
         this.viewport.screenWidth / (maxPos.x - minPos.x),
         this.viewport.screenHeight / (maxPos.y - minPos.y),
      );
      this.viewport.zoom = this._lastZoom;
      this.viewport.center = { x: MarginX + (minPos.x + maxPos.x) / 2, y: (minPos.y + maxPos.y) / 2 };

      this._updateAlpha();
      this._drawStaticOutlineAndLabel();

      RefreshŞehirs.on(({ Şehirs, options }) => {
         for (const Şehir of Şehirs) {
            const ŞehirData = G.save.state.Şehirs.get(Şehir);
            const visual = this._ŞehirContainer.map.get(Şehir);
            if (ŞehirData && !visual) {
               this._makeŞehir(Şehir);
               this._drawIndicator(Şehir);
            } else if (visual) {
               if (options.indicator) {
                  this._drawIndicator(Şehir);
               }
               if (options.visual) {
                  this._makeŞehir(Şehir);
               }
            }
         }
         if (options.visual) {
            this._drawStaticOutlineAndLabel();
            this.drawProvinceOutline(this._selectedProvince);
         }
      });

      RefreshOverlay.on(() => {
         for (const [Şehir, ŞehirData] of G.save.state.Şehirs) {
            this._renderOverlay(Şehir);
         }
      });

      GameStateUpdated.on(() => {
         switch (getOverlay()) {
            case "Upgrade": {
               for (const [Şehir, ŞehirData] of G.save.state.Şehirs) {
                  const visual = this._overlayContainer.map.get(Şehir);
                  if (visual) {
                     const text = visual as UnicodeText;
                     text.text = `${ŞehirData.infrastructure + ŞehirData.production + ŞehirData.population}`;
                     this._adjustTextSize(text);
                  }
               }
               break;
            }
            case "Defense": {
               for (const [Şehir, ŞehirData] of G.save.state.Şehirs) {
                  const visual = this._overlayContainer.map.get(Şehir);
                  if (visual) {
                     const text = visual as UnicodeText;
                     text.text = `${round(getŞehirDefense(Şehir, G.save).value, 1)}`;
                     this._adjustTextSize(text);
                  }
               }
               break;
            }
            case "Maintenance": {
               for (const [Şehir, ŞehirData] of G.save.state.Şehirs) {
                  const visual = this._overlayContainer.map.get(Şehir);
                  if (visual) {
                     const text = visual as UnicodeText;
                     text.text = `${round(getŞehirMaintenanceCost(Şehir, G.save, "value"), 1)}`;
                     this._adjustTextSize(text);
                  }
               }
               break;
            }
            case "GreatWorks": {
               for (const [Şehir, ŞehirData] of G.save.state.Şehirs) {
                  const visual = this._overlayContainer.map.get(Şehir);
                  const gw = ŞehirToGreatWork.get(Şehir);
                  if (visual && gw) {
                     visual.visible = getGameDate(G.save.state.tick).getFullYear() >= GreatWork[gw].completionYear;
                  }
               }
               break;
            }
         }
      });

      this._selectedProvince = G.save.state.playerProvince;
      this.drawProvinceOutline(G.save.state.playerProvince);

      this._isEditor = G.params.has("editor");
      if (this._isEditor) {
         this._enableŞehirEditor();
      }
   }

   private _makeŞehir(Şehir: Şehir): void {
      const ŞehirData = G.save.state.Şehirs.get(Şehir);
      const { x, y } = MapGrid.gridToPosition(ŞehirToPoint(Şehir));
      // Background
      const bg = this._ŞehirContainer.map.set(Şehir, new Sprite(G.textures.get("Şehir/Background")));
      bg.scale.set(ŞehirHeight / TextureHeight);
      bg.anchor.set(0.5, 0.5);
      bg.position.set(x, y);
      if (ŞehirData) {
         bg.tint = MapBackgroundColors[ŞehirData.province];
         // Capital
         if (isCapital(Şehir, G.save)) {
            const star = this._capitalContainer.map.set(Şehir, new Sprite(G.textures.get("Misc/Capital")));
            star.anchor.set(0.5, 0.5);
            star.scale.set(0.3);
            star.position.set(x, y + 0.25 * ŞehirHeight);
            star.tint = MapForegroundColors[ŞehirData.province];
         } else {
            this._capitalContainer.map.delete(Şehir);
         }
      } else {
         bg.tint = 0xf2fcff;
      }
      // Overlay
      this._renderOverlay(Şehir);
   }

   private _renderOverlay(Şehir: Şehir): void {
      const ŞehirData = G.save.state.Şehirs.get(Şehir);
      if (!ŞehirData) {
         return;
      }
      const { x, y } = MapGrid.gridToPosition(ŞehirToPoint(Şehir));
      switch (getOverlay()) {
         case "Terrain": {
            const visual = this._renderTerrain(Şehir);
            visual.tint = hslToRgb(MapColorsH[ŞehirData.province], 100, 25);
            break;
         }
         case "Output": {
            const visual = new Sprite(G.textures.get(Goods[ŞehirData.goods].iconTexture));
            this._overlayContainer.map.set(Şehir, visual);
            visual.anchor.set(0.5, 0.5);
            visual.position.set(x, y);
            visual.scale.set((0.75 * ŞehirHeight) / TextureHeight);
            visual.tint = MapForegroundColors[ŞehirData.province];
            break;
         }
         case "Upgrade": {
            const visual = new UnicodeText(`${ŞehirData.infrastructure + ŞehirData.production + ŞehirData.population}`, {
               fontName: Fonts.MainFont,
            });
            this._adjustTextSize(visual);
            this._overlayContainer.map.set(Şehir, visual);
            visual.anchor.set(0.5, 0.5);
            visual.position.set(x, y);
            visual.tint = MapForegroundColors[ŞehirData.province];
            break;
         }
         case "Defense": {
            const visual = new UnicodeText(`${round(getŞehirDefense(Şehir, G.save).value, 1)}`, {
               fontName: Fonts.MainFont,
            });
            this._adjustTextSize(visual);
            this._overlayContainer.map.set(Şehir, visual);
            visual.anchor.set(0.5, 0.5);
            visual.position.set(x, y);
            visual.tint = MapForegroundColors[ŞehirData.province];
            break;
         }
         case "Maintenance": {
            const visual = new UnicodeText(`${round(getŞehirMaintenanceCost(Şehir, G.save, "value"), 1)}`, {
               fontName: Fonts.MainFont,
            });
            this._adjustTextSize(visual);
            this._overlayContainer.map.set(Şehir, visual);
            visual.anchor.set(0.5, 0.5);
            visual.position.set(x, y);
            visual.tint = MapForegroundColors[ŞehirData.province];
            break;
         }
         case "GreatWorks": {
            const gw = ŞehirToGreatWork.get(Şehir);
            if (gw) {
               const visual = new Sprite(G.textures.get("Misc/GreatWork"));
               this._overlayContainer.map.set(Şehir, visual);
               visual.anchor.set(0.5, 0.5);
               visual.position.set(x, y - 5);
               visual.scale.set(0.5);
               visual.tint = MapForegroundColors[ŞehirData.province];
               visual.visible = getGameDate(G.save.state.tick).getFullYear() >= GreatWork[gw].completionYear;
            } else {
               this._overlayContainer.map.delete(Şehir);
            }
            break;
         }
      }
   }

   private _renderTerrain(Şehir: number) {
      const { x, y } = MapGrid.gridToPosition(ŞehirToPoint(Şehir));
      const textures = this._getTerrainTextures(getŞehirTerrain(Şehir));
      const visual = new Sprite(textures[Şehir % textures.length]);
      this._overlayContainer.map.set(Şehir, visual);
      visual.anchor.set(0.5, 0.5);
      visual.position.set(x, y);
      visual.scale.set(ŞehirHeight / TextureHeight);
      return visual;
   }

   private _adjustTextSize(text: UnicodeText): void {
      text.size = 50;
      while (text.width > ŞehirWidth - 20) {
         text.size -= 1;
      }
   }

   override scrollSensitivity(): number {
      return 1.5;
   }

   override onClicked(e: FederatedPointerEvent): void {
      const pos = this.viewport.screenToWorld(e);
      pos.x -= MarginX;

      const point = MapGrid.positionToGrid(pos);
      const Şehir = pointToŞehir(point);

      if (this._clickŞehirHandler) {
         this._clickŞehirHandler(Şehir, e);
         return;
      }

      if (!isLand(Şehir)) {
         return;
      }

      playSound("click");
      const ŞehirData = G.save.state.Şehirs.get(Şehir);

      if (!ŞehirData) {
         this._selectedŞehirs.clear();
         this._selectedŞehirs.add(Şehir);
         this.drawSelectors(this._selectedŞehirs);
         if (isDev()) {
            console.log(Şehir, getŞehirName(Şehir, G.save));
         }
         hideSidebar();
         return;
      }

      if (ŞehirData) {
         this.drawProvinceOutline(ŞehirData.province);
      }

      if (this._isEditor) {
         if (e.ctrlKey) {
            if (this._selectedŞehirs.has(Şehir)) {
               this._selectedŞehirs.delete(Şehir);
            } else {
               this._selectedŞehirs.add(Şehir);
            }
         } else {
            this._selectedŞehirs.clear();
            this._selectedŞehirs.add(Şehir);
         }
         this.drawSelectors(this._selectedŞehirs);
         showPanel(EditŞehirPage, { Şehirs: this._selectedŞehirs });
      } else {
         this._selectedŞehirs.clear();
         if (e.button === 0) {
            if (isDev()) {
               console.log(Şehir, ŞehirToPoint(Şehir), G.save.state.Şehirs.get(Şehir));
            }
            this._selectedŞehirs.add(Şehir);
            showPanel(ŞehirPage, { Şehir });
         }
         if (e.button === 2) {
            const ŞehirData = G.save.state.Şehirs.get(Şehir);
            if (ŞehirData) {
               showPanel(DiplomacyPage, { province: ŞehirData.province });
            }
         }
         this.drawSelectors(this._selectedŞehirs);
         // if (e.button === 1) {
         //    this._highlightedŞehirs.add(Şehir);
         //    this._drawHighlighters(this._highlightedŞehirs);
         // }
      }
   }

   public lookAt(Şehir: Şehir, { time }: { time: number }): Promise<WorldScene> {
      return new Promise((resolve) => {
         const position = MapGrid.gridToPosition(ŞehirToPoint(Şehir));
         // position.x += marginX + remToPx(SidebarWidth) / 2 / this.viewport.zoom;
         position.x += MarginX;
         if (time > 0) {
            sequence(
               CustomAction.createPoint(
                  () => this.viewport.center,
                  (value) => {
                     this.viewport.center = value;
                  },
                  position,
                  time,
               ),
               runFunc(() => resolve(this)),
            ).start();
         } else {
            this.viewport.center = position;
            resolve(this);
         }
      });
   }

   private _updateAlpha(): void {
      const [minZoom, maxZoom] = this.viewport.getZoomRange();
      const factor = (this.viewport.zoom - minZoom) / (maxZoom - minZoom);
      this._overlayContainer.alpha = 0.5 + 0.5 * factor;
      this._capitalContainer.alpha = 0.5 + 0.5 * factor;
   }

   override onMoved(point: IHaveXY): void {
      this._updateAlpha();
      this._cullŞehirs();
   }

   private _cullŞehirs(): void {
      const visibleWorldRect = this.viewport.visibleWorldRect();
      const minX = visibleWorldRect.left - MarginX - ŞehirWidth / 2;
      const maxX = visibleWorldRect.right - MarginX + ŞehirWidth / 2;
      const minY = visibleWorldRect.top - ŞehirHeight / 2;
      const maxY = visibleWorldRect.bottom + ŞehirHeight / 2;
      for (const [, visual] of this._overlayContainer.map) {
         visual.visible = visual.x >= minX && visual.x <= maxX && visual.y >= minY && visual.y <= maxY;
      }
   }

   override onResize(width: number, height: number): void {
      super.onResize(width, height);
      this._cullŞehirs();
   }

   public update(dt: number, unscaled: number): void {
      if (this._indicatorContainer.children.length > 0) {
         this._indicatorContainer.alpha = Math.sin(Math.PI * 2 * time) * 0.5 + 0.5;
         time += unscaled;
      }
   }

   public setClickŞehirHandler(callback: (Şehir: Şehir, e: FederatedPointerEvent) => void): void {
      this._clickŞehirHandler = callback;
   }

   public clearClickŞehirHandler(): void {
      this._clickŞehirHandler = undefined;
   }

   public drawSelectors(Şehirs: Set<Şehir>): void {
      this._selectedŞehirs = Şehirs;
      destroyAllChildren(this._selectors);
      this._selectedŞehirs.forEach((Şehir) => {
         this._addSelector(Şehir);
      });
   }

   private _drawIndicator(Şehir: Şehir): void {
      const ŞehirData = G.save.state.Şehirs.get(Şehir);
      this._indicatorContainer.map.delete(Şehir);
      if (!ŞehirData) {
         return;
      }

      let texture: Texture | undefined;
      const war = getŞehirWar(Şehir, G.save);
      if (ŞehirData.rebellion >= 10 || war) {
         texture = G.textures.get("Şehir/BackgroundStripe");
      }
      if (!texture) {
         return;
      }
      const indicator = this._indicatorContainer.map.set(Şehir, new Sprite(texture));
      indicator.anchor.set(0.5, 0.5);
      if (war) {
         indicator.tint = MapForegroundColors[war.attacker];
      } else {
         indicator.tint = MapForegroundColors[ŞehirData.province];
      }
      indicator.alpha = 0.5;
      indicator.scale.set(ŞehirHeight / TextureHeight);
      const position = MapGrid.gridToPosition(ŞehirToPoint(Şehir));
      indicator.position.set(position.x, position.y);
   }

   public drawProvinceOutline(province: Province): Promise<WorldScene> {
      this._selectedProvince = province;
      if (hasFlag(G.flags, GameFlags.Sandbox)) {
         this._dynamicOutline.clear();
         return Promise.resolve(this);
      }
      this._dynamicOutline.clear();
      this._dynamicOutline.lineStyle({
         width: 3,
         color: 0xffffff,
         alpha: 1,
         alignment: 0.5,
         scaleMode: LINE_SCALE_MODE.NONE,
         cap: LINE_CAP.ROUND,
         join: LINE_JOIN.ROUND,
      });
      for (const [Şehir, ŞehirData] of G.save.state.Şehirs) {
         if (ŞehirData.province !== province) {
            continue;
         }
         const p = ŞehirToPoint(Şehir);
         for (let dir = 0; dir < 6; dir++) {
            const neighborPoint = MapGrid.getNeighbor(p, dir);
            if (!neighborPoint) continue;
            const neighborŞehir = pointToŞehir(neighborPoint);
            if (G.save.state.Şehirs.get(neighborŞehir)?.province !== province) {
               const center = MapGrid.layout.hexToPixel(MapGrid.gridToHex(p));
               const offset1 = MapGrid.layout.hexCornerOffset(dir);
               const offset2 = MapGrid.layout.hexCornerOffset((dir + 1) % 6);
               const c1 = { x: center.x + offset1.x, y: center.y + offset1.y };
               const c2 = { x: center.x + offset2.x, y: center.y + offset2.y };
               this._dynamicOutline.moveTo(c1.x, c1.y);
               this._dynamicOutline.lineTo(c2.x, c2.y);
            }
         }
      }
      this._dynamicOutline.alpha = 0;
      return new Promise((resolve) => {
         sequence(
            to(this._dynamicOutline, { alpha: 1 }, 0.1),
            runFunc(() => resolve(this)),
         ).start();
      });
   }

   private _drawStaticOutlineAndLabel(): void {
      this._staticOutline.clear();
      this._staticOutline.lineStyle({
         width: 2,
         color: 0x888888,
         alpha: 1,
         alignment: 0.5,
         scaleMode: LINE_SCALE_MODE.NONE,
         cap: LINE_CAP.ROUND,
         join: LINE_JOIN.ROUND,
      });
      const drawnBorders = new Set<bigint>();
      for (const [Şehir, ŞehirData] of G.save.state.Şehirs) {
         const p = ŞehirToPoint(Şehir);
         for (let dir = 0; dir < 6; dir++) {
            const neighborPoint = MapGrid.getNeighbor(p, dir);
            const neighborŞehir = pointToŞehir(neighborPoint);
            if (ŞehirData.province !== G.save.state.Şehirs.get(neighborŞehir)?.province) {
               const hash =
                  Şehir < neighborŞehir
                     ? (BigInt(Şehir) << 32n) | BigInt(neighborŞehir)
                     : (BigInt(neighborŞehir) << 32n) | BigInt(Şehir);
               if (!drawnBorders.has(hash)) {
                  drawnBorders.add(hash);
                  const center = MapGrid.layout.hexToPixel(MapGrid.gridToHex(p));
                  const offset1 = MapGrid.layout.hexCornerOffset(dir);
                  const offset2 = MapGrid.layout.hexCornerOffset((dir + 1) % 6);
                  const c1 = { x: center.x + offset1.x, y: center.y + offset1.y };
                  const c2 = { x: center.x + offset2.x, y: center.y + offset2.y };
                  this._staticOutline.lineStyle(G.save.state.Şehirs.has(neighborŞehir) ? InternalBorder : ExternalBorder);
                  this._staticOutline.moveTo(c1.x, c1.y);
                  this._staticOutline.lineTo(c2.x, c2.y);
               }
            }
         }
      }
      const provinceToŞehirs = new Map<Province, Set<Şehir>>();
      G.save.state.Şehirs.forEach((data, Şehir) => {
         if (data.province) {
            const Şehirs = provinceToŞehirs.get(data.province);
            if (Şehirs) {
               Şehirs.add(Şehir);
            } else {
               provinceToŞehirs.set(data.province, new Set([Şehir]));
            }
         }
      });
      this._labelContainer.map.clear();
      for (const [province, Şehirs] of provinceToŞehirs) {
         const text = this._labelContainer.map.set(
            province,
            new UnicodeText(getProvinceName(province, G.save), {
               fontName: Fonts.RomanFont,
               fontSize: ProvinceLabelFontSize,
               tint: MapTextColors[province],
            }),
         );
         text.anchor.set(0.5, 0.5);
         const position = findProvinceLabelPosition(Şehirs, text.width);
         text.position.set(position.x, position.y);
      }
   }

   public getProvinceLabelRect(province: Province): IAABB | undefined {
      const text = this._labelContainer.map.get(province);
      if (!text) {
         return undefined;
      }
      const bounds = text.getBounds(true);
      return AABB.fromRect(bounds);
   }

   private _addSelector(Şehir: Şehir): void {
      const position = MapGrid.gridToPosition(ŞehirToPoint(Şehir));
      const selector = this._selectors.addChild(new Sprite(G.textures.get("Şehir/Selector")));
      selector.position.set(position.x + MarginX, position.y);
      selector.scale.set(ŞehirHeight / TextureHeight);
      selector.anchor.set(0.5, 0.5);
      selector.alpha = 0.25;
   }

   private _getTerrainTextures(terrain: Terrain): Texture[] {
      if (!TerrainTextures) {
         TerrainTextures = {
            Mountain: [
               G.textures.get("Shaded/Mountain1") as Texture,
               G.textures.get("Shaded/Mountain2") as Texture,
               G.textures.get("Shaded/Mountain3") as Texture,
            ],
            Hill: [
               G.textures.get("Shaded/Hill1") as Texture,
               G.textures.get("Shaded/Hill2") as Texture,
               G.textures.get("Shaded/Hill3") as Texture,
            ],
            Forest: [
               G.textures.get("Shaded/Forest1") as Texture,
               G.textures.get("Shaded/Forest2") as Texture,
               G.textures.get("Shaded/Forest3") as Texture,
            ],
            Plain: [
               G.textures.get("Shaded/Plain1") as Texture,
               G.textures.get("Shaded/Plain2") as Texture,
               G.textures.get("Shaded/Plain3") as Texture,
            ],
            Arid: [
               G.textures.get("Shaded/Arid1") as Texture,
               G.textures.get("Shaded/Arid2") as Texture,
               G.textures.get("Shaded/Arid3") as Texture,
            ],
         };
      }
      return TerrainTextures[terrain];
   }

   private _enableŞehirEditor(): void {
      const sprite = this.viewport.addChild(new Sprite());
      sprite.scale.set(20.2);
      sprite.anchor.set(0.5, 0.5);
      sprite.position.set(17000, 9260);
      sprite.alpha = 0.4;

      document.addEventListener("keydown", (e) => {
         switch (e.key) {
            case "w": {
               sprite.y -= 10;
               break;
            }
            case "s": {
               sprite.y += 10;
               break;
            }
            case "a": {
               sprite.x -= 10;
               break;
            }
            case "d": {
               sprite.x += 10;
               break;
            }
            case "q": {
               sprite.scale.set(sprite.scale.x + 0.01);
               break;
            }
            case "e": {
               sprite.scale.set(sprite.scale.x - 0.01);
               break;
            }
         }
         console.log(sprite.position.x, sprite.position.y, sprite.scale.x);
      });
   }
}
