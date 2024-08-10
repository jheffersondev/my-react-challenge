import _ from "lodash";
const cheerio = await require("cheerio");

const COLOR_MAP: Record<number, string> = {
    0: "#ebedf0",
    1: "#9be9a8",
    2: "#40c463",
    3: "#30a14e",
    4: "#216e39",
};

interface Contribution {
    date: string;
    count: number;
    color: string;
    intensity: number;
}

interface YearData {
    year: string;
    total: number;
    range: {
        start: string;
        end: string;
    };
    contributions: Contribution[] | Record<string, any>;
}

async function fetchYears(
    username: string
): Promise<{ href: string; text: string }[]> {
    const response = await fetch(
        `https://github.com/${username}?tab=contributions`,
        {
            headers: {
                "x-requested-with": "XMLHttpRequest",
            },
        }
    );
    const body = await response.text();
    const $ = cheerio.load(body);

    return $(".js-year-link")
        .get()
        .map((a: any) => {
            const $a = $(a);
            const href = $a.attr("href");
            const githubUrl = new URL(`https://github.com${href}`);
            githubUrl.searchParams.set("tab", "contributions");
            const formattedHref = `${githubUrl.pathname}${githubUrl.search}`;

            return {
                href: formattedHref,
                text: $a.text().trim(),
            };
        });
}

async function fetchDataForYear(
    url: string,
    year: string,
    format: "nested" | "flat"
): Promise<YearData> {
    const response = await fetch(`https://github.com${url}`, {
        headers: {
            "x-requested-with": "XMLHttpRequest",
        },
    });
    const $ = cheerio.load(await response.text());
    const $days = $(
        "table.ContributionCalendar-grid td.ContributionCalendar-day"
    );

    const contribText = $(".js-yearly-contributions h2")
        .text()
        .trim()
        .match(/^([0-9,]+)\s/);

    let contribCount: number = 0;
    if (contribText && contribText[1]) {
        contribCount = parseInt(contribText[1].replace(/,/g, ""), 10);
    }

    const parseDay = (
        day: any,
        index: number
    ): { date: string[]; value: Contribution } => {
        const $day = $(day);
        const date = $day
            .attr("data-date")!
            .split("-")
            .map((d: string) => parseInt(d, 10));
        const color = COLOR_MAP[parseInt($day.attr("data-level")!)];
        const value: Contribution = {
            date: $day.attr("data-date")!,
            count: index === 0 ? contribCount : 0,
            color,
            intensity: parseInt($day.attr("data-level")!) || 0,
        };
        return { date, value };
    };

    const contributions =
        format !== "nested"
            ? $days
                  .get()
                  .map((day: any, index: number) => parseDay(day, index).value)
            : $days
                  .get()
                  .reduce((o: Record<string, any>, day: any, index: number) => {
                      const { date, value } = parseDay(day, index);
                      const [y, m, d] = date;
                      if (!o[y]) o[y] = {};
                      if (!o[y][m]) o[y][m] = {};
                      o[y][m][d] = value;
                      return o;
                  }, {});

    return {
        year,
        total: contribCount,
        range: {
            start: $($days.get(0)).attr("data-date")!,
            end: $($days.get($days.length - 1)).attr("data-date")!,
        },
        contributions,
    };
}

export async function fetchLastYearData(
    username: string,
    format: "nested" | "flat" = "flat"
) {
    const years = await fetchYears(username);
    const lastYear = years[0];

    if (!lastYear) {
        throw new Error("No contribution data found for the user.");
    }

    const yearData = await fetchDataForYear(
        lastYear.href,
        lastYear.text,
        format
    );

    return {
        years: [yearData],
        total: yearData.total,
        contributions:
            format === "nested"
                ? yearData.contributions
                : yearData.contributions.sort(
                      (a: Contribution, b: Contribution) => {
                          return (
                              new Date(b.date).getTime() -
                              new Date(a.date).getTime()
                          );
                      }
                  ),
    };
}
