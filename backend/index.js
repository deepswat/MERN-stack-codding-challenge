const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const cors = require("cors");

const port =  3001;
const app = express();
app.use(cors());
const dbPath = path.join(__dirname, "salesDatabase.db");
let db;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    process.exit(1);
    console.log(`Server is occuring in server starting ${error.message}`);
  }
};

initializeDBAndServer();

app.get("/sales", async (request, response) => {
  try {
    const { month = 1, search_q = "", page = 1 } = request.query;
    console.log(request.query);

    const query = `
        SELECT * FROM salesData
        WHERE CAST(strftime('%m', dateOfSale) AS INTEGER) = ${month} AND
        (title LIKE "%${search_q}%" OR price LIKE "%${search_q}%" OR description LIKE "%${search_q}%")
        LIMIT 10
        OFFSET ${(page - 1) * 10}
    `;

    const res = await db.all(query);
    response.send(res);
  } catch (error) {
    response.status(400).json(error.message);
  }
});

app.get("/statistics", async (request, response) => {
  try {
    const { month = 1 } = request.query;
    const query = `
        SELECT SUM(
            CASE 
                WHEN sold=True THEN price 
            END 
        ) AS sales ,
        COUNT(
            CASE 
                WHEN sold=True THEN price 
            END 
        ) AS soldItems,
        COUNT(
            CASE 
                WHEN sold<>True THEN price 
            END 
        ) AS unSoldItems
        FROM salesData WHERE CAST(strftime('%m', dateOfSale) AS INT)=${month} ;
    `;
    const dbResponse = await db.get(query);
    response.send(dbResponse);
  } catch (error) {
    response.status(400).json(error.message);
  }
});

app.get("/items", async (request, response) => {
  try {
    const { month } = request.query;
    const query = `
            SELECT 
                COUNT(CASE WHEN (price >= 0 AND price <= 100) THEN 1 END) AS '0-100',
                COUNT(CASE WHEN (price >= 101 AND price <= 200) THEN 1 END) AS '101-200',
                COUNT(CASE WHEN (price >= 201 AND price <= 300) THEN 1 END) AS '201-300',
                COUNT(CASE WHEN (price >= 301 AND price <= 400) THEN 1 END) AS '301-400',
                COUNT(CASE WHEN (price >= 401 AND price <= 500) THEN 1 END) AS '401-500',
                COUNT(CASE WHEN (price >= 501 AND price <= 600) THEN 1 END) AS '501-600',
                COUNT(CASE WHEN (price >= 601 AND price <= 700) THEN 1 END) AS '601-700',
                COUNT(CASE WHEN (price >= 701 AND price <= 800) THEN 1 END) AS '701-800',
                COUNT(CASE WHEN (price >= 801 AND price <= 900) THEN 1 END) AS '801-900',
                COUNT(CASE WHEN (price >= 901) THEN 1 END) AS '901-above'
            FROM salesData
            WHERE CAST(strftime('%m', dateOfSale) AS INT)=${month} ;
        `;
    const dbResponse = await db.get(query);
    response.status(200).json(dbResponse);
  } catch (error) {
    response.status(400).json(error.message);
  }
});

app.get("/categories", async (request, response) => {
  try {
    const { month = 1 } = request.query;
    const query = `
            SELECT 
                category, COUNT(category) AS items
            FROM salesData
            WHERE CAST(strftime('%m', dateOfSale) AS INT)=${month} 
            GROUP BY category;
        `;
    const dbResponse = await db.all(query);
    response.status(200).json(dbResponse);
  } catch (error) {
    response.status(400).json(error.message);
  }
});

const monthsData = {
  1: "January",
  2: "Febrary",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

app.get("/all-statistics", async (request, response) => {
  try {
    const { month = 3 } = request.query;

    const api1Response = await fetch(
      `https://backendof.onrender.com/statistics?month=${month}`
    );
    const api1Data = await api1Response.json();

    const api2Response = await fetch(
      `https://backendof.onrender.com/items?month=${month}`
    );
    const api2Data = await api2Response.json();

    const api3Response = await fetch(
      `https://backendof.onrender.com/categories?month=${month}`
    );
    const api3Data = await api3Response.json();

    response.status(200).json({
      monthName: monthsData[month],
      statistics: api1Data,
      itemPriceRange: api2Data,
      categories: api3Data,
    });
  } catch (error) {
    response.status(400).json(error.message);
  }
});
