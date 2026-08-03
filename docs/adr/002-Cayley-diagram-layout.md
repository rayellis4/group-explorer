# ADR 002: Cayley diagram layout --

**Status:** Accepted
**Data:** 2026-08-02

## Context

The overall layout of a Cayley diagram, described by the camera's point of view, the nodes, arrows, and chunks of the diagram, has not been recorded in a well-recognized location. There is a layout field in the [CayleyDiagramModel](../CayleyDiagramModel.ts.md), but it becomes stale almost as soon as it is used. The camera's point of view can be modified by zooming/panning/rotating the view using [THREE.TrackballControls](https://threejs.org/docs/?q=trackball#TrackballControls); and the locations/shapes of the nodes/arows/chunks can be modified by user drag-and-drop interactions. These changes are not then reflected in the model's 'layout' value for perceived performance reasons, and at best they can be recovered from internal variables in [CayleyDiagramView](../CayleyDiagramView.ts.md) display logic with difficulty. This has made it difficult to transmit, store, recover, and migrate a Cayley diagram accurately and reliably.

## Decision

Rewrite relevant portions of CayleyDiagramViewUI and CayleyDiagramView to accumulate their updates and apply them on the 'drop' event of the drag-and-drop operations; and investigate whether this can change the way updates are published when acting as a sheet editor, looking to eliminate the current polling approach.

## Consequences

Rewrite portions of [`CayleyDiagramViewUI`](../CayleyDiagramViewUI.ts.md) and [`CayleyDiagramView`](../CayleyDiagramView.ts.md), and possibly the way the [`CayleyDiagram`](../CayleyDiagram.ts.md) page works as a [`SheetEditor`](../SheetEditor.ts.md).

## Alternatives Considered

Another possibility would be to feed changes from the drag-and-drop operations directly into the model layout field and let the `CayleyDiagramView's` subscription to the field inform it. The pub-sub mechanism in the model was not designed for low latency response, however, and there is no call to serialize the model during those interactions.
