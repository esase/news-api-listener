import { MongoClient } from 'mongodb';
import config from './config';
import { connect } from 'amqplib';

const app = async () => {
    const mongoClient = new MongoClient(config.mongoHost);
    const newsLogsCollection = mongoClient.db().collection('news-logs');

    const rabbitMqConnection = await connect(config.rabbitMqHost);
    const rabbitMq = await rabbitMqConnection.createChannel();

    const queue = 'news_api_listener';
    const exchange = 'amq.topic';
    const exchangeType = 'topic';
    const routingKey = 'news-api.news.*';

    await rabbitMq.assertExchange(exchange, exchangeType);
    await rabbitMq.assertQueue(queue);
    await rabbitMq.bindQueue(queue, exchange, routingKey);

    rabbitMq.consume(queue, async (data) => {
        console.log(data?.fields.routingKey);
        if (data) {
            const parsedData = data.content.toString();

            // log action
            await newsLogsCollection.insertOne({
                action: data?.fields.routingKey,
                data: parsedData
            });

            console.log('Received', parsedData);
            rabbitMq.ack(data);
        }
    });
};

app();