import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";
import * as crypto from "node:crypto";
import { z } from "zod";
import { db } from "../database";

export async function transactionsRoutes(app: FastifyInstance) {
    app.addHook('preHandler', async (request, response) => {})

    /**
     * GET / - Fetch all transactions for a specific session
     * This endpoint retrieves all transactions associated with the session ID stored in the cookies.
     * It uses the `checkSessionIdExists` middleware to ensure the session ID exists before processing the request.
     *
     * @param {FastifyRequest} request - The request object from Fastify.
     * @returns {Object} An object containing an array of transactions.
     */
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

    /**
     * GET /summary - Fetch the summary of transactions for a specific session
     * This endpoint retrieves the sum of the amount of all transactions associated with the session ID stored in the cookies.
     * It uses the `checkSessionIdExists` middleware to ensure the session ID exists before processing the request.
     *
     * @param {FastifyRequest} request - The request object from Fastify.
     * @returns {Object} An object containing the summary of transactions.
     */
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

    /**
     * GET /:id - Fetch a specific transaction for a specific session
     * This endpoint retrieves a specific transaction associated with the session ID stored in the cookies and the transaction ID provided in the URL.
     * It uses the `checkSessionIdExists` middleware to ensure the session ID exists before processing the request.
     * It uses the `getTransactionParamsSchema` to validate the transaction ID in the URL.
     *
     * @param {FastifyRequest} request - The request object from Fastify.
     * @returns {Object} An object containing the specific transaction.
     */
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

    /**
     * POST / - Create a new transaction for a specific session
     * This endpoint creates a new transaction associated with the session ID stored in the cookies.
     * If the session ID does not exist, it creates a new one and stores it in the cookies.
     * It uses the `createTransactionBodySchema` to validate the transaction data in the request body.
     *
     * @param {FastifyRequest} request - The request object from Fastify.
     * @returns {FastifyReply} A response object from Fastify with a status of 201.
     */
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