import express from "express";
import cors from "cors";
import morgan from "morgan";

import * as middleware from "./utils/middleware.js";
import helloRoute from "./routes/helloRouter.js";
import schedule from 'node-schedule';
import syncPurchasePrices from './utils/syncPurchasePrices.js';

schedule.scheduleJob('*/1 * * * *', function(){
  /*syncPurchasePrices().catch(err => {
    console.error("syncPurchasePrices", err.toString());
  })*/
});

setTimeout(() => {
  syncPurchasePrices()
}, 1000)
const app = express();

// parse json request body
app.use(express.json());

// enable cors
app.use(cors());

// request logger middleware
app.use(morgan("tiny"));

// healthcheck endpoint
app.get("/", (req, res) => {
  res.status(200).send({ status: "ok" });
});

app.use("/hello", helloRoute);

// custom middleware
app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

export default app;
