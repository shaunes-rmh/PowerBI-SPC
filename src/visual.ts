"use strict";

import type powerbi from "powerbi-visuals-api";
type EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
type VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
type VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
type ISelectionId = powerbi.visuals.ISelectionId;
import * as d3 from "./D3 Plotting Functions/D3 Modules";
import { drawXAxis, drawYAxis, drawTooltipLine, drawLines,
          drawDots, drawIcons, addContextMenu,
          drawErrors, initialiseSVG, drawSummaryTable, drawDownloadButton } from "./D3 Plotting Functions"
import { defaultSettingsKey, viewModelClass, type plotData } from "./Classes"
import { validateDataView } from "./Functions";

export type svgBaseType = d3.Selection<SVGSVGElement, unknown, null, undefined>;
export type divBaseType = d3.Selection<HTMLDivElement, unknown, null, undefined>;

export class Visual implements powerbi.extensibility.IVisual {
  host: powerbi.extensibility.visual.IVisualHost;
  tableDiv: divBaseType;
  svg: svgBaseType;
  viewModel: viewModelClass;
  selectionManager: powerbi.extensibility.ISelectionManager;

  constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
    this.tableDiv = d3.select(options.element).append("div")
                                              .style("overflow", "auto");

    this.svg = d3.select(options.element).append("svg");
    this.host = options.host;
    this.viewModel = new viewModelClass();

    this.selectionManager = this.host.createSelectionManager();
    this.selectionManager.registerOnSelectCallback(() => {
      this.updateHighlighting();
    });

