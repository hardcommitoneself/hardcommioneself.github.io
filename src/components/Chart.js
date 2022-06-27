import * as React from "react";
import Highcharts from "highcharts";

require("highcharts/modules/data")(Highcharts);
require("highcharts/modules/exporting")(Highcharts);
require("highcharts/modules/export-data")(Highcharts);
require("highcharts/modules/accessibility")(Highcharts);

export default function Chart(props) {
  Highcharts.chart("container", {
    type: "stockChart",
  });

  return <div></div>;
}
