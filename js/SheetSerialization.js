// @flow
import { layoutCayleyDiagram } from './CayleyDiagramGenerator.js';
import * as Library from './Library.js';
import * as Log from './Log.js';
import * as MathML from './MathML.js';
import { THREE } from '../lib/externals.js';
import * as SheetView from './SheetView.js';
export { serializeSheet, deserializeSheet };
/*::
import type SheetModel from './SheetModel.js'

type ExportedSheet = {  // Does it make sense to add other metadata to ExportedSheet?
   version: number,
   sheet: SheetModelJSON
 */
const CURRENT_FORMAT = 2;
// do we import/export JSON string or JSON text?
// StoredObjects doesn't need/use string and it's the main client, so just used object
// given SheetModel object, return JSON with version, sheet
function serializeSheet(sheet /*: SheetModel */) {
    return {
        version: CURRENT_FORMAT,
        sheet: sheet
    };
}
// given object for v0, v1, or v2 sheet, return SheetModel object
function deserializeSheet(json /*: string | Obj */) {
    let sheet;
    if (json?.version != null) {
        sheet = convertSheetFromVersion(json.sheet, json.version);
    }
    else if (typeof json == 'string') { // can be text input or v1 stored sheet
        json = JSON.parse(json);
        if ('version' in json) {
            sheet = convertSheetFromVersion(json.sheet, json.version);
        }
        else { // must be v1 string, json export wasn't available when v0 was being used
            sheet = convertSheetFromVersion(json, 1);
        }
    }
    else {
        const jsonString = (json instanceof Object) ? JSON.stringify(json) : json;
        const errorMessage = `SheetSerialization.deserializeSheet: unrecognized object encountered: ${jsonString}`;
        Log.err(errorMessage);
        throw new TypeError(errorMessage);
    }
    return sheet;
}
function convertSheetFromVersion(json /*: Obj */, version /*: number */) {
    switch (version) {
        case 0: json = convertV0ToV1(json);
        case 1: json = convertV1ToV2(json);
    }
    return json;
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
// given JSON for v1 sheet, return JSON for v2 sheet
export function convertV1ToV2(jsonObjects /*: mixed */) {
    for (const jsonObject of jsonObjects) {
        // on v1 morphisms: migrate {source, destination}Id to {source, destination}_name
        if (jsonObject.className == 'MorphismElement' || jsonObject.className == 'ConnectingElement') {
            jsonObject.source_name = jsonObject.sourceId;
            jsonObject.destination_name = jsonObject.destinationId;
        }
        // migrate 'id' from v1 to 'name' on v2
        if (jsonObject.name == null) { // set 'name' to old 'id' if no other name specified
            jsonObject.name = jsonObject.id;
        }
        delete jsonObject.sourceId;
        delete jsonObject.destinationId;
        delete jsonObject.id;
    }
    const upgradeCandidates = jsonObjects
        .filter((jsonObject) => jsonObject.visualizer != null && !('highlight_colors' in jsonObject.visualizer));
    if (upgradeCandidates.length == 0) {
        return jsonObjects;
    }
    const cleanColorList = (colorList /*: Array<?color> */, nullish /*: ?color */ = null) => {
        const result /*: Array<?color> */ = (colorList == null) ? [] : colorList.map((color) => (color == nullish) ? null : color);
        return result;
    };
    for (const jsonObject of upgradeCandidates) {
        const visualizer = jsonObject.visualizer;
        let newHighlights /*: Array<Array<?color>> */ = [];
        switch (jsonObject.className) {
            case 'CDElement': {
                if (visualizer.diagram_name == null && visualizer.strategy_parameters == null) {
                    Log.err('unrecognizable json in StoredObjects.migrateSheetToV2');
                    break;
                }
                visualizer.line_width = null; // material has changed meaning of 'line width', just use default
                newHighlights.push(cleanColorList(visualizer?.color_highlights, '#8c8c8c'), // CayleyDiagramView.DEFAULT_NODE_COLOR
                cleanColorList(visualizer?.ring_highlights, null), cleanColorList(visualizer?.square_highlights, null));
                const group = Library.getGroupByURL(visualizer.groupURL);
                if (jsonObject.isClean) {
                    // layout was generated and hasn't been edited yet
                    // we'll recompute the entire layout
                    const layout = layoutCayleyDiagram(group, visualizer?.diagram_name);
                    visualizer.view_state = layout;
                }
                else {
                    // convert camera: extract position from column-major matrix[12,13,14], use cameraUp for up
                    const matrix = visualizer.cameraJSON?.object?.matrix;
                    const position = matrix
                        ? { x: matrix[12], y: matrix[13], z: matrix[14] }
                        : { x: 0, y: 0, z: 3 };
                    const up = visualizer.cameraUp ?? { x: 0, y: 1, z: 0 };
                    // convert nodes: add color field
                    const nodes = (visualizer.nodes ?? []).map((node) => ({ ...node, color: null }));
                    const nodeMap = new Map(nodes.map((node) => [node.element, node]));
                    // convert arrows: start_element/end_element → start_node/end_node
                    const arrows = (visualizer.arrows ?? []).map(({ start_element, end_element, ...rest }) => ({
                        ...rest,
                        start_node: nodeMap.get(start_element) ?? { element: start_element },
                        end_node: nodeMap.get(end_element) ?? { element: end_element }
                    }));
                    if (visualizer.diagram_name == null) {
                        // layout was generated from strategy_parameters but has been edited; the chunks
                        // aren't recorded in V1, so we'll recompute the entire layout to get the chunks
                        const layout = layoutCayleyDiagram(group, visualizer.strategy_parameters, (visualizer.arrows ?? [])
                            .filter((arrow) => arrow.start_element == 0)
                            .map((arrow) => ({ generator: arrow.generator, color: arrow.color })), visualizer.right_multiply, (visualizer.chunk == null || visualizer.chunk === 0) ? null : visualizer.chunk);
                        const chunks = layout.chunks?.map((chunk) => {
                            return {
                                box: chunk.box,
                                name: chunk.name,
                                nodes: chunk.nodes.map((node) => nodeMap.get(node.element)),
                                widths: chunk.widths
                            };
                        }) ?? [];
                        visualizer.view_state = { pov: { position, up }, nodes, arrows, chunks };
                    }
                    else {
                        // layout was generated from a diagram and has been edited
                        // it can't be chunked since it was created from a diagram, so we can use the layout as is
                        visualizer.view_state = { pov: { position, up }, nodes, arrows, chunks: [] };
                    }
                }
                // consolidate diagram layout fields into diagram_control
                // chunk: 0 in V1 UI meant 'no chunking' (same visual as trivial subgroup)
                visualizer.diagram_control = {
                    diagram_name: visualizer.diagram_name ?? null,
                    strategy_parameters: visualizer.strategy_parameters ?? [],
                    chunk_subgroup_index: (visualizer.chunk == null || visualizer.chunk === 0)
                        ? null : visualizer.chunk
                };
                // rename groupURL → group_url; drop fields not in new model
                visualizer.group_url = visualizer.groupURL;
                // delete fields not in new model
                delete jsonObject._visualizer; // delete _visualizer (legacy)
                delete jsonObject.isClean; // runtime flag, not persistent state
                delete visualizer.color_highlights;
                delete visualizer.ring_highlights;
                delete visualizer.square_highlights;
                delete visualizer.cameraJSON;
                delete visualizer.cameraUp;
                delete visualizer.nodes;
                delete visualizer.arrows;
                delete visualizer.diagram_name;
                delete visualizer.strategy_parameters;
                delete visualizer.chunk;
                delete visualizer.groupURL;
                delete visualizer.right_multiply;
                delete visualizer.sphere_base_radius;
                break;
            }
            case 'CGElement':
                newHighlights.push(cleanColorList(visualizer?.highlights?.background, null), cleanColorList(visualizer?.highlights?.border, null), cleanColorList(visualizer?.highlights?.top, null));
                delete visualizer.highlights;
                visualizer.group_url = visualizer.groupURL;
                delete visualizer.groupURL;
                break;
            case 'MTElement':
                newHighlights.push(cleanColorList(visualizer?.highlights?.background, '#E5E5E5'), // MulttableView.DEFAULT_BACKGROUND
                cleanColorList(visualizer?.highlights?.border, null), cleanColorList(visualizer?.highlights?.corner, null));
                delete visualizer.highlights;
                visualizer.group_url = visualizer.groupURL;
                delete visualizer.groupURL;
                break;
        }
        visualizer.highlight_colors = newHighlights;
    }
    return jsonObjects;
}
//# sourceMappingURL=SheetSerialization.js.map