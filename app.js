const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running on http://localhost:3000");
    });
  } catch (e) {
    console.log(`Database Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const responseStateObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const responseDistrictObject = (dbObject) => {
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

//GET list of all States

app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `
    SELECT 
    *
    FROM state
    `;
  const statesArray = await database.all(getAllStatesQuery);
  response.send(statesArray.map((eachState) => responseStateObject(eachState)));
});

//Get a specific state based on id

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT * FROM state WHERE state_id = ${stateId};
    `;
  const state = await database.get(getStateQuery);
  response.send(responseStateObject(state));
});

//Add a district

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const addDistrictQuery = `
    INSERT INTO district (district_name,state_id,cases,cured,active,deaths) 
    VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths});
    `;
  await database.run(addDistrictQuery);

  response.send("District Successfully Added");
});

//Get a specific district

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT * FROM district WHERE district_id = ${districtId};
    `;
  const district = await database.get(getDistrictQuery);
  response.send(responseDistrictObject(district));
});

// Delete the district

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM district WHERE district_id = ${districtId};
    `;
  const district = await database.run(deleteDistrictQuery);
  response.send("District Removed");
});

//Update the district

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
    district_id = ${districtId};
  `;

  await database.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//Getting total cases of the state

app.get("/states/:stateId/stats", async (request, response) => {
  const { stateId } = request.params;
  const getTotalCasesQuery = `
    SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM district 
    WHERE state_id = ${stateId};
    `;
  const stats = await database.get(getTotalCasesQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

//Getting a StateName

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
    SELECT 
    state_name
    FROM state JOIN district ON state.state_id = district.state_id
    WHERE district_id = ${districtId};
    `;
  const stateName = await database.get(getStateNameQuery);
  response.send(responseStateObject(stateName));
});

module.exports = app;
