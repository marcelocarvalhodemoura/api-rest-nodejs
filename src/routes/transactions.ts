import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";
import * as crypto from "node:crypto";
import { z } from "zod";
import { db } from "../database";

export async function transactionsRoutes(app: FastifyInstance) {
    app.addHook('preHandler', async (request, response) => {})

    app.get("/", {
        preHandler: [checkSessionIdExists]

    },async (request: FastifyRequest, response: FastifyReply) => {
        const {sessionId } = request.cookies
        const transactions = await db("transactions")
            .where({ session_id: sessionId })
            .select("*")

        return {
            transactions
        }
    })

    app.get("/summary", {
        preHandler: [checkSessionIdExists]

    },async (request: FastifyRequest) => {
        const {sessionId } = request.cookies
        const summary = await db("transactions")
            .where({ session_id: sessionId })
            .sum("amount", { as : 'amount'}).first()

        return {
            summary: summary
        }
    })

    app.get("/:id", {
        preHandler: [checkSessionIdExists]

    },async (request:FastifyRequest, response: FastifyReply) => {
        const {sessionId } = request.cookies
        const getTransactionParamsSchema = z.object({
            id: z.string().uuid(),
        })

        const { id } = getTransactionParamsSchema.parse(request.params)

        const transaction = await db("transactions")
            .where({ id })
            .andWhere({ session_id: sessionId })
            .first()

        return {
            transaction
        }
    })

    app.post("/", async (request: FastifyRequest, response: FastifyReply) => {
        const createTransactionBodySchema = z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(["credit", "debit"]),
        })

        const { title, amount, type } = createTransactionBodySchema
            .parse(
                request.body
            )
        let sessionId = request.cookies.sessionId

        if(!sessionId) {
            sessionId = crypto.randomUUID()
            response.cookie("sessionId", sessionId, {
                path: '/',
                maxAge:  60 * 60 * 24 * 7, // 7 days
            })
        }

        await db("transactions")
            .insert({
                id: crypto.randomUUID(),
                title,
                amount: type === 'credit' ? amount : amount * -1,
                session_id: sessionId
            })

        return response.status(201).send()

    })
}