    this.svg.call(initialiseSVG);
  }

  public update(options: VisualUpdateOptions): void {
    const idx_per_indicator = new Array<number[]>();
    const indicator_names = new Array<string>();
    const indicator_idx = options.dataViews[0].categorical.categories?.findIndex(d => d.source.roles.indicator);

    if (indicator_idx === -1) {
      idx_per_indicator.push(options.dataViews[0].categorical.categories[0].values.map((_, i) => i));
    } else {
      const indicator_vals = options.dataViews[0].categorical.categories?.[indicator_idx]?.values;
      for (let i = 0; i < indicator_vals.length; i++) {
        const indicator_name = indicator_vals[i].toString();
        if (indicator_names.includes(indicator_name)) {
          idx_per_indicator[indicator_names.indexOf(indicator_name)].push(i);
        } else {
          indicator_names.push(indicator_name);
          idx_per_indicator.push([i]);
        }
      }
    }
    try {
      this.host.eventService.renderingStarted(options);
      // Remove printed error if refreshing after a previous error run
      this.svg.select(".errormessage").remove();

      this.viewModel.inputSettings.update(options.dataViews[0], idx_per_indicator);
      if (this.viewModel.inputSettings.validationStatus.error !== "") {
        this.processVisualError(options,
                                this.viewModel.inputSettings.validationStatus.error,
                                "settings");
        return;
      }

      const checkDV: string = validateDataView(options.dataViews,
                                               this.viewModel.inputSettings);
      if (checkDV !== "valid") {
        this.processVisualError(options, checkDV);
        return;
      }

      this.viewModel.update(options, this.host, idx_per_indicator, indicator_names);
      if (this.viewModel.showGrouped) {
        if (this.viewModel.inputDataGrouped.map(d => d.validationStatus.status).some(d => d !== 0)) {
          this.processVisualError(options,
                                  this.viewModel.inputDataGrouped.map(d => d.validationStatus.error).join("\n"));
          return;
        }

        this.svg.attr("width", 0).attr("height", 0);
        this.tableDiv.call(drawSummaryTable, this);

        if (this.viewModel.inputDataGrouped.some(d => d.warningMessage !== "")) {
          this.host.displayWarningIcon("Invalid inputs or settings ignored.\n",
                                       this.viewModel.inputDataGrouped.map(d => d.warningMessage).join("\n"));
        }
      } else {
      if (this.viewModel.inputData.validationStatus.status !== 0) {
        this.processVisualError(options, this.viewModel.inputData.validationStatus.error);
        return;
      }

      if (this.viewModel.inputSettings.settings.summary_table.show_table) {
        this.svg.attr("width", 0).attr("height", 0);
        this.tableDiv.call(drawSummaryTable, this)
                      .call(addContextMenu, this);
      } else {
        this.tableDiv.style("width", "0%").style("height", "0%");
        this.svg.attr("width", options.viewport.width)
                .attr("height", options.viewport.height)
                .call(drawXAxis, this)
                .call(drawYAxis, this)
                .call(drawTooltipLine, this)
                .call(drawLines, this)
                .call(drawDots, this)
                .call(drawIcons, this)
                .call(addContextMenu, this)
                .call(drawDownloadButton, this)
      }

      if (this.viewModel.inputData.warningMessage !== "") {
        this.host.displayWarningIcon("Invalid inputs or settings ignored.\n",
                                     this.viewModel.inputData.warningMessage);
      }
    }
      this.updateHighlighting();
      this.host.eventService.renderingFinished(options);
    } catch (caught_error) {
      this.tableDiv.style("width", "0%").style("height", "0%");
      this.svg.attr("width", options.viewport.width)
              .attr("height", options.viewport.height)
              .call(drawErrors, options, caught_error.message, "internal");
      console.error(caught_error)
      this.host.eventService.renderingFailed(options);
    }
  }

  processVisualError(options: VisualUpdateOptions, message: string, type: string = null): void {
    this.tableDiv.style("width", "0%").style("height", "0%");
    this.svg.attr("width", options.viewport.width)
            .attr("height", options.viewport.height)
    if (this.viewModel.inputSettings.settings.canvas.show_errors) {
      this.svg.call(drawErrors, options, message, type);
    } else {
      this.svg.call(initialiseSVG, true);
    }
    this.host.eventService.renderingFinished(options);
  }

  updateHighlighting(): void {
    const anyHighlights: boolean = this.viewModel.inputData ? this.viewModel.inputData.anyHighlights : false;
    const anyHighlightsGrouped: boolean = this.viewModel.inputDataGrouped ? this.viewModel.inputDataGrouped.some(d => d.anyHighlights) : false;
    const allSelectionIDs: ISelectionId[] = this.selectionManager.getSelectionIds() as ISelectionId[];
    const opacityFull: number = this.viewModel.inputSettings.settings.scatter.opacity;
    const opacityReduced: number = this.viewModel.inputSettings.settings.scatter.opacity_unselected;

    const defaultOpacity: number = (anyHighlights || (allSelectionIDs.length > 0))
                                      ? opacityReduced
                                      : opacityFull;
    this.svg.selectAll(".linesgroup").style("stroke-opacity", defaultOpacity);

    const dotsSelection = this.svg.selectAll(".dotsgroup").selectChildren();
    const tableSelection = this.tableDiv.selectAll(".table-body").selectChildren();

    dotsSelection.style("fill-opacity", defaultOpacity);
    tableSelection.style("opacity", defaultOpacity);
    if (anyHighlights || (allSelectionIDs.length > 0) || anyHighlightsGrouped) {
      dotsSelection.nodes().forEach(currentDotNode => {
        const dot: plotData = d3.select(currentDotNode).datum() as plotData;
        const currentPointSelected: boolean = allSelectionIDs.some((currentSelectionId: ISelectionId) => {
          return currentSelectionId.includes(dot.identity);
        });
        const currentPointHighlighted: boolean = dot.highlighted;
        const newDotOpacity: number = (currentPointSelected || currentPointHighlighted) ? dot.aesthetics.opacity : dot.aesthetics.opacity_unselected;
        d3.select(currentDotNode).style("fill-opacity", newDotOpacity);
      })

      tableSelection.nodes().forEach(currentTableNode => {
        const dot: plotData = d3.select(currentTableNode).datum() as plotData;
        const currentPointSelected: boolean = allSelectionIDs.some((currentSelectionId: ISelectionId) => {
          return currentSelectionId.includes(dot.identity);
        });
        const currentPointHighlighted: boolean = dot.highlighted;
        const newTableOpacity: number = (currentPointSelected || currentPointHighlighted) ? dot.aesthetics["table_opacity"] : dot.aesthetics["table_opacity_unselected"];
        d3.select(currentTableNode).style("opacity", newTableOpacity);
      })
    }
  }

  // Function to render the properties specified in capabilities.json to the properties pane
  public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumerationObject {
    return this.viewModel.inputSettings.createSettingsEntry(options.objectName as defaultSettingsKey);
  }
}
