const express = require('express');
const cors = require('cors');
const ObjectId = require('mongodb').ObjectId;
const SSLCommerzPayment = require('sslcommerz');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); // data ke parse kore
app.use(express.urlencoded({ extended: true })) // using for url encoded

const { MongoClient } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bsutc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {
    const database = client.db("CreativeAgency");
    const serviceCollection = database.collection("services");
    const projectCollection = database.collection("projects");
    const reviewCollection = database.collection("reviews");
    const usersCollection = database.collection("users");
    const ordersCollection = database.collection("orders");
    console.log('connected successfully');

    // add service data to database
    app.post('/addServices', async (req, res) => {
        const doc = req.body;
        const result = await serviceCollection.insertOne(doc);
        res.send(result);
    })
    // get services from database
    app.get('/services', async (req, res) => {
        const cursor = serviceCollection.find({});
        const result = (await cursor.toArray()).slice(0, 3);
        res.send(result);
    })
    // get all the services from database
    app.get('/allServices', async (req, res) => {
        const cursor = serviceCollection.find({});
        const result = await cursor.toArray();
        res.send(result);
    })
    // add review data to database
    app.post('/addReview', async (req, res) => {
        const doc = req.body;
        console.log(doc);
        const result = await reviewCollection.insertOne(doc);
        res.send(result);
    })
    // get review data from database
    app.get('/reviews', async (req, res) => {
        const cursor = reviewCollection.find({});
        const result = await cursor.toArray();
        res.send(result);
    })
    //sslcommerz init
    app.post('/init', async (req, res) => {
        console.log(req.body);
        const data = {
            total_amount: req.body.totalAmount,
            currency: 'USD',
            tran_id: uuidv4(),
            success_url: 'https://shrouded-hamlet-53510.herokuapp.com/success',
            fail_url: 'https://shrouded-hamlet-53510.herokuapp.com/fail',
            cancel_url: 'https://shrouded-hamlet-53510.herokuapp.com/cancel',
            ipn_url: 'https://shrouded-hamlet-53510.herokuapp.com/ipn',
            shipping_method: 'Courier',
            payment_status: 'Pending',
            product_name: req.body.serviceName,
            product_image: req.body.serviceImage,
            product_profile: req.body.serviceProfile,
            product_category: 'Design',
            cus_name: req.body.cusName,
            cus_email: req.body.cusEmail,
            cus_add1: 'Dhaka',
            cus_add2: 'Dhaka',
            cus_city: 'Dhaka',
            cus_state: 'Dhaka',
            cus_postcode: '1000',
            cus_country: 'Bangladesh',
            cus_phone: '01711111111',
            cus_fax: '01711111111',
            ship_name: 'Customer Name',
            ship_add1: 'Dhaka',
            ship_add2: 'Dhaka',
            ship_city: 'Dhaka',
            ship_state: 'Dhaka',
            ship_postcode: 1000,
            ship_country: 'Bangladesh',
            multi_card_name: 'mastercard',
            value_a: 'ref001_A',
            value_b: 'ref002_B',
            value_c: 'ref003_C',
            value_d: 'ref004_D'
        };
        // insert order data into database
        const order = await ordersCollection.insertOne(data);
        const sslcommer = new SSLCommerzPayment(process.env.STORE_ID, process.env.STORE_PASS, false) //true for live default false for sandbox
        sslcommer.init(data).then(data => {
            //process the response that got from sslcommerz
            //https://developer.sslcommerz.com/doc/v4/#returned-parameters
            if (data?.GatewayPageURL) {
                res.status(200).json(data.GatewayPageURL);
            }
            else {
                return res.status(400).json({
                    message: 'Payment session failed'
                })
            }
        });
    })
    app.post('/success', async (req, res) => {
        const info = req.body;
        const filter = { tran_id: info.tran_id };
        const updateDoc = { $set: { val_id: info.val_id } };
        const order = await ordersCollection.updateOne(filter, updateDoc);
        res.status(200).redirect(`https://creative-agency-20caa.web.app/dashboard/bookinglist/${info.tran_id}`);
    })
    app.post('/fail', async (req, res) => {
        const info = req.body;
        const query = { tran_id: info.tran_id };
        const order = await ordersCollection.deleteOne(query);
        res.status(400).redirect('https://creative-agency-20caa.web.app/failed');
    })
    app.post('/cancel', async (req, res) => {
        const info = req.body;
        const query = { tran_id: info.tran_id };
        const order = await ordersCollection.deleteOne(query);
        res.status(200).redirect('https://creative-agency-20caa.web.app/failed');
    })
    app.post('/ipn', async (req, res) => {
        const info = req.body;
        res.status(200).redirect('https://creative-agency-20caa.web.app/');
    })
    // get specific order info
    app.get('/orders/:tran_id', async (req, res) => {
        const id = req.params.tran_id;
        const query = { tran_id: id };
        const order = await ordersCollection.findOne(query);
        res.send(order);
    })
    // validation for ordering
    app.post('/validate', async (req, res) => {
        console.log(req.body);
        const id = req.body.tran_id;
        const query = { tran_id: id };
        const order = await ordersCollection.findOne(query);
        const filter = { tran_id: req.body.tran_id };
        const updateDoc = { $set: { payment_status: 'Done' } }
        if (order.val_id === req.body.val_id) {
            const update = await ordersCollection.updateOne(filter, updateDoc);
            res.send(update.modifiedCount > 0)
        }
        else {
            res.send('Payment not confirmed. Order Discarded')
        }
    });
    // specific order info for specific user
    app.post('/orderInfo', async (req, res) => {
        const id = req.body.email;
        const filter = { cus_email: id };
        const allOrder = await ordersCollection.find(filter).toArray();
        res.send(allOrder);
    })
    // all order info showing for admin
    app.get('/orderList', async (req, res) => {
        const orders = ordersCollection.find({});
        const result = await orders.toArray();
        res.send(result);
    })
    // delete orders
    app.delete('/orderList/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await ordersCollection.deleteOne(query);
        console.log(result);
        res.send(result);
    })

    // add new users (by registration) to database
    app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.send(result);
    })
    // add users (by google login) to database
    app.put('/users', async (req, res) => {
        const user = req.body;
        const filter = { email: user.email };
        const options = { upsert: true };
        const updateDoc = { $set: user };
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.send(result);
    })
    // make admin 
    app.put('/users/admin', async (req, res) => {
        const email = req.body.admin;
        const requester = req.body.user;
        if (requester) {
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = { $set: { role: 'admin' } };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
        }
        else { res.status(403).send({ message: 'Access Denied' }) }
    })
    // get admin from database
    app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        console.log('admin:', email);
        const query = { email: email };
        console.log('adminemail:', query);
        const user = await usersCollection.findOne(query);
        let isAdmin = false;
        if (user?.role === 'admin') {
            isAdmin = true;
        }
        console.log({ admin: isAdmin });
        res.send({ admin: isAdmin });
    })
});

app.get('/', (req, res) => {
    res.send('Hello Node JS!')
})

app.listen(port, () => {
    console.log('Running server at port:', port)
})