export { serializeSheet, deserializeSheet };
declare function serializeSheet(sheet: any): {
    version: number;
    sheet: any;
};
declare function deserializeSheet(json: any): any;
export declare function convertV0ToV1(oldJSONArray: any): any;
export declare function convertV1ToV2(jsonObjects: any): any;
