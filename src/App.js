import * as React from "react";
import * as Mui from "@mui/material";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import axios from "axios";
import randomColor from "randomcolor";

const API_KEY = "5b76a0aef20ac58263f0827068b37e59";

const ranges = [
  {
    type: 1,
    days: 7,
    label: "1w",
  },
  {
    type: 2,
    days: 31,
    label: "1m",
  },
  {
    type: 3,
    days: 95,
    label: "3m",
  },
  {
    type: 4,
    days: 183,
    label: "6m",
  },
  {
    type: 5,
    days: 365,
    label: "1y",
  },
  {
    type: 6,
    label: "all",
  },
];

function App() {
  const [options, setOptions] = React.useState({
    chart: {
      type: "spline",
    },
    title: {
      text: "Min Tan Index Chart",
    },
    xAxis: {
      type: "date",
      labels: {
        formatter: function () {
          return Highcharts.dateFormat("%b", this.value);
        },
      },
      plotLines: [],
    },
    yAxis: {
      title: {
        text: "%",
      },
    },
    tooltip: {
      split: true,
      formatter: function () {
        return [
          "<br>" + Highcharts.dateFormat("%b/%d/%Y", this.x) + "</br>",
        ].concat(
          this.points
            ? this.points.map(
                (point) => point.series.name + " <b>" + point.y + "%</b>"
              )
            : []
        );
      },
    },
    series: [],
  });
  const [rangeType, setRangeType] = React.useState(6);
  const [currentSymbols, setCurrentSymbols] = React.useState([]);
  const [indexes, setIndexes] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const getIndexInfo = React.useCallback(async (symbols, rangeType) => {
    setLoading(true);
    let multiSeries = [];
    try {
      for (let i = 0; i < symbols.length; i++) {
        let series = { data: [], name: symbols[i], color: randomColor() };
        const result = await axios.get(
          `https://financialmodelingprep.com/api/v3/historical-price-full/${symbols[i]}?apikey=5b76a0aef20ac58263f0827068b37e59`
        );
        // index info
        let indexInfo = result.data.historical;
        // end date
        const endDate = indexInfo[0].date;
        // start date
        if (rangeType !== 6) {
          const startDateTimestamp =
            new Date(endDate).getTime() -
            ranges[rangeType - 1].days * 24 * 60 * 60 * 1000;
          indexInfo = indexInfo.filter(
            (historical) =>
              new Date(historical.date).getTime() >= startDateTimestamp
          );
        }
        // sort
        indexInfo.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
        // first close value - day1
        const firstDayClose = indexInfo[0].close;
        // create series
        indexInfo.map((historical) => {
          series.data.push([
            new Date(historical.date).getTime(),
            Number.parseFloat(
              (
                ((historical.close - firstDayClose) / firstDayClose) *
                100
              ).toFixed(3)
            ),
          ]);
        });
        multiSeries.push(series);
      }
      // calc SD
      const plotLines = [];
      let SD = 0;
      if (multiSeries.length > 1) {
        const differencePercent = [];
        const differenceDate = [];
        let maxSeriesIndex =
          multiSeries[0].data.length >= multiSeries[1].data.length ? 0 : 1;

        const first = multiSeries[maxSeriesIndex].data;
        const second = multiSeries[maxSeriesIndex === 0 ? 1 : 0].data;

        for (let i = 1; i < first.length; i++) {
          let found = second.find((ele) => ele[0] === first[i][0]);
          if (found) {
            differencePercent.push(Math.abs(found[1] - first[i][1]));
            differenceDate.push(found[0]);
          }
        }
        // SD
        const n = differencePercent.length;
        const mean = differencePercent.reduce((a, b) => a + b) / n;
        SD = Math.sqrt(
          differencePercent
            .map((x) => Math.pow(x - mean, 2))
            .reduce((a, b) => a + b) / n
        );
        for (let i = 0; i < n; i++) {
          if (differencePercent[i] >= 2 * SD) {
            plotLines.push({
              value: differenceDate[i],
              color: "#FF0000",
              dashStyle: "dash",
              width: 1,
            });
          }
        }
      }

      setOptions({
        ...options,
        title: {
          text: `Min Tan Index Chart <b>${
            SD === 0 ? "" : "SD: " + SD.toFixed(3)
          }</b>`,
        },
        series: multiSeries,
        xAxis: {
          type: "date",
          labels: {
            formatter: function () {
              return Highcharts.dateFormat("%b/%d/%y", this.value);
            },
          },
          plotLines: plotLines,
        },
      });
      setLoading(false);
    } catch (error) {
      throw error;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      axios
        .get(
          `https://financialmodelingprep.com/api/v3/quotes/index?apikey=${API_KEY}`
        )
        .then((indexes) => {
          setIndexes(indexes.data);
          setCurrentSymbols([indexes.data[0].symbol]);
          getIndexInfo([indexes.data[0].symbol], rangeType);
        });
    };
  }, []);

  const handleTagChange = React.useCallback(
    (e, tags) => {
      let symbols = [];
      tags.map((tag) => symbols.push(tag.symbol));
      setCurrentSymbols(symbols);
      getIndexInfo(symbols, rangeType);
    },
    [getIndexInfo, rangeType]
  );

  const handleRangeClick = React.useCallback(
    (type) => {
      setRangeType(type);
      getIndexInfo(currentSymbols, type);
    },
    [currentSymbols, getIndexInfo]
  );

  return (
    <Mui.Container maxWidth="md" sx={{ padding: 10 }}>
      {indexes.length && (
        <Mui.Stack spacing={5}>
          <Mui.Autocomplete
            multiple
            id="tags-outlined"
            options={indexes}
            isOptionEqualToValue={(option, value) =>
              option.symbol === value.symbol
            }
            getOptionLabel={(option) => option.symbol}
            defaultValue={[indexes[0]]}
            filterSelectedOptions
            renderInput={(params) => (
              <Mui.TextField
                {...params}
                label="Indexes"
                placeholder="Select Index"
              />
            )}
            onChange={handleTagChange}
          />
          {Object.keys(currentSymbols).length === 0 || loading === true ? (
            <div>Loading...</div>
          ) : (
            <div>
              <Mui.Stack direction="row" spacing={1}>
                {currentSymbols.map((symbol, index) => (
                  <Mui.Chip key={index} label={symbol} />
                ))}
              </Mui.Stack>
              <HighchartsReact highcharts={Highcharts} options={options} />
            </div>
          )}

          <Mui.Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            {ranges.map((range, index) => (
              <Mui.Button
                key={index}
                variant={range.type === rangeType ? "contained" : "outlined"}
                onClick={() => handleRangeClick(range.type)}
              >
                {range.label}
              </Mui.Button>
            ))}
          </Mui.Stack>
        </Mui.Stack>
      )}
    </Mui.Container>
  );
}

export default App;
