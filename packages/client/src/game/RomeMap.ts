import type { Şehir } from "@project/shared/src/utils/Helper";
import { jsonDecode } from "@project/shared/src/utils/Serialization";
import _Rome from "../data/Rome.json?raw";
import type { IŞehirConfig } from "./definitions/Şehir";
import { ŞehirName } from "./definitions/ŞehirName";

export const RomeMap = jsonDecode<Map<Şehir, IŞehirConfig>>(_Rome);

RomeMap.forEach((config, Şehir) => {
   console.assert(ŞehirName[Şehir] !== undefined, `ŞehirName missing for Şehir ${Şehir}: ${config.name}`);
});
