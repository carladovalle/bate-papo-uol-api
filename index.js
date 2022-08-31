import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dontenv from "dotenv";

dontenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("meu_banco_de_dados");
});

app.get("/participants", async (req, res) => {
    try {
        const participants = await db.collection("users").find({}).toArray();
        res.send(participants);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.post("/participants", async (req, res) => {
    try {
        const promise = await db.collection("users").insertOne(req.body);
        res.sendStatus(201)
    } catch {
        console.log(error);
        res.sendStatus(422);
    }
});

app.post("/messages", async (req, res) => {
    try {
        const promise = await db.collection("messages").insertOne(req.body);
        const { user } = req.headers;
        res.sendStatus(201);
    } catch {
        console.log(error);
        res.sendStatus(422);
    }
})

app.get("/messages", async (req, res) => {
    try {
        const messages = await db.collection("messages").find({}).toArray();
        res.send(messages);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})

app.listen(5000, () => {
    console.log("Servidor rodando.");
});