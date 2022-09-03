import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dontenv from "dotenv";
import joi from "joi";
import dayjs from 'dayjs';

dontenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("meu_banco_de_dados");
});

const participantsSchema = joi.object({
    name: joi.string().required(),
});

const messagesSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message").valid("private_message").required(),
})

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

    const validation = participantsSchema.validate(req.body, { abortEarly:  false });

    if (validation.error) {
        res.sendStatus(422);
        return;
    }

    try {
        const body = req.body;
        const participants = {
            name: body.name,
            lastStatus: Date.now()
        }
        const message = {
            from: body.name, 
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time: dayjs().format('HH:mm:ss')
        } 
        await db.collection("users").insertOne(participants);
        await db.collection("messages").insertOne(message);
        res.sendStatus(201)
    } catch (error) {
        console.log(error);
        res.sendStatus(422);
    }
});

app.post("/messages", async (req, res) => {

    const validation = messagesSchema.validate(req.body, { abortEarly: false });

    if (validation.error) {
        res.sendStatus(422);
        return;
    }

    try {
        const { user: from } = req.headers;
        const body = req.body;
        const message = {
            from: from,
            to: body.to, 
            text: body.text, 
            type: body.type, 
            time: dayjs().format('HH:mm:ss')
        } 
        await db.collection("messages").insertOne(message);
        res.sendStatus(201);
    } catch (error) {
        console.log(error);
        res.sendStatus(422);
    }
})

app.get("/messages", async (req, res) => {

    const limit = parseInt(req.query.limit);

    try {
        const { user: from } = req.headers;
        const messages = await db.collection("messages").find({
            from: from
        }).toArray();
        res.send(messages.slice(-limit));
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})

app.listen(5000, () => {
    console.log("Servidor rodando.");
});