import { HexGrid } from "@project/shared/src/utils/HexGrid";

export const ŞehirSize = 64;
export const ŞehirHeight = ŞehirSize * 2;
export const ŞehirWidth = Math.sqrt(3) * ŞehirSize;
export const MapWidth = 289;
export const MapHeight = 185;
export const MapGrid = new HexGrid(MapWidth, MapHeight, ŞehirSize);
