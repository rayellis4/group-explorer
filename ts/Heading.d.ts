type headingMenu = Array<{
    label: html;
    action: () => void;
}>;
export type HeadingManuGenerator = () => headingMenu;
export declare function display(headingElement: HTMLElement, label: html, menuGenerator: HeadingManuGenerator): void;
export declare function setTitle(title: html): void;
export {};
