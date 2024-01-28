import { test } from "@playwright/test";
import { age_groups, download, waitUntilLoaded } from "./common.js";
import { existsSync } from "fs";

const dl = async (page, jurisdiction, period, ageGroups, file) => {
  await page.goto("https://wonder.cdc.gov/mcd-icd10-provisional.html");
  await page.getByRole("button", { name: "I Agree" }).click();

  if (jurisdiction === "usa-state") {
    await page.locator("#SB_2").selectOption("D176.V9-level1");
  }

  if (period == "month") {
    // group by: month
    await page.locator("#SB_1").selectOption("D176.V1-level2");
  } else {
    await page.click("#RO_datesMMWR");
    // group by: week
    await page.locator("#SB_1").selectOption("D176.V100-level2");
  }

  await waitUntilLoaded(page);

  if (ageGroups !== "all") {
    await page.locator("#RO_ageD176\\.V52").click(); // single ages
    await waitUntilLoaded(page);
    await page.locator("#SD176\\.V52").selectOption(ageGroups); // select ages
    await waitUntilLoaded(page);
  }

  await download(page, file);
};

for (const jurisdiction of ["usa", "usa-state"]) {
  for (const period of [
    "month",
    // , "week"
  ]) {
    for (let i = 0; i < age_groups.length; i++) {
      const ag = age_groups[i];
      const ag_str = Array.isArray(ag) ? `${ag.at(0)}-${ag.at(-1)}` : ag;
      const file = `./out/${jurisdiction}_${ag_str}_2018-n.txt`;
      // if (existsSync(file)) continue;
      const ags = ["all", "NS"].includes(ag)
        ? ag
        : [].concat(
            ...age_groups.slice(1, i),
            ...age_groups.slice(i + 1, age_groups.length - 1)
          );

      test(
        `Download CDC Wonder Data by: ${jurisdiction}/2018-n: ` +
          `Age Groups: ${Array.isArray(ag) ? ag.join(", ") : ag}`,
        async ({ page }) => {
          await dl(page, jurisdiction, period, ags, file);
          await page.close();
        }
      );
    }
  }
}
