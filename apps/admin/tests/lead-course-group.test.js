const test = require("node:test");
const assert = require("node:assert/strict");
const load = () => import("../src/features/admin/lead-course-group.mjs");

test("the course filter has exactly three groups", async () => {
  const { leadCourseGroups } = await load();
  assert.deepEqual(leadCourseGroups, ["1º de Bachillerato", "2º de Bachillerato", "Otros"]);
});

test("groups Spanish, IB and A-Level first years", async () => {
  const { leadCourseGroup, leadCourseGroups } = await load();
  for (const course of ["1º de Bachillerato", "Primero de Bachillerato", "1 Bach", "1", "IB Year 1", "DP1", "AS Level", "Year 12", "A-Levels 1st year", "Y12 / Grade 11 (US)", "Grade 11", "11th Grade", "11.º ano", "11°Ano"]) {
    assert.equal(leadCourseGroup(course), leadCourseGroups[0], course);
  }
});

test("groups Spanish, IB and A-Level second years", async () => {
  const { leadCourseGroup, leadCourseGroups } = await load();
  for (const course of ["2º de Bachillerato", "Segundo Bachillerato", "2 Bach", "2", "IB Year 2", "DP2", "A2 Level", "Year 13", "A-Levels 2nd year", "Y13 / Grade 12 (US)", "Grade 12", "12th Grade", "12.º ano", "12°Ano"]) {
    assert.equal(leadCourseGroup(course), leadCourseGroups[1], course);
  }
});

test("unidentified and conflicting courses are other", async () => {
  const { leadCourseGroup } = await load();
  for (const course of ["", "A-Levels", "IB", "ESO", "Universidad", "2027-28", "1.º o 2.º de Bachillerato", "11", "12", "Yeah 12", "Year 14", "Last year of highschool", "Y12 / Grade 12 (US)"]) {
    assert.equal(leadCourseGroup(course), "Otros", course);
  }
});
