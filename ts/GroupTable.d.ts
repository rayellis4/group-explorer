export { IMAGE_SIZE, COLUMNS, display };
declare const IMAGE_SIZE = 96;
declare const COLUMNS: ({
    id: string;
    label: string;
    headerHTML: string;
    defaultVisible: boolean;
    sortComparator: (v1: any, v2: any) => any;
    cellHTML: (group: any) => string;
    headerClass?: undefined;
} | {
    id: string;
    label: string;
    headerHTML: string;
    defaultVisible: boolean;
    sortComparator: null;
    cellHTML: (group: any) => string;
    headerClass?: undefined;
} | {
    id: string;
    label: string;
    headerHTML: string;
    headerClass: string;
    defaultVisible: boolean;
    sortComparator: null;
    cellHTML: (group: any, { cayleyTitle }: {
        cayleyTitle: any;
    }) => string;
})[];
declare function display(tableElement: any, groupsToDisplay: any): void;
