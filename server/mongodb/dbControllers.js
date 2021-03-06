const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const GenerateSchema = require('generate-schema');


const dbController = {};

//const url = "mongodb://toeshoe:123abc@ds145093.mlab.com:45093/toeshoe";

dbController.getDatabase = (req, res, next) => {
  console.log('-----dbController.getDatabase()-----')
  let url = req.query.url;
  let dbConn = mongoose.createConnection(
    url,
    { useNewUrlParser: true },
    (err) => {
      if (err){
        res.header(500);
        res.send({
          ConnectionError: 'Invalid Connection URL'
        });
        return;
      }
    }
  );
  // Runs this logic once there is an open connection with the database
  dbConn.on("open", () => {
    console.log("We are connected on line 16 to dbConn")
    // Gets all the collections inside our database and turns it into an array
    const coll = dbConn.db.listCollections().toArray();
    let promArr = [];
    let respArr = [];

    coll.then(
      (collections) => {
        //console.log(collections);
        const modelArr = [];
        
        for (let i = 0; i < collections.length-1; i++) {
          console.log(collections[i].name);

          let modelNames = dbConn.modelNames();
          let model;
          
          if(!modelNames.includes(collections[i].name)){
            model = dbConn.model(collections[i].name, new Schema({}), collections[i].name);
            modelArr.push(model);
          } else {
            model = dbConn.models[Object.keys(dbConn.models)[i]];
          }

          //console.log(dbConn.models);
          promArr.push(new Promise((resolve, reject) => {
            console.log('Promise created.');
            model.find({}, (err, response) => {
              respArr.push({
                collectionName : collections[i].name,
                response : response,
              });
              resolve(console.log('Promise resolved.'));
            });
          }));
        }

        Promise.all(promArr)
        .then(() => {
          console.log('All promises resolved.');
          res.send(respArr);
          dbConn.close((err) => {
            if (err) {console.warn(err)}
            else { console.log('ConnectionClosed'); }
          });
          
        })
        .catch(err => {
          console.log(err);
        })
      }
    )
      .catch(err => console.log("-----CollectionError-----", err));
  });
};

dbController.updateDatabase = (req, res, next) => {

  let body = JSON.parse((Object.keys(req.body)[0]));

  console.log('-----dbController.updateDatabase()-----');

  let url = body.url;
  let newData = body.newData;
  let oldData = body.oldData;
  let collectionName = body.collection;

  let dbConn = mongoose.createConnection(
    url,
    { useNewUrlParser: true },
    (err) => {
      if (err){
        res.header(500);
        res.send({
          ConnectionError: 'Invalid Connection URL'
        });
        return;
      }
    }
  );
  // Runs this logic once there is an open connection with the database
  dbConn.on("open", () => {
    delete newData["_id"];

    console.log("We are connected to db.")

    console.log('olddata', oldData);
    console.log('newdata', newData);

    let schemaObj = GenerateSchema.mongoose(oldData);
    delete schemaObj._id;
    console.log('schema obj' ,schemaObj);

    let model = dbConn.model(collectionName, new Schema(schemaObj), collectionName);
    
    model.findOneAndUpdate(oldData, newData, (err, response) => {
      console.log(response);

      res.send(response);
      dbConn.close((err) => {
        if (err) {console.warn(err)}
        else { console.log('ConnectionClosed'); }
      });
    });
  });
}

module.exports = dbController;
