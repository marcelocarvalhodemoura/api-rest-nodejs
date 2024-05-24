import {it, beforeAll, afterAll, describe, expect, beforeEach} from 'vitest';
import { execSync } from 'node:child_process'
import request from 'supertest';
import { app } from '../src/app';

describe('Transaction Routes Test', () => {

    beforeAll(async () => {
        //include the application in memory
        await app.ready()
    })

    afterAll(async () => {
        //Remove application from memory
        await app.close()
    })

    beforeEach(async () => {
        // Terminal Command
        // Rollback Migration
        execSync('npm run knex migrate:rollback --all')
        // Load Migration
        execSync('npm run knex migrate:latest')
    })

    it('should be able to create a new transaction', async () => {
        //Make a request to the server testing the creation of a new transaction
        await request(app.server)
            .post('/transactions')
            .send({
                title: 'Salário',
                amount: 5000,
                type: 'credit'
            })
            .expect(201)
    })

    //List all transactions
    it('should be able to list all transactions', async () => {
        //Make a request to the server testing the listing of all transactions
        const createTransationResponse = await request(app.server)
            .post('/transactions')
            .send({
                title: 'New Transaction',
                amount: 5000,
                type: 'credit'
            })

        const cookie = createTransationResponse.headers['set-cookie']

        const listTransactionsResponse = await request(app.server)
            .get('/transactions')
            .set('Cookie', cookie)
            .expect(200)

        expect(listTransactionsResponse.body.transactions).toEqual([
            expect.objectContaining({
                title: 'New Transaction',
                amount: 5000,
            }),
        ])
    })

    //List especific transaction
    it('should be able to list a specific transaction', async () => {

        //Make a request to the server testing the listing of all transactions
        const createTransationResponse = await request(app.server)
            .post('/transactions')
            .send({
                title: 'New Transaction',
                amount: 5000,
                type: 'credit'
            })

        const cookie = createTransationResponse.headers['set-cookie']

        const listTransactionsResponse = await request(app.server)
            .get('/transactions')
            .set('Cookie', cookie)
            .expect(200)

        const transactionId = listTransactionsResponse.body.transactions[0].id

        const getTransactionResponse = await request(app.server)
            .get(`/transactions/${transactionId}`)
            .set('Cookie', cookie)
            .expect(200)

        expect(getTransactionResponse.body.transaction).toEqual(
            expect.objectContaining({
                title: 'New Transaction',
                amount: 5000,
            }),
        )

    })

    it('should be able to get the summary', async () => {
        //Make a request to the server testing the listing of all transactions
        const createTransationResponse = await request(app.server)
            .post('/transactions')
            .send({
                title: 'Credit Transaction',
                amount: 5000,
                type: 'credit'
            })

        const cookie = createTransationResponse.headers['set-cookie']

        await request(app.server)
            .post('/transactions')
            .set('Cookie', cookie)
            .send({
                title: 'Debit Transaction',
                amount: 2000,
                type: 'debit'
            })

        const summaryResponse = await request(app.server)
            .get('/transactions/summary')
            .set('Cookie', cookie)
            .expect(200)

        expect(summaryResponse.body.summary).toEqual(
            expect.objectContaining({
                amount: 3000,
            }),
        )
    })
})

