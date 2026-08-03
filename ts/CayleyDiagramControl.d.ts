import type { CayleyDiagramModel } from './CayleyDiagramModel.js';
import type { StrategyParameters, ArrowGenerator } from './CayleyDiagramGenerator.js';
export type CayleyDiagramControlJSON = {
    diagram_name: Maybe<string>;
    strategy_parameters: StrategyParameters[];
    arrow_generators: Maybe<ArrowGenerator[]>;
    right_multiply: boolean;
    chunk_subgroup_index: Maybe<integer>;
};
export declare function addControl(cayleyDiagramControlElement: HTMLElement, model: CayleyDiagramModel): void;
