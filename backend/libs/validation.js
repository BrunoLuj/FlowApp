export const isPlainObject=value=>Boolean(value)&&typeof value==="object"
    && !Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;

export const normalizeEmail=value=>String(value||"").trim().toLowerCase();
export const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=254;
export const validHex=value=>/^#[0-9A-F]{6}$/i.test(String(value||""));
export const positiveId=value=>Number.isSafeInteger(Number(value))&&Number(value)>0;
export const finiteNumber=value=>value!==""&&Number.isFinite(Number(value));

export const cleanText=(value,maxLength)=>String(value||"").trim().slice(0,maxLength);
