process.env.NODE_ENV = "test";

const request = require("supertest");
const db = require("./db");
const app = require("./app");

let testCompany; 

beforeEach(async function() {
  let result = await db.query(
    `INSERT INTO
      companies (code, name, description) 
      VALUES ('testC', 'Test Company', 'Test Description')
      RETURNING code, name, description`
  );

  testCompany = result.rows[0];
});

afterEach(async function () {
  await db.query("DELETE FROM companies");
});

afterAll(async function() {
  await db.end();
})

describe("POST /companies", function() {
  test("Creates a new company", async function(){
    const response = await request(app)
    .post("/companies")
    .send({
      name:"Fake Amazon",
      description: "Fake Amazon Description"
    })
    expect(response.statusCode).toEqual(400);
    expect(response.body.error.message).toEqual("Incomplete input(s).");
  });
})
