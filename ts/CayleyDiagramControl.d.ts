import type { CayleyDiagramModel } from './CayleyDiagramModel.ts';
import type { StrategyParameters, ArrowGenerator } from './CayleyDiagramGenerator.ts';
export type CayleyDiagramControlJSON = {
    diagram_name?: string;
    strategy_parameters?: StrategyParameters[];
    arrow_generators?: ArrowGenerator[];
    right_multiply?: boolean;
    chunk_subgroup_index?: integer;
};
export declare function addControl(cayleyDiagramControlElement: HTMLElement, model: CayleyDiagramModel): void;
