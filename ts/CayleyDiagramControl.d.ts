import type { CayleyDiagramModel } from './CayleyDiagramModel.ts';
import type { StrategyParameters, ArrowGenerator } from './CayleyDiagramGenerator.ts';
export type CayleyDiagramControlJSON = ({
    diagram_name: string;
    strategy_parameters?: undefined;
    chunk_subgroup_index?: undefined;
} | {
    diagram_name?: undefined;
    strategy_parameters?: StrategyParameters[];
    chunk_subgroup_index?: integer;
}) & {
    arrow_generators?: ArrowGenerator[];
    right_multiply?: boolean;
};
export declare function addControl(cayleyDiagramControlElement: HTMLElement, model: CayleyDiagramModel): void;
