import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
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
});

/*setInterval(async () => {
    try {
        const participants = await db.collection("users").find({}).toArray();
        const lastStatusNow = Date.now();
        for (const participant of participants) {
            if (participant.lastStatus < lastStatusNow - 10000) {
                await db.collection("users").deleteOne({lastStatus: participant.lastStatus});
                await db.collection("messages").insertOne({
                    from: participant.name,
                    to: 'Todos', 
                    text: 'sai da sala...', 
                    type: 'status', 
                    time: dayjs().format('HH:mm:ss')
                });
            }
        }
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }

}, 15000); */

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

    const validation = participantsSchema.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const e = validation.error.details.map(errors => errors.message);
        res.status(422).send(e);
        return;
    }

    try {
        const {name, lastStatus} = req.body;
        const participant = await db.collection("users").findOne({name});
        if (participant) {
            return res.status(409).send("Usuário já existe.")
        }
        await db.collection("users").insertOne({
            name,
            lastStatus: Date.now()
        });
        await db.collection("messages").insertOne({
            from: name, 
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time: dayjs().format('HH:mm:ss')
        });
        res.sendStatus(201)
    } catch (error) {
        console.log(error);
        res.sendStatus(422);
    }
});

app.post("/messages", async (req, res) => {

    const validation = messagesSchema.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const e = validation.error.details.map(errors => errors.message);
        res.status(422).send(e);
        return;
    }

    try {
        const { user: from } = req.headers;
        const body = req.body;
        await db.collection("messages").insertOne({
            from: from,
            to: body.to, 
            text: body.text, 
            type: body.type, 
            time: dayjs().format('HH:mm:ss')
        } );
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

app.post("/status", async (req, res) => {
    const { user } = req.headers;
    try {
        const participant = await db.collection("users").findOne({name: user});
        if (!participant) {
            return res.send(404);
        }
        await db.collection("users").updateOne({name: user}, {$set: {lastStatus: Date.now()}});
        res.sendStatus(200);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.delete("/messages/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const m = await db.collection("messages").find({ _id: new ObjectId(id) }).toArray();
        if (!m) {
            return res.sendStatus(404);
        }
        await db.collection("messages").deleteOne({ _id: new ObjectId(id) });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.put("/messages/:id", async (req, res) => {
    const { id } = req.params;

    const validation = messagesSchema.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const e = validation.error.details.map(errors => errors.message);
        res.status(422).send(e);
        return;
    }

    try {
        const { user: from } = req.headers;
        const body = req.body;
        const m = await db.collection("messages").find({ _id: new ObjectId(id) }).toArray();
        if (!m) {
            return res.sendStatus(404);
        }
        await db.collection("messages").updateOne({
            _id: new ObjectId(id)
        }, { $set: req.body } );
    } catch (error) {
        console.log(error);
        res.sendStatus(422);
    }
})

app.listen(5000, () => {
    console.log("Servidor rodando.");
});