import { plotData, type plotDataGrouped } from "../Classes/viewModelClass";
import type { divBaseType, Visual } from "../visual";
import initialiseIconSVG from "./initialiseIconSVG";
import * as nhsIcons from "./NHS Icons"
import * as d3 from "./D3 Modules";

export default function drawSummaryTable(selection: divBaseType, visualObj: Visual) {
  selection.style("height", "100%").style("width", "100%");
  selection.selectAll(".iconrow").remove();
  selection.selectAll(".cell-text").remove();

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

  let plotPoints: plotData[] | plotDataGrouped[];
  let cols: { name: string; label: string; }[];

  if (visualObj.viewModel.showGrouped){
    plotPoints = visualObj.viewModel.plotPointsGrouped;
    cols = visualObj.viewModel.tableColumnsGrouped;
  } else {
    plotPoints = visualObj.viewModel.plotPoints;
    cols = visualObj.viewModel.tableColumns;
  }

  let maxWidth: number = visualObj.viewModel.svgWidth / cols.length;

  selection.select(".table-header")
            .selectAll("th")
            .data(cols)
            .join("th")
            .text((d) => d.label)
            .style("border", "1px black solid")
            .style("padding", "5px")
            .style("background-color", "lightgray")
            .style("font-weight", "bold")
            .style("text-transform", "uppercase")
            .style("overflow", "hidden")
            .style("text-overflow", "ellipsis")
            .style("max-width", `${maxWidth}px`);

  const tableSelect = selection.select(".table-body")
            .selectAll('tr')
            .data(<plotData[]>plotPoints)
            .join('tr')
            /*
            .on("click", (event, d: plotData) => {
              if (visualObj.host.hostCapabilities.allowInteractions) {
                visualObj.selectionManager
                          .select(d.identity, event.ctrlKey || event.metaKey)
                          .then(() => {
                            visualObj.updateHighlighting();
                          });
                event.stopPropagation();
              }
            })
              */
            .selectAll('td')
            .data((d) => cols.map(col => {
              return {column: col.name, value: d.table_row[col.name]}
            }))
            .join('td')
            .on("mouseover", (event) => {
              d3.select(event.target).select(function(){
                return this.closest("td");
              }).style("background-color", "lightgray");
            })
            .on("mouseout", (event) => {
              d3.select(event.target).select(function(){
                return this.closest("td");
              }).style("background-color", "white");
            })
            .style("border", "1px black solid")
            .style("padding", "5px")
            .style("font-size", "12px")
            .style("overflow", "hidden")
            .style("text-overflow", "ellipsis")
            .style("max-width", `${maxWidth}px`);

  const nhsIconSettings = visualObj.viewModel.inputSettings.settings.nhs_icons;
  const draw_icons: boolean = nhsIconSettings.show_variation_icons || nhsIconSettings.show_assurance_icons;
  const thisSelDims = (tableSelect.node() as SVGGElement).getBoundingClientRect()
  const scaling = visualObj.viewModel.inputSettings.settings.nhs_icons.variation_icons_scaling

  const icon_x: number = (thisSelDims.width * 0.8) / 0.08 / 2 - 189;
  const icon_y: number = (thisSelDims.height * 0.8) / 0.08 / 2 - 189;

  tableSelect.each(function(d) {
    if (draw_icons && (d.column === "variation" || d.column === "assurance")) {
      d3.select(this)
          .append("svg")
          .attr("width", thisSelDims.width * 0.8)
          .attr("height", thisSelDims.height * 0.8)
          .classed("rowsvg", true)
          .call(initialiseIconSVG, d.value)
          .selectAll(".icongroup")
          .attr("viewBox", "0 0 378 378")
          .selectAll(`.${d.value}`)
          .attr("transform", `scale(${0.08 * scaling}) translate(${icon_x}, ${icon_y})`)
          .call(nhsIcons[d.value]);
    } else {
      let value: string = typeof d.value === "number"
        ? d.value.toFixed(visualObj.viewModel.inputSettings.settings.spc.sig_figs)
        : d.value;

      d3.select(this).text(value).classed("cell-text", true);
    }
  })

  selection.on('click', () => {
    visualObj.selectionManager.clear();
    visualObj.updateHighlighting();
  });
}
