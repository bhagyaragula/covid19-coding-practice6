const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();

const dbPath = path.join(__dirname, "covid19India.db");

app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http:localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertStateDBObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDBObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT 
     * 
    FROM
     state;`;
  const stateArray = await db.all(getStatesQuery);
  response.send(
    stateArray.map((eachState) =>
      convertStateDBObjectToResponseObject(eachState)
    )
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT 
     stateName 
    FROM 
     state
    WHERE 
     state_id: ${stateId};`;
  const states = await db.get(getStateQuery);
  response.send(convertStateDBObjectToResponseObject(states));
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT 
     *  
    FROM 
     district 
    WHERE 
      district_id = ${districtId};`;

  const district = await db.get(getDistrictQuery);
  response.send(convertDistrictDBObjectToResponseObject(district));
});

app.post("/districts/", async (request, response) => {
  const { stateId, districtName, cases, cured, active, deaths } = request.body;
  const postDistrictQuery = `
    INSERT INTO
     district ( stateId, districtName, cases, cured, active, deaths )
    VALUES 
     (${stateId}, '${districtName}', ${cases}, ${cured}, ${active}, ${deaths});`;

  await db.run(postDistrictQuery);
  response.send("District Successfully Added");
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM 
     district
    WHERE 
      district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `
     UPDATE
      district 
    SET 
      district_name = '${districtName}',
      state_id = ${stateId},
      cases = ${cases},
      cured = ${cured},
      active = ${active},
      deaths = ${deaths}
    WHERE 
      district_id = ${districtId};`;

  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatesStatsQuery = `
    SELECT 
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM 
      district 
    WHERE 
      state_id = ${stateId};`;
  const stats = await db.get(getStatesStatsQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
     SELECT 
       state_name 
     FROM 
       district 
     NATURAL JOIN 
       state 
     WHERE 
       district_id = ${districtId};`;

  const state = await db.get(getStateNameQuery);
  response.send({ stateName: state.state_name });
});

module.exports = app;
