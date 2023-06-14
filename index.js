const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized Access' });
  }
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized Access' })
    }
    req.decoded = decoded;
    next();
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cnar9k1.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classCollection = client.db("summerSchoolDb").collection("class");
    const instructorCollection = client.db("summerSchoolDb").collection("instructor");
    const cartCollection = client.db("summerSchoolDb").collection("cart");
    const userCollection = client.db("summerSchoolDb").collection("users");
    const instructorClassCollection = client.db("summerSchoolDb").collection("instructorClass");

    app.post('/jwt', (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
      res.send({ token });
    })


    //user
    app.get('/users', async (req, res) => {

      const result = await userCollection.find().toArray();
      res.send(result);
    })
    app.get('/popular',async (req, res) => {
      //const query=
      const result=await classCollection.find().sort({availableSeats:-1}).toArray();
      console.log(result)
      res.send(result);
          })
    app.get('/popularinstructor',async (req, res) => {
      //const query=
      const result=await instructorCollection.find().limit(6).sort({availableSeats:-1}).toArray();
      console.log(result)
      res.send(result);
          })


    app.get('/users/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if(req.decoded.email!== email){
        res.send({admin:false})
      }
      const query={email:email}
      const user=await userCollection.findOne(query);
      if(user?.role === 'admin'){
        return res.send({role:'admin'})
      }
      if(user?.role === 'instructor'){
        return res.send({role:'instructor'})
      }
      res.send({role:'student'})
      //const result={admin:user?.role === 'admin' || {instructor:user?.role}==='instructor'}
      //const result = await userCollection.find().toArray();
      //res.send(result);
    })
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User Already exist' })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users/admin/:email'), verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log('hitted')

      if(req.decoded.email!== email){
        res.send({admin:false})
      }
      const query={email:email}
      const user=await userCollection.findOne(query);
      const result={admin:user?.role === 'admin'}
      console.log(result);
      res.send(result);
    }
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    //class
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })
    
    //instructor
    app.get('/instructors', async (req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result);
    })

    app.post('/classes/instructor', async (req,res)=>{
      const classes=req.body;
      const result = await instructorClassCollection.insertOne(classes);
      res.send(result);
    })

    //cart
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })
    app.post('/carts', async (req, res) => {
      const item = req.body;
      console.log(item)
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount=price*100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types:['card'],

      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('summer school has started')
})
app.listen(port, () => {
  console.log(`summer school is running on port: ${port}`);
})
