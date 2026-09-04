/**
# SheetSerialization

Sheet serialization history:

  v0 -- store group library, sheets in localStorage
  v1 -- store group library in localStorage, sheets in indexedDB as string (stringified JSON)
  v2 -- store group library, sheets in indexedDB as ExportedSheet w/ version == 2

```js
 */
import { layoutCayleyDiagram, getPOV } from './CayleyDiagramGenerator.js';
import { DEFAULT_NODE_COLOR } from './CayleyDiagramView.js';
import * as Library from './Library.js';
import * as Log from './Log.js';
import * as MathML from './MathML.js';
import * as THREE from '../lib/externals.js';
import * as SheetView from './SheetView.js';
export const CURRENT_FORMAT_VERSION = 2;
function isNonNullPojo(obj) {
    return obj != null && typeof obj === 'object' && !Array.isArray(obj);
}
function isNonEmptyPojoArray(obj) {
    return Array.isArray(obj) && isNonNullPojo(obj[0]);
}
export function isVersionedSheet(obj) {
    return isNonNullPojo(obj) && 'version' in obj && typeof obj.version === 'number';
}
export function isRawSheet(obj) {
    return isNonEmptyPojoArray(obj) && !('sheetName' in obj[0]);
}
/*
use cases

normal:
import from textarea (could be left over from old export!)
restore v2 export string from clipboard (version, no SheetName => ExportedSheet; deserialized as ExportedSheet object)
restore v1 export string from clipboard (no version, SheetName => old export; deserialized as string)
restore v2 backup from file/clipboard (Array of named ExportedSheets; array of deserialize calls of ExportedSheet objects)

update:
migrateToV1: create 'storedSheets' in indexedDB;  if 'sheets' exist in localStore, deserialize/stringify/store to indexedDB
migrateToV2: deserialize v1 sheet string and store object in indexeddb
 */
