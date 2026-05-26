<!DOCTYPE html>
<html>
   <head>
      <title>Cycle Graph Visualizer</title>

      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      <meta charset="utf-8" />
      <meta name="GE3-GITVersion" content="3.7rc20" />

      <link rel="icon" href="./images/GE3-favicon.ico" />
      <link rel="preload" href="./fonts/GroupExplorer_AMS.woff" as="font" crossorigin />
      <link rel="preload" href="./fonts/MathJax_SansSerif-Regular.woff" as="font" crossorigin />
      <link rel="preload" href="./fonts/MathJax_SansSerif-Bold.woff" as="font" crossorigin />
      <link rel="preload" href="./fonts/MathJax_SansSerif-Italic.woff" as="font" crossorigin />
      <link rel="stylesheet" href="./style/ge3.css" type="text/css" />

      <script type="module">
       import * as AutoUpgrade from './js/AutoUpgrade.js'
       await AutoUpgrade.initialize()

       import ('./js/CycleGraph.js')
          .then((CycleGraph) => CycleGraph.load())
      </script>
   </head>
   <body>
   </body>
</html>
