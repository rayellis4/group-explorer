/**
# SheetSerialization

Sheet serialization history:

  v0 -- store group library, sheets in localStorage
  v1 -- store group library in localStorage, sheets in indexedDB as string (stringified JSON)
  v2 -- store group library, sheets in indexedDB as ExportedSheet w/ version == 2

```js
 */
import * as THREE from '../lib/externals.js';
import type { StrategyParameters } from './CayleyDiagramGenerator.ts';
import type { SheetJSON } from './SheetModel.ts';
declare const CURRENT_FORMAT: 2;
export type WrappedSheet = {
    version: typeof CURRENT_FORMAT;
    sheet: SheetJSON[];
};
type v0Sheet = v0SheetType[];
type v1Sheet = v1SheetType[];
type v2Sheet = v2SheetType[];
type v2SheetType = SheetJSON;
type v0StoredSheet = string;
type v1StoredSheet = string;
type v2StoredSheet = {
    version: typeof CURRENT_FORMAT;
    sheet: v2Sheet;
};
type anyStoredSheet = v0StoredSheet | v1StoredSheet | v2StoredSheet;
export declare function wrapSheet(sheet: v2Sheet): v2StoredSheet;
export declare function unwrapSheet(wrappedSheet: WrappedSheet): v2Sheet;
export declare function deserializeSheet(json: string | anyStoredSheet): SheetJSON[];
type v0SheetType = {
    className: string;
    x: number;
    y: number;
    w: number;
    h: number;
    arrowMargin?: number;
    fromIndex?: number;
    toIndex?: number;
    sourceId: string;
    destinationId: string;
    useArrowhead?: boolean;
    hasArrowhead: boolean;
    showInjSurj?: boolean;
    showInjectionSurjection: boolean;
    showDomAndCod?: boolean;
    showDomainAndCodomain: boolean;
    isClean: boolean;
    color_highlights: unknown;
    arrowhead_placement: unknown;
    arrows: unknown;
    background: unknown;
    camera_matrix: unknown;
    camera_up?: THREE.Vector3;
    chunk: unknown;
    fog_level: unknown;
    groupURL: unknown;
    label_scale_factor: unknown;
    line_width: unknown;
    nodes?: ({
        label: string;
    })[];
    right_multiply: unknown;
    ring_highlights: unknown;
    sphere_base_radius: unknown;
    sphere_scale_factor: unknown;
    square_highlights: unknown;
    strategy_parameters: unknown;
    zoom_level: unknown;
    visualizer: any;
};
export declare function convertV0ToV1(oldJSONArray: v0Sheet): v1Sheet;
type v1SheetType = {
    className: string;
    id: string;
    color?: color;
    x?: float;
    y?: float;
    w?: float;
    h?: float;
    z?: integer;
    alignment?: 'left' | 'center' | 'right';
    fontColor?: color;
    fontSize?: string;
    isPlainText?: boolean;
    opacity?: number;
    text?: html;
    groupURL?: string;
    isClean?: boolean;
    visualizer?: v1CDVisualizer | v1CGVisualizer | v1MTVisualizer;
    _visualizer?: any;
    destinationId?: string;
    sourceId?: string;
    hasArrowhead?: boolean;
    thickness?: number;
    arrowMargin?: number;
    definingPairs?: [groupElement, groupElement][];
    name?: html;
    showDefiningPairs?: boolean;
    showDomainAndCodomain?: boolean;
    showInjectionSurjection?: boolean;
    showManyArrows?: boolean;
};
type v1CDVisualizer = {
    arrowhead_placement?: integer;
    arrows: any[];
    background?: color;
    cameraJSON: any;
    cameraUp?: THREE.Vector3;
    chunk?: integer;
    color_highlights?: Maybe<color>[];
    diagram_name?: Maybe<string>;
    fog_level?: integer;
    groupURL?: string;
    label_scale_factor?: float;
    line_width?: float;
    nodes?: any[];
    right_multiply?: boolean;
    ring_highlights?: Maybe<color>[];
    sphere_base_radius?: float;
    square_highlights?: Maybe<color>[];
    strategy_parameters?: StrategyParameters[];
    zoom_level?: float;
};
type v1CGVisualizer = {
    groupURL: string;
    highlights?: {
        background: Maybe<color>[];
        border: Maybe<color>[];
        top: Maybe<color>[];
    };
};
type v1MTVisualizer = {
    colorReordering?: 'topRowFixed' | 'elementColorsFixed';
    coloration?: 'rainbow' | 'grayscale' | 'none';
    elements?: groupElement[];
    groupURL: string;
    highlights?: {
        background: Maybe<color>[];
        border: Maybe<color>[];
        corner: Maybe<color>[];
    };
    organizingSubgroup?: integer;
    separation?: number;
};
export declare function convertV1ToV2(v1Objects: v1Sheet): v2Sheet;
export {};
