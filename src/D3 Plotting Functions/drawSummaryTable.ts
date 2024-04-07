import { plotData } from "../Classes/viewModelClass";
import type { divBaseType, Visual } from "../visual";
import * as d3 from "./D3 Modules";
import updateHighlighting from "./updateHighlighting";

export default function drawSummaryTable(selection: divBaseType, visualObj: Visual) {
  selection.style("height", "100%").style("width", "100%");
  if (selection.select(".table-group").empty()) {
    const table = selection.append("table")
                            .classed("table-group", true)
                            .style("border-collapse", "collapse")
                            .style("border", "2px black solid")
                            .style("width", "100%")
                            .style("height", "100%");

    table.append("thead").append("tr").classed("table-header", true);
    table.append('tbody').classed("table-body", true);
  }

  const plotPoints: plotData[] = visualObj.viewModel.plotPoints;

  selection.select(".table-header")
            .selectAll("th")
            .data(Object.keys(plotPoints[0].table_row))
            .join("th")
            .text((d) => d)
            .style("border", "1px black solid")
            .style("padding", "5px")
            .style("background-color", "lightgray")
            .style("font-weight", "bold")
            .style("text-transform", "uppercase");

  selection.select(".table-body")
            .selectAll('tr')
            .data(plotPoints)
            .join('tr')
            .on("click", (event, d: plotData) => {
              if (visualObj.host.hostCapabilities.allowInteractions) {
                visualObj.selectionManager
                          .select(d.identity, event.ctrlKey || event.metaKey)
                          .then(() => {
                            visualObj.svg.call(updateHighlighting, visualObj);
                          });
                event.stopPropagation();
              }
            })
            .selectAll('td')
            .data((d) => Object.values(d.table_row))
            .join('td')
            .text((d) => {
              return typeof d === "number" ? d.toFixed(visualObj.viewModel.inputSettings.settings.spc.sig_figs) : d;
            })
            .on("mouseover", (event) => {
              d3.select(event.target).style("background-color", "lightgray");
            })
            .on("mouseout", (event) => {
              d3.select(event.target).style("background-color", "white");
            })
            .style("border", "1px black solid")
            .style("padding", "5px")
            .style("font-size", "12px")

  selection.on('click', () => {
    visualObj.selectionManager.clear();
    visualObj.svg.call(updateHighlighting, visualObj);
  });

  visualObj.svg.call(updateHighlighting, visualObj);
}
