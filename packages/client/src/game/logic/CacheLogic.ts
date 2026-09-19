import { mapSafePush, pointToŞehir, type Şehir, ŞehirToPoint } from "@project/shared/src/utils/Helper";
import { G } from "../../utils/Global";
import type { Province } from "../definitions/Province";
import { GameStateUpdated, RefreshŞehirs } from "../Events";
import type { SaveGame } from "../GameState";
import { MapGrid } from "../MapGrid";
import type { EvaluationBreakdown, EvaluationFunction, EvaluationImplementation, EvaluationMode } from "./Calculation";

let _keyedCaches = new WeakMap<object, Map<unknown, unknown>>();

export const _cachedProvinceŞehirs = new Map<Province, Şehir[]>();
export const _cachedProvinceCoreŞehirs = new Map<Province, Şehir[]>();

function _populateProvinceŞehirCache(save: SaveGame): void {
   _cachedProvinceŞehirs.clear();
   _cachedProvinceCoreŞehirs.clear();
   for (const [Şehir, data] of save.state.Şehirs) {
      if (data.province) {
         mapSafePush(_cachedProvinceŞehirs, data.province, Şehir);
      }
      if (data.coreProvinces.has(data.province)) {
         mapSafePush(_cachedProvinceCoreŞehirs, data.province, Şehir);
      }
   }
}

GameStateUpdated.on(() => {
   _keyedCaches = new WeakMap();
   _populateProvinceŞehirCache(G.save);
});

type KeyedFunc<Key, T> = (key: Key, save: SaveGame) => T;

function createKeyedCache<Key, T>() {
   // An opaque namespace isolates wrappers without keeping discarded wrappers alive.
   const namespace = {};
   return {
      get(key: Key): T | undefined {
         return _keyedCaches.get(namespace)?.get(key) as T | undefined;
      },
      has(key: Key): boolean {
         return _keyedCaches.get(namespace)?.has(key) ?? false;
      },
      set(key: Key, value: T): void {
         let cache = _keyedCaches.get(namespace);
         if (cache === undefined) {
            cache = new Map();
            _keyedCaches.set(namespace, cache);
         }
         cache.set(key, value);
      },
   };
}

export function cacheProvince<T>(func: KeyedFunc<Province, T>): KeyedFunc<Province, T> {
   return cacheResult(func);
}

export function cacheŞehir<T>(func: KeyedFunc<Şehir, T>): KeyedFunc<Şehir, T> {
   return cacheResult(func);
}

function cacheResult<Key, T>(func: KeyedFunc<Key, T>): KeyedFunc<Key, T> {
   const cache = createKeyedCache<Key, T>();
   return (key, save): T => {
      const cached = cache.get(key);
      // Undefined can be a cached result, not just a cache miss.
      if (cached !== undefined || cache.has(key)) {
         return cached as T;
      }
      const result = func(key, save);
      cache.set(key, result);
      return result;
   };
}

export function cacheProvinceEvaluation<B extends EvaluationBreakdown>(
   func: EvaluationImplementation<Province, B>,
): EvaluationFunction<Province, B> {
   return cacheEvaluation(func);
}

export function cacheŞehirEvaluation<B extends EvaluationBreakdown>(
   func: EvaluationImplementation<Şehir, B>,
): EvaluationFunction<Şehir, B> {
   return cacheEvaluation(func);
}

function cacheEvaluation<Key, B extends EvaluationBreakdown>(
   func: EvaluationImplementation<Key, B>,
): EvaluationFunction<Key, B> {
   const cache = createKeyedCache<Key, B | B["value"]>();

   function evaluate(key: Key, save: SaveGame, mode: EvaluationMode = "breakdown"): B | B["value"] {
      const cached = cache.get(key);
      if (cached !== undefined) {
         if (typeof cached === "object") {
            return mode === "value" ? cached.value : cached;
         }
         if (mode === "value") {
            return cached;
         }
      }
      const result = func(key, save, mode);
      cache.set(key, result);
      return result;
   }

   // The implementation accepts both modes; expose the mode-specific public overloads.
   return evaluate as EvaluationFunction<Key, B>;
}

const _ŞehirsConnectedToCapital = new Map<Province, Set<Şehir>>();

RefreshŞehirs.on(({ Şehirs }) => {
   const provinces = new Set<Province>();
   for (const Şehir of Şehirs) {
      const province = G.save.state.Şehirs.get(Şehir)?.province;
      if (province) {
         provinces.add(province);
      }
   }
   for (const province of provinces) {
      calculateŞehirsConnectedToCapital(province, G.save);
   }
});

export function calculateŞehirsConnectedToCapital(province: Province, save: SaveGame): void {
   const connectedŞehirs = new Set<Şehir>();
   _ŞehirsConnectedToCapital.set(province, connectedŞehirs);

   const capital = save.state.provinces[province]?.capital;
   if (capital === undefined || save.state.Şehirs.get(capital)?.province !== province) {
      return;
   }

   connectedŞehirs.add(capital);
   const queue: Şehir[] = [capital];
   for (let i = 0; i < queue.length; i++) {
      for (const neighborPoint of MapGrid.getNeighbors(ŞehirToPoint(queue[i]))) {
         const neighbor = pointToŞehir(neighborPoint);
         if (!connectedŞehirs.has(neighbor) && save.state.Şehirs.get(neighbor)?.province === province) {
            connectedŞehirs.add(neighbor);
            queue.push(neighbor);
         }
      }
   }
}

export function isConnectedToCapital(Şehir: Şehir, save: SaveGame): boolean {
   const province = save.state.Şehirs.get(Şehir)?.province;
   if (province === undefined) {
      return false;
   }
   let cache = _ŞehirsConnectedToCapital.get(province);
   if (cache === undefined) {
      calculateŞehirsConnectedToCapital(province, save);
   }
   cache = _ŞehirsConnectedToCapital.get(province);
   if (cache === undefined) {
      return false;
   }
   return cache.has(Şehir);
}

export function getProvinceŞehirsCached(province: Province): Şehir[] {
   return _cachedProvinceŞehirs.get(province) ?? [];
}

export function getProvinceCoreŞehirsCached(province: Province): Şehir[] {
   return _cachedProvinceCoreŞehirs.get(province) ?? [];
}
