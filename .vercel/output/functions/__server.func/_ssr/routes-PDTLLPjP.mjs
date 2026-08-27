import { i as __toESM } from "../_runtime.mjs";
import { R as require_react, y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Layers, c as FolderOpen, d as ChevronLeft, f as BookOpen, i as Sparkles, l as Download, n as Table2, o as Ghost, p as Anvil, r as Swords, s as Gem, u as ChevronRight } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { n as unzlibSync, t as inflateSync } from "../_libs/fflate.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-PDTLLPjP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var cryptTable = (() => {
	const table = /* @__PURE__ */ new Uint32Array(1280);
	let seed = 1048577;
	for (let i = 0; i < 256; i++) for (let j = 0; j < 5; j++) {
		seed = (Math.imul(seed, 125) + 3) % 2796203;
		const a = (seed & 65535) << 16;
		seed = (Math.imul(seed, 125) + 3) % 2796203;
		const b = seed & 65535;
		table[i + j * 256] = (a | b) >>> 0;
	}
	return table;
})();
function toMpqBytes(name) {
	const normalized = name.replace(/\//g, "\\").toUpperCase();
	const out = new Uint8Array(normalized.length);
	for (let i = 0; i < normalized.length; i++) out[i] = normalized.charCodeAt(i) & 255;
	return out;
}
function hashString(name, type) {
	const bytes = toMpqBytes(name);
	let seed1 = 2146271213;
	let seed2 = 4008636142;
	for (let i = 0; i < bytes.length; i++) {
		const ch = bytes[i];
		seed1 = (cryptTable[type * 256 + ch] ^ seed1 + seed2 >>> 0) >>> 0;
		seed2 = ch + seed1 + seed2 + (seed2 << 5 >>> 0) + 3 >>> 0;
	}
	return seed1 >>> 0;
}
function decryptBlock(data, key) {
	const out = data.slice();
	let seed = 4008636142;
	let k = key >>> 0;
	const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
	const n = out.length >> 2 << 2;
	for (let i = 0; i < n; i += 4) {
		seed = seed + cryptTable[1024 + (k & 255)] >>> 0;
		let val = view.getUint32(i, true);
		val = (val ^ k + seed >>> 0) >>> 0;
		view.setUint32(i, val, true);
		k = ((~k << 21) + 286331153 | k >>> 11) >>> 0;
		seed = val + seed + (seed << 5 >>> 0) + 3 >>> 0;
	}
	return out;
}
function encryptBlock(data, key) {
	const out = data.slice();
	let seed = 4008636142;
	let k = key >>> 0;
	const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
	const n = out.length >> 2 << 2;
	for (let i = 0; i < n; i += 4) {
		seed = seed + cryptTable[1024 + (k & 255)] >>> 0;
		const orig = view.getUint32(i, true);
		const val = (orig ^ k + seed >>> 0) >>> 0;
		view.setUint32(i, val, true);
		k = ((~k << 21) + 286331153 | k >>> 11) >>> 0;
		seed = orig + seed + (seed << 5 >>> 0) + 3 >>> 0;
	}
	return out;
}
function fileKey(fileName, filePos, fileSize, fixKey) {
	let key = hashString(fileName.replace(/\\/g, "/").split("/").pop() ?? fileName, 3);
	if (fixKey) key = (key + filePos ^ fileSize) >>> 0;
	return key;
}
/**
* PKWARE DCL explode (StormLib pklib). Used by some MPQ sectors (compression 0x08).
* Faithful port of Ladislav Zezula's explode.c.
*/
var DIST_BITS = new Uint8Array([
	2,
	4,
	4,
	5,
	5,
	5,
	5,
	6,
	6,
	6,
	6,
	6,
	6,
	6,
	6,
	6,
	6,
	6,
	6,
	6,
	6,
	6,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	7,
	8,
	8,
	8,
	8,
	8,
	8,
	8,
	8,
	8,
	8,
	8,
	8,
	8,
	8,
	8,
	8
]);
var DIST_CODE = new Uint8Array([
	3,
	13,
	5,
	25,
	9,
	17,
	1,
	62,
	30,
	46,
	14,
	54,
	22,
	38,
	6,
	58,
	26,
	42,
	10,
	50,
	18,
	34,
	66,
	2,
	124,
	60,
	92,
	28,
	108,
	44,
	76,
	12,
	116,
	52,
	84,
	20,
	100,
	36,
	68,
	4,
	120,
	56,
	88,
	24,
	104,
	40,
	72,
	8,
	240,
	112,
	176,
	48,
	208,
	80,
	144,
	16,
	224,
	96,
	160,
	32,
	192,
	64,
	128,
	0
]);
var EX_LEN_BITS = new Uint8Array([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8
]);
var LEN_BASE = new Uint16Array([
	0,
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	10,
	14,
	22,
	38,
	70,
	134,
	262
]);
var LEN_BITS = new Uint8Array([
	3,
	2,
	3,
	3,
	4,
	4,
	4,
	5,
	5,
	5,
	5,
	6,
	6,
	6,
	7,
	7
]);
var LEN_CODE = new Uint8Array([
	5,
	3,
	1,
	6,
	10,
	2,
	12,
	20,
	4,
	24,
	8,
	48,
	16,
	32,
	64,
	0
]);
var CH_BITS_ASC = new Uint8Array([
	11,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	8,
	7,
	12,
	12,
	7,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	13,
	12,
	12,
	12,
	12,
	12,
	4,
	10,
	8,
	12,
	10,
	12,
	10,
	8,
	7,
	7,
	8,
	9,
	7,
	6,
	7,
	8,
	7,
	6,
	7,
	7,
	7,
	7,
	8,
	7,
	7,
	8,
	8,
	12,
	11,
	7,
	9,
	11,
	12,
	6,
	7,
	6,
	6,
	5,
	7,
	8,
	8,
	6,
	11,
	9,
	6,
	7,
	6,
	6,
	7,
	11,
	6,
	6,
	6,
	7,
	9,
	8,
	9,
	9,
	11,
	8,
	11,
	9,
	12,
	8,
	12,
	5,
	6,
	6,
	6,
	5,
	6,
	6,
	6,
	5,
	11,
	7,
	5,
	6,
	5,
	5,
	6,
	10,
	5,
	5,
	5,
	5,
	8,
	7,
	8,
	8,
	10,
	11,
	11,
	12,
	12,
	12,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	12,
	13,
	12,
	13,
	13,
	13,
	12,
	13,
	13,
	13,
	12,
	13,
	13,
	13,
	13,
	12,
	13,
	13,
	13,
	12,
	12,
	12,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13,
	13
]);
var CH_CODE_ASC = new Uint16Array([
	1168,
	4064,
	2016,
	3040,
	992,
	3552,
	1504,
	2528,
	480,
	184,
	98,
	3808,
	1760,
	34,
	2784,
	736,
	3296,
	1248,
	2272,
	224,
	3936,
	1888,
	2912,
	864,
	3424,
	1376,
	4672,
	2400,
	352,
	3680,
	1632,
	2656,
	15,
	592,
	56,
	608,
	80,
	3168,
	912,
	216,
	66,
	2,
	88,
	432,
	124,
	41,
	60,
	152,
	92,
	9,
	28,
	108,
	44,
	76,
	24,
	12,
	116,
	232,
	104,
	1120,
	144,
	52,
	176,
	1808,
	2144,
	49,
	84,
	17,
	33,
	23,
	20,
	168,
	40,
	1,
	784,
	304,
	62,
	100,
	30,
	46,
	36,
	1296,
	14,
	54,
	22,
	68,
	48,
	200,
	464,
	208,
	272,
	72,
	1552,
	336,
	96,
	136,
	4e3,
	7,
	38,
	6,
	58,
	27,
	26,
	42,
	10,
	11,
	528,
	4,
	19,
	50,
	3,
	29,
	18,
	400,
	13,
	21,
	5,
	25,
	8,
	120,
	240,
	112,
	656,
	1040,
	16,
	1952,
	2976,
	928,
	576,
	7232,
	3136,
	5184,
	1088,
	6208,
	2112,
	4160,
	64,
	8064,
	3968,
	6016,
	1920,
	7040,
	2944,
	4992,
	896,
	7552,
	3456,
	5504,
	1408,
	6528,
	2432,
	4480,
	384,
	7808,
	3712,
	5760,
	1664,
	6784,
	2688,
	4736,
	640,
	7296,
	3200,
	5248,
	1152,
	6272,
	2176,
	4224,
	128,
	7936,
	3840,
	5888,
	1792,
	6912,
	2816,
	4864,
	3488,
	1440,
	2464,
	416,
	3744,
	1696,
	2720,
	672,
	3232,
	1184,
	2208,
	160,
	3872,
	1824,
	2848,
	800,
	3360,
	1312,
	2336,
	288,
	3616,
	1568,
	2592,
	544,
	3104,
	1056,
	2080,
	32,
	4032,
	1984,
	3008,
	960,
	3520,
	1472,
	2496,
	448,
	3776,
	1728,
	2752,
	704,
	3264,
	1216,
	2240,
	192,
	3904,
	1856,
	2880,
	832,
	768,
	3392,
	7424,
	3328,
	5376,
	1344,
	1280,
	6400,
	2304,
	2368,
	4352,
	256,
	7680,
	3584,
	320,
	5632,
	1536,
	6656,
	3648,
	1600,
	2624,
	2560,
	4608,
	512,
	7168,
	3072,
	5120,
	1024,
	6144,
	2048,
	4096,
	0
]);
function genDecodeTabs(positions, startIndexes, lengthBits, elements) {
	for (let i = 0; i < elements; i++) {
		const length = 1 << lengthBits[i];
		for (let index = startIndexes[i]; index < 256; index += length) positions[index] = i;
	}
}
function explodePkware(input) {
	if (input.length <= 4) throw new Error("PKWARE 데이터가 너무 짧습니다");
	const ctype = input[0];
	const dsizeBits = input[1];
	if (dsizeBits < 4 || dsizeBits > 6) throw new Error("PKWARE 사전 크기가 올바르지 않습니다");
	if (ctype !== 0 && ctype !== 1) throw new Error("PKWARE 압축 형식이 올바르지 않습니다");
	const dsizeMask = 65535 >>> 16 - dsizeBits;
	const inBuff = /* @__PURE__ */ new Uint8Array(2048);
	let inPos = 3;
	let inBytes = Math.min(input.length, 2048);
	inBuff.set(input.subarray(0, inBytes));
	let bitBuff = inBuff[2];
	let extraBits = 0;
	let srcOff = inBytes;
	const outBuff = /* @__PURE__ */ new Uint8Array(8708);
	const output = [];
	let outputPos = 4096;
	const lengthCodes = /* @__PURE__ */ new Uint8Array(256);
	const distPosCodes = /* @__PURE__ */ new Uint8Array(256);
	const lenBits = LEN_BITS.slice();
	const exLenBits = EX_LEN_BITS.slice();
	const lenBase = LEN_BASE.slice();
	const distBits = DIST_BITS.slice();
	const chBitsAsc = CH_BITS_ASC.slice();
	const offs2C34 = /* @__PURE__ */ new Uint8Array(256);
	const offs2D34 = /* @__PURE__ */ new Uint8Array(256);
	const offs2E34 = /* @__PURE__ */ new Uint8Array(128);
	const offs2EB4 = /* @__PURE__ */ new Uint8Array(256);
	genDecodeTabs(lengthCodes, LEN_CODE, LEN_BITS, LEN_BITS.length);
	genDecodeTabs(distPosCodes, DIST_CODE, DIST_BITS, DIST_BITS.length);
	if (ctype === 1) for (let count = 255; count >= 0; count--) {
		const pChCodeAsc = CH_CODE_ASC[count];
		let bitsAsc = chBitsAsc[count];
		if (bitsAsc <= 8) {
			const add = 1 << bitsAsc;
			for (let acc = pChCodeAsc; acc < 256; acc += add) offs2C34[acc] = count;
		} else if ((pChCodeAsc & 255) !== 0) {
			offs2C34[pChCodeAsc & 255] = 255;
			if (pChCodeAsc & 63) {
				bitsAsc -= 4;
				chBitsAsc[count] = bitsAsc;
				const add = 1 << bitsAsc;
				for (let acc = pChCodeAsc >>> 4; acc < 256; acc += add) offs2D34[acc] = count;
			} else {
				bitsAsc -= 6;
				chBitsAsc[count] = bitsAsc;
				const add = 1 << bitsAsc;
				for (let acc = pChCodeAsc >>> 6; acc < 128; acc += add) offs2E34[acc] = count;
			}
		} else {
			bitsAsc -= 8;
			chBitsAsc[count] = bitsAsc;
			const add = 1 << bitsAsc;
			for (let acc = pChCodeAsc >>> 8; acc < 256; acc += add) offs2EB4[acc] = count;
		}
	}
	const refill = () => {
		if (inPos === inBytes) {
			const n = Math.min(2048, input.length - srcOff);
			if (n === 0) return false;
			inBuff.set(input.subarray(srcOff, srcOff + n));
			inBytes = n;
			inPos = 0;
			srcOff += n;
		}
		return true;
	};
	const wasteBits = (nBits) => {
		if (nBits <= extraBits) {
			extraBits -= nBits;
			bitBuff >>>= nBits;
			return true;
		}
		bitBuff >>>= extraBits;
		if (!refill()) return false;
		bitBuff |= inBuff[inPos++] << 8;
		bitBuff >>>= nBits - extraBits;
		extraBits = extraBits - nBits + 8;
		return true;
	};
	const decodeLit = () => {
		if (bitBuff & 1) {
			if (!wasteBits(1)) return 774;
			const lengthCode0 = lengthCodes[bitBuff & 255];
			if (!wasteBits(lenBits[lengthCode0])) return 774;
			let lengthCode = lengthCode0;
			const extraLengthBits = exLenBits[lengthCode];
			if (extraLengthBits) {
				const extraLength = bitBuff & (1 << extraLengthBits) - 1;
				if (!wasteBits(extraLengthBits)) {
					if (lengthCode + extraLength !== 270) return 774;
				}
				lengthCode = lenBase[lengthCode] + extraLength;
			}
			return lengthCode + 256;
		}
		if (!wasteBits(1)) return 774;
		if (ctype === 0) {
			const uncompressedByte = bitBuff & 255;
			if (!wasteBits(8)) return 774;
			return uncompressedByte;
		}
		let value;
		if (bitBuff & 255) {
			value = offs2C34[bitBuff & 255];
			if (value === 255) {
				if (bitBuff & 63) {
					if (!wasteBits(4)) return 774;
					value = offs2D34[bitBuff & 255];
				} else {
					if (!wasteBits(6)) return 774;
					value = offs2E34[bitBuff & 127];
				}
			}
		} else {
			if (!wasteBits(8)) return 774;
			value = offs2EB4[bitBuff & 255];
		}
		return wasteBits(chBitsAsc[value]) ? value : 774;
	};
	const decodeDist = (repLength) => {
		const distPosCode = distPosCodes[bitBuff & 255];
		const distPosBits = distBits[distPosCode];
		if (!wasteBits(distPosBits)) return 0;
		let distance;
		if (repLength === 2) {
			distance = distPosCode << 2 | bitBuff & 3;
			if (!wasteBits(2)) return 0;
		} else {
			distance = distPosCode << dsizeBits | bitBuff & dsizeMask;
			if (!wasteBits(dsizeBits)) return 0;
		}
		return distance + 1;
	};
	const flush = (from, count) => {
		for (let i = 0; i < count; i++) output.push(outBuff[from + i]);
	};
	let nextLiteral = decodeLit();
	while (nextLiteral < 773) {
		if (nextLiteral >= 256) {
			let repLength = nextLiteral - 254;
			const minusDist = decodeDist(repLength);
			if (minusDist === 0) break;
			let target = outputPos;
			let source = target - minusDist;
			outputPos += repLength;
			while (repLength-- > 0) outBuff[target++] = outBuff[source++];
		} else outBuff[outputPos++] = nextLiteral;
		if (outputPos >= 8192) {
			flush(4096, 4096);
			outBuff.copyWithin(0, 4096, outputPos);
			outputPos -= 4096;
		}
		nextLiteral = decodeLit();
	}
	flush(4096, outputPos - 4096);
	return Uint8Array.from(output);
}
var EXCEL = {
	itemRatio: "data\\global\\excel\\itemratio.txt",
	uniqueItems: "data\\global\\excel\\uniqueitems.txt",
	setItems: "data\\global\\excel\\setitems.txt",
	treasure: "data\\global\\excel\\treasureclassex.txt",
	misc: "data\\global\\excel\\misc.txt",
	skills: "data\\global\\excel\\skills.txt",
	skillDesc: "data\\global\\excel\\skilldesc.txt",
	monstats: "data\\global\\excel\\monstats.txt",
	runes: "data\\global\\excel\\runes.txt",
	itemTypes: "data\\global\\excel\\itemtypes.txt",
	charStats: "data\\global\\excel\\charstats.txt"
};
var STRINGS = {
	itemNames: "data\\local\\lng\\strings\\item-names.json",
	itemRunes: "data\\local\\lng\\strings\\item-runes.json",
	skills: "data\\local\\lng\\strings\\skills.json",
	monsters: "data\\local\\lng\\strings\\monsters.json"
};
var SAMPLE_FILES = [
	{
		path: EXCEL.itemRatio,
		url: "/sample-data/yupgoolg/itemratio.txt"
	},
	{
		path: EXCEL.uniqueItems,
		url: "/sample-data/yupgoolg/uniqueitems.txt"
	},
	{
		path: EXCEL.setItems,
		url: "/sample-data/yupgoolg/setitems.txt"
	},
	{
		path: EXCEL.treasure,
		url: "/sample-data/yupgoolg/treasureclassex.txt"
	},
	{
		path: EXCEL.misc,
		url: "/sample-data/yupgoolg/misc.txt"
	},
	{
		path: EXCEL.skills,
		url: "/sample-data/yupgoolg/skills.txt"
	},
	{
		path: EXCEL.skillDesc,
		url: "/sample-data/yupgoolg/skilldesc.txt"
	},
	{
		path: EXCEL.monstats,
		url: "/sample-data/yupgoolg/monstats.txt"
	},
	{
		path: EXCEL.runes,
		url: "/sample-data/yupgoolg/runes.txt"
	},
	{
		path: EXCEL.itemTypes,
		url: "/sample-data/yupgoolg/itemtypes.txt"
	},
	{
		path: STRINGS.itemNames,
		url: "/sample-data/yupgoolg/item-names.json"
	},
	{
		path: STRINGS.itemRunes,
		url: "/sample-data/yupgoolg/item-runes.json"
	},
	{
		path: STRINGS.skills,
		url: "/sample-data/yupgoolg/skills.json"
	},
	{
		path: STRINGS.monsters,
		url: "/sample-data/yupgoolg/monsters.json"
	}
];
function tcDifficulty(name) {
	if (/\(H\)\s*$/.test(name) || /\s\(H\)$/.test(name)) return "hell";
	if (/\(N\)\s*$/.test(name) || /\s\(N\)$/.test(name)) return "nightmare";
	if (isRuneTc(name) || isFigureTc(name)) return "all";
	return "normal";
}
function matchesDifficulty(name, diff) {
	const d = tcDifficulty(name);
	return d === diff || d === "all";
}
function isRuneTc(name) {
	const n = name.toLowerCase();
	return n.includes("rune") || n.startsWith("runes");
}
function isFigureTc(name) {
	const n = name.toLowerCase();
	return n.includes("doll") || n.includes("figure") || n.includes("figur") || n.includes("balldoll");
}
var MPQ_FILE_FIX_KEY = 131072;
var MPQ_FILE_EXISTS = 2147483648;
var FALLBACK_NAMES = [
	...Object.values(EXCEL),
	...Object.values(STRINGS),
	"(listfile)",
	"(attributes)"
];
function normalizeName(name) {
	return name.replace(/\//g, "\\");
}
function decodeText(data) {
	if (data.length >= 2 && data[0] === 255 && data[1] === 254) return new TextDecoder("utf-16le").decode(data);
	if (data.length >= 3 && data[0] === 239 && data[1] === 187 && data[2] === 191) return new TextDecoder("utf-8").decode(data.subarray(3));
	return new TextDecoder("utf-8").decode(data);
}
function encodeText(text) {
	return new TextEncoder().encode(text);
}
/** StormLib compression 0x02 is zlib (RFC 1950), not raw DEFLATE. */
function looksLikeZlib(data) {
	if (data.length < 2) return false;
	const cmf = data[0];
	const flg = data[1];
	return (cmf & 15) === 8 && cmf >>> 4 <= 7 && (cmf << 8 | flg) % 31 === 0;
}
function inflatePayload(data) {
	if (looksLikeZlib(data)) try {
		return unzlibSync(data);
	} catch {}
	try {
		return inflateSync(data);
	} catch (rawErr) {
		try {
			return unzlibSync(data);
		} catch {
			const msg = rawErr instanceof Error ? rawErr.message : String(rawErr);
			throw new Error(msg === "unexpected EOF" ? "MPQ zlib 압축을 풀 수 없습니다" : `MPQ 압축을 풀 수 없습니다: ${msg}`);
		}
	}
}
function decompressChunk(chunk, expected, flags = 0) {
	if (chunk.length === 0) return chunk;
	if (chunk.length === expected) return chunk;
	if (flags & 256 && !(flags & 512)) return explodePkware(chunk);
	if (looksLikeZlib(chunk)) return inflatePayload(chunk);
	let ctype = chunk[0];
	let payload = chunk.subarray(1);
	if (ctype === 0 || (ctype & -252) !== 0) {
		if (flags & 256 || chunk[0] === 0 || chunk[0] === 1) try {
			return explodePkware(chunk);
		} catch {}
		return inflatePayload(chunk);
	}
	if (ctype & 8) {
		payload = explodePkware(payload);
		ctype &= -9;
	}
	if (ctype & 2) {
		payload = inflatePayload(payload);
		ctype &= -3;
	}
	if (ctype & 1) throw new Error("Huffman 압축은 지원하지 않습니다");
	if (ctype & 16) throw new Error("BZip2 압축은 지원하지 않습니다");
	if (ctype & 32) throw new Error("Sparse 압축은 지원하지 않습니다");
	return payload;
}
var MpqArchive = class {
	buffer;
	bytes;
	headerOffset;
	sectorSize;
	files;
	byName;
	hashEntries;
	blockEntries;
	constructor(buffer) {
		this.buffer = buffer;
		this.bytes = new Uint8Array(buffer);
		const view = new DataView(buffer);
		let headerOffset = 0;
		const magic = String.fromCharCode(this.bytes[0], this.bytes[1], this.bytes[2], this.bytes[3]);
		if (magic === "MPQ\x1B") headerOffset = view.getUint32(8, true);
		else if (magic !== "MPQ") {
			let found = -1;
			for (let i = 0; i < Math.min(this.bytes.length, 65536); i += 512) if (this.bytes[i] === 77 && this.bytes[i + 1] === 80 && this.bytes[i + 2] === 81 && this.bytes[i + 3] === 26) {
				found = i;
				break;
			}
			if (found < 0) throw new Error("MPQ 시그니처를 찾을 수 없습니다");
			headerOffset = found;
		}
		this.headerOffset = headerOffset;
		if (headerOffset + 32 > this.bytes.length) throw new Error("MPQ 헤더가 잘렸습니다");
		const headerSize = view.getUint32(headerOffset + 4, true);
		const formatVersion = view.getUint16(headerOffset + 12, true);
		const blockSize = view.getUint16(headerOffset + 14, true);
		this.sectorSize = 512 << blockSize;
		let hashOff = view.getUint32(headerOffset + 16, true);
		let blockOff = view.getUint32(headerOffset + 20, true);
		const hashCount = view.getUint32(headerOffset + 24, true);
		const blockCount = view.getUint32(headerOffset + 28, true);
		if (formatVersion >= 2 && headerSize >= 44 && headerOffset + 44 <= this.bytes.length) {
			hashOff += view.getUint16(headerOffset + 40, true) * 4294967296;
			blockOff += view.getUint16(headerOffset + 42, true) * 4294967296;
		}
		if (!hashCount || !blockCount) throw new Error("MPQ 해시/블록 테이블이 비어 있습니다");
		if (headerOffset + hashOff + hashCount * 16 > this.bytes.length) throw new Error("MPQ 해시 테이블이 파일 범위를 벗어났습니다");
		if (headerOffset + blockOff + blockCount * 16 > this.bytes.length) throw new Error("MPQ 블록 테이블이 파일 범위를 벗어났습니다");
		const hashRaw = decryptBlock(this.bytes.subarray(headerOffset + hashOff, headerOffset + hashOff + hashCount * 16), hashString("(hash table)", 3));
		const blockRaw = decryptBlock(this.bytes.subarray(headerOffset + blockOff, headerOffset + blockOff + blockCount * 16), hashString("(block table)", 3));
		const hashView = new DataView(hashRaw.buffer, hashRaw.byteOffset, hashRaw.byteLength);
		const blockView = new DataView(blockRaw.buffer, blockRaw.byteOffset, blockRaw.byteLength);
		const hashes = [];
		for (let i = 0; i < hashCount; i++) hashes.push({
			name1: hashView.getUint32(i * 16, true),
			name2: hashView.getUint32(i * 16 + 4, true),
			locale: hashView.getUint16(i * 16 + 8, true),
			blockIndex: hashView.getUint32(i * 16 + 12, true)
		});
		const blocks = [];
		for (let i = 0; i < blockCount; i++) blocks.push({
			pos: blockView.getUint32(i * 16, true),
			csize: blockView.getUint32(i * 16 + 4, true),
			fsize: blockView.getUint32(i * 16 + 8, true),
			flags: blockView.getUint32(i * 16 + 12, true)
		});
		this.hashEntries = hashes;
		this.blockEntries = blocks;
		this.files = [];
		this.byName = /* @__PURE__ */ new Map();
		let names = [];
		const listEntry = this.lookupHash(hashes, "(listfile)");
		if (listEntry && blocks[listEntry.blockIndex]) try {
			const listBlock = blocks[listEntry.blockIndex];
			const listRaw = this.sliceBlock(listBlock);
			names = decodeText(this.extractFromRaw("(listfile)", listRaw, listBlock, headerOffset)).replace(/\r\n/g, "\n").split("\n").map((s) => s.trim()).filter(Boolean);
		} catch {
			names = [];
		}
		if (names.length === 0) names = FALLBACK_NAMES.filter((n) => this.lookupHash(hashes, n));
		for (const name of names) {
			const h = this.lookupHash(hashes, name);
			if (!h) continue;
			const b = blocks[h.blockIndex];
			if (!b || !(b.flags & 2147483648)) continue;
			try {
				const raw = this.sliceBlock(b);
				const entry = {
					name: normalizeName(name),
					pos: b.pos,
					compSize: b.csize,
					fileSize: b.fsize,
					flags: b.flags,
					locale: h.locale,
					raw
				};
				this.files.push(entry);
				this.byName.set(entry.name.toLowerCase(), entry);
			} catch {}
		}
	}
	sliceBlock(block) {
		const start = this.headerOffset + block.pos;
		const end = start + block.csize;
		if (start < 0 || end > this.bytes.length || start > this.bytes.length) throw new Error("MPQ 블록이 파일 범위를 벗어났습니다");
		return this.bytes.subarray(start, end);
	}
	lookupHash(hashes, name) {
		if (!hashes.length) return null;
		const ha = hashString(name, 1);
		const hb = hashString(name, 2);
		const start = hashString(name, 0) % hashes.length;
		for (let i = 0; i < hashes.length; i++) {
			const h = hashes[(start + i) % hashes.length];
			if (h.blockIndex === 4294967295) return null;
			if (h.name1 === ha && h.name2 === hb && h.blockIndex !== 4294967294) return h;
		}
		return null;
	}
	get(name) {
		const n = normalizeName(name).toLowerCase();
		return this.byName.get(n);
	}
	extract(name) {
		const entry = this.get(name);
		if (entry) return this.extractFromRaw(entry.name, entry.raw, {
			pos: entry.pos,
			csize: entry.compSize,
			fsize: entry.fileSize,
			flags: entry.flags
		}, this.headerOffset);
		const h = this.lookupHash(this.hashEntries, name);
		if (!h) throw new Error(`파일을 찾을 수 없습니다: ${name}`);
		const b = this.blockEntries[h.blockIndex];
		if (!b || !(b.flags & 2147483648)) throw new Error(`파일을 찾을 수 없습니다: ${name}`);
		const raw = this.sliceBlock(b);
		return this.extractFromRaw(normalizeName(name), raw, b, this.headerOffset);
	}
	tryExtract(name) {
		try {
			return this.extract(name);
		} catch {
			return null;
		}
	}
	extractText(name) {
		return decodeText(this.extract(name));
	}
	extractFromRaw(name, rawIn, block, _headerOffset) {
		const { fsize, flags, pos } = block;
		let raw = rawIn.slice();
		const key = flags & 65536 ? fileKey(name, pos, fsize, Boolean(flags & MPQ_FILE_FIX_KEY)) : 0;
		if (flags & 16777216) {
			if (flags & 65536) raw = new Uint8Array(decryptBlock(raw, key));
			if (flags & 768 && raw.length !== fsize) raw = new Uint8Array(decompressChunk(raw, fsize, flags));
			return raw.subarray(0, Math.min(fsize, raw.length));
		}
		if (!(flags & 66304)) return raw.subarray(0, fsize);
		const nsectors = Math.ceil(fsize / this.sectorSize) || 1;
		const extraCrc = flags & 67108864 ? 1 : 0;
		const tableBytes = (nsectors + 1 + extraCrc) * 4;
		let table = raw.subarray(0, tableBytes);
		if (flags & 65536) table = new Uint8Array(decryptBlock(table, key - 1 >>> 0));
		const tview = new DataView(table.buffer, table.byteOffset, table.byteLength);
		const offsets = [];
		for (let i = 0; i <= nsectors; i++) offsets.push(tview.getUint32(i * 4, true));
		const parts = [];
		for (let s = 0; s < nsectors; s++) {
			const start = offsets[s];
			const end = offsets[s + 1];
			if (start < 0 || end > raw.length || start > end) throw new Error(`섹터 오프셋이 올바르지 않습니다: ${name}`);
			let chunk = raw.subarray(start, end).slice();
			if (flags & 65536) chunk = new Uint8Array(decryptBlock(chunk, key + s >>> 0));
			const expected = Math.min(this.sectorSize, fsize - s * this.sectorSize);
			if (flags & 768) parts.push(chunk.length === expected ? chunk : decompressChunk(chunk, expected, flags));
			else parts.push(chunk);
		}
		const total = parts.reduce((n, p) => n + p.length, 0);
		const out = new Uint8Array(total);
		let o = 0;
		for (const p of parts) {
			out.set(p, o);
			o += p.length;
		}
		return out.subarray(0, fsize);
	}
	rebuild(replacements) {
		const files = this.files.map((f) => ({ ...f }));
		const listName = "(listfile)";
		const names = files.map((f) => f.name);
		if (!names.some((n) => n.toLowerCase() === listName)) names.push(listName);
		const listContent = encodeText(names.join("\r\n") + "\r\n");
		replacements = new Map(replacements);
		replacements.set(listName, listContent);
		const packed = [];
		const hasReplacement = (name) => replacements.has(name) || replacements.has(name.toLowerCase());
		for (const file of files) {
			const replacement = replacements.get(file.name) ?? replacements.get(file.name.toLowerCase());
			if (replacement) packed.push({
				name: file.name,
				data: replacement,
				flags: MPQ_FILE_EXISTS,
				fileSize: replacement.length,
				locale: file.locale
			});
			else packed.push({
				name: file.name,
				data: file.raw.slice(),
				flags: file.flags,
				fileSize: file.fileSize,
				locale: file.locale
			});
		}
		for (const [name, data] of replacements) if (!packed.some((p) => p.name.toLowerCase() === name.toLowerCase())) packed.push({
			name: normalizeName(name),
			data,
			flags: MPQ_FILE_EXISTS,
			fileSize: data.length,
			locale: 0
		});
		const hashCount = nextPow2(Math.max(packed.length * 2, 16));
		const blockCount = packed.length;
		let cursor = 32;
		const fileBlobs = [];
		for (const p of packed) if (hasReplacement(p.name) || (p.flags & 2147483647) === 0) {
			const blob = p.data;
			fileBlobs.push({
				pos: cursor,
				blob,
				flags: MPQ_FILE_EXISTS,
				csize: blob.length,
				fsize: p.fileSize
			});
			cursor += blob.length;
		} else if (p.flags & 131072) {
			const oldPos = this.files.find((f) => f.name === p.name)?.pos ?? 0;
			const oldKey = fileKey(p.name, oldPos, p.fileSize, true);
			const newKey = fileKey(p.name, cursor, p.fileSize, true);
			const blob = reencryptRaw(p.data, p.flags, oldKey, newKey, this.sectorSize, p.fileSize);
			fileBlobs.push({
				pos: cursor,
				blob,
				flags: p.flags,
				csize: blob.length,
				fsize: p.fileSize
			});
			cursor += blob.length;
		} else {
			fileBlobs.push({
				pos: cursor,
				blob: p.data,
				flags: p.flags,
				csize: p.data.length,
				fsize: p.fileSize
			});
			cursor += p.data.length;
		}
		const hashOff = cursor;
		const hashTable = new Uint8Array(hashCount * 16);
		hashTable.fill(255);
		const hashView = new DataView(hashTable.buffer);
		for (let i = 0; i < hashCount; i++) hashView.setUint32(i * 16 + 12, 4294967295, true);
		packed.forEach((p, blockIndex) => {
			const start = hashString(p.name, 0) % hashCount;
			for (let i = 0; i < hashCount; i++) {
				const idx = (start + i) % hashCount;
				const existing = hashView.getUint32(idx * 16 + 12, true);
				if (existing === 4294967295 || existing === 4294967294) {
					hashView.setUint32(idx * 16, hashString(p.name, 1), true);
					hashView.setUint32(idx * 16 + 4, hashString(p.name, 2), true);
					hashView.setUint16(idx * 16 + 8, p.locale, true);
					hashView.setUint16(idx * 16 + 10, 0, true);
					hashView.setUint32(idx * 16 + 12, blockIndex, true);
					return;
				}
			}
			throw new Error("해시 테이블이 가득 찼습니다");
		});
		const encHash = encryptBlock(hashTable, hashString("(hash table)", 3));
		cursor += encHash.length;
		const blockOff = cursor;
		const blockTable = new Uint8Array(blockCount * 16);
		const blockView = new DataView(blockTable.buffer);
		fileBlobs.forEach((b, i) => {
			blockView.setUint32(i * 16, b.pos, true);
			blockView.setUint32(i * 16 + 4, b.csize, true);
			blockView.setUint32(i * 16 + 8, b.fsize, true);
			blockView.setUint32(i * 16 + 12, b.flags, true);
		});
		const encBlock = encryptBlock(blockTable, hashString("(block table)", 3));
		cursor += encBlock.length;
		const archiveSize = cursor;
		const out = new Uint8Array(archiveSize);
		const ov = new DataView(out.buffer);
		out[0] = 77;
		out[1] = 80;
		out[2] = 81;
		out[3] = 26;
		ov.setUint32(4, 32, true);
		ov.setUint32(8, archiveSize, true);
		ov.setUint16(12, 0, true);
		ov.setUint16(14, 3, true);
		ov.setUint32(16, hashOff, true);
		ov.setUint32(20, blockOff, true);
		ov.setUint32(24, hashCount, true);
		ov.setUint32(28, blockCount, true);
		for (const b of fileBlobs) out.set(b.blob, b.pos);
		out.set(encHash, hashOff);
		out.set(encBlock, blockOff);
		return out;
	}
};
function nextPow2(n) {
	let p = 1;
	while (p < n) p <<= 1;
	return p;
}
function reencryptRaw(raw, flags, oldKey, newKey, sectorSize, fileSize) {
	if (!(flags & 65536)) return raw;
	if (flags & 16777216) return encryptBlock(decryptBlock(raw, oldKey), newKey);
	const nsectors = Math.ceil(fileSize / sectorSize) || 1;
	const extraCrc = flags & 67108864 ? 1 : 0;
	const tableBytes = (nsectors + 1 + extraCrc) * 4;
	const table = decryptBlock(raw.subarray(0, tableBytes), oldKey - 1 >>> 0);
	const tview = new DataView(table.buffer, table.byteOffset, table.byteLength);
	const out = raw.slice();
	out.set(encryptBlock(table, newKey - 1 >>> 0), 0);
	for (let s = 0; s < nsectors; s++) {
		const start = tview.getUint32(s * 4, true);
		const end = tview.getUint32((s + 1) * 4, true);
		const chunk = decryptBlock(raw.subarray(start, end), oldKey + s >>> 0);
		out.set(encryptBlock(chunk, newKey + s >>> 0), start);
	}
	return out;
}
function buildMpqFromFiles(files) {
	const archive = Object.create(MpqArchive.prototype);
	Object.assign(archive, {
		buffer: /* @__PURE__ */ new ArrayBuffer(0),
		bytes: /* @__PURE__ */ new Uint8Array(0),
		headerOffset: 0,
		sectorSize: 4096,
		files: files.map((f) => ({
			name: normalizeName(f.name),
			pos: 0,
			compSize: f.data.length,
			fileSize: f.data.length,
			flags: MPQ_FILE_EXISTS,
			locale: 0,
			raw: f.data
		})),
		byName: /* @__PURE__ */ new Map(),
		hashEntries: [],
		blockEntries: []
	});
	const replacements = /* @__PURE__ */ new Map();
	for (const f of files) replacements.set(normalizeName(f.name), f.data);
	return archive.rebuild(replacements);
}
function parseTsv(text) {
	const lines = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
	while (lines.length && lines[lines.length - 1] === "") lines.pop();
	if (!lines.length) return {
		headers: [],
		rows: []
	};
	const headers = lines[0].split("	");
	return {
		headers,
		rows: lines.slice(1).map((line) => {
			const cols = line.split("	");
			while (cols.length < headers.length) cols.push("");
			return cols;
		})
	};
}
function serializeTsv(table) {
	const lines = [table.headers.join("	")];
	for (const row of table.rows) {
		const cols = table.headers.map((_, i) => row[i] ?? "");
		lines.push(cols.join("	"));
	}
	return lines.join("\r\n") + "\r\n";
}
function colIndex(table, name) {
	const exact = table.headers.indexOf(name);
	if (exact >= 0) return exact;
	const lower = name.toLowerCase();
	return table.headers.findIndex((h) => h.toLowerCase() === lower);
}
function getCell(row, table, name) {
	const i = colIndex(table, name);
	return i < 0 ? "" : row[i] ?? "";
}
function setCell(row, table, name, value) {
	const i = colIndex(table, name);
	if (i < 0) return;
	row[i] = value;
}
function num(value, fallback = 0) {
	if (value === "" || value == null) return fallback;
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}
function isDataRow(row) {
	const first = (row[0] ?? "").trim();
	if (!first) return false;
	if (first === "Expansion") return false;
	return true;
}
var COLOR_RE = /\u00ffc./g;
var PUA_RE = /[\uE000-\uF8FF]/g;
var JUNK_RE = /[\u00ff\u0001-\u0008\u000b\u000e-\u001f]/g;
function stripD2Codes(text) {
	return text.replace(COLOR_RE, "").replace(PUA_RE, "").replace(JUNK_RE, "").replace(/\r\n/g, "\n").trim();
}
function firstLine(text) {
	const clean = stripD2Codes(text);
	return (clean.split("\n")[0] ?? clean).trim();
}
/** Prefer the titled 【name】 lockup used by 엽굵, else a short last line. */
function itemTitle(text) {
	const clean = stripD2Codes(text);
	const boxed = clean.match(/【\s*([^】]+?)\s*】/);
	if (boxed?.[1]) return boxed[1].replace(/\s+/g, " ").trim();
	const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
	if (!lines.length) return "";
	return ([...lines].reverse().find((l) => l.length <= 36 && !/^\d/.test(l) && !l.includes("+")) ?? lines[0]).replace(/\s+/g, " ").trim();
}
var StringTable = class {
	byKey = /* @__PURE__ */ new Map();
	add(entries) {
		for (const e of entries) {
			if (!e.Key) continue;
			this.byKey.set(e.Key, e);
			this.byKey.set(e.Key.toLowerCase(), e);
		}
	}
	lookup(key) {
		if (!key) return null;
		const e = this.byKey.get(key) ?? this.byKey.get(key.toLowerCase());
		if (!e) return null;
		return {
			ko: itemTitle(e.koKR || "") || firstLine(e.koKR || e.enUS || key),
			en: itemTitle(e.enUS || "") || firstLine(e.enUS || e.koKR || key)
		};
	}
	display(key, fallback) {
		const hit = this.lookup(key);
		if (hit) return hit.ko || hit.en;
		return fallback || key || "";
	}
	tryDisplay(key) {
		const hit = this.lookup(key);
		return hit ? hit.ko || hit.en : "";
	}
};
function parseStringJson(text) {
	const trimmed = text.replace(/^\uFEFF/, "");
	const parsed = JSON.parse(trimmed);
	return Array.isArray(parsed) ? parsed : [];
}
function figureKorean(englishName, code) {
	const bags = {
		"doll bag": "피규어 가방",
		"mini doll bag": "미니 피규어 가방",
		dol: "피규어 가방",
		mol: "미니 피규어 가방"
	};
	const lower = englishName.toLowerCase();
	if (bags[lower]) return bags[lower];
	if (bags[code]) return bags[code];
	const m = englishName.match(/^(R|O)?Doll(\d+)$/i);
	if (m) return `${m[1]?.toUpperCase() === "R" ? "레어 피규어" : m[1]?.toUpperCase() === "O" ? "전설 피규어" : "피규어"} ${m[2]}`;
	if (/^card\s*\d+/i.test(englishName)) return englishName.replace(/^card\s*/i, "카드 ");
	return null;
}
var COL_KO = {
	index: "이름",
	"*ID": "ID",
	"*Id": "ID",
	Id: "ID",
	NameStr: "이름 키",
	skill: "스킬",
	skilldesc: "설명 키",
	charclass: "직업",
	code: "코드",
	item: "베이스",
	set: "세트",
	rarity: "희귀도",
	spawnable: "드랍 가능",
	enabled: "활성화",
	disabled: "비활성",
	lvl: "아이템 레벨",
	"lvl req": "요구 레벨",
	reqlevel: "요구 레벨",
	maxlvl: "최대 레벨",
	version: "버전",
	Unique: "유니크 보정",
	Set: "세트 보정",
	Rare: "레어 보정",
	Magic: "매직 보정",
	NoDrop: "노드랍",
	Picks: "픽 횟수",
	"Treasure Class": "보물 클래스",
	group: "그룹",
	level: "레벨",
	"Level": "레벨",
	"Level(N)": "레벨(NM)",
	"Level(H)": "레벨(헬)",
	type: "유형",
	namestr: "이름 키",
	minmana: "최소 마나",
	manashift: "마나 시프트",
	mana: "마나",
	lvlmana: "레벨당 마나",
	InGame: "인게임",
	delay: "딜레이",
	leftskill: "좌클릭",
	rightskill: "우클릭",
	Param1: "파라미터 1",
	Param2: "파라미터 2",
	Param3: "파라미터 3",
	Param4: "파라미터 4",
	Param5: "파라미터 5",
	Param6: "파라미터 6",
	MinDam: "최소 피해",
	MaxDam: "최대 피해",
	MinLevDam1: "레벨당 최소 1",
	MinLevDam2: "레벨당 최소 2",
	MinLevDam3: "레벨당 최소 3",
	MinLevDam4: "레벨당 최소 4",
	MinLevDam5: "레벨당 최소 5",
	MaxLevDam1: "레벨당 최대 1",
	MaxLevDam2: "레벨당 최대 2",
	MaxLevDam3: "레벨당 최대 3",
	MaxLevDam4: "레벨당 최대 4",
	MaxLevDam5: "레벨당 최대 5",
	DmgSymPerCalc: "물리 시너지",
	EType: "속성",
	EMin: "속성 최소",
	EMax: "속성 최대",
	EMinLev1: "속성 레벨 최소 1",
	EMinLev2: "속성 레벨 최소 2",
	EMinLev3: "속성 레벨 최소 3",
	EMinLev4: "속성 레벨 최소 4",
	EMinLev5: "속성 레벨 최소 5",
	EMaxLev1: "속성 레벨 최대 1",
	EMaxLev2: "속성 레벨 최대 2",
	EMaxLev3: "속성 레벨 최대 3",
	EMaxLev4: "속성 레벨 최대 4",
	EMaxLev5: "속성 레벨 최대 5",
	EDmgSymPerCalc: "속성 시너지",
	ELen: "속성 지속",
	ELenSymPerCalc: "지속 시너지",
	HitShift: "히트 시프트",
	SrcDam: "무기 피해 반영",
	LevToHit: "레벨당 명중",
	ToHitCalc: "명중 계산식",
	calc1: "계산식 1",
	calc2: "계산식 2",
	calc3: "계산식 3",
	calc4: "계산식 4",
	Param7: "파라미터 7",
	Param8: "파라미터 8",
	ToHit: "명중",
	Skill1: "스킬 1",
	Sk1lvl: "스킬1 레벨",
	Skill2: "스킬 2",
	Sk2lvl: "스킬2 레벨",
	Skill3: "스킬 3",
	Sk3lvl: "스킬3 레벨",
	Skill4: "스킬 4",
	Sk4lvl: "스킬4 레벨",
	Skill5: "스킬 5",
	Sk5lvl: "스킬5 레벨",
	Skill6: "스킬 6",
	Sk6lvl: "스킬6 레벨",
	Skill7: "스킬 7",
	Sk7lvl: "스킬7 레벨",
	Skill8: "스킬 8",
	Sk8lvl: "스킬8 레벨",
	TreasureClass: "TC 노멀",
	"TreasureClass(N)": "TC 나이트메어",
	"TreasureClass(H)": "TC 헬",
	minHP: "최소 HP",
	maxHP: "최대 HP",
	"MinHP(N)": "최소 HP(NM)",
	"MaxHP(N)": "최대 HP(NM)",
	"MinHP(H)": "최소 HP(헬)",
	"MaxHP(H)": "최대 HP(헬)",
	Function: "구분",
	Uber: "우버",
	"Class Specific": "직업 전용",
	UniqueDivisor: "유니크 디바이저",
	UniqueMin: "유니크 최소",
	SetDivisor: "세트 디바이저",
	SetMin: "세트 최소",
	Item1: "아이템 1",
	Prob1: "확률 1",
	Item2: "아이템 2",
	Prob2: "확률 2",
	Item3: "아이템 3",
	Prob3: "확률 3",
	Item4: "아이템 4",
	Prob4: "확률 4",
	Item5: "아이템 5",
	Prob5: "확률 5",
	"*ItemName": "영문 이름",
	carry1: "1개만 보유",
	prop1: "속성 1",
	min1: "최소 1",
	max1: "최대 1",
	AI: "AI",
	boss: "보스",
	killable: "처치 가능",
	Velocity: "이동속도",
	Run: "달리기",
	"cost mult": "비용 배율",
	"cost add": "비용 가산",
	localdelay: "로컬 딜레이",
	globaldelay: "글로벌 딜레이",
	passive: "패시브",
	aura: "오라",
	InTown: "마을 사용"
};
var CLASS_KO = {
	ama: "아마존",
	amazon: "아마존",
	sor: "소서리스",
	sorc: "소서리스",
	nec: "네크로맨서",
	pal: "팔라딘",
	bar: "바바리안",
	dru: "드루이드",
	ass: "어쌔신",
	war: "악마술사",
	"": "공용/몬스터"
};
var DIFF_KO = {
	normal: "노멀",
	nightmare: "나이트메어",
	hell: "헬"
};
var FIGURE_TYPES = /* @__PURE__ */ new Set([
	"dols",
	"rdol",
	"odol",
	"dolk",
	"dolb"
]);
var RUNE_TYPES = /* @__PURE__ */ new Set([
	"rune",
	"runx",
	"runh",
	"runc",
	"runu",
	"run2",
	"run3",
	"run4",
	"run5"
]);
function labelCol(name) {
	return COL_KO[name] ?? name;
}
function labelClass(code) {
	return CLASS_KO[code.toLowerCase()] ?? (code || "공용");
}
function isSlamtrapMonster(id, nameStr = "") {
	const a = id.toLowerCase();
	const b = nameStr.toLowerCase();
	return a === "slamtrap" || a.startsWith("slamtrap") || b === "slamtrap";
}
var SKILL_EDITOR_COLS = [
	"skill",
	"charclass",
	"skilldesc",
	"reqlevel",
	"maxlvl",
	"minmana",
	"mana",
	"lvlmana",
	"manashift",
	"Param1",
	"Param2",
	"Param3",
	"Param4",
	"MinDam",
	"MaxDam",
	"EType",
	"EMin",
	"EMax",
	"ToHit",
	"InGame",
	"leftskill",
	"rightskill",
	"passive",
	"aura"
];
var MONSTER_EDITOR_COLS = [
	"Id",
	"NameStr",
	"Level",
	"Level(N)",
	"Level(H)",
	"Skill1",
	"Sk1lvl",
	"Skill2",
	"Sk2lvl",
	"Skill3",
	"Sk3lvl",
	"Skill4",
	"Sk4lvl",
	"Skill5",
	"Sk5lvl",
	"Skill6",
	"Sk6lvl",
	"Skill7",
	"Sk7lvl",
	"Skill8",
	"Sk8lvl",
	"minHP",
	"maxHP",
	"TreasureClass",
	"TreasureClass(N)",
	"TreasureClass(H)"
];
var UNIQUE_EDITOR_COLS = [
	"index",
	"*ItemName",
	"code",
	"rarity",
	"spawnable",
	"disabled",
	"lvl",
	"lvl req"
];
var SET_EDITOR_COLS = [
	"index",
	"set",
	"*ItemName",
	"item",
	"rarity",
	"spawnable",
	"lvl",
	"lvl req"
];
var MISC_EDITOR_COLS = [
	"name",
	"code",
	"type",
	"rarity",
	"spawnable",
	"level",
	"levelreq",
	"namestr"
];
var HINTS = {
	rarity: "같은 베이스/유형 안에서 상대 확률. 숫자가 작을수록 더 잘 나옵니다.",
	Unique: "보물 클래스 유니크 품질 보정. 1024면 해당 TC에서 거의 확정 유니크입니다.",
	Set: "보물 클래스 세트 품질 보정. 1024 = 100%.",
	NoDrop: "아이템이 안 나올 가중치. 낮출수록 드랍이 많아집니다. (노드랍)",
	Picks: "한 번에 굴리는 횟수. 음수면 그만큼 확정 드랍입니다.",
	spawnable: "1이면 필드 드랍 가능, 0이면 드랍되지 않습니다.",
	disabled: "1이면 비활성(드랍 안 됨).",
	DmgSymPerCalc: "물리 피해 시너지 계산식. skill('Fire Bolt'.blvl)*par8 형식.",
	EDmgSymPerCalc: "속성 피해 시너지 계산식. 다른 스킬 투자량(blvl)을 참조합니다.",
	ELenSymPerCalc: "속성 지속시간 시너지 계산식.",
	HitShift: "피해 비트 시프트. 8이면 원본, 낮출수록 피해가 작아집니다.",
	SrcDam: "무기 피해를 스킬에 반영하는 비율(128 = 100%)."
};
var TABLE_PATH = {
	itemRatio: EXCEL.itemRatio,
	uniqueItems: EXCEL.uniqueItems,
	setItems: EXCEL.setItems,
	treasure: EXCEL.treasure,
	misc: EXCEL.misc,
	skills: EXCEL.skills,
	monstats: EXCEL.monstats
};
function textDecoderFile(data) {
	if (data.length >= 2 && data[0] === 255 && data[1] === 254) return new TextDecoder("utf-16le").decode(data);
	let start = 0;
	if (data.length >= 3 && data[0] === 239 && data[1] === 187 && data[2] === 191) start = 3;
	return new TextDecoder("utf-8").decode(data.subarray(start));
}
function ingestTexts(texts) {
	const tables = {};
	const pick = (path) => texts[path] ?? texts[path.replace(/\\/g, "/")];
	if (pick(EXCEL.itemRatio)) tables.itemRatio = parseTsv(pick(EXCEL.itemRatio));
	if (pick(EXCEL.uniqueItems)) tables.uniqueItems = parseTsv(pick(EXCEL.uniqueItems));
	if (pick(EXCEL.setItems)) tables.setItems = parseTsv(pick(EXCEL.setItems));
	if (pick(EXCEL.treasure)) tables.treasure = parseTsv(pick(EXCEL.treasure));
	if (pick(EXCEL.misc)) tables.misc = parseTsv(pick(EXCEL.misc));
	if (pick(EXCEL.skills)) tables.skills = parseTsv(pick(EXCEL.skills));
	if (pick(EXCEL.monstats)) tables.monstats = parseTsv(pick(EXCEL.monstats));
	const strings = new StringTable();
	for (const p of [
		STRINGS.itemNames,
		STRINGS.itemRunes,
		STRINGS.skills,
		STRINGS.monsters
	]) {
		const raw = pick(p);
		if (!raw) continue;
		try {
			strings.add(parseStringJson(raw));
		} catch {}
	}
	return {
		tables,
		strings
	};
}
function cloneTable(t) {
	return {
		headers: [...t.headers],
		rows: t.rows.map((r) => [...r])
	};
}
var useEditor = create((set, get) => ({
	source: "empty",
	fileName: "",
	archive: null,
	originalTexts: {},
	tables: {},
	strings: new StringTable(),
	dirty: false,
	error: null,
	loading: false,
	nav: "drops",
	difficulty: "hell",
	search: "",
	setNav: (id) => set({ nav: id }),
	setDifficulty: (d) => set({ difficulty: d }),
	setSearch: (q) => set({ search: q }),
	openMpq: async (file) => {
		set({
			loading: true,
			error: null
		});
		try {
			const archive = new MpqArchive(await file.arrayBuffer());
			const texts = {};
			const wanted = [...Object.values(EXCEL), ...Object.values(STRINGS)];
			for (const path of wanted) {
				const data = archive.tryExtract(path);
				if (data) texts[path] = textDecoderFile(data);
			}
			const { tables, strings } = ingestTexts(texts);
			if (!Object.keys(tables).length) throw new Error("MPQ에서 엑셀 테이블을 찾지 못했습니다. 엽굵/D2R 데이터(data\\global\\excel)가 들어 있는 파일인지 확인하세요.");
			set({
				source: "mpq",
				fileName: file.name,
				archive,
				originalTexts: texts,
				tables,
				strings,
				dirty: false,
				loading: false,
				error: null
			});
		} catch (err) {
			set({
				loading: false,
				error: err instanceof Error ? err.message : "MPQ를 열 수 없습니다"
			});
		}
	},
	loadSample: async () => {
		set({
			loading: true,
			error: null
		});
		try {
			const texts = {};
			await Promise.all(SAMPLE_FILES.map(async ({ path, url }) => {
				const res = await fetch(url);
				if (!res.ok) return;
				texts[path] = await res.text();
			}));
			const { tables, strings } = ingestTexts(texts);
			set({
				source: "sample",
				fileName: "yupgoolg131.mpq (샘플)",
				archive: null,
				originalTexts: texts,
				tables,
				strings,
				dirty: false,
				loading: false,
				error: null
			});
		} catch (err) {
			set({
				loading: false,
				error: err instanceof Error ? err.message : "샘플 데이터를 불러오지 못했습니다"
			});
		}
	},
	patchCell: (tableKey, rowIndex, column, value) => {
		const tables = { ...get().tables };
		const table = tables[tableKey];
		if (!table) return;
		const next = cloneTable(table);
		const row = next.rows[rowIndex];
		if (!row) return;
		setCell(row, next, column, value);
		tables[tableKey] = next;
		set({
			tables,
			dirty: true
		});
	},
	applyQualityBoost: (diff, unique, setVal) => {
		const table = get().tables.treasure;
		if (!table) return;
		const next = cloneTable(table);
		const nameI = colIndex(next, "Treasure Class");
		for (let i = 0; i < next.rows.length; i++) {
			const row = next.rows[i];
			if (!isDataRow(row)) continue;
			const d = tcDifficulty(row[nameI] ?? "");
			if (d !== diff && d !== "all") continue;
			if (unique >= 0) setCell(row, next, "Unique", String(unique));
			if (setVal >= 0) setCell(row, next, "Set", String(setVal));
		}
		set({
			tables: {
				...get().tables,
				treasure: next
			},
			dirty: true
		});
	},
	scaleQuality: (diff, uniqueFactor, setFactor) => {
		const table = get().tables.treasure;
		if (!table) return;
		const orig = parseTsv(get().originalTexts[EXCEL.treasure] ?? serializeTsv(table));
		const next = cloneTable(table);
		const nameI = colIndex(next, "Treasure Class");
		for (let i = 0; i < next.rows.length; i++) {
			const row = next.rows[i];
			if (!isDataRow(row)) continue;
			if (!matchesDifficulty(row[nameI] ?? "", diff)) continue;
			const origRow = orig.rows[i];
			const uniqueBase = origRow ? num(getCell(origRow, orig, "Unique"), 0) : num(getCell(row, next, "Unique"), 0);
			const setBase = origRow ? num(getCell(origRow, orig, "Set"), 0) : num(getCell(row, next, "Set"), 0);
			setCell(row, next, "Unique", String(Math.max(0, Math.min(1024, Math.round(uniqueBase * uniqueFactor)))));
			setCell(row, next, "Set", String(Math.max(0, Math.min(1024, Math.round(setBase * setFactor)))));
		}
		set({
			tables: {
				...get().tables,
				treasure: next
			},
			dirty: true
		});
	},
	scaleNoDrop: (kind, diff, factor) => {
		const table = get().tables.treasure;
		if (!table) return;
		const orig = parseTsv(get().originalTexts[EXCEL.treasure] ?? serializeTsv(table));
		const next = cloneTable(table);
		const nameI = colIndex(next, "Treasure Class");
		for (let i = 0; i < next.rows.length; i++) {
			const row = next.rows[i];
			if (!isDataRow(row)) continue;
			const name = row[nameI] ?? "";
			if (!matchesDifficulty(name, diff)) continue;
			if (!(kind === "rune" ? isRuneTc(name) : isFigureTc(name))) continue;
			const origRow = orig.rows[i];
			const base = origRow ? num(getCell(origRow, orig, "NoDrop"), 0) : num(getCell(row, next, "NoDrop"), 0);
			setCell(row, next, "NoDrop", String(Math.max(0, Math.round(base * factor))));
		}
		set({
			tables: {
				...get().tables,
				treasure: next
			},
			dirty: true
		});
	},
	scaleRarity: (kind, factor) => {
		const key = {
			unique: "uniqueItems",
			set: "setItems",
			rune: "misc",
			figure: "misc"
		}[kind];
		const table = get().tables[key];
		if (!table) return;
		const path = TABLE_PATH[key];
		const orig = parseTsv(get().originalTexts[path] ?? serializeTsv(table));
		const next = cloneTable(table);
		for (let i = 0; i < next.rows.length; i++) {
			const row = next.rows[i];
			if (!isDataRow(row)) continue;
			if (kind === "rune") {
				const t = getCell(row, next, "type");
				if (!RUNE_TYPES.has(t)) continue;
			}
			if (kind === "figure") {
				const t = getCell(row, next, "type");
				if (!FIGURE_TYPES.has(t)) continue;
			}
			const origRow = orig.rows[i];
			const base = origRow ? num(getCell(origRow, orig, "rarity"), 1) : num(getCell(row, next, "rarity"), 1);
			const scaled = Math.max(1, Math.round(base * factor));
			setCell(row, next, "rarity", String(scaled));
		}
		set({
			tables: {
				...get().tables,
				[key]: next
			},
			dirty: true
		});
	},
	setSlamtrapSkillsDisabled: (disabled) => {
		const table = get().tables.monstats;
		if (!table) return;
		const orig = parseTsv(get().originalTexts[EXCEL.monstats] ?? serializeTsv(table));
		const next = cloneTable(table);
		const skillCols = Array.from({ length: 8 }, (_, i) => ({
			skill: `Skill${i + 1}`,
			lvl: `Sk${i + 1}lvl`,
			mode: `Sk${i + 1}mode`
		}));
		for (let i = 0; i < next.rows.length; i++) {
			const row = next.rows[i];
			if (!isDataRow(row)) continue;
			if (!isSlamtrapMonster(getCell(row, next, "Id"), getCell(row, next, "NameStr"))) continue;
			const origRow = orig.rows[i];
			for (const c of skillCols) if (disabled) {
				setCell(row, next, c.skill, "");
				setCell(row, next, c.lvl, "");
				setCell(row, next, c.mode, "");
			} else if (origRow) {
				setCell(row, next, c.skill, getCell(origRow, orig, c.skill));
				setCell(row, next, c.lvl, getCell(origRow, orig, c.lvl));
				setCell(row, next, c.mode, getCell(origRow, orig, c.mode));
			}
		}
		set({
			tables: {
				...get().tables,
				monstats: next
			},
			dirty: true
		});
	},
	resetTable: (tableKey) => {
		const path = TABLE_PATH[tableKey];
		const original = get().originalTexts[path];
		if (!original) return;
		set({
			tables: {
				...get().tables,
				[tableKey]: parseTsv(original)
			},
			dirty: true
		});
	},
	exportMpq: () => {
		const { tables, originalTexts, archive, fileName, source } = get();
		const replacements = /* @__PURE__ */ new Map();
		Object.keys(TABLE_PATH).forEach((key) => {
			const table = tables[key];
			if (!table) return;
			const path = TABLE_PATH[key];
			const text = serializeTsv(table);
			const orig = originalTexts[path];
			if (orig && orig.replace(/\r\n/g, "\n") === text.replace(/\r\n/g, "\n")) return;
			replacements.set(normalizeName(path), encodeText(text));
		});
		const outName = `${fileName.replace(/\.mpq$/i, "") || "hellforge"}-edited.mpq`;
		if (archive) return {
			bytes: archive.rebuild(replacements),
			name: outName
		};
		const files = Object.entries(originalTexts).map(([name, text]) => {
			const n = normalizeName(name);
			return {
				name: n,
				data: replacements.get(n) ?? encodeText(text)
			};
		});
		for (const [name, data] of replacements) if (!files.some((f) => f.name === name)) files.push({
			name,
			data
		});
		return {
			bytes: buildMpqFromFiles(files),
			name: source === "sample" ? "yupgoolg-edited.mpq" : outName
		};
	},
	changedCount: () => {
		const { tables, originalTexts } = get();
		let n = 0;
		Object.keys(TABLE_PATH).forEach((key) => {
			const table = tables[key];
			if (!table) return;
			const orig = originalTexts[TABLE_PATH[key]];
			if (!orig) return;
			if (serializeTsv(table).replace(/\r\n/g, "\n") !== orig.replace(/\r\n/g, "\n")) n += 1;
		});
		return n;
	}
}));
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 font-medium transition-colors duration-(--motion-quick,150ms) disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap", {
	variants: {
		variant: {
			primary: "bg-primary text-primary-fg hover:bg-primary/90",
			secondary: "bg-bg-subtle text-fg border border-border hover:border-border-strong hover:bg-bg-elevated",
			ghost: "text-fg-muted hover:text-fg hover:bg-bg-subtle",
			danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25"
		},
		size: {
			sm: "h-9 px-3 text-sm rounded-sm",
			md: "h-11 px-4 text-sm rounded-md",
			lg: "h-12 px-5 text-base rounded-md",
			icon: "size-11 rounded-md"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
function Button({ className, variant, size, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
var tones = {
	muted: "bg-bg-subtle text-fg-muted border-border",
	unique: "bg-unique/15 text-unique border-unique/30",
	set: "bg-set/15 text-set border-set/30",
	rune: "bg-rune/15 text-rune border-rune/30",
	figure: "bg-figure/15 text-figure border-figure/30",
	ok: "bg-ok/15 text-ok border-ok/30"
};
function Badge({ className, tone = "muted", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide", tones[tone], className),
		...props
	});
}
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("h-11 w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subtle", "hover:border-border-strong focus:border-primary/50", className),
		...props
	});
}
var PAGE = 40;
var NUMERIC = /* @__PURE__ */ new Set([
	"rarity",
	"spawnable",
	"disabled",
	"enabled",
	"lvl",
	"lvl req",
	"level",
	"levelreq",
	"reqlevel",
	"maxlvl",
	"Unique",
	"Set",
	"Rare",
	"Magic",
	"NoDrop",
	"Picks",
	"mana",
	"minmana",
	"lvlmana",
	"manashift",
	"Param1",
	"Param2",
	"Param3",
	"Param4",
	"MinDam",
	"MaxDam",
	"EMin",
	"EMax",
	"ToHit",
	"Sk1lvl",
	"Sk2lvl",
	"Sk3lvl",
	"Sk4lvl",
	"Sk5lvl",
	"Sk6lvl",
	"Sk7lvl",
	"Sk8lvl",
	"minHP",
	"maxHP",
	"Level",
	"Level(N)",
	"Level(H)",
	"Prob1",
	"Prob2",
	"Prob3",
	"InGame",
	"leftskill",
	"rightskill",
	"passive",
	"aura"
]);
function DataGrid({ table, columns, onChange, displayName, filterRow, search, empty, selectedIndex, onSelectRow }) {
	const [page, setPage] = (0, import_react.useState)(0);
	const visibleCols = columns.filter((c) => colIndex(table, c) >= 0);
	const indexed = (0, import_react.useMemo)(() => {
		const q = search.trim().toLowerCase();
		const out = [];
		table.rows.forEach((row, index) => {
			if (!isDataRow(row)) return;
			if (filterRow && !filterRow(row, index)) return;
			if (q) {
				if (!((displayName?.(row, index) ?? "") + " " + visibleCols.map((c) => getCell(row, table, c)).join(" ")).toLowerCase().includes(q)) return;
			}
			out.push({
				row,
				index
			});
		});
		return out;
	}, [
		table,
		search,
		filterRow,
		displayName,
		visibleCols
	]);
	const pages = Math.max(1, Math.ceil(indexed.length / PAGE));
	const safePage = Math.min(page, pages - 1);
	const slice = indexed.slice(safePage * PAGE, safePage * PAGE + PAGE);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-auto rounded-lg border border-border bg-bg-elevated",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full min-w-[720px] border-collapse text-left text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "sticky top-0 z-10 bg-bg-subtle",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [displayName ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-3 py-3 font-medium text-fg-muted whitespace-nowrap",
						children: "한글 이름"
					}) : null, visibleCols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-3 py-3 font-medium text-fg-muted whitespace-nowrap",
						title: HINTS[c],
						children: labelCol(c)
					}, c))] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [slice.map(({ row, index }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					onClick: () => onSelectRow?.(index),
					className: cn("border-t border-border hover:bg-bg-subtle/60", onSelectRow ? "cursor-pointer" : "", selectedIndex === index ? "bg-primary/10" : ""),
					children: [displayName ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 text-fg font-medium whitespace-nowrap",
						children: displayName(row, index)
					}) : null, visibleCols.map((c) => {
						const value = getCell(row, table, c);
						const editable = NUMERIC.has(c) || c === "Skill1" || c === "Skill2" || c === "Skill3" || c === "Skill4" || c === "Skill5" || c === "Skill6" || c === "Skill7" || c === "Skill8" || c === "Item1" || c === "Item2" || c === "Item3";
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-1.5 align-middle",
							children: editable && !(c === "index" || c === "skill" || c === "Id" || c === "Treasure Class" || c === "name" || c === "code") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: cn("h-9 w-24 rounded-xs border border-transparent bg-transparent px-2 text-sm tabular-nums text-fg", "hover:border-border focus:border-primary/50 focus:bg-bg"),
								value,
								onChange: (e) => onChange(index, c, e.target.value)
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block max-w-[14rem] truncate px-2 text-fg-muted",
								children: value
							})
						}, c);
					})]
				}, index)), slice.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					className: "px-4 py-12 text-center text-fg-muted",
					colSpan: visibleCols.length + (displayName ? 1 : 0),
					children: empty
				}) }) : null] })]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between text-xs text-fg-muted",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "tabular-nums",
				children: [
					indexed.length.toLocaleString(),
					"개 중 ",
					indexed.length === 0 ? 0 : safePage * PAGE + 1,
					"–",
					Math.min(indexed.length, safePage * PAGE + PAGE)
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon",
						className: "size-9",
						disabled: safePage <= 0,
						onClick: () => setPage((p) => Math.max(0, p - 1)),
						"aria-label": "이전",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-16 text-center tabular-nums",
						children: [
							safePage + 1,
							" / ",
							pages
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon",
						className: "size-9",
						disabled: safePage >= pages - 1,
						onClick: () => setPage((p) => p + 1),
						"aria-label": "다음",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-4" })
					})
				]
			})]
		})]
	});
}
function SearchField({ value, onChange, placeholder }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
		value,
		onChange: (e) => onChange(e.target.value),
		placeholder,
		className: "max-w-sm"
	});
}
var PRESETS = [
	{
		id: "stock",
		label: "원본 수준",
		unique: -1,
		set: -1,
		nodrop: 1,
		rarity: 1
	},
	{
		id: "half",
		label: "드랍 2배 하향",
		unique: -1,
		set: -1,
		nodrop: 2,
		rarity: 2,
		qualityScale: .5
	},
	{
		id: "x2",
		label: "드랍 2배",
		unique: 128,
		set: 128,
		nodrop: .5,
		rarity: .5
	},
	{
		id: "high",
		label: "고드랍",
		unique: 256,
		set: 256,
		nodrop: .25,
		rarity: .35
	},
	{
		id: "max",
		label: "극드랍",
		unique: 512,
		set: 512,
		nodrop: .1,
		rarity: .2
	}
];
function DropRates() {
	const difficulty = useEditor((s) => s.difficulty);
	const setDifficulty = useEditor((s) => s.setDifficulty);
	const treasure = useEditor((s) => s.tables.treasure);
	const itemRatio = useEditor((s) => s.tables.itemRatio);
	const search = useEditor((s) => s.search);
	const setSearch = useEditor((s) => s.setSearch);
	const patchCell = useEditor((s) => s.patchCell);
	const applyQualityBoost = useEditor((s) => s.applyQualityBoost);
	const scaleQuality = useEditor((s) => s.scaleQuality);
	const scaleNoDrop = useEditor((s) => s.scaleNoDrop);
	const scaleRarity = useEditor((s) => s.scaleRarity);
	const resetTable = useEditor((s) => s.resetTable);
	const stats = (0, import_react.useMemo)(() => {
		if (!treasure) return null;
		const nameI = colIndex(treasure, "Treasure Class");
		let uniqueSum = 0, setSum = 0, n = 0, runeDrop = 0, runeN = 0, figDrop = 0, figN = 0;
		for (const row of treasure.rows) {
			if (!isDataRow(row)) continue;
			const name = row[nameI] ?? "";
			if (!matchesDifficulty(name, difficulty)) continue;
			n += 1;
			uniqueSum += num(getCell(row, treasure, "Unique"));
			setSum += num(getCell(row, treasure, "Set"));
			if (isRuneTc(name)) {
				runeN += 1;
				runeDrop += num(getCell(row, treasure, "NoDrop"));
			}
			if (isFigureTc(name)) {
				figN += 1;
				figDrop += num(getCell(row, treasure, "NoDrop"));
			}
		}
		return {
			n,
			uniqueAvg: n ? Math.round(uniqueSum / n) : 0,
			setAvg: n ? Math.round(setSum / n) : 0,
			runeNoDrop: runeN ? Math.round(runeDrop / runeN) : 0,
			figNoDrop: figN ? Math.round(figDrop / figN) : 0,
			runeN,
			figN
		};
	}, [treasure, difficulty]);
	const [uniqueBoost, setUniqueBoost] = (0, import_react.useState)(128);
	const [setBoost, setSetBoost] = (0, import_react.useState)(128);
	const applyPreset = (p) => {
		if (p.qualityScale != null) scaleQuality(difficulty, p.qualityScale, p.qualityScale);
		else if (p.unique >= 0) applyQualityBoost(difficulty, p.unique, p.set);
		scaleNoDrop("rune", difficulty, p.nodrop);
		scaleNoDrop("figure", difficulty, p.nodrop);
		scaleRarity("unique", p.rarity);
		scaleRarity("set", p.rarity);
		scaleRarity("rune", p.rarity);
		scaleRarity("figure", p.rarity);
	};
	const resetDrops = () => {
		resetTable("treasure");
		resetTable("uniqueItems");
		resetTable("setItems");
		resetTable("misc");
		resetTable("itemRatio");
		toast.success("드랍 설정을 기본값으로 되돌렸습니다");
	};
	if (!treasure) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-col gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl tracking-tight",
					children: "난이도별 드랍률"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 max-w-2xl text-sm text-fg-muted leading-relaxed",
					children: "보물 클래스의 유니크/세트 보정(0–1024)과 노드랍 가중치를 난이도별로 바꿉니다. 희귀도는 개별 아이템 탭에서 더 정밀하게 조절할 수 있습니다."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-2",
					children: Object.keys(DIFF_KO).map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: difficulty === d ? "primary" : "secondary",
						onClick: () => setDifficulty(d),
						children: DIFF_KO[d]
					}, d))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "유니크 보정 평균",
						value: stats?.uniqueAvg ?? "—",
						hint: "1024 = 확정",
						tone: "unique"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "세트 보정 평균",
						value: stats?.setAvg ?? "—",
						hint: "1024 = 확정",
						tone: "set"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "룬 TC 노드랍",
						value: stats?.runeNoDrop ?? "—",
						hint: `${stats?.runeN ?? 0}개 클래스`,
						tone: "rune"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "피규어 TC 노드랍",
						value: stats?.figNoDrop ?? "—",
						hint: `${stats?.figN ?? 0}개 클래스`,
						tone: "figure"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-bg-elevated p-4 sm:p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "font-medium",
						children: ["빠른 프리셋 · ", DIFF_KO[difficulty]]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: [PRESETS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							size: "sm",
							onClick: () => applyPreset(p),
							children: p.label
						}, p.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: resetDrops,
							children: "기본값으로 초기화"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 grid gap-4 md:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BoostControl, {
							label: "유니크 품질 보정",
							hint: "선택한 난이도의 모든 보물 클래스 Unique 칸",
							value: uniqueBoost,
							onChange: setUniqueBoost,
							max: 1024
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BoostControl, {
							label: "세트 품질 보정",
							hint: "선택한 난이도의 모든 보물 클래스 Set 칸",
							value: setBoost,
							onChange: setSetBoost,
							max: 1024
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => applyQualityBoost(difficulty, uniqueBoost, setBoost),
							children: "보정값 적용"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							onClick: () => {
								scaleNoDrop("rune", difficulty, .5);
								scaleNoDrop("figure", difficulty, .5);
							},
							children: "룬·피규어 노드랍 절반"
						})]
					})
				]
			}),
			itemRatio ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-bg-elevated p-4 sm:p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-medium",
						children: "전역 품질 확률 (ItemRatio)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-fg-muted",
						children: "난이도와 무관한 베이스 확률입니다. 숫자가 클수록 유니크/세트가 희귀해집니다."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 overflow-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-[640px] text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
								className: "text-fg-muted",
								children: [
									"Function",
									"Unique",
									"UniqueDivisor",
									"Set",
									"SetDivisor",
									"Uber",
									"Class Specific"
								].map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-2 py-2 text-left font-medium",
									children: c === "Function" ? "구분" : c === "Unique" ? "유니크" : c === "Set" ? "세트" : c === "UniqueDivisor" ? "유니크 나누기" : c === "SetDivisor" ? "세트 나누기" : c === "Uber" ? "우버" : "직업전용"
								}, c))
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: itemRatio.rows.filter(isDataRow).map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
								className: "border-t border-border",
								children: [
									"Function",
									"Unique",
									"UniqueDivisor",
									"Set",
									"SetDivisor",
									"Uber",
									"Class Specific"
								].map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-2 py-1.5",
									children: c === "Function" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-fg-muted",
										children: getCell(row, itemRatio, c)
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "h-9 w-20 rounded-xs border border-transparent bg-transparent px-2 tabular-nums hover:border-border focus:border-primary/50 focus:bg-bg",
										value: getCell(row, itemRatio, c),
										onChange: (e) => patchCell("itemRatio", itemRatio.rows.indexOf(row), c, e.target.value)
									})
								}, c))
							}, i)) })]
						})
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex min-h-0 flex-1 flex-col gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "font-medium",
						children: ["보물 클래스 · ", DIFF_KO[difficulty]]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
						value: search,
						onChange: setSearch,
						placeholder: "클래스 이름 검색"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataGrid, {
					table: treasure,
					columns: [
						"Treasure Class",
						"Picks",
						"Unique",
						"Set",
						"Rare",
						"Magic",
						"NoDrop",
						"Item1",
						"Prob1"
					],
					onChange: (row, col, val) => patchCell("treasure", row, col, val),
					search,
					filterRow: (row) => matchesDifficulty(getCell(row, treasure, "Treasure Class"), difficulty),
					empty: "이 난이도에 해당하는 보물 클래스가 없습니다."
				})]
			})
		]
	});
}
function StatCard({ label, value, hint, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-bg-elevated p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-fg-muted",
					children: label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					tone,
					children: tone === "unique" ? "유니크" : tone === "set" ? "세트" : tone === "rune" ? "룬" : "피규어"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 font-display text-3xl tabular-nums tracking-tight",
				children: value
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-fg-subtle",
				children: hint
			})
		]
	});
}
function BoostControl({ label, hint, value, onChange, max }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-0.5 block text-xs text-fg-muted",
				children: hint
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "range",
					min: 0,
					max,
					value,
					onChange: (e) => onChange(Number(e.target.value)),
					className: "h-2 flex-1 appearance-none rounded-full bg-bg-subtle accent-primary"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "w-14 text-right text-sm tabular-nums",
					children: value
				})]
			})
		]
	});
}
function EmptyState() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-dashed border-border-strong px-6 py-16 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-xl",
			children: "열린 모드가 없습니다"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-fg-muted",
			children: "MPQ를 열거나 엽굵 샘플을 불러오면 드랍 테이블이 표시됩니다."
		})]
	});
}
function UniqueTable() {
	const table = useEditor((s) => s.tables.uniqueItems);
	const strings = useEditor((s) => s.strings);
	const search = useEditor((s) => s.search);
	const setSearch = useEditor((s) => s.setSearch);
	const patchCell = useEditor((s) => s.patchCell);
	const scaleRarity = useEditor((s) => s.scaleRarity);
	const resetTable = useEditor((s) => s.resetTable);
	if (!table) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NeedFile$1, { kind: "유니크 아이템" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
		title: "유니크 아이템",
		blurb: "희귀도가 작을수록 같은 베이스에서 더 자주 나옵니다. 드랍 가능을 0으로 두면 필드에서 나오지 않습니다.",
		search,
		setSearch,
		placeholder: "유니크 이름 · 코드",
		onHalf: () => scaleRarity("unique", .5),
		onReset: () => resetTable("uniqueItems"),
		badge: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			tone: "unique",
			children: "Unique"
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataGrid, {
			table,
			columns: UNIQUE_EDITOR_COLS,
			search,
			onChange: (r, c, v) => patchCell("uniqueItems", r, c, v),
			displayName: (row) => strings.tryDisplay(getCell(row, table, "index")) || strings.tryDisplay(getCell(row, table, "*ItemName")) || getCell(row, table, "index"),
			empty: "유니크 아이템이 없습니다."
		})
	});
}
function SetTable() {
	const table = useEditor((s) => s.tables.setItems);
	const strings = useEditor((s) => s.strings);
	const search = useEditor((s) => s.search);
	const setSearch = useEditor((s) => s.setSearch);
	const patchCell = useEditor((s) => s.patchCell);
	const scaleRarity = useEditor((s) => s.scaleRarity);
	const resetTable = useEditor((s) => s.resetTable);
	if (!table) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NeedFile$1, { kind: "세트 아이템" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
		title: "세트 아이템",
		blurb: "세트 피스별 희귀도와 드랍 가능 여부입니다. 세트 이름은 원본 키를 유지합니다.",
		search,
		setSearch,
		placeholder: "세트 아이템 검색",
		onHalf: () => scaleRarity("set", .5),
		onReset: () => resetTable("setItems"),
		badge: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			tone: "set",
			children: "Set"
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataGrid, {
			table,
			columns: SET_EDITOR_COLS,
			search,
			onChange: (r, c, v) => patchCell("setItems", r, c, v),
			displayName: (row) => strings.tryDisplay(getCell(row, table, "index")) || strings.tryDisplay(getCell(row, table, "*ItemName")) || getCell(row, table, "index"),
			empty: "세트 아이템이 없습니다."
		})
	});
}
function RuneTable() {
	const table = useEditor((s) => s.tables.misc);
	const strings = useEditor((s) => s.strings);
	const search = useEditor((s) => s.search);
	const setSearch = useEditor((s) => s.setSearch);
	const patchCell = useEditor((s) => s.patchCell);
	const scaleRarity = useEditor((s) => s.scaleRarity);
	const resetTable = useEditor((s) => s.resetTable);
	if (!table) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NeedFile$1, { kind: "룬" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
		title: "룬",
		blurb: "엽굵 모드의 확장 룬(가에, 엽, 굵 등)과 바닐라 룬을 함께 보여 줍니다. 유형이 rune / runx / runh 인 아이템만 필터합니다.",
		search,
		setSearch,
		placeholder: "룬 이름 · 코드",
		onHalf: () => scaleRarity("rune", .5),
		onReset: () => resetTable("misc"),
		badge: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			tone: "rune",
			children: "Rune"
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataGrid, {
			table,
			columns: MISC_EDITOR_COLS,
			search,
			filterRow: (row) => RUNE_TYPES.has(getCell(row, table, "type")),
			onChange: (r, c, v) => patchCell("misc", r, c, v),
			displayName: (row) => strings.tryDisplay(getCell(row, table, "namestr")) || strings.tryDisplay(getCell(row, table, "code")) || getCell(row, table, "name"),
			empty: "룬 아이템이 없습니다."
		})
	});
}
function FigureTable() {
	const table = useEditor((s) => s.tables.misc);
	const strings = useEditor((s) => s.strings);
	const search = useEditor((s) => s.search);
	const setSearch = useEditor((s) => s.setSearch);
	const patchCell = useEditor((s) => s.patchCell);
	const scaleRarity = useEditor((s) => s.scaleRarity);
	const resetTable = useEditor((s) => s.resetTable);
	if (!table) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NeedFile$1, { kind: "피규어" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
		title: "피규어",
		blurb: "엽굵 모드의 컬렉션 피규어입니다. dols / rdol / odol 유형과 만화책 컬렉션(dolk)이 포함됩니다. 필드 드랍은 보물 클래스 dolls* 의 미드랍도 함께 보세요.",
		search,
		setSearch,
		placeholder: "피규어 · 컬렉션 검색",
		onHalf: () => scaleRarity("figure", .5),
		onReset: () => resetTable("misc"),
		badge: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			tone: "figure",
			children: "Figure"
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataGrid, {
			table,
			columns: MISC_EDITOR_COLS,
			search,
			filterRow: (row) => FIGURE_TYPES.has(getCell(row, table, "type")),
			onChange: (r, c, v) => patchCell("misc", r, c, v),
			displayName: (row) => {
				const code = getCell(row, table, "code");
				const name = getCell(row, table, "name");
				return strings.tryDisplay(code) || strings.tryDisplay(getCell(row, table, "namestr")) || figureKorean(name, code) || name;
			},
			empty: "피규어 아이템이 없습니다. 엽굵 MPQ를 열면 컬렉션이 나타납니다."
		})
	});
}
function Panel({ title, blurb, search, setSearch, placeholder, onHalf, onReset, badge, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl tracking-tight",
					children: title
				}), badge]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 max-w-2xl text-sm text-fg-muted leading-relaxed",
				children: blurb
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
						value: search,
						onChange: setSearch,
						placeholder
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						size: "sm",
						onClick: onHalf,
						children: "희귀도 절반"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: onReset,
						children: "원본"
					})
				]
			})]
		}), children]
	});
}
function NeedFile$1({ kind }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-dashed border-border-strong px-6 py-16 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "font-display text-xl",
			children: [kind, " 테이블이 없습니다"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-fg-muted",
			children: "MPQ를 열거나 엽굵 샘플을 불러오세요."
		})]
	});
}
var CLASSES = [
	{
		id: "all",
		code: "",
		label: "전체"
	},
	{
		id: "ama",
		code: "ama",
		label: "아마존"
	},
	{
		id: "sor",
		code: "sor",
		label: "소서리스"
	},
	{
		id: "nec",
		code: "nec",
		label: "네크로맨서"
	},
	{
		id: "war",
		code: "war",
		label: "악마술사"
	},
	{
		id: "pal",
		code: "pal",
		label: "팔라딘"
	},
	{
		id: "bar",
		code: "bar",
		label: "바바리안"
	},
	{
		id: "dru",
		code: "dru",
		label: "드루이드"
	},
	{
		id: "ass",
		code: "ass",
		label: "어쌔신"
	},
	{
		id: "none",
		code: "__none__",
		label: "공용·몬스터"
	}
];
function SkillTable() {
	const table = useEditor((s) => s.tables.skills);
	const strings = useEditor((s) => s.strings);
	const search = useEditor((s) => s.search);
	const setSearch = useEditor((s) => s.setSearch);
	const patchCell = useEditor((s) => s.patchCell);
	const resetTable = useEditor((s) => s.resetTable);
	const [cls, setCls] = (0, import_react.useState)("all");
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [tab, setTab] = (0, import_react.useState)("damage");
	if (!table) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NeedFile, { kind: "스킬" });
	const selectedRow = selected != null ? table.rows[selected] : void 0;
	const selectedName = selectedRow ? strings.display(getCell(selectedRow, table, "skill"), getCell(selectedRow, table, "skilldesc")) : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-col gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-end justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl tracking-tight",
						children: "캐릭터 스킬"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 max-w-2xl text-sm text-fg-muted leading-relaxed",
						children: "직업을 고르고 스킬을 선택하면 피해·시너지·파라미터를 수정할 수 있습니다. 한글 이름은 모드 문자열 테이블을 사용합니다."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
							value: search,
							onChange: setSearch,
							placeholder: "스킬 이름 검색"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: () => resetTable("skills"),
							children: "원본"
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-2",
					children: CLASSES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: cls === c.id ? "primary" : "secondary",
						onClick: () => setCls(c.id),
						children: c.label
					}, c.id))
				})]
			}),
			selectedRow && isDataRow(selectedRow) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkillDetail, {
				table,
				row: selectedRow,
				rowIndex: selected,
				tab,
				onTab: setTab,
				title: selectedName,
				klass: labelClass(getCell(selectedRow, table, "charclass")),
				onChange: (col, val) => patchCell("skills", selected, col, val),
				onClose: () => setSelected(null)
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-lg border border-dashed border-border px-4 py-3 text-sm text-fg-muted",
				children: "목록에서 스킬을 선택하면 데미지, 시너지, 파라미터를 수정할 수 있습니다."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataGrid, {
				table,
				columns: SKILL_EDITOR_COLS,
				search,
				selectedIndex: selected,
				onSelectRow: setSelected,
				filterRow: (row) => {
					const code = getCell(row, table, "charclass").toLowerCase();
					if (cls === "all") return true;
					if (cls === "none") return !code;
					return code === CLASSES.find((c) => c.id === cls)?.code;
				},
				onChange: (r, c, v) => patchCell("skills", r, c, v),
				displayName: (row) => {
					const skill = getCell(row, table, "skill");
					const desc = getCell(row, table, "skilldesc");
					return `${strings.display(skill, strings.display(desc, skill))}  ·  ${labelClass(getCell(row, table, "charclass"))}`;
				},
				empty: "조건에 맞는 스킬이 없습니다."
			})
		]
	});
}
var DAMAGE_COLS = [
	"MinDam",
	"MaxDam",
	"MinLevDam1",
	"MinLevDam2",
	"MinLevDam3",
	"MinLevDam4",
	"MinLevDam5",
	"MaxLevDam1",
	"MaxLevDam2",
	"MaxLevDam3",
	"MaxLevDam4",
	"MaxLevDam5",
	"SrcDam",
	"HitShift",
	"ToHit",
	"LevToHit",
	"EType",
	"EMin",
	"EMax",
	"EMinLev1",
	"EMinLev2",
	"EMinLev3",
	"EMinLev4",
	"EMinLev5",
	"EMaxLev1",
	"EMaxLev2",
	"EMaxLev3",
	"EMaxLev4",
	"EMaxLev5",
	"ELen"
];
var SYNERGY_COLS = [
	"DmgSymPerCalc",
	"EDmgSymPerCalc",
	"ELenSymPerCalc",
	"ToHitCalc",
	"calc1",
	"calc2",
	"calc3",
	"calc4"
];
var PARAM_COLS = [
	"Param1",
	"Param2",
	"Param3",
	"Param4",
	"Param5",
	"Param6",
	"Param7",
	"Param8"
];
var BASIC_COLS = [
	"reqlevel",
	"maxlvl",
	"minmana",
	"mana",
	"lvlmana",
	"manashift",
	"delay",
	"localdelay",
	"globaldelay",
	"InGame",
	"leftskill",
	"rightskill",
	"passive",
	"aura"
];
var TABS = [
	{
		id: "damage",
		label: "데미지"
	},
	{
		id: "synergy",
		label: "시너지"
	},
	{
		id: "params",
		label: "파라미터"
	},
	{
		id: "basic",
		label: "기본"
	}
];
function fieldHint(table, row, col) {
	const candidates = [
		`*${col} Description`,
		`*${col} desc`,
		`*${col}desc`,
		`*${col} Description2`
	];
	for (const c of candidates) {
		const v = getCell(row, table, c).trim();
		if (v) return v;
	}
	return HINTS[col] ?? "";
}
function SkillDetail({ table, row, rowIndex, tab, onTab, title, klass, onChange, onClose }) {
	const cols = tab === "damage" ? DAMAGE_COLS : tab === "synergy" ? SYNERGY_COLS : tab === "params" ? PARAM_COLS : BASIC_COLS;
	const wide = tab === "synergy";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl border border-border bg-bg-elevated p-4 sm:p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-fg-subtle",
						children: klass
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-display text-xl tracking-tight",
						children: title || getCell(row, table, "skill")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-xs text-fg-muted",
						children: [
							"#",
							rowIndex,
							" · ",
							getCell(row, table, "skill")
						]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "sm",
					onClick: onClose,
					children: "닫기"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex flex-wrap gap-2",
				children: TABS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: tab === t.id ? "primary" : "secondary",
					onClick: () => onTab(t.id),
					children: t.label
				}, t.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("mt-4 grid gap-3", wide ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"),
				children: cols.filter((c) => table.headers.some((h) => h.toLowerCase() === c.toLowerCase())).map((c) => {
					const hint = fieldHint(table, row, c);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-medium",
								children: labelCol(c)
							}),
							hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-0.5 block text-xs text-fg-muted leading-snug",
								children: hint
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: cn("mt-1.5 h-10 w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg", "hover:border-border-strong focus:border-primary/50", wide ? "font-mono text-xs" : "tabular-nums"),
								value: getCell(row, table, c),
								onChange: (e) => onChange(c, e.target.value)
							})
						]
					}, c);
				})
			})
		]
	});
}
function MonsterTable() {
	const table = useEditor((s) => s.tables.monstats);
	const strings = useEditor((s) => s.strings);
	const search = useEditor((s) => s.search);
	const setSearch = useEditor((s) => s.setSearch);
	const patchCell = useEditor((s) => s.patchCell);
	const resetTable = useEditor((s) => s.resetTable);
	const setSlamtrapSkillsDisabled = useEditor((s) => s.setSlamtrapSkillsDisabled);
	if (!table) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NeedFile, { kind: "몬스터" });
	const slamtraps = (0, import_react.useMemo)(() => {
		const rows = [];
		table.rows.forEach((row, index) => {
			if (!isDataRow(row)) return;
			if (isSlamtrapMonster(getCell(row, table, "Id"), getCell(row, table, "NameStr"))) rows.push({
				index,
				row
			});
		});
		return rows;
	}, [table]);
	const slamtrapOff = slamtraps.length > 0 && slamtraps.every(({ row }) => !getCell(row, table, "Skill1").trim());
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl tracking-tight",
					children: "몬스터 스킬"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 max-w-2xl text-sm text-fg-muted leading-relaxed",
					children: "Skill1–8 과 레벨, 난이도별 레벨/TC를 수정합니다. 스킬 칸에는 Skills.txt 의 skill 키를 넣습니다."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
						value: search,
						onChange: setSearch,
						placeholder: "몬스터 이름 · ID"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => resetTable("monstats"),
						children: "원본"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-start gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					className: "mt-1 size-4 accent-primary",
					checked: slamtrapOff,
					disabled: !slamtraps.length,
					onChange: (e) => {
						const off = e.target.checked;
						setSlamtrapSkillsDisabled(off);
						toast.success(off ? "콰과광이 스킬을 쓰지 않습니다" : "콰과광 스킬을 원본대로 되돌렸습니다");
					}
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block text-sm font-medium",
					children: "콰과광이 스킬을 쓰지 않음"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-0.5 block text-xs text-fg-muted leading-relaxed",
					children: slamtraps.length ? `slamtrap ${slamtraps.length}마리의 Skill1–8을 비웁니다. 체크를 끄면 연 파일 원본 스킬이 복구됩니다.` : "이 모드에 slamtrap(콰과광) 항목이 없습니다."
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataGrid, {
				table,
				columns: MONSTER_EDITOR_COLS,
				search,
				onChange: (r, c, v) => patchCell("monstats", r, c, v),
				displayName: (row) => {
					const id = getCell(row, table, "Id");
					const ns = getCell(row, table, "NameStr");
					const name = strings.display(ns, strings.display(id, id));
					return isSlamtrapMonster(id, ns) ? `${name}  ·  콰과광` : name;
				},
				empty: "몬스터가 없습니다."
			})
		]
	});
}
function NeedFile({ kind }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-dashed border-border-strong px-6 py-16 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "font-display text-xl",
			children: [kind, " 테이블이 없습니다"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-fg-muted",
			children: "MPQ를 열거나 엽굵 샘플을 불러오세요."
		})]
	});
}
var NAV = [
	{
		id: "drops",
		label: "드랍률",
		icon: Layers
	},
	{
		id: "uniques",
		label: "유니크",
		icon: Sparkles
	},
	{
		id: "sets",
		label: "세트",
		icon: BookOpen
	},
	{
		id: "runes",
		label: "룬",
		icon: Gem
	},
	{
		id: "figures",
		label: "피규어",
		icon: Ghost
	},
	{
		id: "skills",
		label: "캐릭터 스킬",
		icon: Swords
	},
	{
		id: "monsters",
		label: "몬스터 스킬",
		icon: Table2
	}
];
function Workbench() {
	const inputRef = (0, import_react.useRef)(null);
	const source = useEditor((s) => s.source);
	const fileName = useEditor((s) => s.fileName);
	const loading = useEditor((s) => s.loading);
	const error = useEditor((s) => s.error);
	const nav = useEditor((s) => s.nav);
	const setNav = useEditor((s) => s.setNav);
	const openMpq = useEditor((s) => s.openMpq);
	const loadSample = useEditor((s) => s.loadSample);
	const exportMpq = useEditor((s) => s.exportMpq);
	const dirty = useEditor((s) => s.dirty);
	const changedCount = useEditor((s) => s.changedCount());
	const archive = useEditor((s) => s.archive);
	const onOpen = async (file) => {
		if (!file) return;
		await openMpq(file);
		const err = useEditor.getState().error;
		if (err) toast.error(err);
		else toast.success(`${file.name} 을 열었습니다`);
	};
	const onSave = () => {
		try {
			const { bytes, name } = exportMpq();
			const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = name;
			a.click();
			URL.revokeObjectURL(url);
			toast.success(`${name} 저장`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "저장에 실패했습니다");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-sm",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex min-w-0 flex-1 items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-bg-elevated",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Anvil, { className: "size-5 text-primary" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-lg leading-none tracking-tight",
								children: "헬포지"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 truncate text-xs text-fg-muted",
								children: "엽굵 · D2R 모드 작업대"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden min-w-0 max-w-xs truncate text-xs text-fg-muted sm:block",
						children: [fileName ? fileName : "파일 없음", dirty ? " · 수정됨" : ""]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: inputRef,
						type: "file",
						accept: ".mpq,application/octet-stream",
						className: "hidden",
						onChange: (e) => onOpen(e.target.files?.[0])
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						size: "sm",
						onClick: () => inputRef.current?.click(),
						disabled: loading,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden sm:inline",
							children: "MPQ 열기"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => loadSample(),
						disabled: loading,
						children: "샘플"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						onClick: onSave,
						disabled: source === "empty" || loading,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden sm:inline",
							children: "다른 이름 저장"
						})]
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:py-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "flex shrink-0 gap-2 overflow-x-auto lg:w-52 lg:flex-col lg:overflow-visible",
				children: [NAV.map((item) => {
					const Icon = item.icon;
					const active = nav === item.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setNav(item.id),
						className: cn("flex h-11 min-w-max items-center gap-2 rounded-md px-3 text-sm transition-colors", active ? "bg-primary text-primary-fg" : "text-fg-muted hover:bg-bg-subtle hover:text-fg"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" }), item.label]
					}, item.id);
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "hidden lg:mt-auto lg:block",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-border bg-bg-elevated p-3 text-xs text-fg-muted leading-relaxed",
						children: [archive ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							"원본 파일 ",
							archive.files.length.toLocaleString(),
							"개. 수정된 엑셀만 갈아 끼워 새 MPQ로 내보냅니다."
						] }) : source === "sample" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "엽굵 샘플 테이블입니다. 저장하면 엑셀만 담긴 작은 MPQ가 내려갑니다." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "내 컴퓨터의 .mpq 를 열거나, 엽굵 샘플로 먼저 살펴보세요." }), changedCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
							className: "mt-2",
							tone: "ok",
							children: [changedCount, "개 테이블 변경"]
						}) : null]
					})
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "flex min-h-0 min-w-0 flex-1 flex-col",
				children: [error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger",
					children: error
				}) : null, source === "empty" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Welcome, {
					onSample: loadSample,
					onOpen: () => inputRef.current?.click()
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActivePanel, {})]
			})]
		})]
	});
}
function ActivePanel() {
	switch (useEditor((s) => s.nav)) {
		case "drops": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropRates, {});
		case "uniques": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UniqueTable, {});
		case "sets": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SetTable, {});
		case "runes": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RuneTable, {});
		case "figures": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FigureTable, {});
		case "skills": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkillTable, {});
		case "monsters": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MonsterTable, {});
		default: return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropRates, {});
	}
}
function Welcome({ onSample, onOpen }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-1 flex-col justify-center py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs tracking-[0.2em] text-fg-subtle uppercase",
				children: "Sanctuary Workbench"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl",
				children: [
					"모드를 열고",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
					"드랍과 스킬을 다듬으세요"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 max-w-xl text-sm leading-relaxed text-fg-muted",
				children: "엽굵 모드 MPQ를 브라우저에서 읽고, 난이도별 유니크·세트·룬·피규어 드랍과 캐릭터/몬스터 스킬을 한글 이름으로 수정한 뒤 새 .mpq 로 저장합니다. 원본 파일은 덮어쓰지 않습니다."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 flex flex-wrap gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "lg",
					onClick: onOpen,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, { className: "size-4" }), "MPQ 열기"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "lg",
					variant: "secondary",
					onClick: onSample,
					children: "엽굵 샘플 불러오기"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-10 grid gap-3 sm:grid-cols-2",
				children: [
					["다른 이름 저장", "수정본만 새 MPQ로 내려받습니다"],
					["난이도별 드랍", "노멀 / 나이트메어 / 헬 보물 클래스"],
					["피규어 컬렉션", "엽굵 인형·만화책 컬렉션 테이블"],
					["스킬 한글화", "직업·몬스터 스킬을 한국어로 표시"]
				].map(([t, d]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-lg border border-border bg-bg-elevated px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium",
						children: t
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-fg-muted",
						children: d
					})]
				}, t))
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Workbench, {});
}
//#endregion
export { Home as component };
