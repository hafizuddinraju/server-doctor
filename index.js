const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
const jwt = require('jsonwebtoken');
app.use(cors())
app.use(express.json())
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const verifytoken = (req, res, next)=>{
    const authHeader = req.headers.authorization;
        if(!authHeader){
            return res.status(401).send({
                message: 'unauthorized access',
            })
        }
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded){
            if(err){
                return res.status(403).send({
                    message: 'Forbidden access',
                })
  
            }
            req.decoded = decoded;
            next();
        })
  
  }
  const verifyAdmin = async (req, res, next) =>{
    const decodedEmail = req.decoded.email;
    const query = { email: decodedEmail };
    const user = await allUsers.findOne(query);

    if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'forbidden access' })
    }
    next();
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express')
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_KEY}@cluster0.cvtbcrw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function dbConnect(){
    try{
        await client.connect()
        console.log("Database Connected");

    }
    catch(error){
       console.log(error)
    }
}
dbConnect();

const allService = client.db('doctor-portal').collection('services');
const allbooking = client.db('doctor-portal').collection('booking')
const allUsers = client.db('doctor-portal').collection('users');
const alldoctor = client.db('doctor-portal').collection('doctors');
const allpayment = client.db('doctor-portal').collection('payment');

app.post('/services', async(req, res)=>{
    try{
        const result = await allService.insertOne(req.body);
        if(result){
            res.send({
                success:true,
                message:'Successfully Added'
            })
        }

    }
    catch(error){
        res.send({
            success : false,
            error: error.message
        })
    }
})
app.get('/services',async(req,res)=>{
    try{
        const date = req.query.date;
        
        const cursor = allService.find({});
        const services = await cursor.toArray();
        const bookingQuery = {appointmentDate: date}
        const alreadyBooked = await allbooking.find(bookingQuery).toArray();

        services.forEach(service =>{
            const serviceBooked = alreadyBooked.filter(book => book.treatment === service.name);
            const bookesSlots = serviceBooked.map(book => book.slot);
            const remainingSlots = service.slots.filter(slot => !bookesSlots.includes(slot))
            service.slots = remainingSlots;
        })
        res.send({
            success:true,
            message:'Successfully Got Data',
            data:services
        })

    }
    catch(error){
        res.send({
            success:false,
            error:error.message
        })
    }
})
app.post('/booking',async(req, res)=>{
    try{
        const booking = req.body;
        // console.log(booking);
        const query ={
            appointmentDate: booking.appointmentDate,
                email: booking.email,
                treatment: booking.treatment 
        }
        const alreadyBooked = await allbooking.find(query).toArray()
        if (alreadyBooked.length){
            const message = `You already have a booking on ${booking.appointmentDate}`
            return res.send({acknowledged: false, message})
        }
        const result = await allbooking.insertOne(booking)
        if(result){
            res.send({
                success:true,
                message:'Booking Successfull',
                data: result
            })
        }
    }
     
    catch(error){
        res.send({
            success:false,
            error:error.message

        })
        
    }
})
app.get('/booking',async(req,res)=>{
    try{
        const email = req.query.email;
        const cursor = allbooking.find({email:email})
        const booking = await cursor.toArray();

        if(booking){
            res.send({
                success:true,
                message:'Got Data Successfully',
                data: booking
            })
        }

    }
    catch(error){
        res.send({
            success:false,
            error:error.message
        })
    }
})
app.get('/bookings/:id', async (req, res) => {
    try{
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const booking = await allbooking.findOne(query);

        res.send({
            success:true,
            data:booking
        });

    }
    catch(error){
        res.send({
            success:false,
            error:error.message
        })
    }
   
})
app.get('/appointmentSpecialty', async (req, res) => {
    try{
        const query = {}
    const result = await allService.find(query).project({ name: 1 }).toArray();
    res.send({
        success:true,
        message:'Find All',
        data:result
    });

    }
    catch(error){
        res.send({
            success:false,
            error:error.message
        })
    }
    
})
app.put('/users', async(req, res)=>{
    try{
        const {email,name} = req.body;
        console.log(email,name)
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
            $set: {
                name:name,
                email:email
            }
        }
        const result = await allUsers.updateOne(filter, updateDoc, options);
        if(result){
            res.send({
                success:true,
                message:'User Active Successfull'
            })
        }
        
        


    }
    catch(error){
        res.send({
            success:false,
            error:error.message
        })
    }
})
app.get('/jwt', async(req,res)=>{
    try{
        const email = req.query.email;
        const query = {email:email};
        const user = await allUsers.findOne(query)
        if(user){
            const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1d'})
        res.send({
            success:true,
            accessToken:token
        })

        }
        else{

            res.status(403).json({accessToken: ''})
        }
        

    }
    catch(error){
        res.send({
            success:false,
            error:error.message
        })
    }
})
app.get('/users',async(req, res)=>{
    try{
        const cursor = allUsers.find({});
        const users = await cursor.toArray();
        if(users){
            res.send({
                success:true,
                message:'Show All Users',
                data:users
            })
        }

    }
    catch(error){
        res.send({
            success:false,
            error:error.message
        })
    }
})
app.put('/users/admin/:id', verifytoken, async(req, res)=>{
    try{
        const decodedEmail = req.decoded.email;
        const quary = {email: decodedEmail};
        const user = await allUsers.findOne(quary);

        if(user?.role !== 'admin'){
            return res.status(403).send({message: 'forbidden access'})
        }
        const id = req.params.id;
        const filter = {_id:ObjectId(id)}
        const options = {upsert: true};
        const updateDoc = {
            $set:{
                role:'admin'
            }
        }
        const result = await allUsers.updateOne(filter,updateDoc,options)
        if(result){
            res.send({
                success:true,
                message:'Make Admin Successfull',
                data:result
            })
        }

    }
    catch(error){
        res.send({
            success:false,
            error:error.message
        })
    }
})
app.get('/users/admin/:email', async (req, res) =>{
    try{
        const email = req.params.email;
        const query = { email }
        const user = await allUsers.findOne(query);
        res.send({ isAdmin: user?.role === 'admin' });

    }
    catch(error){
        res.send({
            success:false,
            error:error.message
        })
    }
})
app.post('/doctors', verifytoken,verifyAdmin, async (req, res) => {
    const doctor = req.body;
    const result = await alldoctor.insertOne(doctor);
    res.send(result);
});
app.get('/doctors', verifytoken,verifyAdmin, async (req, res) => {
    try{
    const query = {};
    const doctors = await alldoctor.find(query).toArray();
    res.send({
        success:true,
        data:doctors
    });

    }
    catch(error){
        res.send({
            success:false,
            error:error.message
        })
    }
    
})
app.delete('/doctors/:id', verifytoken,verifyAdmin, async (req, res) => {
    try{
        const id = req.params.id;
    const filter = { _id: ObjectId(id) };
    const result = await alldoctor.deleteOne(filter);
    if(result){
        res.send({
            success:true,
            data:result
        })
    }
    

    }
    catch(error){
        res.send({
            success:false,
            error:error.message
        })
    }
    
})
app.post('/create-payment-intent', verifytoken, async (req, res) => {
    const booking = req.body;
    const price = booking.price;
    const amount = price * 100;

    const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        "payment_method_types": [
            "card"
        ]
    });
    res.send({
        clientSecret: paymentIntent.client_secret,
    });
});
app.post('/payments', async (req, res) =>{
    const payment = req.body;
    const result = await allpayment.insertOne(payment);
    const id = payment.bookingId
    const filter = {_id: ObjectId(id)}
    const updatedDoc = {
        $set: {
            paid: true,
            transactionId: payment.transactionId
        }
    }
    const updatedResult = await allbooking.updateOne(filter, updatedDoc)
    res.send(result);
})
// app.get('/addPrice', async (req, res) => {
//             const filter = {}
//             const options = { upsert: true }
//             const updatedDoc = {
//                 $set: {
//                     price: 99
//                 }
//             }
//             const result = await allService.updateMany(filter, updatedDoc, options);
//             res.send(result);
//         })



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})