export function deserializeSheet(json) {
    let sheet;
    const jsonObject = JSON.parse(json);
    if (isVersionedSheet(jsonObject)) {
        sheet = convertSheetFromVersion(jsonObject);
    }
    else if (isRawSheet(jsonObject)) {
        sheet = convertSheetFromVersion({ version: 1, sheet: jsonObject });
    }
    else {
        const errorMessage = `SheetSerialization.deserializeSheet: unrecognized argument: ${json}`;
        Log.err(errorMessage);
        throw new TypeError(errorMessage);
    }
    return sheet;
}
function convertSheetFromVersion(input) {
    let json = input.sheet;
    switch (input.version) {
        case 0: json = convertV0ToV1(json);
        case 1: json = convertV1ToV2(json);
        case CURRENT_FORMAT_VERSION:
    }
    return { version: CURRENT_FORMAT_VERSION, sheet: json };
}
// given JSON for v0 sheet, return JSON for v1 sheet
export function convertV0ToV1(oldJSONArray) {
    /*
     * Convert from original Sheet JSON to current version
     *    Link:
     *      fromIndex -> sourceId
     *      toIndex -> destinationId
     *    Connection:
     *      useArrowhead -> hasArrowhead
     *      arrowheadSize not used?
     *    Morphism:
     *      showInjSurj -> showInjectionSurjection
     *      showDomAndCod -> showDomainAndCodomain
     *      arrowMargin was expressed in pixels, is now a percentage of the center-to-center distance
     */
    const pixelsPerModelUnit = Math.min(window.innerWidth, window.innerHeight - 71);
    for (let inx = 0; inx < oldJSONArray.length; inx++) {
        const json = oldJSONArray[inx];
        // account for padding in old wrapper, #graphic offset from window, different padding in heading
        json.x += 10;
        json.y += 10 - SheetView.graphicRect.y - 6;
        // convert arrowMargin from pixels offset to percentage of center-to-center distance
        if (json.arrowMargin !== undefined) {
            const from = oldJSONArray[json.fromIndex];
            const fromCenter = new THREE.Vector2(from.x + from.w / 2, from.y + from.h / 2);
            const to = oldJSONArray[json.toIndex];
            const toCenter = new THREE.Vector2(to.x + to.w / 2, to.y + to.h / 2);
            const centerToCenter = fromCenter.sub(toCenter).length() * pixelsPerModelUnit;
            json.arrowMargin *= 1 / centerToCenter;
        }
        // re-write fromIndex to sourceId, toIndex to destinationId
        if (json.fromIndex !== undefined) {
            json.sourceId = json.fromIndex + '';
            delete json.fromIndex;
        }
        if (json.toIndex !== undefined) {
            json.destinationId = json.toIndex + '';
            delete json.toIndex;
        }
        // re-write useArrowhead to hasArrowhead
        if (json.useArrowhead !== undefined) {
            json.hasArrowhead = json.useArrowhead;
            delete json.useArrowhead;
        }
        // re-write showInjSurj to showInjectionSurjection
        if (json.showInjSurj !== undefined) {
            json.showInjectionSurjection = json.showInjSurj;
            delete json.showInjSurj;
        }
        // re-write showDomAndCod to showDomainAndCodomain
        if (json.showDomAndCod !== undefined) {
            json.showDomainAndCodomain = json.showDomAndCod;
            delete json.showDomAndCod;
        }
        // convert node labels from MathML to HTML
        if (json.nodes != null) {
            for (const node of json.nodes) {
                node.label = MathML.toHTML(node.label);
            }
        }
        // convert old CDElement JSON
        if (json.className === 'CDElement' && json.camera_matrix != null) {
            const visualizer = {
                arrowhead_placement: json.arrowhead_placement,
                arrows: json.arrows,
                background: json.background,
                cameraJSON: {
                    metadata: {
                        type: 'Object'
                    },
                    object: {
                        aspect: 1,
                        far: 2000,
                        filmGauge: 35,
                        filmOffset: 0,
                        focus: 10,
                        fov: 45,
                        layers: 1,
                        matrix: json.camera_matrix,
                        near: 0.1,
                        type: 'PerspectiveCamera',
                        zoom: 1
                    }
                },
                cameraUp: new THREE.Vector3(...json.camera_up),
                chunk: json.chunk,
                color_highlights: json.color_highlights,
                fog_level: json.fog_level,
                groupURL: json.groupURL,
                label_scale_factor: json.label_scale_factor,
                line_width: json.line_width,
                nodes: json.nodes,
                right_multiply: json.right_multiply,
                ring_highlights: json.ring_highlights,
                sphere_base_radius: json.sphere_base_radius,
                sphere_scale_factor: json.sphere_scale_factor,
                square_highlights: json.square_highlights,
                strategy_parameters: json.strategy_parameters,
                zoom_level: json.zoom_level
            };
            json.visualizer = visualizer;
            json.isClean = false;
            delete json.arrowhead_placement;
            delete json.arrows;
            delete json.background;
            delete json.camera_matrix;
            delete json.camera_up;
            delete json.chunk;
            delete json.color_highlights;
            delete json.fog_level;
            delete json.label_scale_factor;
            delete json.line_width;
            delete json.nodes;
            delete json.right_multiply;
            delete json.ring_highlights;
            delete json.sphere_base_radius;
            delete json.sphere_scale_factor;
            delete json.square_highlights;
            delete json.strategy_parameters;
            delete json.zoom_level;
        }
    }
    return oldJSONArray;
}
// given JSON object for v1 sheet, return JSON object for v2 sheet
export function convertV1ToV2(v1Objects) {
    const formatHighlights = (highlights, nullish = []) => {
        const result = highlights.map((colorList, inx) => (colorList == null) ? [] : colorList.map((color) => (color == nullish[inx]) ? null : color));
        return result;
    };
    function copyCompatibleField(v1, v2, field) {
        if (field in v1) { // Guard against missing runtime fields in the old object
            const value = v1[field];
            v2[field] = value; // check that types are compatible at compile time
        }
    }
    const v2Objects = v1Objects.map((v1Object) => {
        // create SheetJSON object skeletons
        const v2Object = {
            className: v1Object.className,
            id: v1Object.id,
        };
        // create visualizers for each VisualizerElement
        // create source_id, destination_id fields for LinkElemnts
        switch (v1Object.className) {
            case 'CDElement': {
                const v1Visualizer = v1Object.visualizer;
                if (v1Visualizer == null) {
                    break;
                }
                if (v1Visualizer.groupURL == null
                    || Library.getGroupByURL(v1Visualizer.groupURL) == null
                    || (v1Visualizer.diagram_name == null && v1Visualizer.strategy_parameters == null)) {
                    Log.err('unrecognizable v1 json in SheetSerialization.convertV1ToV2');
                    break;
                }
                const group = Library.getGroupByURL(v1Visualizer.groupURL);
                const strategyParameters = v1Visualizer.strategy_parameters?.map((strategy_parameter) => {
                    return { ...strategy_parameter };
                }) ?? [];
                const arrowGenerators = v1Visualizer?.arrows
                    .filter((arrow) => arrow.start_element == 0)
                    .map((arrow) => ({ generator: arrow.generator, color: arrow.color }));
                const diagramControl = {
                    ...(v1Visualizer.diagram_name != null && { diagram_name: v1Visualizer.diagram_name }),
                    ...(strategyParameters.length != 0 && { strategy_parameters: strategyParameters }),
                    ...(arrowGenerators != null && { arrow_generators: arrowGenerators }),
                    ...(v1Visualizer.right_multiply == false && { right_multiply: false }),
                    ...(v1Visualizer?.chunk && { chunk_subgroup_index: v1Visualizer.chunk })
                };
                const nodes = v1Visualizer.nodes.map(({ position, element, label }) => {
                    return { position: { ...position }, element, label, color: DEFAULT_NODE_COLOR };
                });
                // convert camera: extract position from column-major matrix[12,13,14], use cameraUp for up
                const matrix = v1Visualizer.cameraJSON?.object?.matrix;
                const position = matrix
                    ? { x: matrix[12], y: matrix[13], z: matrix[14] }
                    : { x: 0, y: 0, z: 3 };
                const up = v1Visualizer.cameraUp ?? { x: 0, y: 1, z: 0 };
                const pov = { position, up };
                const maybePOV = getPOV(nodes.map(({ position }) => { return { position: new THREE.Vector3(position.x, position.y, position.z) }; }), v1Visualizer.diagram_name == null);
                if (maybePOV.position.equals(new THREE.Vector3(position.x, position.y, position.z))
                    && new THREE.Vector3(up.x, up.y, up.z).negate().equals(maybePOV.up)) {
                    Object.assign(up, { x: -up.x, y: -up.y, z: -up.z });
                }
                const arrows = v1Visualizer.arrows.map((arrow) => {
                    const { start_element, end_element, generator, thirdPoint, offset, color } = arrow;
                    const bidirectional = group.mult(end_element, generator) === start_element;
                    const result = {
                        start_element,
                        end_element,
                        generator,
                        thirdPoint: { ...thirdPoint },
                        offset,
                        bidirectional,
                        keepCurved: false,
                        color
                    };
                    return result;
                });
                const chunks = [];
                if (v1Visualizer?.chunk != null && v1Visualizer.chunk !== 0) {
                    const maybeLayout = layoutCayleyDiagram(group, v1Visualizer?.diagram_name ?? undefined, v1Visualizer?.strategy_parameters, arrowGenerators, v1Visualizer.right_multiply, v1Visualizer?.chunk ?? undefined);
                    chunks.push(...maybeLayout.chunks.map((chunk) => {
                        return {
                            box: JSON.parse(JSON.stringify(chunk.box)),
                            name: chunk.name,
                            nodes: chunk.nodes.map((node) => node.element),
                            widths: JSON.parse(JSON.stringify(chunk.widths)),
                        };
                    }));
                }
                const layout = { pov, nodes, arrows, chunks };
                const highlights = [
                    [...(v1Visualizer?.color_highlights ?? [])],
                    [...(v1Visualizer?.ring_highlights ?? [])],
                    [...(v1Visualizer?.square_highlights ?? [])],
                ];
                const v2Visualizer = {
                    group_url: v1Visualizer.groupURL,
                    background: v1Visualizer.background,
                    fog_level: v1Visualizer.fog_level,
                    line_width: 4, // meaning has changed since v1, just using default
                    sphere_scale_factor: v1Visualizer.sphere_scale_factor,
                    zoom_level: v1Visualizer.zoom_level,
                    arrowhead_placement: v1Visualizer.arrowhead_placement,
                    label_scale_factor: v1Visualizer.label_scale_factor,
                    showing_axes: false,
                    // highlight_control:   // not implemented in v1
                    highlight_colors: highlights,
                    diagram_control: diagramControl,
                    layout: layout,
                };
                v2Object.visualizerJSON = v2Visualizer;
                break;
            }
            case 'CGElement': {
                const v1Visualizer = v1Object.visualizer;
                if (v1Visualizer == null) {
                    break;
                }
                const v2Visualizer = {
                    group_url: v1Visualizer.groupURL,
                    highlight_colors: formatHighlights([v1Visualizer?.highlights?.background, v1Visualizer?.highlights?.border, v1Visualizer?.highlights?.top], [null, null, null]),
                };
                v2Object.visualizerJSON = v2Visualizer;
                break;
            }
            case 'MTElement': {
                const v1Visualizer = v1Object.visualizer;
                if (v1Visualizer == null) {
                    break;
                }
                const v2Visualizer = {
                    group_url: v1Visualizer.groupURL,
                    highlight_colors: formatHighlights([v1Visualizer?.highlights?.background, v1Visualizer?.highlights?.border, v1Visualizer?.highlights?.corner], ['#E5E5E5', null, null]),
                    organizing_subgroup: v1Visualizer.organizingSubgroup,
                    separation: v1Visualizer.separation,
                    coloration: v1Visualizer.coloration,
                    color_reordering: v1Visualizer.colorReordering,
                    elements: v1Visualizer.elements
                };
                v2Object.visualizerJSON = v2Visualizer;
                break;
            }
            case 'ConnectingElement':
            case 'MorphismElement': {
                ;
                v2Object.source_id = v1Object.sourceId;
                v2Object.destination_id = v1Object.destinationId;
                break;
            }
        }
        // add NodeElement fields to Visualizers, TextElements
        switch (v1Object.className) {
            case 'CDElement':
            case 'CGElement':
            case 'MTElement':
            case 'TextElement': {
                ['x', 'y', 'w', 'h', 'z'].forEach((field) => {
                    if (field in v1Object && v1Object[field] != null) {
                        copyCompatibleField(v1Object, v2Object, field);
                    }
                });
            }
        }
        // add highlights, groupURL to VisualizerElements
        // finish TextElements, ConnectingElements, MorphismElement
        switch (v1Object.className) {
            case 'CDElement':
            case 'CGElement':
            case 'MTElement': {
                if (v1Object.groupURL != null) {
                    v2Object.visualizerJSON.group_url = v1Object.groupURL;
                }
                if ('visualizer' in v2Object && v2Object.visualizerJSON != null) {
                    const v2Visualizer = v2Object.visualizerJSON;
                    if (v2Visualizer != null && 'highlight_colors' in v2Visualizer && v2Visualizer.highlight_colors != null) {
                        v2Object.visualizerJSON.highlight_colors =
                            v2Visualizer.highlight_colors;
                    }
                }
            }
            case 'TextElement': {
                ['alignment', 'color', 'fontColor', 'fontSize', 'isPlainText', 'opacity', 'text']
                    .forEach((field) => {
                    copyCompatibleField(v1Object, v2Object, field);
                });
                break;
            }
            case 'ConnectingElement': {
                ['color', 'hasArrowhead', 'thickness'].forEach((field) => {
                    if (field in v1Object) {
                        copyCompatibleField(v1Object, v2Object, field);
                    }
                });
                break;
            }
            case 'MorphismElement': {
                ['arrowMargin', 'definingPairs', 'showDefiningPairs', 'showDomainAndCodomain', 'showInjectionSurjection',
                    'showManyArrows'].forEach((field) => {
                    if (field in v1Object) {
                        copyCompatibleField(v1Object, v2Object, field);
                    }
                });
                if (v1Object.name != null) {
                    v2Object.morphismName = v1Object.name;
                }
                break;
            }
        }
        return v2Object;
    });
    return v2Objects;
}
//# sourceMappingURL=SheetSerialization.js.map