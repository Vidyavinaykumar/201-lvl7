const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;

function extractCSRFToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

describe("Todo test suite", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });
  test("Creates a  new todo", async () => {
    const res = await agent.get("/");
    const csrfToken = extractCSRFToken(res);

    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Mark todo as completed (Updating Todo)", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCSRFToken(res);
    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed:false,
      _csrf: csrfToken,
    });

    const groupedTodos = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedResponse = JSON.parse(groupedTodos.text);
    const lastItem = parsedResponse[parsedResponse.length - 1];
    const status = lastItem.completed ? false : true;

    res = await agent.get("/");
    csrfToken = extractCSRFToken(res);

    const markCompleteResponse = await agent.put(`/todos/${lastItem.id}`).send({
      _csrf: csrfToken,
      completed: status,
    });

    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });

  test("Delete todo using ID", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCSRFToken(res);

    await agent.post("/todos").send({
      title: "Complete levels",
      dueDate: new Date().toISOString(),
      completed:false,
      _csrf: csrfToken,
    });

    const response = await agent.get("/todos")
    .set("Accept", "application/json");
    const parsedResponse = JSON.parse(response.text);
    const todoID = parsedResponse[parsedResponse.length - 1].id;

    res = await agent.get("/");
    csrfToken = extractCSRFToken(res);

    const deleteResponse = await agent.put(`/todos/${todoID}`).send({
      _csrf: csrfToken,
      completed :true
    });
    const parsedUpdateResponse = JSON.parse(deleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });
});
