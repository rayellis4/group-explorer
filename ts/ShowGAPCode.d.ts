import type { Group } from './Group.js';
export declare function setup(purpose: string, group: Group): Promise<void>;
export declare function resolveGAPInfo(presentation: string): Promise<{
    gapid: string;
    gapname: string;
}>;
