import { Group } from './Group.js';
export type XMLCayleyDiagram = {
    name: html;
    arrows: Array<groupElement>;
    points: Array<Array<float>>;
};
type Path = {
    color: Maybe<color>;
    points: Array<Array<float>>;
};
type Sphere = {
    radius: float;
    color: Maybe<color>;
    point: Array<float>;
};
type Operation = {
    element: groupElement;
    degrees: float;
    point: Array<float>;
};
export type XMLSymmetryObject = {
    name: html;
    operations: Array<Operation>;
    spheres: Array<Sphere>;
    paths: Array<Path>;
};
export declare function fromGroupFileXML(text: string): Group;
export {};
