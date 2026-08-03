export { DIRECTION_INDEX, AXIS_NAME, layoutCayleyDiagram, nextArrowColor, getDefaultStrategies };
declare const DIRECTION_INDEX: {
    X: number;
    Y: number;
    Z: number;
    YZ: number;
    XZ: number;
    XY: number;
};
declare const AXIS_NAME: string[];
declare function layoutCayleyDiagram(group: any, nameOrStrategies: any, arrowGenerators: any, rightMultiply: any, chunkSubgroupIndex: any): {
    pov: {
        position: any;
        up: any;
    };
    nodes: any;
    arrows: any;
    chunks: never[];
} | {
    pov: {
        position: any;
        up: any;
    };
    nodes: any;
    arrows: {
        start_node: any;
        end_node: any;
        generator: any;
        bidirectional: boolean;
        thirdPoint: any;
        keepCurved: boolean;
        offset: number | null;
    }[];
    chunks: any;
};
declare function getDefaultStrategies(group: any): any;
declare function nextArrowColor(colorsUsed?: never[]): string | undefined;
