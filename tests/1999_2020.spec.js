import { test } from "@playwright/test";
import { age_groups, download, waitUntilLoaded } from "./common.js";

const dl = async (page, jurisdiction, ageGroups, file) => {
  await page.goto("https://wonder.cdc.gov/mcd-icd10.html");
  await page.getByRole("button", { name: "I Agree" }).click();

  if (jurisdiction === "usa-state") {
    await page.locator("#SB_2").selectOption("D77.V9-level1"); // group by: state
  }
  await page.locator("#SB_1").selectOption("D77.V1-level2"); // group by: month

  await waitUntilLoaded(page);

  if (ageGroups !== "all") {
    await page.locator("#RO_ageD77\\.V52").click(); // single ages
    await waitUntilLoaded(page);
    await page.locator("#SD77\\.V52").selectOption(ageGroups); // select ages
    await waitUntilLoaded(page);
  }

  await download(page, file);
};

for (const jurisdiction of ["usa", "usa-state"]) {
  for (let i = 0; i < age_groups.length; i++) {
    const ag = age_groups[i];
    const ag_str = Array.isArray(ag) ? `${ag.at(0)}-${ag.at(-1)}` : ag;
    const file = `./out/${jurisdiction}_${ag_str}_1999_2020.txt`;
    const ags = ["all", "NS"].includes(ag)
      ? ag
      : [].concat(
          ...age_groups.slice(1, i),
          ...age_groups.slice(i + 1, age_groups.length - 1)
        );

    test(
      `Download CDC Wonder Data by: ${jurisdiction}/1999-2020: ` +
        `Age Groups: ${Array.isArray(ag) ? ag.join(", ") : ag}`,
      async ({ page }) => {
        await dl(page, jurisdiction, ags, file);
        await page.close();
      }
    );
  }
}
